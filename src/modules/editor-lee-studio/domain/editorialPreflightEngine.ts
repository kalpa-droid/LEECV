/**
 * Motor Puro de Revisión Previa a Exportar — Preflight Editorial (PR 2 — Fase 7).
 *
 * Detecta en < 10 ms defectos críticos y advertencias accionables antes de generar
 * el archivo final o descontar créditos de exportación:
 * - Secciones visibles totalmente vacías (evita páginas en blanco inesperadas).
 * - Título genérico ("Mi obra") o vacío.
 * - Pérdida de texto reportada al importar (< 98%).
 * - Espacios reservados de figuras sin reemplazar (`[Insertar Figura...]`).
 * - Imágenes con nitidez baja para impresión en papel (en lenguaje sencillo).
 * - Caracteres especiales tipográficos que requieren fuentes Unicode / trazado propio.
 * - Repetición exacta del título del libro al inicio del primer capítulo.
 * - Erratas frecuentes de puntuación (`hola,mundo`, dobles espacios) con limpieza automática en 1 clic.
 *
 * 100% TypeScript puro (sin React, sin DOM, sin @react-pdf/renderer, sin colores hex).
 */

import { detectUnsafeWinAnsiChars } from './editorialTypographyEngine';
import {
  collectBibliographyFromSections,
  extractInlineCitationTokens,
  normalizeBibliographyStyle,
} from './editorialCitationFormatter';
import {
  buildEditorialCrossRefGraph,
  extractInlineRefTokens,
} from './editorialCrossRefEngine';
import type { EditorialRecord, EditorialSection } from './editorialTypes';

export type EditorialPreflightSeverity = 'error' | 'warning';

export type EditorialPreflightCode =
  | 'empty_section'
  | 'default_or_empty_title'
  | 'import_retention_loss'
  | 'unreplaced_placeholder'
  | 'low_resolution_image'
  | 'special_typography_chars'
  | 'duplicate_main_title'
  | 'punctuation_spacing'
  | 'broken_cross_reference'
  | 'uncited_bibliography_item';

export interface EditorialPreflightIssue {
  id: string;
  code: EditorialPreflightCode;
  severity: EditorialPreflightSeverity;
  title: string;
  description: string;
  sectionId?: string;
  recordId?: string;
  autoFixable?: boolean;
}

export interface EditorialPreflightReport {
  ok: boolean;
  errors: EditorialPreflightIssue[];
  warnings: EditorialPreflightIssue[];
  hasAutoFixablePunctuation: boolean;
}

const PLACEHOLDER_TEXT_REGEX =
  /\[(?:espacio(?:\s+reservado)?(?:\s+para)?|insertar|pendiente|aqui\s+va)[^\]]*\]/i;

const STUCK_COMMA_REGEX = /[a-záéíóúüñ],[a-záéíóúüñ]{2,}/i;
const DOUBLE_SPACE_REGEX = /[^\s\n][ ]{2,}[^\s\n]/;

function isRecordEmpty(rec: EditorialRecord): boolean {
  if (!rec) return true;
  if (rec.type === 'image') return !rec.imagePath;
  if (rec.type === 'table') {
    return !(rec.tableHeaders?.some((h) => h.trim()) || rec.tableRows?.some((r) => r.some((c) => c.trim())));
  }
  if (rec.type === 'figure_placeholder') return false;
  if (rec.type === 'footnote_list') return !(rec.footnotes?.length || rec.content?.trim());
  if (rec.type === 'callout') {
    return !(rec.content?.trim() || rec.calloutTitle?.trim() || rec.calloutItems?.length);
  }
  if (rec.type === 'qr_or_break') return !rec.qrCode && !rec.isBreak;
  if (rec.type === 'bibliography_item') {
    return !(rec.bibAuthor?.trim() || rec.bibTitle?.trim() || rec.content?.trim());
  }
  return !String(rec.content || '').trim();
}

