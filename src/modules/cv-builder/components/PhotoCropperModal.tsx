import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, ZoomIn, ZoomOut, RotateCw, Check, X, Upload } from 'lucide-react';

import { validateImageFile } from '../../../shared/core/utils/validateFile';
import { useToast } from '../../../shared/core/ui/Toast';
import { colorSystem, button, typeScale } from '../../../shared/core/uiDesignSystem';

export default function PhotoCropperModal({ isOpen, onClose, onSavePhoto, currentPhoto }: any) {
  const { showError } = useToast();
  const [imageSrc, setImageSrc] = useState(currentPhoto || '');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageSrc) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Center canvas
      ctx.translate(canvas.width / 2 + offset.x, canvas.height / 2 + offset.y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      // Draw image centered
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    };
  }, [imageSrc, zoom, rotation, offset]);

  useEffect(() => {
    if (currentPhoto) {
      setImageSrc(currentPhoto);
    }
  }, [currentPhoto]);

  useEffect(() => {
    if (imageSrc && canvasRef.current) {
      drawCanvas();
    }
  }, [imageSrc, drawCanvas]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const val = validateImageFile(file);
      if (!val.valid) {
        showError(val.error || 'Archivo no válido');
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setImageSrc(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropAndSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    onSavePhoto(croppedDataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-[16px] shadow-2xl max-w-lg w-full overflow-hidden border border-[${colorSystem.neutral.border}]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[${colorSystem.neutral.border}] bg-[${colorSystem.neutral.surfaceMuted}]">
          <div className="flex items-center gap-2 font-bold text-sm" style={{ color: colorSystem.neutral.textPrimary }}>
            <Camera className="w-5 h-5" style={{ color: colorSystem.secondary.base }} />
            Recortador de Foto de Perfil
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col items-center">
          {!imageSrc ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-64 border-2 border-dashed border-[${colorSystem.neutral.borderStrong}] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[${colorSystem.secondary.base}] hover:bg-teal-50/50 transition group"
            >
              <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-[${colorSystem.secondary.base}] group-hover:scale-110 transition duration-300 mb-3">
                <Upload className="w-8 h-8" />
              </div>
              <span className="font-semibold text-slate-700 text-xs">Haz clic para subir una foto</span>
              <span className="text-[10px] text-slate-500 mt-1">Formatos recomendados: JPG, PNG (Hasta 10MB)</span>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              {/* Canvas viewport container */}
              <div className="relative border-4 border-[${colorSystem.secondary.base}] rounded-xl overflow-hidden shadow-lg bg-slate-950 cursor-grab active:cursor-grabbing">
                <canvas 
                  ref={canvasRef}
                  width={280}
                  height={360}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className="touch-none"
                />
                {/* Crop guide overlay */}
                <div className="absolute inset-0 border-2 border-white/40 pointer-events-none rounded-lg" />
              </div>

              {/* Controls bar */}
              <div className="w-full mt-5 bg-slate-50 p-4 rounded-xl space-y-3 border border-[${colorSystem.neutral.border}]">
                {/* Zoom control */}
                <div className="flex items-center gap-3">
                  <ZoomOut className="w-4 h-4 text-slate-500" />
                  <input 
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-[${colorSystem.secondary.base}] cursor-pointer"
                  />
                  <ZoomIn className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-semibold w-10 text-right">{Math.round(zoom * 100)}%</span>
                </div>

                {/* Buttons row */}
                <div className="flex items-center justify-between pt-1">
                  <button 
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 text-xs font-medium hover:bg-slate-300 transition cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> Rotar 90°
                  </button>

                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-[${colorSystem.secondary.base}] font-semibold hover:underline cursor-pointer"
                  >
                    Cambiar foto
                  </button>
                </div>
              </div>
            </div>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            onChange={handleFileChange} 
            className="hidden" 
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[${colorSystem.neutral.border}] bg-[${colorSystem.neutral.surfaceMuted}]">
          <button
            type="button"
            onClick={onClose}
            className={button.ghost}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCropAndSave}
            disabled={!imageSrc}
            className={`${button.primary} flex items-center gap-2`}
          >
            <Check className="w-4 h-4" /> Guardar Foto Recortada
          </button>
        </div>
      </div>
    </div>
  );
}
