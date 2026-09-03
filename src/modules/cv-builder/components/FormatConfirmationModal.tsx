/**
 * COMPONENTE — MODAL DE CONFIRMACIÓN DE FORMATO GLOBAL (FormatConfirmationModal.tsx)
 * 
 * Permite al usuario elegir cómo aplicar un formato de CV (Curaduría Recomendada,
 * Solo Reordenar o Formato Completo con las 20 secciones visibles), garantizando
 * y notificando de forma transparente que NINGÚN DATO se borra jamás del JSON.
 */

import React, { useState } from 'react';
import { colorSystem, radius } from '../../../shared/core/uiDesignSystem';
import { FileText, Layout, Layers, ShieldCheck, CheckCircle, X } from 'lucide-react';

export type FormatApplicationMode = 'curated' | 'reorder-only' | 'full-20-sections';

export interface FormatConfirmationModalProps {
  isOpen: boolean;
  formatName: string;
  onClose: () => void;
  onConfirm: (mode: FormatApplicationMode) => void;
}

export const FormatConfirmationModal: React.FC<FormatConfirmationModalProps> = ({
  isOpen,
  formatName,
  onClose,
  onConfirm
}) => {
  const [selectedMode, setSelectedMode] = useState<FormatApplicationMode>('curated');

  if (!isOpen) return null;

  const handleApply = () => {
    onConfirm(selectedMode);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          maxHeight: 'calc(100vh - 32px)',
          backgroundColor: colorSystem.neutral.surface,
          borderRadius: radius.modal,
          boxShadow: 'var(--shadow-overlay)',
          border: `1px solid ${colorSystem.neutral.border}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado Modal */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${colorSystem.neutral.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: colorSystem.neutral.surfaceMuted,
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: radius.control,
                background: `${colorSystem.accent.base}15`,
                color: colorSystem.accent.base,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Layout size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: colorSystem.neutral.textPrimary }}>
                Aplicar Formato: {formatName}
              </h3>
              <p style={{ margin: 0, fontSize: '12.5px', color: colorSystem.neutral.textSecondary }}>
                Selecciona la modalidad de aplicación deseada
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: colorSystem.neutral.textSecondary,
              padding: '6px',
              borderRadius: radius.control,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido Modal */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
          {/* Mensaje de Confianza e Integridad de Datos */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: radius.control,
              background: `${colorSystem.status.success.base}12`,
              border: `1px solid ${colorSystem.status.success.base}35`,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <ShieldCheck size={18} style={{ color: colorSystem.status.success.base, flexShrink: 0 }} />
            <div style={{ fontSize: '13px', fontWeight: 700, color: colorSystem.neutral.textPrimary }}>
              Tus datos jamás se borran.
            </div>
          </div>

          {/* Opciones de Aplicación */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Opción 1: Aplicar Plantilla Completa */}
            <div
              onClick={() => setSelectedMode('curated')}
              style={{
                padding: '14px',
                borderRadius: radius.card,
                border: `2px solid ${selectedMode === 'curated' ? colorSystem.accent.base : colorSystem.neutral.border}`,
                backgroundColor: selectedMode === 'curated' ? `${colorSystem.accent.base}08` : colorSystem.neutral.surface,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ marginTop: '2px', color: selectedMode === 'curated' ? colorSystem.accent.base : colorSystem.neutral.textSecondary }}>
                {selectedMode === 'curated' ? <CheckCircle size={20} /> : <FileText size={20} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: colorSystem.neutral.textPrimary }}>
                    1. Aplicar Plantilla Completa
                  </span>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: colorSystem.accent.base,
                      color: colorSystem.accent.onBase
                    }}
                  >
                    Recomendado
                  </span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: colorSystem.neutral.textSecondary, lineHeight: 1.4 }}>
                  Se ordenan las secciones en las columnas y algunas podrían ocultarse para cumplir con este formato del mercado.
                </p>
              </div>
            </div>

            {/* Opción 2: Aplicar Orden de Plantilla */}
            <div
              onClick={() => setSelectedMode('reorder-only')}
              style={{
                padding: '14px',
                borderRadius: radius.card,
                border: `2px solid ${selectedMode === 'reorder-only' ? colorSystem.accent.base : colorSystem.neutral.border}`,
                backgroundColor: selectedMode === 'reorder-only' ? `${colorSystem.accent.base}08` : colorSystem.neutral.surface,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ marginTop: '2px', color: selectedMode === 'reorder-only' ? colorSystem.accent.base : colorSystem.neutral.textSecondary }}>
                {selectedMode === 'reorder-only' ? <CheckCircle size={20} /> : <Layout size={20} />}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: colorSystem.neutral.textPrimary }}>
                  2. Aplicar Orden de Plantilla
                </span>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: colorSystem.neutral.textSecondary, lineHeight: 1.4 }}>
                  Se ordenan y priorizan las secciones en las columnas sin ocultarse.
                </p>
              </div>
            </div>

            {/* Opción 3: Aplicar Plantilla Sin Filtros */}
            <div
              onClick={() => setSelectedMode('full-20-sections')}
              style={{
                padding: '14px',
                borderRadius: radius.card,
                border: `2px solid ${selectedMode === 'full-20-sections' ? colorSystem.accent.base : colorSystem.neutral.border}`,
                backgroundColor: selectedMode === 'full-20-sections' ? `${colorSystem.accent.base}08` : colorSystem.neutral.surface,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ marginTop: '2px', color: selectedMode === 'full-20-sections' ? colorSystem.accent.base : colorSystem.neutral.textSecondary }}>
                {selectedMode === 'full-20-sections' ? <CheckCircle size={20} /> : <Layers size={20} />}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: colorSystem.neutral.textPrimary }}>
                  3. Aplicar Plantilla Sin Filtros
                </span>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: colorSystem.neutral.textSecondary, lineHeight: 1.4 }}>
                  Mantiene visibles todas tus secciones y campos personales sin ocultar nada, aplicando la tipografía y colores del nuevo formato.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones de Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: `1px solid ${colorSystem.neutral.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            background: colorSystem.neutral.surfaceMuted,
            flexShrink: 0
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '9px 16px',
              borderRadius: radius.control,
              border: `1px solid ${colorSystem.neutral.border}`,
              background: colorSystem.neutral.surface,
              color: colorSystem.neutral.textPrimary,
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            style={{
              padding: '9px 20px',
              borderRadius: radius.control,
              border: 'none',
              background: colorSystem.accent.base,
              color: colorSystem.accent.onBase,
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-raised)'
            }}
          >
            Aplicar Formato
          </button>
        </div>
      </div>
    </div>
  );
};
