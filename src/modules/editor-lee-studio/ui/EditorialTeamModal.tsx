import React, { useEffect, useState } from 'react';
import { Users, Lock, Unlock, UserPlus, CheckCircle2, Cloud, LogIn, Sparkles } from 'lucide-react';
import { Modal } from '../../../shared/core/ui/Modal';
import { Field } from '../../../shared/core/ui/Field';
import { button, radius } from '../../../shared/core/uiDesignSystem';
import { useAuth } from '../../../shared/core/auth/AuthContext';
import { useEntitlements } from '../../../shared/core/entitlements/useEntitlements';
import { useToast } from '../../../shared/core/ui/Toast';
import { formatPrice } from '../../../shared/core/payments/pricingCatalog';
import { redeemCreditsForPass, selectPaidPlan } from '../../../shared/core/payments/paymentService';
import { dal } from '../../../shared/core/storage/dataAccessLayer';
import {
  createEditorialTeamRoom,
  EditorialTeamMemberRow,
  EditorialTeamProjectSummary,
  EditorialTeamSectionRow,
  inviteEditorialTeamMember,
  listEditorialTeamRooms,
  loadEditorialTeamRoom,
  lockEditorialTeamSection,
} from '../domain/editorialTeamClient';

export interface ActiveTeamRoomContext {
  project: EditorialTeamProjectSummary;
  isOwner: boolean;
  sections: EditorialTeamSectionRow[];
  members: EditorialTeamMemberRow[];
}

interface EditorialTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: any;
  activeTeamRoom: ActiveTeamRoomContext | null;
  onlineEmails: string[];
  onEnterTeamRoom: (ctx: ActiveTeamRoomContext, focusSectionKey?: string) => void;
  onExitTeamRoom: () => void;
  onSyncTeamSections: (sections: EditorialTeamSectionRow[]) => void;
}