export function runEditorialPreflight(draft: any): EditorialPreflightReport {
  const errors: EditorialPreflightIssue[] = [];
  const warnings: EditorialPreflightIssue[] = [];

  if (!draft || typeof draft !== 'object') {
    return { ok: true, errors, warnings, hasAutoFixablePunctuation: false };
  }

  const rawTitle = String(draft?.metadata?.title || '').trim();
  const visibleSections: EditorialSection[] = (Array.isArray(draft?.sections) ? draft.sections : []).filter(
    (s: EditorialSection) => s && s.visible !== false,
  );

  // 1. Título vacío o por defecto
  if (!rawTitle || rawTitle.toLowerCase() === 'mi obra') {
    errors.push({
      id: 'pf_default_title',
      code: 'default_or_empty_title',
      severity: 'error',
      title: 'Título de la obra pendiente',
      description:
        !rawTitle
          ? 'Tu publicación todavía no tiene título.'
          : 'El título sigue en "Mi obra" y aparecería así en la portada y en los encabezados.',
    });
  }

  // 2. Pérdida al importar (< 98%)
  const retentionPct = draft?.importStats?.retentionPct;
  if (typeof retentionPct === 'number' && retentionPct < 98) {
    errors.push({
      id: 'pf_import_retention',
      code: 'import_retention_loss',
      severity: 'error',
      title: 'Posible recorte durante la importación',
      description: `Se detectó una retención aproximada del ${retentionPct.toFixed(1)}% del manuscrito original. Conviene revisar que no falten párrafos antes de exportar.`,
    });
  }

  // 3. Secciones visibles vacías
  for (const sec of visibleSections) {
    const recs = Array.isArray(sec.records) ? sec.records : [];
    const hasAnyContent = recs.some((r) => !isRecordEmpty(r));
    if (!hasAnyContent) {
      errors.push({
        id: `pf_empty_${sec.id}`,
        code: 'empty_section',
        severity: 'error',
        sectionId: sec.id,
        title: `Sección vacía: "${sec.title || 'Sin título'}"`,
        description:
          'Este apartado no tiene párrafos ni elementos cargados y generaría una página casi en blanco.',
      });
    }
  }

  // 4. Duplicación del título principal al inicio del primer capítulo
  const firstSec = visibleSections[0];
  if (rawTitle && firstSec) {
    const firstNonEmpty = (firstSec.records || []).find((r) => !isRecordEmpty(r));
    const normTitle = rawTitle.toLowerCase();
    const firstSecTitleMatches = (firstSec.title || '').trim().toLowerCase() === normTitle;
    const firstRecMatches = String(firstNonEmpty?.content || '').trim().toLowerCase() === normTitle;
    if (firstSecTitleMatches || firstRecMatches) {
      warnings.push({
        id: `pf_dup_title_${firstSec.id}`,
        code: 'duplicate_main_title',
        severity: 'warning',
        sectionId: firstSec.id,
        recordId: firstRecMatches ? firstNonEmpty?.id : undefined,
        title: 'Título repetido en la primera sección',
        description: `"${firstSec.title || rawTitle}" repite exactamente el título principal de la obra.`,
      });
    }
  }

  // 5. Recorrido por registros: placeholders, imágenes de baja nitidez, símbolos especiales, puntuación y referencias cruzadas
  const detectedSpecialChars = new Set<string>();
  let hasPunctuationIssue = false;
  const { items: bibItems, map: bibMap } = collectBibliographyFromSections(visibleSections);
  const crossRefGraph = buildEditorialCrossRefGraph(visibleSections);
  const citedBibIds = new Set<string>();
  const activeStyle = normalizeBibliographyStyle(
    draft?.design?.bibliographyStyle || draft?.design?.normId || 'tradicional',
  );

  for (const sec of visibleSections) {
    const recs = Array.isArray(sec.records) ? sec.records : [];
    for (const rec of recs) {
      const contentStr = String(rec.content || '');
      const refScanFields = [
        contentStr,
        rec.quoteAttribution || '',
        rec.tableCaption || '',
        rec.imageCaption || '',
        ...(Array.isArray(rec.tableRows) ? rec.tableRows.flat().map((c) => String(c || '')) : []),
      ];

      for (const rawField of refScanFields) {
        if (!rawField) continue;
        for (const tok of extractInlineCitationTokens(rawField)) {
          if (!bibMap.has(tok.bibId)) {
            errors.push({
              id: `pf_broken_cite_${rec.id}_${tok.bibId}`,
              code: 'broken_cross_reference',
              severity: 'error',
              sectionId: sec.id,
              recordId: rec.id,
              title: `Cita sin fuente vinculada en "${sec.title || 'Sección'}"`,
              description:
                'Este párrafo conserva una cita cuya fuente fue quitada de Bibliografía. Quitá la marca o cargá la fuente.',
            });
          } else {
            citedBibIds.add(tok.bibId);
          }
        }
        for (const rTok of extractInlineRefTokens(rawField)) {
          if (!crossRefGraph.byTargetId.has(rTok.targetId)) {
            errors.push({
              id: `pf_broken_ref_${rec.id}_${rTok.targetId}`,
              code: 'broken_cross_reference',
              severity: 'error',
              sectionId: sec.id,
              recordId: rec.id,
              title: `Referencia cruzada rota en "${sec.title || 'Sección'}"`,
              description:
                'Apunta a una tabla, figura o anexo que fue eliminado u ocultado del documento.',
            });
          }
        }
      }

      if (rec.type === 'figure_placeholder' || PLACEHOLDER_TEXT_REGEX.test(contentStr)) {
        warnings.push({
          id: `pf_placeholder_${rec.id}`,
          code: 'unreplaced_placeholder',
          severity: 'warning',
          sectionId: sec.id,
          recordId: rec.id,
          title: `Espacio reservado sin reemplazar en "${sec.title || 'Sección'}"`,
          description:
            rec.figureCaption || contentStr.slice(0, 100) || 'Hay un recuadro reservado esperando una imagen real.',
        });
      }

      if (rec.type === 'image' && typeof rec.imageDpi === 'number' && rec.imageDpi > 0 && rec.imageDpi < 150) {
        warnings.push({
          id: `pf_lowres_${rec.id}`,
          code: 'low_resolution_image',
          severity: 'warning',
          sectionId: sec.id,
          recordId: rec.id,
          title: `Imagen con poca nitidez en "${sec.title || 'Sección'}"`,
          description:
            'Esta imagen puede verse borrosa al imprimir; conviene subir una más nítida o reducir su ancho en la hoja.',
        });
      }

      if (contentStr) {
        for (const ch of detectUnsafeWinAnsiChars(contentStr)) {
          detectedSpecialChars.add(ch);
        }
        if (STUCK_COMMA_REGEX.test(contentStr) || DOUBLE_SPACE_REGEX.test(contentStr)) {
          hasPunctuationIssue = true;
          warnings.push({
            id: `pf_punct_${rec.id}`,
            code: 'punctuation_spacing',
            severity: 'warning',
            sectionId: sec.id,
            recordId: rec.id,
            autoFixable: true,
            title: `Espaciado o coma pegada en "${sec.title || 'Sección'}"`,
            description:
              'Se detectaron palabras pegadas tras una coma o dobles espacios que podés limpiar en un clic.',
          });
        }
      }
    }
  }

  const academicStyles = new Set(['apa7', 'vancouver', 'ieee', 'harvard', 'chicago', 'mla']);
  if (academicStyles.has(activeStyle) && bibItems.length > 0 && citedBibIds.size > 0) {
    const uncited = bibItems.filter((b) => !citedBibIds.has(b.id));
    if (uncited.length > 0) {
      const bibSec = visibleSections.find(
        (s) => s.sectionKey === 'bibliografia' || s.records?.some((r) => r.type === 'bibliography_item'),
      );
      warnings.push({
        id: 'pf_uncited_bibliography',
        code: 'uncited_bibliography_item',
        severity: 'warning',
        sectionId: bibSec?.id,
        title: `${uncited.length} fuente(s) en bibliografía sin citar en el texto`,
        description:
          'En normas académicas conviene citar todas las referencias dentro de los capítulos o quitar las que no usaste.',
      });
    }
  }

  if (detectedSpecialChars.size > 0) {
    const sample = Array.from(detectedSpecialChars).slice(0, 6).join(' ');
    warnings.push({
      id: 'pf_special_chars',
      code: 'special_typography_chars',
      severity: 'warning',
      title: 'Símbolos especiales detectados en el texto',
      description: `Se encontraron caracteres tipográficos especiales (${sample}). El motor Unicode local los protegerá al armar tu PDF.`,
    });
  }

  return {
    ok: errors.length === 0 && warnings.length === 0,
    errors,
    warnings,
    hasAutoFixablePunctuation: hasPunctuationIssue,
  };
}

/**
 * Limpia de forma segura comas pegadas (`hola,mundo` -> `hola, mundo`) y espacios
 * horizontales repetidos (`[ \t]{2,}` -> ` `) sin destruir `\u00A0` ni versos en poemas.
 */
export function autoCleanEditorialPunctuation<T extends Record<string, any>>(draft: T): T {
  if (!draft || !Array.isArray(draft.sections)) return draft;

  const cleanStr = (text: string): string =>
    text
      .split('\n')
      .map((line) =>
        line
          .replace(/([a-záéíóúüñ]),([a-záéíóúüñ]{2,})/gi, '$1, $2')
          .replace(/[ \t]{2,}/g, ' '),
      )
      .join('\n');

  return {
    ...draft,
    sections: draft.sections.map((sec: EditorialSection) => ({
      ...sec,
      records: Array.isArray(sec.records)
        ? sec.records.map((rec) =>
            typeof rec?.content === 'string' && rec.type !== 'image' && rec.type !== 'qr_or_break'
              ? { ...rec, content: cleanStr(rec.content) }
              : rec,
          )
        : sec.records,
    })),
  };
}
