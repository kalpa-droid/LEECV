/**
 * LIDIO — Asistente flotante del editor (FloatingAssistant.tsx)
 *
 * Tips 100% locales (inactividad + pestaña activa); la IA solo responde
 * preguntas explícitas. El tip nuevo llega como notificación toast (macOS).
 * Zona app solamente.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Send, Lightbulb, MessageCircleQuestion, Bell, BellOff, Check, List, RefreshCw } from 'lucide-react';
import { DomSectionIcon } from '../pdf-engine/layers/icons/DomSectionIcon';
import { UI_ICON_IDS } from '../ui/iconCatalog';
import { elevationSystem, zIndex, button } from '../uiDesignSystem';
import {
  ASSISTANT_NAME, AssistantDocType, AssistantTip, SuggestedAssistantAction,
  canShowMoreTips, countSeen, filterSuggestedActions, getAllTips,
  getAssistantSessionKey, getAssistantStorageKey, markTipSeen, parseAssistantState,
  parseSessionCount, pickAlwaysTip, pickNextTip, pickNextTipCycled, serializeAssistantState,
  FIRST_TIP_IDLE_MS, NEXT_TIP_IDLE_MS,
  validateAssistantTargetTab, buildAssistantEditorSnapshot, buildAssistantBookSnapshot,
  buildAssistantInvoiceSnapshot,
} from '../assistant/assistantTips';
import { getDocumentTypeConfig } from '../capabilities/capabilityRegistry';
import type { MetadataOnlyContext } from '../../contracts/assistantContract';
import { executeAiTask } from '../ai/aiClient';
import { useToast } from '../ui/Toast';
import { AssistantNotificationToast } from './AssistantNotificationToast';
import { LidioLiveMessage, subscribeLidioMessages } from '../assistant/lidioBus';

interface FloatingAssistantProps {
  activeTab: string;
  onNavigate: (tabId: string) => void;
  cvData?: any;
  atsScore?: number;
  /** Tipo de documento del editor que monta el asistente. Default 'cv'. */
  docType?: AssistantDocType;
  /** Opciones del libro (Book Studio); solo se leen campos estructurales, sin PII. */
  bookOptions?: any;
  /** Contexto `metadata-only` con reporte de completitud (FacturLee — sin valores). */
  metadataOnlyContext?: MetadataOnlyContext | null;
}

interface ChatMessage {
  role: 'user' | 'ia';
  text: string;
  actions?: SuggestedAssistantAction[];
}

/** Textos visibles por tipo de documento (zona app). */
const DOC_META: Record<AssistantDocType, { ariaOpen: string; subtitle: string; emptyHint: string; placeholder: string }> = {
  cv: {
    ariaOpen: 'el asistente del editor',
    subtitle: 'Asistente del editor',
    emptyHint: `Preguntale a ${ASSISTANT_NAME} cómo usar la app: dónde está cada cosa, cómo mover secciones entre columna principal y barra lateral, qué es una postulación o cómo pasa el Diagnóstico ATS.`,
    placeholder: 'Ej: ¿cómo muevo Idiomas a la barra lateral?',
  },
  cover_letter: {
    ariaOpen: 'el asistente de cartas',
    subtitle: 'Asistente de cartas',
    emptyHint: `Preguntale a ${ASSISTANT_NAME} cómo redactar tu carta en 3 párrafos, quitar frases de relleno o exportarla en PDF o Word.`,
    placeholder: 'Ej: ¿cómo empiezo el primer párrafo?',
  },
  business_card: {
    ariaOpen: 'el asistente de tarjetas',
    subtitle: 'Asistente de tarjetas',
    emptyHint: `Preguntale a ${ASSISTANT_NAME} cómo traer datos desde tu CV, generar el QR de contacto o exportar una hoja lista para imprimir.`,
    placeholder: 'Ej: ¿cómo importo mis datos del CV?',
  },
  book: {
    ariaOpen: 'el asistente del estudio',
    subtitle: 'Asistente del estudio',
    emptyHint: `Preguntale a ${ASSISTANT_NAME} cómo usar el estudio: cargar tu PDF, ordenar las páginas, armar tapa y contratapa, calibrar un número o exportar tu libro listo para imprimir.`,
    placeholder: 'Ej: ¿cómo armo la tapa?',
  },
  planner: {
    ariaOpen: 'el asistente de agendas',
    subtitle: 'Asistente de agendas',
    emptyHint: `Preguntale a ${ASSISTANT_NAME} cómo elegir en qué hoja imprimir, activar vistas semanales o mensuales y descargar tu agenda para imprimir.`,
    placeholder: 'Ej: ¿qué formato de agenda conviene?',
  },
  invoice: {
    ariaOpen: 'el asistente del facturador',
    subtitle: 'Asistente del facturador',
    emptyHint: `Preguntale a ${ASSISTANT_NAME} qué campos obligatorios te faltan completar o cómo usar FacturLee. Tus datos nunca salen de tu compu.`,
    placeholder: 'Ej: ¿qué me falta completar en este comprobante?',
  },
  editorial: {
    ariaOpen: 'el asistente de edición',
    subtitle: 'Asistente de edición',
    emptyHint: `Preguntale a ${ASSISTANT_NAME} cómo maquetar tu obra: armar la portada, agregar secciones, ajustar márgenes o calcular el índice automático.`,
    placeholder: 'Ej: ¿cómo armo el índice automático?',
  },
};

