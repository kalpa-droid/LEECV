import { supabase } from '../../../shared/core/lib/supabaseClient';
import { safeSupabaseCall } from '../../../shared/core/utils/safeSupabaseCall';

/** Obtiene la organización asociada al usuario actual */
export async function getOrganization() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Buscar donde sea dueño
  const { data: ownedOrg } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  if (ownedOrg) return { ...ownedOrg, isOwner: true };

  // Buscar donde sea miembro
  const { data: member } = await supabase
    .from('org_members')
    .select('*, organizations(*)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (member?.organizations) {
    return { ...member.organizations, isOwner: false, memberRole: member.role };
  }

  return null;
}

/** Crea una organización Enterprise para el dueño */
export async function createOrganization(name) {
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
  return data;
}

/** Invita un miembro por email a la organización */
export async function inviteMember(orgId, email, role = 'editor') {
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
  return data;
}

/** Lista los miembros de una organización */
export async function listOrgMembers(orgId) {
  const res = await safeSupabaseCall(async () => {
    return await supabase
      .from('org_members')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });
  }, []);

  return res.data || [];
}

/** Lista los candidatos de la agencia u organización */
export async function listCandidates(orgId = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase.from('candidate_profiles').select('*');

  if (orgId) {
    query = query.eq('org_id', orgId);
  } else {
    query = query.eq('owner_id', user.id);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/** Guarda o actualiza un candidato */
export async function saveCandidate(candidateData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  const payload = {
    ...candidateData,
    owner_id: user.id,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('candidate_profiles')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}
