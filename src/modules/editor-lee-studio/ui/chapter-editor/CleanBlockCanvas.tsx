import React, { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, BookmarkPlus, GripVertical, Plus, Scissors, Trash2 } from 'lucide-react';
import { Field } from '../../../../shared/core/ui/Field';
import { AIButton } from '../../../../shared/core/ui/AIButton';
import type { CanonicalCitationStyle } from '../../domain/editorialCitationFormatter';
import {
  resolveAllEditorialInlineTokens,
  type EditorialCrossRefGraph,
} from '../../domain/editorialCrossRefEngine';
import type { EditorialRecord, EditorialRecordType } from '../../domain/editorialTypes';
import { InsertBetweenDivider } from './InsertBetweenDivider';
import { CleanBlockMediaEditor } from './CleanBlockMediaEditor';
import { radius } from '../../../../shared/core/uiDesignSystem';

export interface CleanBlockCanvasProps {
  records: EditorialRecord[];
  focusedRecordId: string | null;
  sectionColumns: 1 | 2;
  showCitationsAction: boolean;
  bibMap: Map<string, EditorialRecord>;
  activeBibStyle: CanonicalCitationStyle;
  appearanceOrderMap: Map<string, number>;
  crossRefGraph?: EditorialCrossRefGraph;
  pendingSuggestions: Record<string, string>;
  onFocusRecord: (id: string) => void;
  onUpdateRecord: (id: string, patch: Partial<EditorialRecord>) => void;
  onRemoveRecord: (id: string) => void;
  onMoveRecord: (index: number, delta: -1 | 1) => void;
  onReorderRecord: (fromIndex: number, toIndex: number) => void;
  onSplitRecord: (recordId: string, cursorOffset?: number) => void;
  onInsertAt: (index: number, type: EditorialRecordType) => void;
  onAiImproveRecord: (rec: EditorialRecord) => Promise<string>;
  onApplyAiSuggestion: (id: string) => void;
  onDiscardAiSuggestion: (id: string) => void;
  onOpenCitePicker: (recId: string) => void;
  renderCitePickerForRecord?: (rec: EditorialRecord) => React.ReactNode;
  notify: { success: (msg: string) => void; error: (msg: string) => void };
}

function resolveBlockKindValue(rec: EditorialRecord): string {
  if (rec.type === 'subtitle') return rec.subtitleLevel === 3 ? 'subtitle_3' : 'subtitle_2';
  if (rec.type === 'list') return rec.listStyle === 'numbered' ? 'list_numbered' : 'list_bullet';
  return rec.type;
}

