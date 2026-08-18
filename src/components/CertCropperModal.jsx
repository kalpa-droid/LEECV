import React, { useState, useRef, useEffect } from 'react';
import { Crop, ZoomIn, ZoomOut, RotateCw, Check, X, AlertTriangle } from 'lucide-react';

export default function CertCropperModal({ 
  isOpen, 
  onClose, 
  onAcceptCropped, 
  rawImageSrc,
  registeredItems = [],
  selectedRegIdx = '',
  setSelectedRegIdx
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [localRegIdx, setLocalRegIdx] = useState(selectedRegIdx);
  const [showWarning, setShowWarning] = useState(false);

  const canvasRef = useRef(null);

  useEffect(() => {
    if (isOpen && rawImageSrc) {
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setLocalRegIdx(selectedRegIdx);
      setShowWarning(!selectedRegIdx);
    }
  }, [isOpen, rawImageSrc, selectedRegIdx]);

  useEffect(() => {
    if (isOpen && rawImageSrc && canvasRef.current) {
      drawCanvas();
    }
  }, [isOpen, rawImageSrc, zoom, rotation, offset]);

  const drawCanvas = () => {
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

      // Translate to center and transform
      ctx.translate(canvas.width / 2 + offset.x, canvas.height / 2 + offset.y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      // Draw image centered
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    };
  };

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
    if (val !== '') setShowWarning(false);
  };

  const handleAccept = () => {
    if (localRegIdx === '' || localRegIdx === undefined || localRegIdx === null) {
      setShowWarning(true);
      alert('Primero elige el registro a cuál corresponde este certificado.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in no-print">
      <div className="bg-[#FFFDF7] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-[#EFE2C9] text-[#2B1B2E]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#2B1B2E] text-white border-b-2 border-[#EFE2C9]">
          <div className="flex items-center gap-2 font-black text-base tracking-wide">
            <Crop className="w-5 h-5 text-[#FFC93C]" />
            Ajustar Certificado a Hoja A4
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-[#EFE2C9] hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col items-center space-y-4">

          {/* Record Selector inside Cropper Modal */}
          <div className="w-full">
            <label className="block text-xs font-black text-[#FF2E63] mb-1 uppercase tracking-wide flex items-center justify-between">
              <span>IDENTIFICA TU CERTIFICADO *</span>
              {showWarning && <span className="text-red-600 text-[11px] font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Primero elige el registro</span>}
            </label>
            <select
              value={localRegIdx}
              onChange={(e) => handleSelectChange(e.target.value)}
              className={`w-full text-xs p-2.5 rounded-xl border-2 bg-white text-[#2B1B2E] font-extrabold outline-none transition shadow-sm ${
                showWarning ? 'border-red-500 ring-2 ring-red-400/50 bg-red-50/50' : 'border-[#EFE2C9] focus:border-[#FF2E63]'
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
          <div className="relative border-4 border-[#FF2E63] rounded-xl overflow-hidden shadow-2xl bg-black cursor-grab active:cursor-grabbing">
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
          <div className="w-full bg-[#F5EDDA] p-3 rounded-xl space-y-2 border border-[#EFE2C9]">
            <div className="flex items-center gap-3">
              <ZoomOut className="w-4 h-4 text-[#2B1B2E]" />
              <input 
                type="range"
                min="0.4"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-[#FF2E63] cursor-pointer"
              />
              <ZoomIn className="w-4 h-4 text-[#2B1B2E]" />
              <span className="text-xs font-black w-10 text-right text-[#2B1B2E]">{Math.round(zoom * 100)}%</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button 
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#EFE2C9] text-xs font-black text-[#2B1B2E] hover:bg-[#FFF7E8] transition shadow-sm"
              >
                <RotateCw className="w-3.5 h-3.5 text-[#FF2E63]" /> Rotar 90°
              </button>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t-2 border-[#EFE2C9] bg-[#F5EDDA]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-black text-[#2B1B2E] bg-[#EFE2C9] hover:bg-[#E2D4B8] rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleAccept}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#FF2E63] hover:bg-[#E31555] text-white font-black text-xs shadow-lg shadow-[#FF2E63]/30 transition transform active:scale-95"
          >
            <Check className="w-4 h-4" /> ACEPTAR
          </button>
        </div>
      </div>
    </div>
  );
}
