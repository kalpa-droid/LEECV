import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PenTool, Upload, RotateCcw, Check, Sparkles } from 'lucide-react';
import { validateImageFile } from '../../../shared/core/utils/validateFile';
import { useToast } from '../../../shared/core/ui/Toast';
import { colorSystem } from '../../../shared/core/uiDesignSystem';
import { Modal } from '../../../shared/core/ui/Modal';

export default function SignatureModal({ 
  isOpen, 
  onClose, 
  onSaveSignature, 
  currentSignature,
  defaultSignerName = '',
  defaultSignerRole = '',
  defaultDate = ''
}: any) {
  const { showError } = useToast();
  const [activeTab, setActiveTab] = useState<'draw' | 'upload'>('draw');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [signerName, setSignerName] = useState(currentSignature?.signerName || defaultSignerName);
  const [signerRole, setSignerRole] = useState(currentSignature?.signerRole || defaultSignerRole);
  const [date, setDate] = useState(currentSignature?.date || defaultDate);

  const [uploadedImageSrc, setUploadedImageSrc] = useState('');
  const [removeBgContrast, setRemoveBgContrast] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;

    if (currentSignature?.dataUrl && activeTab === 'draw') {
      const img = new Image();
      img.src = currentSignature.dataUrl;
      img.onload = () => {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
    }
  }, [strokeColor, strokeWidth, currentSignature, activeTab]);

  useEffect(() => {
    if (isOpen) {
      setSignerName(currentSignature?.signerName || defaultSignerName);
      setSignerRole(currentSignature?.signerRole || defaultSignerRole);
      setDate(currentSignature?.date || defaultDate);
      if (activeTab === 'draw') {
        setTimeout(() => {
          initCanvas();
        }, 100);
      }
    }
  }, [isOpen, activeTab, currentSignature, defaultSignerName, defaultSignerRole, defaultDate, initCanvas]);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDrawing = (e: any) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: any) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleFileUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        showError(validation.error || 'Archivo no válido');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedImageSrc(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const processToTransparentPng = (sourceCanvasOrImageSrc: any) => {
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return '';

    if (typeof sourceCanvasOrImageSrc === 'string') {
      const img = new Image();
      img.src = sourceCanvasOrImageSrc;
      tempCanvas.width = img.width || 500;
      tempCanvas.height = img.height || 200;
      ctx.drawImage(img, 0, 0);
    } else {
      tempCanvas.width = sourceCanvasOrImageSrc.width;
      tempCanvas.height = sourceCanvasOrImageSrc.height;
      ctx.drawImage(sourceCanvasOrImageSrc, 0, 0);
    }

    const imgData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r > 220 && g > 220 && b > 220) {
        data[i + 3] = 0;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return tempCanvas.toDataURL('image/png');
  };

  const getProcessedUploadedSignature = () => {
    if (!uploadedImageSrc) return '';
    return removeBgContrast ? processToTransparentPng(uploadedImageSrc) : uploadedImageSrc;
  };

  const handleSave = () => {
    let finalDataUrl = '';
    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (canvas) {
        finalDataUrl = processToTransparentPng(canvas);
      }
    } else {
      if (uploadedImageSrc) {
        finalDataUrl = removeBgContrast ? processToTransparentPng(uploadedImageSrc) : uploadedImageSrc;
      }
    }

    onSaveSignature({
      type: activeTab,
      dataUrl: finalDataUrl,
      signerName,
      signerRole,
      date
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tablero de Firma Digital"
      icon={<PenTool className="w-5 h-5 text-amber-400" />}
      size="xl"
      footer={
        <div className="w-full flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-black text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--color-accent-base)] hover:bg-[#E31555] text-white font-black text-xs shadow-md transition cursor-pointer`}
          >
            <Check className="w-4 h-4" /> Aplicar Firma al CV
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Mode Selector Tabs */}
        <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('draw')}
            className={`flex-1 py-2 text-xs font-black rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'draw'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PenTool className="w-4 h-4" /> Dibujar Firma (Táctil/Mouse)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 text-xs font-black rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" /> Subir Foto de Firma
          </button>
        </div>

        {activeTab === 'draw' ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-black text-[var(--color-accent-base)] uppercase`}>Dibuje su firma en el recuadro</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-300">Color:</span>
                <input 
                  type="color"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border border-slate-700"
                />
                <span className="text-xs font-black text-slate-300 ml-2">Grosor:</span>
                <input 
                  type="range"
                  min="1"
                  max="8"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                  className="w-20 accent-amber-500"
                />
              </div>
            </div>

            <div className="relative border-2 border-slate-700 rounded-2xl overflow-hidden shadow-inner bg-white">
              <canvas 
                ref={canvasRef}
                width={500}
                height={180}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-44 touch-none cursor-crosshair bg-white"
              />
              <button
                type="button"
                onClick={clearCanvas}
                className="absolute bottom-2 right-2 flex items-center gap-1 px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-xs font-black text-amber-300 hover:bg-amber-500/30 transition shadow-sm cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Limpiar
              </button>
            </div>
          </div>
        ) : (
          <div>
            {!uploadedImageSrc ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`w-full h-44 border-2 border-dashed border-[var(--color-secondary-base)] bg-slate-950/60 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-900 transition group`}
              >
                <Upload className={`w-8 h-8 text-[var(--color-secondary-base)] mb-2 group-hover:scale-110 transition duration-300`} />
                <span className="font-black text-xs text-white">Subir imagen de la firma (JPG, PNG, WEBP)</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative border-2 border-slate-800 rounded-2xl p-4 flex items-center justify-center bg-white min-h-36">
                  <img 
                    src={getProcessedUploadedSignature()} 
                    alt="Firma cargada" 
                    className="max-h-32 object-contain"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-200 font-black">
                    <input 
                      type="checkbox"
                      checked={removeBgContrast}
                      onChange={(e) => setRemoveBgContrast(e.target.checked)}
                      className="rounded accent-purple-500"
                    />
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Eliminar fondo blanco automáticamente
                  </label>
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`text-[var(--color-secondary-base)] font-black hover:underline cursor-pointer`}
                  >
                    Cambiar foto
                  </button>
                </div>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              onChange={handleFileUpload} 
              className="hidden" 
            />
          </div>
        )}

        {/* Signer Details Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-800">
          <div>
            <label className="block text-xs font-black text-slate-300 mb-1">Nombre del Firmante</label>
            <input 
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white font-bold outline-none focus:border-purple-500 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-300 mb-1">Lugar y Fecha</label>
            <input 
              type="text"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white font-bold outline-none focus:border-purple-500 transition"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
