/**
 * lidioBus.ts — Bus liviano de mensajes efímeros para Lidio (ayuda `?`,
 * confirmaciones de cambio de estado sin pérdida de datos y guardado explícito).
 *
 * Usa un conjunto de suscriptores en memoria (funciona tanto en navegador
 * como en pruebas unitarias sin depender del DOM) y soporta `groupKey` para
 * reemplazar mensajes repetidos del mismo control en vez de apilarlos.
 */

export type LidioMessageKind = 'help' | 'state' | 'storage' | 'info' | 'warning';

export interface LidioLiveMessage {
  id: string;
  kind: LidioMessageKind;
  title?: string;
  body: string;
  /** Clave de agrupación: un nuevo mensaje con la misma clave reemplaza al anterior visible. */
  groupKey?: string;
  /** Tiempo en ms hasta el autocierre en pantalla. */
  durationMs?: number;
  /** Pestaña o paso opcional al que Lidio puede llevar al usuario. */
  targetTab?: string;
  targetLabel?: string;
}

export type EmitLidioMessageInput = Omit<LidioLiveMessage, 'id'> & { id?: string };

type LidioListener = (msg: LidioLiveMessage) => void;

const listeners = new Set<LidioListener>();
let seq = 0;

/**
 * Emite un mensaje vivo a Lidio (Toast flotante sobre el Dock en celular o
 * sobre el botón de Lidio en escritorio).
 */
export function emitLidioMessage(input: EmitLidioMessageInput): LidioLiveMessage {
  seq += 1;
  const msg: LidioLiveMessage = {
    ...input,
    id: input.id || `lidio-${Date.now()}-${seq}`,
    durationMs: input.durationMs ?? (input.kind === 'help' ? 8500 : 7000),
  };
  listeners.forEach((listener) => {
    try {
      listener(msg);
    } catch {
      // Un listener defectuoso no debe interrumpir al resto ni a la UI principal.
    }
  });
  return msg;
}

/**
 * Suscribe a los mensajes vivos de Lidio y devuelve la función de limpieza.
 */
export function subscribeLidioMessages(listener: LidioListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