export const EditorialTeamModal: React.FC<EditorialTeamModalProps> = ({
  isOpen,
  onClose,
  draft,
  activeTeamRoom,
  onlineEmails,
  onEnterTeamRoom,
  onExitTeamRoom,
  onSyncTeamSections,
}) => {
  const { user } = useAuth();
  const {
    hasEditorialTeamPass,
    hasActivePassForDocType,
    pdfTokens,
    refreshEntitlements,
  } = useEntitlements();
  const { showSuccess, showError } = useToast();

  const [projects, setProjects] = useState<EditorialTeamProjectSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const hasEditorPass = hasActivePassForDocType('editorial');
  const teamRedeemCreditsCost = hasEditorPass ? 5 : 10;

  useEffect(() => {
    if (!isOpen || !user) return;
    let active = true;
    setLoading(true);
    setNewTitle(String(draft?.cover?.title || draft?.metadata?.title || 'Proyecto Colaborativo'));
    void listEditorialTeamRooms()
      .then((rows) => {
        if (active) setProjects(rows);
      })
      .catch((err) => {
        console.warn('Error listando salas:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, user, draft?.cover?.title, draft?.metadata?.title]);

  const handleOpenRoom = async (projectId: string) => {
    setBusy(`load_${projectId}`);
    try {
      const loaded = await loadEditorialTeamRoom(projectId);
      onEnterTeamRoom(loaded);
      showSuccess(`Sala "${loaded.project.title}" abierta en modo Equipo en Vivo.`);
      onClose();
    } catch (err: any) {
      showError(err?.message || 'No pudimos abrir la sala de equipo.');
    } finally {
      setBusy(null);
    }
  };

  const handleCreateRoom = async () => {
    if (!newTitle.trim()) {
      showError('Escribí un título para la sala de equipo.');
      return;
    }
    setBusy('create');
    try {
      const created = await createEditorialTeamRoom({
        title: newTitle.trim(),
        presetId: draft?.design?.presetId || 'informe-proyecto',
        structuralNorm: draft?.design?.structuralNormId || 'libre',
        bibliographyStyle: draft?.design?.bibliographyStyle || 'tradicional',
        sections: Array.isArray(draft?.sections) ? draft.sections : [],
      });
      const loaded = await loadEditorialTeamRoom(created.id);
      setProjects((prev) => [created, ...prev]);
      onEnterTeamRoom(loaded);
      showSuccess('Sala de Equipo creada. Ya podés invitar hasta 9 colaboradores gratis.');
    } catch (err: any) {
      showError(err?.message || 'No se pudo crear la sala de equipo.');
    } finally {
      setBusy(null);
    }
  };

  const handleBuyTeamPass = async (gateway: 'mercadopago' | 'paypal') => {
    if (!user?.email) return;
    setBusy(`buy_${gateway}`);
    try {
      const tok = await dal.pdfExportTokens.createUnpaidToken({
        email: user.email,
        doc_type: 'pass_editorial_team_30d',
        user_id: user.id,
      });
      if (!tok?.token) throw new Error('No se pudo inicializar el pago.');
      localStorage.setItem('leecv_export_token', tok.token);
      await selectPaidPlan('pass_editorial_team_30d', gateway, user.email, tok.token, user.id, {
        onError: (msg) => showError(msg),
      });
    } catch (err: any) {
      showError(err?.message || 'Error al iniciar compra del pase de equipo.');
    } finally {
      setBusy(null);
    }
  };

  const handleRedeemTeamPass = async () => {
    setBusy('redeem');
    try {
      await redeemCreditsForPass('pass_editorial_team_30d');
      await refreshEntitlements();
      showSuccess('¡Sala de Equipo (30 días) activada con tus créditos!');
    } catch (err: any) {
      showError(err?.message || 'No se pudo canjear el pase.');
    } finally {
      setBusy(null);
    }
  };

  const handleInvite = async () => {
    if (!activeTeamRoom) return;
    setBusy('invite');
    try {
      const added = await inviteEditorialTeamMember(activeTeamRoom.project.id, inviteEmail.trim());
      setInviteEmail('');
      const refreshed = await loadEditorialTeamRoom(activeTeamRoom.project.id);
      onEnterTeamRoom(refreshed);
      showSuccess(`Invitación enviada a ${added.invited_email}. No necesita comprar créditos.`);
    } catch (err: any) {
      showError(err?.message || 'No se pudo invitar a esa persona.');
    } finally {
      setBusy(null);
    }
  };

  const handleToggleLock = async (sec: EditorialTeamSectionRow, lockAction: 'acquire' | 'release') => {
    if (!activeTeamRoom) return;
    setBusy(`lock_${sec.section_key}`);
    try {
      const updated = await lockEditorialTeamSection(activeTeamRoom.project.id, sec.section_key, lockAction);
      const nextSections = activeTeamRoom.sections.map((s) =>
        s.section_key === updated.section_key ? updated : s
      );
      onSyncTeamSections(nextSections);
      if (lockAction === 'acquire') {
        onEnterTeamRoom({ ...activeTeamRoom, sections: nextSections }, sec.section_key);
        onClose();
      }
      showSuccess(
        lockAction === 'acquire'
          ? `Tomaste el capítulo "${updated.title}".`
          : `Liberaste el capítulo "${updated.title}".`
      );
    } catch (err: any) {
      showError(err?.message || 'No pudimos actualizar el bloqueo del capítulo.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sala de Equipo en Vivo (EditorLee · Hasta 10)"
      icon={<Users className="w-5 h-5 text-[var(--color-accent-text)]" />}
      size="lg"
      footer={
        <div className="w-full flex items-center justify-between gap-2">
          {activeTeamRoom ? (
            <button
              type="button"
              onClick={() => {
                onExitTeamRoom();
                onClose();
              }}
              className={`${button.base} ${button.secondary}`}
            >
              Volver a mis borradores locales
            </button>
          ) : (
            <span className="text-[11px] text-[var(--ui-text-secondary)]">
              Separado de tus copias locales: colaboran sin pisarse.
            </span>
          )}
          <button type="button" onClick={onClose} className={`${button.base} ${button.primary}`}>
            Cerrar
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs text-[var(--ui-text-primary)]">
        {!user ? (
          <div
            className="p-4 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] flex items-center justify-between gap-3"
            style={{ borderRadius: radius.card }}
          >
            <div className="flex items-start gap-2.5">
              <LogIn className="w-5 h-5 text-[var(--color-accent-text)] shrink-0 mt-0.5" />
              <div>
                <p className="font-black">Iniciá sesión para entrar a Salas de Equipo</p>
                <p className="text-[11px] text-[var(--ui-text-secondary)] mt-0.5">
                  Si alguien te invitó por correo, entrás gratis al iniciar sesión con tu mismo email.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Sala activa actualmente */}
            {activeTeamRoom && (
              <div
                className="p-4 bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)]/40 space-y-3"
                style={{ borderRadius: radius.card }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-status-success-text)]">
                      SALA ACTIVA EN VIVO
                    </span>
                    <h3 className="text-sm font-black">{activeTeamRoom.project.title}</h3>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--ui-bg-card)] text-[10px] font-bold">
                    <Cloud className="w-3 h-3 text-[var(--color-status-success-text)]" />
                    {onlineEmails.length || 1} conectado(s)
                  </span>
                </div>

                {/* Lista de miembros */}
                <div className="flex flex-wrap gap-1.5">
                  {activeTeamRoom.members.map((m) => (
                    <span
                      key={m.id}
                      className="px-2 py-0.5 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] text-[10px] font-bold rounded-full"
                    >
                      {m.invited_email} ({m.role === 'owner' ? 'Anfitrión' : m.status === 'active' ? 'Activo' : 'Invitado'})
                    </span>
                  ))}
                </div>

                {/* Invitar hasta 9 colaboradores */}
                {activeTeamRoom.isOwner && activeTeamRoom.members.length < 10 && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <div className="flex-1">
                      <Field
                        label="Invitar colaborador gratis por email"
                        type="email"
                        value={inviteEmail}
                        onChange={setInviteEmail}
                        placeholder="companero@universidad.edu"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={busy !== null || !inviteEmail.trim()}
                      onClick={() => void handleInvite()}
                      className={`${button.base} ${button.primary} self-end whitespace-nowrap flex items-center gap-1.5`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Invitar ({activeTeamRoom.members.length}/10)</span>
                    </button>
                  </div>
                )}

                {/* Capítulos con bloqueo por persona */}
                <div className="space-y-1.5 pt-2 border-t border-[var(--color-status-success-base)]/20">
                  <p className="text-[11px] font-black text-[var(--color-status-success-text)]">
                    Capítulos compartidos (1 persona edita cada capítulo a la vez)
                  </p>
                  {activeTeamRoom.sections.map((sec) => {
                    const lockedByMe = sec.locked_by === user.id;
                    const lockedByOther =
                      Boolean(sec.locked_by) &&
                      !lockedByMe &&
                      Boolean(sec.lock_expires_at) &&
                      new Date(sec.lock_expires_at!).getTime() > Date.now();

                    return (
                      <div
                        key={sec.section_key}
                        className="p-2.5 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] flex items-center justify-between gap-2"
                        style={{ borderRadius: radius.control }}
                      >
                        <div className="min-w-0">
                          <p className="font-bold truncate">{sec.title}</p>
                          <p className="text-[10px] text-[var(--ui-text-secondary)]">
                            {lockedByMe
                              ? 'En tus manos para editar'
                              : lockedByOther
                                ? `Editando: ${sec.locked_by_email || 'otro miembro'}`
                                : `Libre · v${sec.version}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {lockedByMe ? (
                            <button
                              type="button"
                              disabled={busy !== null}
                              onClick={() => void handleToggleLock(sec, 'release')}
                              className="px-2.5 py-1 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              style={{ borderRadius: radius.control }}
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Soltar</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busy !== null || lockedByOther}
                              onClick={() => void handleToggleLock(sec, 'acquire')}
                              className="px-2.5 py-1 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              style={{ borderRadius: radius.control }}
                            >
                              <Lock className="w-3 h-3" />
                              <span>Tomar y editar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Crear nueva Sala de Equipo */}
            <div
              className="p-4 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] space-y-3"
              style={{ borderRadius: radius.card }}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-black text-sm">Crear nueva Sala de Equipo (hasta 10 personas)</h3>
                {hasEditorialTeamPass && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-[var(--color-status-success-text)]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Habilitado
                  </span>
                )}
              </div>

              {hasEditorialTeamPass ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <Field
                      label="Nombre del proyecto compartido"
                      value={newTitle}
                      onChange={setNewTitle}
                      placeholder="Tesis Grupo 4 / Informe Anual"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void handleCreateRoom()}
                    className={`${button.base} ${button.primary} self-end whitespace-nowrap`}
                  >
                    {busy === 'create' ? 'Creando sala...' : 'Crear sala con este documento'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-[11px] text-[var(--ui-text-secondary)]">
                    Solo el anfitrión necesita el Pase de Equipo (30 días, sin débito automático). Tus 9 colaboradores editan gratis.
                  </p>
                  {pdfTokens >= teamRedeemCreditsCost && (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void handleRedeemTeamPass()}
                      className="w-full py-2 px-3 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      style={{ borderRadius: radius.control }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Canjear {teamRedeemCreditsCost} créditos de tu billetera → Activar Sala 30 días</span>
                    </button>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void handleBuyTeamPass('mercadopago')}
                      className={`p-2.5 ${button.providerBrand('mercadopago')} flex items-center justify-between cursor-pointer`}
                      style={{ borderRadius: radius.control }}
                    >
                      <span className="font-bold">Mercado Pago (30 días)</span>
                      <span className="font-black">{formatPrice('pass_editorial_team_30d', 'ars')}</span>
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void handleBuyTeamPass('paypal')}
                      className={`p-2.5 ${button.providerBrand('paypal')} flex items-center justify-between cursor-pointer`}
                      style={{ borderRadius: radius.control }}
                    >
                      <span className="font-bold">PayPal (30 días)</span>
                      <span className="font-black">{formatPrice('pass_editorial_team_30d', 'usd')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mis salas disponibles / invitaciones recibidas */}
            <div
              className="p-4 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] space-y-2"
              style={{ borderRadius: radius.card }}
            >
              <h3 className="font-black text-sm">Mis Salas de Equipo</h3>
              {loading ? (
                <p className="text-[11px] text-[var(--ui-text-secondary)]">Buscando salas...</p>
              ) : projects.length === 0 ? (
                <p className="text-[11px] text-[var(--ui-text-secondary)]">
                  Todavía no participás en ninguna sala compartida.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {projects.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] flex items-center justify-between gap-2"
                      style={{ borderRadius: radius.control }}
                    >
                      <div className="min-w-0">
                        <p className="font-bold truncate">{p.title}</p>
                        <p className="text-[10px] text-[var(--ui-text-secondary)]">
                          {p.isOwner ? 'Creada por vos' : 'Colaborador invitado gratis'}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void handleOpenRoom(p.id)}
                        className="px-3 py-1.5 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] text-[11px] font-bold cursor-pointer shrink-0"
                        style={{ borderRadius: radius.control }}
                      >
                        {busy === `load_${p.id}` ? 'Abriendo...' : 'Entrar a la sala'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
