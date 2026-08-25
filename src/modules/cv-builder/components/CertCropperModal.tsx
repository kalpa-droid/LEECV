import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Crop, ZoomIn, ZoomOut, RotateCw, Check, AlertTriangle, Maximize2 } from 'lucide-react';
import { useToast } from '../../../shared/core/ui/Toast';
import {} from '../../../shared/core/uiDesignSystem';
import { Modal } from '../../../shared/core/ui/Modal';
import { resolveCanvasColor } from '../../../shared/core/utils/canvasColorEngine';

export default function CertCropperModal({ 
  isOpen, 
  onClose, 
  onAcceptCropped, 
  rawImageSrc,
  registeredItems = [],
  selectedRegIdx = '',
  setSelectedRegIdx
}: any) {
  const { showWarning: toastWarning } = useToast();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [localRegIdx, setLocalRegIdx] = useState(selectedRegIdx);
  const [isSelectionWarningVisible, setIsSelectionWarningVisible] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rawImageSrc) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = rawImageSrc;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      ctx.fillStyle = resolveCanvasColor('neutral.surface', '#FFFFFF');
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const isRotated90 = (rotation / 90) % 2 !== 0;
      const boundingW = isRotated90 ? img.height : img.width;
      const boundingH = isRotated90 ? img.width : img.height;

      const baseScale = Math.min((canvas.width - 10) / boundingW, (canvas.height - 10) / boundingH);
      const effectiveScale = baseScale * zoom;

      ctx.translate(canvas.width / 2 + offset.x, canvas.height / 2 + offset.y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(effectiveScale, effectiveScale);

      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    };
  }, [rawImageSrc, zoom, rotation, offset]);

  useEffect(() => {
    if (isOpen && rawImageSrc) {
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setLocalRegIdx(selectedRegIdx);
      setIsSelectionWarningVisible(!selectedRegIdx);
    }
  }, [isOpen, rawImageSrc, selectedRegIdx]);

  useEffect(() => {
    if (isOpen && rawImageSrc && canvasRef.current) {
      drawCanvas();
    }
  }, [isOpen, rawImageSrc, drawCanvas]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSelectChange = (val: string) => {
    setLocalRegIdx(val);
    if (setSelectedRegIdx) setSelectedRegIdx(val);
    if (val !== '') setIsSelectionWarningVisible(false);
  };

  const handleAccept = () => {
    if (localRegIdx === '' || localRegIdx === undefined || localRegIdx === null) {
      setIsSelectionWarningVisible(true);
      toastWarning('Primero elige el registro al cual corresponde este certificado.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 800;
    exportCanvas.height = 1131;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height);

    const croppedDataUrl = exportCanvas.toDataURL('image/jpeg', 0.92);
    onAcceptCropped(croppedDataUrl, localRegIdx);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen && !!rawImageSrc}
      onClose={onClose}
      title="Ajustar Certificado a Hoja A4"
      icon={<Crop className="w-5 h-5 text-[var(--ui-warning)]" />}
      size="md"
      footer={
        <div className="w-full flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-black text-white/80 bg-white/10 hover:bg-white/20 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleAccept}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--color-accent-purple)] hover:opacity-90 text-white font-black text-xs shadow-lg transition cursor-pointer`}
          >
            <Check className="w-4 h-4" /> ACEPTAR
          </button>
        </div>
      }
    >
      <div className="flex flex-col items-center space-y-3">
        {/* Record Selector inside Cropper Modal */}
        <div className="w-full">
          <label className={`block text-xs font-black text-[var(--ui-rose)] mb-1 uppercase tracking-wide flex items-center justify-between`}>
            <span>IDENTIFICA TU CERTIFICADO *</span>
            {isSelectionWarningVisible && <span className="text-[var(--ui-danger)] text-[11px] font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Primero elige el registro</span>}
          </label>
          <select
            value={localRegIdx}
            onChange={(e) => handleSelectChange(e.target.value)}
            className={`w-full text-xs p-2.5 rounded-xl border-2 ui-bg-card ui-text-primary font-extrabold outline-none transition shadow-sm ${
              isSelectionWarningVisible ? 'border-[var(--color-status-danger-base)] ring-2 ring-[var(--color-status-danger-base)]/50 bg-[var(--color-status-danger-muted)]' : 'ui-border focus:border-[var(--color-status-warning-base)]'
            }`}
          >
            <option value="">-- Primero elige el registro --</option>
            {registeredItems.map((item: any, idx: number) => (
              <option key={idx} value={idx}>
                [{item.category}] {item.title} ({item.year})
              </option>
            ))}
          </select>
        </div>

        {/* Viewport Canvas */}
        <div className="relative border-4 border-[var(--color-status-warning-base)] rounded-xl overflow-hidden shadow-2xl bg-black cursor-grab active:cursor-grabbing">
          <canvas 
            ref={canvasRef}
            width={260}
            height={366}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="touch-none bg-white" />
          <div className="absolute inset-0 border-2 border-dashed border-[var(--color-status-warning-base)]/60 pointer-events-none rounded-lg" />
        </div>

        {/* Zoom and Rotation Control Bar */}
        <div className="w-full bg-black/40 p-3 rounded-xl space-y-2 border border-white/10">
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-white/80" />
            <input 
              type="range"
              min="0.1"
              max="3"
              step="0.02"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-[var(--color-status-warning-base)] cursor-pointer"
            />
            <ZoomIn className="w-4 h-4 text-white/80" />
            <span className="text-xs font-black w-10 text-right text-white">{Math.round(zoom * 100)}%</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button 
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-xs font-black text-white hover:bg-white/20 transition shadow-sm cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-white" /> Rotar 90°
            </button>

            <button 
              onClick={() => { setZoom(1); setRotation(0); setOffset({ x: 0, y: 0 }); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-xs font-black text-white hover:bg-white/20 transition shadow-sm cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-white" /> Auto-Encajar
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