const QUICK_QUESTIONS_BY_DOC: Record<AssistantDocType, string[]> = {
  cv: ['¿Cómo me postulo?', 'Mejorar mi ATS', 'Cambiar diseño'],
  cover_letter: ['¿Cómo armo los 3 párrafos?', 'Evitar frases de relleno', 'Exportar a Word'],
  business_card: ['Traer datos del CV', '¿Cómo funciona el QR?', 'Imprimir varias por hoja'],
  book: ['¿Cómo armo mi libro?', 'Tapa y contratapa', '¿Cómo lo imprimo?'],
  planner: ['¿En qué hoja imprimir?', 'Activar vistas', 'Exportar a PDF'],
  invoice: ['¿Qué campos me faltan?', '¿Es una factura fiscal?', '¿Dónde guardo el respaldo?'],
  editorial: ['¿Cómo armo el índice?', 'Configurar márgenes', 'Exportar a PDF'],
};

const loadState = (docType: AssistantDocType) => (typeof window === 'undefined'
  ? { seenTipIds: [] as string[], doNotDisturb: false }
  : parseAssistantState(localStorage.getItem(getAssistantStorageKey(docType))));
const loadSessionCount = (docType: AssistantDocType) => (typeof window === 'undefined'
  ? 0
  : parseSessionCount(sessionStorage.getItem(getAssistantSessionKey(docType))));

