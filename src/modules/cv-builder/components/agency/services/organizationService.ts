import { supabase } from '../../../../../shared/core/lib/supabaseClient';
import { dal } from '../../../../../shared/core/storage/dataAccessLayer';
import { Organization, OrgMember, OrgCandidate, OrgRole } from '../../../../../types/organization';

/** Obtiene la organización asociada al usuario actual */
export async function getOrganization(): Promise<Organization | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Buscar donde sea dueño
  const ownedOrg = await dal.organizations.getByOwner(user.id);
  if (ownedOrg) return { ...ownedOrg, isOwner: true } as Organization;

  // Buscar donde sea miembro
  const member = await dal.orgMembers.getByUser(user.id);
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

  const created = await dal.organizations.insert(name, user.id);
  if (!created) throw new Error('Error al crear la organización');
  return created;
}

/** Invita un miembro por email a la organización, respetando el cupo (max_members) del plan */
export async function inviteMember(orgId: string, email: string, role: OrgRole = 'editor'): Promise<OrgMember> {
  if (!supabase) throw new Error('Supabase no configurado');
  const org = await dal.organizations.getById(orgId);
  if (!org) throw new Error('Organización no encontrada');

  const count = await dal.orgMembers.countActiveOrPending(orgId);
  if (count >= org.max_members) {
    throw new Error(`Llegaste al límite de ${org.max_members} miembros de tu plan Enterprise`);
  }

  const created = await dal.orgMembers.insert({
    org_id: orgId,
    invited_email: email,
    role,
    status: 'pending'
  });

  if (!created) throw new Error('No se pudo enviar la invitación');
  return created as OrgMember;
}

/** Lista los miembros de una organización */
export async function listOrgMembers(orgId: string): Promise<OrgMember[]> {
  const members = await dal.orgMembers.listByOrg(orgId);
  return members as OrgMember[];
}

/** Lista los candidatos de la agencia u organización */
export async function listCandidates(orgId: string | null = null): Promise<OrgCandidate[]> {
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const candidates = await dal.orgCandidates.list(orgId, user.id);
  return candidates as OrgCandidate[];
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

  const saved = await dal.orgCandidates.upsert(payload);
  if (!saved) throw new Error('Error al guardar el candidato');
  return saved as OrgCandidate;
}

/** Acepta una invitación a una organización por token */
export async function acceptInvitation(invitationToken: string): Promise<OrgMember> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Debes iniciar sesión para aceptar la invitación');

  const member = await dal.orgMembers.getByToken(invitationToken);
  if (!member) throw new Error('Invitación no válida o expirada');

  const updated = await dal.orgMembers.acceptInvitation(member.id, user.id);
  if (!updated) throw new Error('Error al aceptar la invitación');
  return updated as OrgMember;
}

/** Remueve un miembro de la organización */
export async function removeMember(memberId: string): Promise<void> {
  const success = await dal.orgMembers.delete(memberId);
  if (!success) throw new Error('Error al remover el miembro');
}
