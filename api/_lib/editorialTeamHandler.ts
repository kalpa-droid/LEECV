import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './supabaseAdmin.js';
import { successResponse, errorResponse } from './apiResponse.js';
import { requireRateLimit } from './rateLimiter.js';

const LOCK_TTL_MS = 5 * 60 * 1000;
const MAX_TEAM_MEMBERS = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function authenticateCaller(req: VercelRequest, res: VercelResponse): Promise<{ id: string; email: string } | null> {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    errorResponse(res, 401, 'Iniciá sesión para trabajar en una Sala de Equipo.');
    return null;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user?.id) {
    errorResponse(res, 401, 'Sesión inválida o expirada.');
    return null;
  }

  return {
    id: data.user.id,
    email: (data.user.email || '').trim().toLowerCase(),
  };
}

async function hasTeamHostPrivilege(userId: string): Promise<boolean> {
  const nowMs = Date.now();
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('plan, plan_vence, pdf_export_access_mode')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.pdf_export_access_mode === 'enabled') return true;
    const validPlan =
      (profile?.plan === 'pro' || profile?.plan === 'pass_30d') &&
      (!profile?.plan_vence || new Date(profile.plan_vence).getTime() > nowMs);
    if (validPlan) return true;
  } catch {
    // Continuar revisando user_app_passes
  }

  try {
    const { data: passes } = await supabaseAdmin
      .from('user_app_passes')
      .select('pass_id, is_permanent, expires_at, revoked_at')
      .eq('user_id', userId)
      .eq('pass_id', 'pass_editorial_team_30d')
      .is('revoked_at', null);

    if (
      Array.isArray(passes) &&
      passes.some((p: any) => p.is_permanent || !p.expires_at || new Date(p.expires_at).getTime() > nowMs)
    ) {
      return true;
    }
  } catch {
    // Ignorar si falla
  }

  return false;
}