export const FloatingAssistant: React.FC<FloatingAssistantProps> = ({
  activeTab,
  onNavigate,
  cvData,
  atsScore,
  docType = 'cv',
  bookOptions,
  metadataOnlyContext,
}) => {
  const { showError } = useToast();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'tips' | 'chat'>('tips');
  const [stored, setStored] = useState(() => loadState(docType));
  const [sessionCount, setSessionCount] = useState(() => loadSessionCount(docType));
  const [currentTip, setCurrentTip] = useState<AssistantTip | null>(null);
  const [showAllTips, setShowAllTips] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [toastTip, setToastTip] = useState<AssistantTip | null>(null);
  const [liveMessage, setLiveMessage] = useState<LidioLiveMessage | null>(null);

  const idleTimer = useRef<number | null>(null);
  const tipDelay = useRef(FIRST_TIP_IDLE_MS);
  const activeTabRef = useRef(activeTab);
  const storedRef = useRef(stored);
  const sessionCountRef = useRef(sessionCount);
  const currentTipRef = useRef(currentTip);
  const openRef = useRef(open);
  const viewRef = useRef(view);
  const lastShownTipRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { storedRef.current = stored; }, [stored]);
  useEffect(() => { sessionCountRef.current = sessionCount; }, [sessionCount]);
  useEffect(() => { currentTipRef.current = currentTip; }, [currentTip]);
  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { if (currentTip) lastShownTipRef.current = currentTip.id; }, [currentTip]);

  const persistStored = useCallback((next: typeof stored) => {
    setStored(next);
    try { localStorage.setItem(getAssistantStorageKey(docType), serializeAssistantState(next)); } catch { }
  }, [docType]);

  const persistSessionCount = useCallback((n: number) => {
    setSessionCount(n);
    try { sessionStorage.setItem(getAssistantSessionKey(docType), String(n)); } catch { }
  }, [docType]);

  const canTip = useCallback(
    () => canShowMoreTips(storedRef.current.doNotDisturb, sessionCountRef.current),
    [],
  );

  const scheduleNext = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(tryShowNextTip, tipDelay.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tryShowNextTip = useCallback(() => {
    if (openRef.current) { tipDelay.current = NEXT_TIP_IDLE_MS; scheduleNext(); return; }
    if (!canTip()) return;
    if (currentTipRef.current) { tipDelay.current = NEXT_TIP_IDLE_MS; scheduleNext(); return; }
    // LIDIO SIEMPRE CON TIP: si el catálogo no visto se agotó, pickAlwaysTip
    // entra en modo repaso (rotación del catálogo) y JAMÁS devuelve null.
    const tip = pickNextTip(activeTabRef.current, storedRef.current.seenTipIds, docType)
      ?? pickAlwaysTip(activeTabRef.current, storedRef.current.seenTipIds, docType);
    const updated = { ...storedRef.current, seenTipIds: markTipSeen(storedRef.current.seenTipIds, tip.id) };
    persistStored(updated);
    persistSessionCount(sessionCountRef.current + 1);
    setCurrentTip(tip);
    if (!storedRef.current.doNotDisturb) setToastTip(tip);
    tipDelay.current = NEXT_TIP_IDLE_MS;
    if (canShowMoreTips(updated.doNotDisturb, sessionCountRef.current + 1)) scheduleNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canTip, persistStored, persistSessionCount, scheduleNext, docType]);

  /** Cierra el panel y libera el tip activo: al reabrir se resuelve uno fresco. */
  const closePanel = useCallback(() => {
    setOpen(false);
    setToastTip(null);
    setCurrentTip(null);
  }, []);

  /**
   * Resuelve un tip al instante cuando el panel se abre (o se entra a la vista
   * Tips) sin uno activo: nunca se ve un panel vacío esperando el timer de
   * 20s. No cuenta para el tope por sesión ni dispara toast (es la vista que
   * pidió el usuario, no un empujón automático). En modo repaso (todo visto)
   * rota desde el último tip mostrado: cada apertura avanza el ciclo.
   */
  const resolveTipForPanel = useCallback(() => {
    if (currentTipRef.current) return;
    const tip = pickAlwaysTip(activeTabRef.current, storedRef.current.seenTipIds, docType, lastShownTipRef.current);
    persistStored({ ...storedRef.current, seenTipIds: markTipSeen(storedRef.current.seenTipIds, tip.id) });
    setCurrentTip(tip);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docType, persistStored]);

  const handleToggleOpen = useCallback(() => {
    const next = !openRef.current;
    setOpen(next);
    setToastTip(null);
    if (next && viewRef.current === 'tips') resolveTipForPanel();
  }, [resolveTipForPanel]);

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
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closePanel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closePanel]);

  // Autoscroll del chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  // Bus vivo de Lidio (`?`, cambios de estado de ojo/perilla y guardado en carpeta)
  useEffect(() => {
    return subscribeLidioMessages((msg) => {
      setLiveMessage(msg);
      setToastTip(null);
    });
  }, []);

  const goToTab = useCallback((tabId: string) => {
    const dest = validateAssistantTargetTab(tabId, cvData, docType);
    if (dest) {
      onNavigate(dest);
      closePanel();
    }
  }, [cvData, onNavigate, docType, closePanel]);

  const dismissToast = useCallback(() => {
    if (liveMessage) {
      setLiveMessage(null);
      return;
    }
    setToastTip(null);
    setCurrentTip(null);
    if (canTip()) { tipDelay.current = NEXT_TIP_IDLE_MS; scheduleNext(); }
  }, [liveMessage, canTip, scheduleNext]);

  /** "Otro tip": avance manual por el catálogo, sin tope de sesión ni toast. */
  const showAnotherTip = useCallback(() => {
    const next = pickNextTipCycled(currentTipRef.current?.id, storedRef.current.seenTipIds, docType);
    if (!next || next.id === currentTipRef.current?.id) return;
    persistStored({ ...storedRef.current, seenTipIds: markTipSeen(storedRef.current.seenTipIds, next.id) });
    setCurrentTip(next);
  }, [docType, persistStored]);

  /** "Entendido": descarta el activo y precarga el siguiente dentro del panel. */
  const acknowledgeTip = useCallback(() => {
    const next = pickNextTipCycled(currentTipRef.current?.id, storedRef.current.seenTipIds, docType);
    setCurrentTip(next && next.id !== currentTipRef.current?.id ? next : null);
    if (canTip()) { tipDelay.current = NEXT_TIP_IDLE_MS; scheduleNext(); }
  }, [docType, canTip, scheduleNext]);

  const toggleDoNotDisturb = useCallback(() => {
    persistStored({ ...storedRef.current, doNotDisturb: !storedRef.current.doNotDisturb });
  }, [persistStored]);

  const sendChat = useCallback(async (forced?: string) => {
    const question = (forced ?? input).trim();
    if (!question || sending) return;
    setInput('');
    const userTurn: ChatMessage = { role: 'user', text: question };
    setMessages((m) => [...m, userTurn]);
    setSending(true);
    try {
      const privacyPolicy = getDocumentTypeConfig(docType).assistant.privacy;
      const editorState =
        privacyPolicy === 'metadata-only'
          ? buildAssistantInvoiceSnapshot(activeTab, metadataOnlyContext)
          : bookOptions !== undefined
            ? buildAssistantBookSnapshot(bookOptions, activeTab)
            : buildAssistantEditorSnapshot(cvData, activeTab, atsScore);
      const res = await executeAiTask<{ answer: string; suggestedActions?: SuggestedAssistantAction[] }>({
        taskId: 'app_guide_assistant',
        payload: { question, activeTab, docType, editorState, history: messages },
      });
      const actions = filterSuggestedActions(res.data?.suggestedActions, cvData, docType);
      setMessages((m) => [...m, { role: 'ia', text: res.data?.answer || 'Sin respuesta.', actions }]);
    } catch (err) {
      console.error('[Lidio] chat error:', err);
      showError('Lidio no pudo responder ahora. Probá de nuevo en un momento.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, activeTab, cvData, atsScore, messages, showError, docType, bookOptions, metadataOnlyContext]);

  const allTips = getAllTips(docType);
  const seenCount = countSeen(stored.seenTipIds);

  return (
    <div className="print:hidden">
      <div
        className="fixed bottom-[86px] right-3 md:bottom-5 md:right-5"
        style={{ zIndex: zIndex.assistantFab }}
      >
        <button
          type="button"
          aria-label={`Abrir ${ASSISTANT_NAME}, ${DOC_META[docType].ariaOpen}`}
          aria-expanded={open}
          onClick={handleToggleOpen}
          className={`flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-accent-base)]/30 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-base)] ${elevationSystem.floating} cursor-pointer`}
        >
          <DomSectionIcon iconId={UI_ICON_IDS.assistant} className="h-5 w-5" color="currentColor" />
          {(toastTip || liveMessage) && !open && (
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-[var(--color-status-danger-base)] border-2 border-[var(--color-accent-on-base)]" aria-label="Tip nuevo" />
          )}
        </button>

        {open && (
          <>
            <div
              className="md:hidden fixed inset-0 bg-black/55 backdrop-blur-xs"
              style={{ zIndex: zIndex.assistantDialog - 1 }}
              onClick={closePanel}
              aria-hidden="true"
            />
            <section
              role="dialog"
              aria-label={ASSISTANT_NAME}
              className={`ui-assistant-pop fixed bottom-0 left-0 right-0 h-[82dvh] rounded-t-[20px] md:bottom-20 md:left-auto md:right-5 md:h-auto md:w-[380px] md:max-h-[72vh] md:rounded-[var(--ui-radius-card)] flex flex-col overflow-hidden border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] ${elevationSystem.overlay}`}
              style={{ zIndex: zIndex.assistantDialog }}
            >
            <header className="flex items-center gap-2.5 border-b border-[var(--ui-border)] px-3 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]">
                <DomSectionIcon iconId={UI_ICON_IDS.assistant} className="h-4 w-4" color="currentColor" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-extrabold leading-tight">{ASSISTANT_NAME}</div>
                <div className="truncate text-[10px] text-[var(--ui-text-secondary)]">{DOC_META[docType].subtitle}</div>
              </div>
              <button
                type="button"
                aria-label={stored.doNotDisturb ? 'Activar tips automáticos' : 'Silenciar tips automáticos'}
                title={stored.doNotDisturb ? 'Activar tips automáticos' : 'Silenciar tips automáticos'}
                aria-pressed={stored.doNotDisturb}
                onClick={toggleDoNotDisturb}
                className={`${button.ghost} cursor-pointer rounded-[10px] p-1.5`}
              >
                {stored.doNotDisturb ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              </button>
              <button
                type="button"
                aria-label="Cerrar asistente"
                onClick={closePanel}
                className={`${button.ghost} cursor-pointer rounded-[10px] p-1.5`}
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex border-b border-[var(--ui-border)]" role="tablist">
              <button type="button" role="tab" aria-label="Tips" title="Tips" aria-selected={view === 'tips'} onClick={() => { setView('tips'); resolveTipForPanel(); }} className={`flex h-9 flex-1 items-center justify-center px-3 cursor-pointer ${view === 'tips' ? 'bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)]' : 'text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)]'}`}>
                <Lightbulb className="h-4 w-4" />
              </button>
              <button type="button" role="tab" aria-label="Preguntar" title="Preguntar" aria-selected={view === 'chat'} onClick={() => setView('chat')} className={`flex h-9 flex-1 items-center justify-center px-3 cursor-pointer ${view === 'chat' ? 'bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)]' : 'text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)]'}`}>
                <MessageCircleQuestion className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 text-[12px] leading-relaxed">
              {view === 'tips' ? (
                <div className="space-y-2.5">
                  {currentTip ? (
                    <div className="space-y-1.5 rounded-[var(--ui-radius-card)] border border-[var(--color-accent-base)]/30 bg-[var(--color-accent-muted)] p-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[var(--color-accent-text)]">
                        <Lightbulb className="h-3.5 w-3.5" /> Tip del momento
                      </div>
                      <div className="text-[13px] font-bold">{currentTip.title}</div>
                      <p className="text-[var(--ui-text-secondary)]">{currentTip.body}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {validateAssistantTargetTab(currentTip.targetTab, cvData, docType) && (
                          <button type="button" onClick={() => currentTip.targetTab && goToTab(currentTip.targetTab)} className={`${button.secondary} cursor-pointer px-2.5 py-1 text-[11px]`}>
                            Ir
                          </button>
                        )}
                        <button type="button" onClick={showAnotherTip} className={`${button.secondary} cursor-pointer px-2.5 py-1 text-[11px]`} aria-label="Mostrar otro tip">
                          <RefreshCw className="mr-1 inline h-3 w-3" /> Otro tip
                        </button>
                        <button type="button" onClick={acknowledgeTip} className={`${button.ghost} cursor-pointer px-2.5 py-1 text-[11px]`}>
                          <Check className="mr-1 inline h-3 w-3" /> Entendido
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-[var(--ui-radius-card)] border border-[var(--ui-border)] bg-[var(--ui-bg-card)] p-3">
                      <p className="text-[12px] font-bold text-[var(--ui-text-primary)]">Estás al día</p>
                      <p className="text-[11px] text-[var(--ui-text-secondary)]">Vuelvo a avisar solo si hay algo útil. Mientras tanto:</p>
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => setShowAllTips(true)} className={`${button.secondary} cursor-pointer px-2 py-1 text-[11px]`}>Ver todos los tips</button>
                        <button type="button" onClick={() => setView('chat')} className={`${button.ghost} cursor-pointer px-2 py-1 text-[11px]`}>Preguntarle a Lidio</button>
                      </div>
                    </div>
                  )}

                  <button type="button" onClick={() => setShowAllTips((s) => !s)} aria-label={`${showAllTips ? 'Ocultar' : 'Ver'} todos los tips`} title={`${showAllTips ? 'Ocultar' : 'Ver'} todos los tips`} className="flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-[var(--ui-border)] bg-[var(--ui-bg-card)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--color-accent-text)] hover:bg-[var(--ui-bg-hover)]">
                    <List className="h-3.5 w-3.5" />
                    {showAllTips ? 'Ocultar' : 'Ver'} todos los tips
                    <span className="rounded-full bg-[var(--color-accent-muted)] px-1.5 py-0.5 text-[10px] text-[var(--color-accent-text)]">{seenCount}/{allTips.length}</span>
                  </button>

                  {showAllTips && (
                    <ul className="space-y-2">
                      {allTips.map((tip) => (
                        <li key={tip.id} className="flex items-start gap-2 rounded-[var(--ui-radius-card)] border border-[var(--ui-border)] bg-[var(--ui-bg-card)] p-2">
                          <span className="mt-0.5 shrink-0 text-[var(--ui-text-secondary)]">
                            {stored.seenTipIds.includes(tip.id) ? <Check className="h-3.5 w-3.5" /> : <Lightbulb className="h-3.5 w-3.5" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-bold">{tip.title}</div>
                            <p className="text-[11px] text-[var(--ui-text-secondary)]">{tip.body}</p>
                            {validateAssistantTargetTab(tip.targetTab, cvData, docType) && (
                              <button type="button" onClick={() => tip.targetTab && goToTab(tip.targetTab)} className="mt-1 cursor-pointer text-[10px] font-bold text-[var(--color-accent-text)] hover:underline">Ir a la sección</button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.length === 0 && !sending && (
                    <div className="space-y-2">
                      <p className="text-[var(--ui-text-secondary)]">
                        {DOC_META[docType].emptyHint}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_QUESTIONS_BY_DOC[docType].map((q) => (
                          <button key={q} type="button" onClick={() => sendChat(q)} className={`${button.secondary} cursor-pointer px-2 py-1 text-[11px]`}>{q}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-[var(--ui-radius-card)] px-2.5 py-1.5 ${m.role === 'user' ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]' : 'border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)]'}`}>
                        <p className="whitespace-pre-wrap">{m.text}</p>
                        {m.actions && m.actions.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {m.actions.map((a, j) => (
                              <button key={j} type="button" onClick={() => a.targetTab && goToTab(a.targetTab)} className={`${button.secondary} cursor-pointer px-2 py-0.5 text-[10px]`}>{a.label}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div className="flex items-center gap-1 px-1 py-1" aria-label={`${ASSISTANT_NAME} está escribiendo`}>
                      <span className="ui-assistant-typing-dot" />
                      <span className="ui-assistant-typing-dot" />
                      <span className="ui-assistant-typing-dot" />
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

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
                  placeholder={DOC_META[docType].placeholder}
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
          </section>
          </>
        )}
      </div>

      {(liveMessage || toastTip) && !open && (
        <AssistantNotificationToast
          key={liveMessage?.id || toastTip?.id}
          liveMessage={liveMessage}
          tip={liveMessage ? null : toastTip}
          onDismiss={dismissToast}
          onGoToTab={(tabId) => {
            goToTab(tabId);
            setLiveMessage(null);
            setToastTip(null);
            setCurrentTip(null);
          }}
          onToggleMute={() => {
            toggleDoNotDisturb();
            setToastTip(null);
            setCurrentTip(null);
          }}
        />
      )}
    </div>
  );
};

export default FloatingAssistant;
