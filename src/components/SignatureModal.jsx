import React, { useState, useRef, useEffect } from 'react';
import { PenTool, Upload, Eraser, RotateCcw, Check, X, Sparkles } from 'lucide-react';

export default function SignatureModal({ isOpen, onClose, onSaveSignature, currentSignature }) {
  const [activeTab, setActiveTab] = useState('draw'); // 'draw' | 'upload'
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [signerName, setSignerName] = useState(currentSignature?.signerName || 'MÓNICA DANIELA BURGOS');
  const [signerRole, setSignerRole] = useState(currentSignature?.signerRole || 'Profesora de Educación Secundaria en Lengua y Literatura');
  const [date, setDate] = useState(currentSignature?.date || 'Salta, 2025');

  const [uploadedImageSrc, setUploadedImageSrc] = useState('');
  const [removeBgContrast, setRemoveBgContrast] = useState(true);

  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && activeTab === 'draw') {
      setTimeout(() => {
        initCanvas();
      }, 100);
    }
  }, [isOpen, activeTab]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Fill white background initially
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
  };

  const getCoordinates = (e) => {
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

  const startDrawing = (e) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
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
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImageSrc(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Process canvas or uploaded signature to transparent PNG
  const processToTransparentPng = (sourceCanvasOrImageSrc) => {
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');

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

    // Turn white/light grey pixels completely transparent
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // If pixel is near white/light grey, make alpha = 0
      if (r > 220 && g > 220 && b > 220) {
        data[i + 3] = 0;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return tempCanvas.toDataURL('image/png');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in no-print">
      <div className="bg-[#FFFDF7] rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border-2 border-[#EFE2C9] text-[#2B1B2E]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#2B1B2E] text-white border-b-2 border-[#EFE2C9]">
          <div className="flex items-center gap-2 font-black text-base tracking-wide">
            <PenTool className="w-5 h-5 text-[#FFC93C]" />
            Tablero de Firma Digital
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-[#EFE2C9] hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex bg-[#F5EDDA] p-1.5 border-b-2 border-[#EFE2C9]">
          <button
            onClick={() => setActiveTab('draw')}
            className={`flex-1 py-2 text-xs font-black rounded-xl flex items-center justify-center gap-2 transition ${
              activeTab === 'draw'
                ? 'bg-[#FF2E63] text-white shadow-md'
                : 'text-[#2B1B2E] hover:bg-[#EFE2C9]/60'
            }`}
          >
            <PenTool className="w-4 h-4" /> Dibujar Firma (Táctil/Mouse)
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 text-xs font-black rounded-xl flex items-center justify-center gap-2 transition ${
              activeTab === 'upload'
                ? 'bg-[#FF2E63] text-white shadow-md'
                : 'text-[#2B1B2E] hover:bg-[#EFE2C9]/60'
            }`}
          >
            <Upload className="w-4 h-4" /> Subir Foto de Firma
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          {activeTab === 'draw' ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-[#FF2E63] uppercase">Dibuje su firma en el recuadro</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-[#2B1B2E]">Color:</span>
                  <input 
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-2 border-[#EFE2C9]"
                  />
                  <span className="text-xs font-black text-[#2B1B2E] ml-2">Grosor:</span>
                  <input 
                    type="range"
                    min="1"
                    max="8"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                    className="w-20 accent-[#FF2E63]"
                  />
                </div>
              </div>

              <div className="relative border-2 border-[#EFE2C9] rounded-2xl overflow-hidden shadow-inner bg-white">
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
                  onClick={clearCanvas}
                  className="absolute bottom-2 right-2 flex items-center gap-1 px-3 py-1.5 bg-[#FFF1C2] border border-[#FFC93C] rounded-xl text-xs font-black text-[#2B1B2E] hover:bg-[#FFC93C] transition shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#FF2E63]" /> Limpiar
                </button>
              </div>
            </div>
          ) : (
            <div>
              {!uploadedImageSrc ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-44 border-2 border-dashed border-[#00A8A0] bg-white rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-[#CFF3F0]/30 transition group"
                >
                  <Upload className="w-8 h-8 text-[#00A8A0] mb-2 group-hover:scale-110 transition duration-300" />
                  <span className="font-black text-xs text-[#2B1B2E]">Subir imagen de la firma (JPG, PNG, WEBP)</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative border-2 border-[#EFE2C9] rounded-2xl p-4 flex items-center justify-center bg-white min-h-36">
                    <img 
                      src={getProcessedUploadedSignature()} 
                      alt="Firma cargada" 
                      className="max-h-32 object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-[#2B1B2E] font-black">
                      <input 
                        type="checkbox"
                        checked={removeBgContrast}
                        onChange={(e) => setRemoveBgContrast(e.target.checked)}
                        className="rounded accent-[#FF2E63]"
                      />
                      <Sparkles className="w-3.5 h-3.5 text-[#FF2E63]" /> Eliminar fondo blanco automáticamente
                    </label>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[#00A8A0] font-black hover:underline"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t-2 border-[#EFE2C9]">
            <div>
              <label className="block text-xs font-black text-[#2B1B2E] mb-1">Nombre del Firmante</label>
              <input 
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-[#2B1B2E] mb-1">Lugar y Fecha</label>
              <input 
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t-2 border-[#EFE2C9] bg-[#F5EDDA]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-black text-[#2B1B2E] bg-[#EFE2C9] hover:bg-[#E2D4B8] rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#FF2E63] hover:bg-[#E31555] text-white font-black text-xs shadow-md transition transform active:scale-95"
          >
            <Check className="w-4 h-4" /> Aplicar Firma al CV
          </button>
        </div>
      </div>
    </div>
  );
}
