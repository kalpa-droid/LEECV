import React from 'react';
import { Field } from '../../../../shared/core/ui/Field';
import { encodeImageFileWithinBudget } from '../../../../shared/core/cv-import/pageImageEncoder';
import { computeOptimalTableLayout } from '../../domain/editorialLayoutEngines';
import type { EditorialRecord } from '../../domain/editorialTypes';
import { radius } from '../../../../shared/core/uiDesignSystem';

export interface CleanBlockMediaEditorProps {
  record: EditorialRecord;
  sectionColumns: 1 | 2;
  onUpdate: (patch: Partial<EditorialRecord>) => void;
  notify: { success: (msg: string) => void; error: (msg: string) => void };
}

export const CleanBlockMediaEditor: React.FC<CleanBlockMediaEditorProps> = ({
  record,
  sectionColumns,
  onUpdate,
  notify,
}) => {
  if (record.type === 'image') {
    return (
      <div className="space-y-2.5">
        {record.imagePath && (
          <img
            src={record.imagePath}
            alt={record.imageCaption || 'Imagen editorial'}
            className="max-h-40 border border-[var(--ui-border)] object-contain bg-[var(--ui-bg-panel)]"
            style={{ borderRadius: radius.control }}
          />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] cursor-pointer"
            style={{ borderRadius: radius.control }}
          >
            <span>{record.imagePath ? 'Cambiar imagen…' : 'Subir imagen…'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const picked = e.target.files?.[0];
                e.currentTarget.value = '';
                if (!picked) return;
                const encoded = await encodeImageFileWithinBudget(picked);
                onUpdate({ imagePath: `data:${encoded.mimeType};base64,${encoded.base64}` });
              }}
            />
          </label>
          {record.imageLayoutMode === 'pair-side-by-side' && (
            <label
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[var(--color-secondary-muted)] border border-[var(--color-secondary-base)]/40 text-[var(--color-secondary-text)] cursor-pointer"
              style={{ borderRadius: radius.control }}
            >
              <span>{record.secondaryImagePath ? 'Cambiar 2.ª imagen…' : '+ Subir 2.ª imagen…'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const picked = e.target.files?.[0];
                  e.currentTarget.value = '';
                  if (!picked) return;
                  const encoded = await encodeImageFileWithinBudget(picked);
                  onUpdate({
                    secondaryImagePath: `data:${encoded.mimeType};base64,${encoded.base64}`,
                  });
                }}
              />
            </label>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field
            as="select"
            label="Posición en la hoja"
            value={record.imageLayoutMode || 'centered'}
            onChange={(e: any) => onUpdate({ imageLayoutMode: e.target.value })}
          >
            <option value="full-width">De margen a margen (100%)</option>
            <option value="centered">Centrada (tamaño regulable)</option>
            <option value="pair-side-by-side">2 imágenes lado a lado</option>
            <option value="wrap-left">Imagen a la izq. · texto rodea</option>
            <option value="wrap-right">Imagen a la der. · texto rodea</option>
          </Field>

          <Field
            type="number"
            label="Ancho en hoja (%)"
            min={25}
            max={100}
            value={
              record.imageWidthPct ??
              (record.imageLayoutMode === 'full-width'
                ? 100
                : record.imageLayoutMode?.startsWith('wrap-')
                  ? 45
                  : 75)
            }
            onChange={(e: any) =>
              onUpdate({
                imageWidthPct: Math.min(100, Math.max(25, Number(e.target.value) || 75)),
              })
            }
          />
        </div>

        <Field
          label="Epígrafe o descripción"
          value={record.imageCaption || ''}
          onChange={(e: any) => onUpdate({ imageCaption: e.target.value })}
          placeholder="Ej: Figura 1 — Resultados de campo"
        />
      </div>
    );
  }

  if (record.type === 'figure_placeholder') {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field
            label="Etiqueta de figura"
            value={record.figureNumber || ''}
            onChange={(e: any) => onUpdate({ figureNumber: e.target.value })}
            placeholder="Ej: Figura 1"
          />
          <Field
            label="Epígrafe o pie"
            value={record.figureCaption || ''}
            onChange={(e: any) => onUpdate({ figureCaption: e.target.value, content: e.target.value })}
            placeholder="Descripción breve de la figura"
          />
        </div>
        <Field
          as="textarea"
          rows={2}
          label="Indicación para diseño"
          value={record.figureHint || ''}
          onChange={(e: any) => onUpdate({ figureHint: e.target.value })}
          placeholder="Ej: Insertar mapa conceptual o esquema..."
        />
        <label
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[var(--color-accent-muted)] border border-[var(--color-accent-base)]/40 text-[var(--color-accent-text)] cursor-pointer"
          style={{ borderRadius: radius.control }}
        >
          <span>Subir imagen real y convertir…</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const picked = e.target.files?.[0];
              e.currentTarget.value = '';
              if (!picked) return;
              const encoded = await encodeImageFileWithinBudget(picked);
              const caption = record.figureCaption || record.content || '';
              onUpdate({
                type: 'image',
                imagePath: `data:${encoded.mimeType};base64,${encoded.base64}`,
                imageCaption: caption,
                content: caption,
              });
              notify.success('Espacio convertido en imagen real.');
            }}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Field
          label="Título de tabla (opcional)"
          value={record.tableCaption || ''}
          onChange={(e: any) => onUpdate({ tableCaption: e.target.value })}
          placeholder="Ej: Tabla 1. Comparativa"
        />
        <Field
          as="select"
          label="Estilo de tabla"
          value={record.tableStylePreset || 'apa'}
          onChange={(e: any) => onUpdate({ tableStylePreset: e.target.value as any })}
        >
          <option value="apa">Norma APA (solo líneas horizontales)</option>
          <option value="grid">Cuadrícula completa</option>
          <option value="striped">Filas alternadas</option>
          <option value="minimal">Minimalista</option>
        </Field>
      </div>

      <div
        className="overflow-x-auto border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] p-2 space-y-1.5"
        style={{ borderRadius: radius.control }}
      >
        <div className="flex gap-1">
          {(record.tableHeaders || ['Columna 1', 'Columna 2']).map((h, hi) => (
            <input
              key={hi}
              type="text"
              value={h}
              onChange={(e) => {
                const nextH = [...(record.tableHeaders || ['Columna 1', 'Columna 2'])];
                nextH[hi] = e.target.value;
                onUpdate({ tableHeaders: nextH });
              }}
              className="flex-1 min-w-[80px] px-2 py-1 text-xs font-bold border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)]"
              style={{ borderRadius: radius.control }}
            />
          ))}
        </div>
        {(record.tableRows || [['Dato 1', 'Dato 2']]).map((row, ri) => (
          <div key={ri} className="flex gap-1">
            {row.map((cell, ci) => (
              <input
                key={ci}
                type="text"
                value={cell}
                onChange={(e) => {
                  const nextRows = (record.tableRows || []).map((r, idx) =>
                    idx === ri ? r.map((c, cIdx) => (cIdx === ci ? e.target.value : c)) : r,
                  );
                  onUpdate({ tableRows: nextRows });
                }}
                className="flex-1 min-w-[80px] px-2 py-1 text-xs border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)]"
                style={{ borderRadius: radius.control }}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            const cols = (record.tableHeaders || ['Columna 1', 'Columna 2']).length;
            onUpdate({
              tableRows: [...(record.tableRows || []), Array.from({ length: cols }, () => '')],
            });
          }}
          className="px-2 py-1 text-[11px] font-bold border border-[var(--ui-border)] bg-[var(--ui-bg-card)] cursor-pointer"
          style={{ borderRadius: radius.control }}
        >
          + Fila
        </button>
        <button
          type="button"
          onClick={() => {
            const nextH = [
              ...(record.tableHeaders || ['Columna 1', 'Columna 2']),
              `Col ${(record.tableHeaders?.length || 2) + 1}`,
            ];
            const nextRows = (record.tableRows || [['', '']]).map((r) => [...r, '']);
            onUpdate({ tableHeaders: nextH, tableRows: nextRows });
          }}
          className="px-2 py-1 text-[11px] font-bold border border-[var(--ui-border)] bg-[var(--ui-bg-card)] cursor-pointer"
          style={{ borderRadius: radius.control }}
        >
          + Columna
        </button>
        <button
          type="button"
          onClick={() => {
            const layout = computeOptimalTableLayout(
              record.tableHeaders || [],
              record.tableRows || [],
              { sectionColumns },
            );
            onUpdate({
              tableColWidthsPct: layout.colWidthsPct,
              tableColAlignments: layout.colAlignments,
              tableFontSizePt: layout.suggestedFontSizePt,
              spanFullWidth: layout.suggestSpanFullWidth,
            });
            notify.success('Anchos de tabla optimizados automáticamente.');
          }}
          className="px-2 py-1 text-[11px] font-bold border border-[var(--color-secondary-base)]/40 bg-[var(--color-secondary-muted)] text-[var(--color-secondary-text)] cursor-pointer ml-auto"
          style={{ borderRadius: radius.control }}
        >
          Auto-acomodar columnas
        </button>
      </div>
    </div>
  );
};
