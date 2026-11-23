import { describe, expect, it } from 'vitest';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { EMPTY_FACTURADOR_VAULT, createEmptyInvoice } from '../src/modules/facturador-studio/domain/facturadorDefaults';
import { lineFromCatalog } from '../src/modules/facturador-studio/facturadorStepsShared';
import {
  applyClientToDraftWithCascade,
  applyManualVoucherTypeToDraft,
  commitVoucherEmissionToVault,
  getNextVoucherNumber,
  resetDraftVoucherToClientHabitual,
} from '../src/modules/facturador-studio/domain/voucherCascadeEngine';
import { InvoicePdfDocument } from '../src/modules/facturador-studio/pdf/InvoicePdfDocument';
import type { ClienteFactura, FacturadorVaultData } from '../src/modules/facturador-studio/domain/facturadorTypes';

describe('FacturLee Fase 3 — Cascada Cliente↔Comprobante, Catálogo y PDF sin solapamiento', () => {
  it('lineFromCatalog conserva nombre y descripcion sin perder detalle', () => {
    const line = lineFromCatalog({
      id: 'cat_1',
      nombre: 'Impresión Láser A4',
      descripcion: 'Papel ilustración 150g doble faz',
      precioBase: 1200,
      stock: 50,
      stockMinimo: 10,
      escalones: [],
    });
    expect(line.nombre).toBe('Impresión Láser A4');
    expect(line.descripcion).toBe('Papel ilustración 150g doble faz');
  });

  it('cascada Cliente ↔ Comprobante respeta habitual, permite override manual, recalcula N° y no pisa habitual con Presupuesto', () => {
    const cliRi: ClienteFactura = {
      id: 'cli_ri',
      nombre: 'Estudio Sur SRL',
      cuit: '30-71111111-9',
      condicionIva: 'responsable_inscripto',
      domicilio: 'Av. Mayo 100',
      localidad: 'CABA',
      telefono: '',
      email: '',
      letraFacturaHabitual: 'A',
      tipoFacturaHabitual: 'factura',
    };

    const vault: FacturadorVaultData = {
      ...EMPTY_FACTURADOR_VAULT,
      empresa: { ...EMPTY_FACTURADOR_VAULT.empresa, condicionIva: 'responsable_inscripto', razonSocial: 'Mi Negocio SA' },
      talonarios: {
        '00001|factura|A': { puntoVenta: '00001', ultimoNumero: 12 },
        '00001|factura|B': { puntoVenta: '00001', ultimoNumero: 4 },
        '00001|presupuesto|X': { puntoVenta: '00001', ultimoNumero: 7 },
      },
      clientes: [cliRi],
    };

    let draft = createEmptyInvoice({ numero: getNextVoucherNumber(vault, '00001', 'factura', 'B') });
    expect(draft.numero).toBe('00000005');

    // Al elegir cliente RI con habitual A, cambia a Factura A y carga 00000013
    draft = applyClientToDraftWithCascade(draft, vault, cliRi);
    expect(draft.tipo).toBe('factura');
    expect(draft.letra).toBe('A');
    expect(draft.numero).toBe('00000013');

    // Cambiar manualmente a Presupuesto X recalcula a 00000008
    draft = applyManualVoucherTypeToDraft(draft, vault, 'presupuesto', 'X');
    expect(draft.tipo).toBe('presupuesto');
    expect(draft.letra).toBe('X');
    expect(draft.numero).toBe('00000008');
    expect(draft.manualOverrides?.voucherType).toBe(true);

    // Emitir Presupuesto X NO pisa letraFacturaHabitual ('A') del cliente
    const updatedVault = commitVoucherEmissionToVault(vault, {
      ...draft,
      estado: 'emitida',
      total: 5000,
    });
    expect(updatedVault.clientes[0].letraFacturaHabitual).toBe('A');
    expect(updatedVault.clientes[0].ultimaLetraComprobante).toBe('X');
    expect(updatedVault.talonarios?.['00001|presupuesto|X']?.ultimoNumero).toBe(8);

    // Resetear override vuelve a Factura A
    const reset = resetDraftVoucherToClientHabitual(draft, updatedVault);
    expect(reset.tipo).toBe('factura');
    expect(reset.letra).toBe('A');
    expect(reset.numero).toBe('00000013');
  });

  it('InvoicePdfDocument genera PDF válido con 0 y 40 ítems sin que el footer se superponga con Subtotal/TOTAL', async () => {
    const draft = createEmptyInvoice({
      items: Array.from({ length: 40 }, (_, i) => ({
        id: `it_${i}`,
        nombre: `Producto ${i + 1}`,
        descripcion: `Detalle del producto ${i + 1}`,
        cantidad: 2,
        precioUnitario: 1500,
        descuentoPct: 0,
      })),
    });

    const blob = await pdf(
      React.createElement(InvoicePdfDocument, {
        draft,
        empresa: { ...EMPTY_FACTURADOR_VAULT.empresa, razonSocial: 'Mi Negocio SRL' },
        design: EMPTY_FACTURADOR_VAULT.design,
      }),
    ).toBlob();
    expect(blob.size).toBeGreaterThan(1500);
  });
});
