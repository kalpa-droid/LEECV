/**
 * Motor puro de cascada Cliente ↔ Comprobante y Talonarios Compuestos para FacturLee.
 * Cero imports de React, DOM o red (auditado por `domain-purity` y `vault-network-isolation`).
 */

import {
  clearManualOverride,
  isManuallyOverridden,
  markManualOverride,
} from '../../../shared/core/presets/configCascadeEngine';
import {
  ClienteFactura,
  ComprobanteLetra,
  ComprobanteTipo,
  CondicionIva,
  FacturadorVaultData,
  InvoiceDraft,
  NumeracionEstado,
  SavedInvoice,
} from './facturadorTypes';
import { formatCompNro, formatPointOfSale } from './invoiceMath';

export function buildTalonarioKey(
  puntoVenta: string,
  tipo: ComprobanteTipo,
  letra: ComprobanteLetra,
): string {
  return `${formatPointOfSale(puntoVenta)}|${tipo}|${letra}`;
}

export function getTalonarioEstado(
  vault: FacturadorVaultData,
  puntoVenta: string,
  tipo: ComprobanteTipo,
  letra: ComprobanteLetra,
): NumeracionEstado {
  const pv = formatPointOfSale(puntoVenta || '00001');
  const key = buildTalonarioKey(pv, tipo, letra);
  const direct = vault.talonarios?.[key];
  if (direct) return direct;

  // Compatibilidad hacia atrás para bóvedas con `numeracion[letra]` (solo facturas)
  if (tipo === 'factura') {
    const legacy = vault.numeracion?.[letra];
    if (legacy && formatPointOfSale(legacy.puntoVenta) === pv) {
      return legacy;
    }
  }
  return { puntoVenta: pv, ultimoNumero: 0 };
}

export function getNextVoucherNumber(
  vault: FacturadorVaultData,
  puntoVenta: string,
  tipo: ComprobanteTipo,
  letra: ComprobanteLetra,
): string {
  const estado = getTalonarioEstado(vault, puntoVenta, tipo, letra);
  return formatCompNro((estado.ultimoNumero || 0) + 1);
}

export function hasDuplicateVoucherNumber(
  vault: FacturadorVaultData,
  draft: Pick<InvoiceDraft, 'id' | 'puntoVenta' | 'tipo' | 'letra' | 'numero'>,
): boolean {
  const pv = formatPointOfSale(draft.puntoVenta);
  const nro = formatCompNro(draft.numero);
  return (vault.comprobantes || []).some(
    (c) =>
      c.id !== draft.id &&
      c.estado !== 'borrador' &&
      c.tipo === draft.tipo &&
      c.letra === draft.letra &&
      formatPointOfSale(c.puntoVenta) === pv &&
      formatCompNro(c.numero) === nro,
  );
}

export interface SuggestedVoucherResolution {
  tipo: ComprobanteTipo;
  letra: ComprobanteLetra;
  reason: 'client_habitual' | 'fiscal_matrix';
}

export function resolveSuggestedVoucherForClient(
  empresaIva: CondicionIva,
  cliente: ClienteFactura | null,
): SuggestedVoucherResolution {
  if (cliente?.letraFacturaHabitual) {
    return {
      tipo: cliente.tipoFacturaHabitual || 'factura',
      letra: cliente.letraFacturaHabitual,
      reason: 'client_habitual',
    };
  }

  // Matriz fiscal argentina por defecto cuando no tiene factura habitual guardada
  if (empresaIva === 'monotributista' || empresaIva === 'exento') {
    return { tipo: 'factura', letra: 'C', reason: 'fiscal_matrix' };
  }
  if (cliente?.condicionIva === 'responsable_inscripto') {
    return { tipo: 'factura', letra: 'A', reason: 'fiscal_matrix' };
  }
  return { tipo: 'factura', letra: 'B', reason: 'fiscal_matrix' };
}

/**
 * Asigna un cliente al borrador respetando overrides manuales previos (Nivel 3).
 * Si el usuario no forzó manualmente el tipo de comprobante en este borrador,
 * aplica el habitual/sugerido del cliente y recalcula el próximo número correlativo.
 */
export function applyClientToDraftWithCascade(
  draft: InvoiceDraft,
  vault: FacturadorVaultData,
  cliente: ClienteFactura | null,
): InvoiceDraft {
  const hasManualVoucher = isManuallyOverridden(draft, 'voucherType');
  const hasManualNumber = isManuallyOverridden(draft, 'numero');

  if (hasManualVoucher) {
    return { ...draft, cliente };
  }

  const suggested = resolveSuggestedVoucherForClient(vault.empresa.condicionIva, cliente);
  const pv = draft.puntoVenta || getTalonarioEstado(vault, '00001', suggested.tipo, suggested.letra).puntoVenta;

  return {
    ...draft,
    cliente,
    tipo: suggested.tipo,
    letra: suggested.letra,
    puntoVenta: pv,
    numero: hasManualNumber ? draft.numero : getNextVoucherNumber(vault, pv, suggested.tipo, suggested.letra),
  };
}

