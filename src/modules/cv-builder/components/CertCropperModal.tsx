import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Crop, ZoomIn, ZoomOut, RotateCw, Check, X, AlertTriangle, Maximize2 } from 'lucide-react';
import { useToast } from '../../../shared/core/ui/Toast';
import { colorSystem } from '../../../shared/core/uiDesignSystem';

export default function CertCropperModal({ 
  isOpen, 
  onClose, 
  onAcceptCropped, 
  rawImageSrc,
  registeredItems = [],
  selectedRegIdx = '',
  setSelectedRegIdx
}) {
  const { showWarning: toastWarning } = useToast();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [localRegIdx, setLocalRegIdx] = useState(selectedRegIdx);
  const [isSelectionWarningVisible, setIsSelectionWarningVisible] = useState(false);

  const canvasRef = useRef(null);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rawImageSrc) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = rawImageSrc;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Fill background white
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Account for 90°/270° rotations in base scale calculation
      const isRotated90 = (rotation / 90) % 2 !== 0;
      const boundingW = isRotated90 ? img.height : img.width;
      const boundingH = isRotated90 ? img.width : img.height;

      // Base scale fits the whole image 100% inside viewport at zoom = 1
      const baseScale = Math.min((canvas.width - 10) / boundingW, (canvas.height - 10) / boundingH);
      const effectiveScale = baseScale * zoom;

      // Translate to center and transform
      ctx.translate(canvas.width / 2 + offset.x, canvas.height / 2 + offset.y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(effectiveScale, effectiveScale);

      // Draw image centered
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

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSelectChange = (val) => {
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
    
    // Export proportional A4 crop (width: 800, height: 1131 ~ A4 aspect ratio)
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 800;
    exportCanvas.height = 1131;
    const ctx = exportCanvas.getContext('2d');
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height);

    const croppedDataUrl = exportCanvas.toDataURL('image/jpeg', 0.92);
    onAcceptCropped(croppedDataUrl, localRegIdx);
    onClose();
  };

  if (!isOpen || !rawImageSrc) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in no-print">
      <div className="bg-[#FFFDF7] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-[${colorSystem.neutral.border}] text-[${colorSystem.neutral.textPrimary}]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[${colorSystem.neutral.textPrimary}] text-white border-b-2 border-[${colorSystem.neutral.border}]">
          <div className="flex items-center gap-2 font-black text-base tracking-wide">
            <Crop className="w-5 h-5 text-[#FFC93C]" />
            Ajustar Certificado a Hoja A4
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-[${colorSystem.neutral.border}] hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col items-center space-y-3">

          {/* Record Selector inside Cropper Modal */}
          <div className="w-full">
            <label className="block text-xs font-black text-[${colorSystem.accent.base}] mb-1 uppercase tracking-wide flex items-center justify-between">
              <span>IDENTIFICA TU CERTIFICADO *</span>
              {isSelectionWarningVisible && <span className="text-red-600 text-[11px] font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Primero elige el registro</span>}
            </label>
            <select
              value={localRegIdx}
              onChange={(e) => handleSelectChange(e.target.value)}
              className={`w-full text-xs p-2.5 rounded-xl border-2 bg-white text-[${colorSystem.neutral.textPrimary}] font-extrabold outline-none transition shadow-sm ${
                isSelectionWarningVisible ? 'border-red-500 ring-2 ring-red-400/50 bg-red-50/50' : 'border-[${colorSystem.neutral.border}] focus:border-[${colorSystem.accent.base}]'
              }`}
            >
              <option value="">-- Primero elige el registro --</option>
              {registeredItems.map((item, idx) => (
                <option key={idx} value={idx}>
                  [{item.category}] {item.title} ({item.year})
                </option>
              ))}
            </select>
          </div>

          {/* Viewport Canvas (Proportional A4 Aspect Ratio 1:1.414) */}
          <div className="relative border-4 border-[${colorSystem.accent.base}] rounded-xl overflow-hidden shadow-2xl bg-black cursor-grab active:cursor-grabbing">
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
            <div className="absolute inset-0 border-2 border-dashed border-[#FFC93C]/60 pointer-events-none rounded-lg" />
          </div>

          {/* Zoom and Rotation Control Bar */}
          <div className="w-full bg-[${colorSystem.neutral.surfaceMuted}] p-3 rounded-xl space-y-2 border border-[${colorSystem.neutral.border}]">
            <div className="flex items-center gap-3">
              <ZoomOut className="w-4 h-4 text-[${colorSystem.neutral.textPrimary}]" />
              <input 
                type="range"
                min="0.1"
                max="3"
                step="0.02"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-[${colorSystem.accent.base}] cursor-pointer"
              />
              <ZoomIn className="w-4 h-4 text-[${colorSystem.neutral.textPrimary}]" />
              <span className="text-xs font-black w-10 text-right text-[${colorSystem.neutral.textPrimary}]">{Math.round(zoom * 100)}%</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button 
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[${colorSystem.neutral.border}] text-xs font-black text-[${colorSystem.neutral.textPrimary}] hover:bg-[#FFF7E8] transition shadow-sm"
              >
                <RotateCw className="w-3.5 h-3.5 text-[${colorSystem.accent.base}]" /> Rotar 90°
              </button>

              <button 
                onClick={() => { setZoom(1); setRotation(0); setOffset({ x: 0, y: 0 }); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[${colorSystem.neutral.border}] text-xs font-black text-[${colorSystem.neutral.textPrimary}] hover:bg-[#FFF7E8] transition shadow-sm"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[${colorSystem.secondary.base}]" /> Auto-Encajar
              </button>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t-2 border-[${colorSystem.neutral.border}] bg-[${colorSystem.neutral.surfaceMuted}]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-black text-[${colorSystem.neutral.textPrimary}] bg-[${colorSystem.neutral.border}] hover:bg-[#E2D4B8] rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleAccept}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[${colorSystem.accent.base}] hover:bg-[#E31555] text-white font-black text-xs shadow-lg shadow-[${colorSystem.accent.base}]/30 transition transform active:scale-95"
          >
            <Check className="w-4 h-4" /> ACEPTAR
          </button>
        </div>
      </div>
    </div>
  );
}
