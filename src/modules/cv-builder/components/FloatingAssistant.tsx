/**
 * LIDIO — Asistente flotante del editor (FloatingAssistant.tsx)
 *
 * Reglas de producto: tips 100% locales (inactividad + pestaña activa), la IA
 * solo responde preguntas explícitas. Tips acotados a MAX_TIPS_PER_SESSION por
 * sesión; silenciables desde el panel. Muestra la pestaña activa como contexto.
 *
 * Visible solo en el editor (zona app). Nunca en landing/blog.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Send, Lightbulb, MessageCircleQuestion, BellOff, Check } from 'lucide-react';
import { DomSectionIcon } from '../../../shared/core/pdf-engine/layers/icons/DomSectionIcon';
import { UI_ICON_IDS } from '../../../shared/core/ui/iconCatalog';
import { elevationSystem, zIndex, button } from '../../../shared/core/uiDesignSystem';
import {
  ASSISTANT_NAME,
  ASSISTANT_SESSION_KEY,
  ASSISTANT_STORAGE_KEY,
  ASSISTANT_TAGLINE,
  ALL_TIPS,
  AssistantTip,
  SuggestedAssistantAction,
  canShowMoreTips,
  countSeen,
  filterSuggestedActions,
  markTipSeen,
  parseAssistantState,
  parseSessionCount,
  pickNextTip,
  serializeAssistantState,
  FIRST_TIP_IDLE_MS,
  NEXT_TIP_IDLE_MS,
  validateAssistantTargetTab,
} from '../../../shared/core/assistant/assistantTips';
import { executeAiTask } from '../../../shared/core/ai/aiClient';
import { useToast } from '../../../shared/core/ui/Toast';

interface FloatingAssistantProps {
  /** Pestaña activa del panel editor (ej: 'vacante', 'carta'). */
  activeTab: string;
  /** Navegación al estilo EditorPanel.changeActiveTab (setActiveTab + scroll al ancla). */
  onNavigate: (tabId: string) => void;
  /** cvData para validar destinos de las acciones sugeridas por la IA. */
  cvData?: any;
}

interface ChatMessage {
  role: 'user' | 'ia';
  text: string;
  actions?: SuggestedAssistantAction[];
}

const loadState = () =>
  typeof window === 'undefined'
    ? { seenTipIds: [] as string[], doNotDisturb: false }
    : parseAssistantState(localStorage.getItem(ASSISTANT_STORAGE_KEY));

const loadSessionCount = () =>
  typeof window === 'undefined' ? 0 : parseSessionCount(sessionStorage.getItem(ASSISTANT_SESSION_KEY));