async function resolveProjectMembership(projectId: string, caller: { id: string; email: string }) {
  const { data: project, error } = await supabaseAdmin
    .from('editorial_team_projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();

  if (error || !project) return { project: null, isOwner: false, isMember: false };

  const isOwner = project.owner_id === caller.id;
  if (isOwner) return { project, isOwner: true, isMember: true };

  // Auto-vincular invitaciones pendientes por email
  if (caller.email) {
    await supabaseAdmin
      .from('org_members')
      .update({
        user_id: caller.id,
        status: 'active',
        joined_at: new Date().toISOString(),
      })
      .eq('org_id', project.org_id)
      .ilike('invited_email', caller.email)
      .eq('status', 'pending');
  }

  const { data: member } = await supabaseAdmin
    .from('org_members')
    .select('id, role, status')
    .eq('org_id', project.org_id)
    .eq('user_id', caller.id)
    .eq('status', 'active')
    .maybeSingle();

  return { project, isOwner: false, isMember: Boolean(member) };
}

export async function handleEditorialTeamAction(
  req: VercelRequest,
  res: VercelResponse,
  action: string
): Promise<VercelResponse | void> {
  const caller = await authenticateCaller(req, res);
  if (!caller) return;

  const rateOk = await requireRateLimit(req, res, `user:${caller.id}:ed-team`, {
    maxRequests: 60,
    windowSeconds: 60,
  });
  if (!rateOk) return;

  if (action === 'team-create') {
    const canHost = await hasTeamHostPrivilege(caller.id);
    if (!canHost) {
      return errorResponse(
        res,
        403,
        'Necesitás el Pase de Equipo EditorLee (o Pase Total 30 Días) para crear una sala colaborativa.'
      );
    }

    const title = String(req.body?.title || 'Obra en Equipo EditorLee').trim().slice(0, 120);
    const presetId = String(req.body?.presetId || 'informe-proyecto').trim();
    const structuralNorm = String(req.body?.structuralNorm || 'libre').trim();
    const bibliographyStyle = String(req.body?.bibliographyStyle || 'tradicional').trim();
    const rawSections = Array.isArray(req.body?.sections) ? req.body.sections : [];

    const { data: org, error: orgErr } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: title,
        owner_id: caller.id,
        max_members: MAX_TEAM_MEMBERS,
      })
      .select()
      .single();

    if (orgErr || !org) {
      console.error('[editorialTeamHandler] Error creando organización:', orgErr?.message);
      return errorResponse(res, 500, 'No se pudo crear la sala del equipo.');
    }

    await supabaseAdmin.from('org_members').insert({
      org_id: org.id,
      user_id: caller.id,
      invited_email: caller.email,
      role: 'owner',
      status: 'active',
      joined_at: new Date().toISOString(),
    });

    const { data: project, error: projErr } = await supabaseAdmin
      .from('editorial_team_projects')
      .insert({
        org_id: org.id,
        owner_id: caller.id,
        title,
        preset_id: presetId,
        structural_norm: structuralNorm,
        bibliography_style: bibliographyStyle,
        max_members: MAX_TEAM_MEMBERS,
      })
      .select()
      .single();

    if (projErr || !project) {
      console.error('[editorialTeamHandler] Error creando proyecto de equipo:', projErr?.message);
      return errorResponse(res, 500, 'No se pudo inicializar el documento compartido.');
    }

    const seedSections =
      rawSections.length > 0
        ? rawSections.slice(0, 40).map((sec: any, idx: number) => ({
            project_id: project.id,
            section_key: String(sec?.id || `ed_sec_${idx + 1}`),
            sort_order: typeof sec?.position === 'number' ? sec.position : idx,
            title: String(sec?.title || `Sección ${idx + 1}`).slice(0, 120),
            section_meta: {
              category: sec?.category || 'cuerpo',
              visible: sec?.visible !== false,
              includeInToc: sec?.includeInToc !== false,
              startNewPage: sec?.startNewPage !== false,
            },
            records_json: Array.isArray(sec?.records) ? sec.records : [],
            content_markdown: Array.isArray(sec?.records)
              ? sec.records.map((r: any) => String(r?.content || '')).filter(Boolean).join('\n\n')
              : '',
          }))
        : [
            {
              project_id: project.id,
              section_key: 'ed_cap_1',
              sort_order: 0,
              title: 'Capítulo 1 · Introducción',
              section_meta: { category: 'cuerpo', visible: true, includeInToc: true, startNewPage: true },
              records_json: [{ id: `rec_${Date.now()}`, type: 'paragraph', content: '' }],
              content_markdown: '',
            },
          ];

    await supabaseAdmin.from('editorial_team_sections').insert(seedSections);

    try {
      await supabaseAdmin.rpc('increment_funnel_counter', {
        p_event_key: 'team_created',
        p_doc_type: 'editorial',
      });
    } catch {
      // No bloqueante
    }

    return successResponse(res, { project });
  }

  if (action === 'team-join') {
    if (!caller.email) return successResponse(res, { joined: 0 });
    const { data, error } = await supabaseAdmin
      .from('org_members')
      .update({
        user_id: caller.id,
        status: 'active',
        joined_at: new Date().toISOString(),
      })
      .ilike('invited_email', caller.email)
      .eq('status', 'pending')
      .select('id, org_id');

    if (error) {
      return errorResponse(res, 500, 'No se pudieron vincular las invitaciones.');
    }
    return successResponse(res, { joined: (data || []).length });
  }

  if (action === 'team-list') {
    if (caller.email) {
      await supabaseAdmin
        .from('org_members')
        .update({ user_id: caller.id, status: 'active', joined_at: new Date().toISOString() })
        .ilike('invited_email', caller.email)
        .eq('status', 'pending');
    }

    const { data: memberOrgs } = await supabaseAdmin
      .from('org_members')
      .select('org_id, role')
      .eq('user_id', caller.id)
      .eq('status', 'active');

    const orgIds = Array.from(new Set((memberOrgs || []).map((m: any) => m.org_id).filter(Boolean)));
    const { data: ownedProjects } = await supabaseAdmin
      .from('editorial_team_projects')
      .select('*')
      .eq('owner_id', caller.id)
      .order('updated_at', { ascending: false });

    let sharedProjects: any[] = [];
    if (orgIds.length > 0) {
      const { data: byOrg } = await supabaseAdmin
        .from('editorial_team_projects')
        .select('*')
        .in('org_id', orgIds)
        .order('updated_at', { ascending: false });
      sharedProjects = byOrg || [];
    }

    const mergedMap = new Map<string, any>();
    for (const p of [...(ownedProjects || []), ...sharedProjects]) {
      if (!mergedMap.has(p.id)) {
        mergedMap.set(p.id, { ...p, isOwner: p.owner_id === caller.id });
      }
    }

    return successResponse(res, { projects: [...mergedMap.values()] });
  }

  if (action === 'team-load') {
    const projectId = String(req.body?.projectId || '').trim();
    if (!projectId) return errorResponse(res, 400, 'Falta projectId');

    const { project, isOwner, isMember } = await resolveProjectMembership(projectId, caller);
    if (!project || !isMember) {
      return errorResponse(res, 403, 'No tenés permiso para acceder a esta sala de equipo.');
    }

    const [{ data: sections }, { data: members }] = await Promise.all([
      supabaseAdmin
        .from('editorial_team_sections')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true }),
      supabaseAdmin
        .from('org_members')
        .select('id, invited_email, role, status, joined_at')
        .eq('org_id', project.org_id)
        .order('created_at', { ascending: true }),
    ]);

    return successResponse(res, {
      project,
      isOwner,
      sections: sections || [],
      members: members || [],
    });
  }

  if (action === 'team-invite') {
    const projectId = String(req.body?.projectId || '').trim();
    const invitedEmail = String(req.body?.email || '').trim().toLowerCase();
    if (!projectId || !EMAIL_RE.test(invitedEmail)) {
      return errorResponse(res, 400, 'Indicá un correo válido para invitar.');
    }

    const { project, isOwner } = await resolveProjectMembership(projectId, caller);
    if (!project || !isOwner) {
      return errorResponse(res, 403, 'Solo quien creó la sala puede invitar integrantes.');
    }

    const { data: existingMembers } = await supabaseAdmin
      .from('org_members')
      .select('id, invited_email, status')
      .eq('org_id', project.org_id)
      .in('status', ['pending', 'active']);

    const list = existingMembers || [];
    if (list.some((m: any) => String(m.invited_email || '').toLowerCase() === invitedEmail)) {
      return errorResponse(res, 400, 'Ese correo ya integra esta sala.');
    }
    const maxCap = Math.min(Number(project.max_members || MAX_TEAM_MEMBERS), MAX_TEAM_MEMBERS);
    if (list.length >= maxCap) {
      return errorResponse(res, 400, `La sala alcanzó el límite máximo de ${maxCap} integrantes.`);
    }

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('email', invitedEmail)
      .maybeSingle();

    const { data: inserted, error: invErr } = await supabaseAdmin
      .from('org_members')
      .insert({
        org_id: project.org_id,
        user_id: existingProfile?.id || null,
        invited_email: invitedEmail,
        role: 'editor',
        status: existingProfile?.id ? 'active' : 'pending',
        joined_at: existingProfile?.id ? new Date().toISOString() : null,
      })
      .select('id, invited_email, role, status, joined_at')
      .single();

    if (invErr) {
      return errorResponse(res, 500, 'No se pudo registrar la invitación.');
    }

    return successResponse(res, { member: inserted });
  }

  if (action === 'team-lock-section') {
    const projectId = String(req.body?.projectId || '').trim();
    const sectionKey = String(req.body?.sectionKey || '').trim();
    const lockAction = req.body?.lockAction === 'release' ? 'release' : 'acquire';

    if (!projectId || !sectionKey) {
      return errorResponse(res, 400, 'Faltan projectId y sectionKey');
    }

    const { project, isOwner, isMember } = await resolveProjectMembership(projectId, caller);
    if (!project || !isMember) {
      return errorResponse(res, 403, 'Acceso denegado a esta sala.');
    }

    const { data: sec } = await supabaseAdmin
      .from('editorial_team_sections')
      .select('*')
      .eq('project_id', projectId)
      .eq('section_key', sectionKey)
      .maybeSingle();

    if (!sec) return errorResponse(res, 404, 'Sección no encontrada en la sala.');

    const nowMs = Date.now();
    const lockedByOther =
      Boolean(sec.locked_by) &&
      sec.locked_by !== caller.id &&
      Boolean(sec.lock_expires_at) &&
      new Date(sec.lock_expires_at).getTime() > nowMs;

    if (lockAction === 'acquire') {
      if (lockedByOther) {
        return errorResponse(
          res,
          409,
          `Este capítulo está siendo editado en vivo por ${sec.locked_by_email || 'otro integrante'}.`
        );
      }

      const expiresIso = new Date(nowMs + LOCK_TTL_MS).toISOString();
      const { data: updated, error: updErr } = await supabaseAdmin
        .from('editorial_team_sections')
        .update({
          locked_by: caller.id,
          locked_by_email: caller.email || 'editor',
          lock_expires_at: expiresIso,
        })
        .eq('id', sec.id)
        .select('*')
        .single();

      if (updErr) return errorResponse(res, 500, 'No se pudo tomar el control del capítulo.');
      return successResponse(res, { section: updated });
    }

    if (lockedByOther && !isOwner) {
      return errorResponse(res, 403, 'Solo quien tomó el capítulo o el dueño de la sala puede liberarlo.');
    }

    const { data: released, error: relErr } = await supabaseAdmin
      .from('editorial_team_sections')
      .update({
        locked_by: null,
        locked_by_email: null,
        lock_expires_at: null,
      })
      .eq('id', sec.id)
      .select('*')
      .single();

    if (relErr) return errorResponse(res, 500, 'No se pudo liberar el capítulo.');
    return successResponse(res, { section: released });
  }

  if (action === 'team-save-section') {
    const projectId = String(req.body?.projectId || '').trim();
    const sectionKey = String(req.body?.sectionKey || '').trim();
    const expectedVersion = req.body?.expectedVersion !== undefined ? Number(req.body.expectedVersion) : undefined;
    const releaseAfterSave = Boolean(req.body?.releaseAfterSave);

    if (!projectId || !sectionKey) {
      return errorResponse(res, 400, 'Faltan projectId y sectionKey');
    }

    const { project, isMember } = await resolveProjectMembership(projectId, caller);
    if (!project || !isMember) {
      return errorResponse(res, 403, 'Acceso denegado a esta sala.');
    }

    const { data: sec } = await supabaseAdmin
      .from('editorial_team_sections')
      .select('*')
      .eq('project_id', projectId)
      .eq('section_key', sectionKey)
      .maybeSingle();

    if (!sec) return errorResponse(res, 404, 'Sección no encontrada en la sala.');

    const nowMs = Date.now();
    const lockedByOther =
      Boolean(sec.locked_by) &&
      sec.locked_by !== caller.id &&
      Boolean(sec.lock_expires_at) &&
      new Date(sec.lock_expires_at).getTime() > nowMs;

    if (lockedByOther) {
      return errorResponse(
        res,
        409,
        `Este capítulo está bloqueado por ${sec.locked_by_email || 'otro integrante'}.`
      );
    }

    if (Number.isFinite(expectedVersion) && Number(sec.version) !== expectedVersion) {
      return errorResponse(
        res,
        409,
        'Otro integrante guardó cambios recién en este capítulo. Actualizá antes de sobrescribir.'
      );
    }

    const recordsJson = Array.isArray(req.body?.records) ? req.body.records : sec.records_json;
    const nextTitle = typeof req.body?.title === 'string' ? req.body.title.trim().slice(0, 120) : sec.title;
    const nextMarkdown = Array.isArray(recordsJson)
      ? recordsJson.map((r: any) => String(r?.content || '')).filter(Boolean).join('\n\n')
      : sec.content_markdown;

    const patch: Record<string, any> = {
      title: nextTitle || sec.title,
      records_json: recordsJson,
      content_markdown: nextMarkdown,
      version: Number(sec.version || 1) + 1,
      updated_by: caller.id,
      updated_by_email: caller.email,
      updated_at: new Date().toISOString(),
    };

    if (releaseAfterSave) {
      patch.locked_by = null;
      patch.locked_by_email = null;
      patch.lock_expires_at = null;
    }

    const { data: saved, error: saveErr } = await supabaseAdmin
      .from('editorial_team_sections')
      .update(patch)
      .eq('id', sec.id)
      .select('*')
      .single();

    if (saveErr) {
      return errorResponse(res, 500, 'No se pudieron guardar los cambios del capítulo.');
    }

    await supabaseAdmin
      .from('editorial_team_projects')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', projectId);

    return successResponse(res, { section: saved });
  }

  return errorResponse(res, 400, `Acción de equipo no reconocida: ${action}`);
}
