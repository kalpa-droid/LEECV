import React, { useState, useRef, useEffect } from 'react';
import { Camera, ZoomIn, ZoomOut, RotateCw, Check, X, Upload } from 'lucide-react';

export default function PhotoCropperModal({ isOpen, onClose, onSavePhoto, currentPhoto }) {
  const [imageSrc, setImageSrc] = useState(currentPhoto || '');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (currentPhoto) {
      setImageSrc(currentPhoto);
    }
  }, [currentPhoto]);

  useEffect(() => {
    if (imageSrc && canvasRef.current) {
      drawCanvas();
    }
  }, [imageSrc, zoom, rotation, offset]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target.result);
        setZoom(1);
        setRotation(0);
        setOffset({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageSrc) return;
    const ctx = canvas.getContext('2d');
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

  const handleCropAndSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    onSavePhoto(croppedDataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-bold text-lg">
            <Camera className="w-5 h-5" />
            Recortador de Foto de Perfil
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col items-center">
          {!imageSrc ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-64 border-2 border-dashed border-purple-300 dark:border-purple-800 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition group"
            >
              <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-300 group-hover:scale-110 transition duration-300 mb-3">
                <Upload className="w-8 h-8" />
              </div>
              <span className="font-semibold text-slate-700 dark:text-slate-200">Haz clic para subir una foto</span>
              <span className="text-xs text-slate-500 mt-1">Formatos recomendados: JPG, PNG (Hasta 10MB)</span>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              {/* Canvas viewport container */}
              <div className="relative border-4 border-purple-600 rounded-xl overflow-hidden shadow-lg bg-slate-950 cursor-grab active:cursor-grabbing">
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
              <div className="w-full mt-5 bg-slate-100 dark:bg-slate-800 p-4 rounded-xl space-y-3">
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
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                  <ZoomIn className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-semibold w-10 text-right">{Math.round(zoom * 100)}%</span>
                </div>

                {/* Buttons row */}
                <div className="flex items-center justify-between pt-1">
                  <button 
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> Rotar 90°
                  </button>

                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline"
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
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleCropAndSave}
            disabled={!imageSrc}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm shadow-md hover:shadow-purple-500/25 disabled:opacity-50 transition"
          >
            <Check className="w-4 h-4" /> Guardar Foto Recortada
          </button>
        </div>
      </div>
    </div>
  );
}
