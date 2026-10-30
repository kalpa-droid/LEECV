import React, { useState } from 'react';
import { Search, Crown, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { button, radius, elevationSystem } from '../../../shared/core/uiDesignSystem';
import { Modal } from '../../../shared/core/ui/Modal';
import { Field } from '../../../shared/core/ui/Field';
import { useToast } from '../../../shared/core/ui/Toast';
import { withErrorHandling } from '../../../shared/core/utils/errorHandler';
import { supabase } from '../../../shared/core/lib/supabaseClient';

export function UsersTab({
  users,
  searchQuery,
  setSearchQuery,
  page,
  setPage,
  totalCount,
  pageSize,
  togglePremium,
  setPdfExportAccess,
  onPdfExportAccessUpdated
}: any) {
  const { showError, showSuccess } = useToast();
  const totalPages = Math.ceil(totalCount / pageSize);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [accessMode, setAccessMode] = useState('automatic');
  const [reason, setReason] = useState('');
  const [savingAccess, setSavingAccess] = useState(false);

  function openPdfAccessEditor(user: any) {
    setEditingUser(user);
    setAccessMode(user.pdfExportAccessMode || 'automatic');
    setReason('');
  }

  async function savePdfAccess() {
    if (!editingUser || reason.trim().length < 5) {
      showError('Escribí un motivo de al menos 5 caracteres.');
      return;
    }

    setSavingAccess(true);
    await withErrorHandling(
      async () => {
        await setPdfExportAccess(editingUser.id, accessMode, reason.trim());
        showSuccess(`Acceso PDF actualizado para ${editingUser.email}.`);
        setEditingUser(null);
        await onPdfExportAccessUpdated();
      },
      {
        context: 'Actualización de acceso PDF',
        errorMessage: 'No se pudo actualizar el acceso a exportación PDF.',
        notify: (message) => showError(message),
      }
    );
    setSavingAccess(false);
  }

  return (
    <div className={`bg-[var(--ui-bg-card)] p-5 ${elevationSystem.raised} border border-[var(--color-neutral-border)] space-y-4`} style={{ borderRadius: radius.modal }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[var(--color-neutral-border)] pb-3 gap-3">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-[var(--color-accent-text)]" />
          <h2 className="font-extrabold text-sm text-[var(--color-neutral-text-primary)]">Gestión de Clientes (listCustomers)</h2>
        </div>
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Buscar por email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            className={`w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-primary)] border border-[var(--color-neutral-border)] rounded-[10px] focus:outline-none focus:border-[var(--color-accent-base)] transition`}
          />
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[var(--color-neutral-text-muted)]" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="border-b border-[var(--color-neutral-border)] text-xs text-[var(--color-neutral-text-secondary)]">
              <th className="py-2.5 px-3 font-extrabold">Usuario</th>
              <th className="py-2.5 px-3 font-extrabold">Rol</th>
              <th className="py-2.5 px-3 font-extrabold">Plan</th>
              <th className="py-2.5 px-3 font-extrabold">Créditos y acceso PDF</th>
              <th className="py-2.5 px-3 font-extrabold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-[var(--color-neutral-border)]">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[var(--color-neutral-text-muted)] font-medium">
                  No se encontraron usuarios.
                </td>
              </tr>
            ) : (
              users.map((user: any) => (
                <tr key={user.id} className="hover:bg-[var(--color-neutral-surface-muted)]/50 transition">
                  <td className="py-3 px-3 font-medium text-[var(--color-neutral-text-primary)]">
                    {user.email}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      user.role === 'admin' 
                        ? 'bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)]'
                        : 'bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-secondary)]'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1 w-max px-2 py-0.5 rounded text-[10px] font-bold ${
                        user.plan === 'pro'
                          ? 'bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)] border border-[var(--color-status-warning-base)]/20'
                          : 'bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-secondary)]'
                      }`}>
                        {user.plan === 'pro' && <Crown className="w-3 h-3" />}
                        {user.plan?.toUpperCase() || 'FREE'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-col gap-1 text-[11px] font-medium text-[var(--color-neutral-text-secondary)]">
                      <span>Disponibles: <strong className="text-[var(--color-neutral-text-primary)]">{user.pdfExportTokens || 0}</strong></span>
                      <span className={`w-max rounded px-1.5 py-0.5 text-[9px] font-bold ${
                        user.pdfExportAccessMode === 'enabled'
                          ? 'bg-[var(--color-status-success-muted)] text-[var(--color-status-success-text)]'
                          : user.pdfExportAccessMode === 'disabled'
                          ? 'bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)]'
                          : 'bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-secondary)]'
                      }`}>
                        {user.pdfExportAccessMode === 'enabled'
                          ? 'PDF habilitado sin gastar créditos'
                          : user.pdfExportAccessMode === 'disabled'
                          ? 'PDF bloqueado manualmente'
                          : 'Modo automático'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openPdfAccessEditor(user)}
                        className={`${button.secondary} px-2.5 py-1 text-[10px] font-black`}
                      >
                        Acceso PDF
                      </button>
                      {user.plan !== 'pro' ? (
                        <button
                          onClick={() => togglePremium(user, 'pro')}
                          className={`px-2.5 py-1 text-[10px] font-black bg-[var(--color-status-warning-base)] text-[var(--color-accent-on-base)] rounded-[10px] hover:opacity-90 transition flex items-center gap-1`}
                        >
                          <Crown className="w-3 h-3" />
                          Hacer PRO
                        </button>
                      ) : (
                        <button
                          onClick={() => togglePremium(user, 'free')}
                          className={`px-2.5 py-1 text-[10px] font-black bg-[var(--color-neutral-surface)] border border-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] rounded-[10px] hover:bg-[var(--color-neutral-surface-muted)] transition`}
                        >
                          Revocar PRO
                        </button>
                      )}
                      {/* Botones rápidos +1 / +5 / +10 créditos — Etapa 3 */}
                      <div className="flex items-center gap-1 ml-1">
                        {[1, 5, 10].map((n) => (
                          <button
                            key={n}
                            title={`+${n} créditos`}
                            onClick={async () => {
                              try {
                                await withErrorHandling(
                                  async () => {
                                    const paymentId = `admin:manual:${user.id}:${n}:${new Date().toISOString()}`;
                                    const { error } = await supabase.rpc('grant_export_tokens', {
                                      p_payment_id: paymentId,
                                      p_user_id: user.id,
                                      p_amount: n,
                                      p_email: user.email,
                                    });
                                    if (error) throw error;
                                  },
                                  { context: `Acreditación manual +${n}`, errorMessage: `No se pudo asignar +${n}` }
                                );
                                showSuccess(`+${n} créditos asignados a ${user.email}`);
                              } catch {
                                // error ya notificado por withErrorHandling
                              }
                            }}
                            className={`px-1.5 py-0.5 text-[9px] font-black bg-[var(--color-brand-amber)] text-[var(--color-neutral-text-primary)] rounded hover:opacity-90 transition`}
                          >
                            +{n}
                          </button>
                        ))}
                      </div>
                      <a
                        href={`https://wa.me/5493878342772?text=${encodeURIComponent(`Hola, necesito ayuda con la cuenta de ${user.email}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Contactar por WhatsApp"
                        className="px-1.5 py-0.5 text-[9px] font-black bg-[var(--color-brand-whatsapp)] text-white rounded hover:opacity-90 transition flex items-center gap-0.5"
                      >
                        <span>WA</span>
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-3 border-t border-[var(--color-neutral-border)]">
          <p className="text-[10px] text-[var(--color-neutral-text-muted)] font-medium">
            Página {page + 1} de {totalPages} ({totalCount} en total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className={`p-1 text-[var(--color-neutral-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed border border-[var(--color-neutral-border)] rounded bg-[var(--color-neutral-surface-muted)] hover:bg-[var(--color-neutral-border)] transition`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className={`p-1 text-[var(--color-neutral-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed border border-[var(--color-neutral-border)] rounded bg-[var(--color-neutral-surface-muted)] hover:bg-[var(--color-neutral-border)] transition`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={Boolean(editingUser)}
        onClose={() => !savingAccess && setEditingUser(null)}
        title="Control manual de exportación PDF"
        size="md"
        closeOnOverlayClick={!savingAccess}
      >
        {editingUser && (
          <div className="space-y-4">
            <p className="text-xs ui-text-secondary">
              Usuario: <strong className="ui-text-primary">{editingUser.email}</strong>
            </p>
            <Field
              as="select"
              id="pdf-export-access-mode"
              label="Estado de exportación"
              value={accessMode}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setAccessMode(event.target.value)}
              disabled={savingAccess}
            >
              <option value="automatic">Automático: usar plan y créditos</option>
              <option value="enabled">Habilitado manualmente: no consume créditos</option>
              <option value="disabled">Bloqueado manualmente: no exporta con saldo</option>
            </Field>
            <Field
              as="textarea"
              id="pdf-export-access-reason"
              label="Motivo obligatorio"
              value={reason}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setReason(event.target.value)}
              placeholder="Ej.: pago confirmado por la pasarela, acreditación demorada"
              rows={3}
              maxLength={500}
              disabled={savingAccess}
            />
            <div className="flex justify-end gap-2 border-t border-[var(--color-neutral-border)] pt-4">
              <button
                type="button"
                className={button.secondary}
                onClick={() => setEditingUser(null)}
                disabled={savingAccess}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={button.primary}
                onClick={savePdfAccess}
                disabled={savingAccess || reason.trim().length < 5}
              >
                {savingAccess ? 'Guardando…' : 'Guardar estado'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