export const CleanBlockCanvas: React.FC<CleanBlockCanvasProps> = ({
  records,
  focusedRecordId,
  sectionColumns,
  showCitationsAction,
  bibMap,
  activeBibStyle,
  appearanceOrderMap,
  crossRefGraph,
  pendingSuggestions,
  onFocusRecord,
  onUpdateRecord,
  onRemoveRecord,
  onMoveRecord,
  onReorderRecord,
  onSplitRecord,
  onInsertAt,
  onAiImproveRecord,
  onApplyAiSuggestion,
  onDiscardAiSuggestion,
  onOpenCitePicker,
  renderCitePickerForRecord,
  notify,
}) => {
  const [dragFromIdx, setDragFromIdx] = useState<number | null>(null);
  const activeTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const visibleRecords = records.filter((r) => r.type !== 'bibliography_item');

  const handleTypeSelect = (rec: EditorialRecord, val: string) => {
    if (val === 'subtitle_2') {
      onUpdateRecord(rec.id, { type: 'subtitle', subtitleLevel: 2 });
    } else if (val === 'subtitle_3') {
      onUpdateRecord(rec.id, { type: 'subtitle', subtitleLevel: 3 });
    } else if (val === 'list_bullet') {
      onUpdateRecord(rec.id, { type: 'list', listStyle: 'bullet' });
    } else if (val === 'list_numbered') {
      onUpdateRecord(rec.id, { type: 'list', listStyle: 'numbered' });
    } else {
      onUpdateRecord(rec.id, {
        type: val as EditorialRecordType,
        ...(val === 'poem' ? { preserveLineBreaks: true } : {}),
      });
    }
  };

  const renderInactivePreview = (rec: EditorialRecord) => {
    const crossTarget = crossRefGraph?.byTargetId.get(rec.id);

    if (rec.type === 'image') {
      return (
        <div className="py-1 space-y-1">
          {crossTarget && (
            <span className="inline-block text-[10px] font-extrabold uppercase tracking-wide text-[var(--color-accent-text)]">
              {crossTarget.label}
            </span>
          )}
          {rec.imagePath ? (
            <img
              src={rec.imagePath}
              alt={rec.imageCaption || 'Imagen'}
              className="max-h-36 object-contain border border-[var(--ui-border)] bg-[var(--ui-bg-panel)]"
              style={{ borderRadius: radius.control }}
            />
          ) : (
            <p className="text-xs italic text-[var(--ui-text-secondary)]">
              [Imagen sin archivo aún — tocá para cargar]
            </p>
          )}
          {rec.imageCaption && (
            <p className="text-[11px] text-[var(--ui-text-secondary)]">{rec.imageCaption}</p>
          )}
        </div>
      );
    }

    if (rec.type === 'table') {
      return (
        <div className="py-1 text-xs text-[var(--ui-text-secondary)] space-y-1">
          <p className="font-bold text-[var(--ui-text-primary)]">
            {crossTarget ? `${crossTarget.label} · ` : ''}
            {rec.tableCaption || 'Tabla'} ({rec.tableHeaders?.length || 0}×{rec.tableRows?.length || 0})
          </p>
          <p className="truncate opacity-80">{(rec.tableHeaders || []).join(' · ')}</p>
        </div>
      );
    }

    if (rec.type === 'figure_placeholder') {
      return (
        <p className="text-xs italic text-[var(--ui-text-secondary)] border border-dashed border-[var(--ui-border)] px-2.5 py-2">
          [{crossTarget?.label || rec.figureNumber || 'Figura'}: {rec.figureCaption || 'Espacio reservado — tocá para cargar imagen'}]
        </p>
      );
    }

    const rawText = String(rec.content || '').trim();
    const display = rawText
      ? resolveAllEditorialInlineTokens(rawText, {
          bibMap,
          bibStyle: activeBibStyle,
          appearanceOrderMap,
          crossRefGraph,
        })
      : '';

    if (!display) {
      return (
        <p className="text-xs italic text-[var(--ui-text-secondary)]">
          Tocá acá para escribir o insertar contenido…
        </p>
      );
    }

    if (rec.type === 'subtitle') {
      return (
        <p
          className={`font-extrabold text-[var(--ui-text-primary)] ${
            rec.subtitleLevel === 3 ? 'text-xs' : 'text-sm'
          }`}
        >
          {display}
        </p>
      );
    }

    if (rec.type === 'quote' || rec.type === 'epigraph') {
      return (
        <blockquote className="pl-3 border-l-2 border-[var(--color-accent-base)]/60 text-xs italic text-[var(--ui-text-primary)]">
          {display}
          {rec.quoteAttribution && (
            <span className="block not-italic text-[11px] text-[var(--ui-text-secondary)] mt-0.5">
              — {rec.quoteAttribution}
            </span>
          )}
        </blockquote>
      );
    }

    if (rec.type === 'callout') {
      return (
        <div
          className="p-2.5 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-xs space-y-1"
          style={{ borderRadius: radius.control }}
        >
          {rec.calloutTitle && <p className="font-bold text-[var(--ui-text-primary)]">{rec.calloutTitle}</p>}
          <p className="text-[var(--ui-text-secondary)]">{display}</p>
        </div>
      );
    }

    if (rec.type === 'poem') {
      return <p className="text-xs whitespace-pre-wrap italic text-[var(--ui-text-primary)]">{display}</p>;
    }

    if (rec.type === 'list') {
      const lines = display.split('\n').filter(Boolean);
      return (
        <div className="text-xs text-[var(--ui-text-primary)] space-y-0.5 pl-1">
          {lines.map((ln, li) => (
            <p key={li}>
              {rec.listStyle === 'numbered' ? `${li + 1}. ` : '• '}
              {ln}
            </p>
          ))}
        </div>
      );
    }

    return (
      <p className="text-[13px] leading-relaxed text-[var(--ui-text-primary)] whitespace-pre-wrap">
        {display}
      </p>
    );
  };

  return (
    <div className="space-y-0.5">
      {visibleRecords.map((rec, idx) => {
        const realIndex = records.findIndex((r) => r.id === rec.id);
        const isActive =
          focusedRecordId === rec.id ||
          (rec.type !== 'image' &&
            rec.type !== 'table' &&
            rec.type !== 'figure_placeholder' &&
            !String(rec.content || '').trim());
        const canSplit =
          rec.type === 'paragraph' || rec.type === 'poem' || rec.type === 'quote' || rec.type === 'list';

        return (
          <React.Fragment key={rec.id}>
            {idx === 0 && (
              <InsertBetweenDivider index={realIndex} onInsertAt={onInsertAt} alwaysVisible={false} />
            )}

            <div
              draggable={isActive}
              onDragStart={() => setDragFromIdx(realIndex)}
              onDragOver={(e) => {
                if (dragFromIdx !== null) e.preventDefault();
              }}
              onDrop={() => {
                if (dragFromIdx !== null && dragFromIdx !== realIndex) {
                  onReorderRecord(dragFromIdx, realIndex);
                }
                setDragFromIdx(null);
              }}
              className={
                isActive
                  ? 'p-3 border border-[var(--color-accent-base)]/60 bg-[var(--ui-bg-card)] space-y-2.5 my-1.5'
                  : 'px-2.5 py-2 hover:bg-[var(--ui-bg-card)]/70 transition-colors cursor-text'
              }
              style={{ borderRadius: radius.control }}
              onClick={() => {
                if (!isActive) onFocusRecord(rec.id);
              }}
            >
              {!isActive ? (
                renderInactivePreview(rec)
              ) : (
                <>
                  {/* Barra contextual única solo en el bloque activo (0 globos ? junto a IA) */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-[var(--ui-border)]">
                    <div className="flex items-center gap-1">
                      <span
                        title="Arrastrar para reordenar"
                        className="p-1 text-[var(--ui-text-secondary)] cursor-grab"
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </span>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => onMoveRecord(realIndex, -1)}
                        aria-label="Subir bloque"
                        title="Subir bloque"
                        className="p-1 border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] disabled:opacity-30 cursor-pointer"
                        style={{ borderRadius: radius.control }}
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === visibleRecords.length - 1}
                        onClick={() => onMoveRecord(realIndex, 1)}
                        aria-label="Bajar bloque"
                        title="Bajar bloque"
                        className="p-1 border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] disabled:opacity-30 cursor-pointer"
                        style={{ borderRadius: radius.control }}
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>

                      {rec.type !== 'table' && rec.type !== 'image' && rec.type !== 'figure_placeholder' && (
                        <select
                          aria-label="Tipo de bloque"
                          value={resolveBlockKindValue(rec)}
                          onChange={(e) => handleTypeSelect(rec, e.target.value)}
                          className="ml-1 px-2 py-1 text-[11px] font-bold border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)]"
                          style={{ borderRadius: radius.control }}
                        >
                          <option value="paragraph">Párrafo</option>
                          <option value="subtitle_2">Subtítulo (H2)</option>
                          <option value="subtitle_3">Subtítulo menor (H3)</option>
                          <option value="quote">Cita</option>
                          <option value="list_bullet">Lista viñetas</option>
                          <option value="list_numbered">Lista numerada</option>
                          <option value="callout">Recuadro</option>
                          <option value="poem">Poema</option>
                          <option value="epigraph">Epígrafe</option>
                        </select>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      {canSplit && (
                        <button
                          type="button"
                          onClick={() =>
                            onSplitRecord(rec.id, activeTextareaRef.current?.selectionStart)
                          }
                          title="Dividir párrafo acá para intercalar imagen, tabla o cita"
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] hover:border-[var(--color-accent-base)] cursor-pointer"
                          style={{ borderRadius: radius.control }}
                        >
                          <Scissors className="w-3 h-3" /> Dividir
                        </button>
                      )}

                      {rec.type !== 'image' && rec.type !== 'table' && rec.type !== 'figure_placeholder' && (
                        <AIButton
                          size="xs"
                          iconOnly={false}
                          label="Mejorar estilo"
                          onGenerate={() => onAiImproveRecord(rec)}
                          onSuccess={() => {}}
                        />
                      )}

                      {showCitationsAction &&
                        rec.type !== 'image' &&
                        rec.type !== 'table' &&
                        rec.type !== 'figure_placeholder' && (
                          <button
                            type="button"
                            onClick={() => onOpenCitePicker(rec.id)}
                            title="Insertar cita bibliográfica o referencia a tabla, figura o anexo"
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--color-accent-text)] cursor-pointer"
                            style={{ borderRadius: radius.control }}
                          >
                            <BookmarkPlus className="w-3 h-3" /> Citar / Ref.
                          </button>
                        )}

                      <button
                        type="button"
                        onClick={() => onInsertAt(realIndex + 1, 'paragraph')}
                        title="Insertar bloque debajo"
                        className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] cursor-pointer"
                        style={{ borderRadius: radius.control }}
                      >
                        <Plus className="w-3 h-3" /> Debajo
                      </button>

                      <button
                        type="button"
                        onClick={() => onRemoveRecord(rec.id)}
                        aria-label="Quitar bloque"
                        title="Quitar bloque"
                        className="p-1 text-[var(--color-status-danger-text)] hover:bg-[var(--color-status-danger-muted)] cursor-pointer"
                        style={{ borderRadius: radius.control }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {rec.type === 'image' || rec.type === 'table' || rec.type === 'figure_placeholder' ? (
                    <CleanBlockMediaEditor
                      record={rec}
                      sectionColumns={sectionColumns}
                      onUpdate={(patch) => onUpdateRecord(rec.id, patch)}
                      notify={notify}
                    />
                  ) : (
                    <div className="space-y-2">
                      {rec.type === 'callout' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="sm:col-span-2">
                            <Field
                              label="Título del recuadro"
                              value={rec.calloutTitle || ''}
                              onChange={(e: any) => onUpdateRecord(rec.id, { calloutTitle: e.target.value })}
                              placeholder="Ej: Nota destacada"
                            />
                          </div>
                          <Field
                            as="select"
                            label="Estilo"
                            value={rec.calloutVariant || 'nota'}
                            onChange={(e: any) =>
                              onUpdateRecord(rec.id, { calloutVariant: e.target.value as any })
                            }
                          >
                            <option value="nota">Nota editorial</option>
                            <option value="caja">Caja didáctica</option>
                            <option value="clave">Idea clave</option>
                            <option value="definicion">Definición</option>
                            <option value="importante">Destacado</option>
                            <option value="resguardo">Resguardo</option>
                            <option value="consigna">Actividad</option>
                            <option value="documento">Fuente</option>
                            <option value="testimonio">Testimonio</option>
                          </Field>
                        </div>
                      )}

                      {rec.type === 'subtitle' ? (
                        <Field
                          value={rec.content || ''}
                          onChange={(e: any) => onUpdateRecord(rec.id, { content: e.target.value })}
                          placeholder="Subtítulo del apartado..."
                        />
                      ) : (
                        <textarea
                          ref={activeTextareaRef}
                          rows={rec.type === 'poem' ? 7 : Math.min(10, Math.max(3, Math.ceil((rec.content?.length || 120) / 68)))}
                          value={rec.content || ''}
                          onChange={(e) =>
                            onUpdateRecord(rec.id, {
                              content: e.target.value,
                              ...(rec.type === 'poem' ? { preserveLineBreaks: true } : {}),
                            })
                          }
                          placeholder={
                            rec.type === 'list'
                              ? 'Un ítem por línea...'
                              : rec.type === 'poem'
                                ? 'Escribí cada verso en su línea...'
                                : 'Escribí o pegá el contenido aquí...'
                          }
                          className="w-full px-3 py-2 text-[13px] leading-relaxed border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] outline-none focus:border-[var(--color-accent-base)] resize-y"
                          style={{ borderRadius: radius.control }}
                        />
                      )}

                      {(rec.type === 'quote' || rec.type === 'epigraph') && (
                        <Field
                          label={rec.type === 'epigraph' ? 'Autor del epígrafe' : 'Autor o referencia'}
                          value={rec.quoteAttribution || ''}
                          onChange={(e: any) => onUpdateRecord(rec.id, { quoteAttribution: e.target.value })}
                          placeholder="Ej: Cortázar, 1963"
                        />
                      )}

                      {renderCitePickerForRecord?.(rec)}

                      {pendingSuggestions[rec.id] && (
                        <div
                          className="p-2.5 border border-[var(--color-accent-base)]/40 bg-[var(--color-accent-muted)] space-y-2 text-xs"
                          style={{ borderRadius: radius.control }}
                        >
                          <p className="font-bold text-[var(--color-accent-text)]">Propuesta de mejora:</p>
                          <p className="text-[var(--ui-text-primary)] whitespace-pre-wrap">
                            {pendingSuggestions[rec.id]}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onApplyAiSuggestion(rec.id)}
                              className="px-2.5 py-1 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] font-bold cursor-pointer"
                              style={{ borderRadius: radius.control }}
                            >
                              Aplicar cambio
                            </button>
                            <button
                              type="button"
                              onClick={() => onDiscardAiSuggestion(rec.id)}
                              className="px-2.5 py-1 border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] font-semibold cursor-pointer"
                              style={{ borderRadius: radius.control }}
                            >
                              Descartar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <InsertBetweenDivider
              index={realIndex + 1}
              onInsertAt={onInsertAt}
              alwaysVisible={isActive}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
};
