import { describe, it, expect } from 'vitest';
import {
  assessFacturadorCompleteness,
  buildFacturadorMetadataOnlyContext,
  formatFacturadorCompletenessHint,
  validateCuitState,
} from '../src/modules/facturador-studio/domain/facturadorCompleteness';
import {
  ALL_DOCUMENT_TYPE_IDS,
  DOCUMENT_TYPE_REGISTRY,
} from '../src/shared/core/capabilities/capabilityRegistry';
import {
  getAllTips,
  pickAlwaysTip,
  buildAssistantInvoiceSnapshot,
} from '../src/shared/core/assistant/assistantTips';
import {
  APP_KNOWLEDGE_BY_ID,
  composeAssistantSystemPrompt,
  sanitizeMetadataOnlyEditorState,
} from '../api/_lib/aiTasks/appKnowledge/index';
import { AI_TASKS_CATALOG } from '../api/_lib/aiTasks/catalog';

describe('Fase 7 — Lidio modular (7/7 apps) + FacturLee metadata-only con completitud', () => {
  it('TEST CANARIO: FacturLee reporta campos faltantes/inválidos sin filtrar NINGÚN valor completado', () => {
    const CANARIES = [
      'CANARIO_EMPRESA_SECRETA_SA',
      'CANARIO_CLIENTE_CONFIDENCIAL_SRL',
      'CANARIO_SERVICIO_ULTRA_PRIVADO',
      'CANARIO_OBSERVACION_999',
      '20304050607',
      '20111111112',
      '987654',
      '00042',
    ];

    const report = assessFacturadorCompleteness(
      {
        empresa: {
          razonSocial: 'CANARIO_EMPRESA_SECRETA_SA',
          cuit: '20-30405060-7', // 11 dígitos con verificador inválido (debe reportar solo 'invalid')
          condicionIva: 'responsable_inscripto',
        },
        draft: {
          id: 'inv_canary_1',
          tipo: 'factura',
          letra: 'B',
          puntoVenta: '0001',
          numero: '00042',
          fecha: '2026-11-21',
          vencimiento: '',
          observaciones: 'CANARIO_OBSERVACION_999',
          estado: 'borrador',
          cliente: {
            id: 'cli_1',
            nombre: 'CANARIO_CLIENTE_CONFIDENCIAL_SRL',
            cuit: '', // faltante (debe reportar 'missing')
            condicionIva: 'responsable_inscripto',
            domicilio: 'Calle Secreta 123',
            localidad: 'Salta',
            telefono: '3875551111',
            email: 'secreto@cliente.test',
          },
          items: [
            {
              id: 'it_1',
              descripcion: 'CANARIO_SERVICIO_ULTRA_PRIVADO',
              cantidad: 2,
              precioUnitario: 987654,
              descuentoPct: 0,
            },
            {
              id: 'it_2',
              descripcion: '',
              cantidad: 1,
              precioUnitario: 0,
              descuentoPct: 0,
            },
          ],
        },
      },
      'fact_comprobante'
    );

    const ctx = buildFacturadorMetadataOnlyContext({
      activeStepId: 'fact_comprobante',
      vaultLocked: false,
      report,
    });

    const snapshot = buildAssistantInvoiceSnapshot('fact_comprobante', ctx);
    const serialized = JSON.stringify({ ctx, snapshot });

    // 1. NINGÚN canario ni dato cargado puede aparecer en el contexto serializado
    for (const canary of CANARIES) {
      expect(serialized).not.toContain(canary);
    }
    expect(serialized).not.toContain('Calle Secreta');
    expect(serialized).not.toContain('secreto@cliente.test');

    // 2. SÍ detecta con precisión qué falta o es inválido
    expect(ctx.mode).toBe('metadata-only');
    expect(ctx.vaultLocked).toBe(false);
    expect(ctx.issues).toContainEqual({ fieldId: 'cliente.cuit', state: 'missing' });
    expect(ctx.issues).toContainEqual({ fieldId: 'emisor.cuit', state: 'invalid' });
    expect(ctx.issues).toContainEqual({ fieldId: 'items.descripcion', state: 'missing', occurrence: 2 });
    expect(ctx.issues).toContainEqual({ fieldId: 'items.precioUnitario', state: 'invalid', occurrence: 2 });

    // 3. Mensaje humano claro sin filtrar datos
    const hint = formatFacturadorCompletenessHint({ fieldId: 'cliente.cuit', state: 'missing' });
    expect(hint).toContain('CUIT del cliente');
  });

  it('cuando la bóveda está cerrada, envía únicamente vaultLocked: true sin issues', () => {
    const ctx = buildFacturadorMetadataOnlyContext({
      activeStepId: 'fact_emisor',
      vaultLocked: true,
      report: null,
    });
    expect(ctx.vaultLocked).toBe(true);
    expect(ctx.issues).toEqual([]);
  });

  it('validateCuitState valida localmente el dígito verificador Módulo 11 sin devolver el valor', () => {
    expect(validateCuitState('')).toBe('missing');
    expect(validateCuitState('123')).toBe('invalid');
    expect(validateCuitState('20-11111111-2')).toBe('ok'); // 2*5+0*4+1*3+1*2+1*7+1*6+1*5+1*4+1*3+1*2 = 42 -> 11 - (42%11)=2
    expect(validateCuitState('20-11111111-9')).toBe('invalid');
  });

  it('validación estricta en servidor descarta valores infiltrados y claves desconocidas en invoice', () => {
    const malicious = {
      mode: 'metadata-only',
      docType: 'invoice',
      stepId: 'fact_items',
      clienteNombre: 'FILTRADO_NOMBRE',
      montoTotal: 550000,
      issues: [
        { fieldId: 'cliente.cuit', state: 'missing', rawValue: '20-99999999-1' },
        { fieldId: 'campo.inventado.con.valor.secreto', state: 'missing' },
      ],
    };

    const sanitized = sanitizeMetadataOnlyEditorState('invoice', malicious) as any;
    const serialized = JSON.stringify(sanitized);

    expect(serialized).not.toContain('FILTRADO_NOMBRE');
    expect(serialized).not.toContain('550000');
    expect(serialized).not.toContain('20-99999999-1');
    expect(serialized).not.toContain('campo.inventado');
    expect(sanitized.issues).toEqual([{ fieldId: 'cliente.cuit', state: 'missing' }]);

    const userPrompt = AI_TASKS_CATALOG.app_guide_assistant.buildUserPrompt({
      question: '¿Qué me falta?',
      activeTab: 'fact_items',
      docType: 'invoice',
      editorState: malicious,
    });
    expect(userPrompt).not.toContain('FILTRADO_NOMBRE');
    expect(userPrompt).not.toContain('20-99999999-1');
    expect(userPrompt).toContain('cliente.cuit');
  });

  it('cubre las 7/7 apps registradas con conocimiento modular selectivo y tips locales', () => {
    for (const id of ALL_DOCUMENT_TYPE_IDS) {
      const knowledgeId = DOCUMENT_TYPE_REGISTRY[id].assistant.knowledgeId;
      expect(APP_KNOWLEDGE_BY_ID[knowledgeId as keyof typeof APP_KNOWLEDGE_BY_ID]).toBeTruthy();

      const prompt = composeAssistantSystemPrompt(id);
      expect(prompt.length).toBeGreaterThan(200);

      const tips = getAllTips(id);
      expect(tips.length).toBeGreaterThan(0);
      expect(pickAlwaysTip(undefined, [], id)).toBeTruthy();
    }

    // Inyección selectiva: el prompt de CV no arrastra bloques de FacturLee ni Book Studio
    const cvPrompt = composeAssistantSystemPrompt('cv');
    expect(cvPrompt).toContain('Columna Principal');
    expect(cvPrompt).not.toContain('FACTURLEE, EL FACTURADOR LOCAL');
    expect(cvPrompt).not.toContain('IMPRIMIR EN CASA VS LLEVAR A LA IMPRENTA');

    // Y el prompt de FacturLee no arrastra el bloque de columnas de CV
    const invoicePrompt = composeAssistantSystemPrompt('invoice');
    expect(invoicePrompt).toContain('FACTURLEE, EL FACTURADOR LOCAL');
    expect(invoicePrompt).toContain('metadata-only');
    expect(invoicePrompt).not.toContain('Ubicación en Hoja');
  });
});