export const FloatingAssistant: React.FC<FloatingAssistantProps> = ({ activeTab, onNavigate, cvData }) => {
  const { showError } = useToast();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'tips' | 'chat'>('tips');
  const [stored, setStored] = useState(loadState);
  const [sessionCount, setSessionCount] = useState(loadSessionCount);
  const [currentTip, setCurrentTip] = useState<AssistantTip | null>(null);
  const [showAllTips, setShowAllTips] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // Refs espejo para que los timers/listeners nunca lean estado viejo
  const idleTimer = useRef<number | null>(null);
  const tipDelay = useRef(FIRST_TIP_IDLE_MS);
  const activeTabRef = useRef(activeTab);
  const storedRef = useRef(stored);
  const sessionCountRef = useRef(sessionCount);
  const currentTipRef = useRef(currentTip);
  const openRef = useRef(open);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { storedRef.current = stored; }, [stored]);
  useEffect(() => { sessionCountRef.current = sessionCount; }, [sessionCount]);
  useEffect(() => { currentTipRef.current = currentTip; }, [currentTip]);
  useEffect(() => { openRef.current = open; }, [open]);

  const persistStored = useCallback((next: typeof stored) => {
    setStored(next);
    try { localStorage.setItem(ASSISTANT_STORAGE_KEY, serializeAssistantState(next)); } catch { /* storage lleno/bloqueado: silencio */ }
  }, []);

  const persistSessionCount = useCallback((n: number) => {
    setSessionCount(n);
    try { sessionStorage.setItem(ASSISTANT_SESSION_KEY, String(n)); } catch { /* silencio */ }
  }, []);

  const canTip = useCallback(
    () => canShowMoreTips(storedRef.current.doNotDisturb, sessionCountRef.current),
    [],
  );

  const tryShowNextTip = useCallback(() => {
    if (openRef.current) { tipDelay.current = NEXT_TIP_IDLE_MS; scheduleNext(); return; }
    if (!canTip()) return;
    if (currentTipRef.current) { tipDelay.current = NEXT_TIP_IDLE_MS; scheduleNext(); return; }
    const tip = pickNextTip(activeTabRef.current, storedRef.current.seenTipIds);
    if (!tip) return;
    const updated = { ...storedRef.current, seenTipIds: markTipSeen(storedRef.current.seenTipIds, tip.id) };
    persistStored(updated);
    persistSessionCount(sessionCountRef.current + 1);
    setCurrentTip(tip);
    tipDelay.current = NEXT_TIP_IDLE_MS;
    if (canShowMoreTips(updated.doNotDisturb, sessionCountRef.current + 1)) scheduleNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canTip, persistStored, persistSessionCount]);

  const scheduleNext = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(tryShowNextTip, tipDelay.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tryShowNextTip]);

  // Inactividad: cualquier interacción "resetea" el reloj del próximo tip
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reset = () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      if (canTip()) idleTimer.current = window.setTimeout(tryShowNextTip, tipDelay.current);
    };
    const events = ['pointerdown', 'keydown', 'wheel', 'scroll'] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    if (canTip()) idleTimer.current = window.setTimeout(tryShowNextTip, tipDelay.current);
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape cierra el panel
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Autoscroll del chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const goToTab = useCallback((tabId: string) => {
    const dest = validateAssistantTargetTab(tabId, cvData);
    if (dest) {
      onNavigate(dest);
      setOpen(false);
    }
  }, [cvData, onNavigate]);

  const dismissCurrentTip = useCallback(() => {
    setCurrentTip(null);
    if (canTip()) { tipDelay.current = NEXT_TIP_IDLE_MS; scheduleNext(); }
  }, [canTip, scheduleNext]);

  const toggleDoNotDisturb = useCallback(() => {
    persistStored({ ...storedRef.current, doNotDisturb: !storedRef.current.doNotDisturb });
  }, [persistStored]);

  const sendChat = useCallback(async () => {
    const question = input.trim();
    if (!question || sending) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setSending(true);
    try {
      const res = await executeAiTask<{ answer: string; suggestedActions?: SuggestedAssistantAction[] }>({
        taskId: 'app_guide_assistant',
        payload: { question, activeTab, docType: 'cv' },
      });
      const actions = filterSuggestedActions(res.data?.suggestedActions, cvData);
      setMessages((m) => [...m, { role: 'ia', text: res.data?.answer || 'Sin respuesta.', actions }]);
    } catch (err) {
      console.error('[Lidio] chat error:', err);
      showError('Lidio no pudo responder ahora. Probá de nuevo en un momento.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, activeTab, cvData, showError]);

  const seenCount = countSeen(stored.seenTipIds);

  const unread = Boolean(currentTip) && !open;

  return (
    <div className="print:hidden">
      {/* FAB — burbuja flotante inferior derecha */}
      <button
        type="button"
        aria-label={`Abrir ${ASSISTANT_NAME}, el asistente del editor`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{ zIndex: zIndex.drawer }}
        className={`fixed bottom-5 right-5 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-accent-base)]/30 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-base)] ${elevationSystem.floating}`}
      >
        <DomSectionIcon iconId={UI_ICON_IDS.assistant} className="h-5 w-5" color="currentColor" />
        {unread && (
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-[var(--color-status-danger-base)] border-2 border-[var(--color-accent-on-base)]" aria-label="Tip nuevo" />
        )}
      </button>

      {/* Panel flotante */}
      {open && (
        <section
          role="dialog"
          aria-label={`${ASSISTANT_NAME} — ${ASSISTANT_TAGLINE}`}
          className={`ui-assistant-pop fixed bottom-20 right-5 flex w-[min(360px,calc(100vw-2rem))] max-h-[70vh] flex-col overflow-hidden rounded-[var(--ui-radius-card)] border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] ${elevationSystem.overlay}`}
          style={{ zIndex: zIndex.drawer }}
        >
          {/* Header */}
          <header className="flex items-center gap-2.5 border-b border-[var(--ui-border)] px-3 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]">
              <DomSectionIcon iconId={UI_ICON_IDS.assistant} className="h-4 w-4" color="currentColor" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-extrabold leading-tight">{ASSISTANT_NAME}</div>
              <div className="truncate text-[10px] text-[var(--ui-text-secondary)]">{ASSISTANT_TAGLINE}</div>
            </div>
            <button
              type="button"
              aria-label="Cerrar asistente"
              onClick={() => setOpen(false)}
              className={`${button.ghost} cursor-pointer rounded-[10px] p-1.5`}
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          {/* Tabs */}
          <div className="flex border-b border-[var(--ui-border)] text-[11px] font-bold" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'tips'}
              onClick={() => setView('tips')}
              className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 cursor-pointer ${view === 'tips' ? 'bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)]' : 'text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)]'}`}
            >
              <Lightbulb className="h-3.5 w-3.5" /> Tips
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'chat'}
              onClick={() => setView('chat')}
              className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 cursor-pointer ${view === 'chat' ? 'bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)]' : 'text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)]'}`}
            >
              <MessageCircleQuestion className="h-3.5 w-3.5" /> Preguntar
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-3 text-[12px] leading-relaxed">
            {view === 'tips' ? (
              <div className="space-y-3">
                {currentTip ? (
                  <div className="space-y-1.5 rounded-[var(--ui-radius-card)] border border-[var(--color-accent-base)]/30 bg-[var(--color-accent-muted)] p-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[var(--color-accent-text)]">
                      <Lightbulb className="h-3.5 w-3.5" /> Tip del momento
                    </div>
                    <div className="text-[13px] font-bold">{currentTip.title}</div>
                    <p className="text-[var(--ui-text-secondary)]">{currentTip.body}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {validateAssistantTargetTab(currentTip.targetTab, cvData) && (
                        <button type="button" onClick={() => currentTip.targetTab && goToTab(currentTip.targetTab)} className={`${button.secondary} cursor-pointer px-2.5 py-1 text-[11px]`}>
                          Ir
                        </button>
                      )}
                      <button type="button" onClick={dismissCurrentTip} className={`${button.ghost} cursor-pointer px-2.5 py-1 text-[11px]`}>
                        <Check className="mr-1 inline h-3 w-3" /> Entendido
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[var(--ui-text-secondary)]">
                    Sin tips nuevos por ahora. Vuelvo a avisar si hay algo útil mientras trabajás.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setShowAllTips((s) => !s)}
                  className="cursor-pointer text-[11px] font-bold text-[var(--color-accent-text)] hover:underline"
                >
                  {showAllTips ? 'Ocultar' : 'Ver'} todos los tips ({seenCount}/{ALL_TIPS.length} vistos)
                </button>

                {showAllTips && (
                  <ul className="space-y-2">
                    {ALL_TIPS.map((tip) => (
                      <li key={tip.id} className="flex items-start gap-2 rounded-[var(--ui-radius-card)] border border-[var(--ui-border)] bg-[var(--ui-bg-card)] p-2">
                        <span className="mt-0.5 shrink-0 text-[var(--ui-text-secondary)]">
                          {stored.seenTipIds.includes(tip.id) ? <Check className="h-3.5 w-3.5" /> : <Lightbulb className="h-3.5 w-3.5" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold">{tip.title}</div>
                          <p className="text-[11px] text-[var(--ui-text-secondary)]">{tip.body}</p>
                          {validateAssistantTargetTab(tip.targetTab, cvData) && (
                            <button type="button" onClick={() => tip.targetTab && goToTab(tip.targetTab)} className="mt-1 cursor-pointer text-[10px] font-bold text-[var(--color-accent-text)] hover:underline">
                              Ir a la sección
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {messages.length === 0 && (
                  <p className="text-[var(--ui-text-secondary)]">
                    Preguntale a {ASSISTANT_NAME} cómo usar la app: dónde está cada cosa, cómo mover secciones entre columnas, qué es una postulación o cómo pasa el Diagnóstico ATS.
                  </p>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-[var(--ui-radius-card)] px-2.5 py-1.5 ${m.role === 'user' ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]' : 'border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)]'}`}>
                      <p className="whitespace-pre-wrap">{m.text}</p>
                      {m.actions && m.actions.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {m.actions.map((a, j) => (
                            <button
                              key={j}
                              type="button"
                              onClick={() => a.targetTab && goToTab(a.targetTab)}
                              className={`${button.secondary} cursor-pointer px-2 py-0.5 text-[10px]`}
                            >
                              {a.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {sending && <p className="text-[11px] text-[var(--ui-text-secondary)]">{ASSISTANT_NAME} está escribiendo…</p>}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Footer */}
          {view === 'tips' ? (
            <footer className="border-t border-[var(--ui-border)] px-3 py-2">
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-[var(--ui-text-secondary)]">
                <input
                  type="checkbox"
                  checked={stored.doNotDisturb}
                  onChange={toggleDoNotDisturb}
                  className="h-3.5 w-3.5 accent-[var(--color-accent-base)]"
                />
                <BellOff className="h-3.5 w-3.5" /> Silenciar tips automáticos
              </label>
            </footer>
          ) : (
            <footer className="space-y-1 border-t border-[var(--ui-border)] px-3 py-2">
              <form
                onSubmit={(e) => { e.preventDefault(); sendChat(); }}
                className="flex gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ej: ¿cómo muevo Idiomas a la barra lateral?"
                  maxLength={300}
                  aria-label="Tu pregunta para Lidio"
                  className="min-w-0 flex-1 rounded-[10px] border border-[var(--ui-border)] bg-[var(--ui-bg-input)] px-2.5 py-1.5 text-[12px] focus:outline-none focus:border-[var(--color-accent-base)]"
                />
                <button type="submit" disabled={sending || !input.trim()} className={`${button.primary} cursor-pointer px-3 py-1.5`} aria-label="Enviar pregunta">
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
              <p className="text-[10px] text-[var(--ui-text-secondary)]">
                Respuestas generadas por IA. Revisalas antes de aplicarlas; nunca se guardan solas.
              </p>
            </footer>
          )}
        </section>
      )}
    </div>
  );
};

export default FloatingAssistant;
