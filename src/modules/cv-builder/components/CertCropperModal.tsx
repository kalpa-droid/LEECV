import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Crop, ZoomIn, ZoomOut, RotateCw, Check, AlertTriangle, Maximize2 } from 'lucide-react';
import { useToast } from '../../../shared/core/ui/Toast';
import { colorSystem } from '../../../shared/core/uiDesignSystem';
import { Modal } from '../../../shared/core/ui/Modal';

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

      ctx.fillStyle = '#FFFFFF';
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
      icon={<Crop className="w-5 h-5 text-amber-400" />}
      size="md"
      footer={
        <div className="w-full flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-black text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleAccept}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[${colorSystem.accent.base}] hover:bg-[#E31555] text-white font-black text-xs shadow-lg transition cursor-pointer`}
          >
            <Check className="w-4 h-4" /> ACEPTAR
          </button>
        </div>
      }
    >
      <div className="flex flex-col items-center space-y-3">
        {/* Record Selector inside Cropper Modal */}
        <div className="w-full">
          <label className={`block text-xs font-black text-[${colorSystem.accent.base}] mb-1 uppercase tracking-wide flex items-center justify-between`}>
            <span>IDENTIFICA TU CERTIFICADO *</span>
            {isSelectionWarningVisible && <span className="text-red-500 text-[11px] font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Primero elige el registro</span>}
          </label>
          <select
            value={localRegIdx}
            onChange={(e) => handleSelectChange(e.target.value)}
            className={`w-full text-xs p-2.5 rounded-xl border-2 ui-bg-card ui-text-primary font-extrabold outline-none transition shadow-sm ${
              isSelectionWarningVisible ? 'border-red-500 ring-2 ring-red-400/50 bg-red-50/50' : 'ui-border focus:border-amber-500'
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
        <div className="relative border-4 border-amber-500 rounded-xl overflow-hidden shadow-2xl bg-black cursor-grab active:cursor-grabbing">
          <canvas 
            ref={canvasRef}
            width={260}
            height={366}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="touch-none bg-white"
          />
          <div className="absolute inset-0 border-2 border-dashed border-amber-400/60 pointer-events-none rounded-lg" />
        </div>

        {/* Zoom and Rotation Control Bar */}
        <div className="w-full bg-slate-900 p-3 rounded-xl space-y-2 border border-slate-800">
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-slate-300" />
            <input 
              type="range"
              min="0.1"
              max="3"
              step="0.02"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <ZoomIn className="w-4 h-4 text-slate-300" />
            <span className="text-xs font-black w-10 text-right text-slate-200">{Math.round(zoom * 100)}%</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button 
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-black text-slate-200 hover:bg-slate-700 transition shadow-sm cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-amber-400" /> Rotar 90°
            </button>

            <button 
              onClick={() => { setZoom(1); setRotation(0); setOffset({ x: 0, y: 0 }); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-black text-slate-200 hover:bg-slate-700 transition shadow-sm cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-teal-400" /> Auto-Encajar
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
