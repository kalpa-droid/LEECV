import { supabase } from '../../../../../shared/core/lib/supabaseClient';
import { safeSupabaseCall } from '../../../../../shared/core/utils/safeSupabaseCall';
import { Organization, OrgMember, OrgCandidate, OrgRole } from '../../../../../types/organization';

/** Obtiene la organización asociada al usuario actual */
export async function getOrganization(): Promise<Organization | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Buscar donde sea dueño
  const { data: ownedOrg } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  if (ownedOrg) return { ...ownedOrg, isOwner: true } as Organization;

  // Buscar donde sea miembro
  const { data: member } = await supabase
    .from('org_members')
    .select('*, organizations(*)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (member?.organizations) {
    return { ...member.organizations, isOwner: false, memberRole: member.role } as Organization;
  }

  return null;
}

/** Crea una organización Enterprise para el dueño */
export async function createOrganization(name: string): Promise<Organization> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  const { data, error } = await supabase
    .from('organizations')
    .insert({
      name,
      owner_id: user.id
    })
    .select()
    .single();

  if (error) throw error;
  return data as Organization;
}

/** Invita un miembro por email a la organización, respetando el cupo (max_members) del plan */
export async function inviteMember(orgId: string, email: string, role: OrgRole = 'editor'): Promise<OrgMember> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('max_members')
    .eq('id', orgId)
    .single();
  if (orgError) throw orgError;

  const { count, error: countError } = await supabase
    .from('org_members')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .in('status', ['pending', 'active']);
  if (countError) throw countError;

  if ((count ?? 0) >= org.max_members) {
    throw new Error(`Llegaste al límite de ${org.max_members} miembros de tu plan Enterprise`);
  }

  const { data, error } = await supabase
    .from('org_members')
    .insert({
      org_id: orgId,
      invited_email: email,
      role,
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  return data as OrgMember;
}

/** Lista los miembros de una organización */
export async function listOrgMembers(orgId: string): Promise<OrgMember[]> {
  if (!supabase) return [];
  const res = await safeSupabaseCall(async () => {
    return await supabase!
      .from('org_members')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });
  }, []);

  return (res.data || []) as OrgMember[];
}

/** Lista los candidatos de la agencia u organización */
export async function listCandidates(orgId: string | null = null): Promise<OrgCandidate[]> {
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase.from('org_candidates').select('*');

  if (orgId) {
    query = query.eq('org_id', orgId);
  } else {
    query = query.eq('owner_id', user.id);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []) as OrgCandidate[];
}

/** Guarda o actualiza un candidato */
export async function saveCandidate(candidateData: Partial<OrgCandidate>): Promise<OrgCandidate> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  const payload = {
    ...candidateData,
    owner_id: user.id,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('org_candidates')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as OrgCandidate;
}

/** Acepta una invitación a una organización por token */
export async function acceptInvitation(invitationToken: string): Promise<OrgMember> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Debes iniciar sesión para aceptar la invitación');

  const { data: member, error: findError } = await supabase
    .from('org_members')
    .select('*')
    .eq('invitation_token', invitationToken)
    .single();

  if (findError || !member) throw new Error('Invitación no válida o expirada');

  const { data, error } = await supabase
    .from('org_members')
    .update({
      user_id: user.id,
      status: 'active',
      joined_at: new Date().toISOString()
    })
    .eq('id', member.id)
    .select()
    .single();

  if (error) throw error;
  return data as OrgMember;
}

/** Remueve un miembro de la organización */
export async function removeMember(memberId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { error } = await supabase
    .from('org_members')
    .delete()
    .eq('id', memberId);

  if (error) throw error;
}
