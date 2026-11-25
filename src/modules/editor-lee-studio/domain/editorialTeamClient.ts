import { apiClient } from '../../../shared/core/utils/apiClient';

export interface EditorialTeamProjectSummary {
  id: string;
  org_id: string;
  owner_id: string;
  title: string;
  preset_id: string;
  structural_norm: string;
  bibliography_style: string;
  max_members: number;
  updated_at: string;
  isOwner?: boolean;
}

export interface EditorialTeamSectionRow {
  id: string;
  project_id: string;
  section_key: string;
  sort_order: number;
  title: string;
  section_meta: any;
  records_json: any[];
  content_markdown: string;
  locked_by: string | null;
  locked_by_email: string | null;
  lock_expires_at: string | null;
  updated_by_email: string | null;
  version: number;
  updated_at: string;
}

export interface EditorialTeamMemberRow {
  id: string;
  invited_email: string;
  role: string;
  status: string;
  joined_at: string | null;
}

export async function createEditorialTeamRoom(payload: {
  title: string;
  presetId?: string;
  structuralNorm?: string;
  bibliographyStyle?: string;
  sections?: any[];
}): Promise<EditorialTeamProjectSummary> {
  const { ok, data, error } = await apiClient.post<{ project: EditorialTeamProjectSummary }>(
    '/api/editorial/team-create',
    payload
  );
  if (!ok || !data?.project) throw new Error(error || 'No se pudo crear la sala de equipo.');
  return data.project;
}

export async function listEditorialTeamRooms(): Promise<EditorialTeamProjectSummary[]> {
  const { ok, data, error } = await apiClient.post<{ projects: EditorialTeamProjectSummary[] }>(
    '/api/editorial/team-list',
    {}
  );
  if (!ok) throw new Error(error || 'No se pudieron cargar tus salas de equipo.');
  return data?.projects || [];
}

export async function loadEditorialTeamRoom(projectId: string): Promise<{
  project: EditorialTeamProjectSummary;
  isOwner: boolean;
  sections: EditorialTeamSectionRow[];
  members: EditorialTeamMemberRow[];
}> {
  const { ok, data, error } = await apiClient.post<any>('/api/editorial/team-load', { projectId });
  if (!ok || !data?.project) throw new Error(error || 'No se pudo abrir esta sala de equipo.');
  return data;
}

export async function inviteEditorialTeamMember(projectId: string, email: string): Promise<EditorialTeamMemberRow> {
  const { ok, data, error } = await apiClient.post<{ member: EditorialTeamMemberRow }>(
    '/api/editorial/team-invite',
    { projectId, email }
  );
  if (!ok || !data?.member) throw new Error(error || 'No se pudo invitar a ese colaborador.');
  return data.member;
}

export async function lockEditorialTeamSection(
  projectId: string,
  sectionKey: string,
  lockAction: 'acquire' | 'release'
): Promise<EditorialTeamSectionRow> {
  const { ok, data, error } = await apiClient.post<{ section: EditorialTeamSectionRow }>(
    '/api/editorial/team-lock-section',
    { projectId, sectionKey, lockAction }
  );
  if (!ok || !data?.section) throw new Error(error || 'No se pudo actualizar el bloqueo del capítulo.');
  return data.section;
}

export async function saveEditorialTeamSection(payload: {
  projectId: string;
  sectionKey: string;
  title?: string;
  records: any[];
  expectedVersion?: number;
  releaseAfterSave?: boolean;
}): Promise<EditorialTeamSectionRow> {
  const { ok, data, error } = await apiClient.post<{ section: EditorialTeamSectionRow }>(
    '/api/editorial/team-save-section',
    payload
  );
  if (!ok || !data?.section) throw new Error(error || 'No se pudieron guardar los cambios en el equipo.');
  return data.section;
}