/**
 * Cambia manualmente tipo y/o letra en el borrador actual sin tocar el perfil del cliente,
 * marcando el override Nivel 3 y recalculando siempre el próximo número de esa serie.
 */
export function applyManualVoucherTypeToDraft(
  draft: InvoiceDraft,
  vault: FacturadorVaultData,
  nextTipo: ComprobanteTipo,
  nextLetra: ComprobanteLetra,
  nextPuntoVenta?: string,
): InvoiceDraft {
  const pv = formatPointOfSale(nextPuntoVenta || draft.puntoVenta || '00001');
  const hasManualNumber = isManuallyOverridden(draft, 'numero');

  const updated = markManualOverride(
    {
      ...draft,
      tipo: nextTipo,
      letra: nextLetra,
      puntoVenta: pv,
      numero: hasManualNumber ? draft.numero : getNextVoucherNumber(vault, pv, nextTipo, nextLetra),
    },
    'voucherType',
  );
  return updated;
}

/**
 * Restaura en el borrador el tipo de comprobante habitual/sugerido para el cliente actual.
 */
export function resetDraftVoucherToClientHabitual(
  draft: InvoiceDraft,
  vault: FacturadorVaultData,
): InvoiceDraft {
  const cleared = clearManualOverride(draft, 'voucherType');
  return applyClientToDraftWithCascade(cleared, vault, cleared.cliente);
}

/**
 * Regla contable + Decisión #1:
 * - Solo los comprobantes no-borrador avanzan el talonario `${puntoVenta}|${tipo}|${letra}`.
 * - Siempre guarda en el cliente su `ultimoTipoComprobante` / `ultimaLetraComprobante`.
 * - Emitir un Presupuesto, Remito, Recibo o Nota de Crédito NUNCA pisa `letraFacturaHabitual`.
 * - Emitir una Factura actualiza `letraFacturaHabitual` solo si no fue override puntual (o si se tildó recordar).
 */
export function commitVoucherEmissionToVault(
  vault: FacturadorVaultData,
  saved: SavedInvoice,
  rememberHabitualForClient = false,
): FacturadorVaultData {
  const pv = formatPointOfSale(saved.puntoVenta);
  const parsedNum = Number.parseInt(saved.numero, 10) || 0;
  const key = buildTalonarioKey(pv, saved.tipo, saved.letra);

  let nextTalonarios = { ...(vault.talonarios || {}) };
  let nextNumeracion = { ...vault.numeracion };

  if (saved.estado !== 'borrador' && parsedNum > 0) {
    const currentTal = getTalonarioEstado(vault, pv, saved.tipo, saved.letra);
    const updatedMax = Math.max(currentTal.ultimoNumero || 0, parsedNum);
    nextTalonarios[key] = { puntoVenta: pv, ultimoNumero: updatedMax };

    if (saved.tipo === 'factura' && (saved.letra === 'A' || saved.letra === 'B' || saved.letra === 'C' || saved.letra === 'X')) {
      const prevLegacy = nextNumeracion[saved.letra] || { puntoVenta: pv, ultimoNumero: 0 };
      nextNumeracion[saved.letra] = {
        puntoVenta: pv,
        ultimoNumero: Math.max(prevLegacy.ultimoNumero || 0, parsedNum),
      };
    }
  }

  let nextClientes = vault.clientes;
  if (saved.cliente) {
    const wasManualOverride = isManuallyOverridden(saved, 'voucherType');
    nextClientes = vault.clientes.map((c) => {
      if (c.id !== saved.cliente?.id) return c;
      const shouldUpdateHabitual =
        saved.tipo === 'factura' &&
        (!wasManualOverride || rememberHabitualForClient || !c.letraFacturaHabitual);
      return {
        ...c,
        ultimoTipoComprobante: saved.tipo,
        ultimaLetraComprobante: saved.letra,
        ...(shouldUpdateHabitual
          ? {
              tipoFacturaHabitual: 'factura' as ComprobanteTipo,
              letraFacturaHabitual: saved.letra,
            }
          : {}),
      };
    });
  }

  return {
    ...vault,
    numeracion: nextNumeracion,
    talonarios: nextTalonarios,
    clientes: nextClientes,
  };
}
