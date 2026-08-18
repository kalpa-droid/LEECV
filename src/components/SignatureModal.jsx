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
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;

    if (currentSignature?.dataUrl && activeTab === 'draw') {
      const img = new Image();
      img.src = currentSignature.dataUrl;
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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

  // Auto-remove light backgrounds from signature photo using canvas thresholding
  const getProcessedUploadedSignature = () => {
    if (!uploadedImageSrc) return '';
    if (!removeBgContrast) return uploadedImageSrc;

    const tempCanvas = document.createElement('canvas');
    const img = new Image();
    img.src = uploadedImageSrc;
    tempCanvas.width = img.width || 400;
    tempCanvas.height = img.height || 200;
    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // If pixel is near white/light grey, make it transparent
      if (r > 200 && g > 200 && b > 200) {
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
        finalDataUrl = canvas.toDataURL('image/png');
      }
    } else {
      finalDataUrl = getProcessedUploadedSignature();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-bold text-lg">
            <PenTool className="w-5 h-5" />
            Tablero de Firma Digital
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 p-1">
          <button
            onClick={() => setActiveTab('draw')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === 'draw'
                ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <PenTool className="w-4 h-4" /> Dibujar Firma (Táctil/Mouse)
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
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
                <span className="text-xs font-semibold text-slate-500 uppercase">Dibuje su firma en el recuadro</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Color:</span>
                  <input 
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-0"
                  />
                  <span className="text-xs text-slate-500 ml-2">Grosor:</span>
                  <input 
                    type="range"
                    min="1"
                    max="8"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                    className="w-20 accent-purple-600"
                  />
                </div>
              </div>

              <div className="relative border-2 border-amber-300 dark:border-amber-700/60 rounded-xl overflow-hidden shadow-inner" style={{ backgroundColor: '#fffdf7' }}>
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
                  className="w-full h-44 touch-none cursor-crosshair"
                />
                <button
                  onClick={clearCanvas}
                  className="absolute bottom-2 right-2 flex items-center gap-1 px-3 py-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition shadow-sm"
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
                  className="w-full h-44 border-2 border-dashed border-purple-300 dark:border-purple-800 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition group"
                >
                  <Upload className="w-8 h-8 text-purple-600 mb-2 group-hover:scale-110 transition duration-300" />
                  <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">Subir imagen de la firma (JPG, PNG)</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative border-2 border-purple-300 dark:border-purple-800 rounded-xl p-4 flex items-center justify-center bg-slate-50 dark:bg-slate-950 min-h-36">
                    <img 
                      src={getProcessedUploadedSignature()} 
                      alt="Firma cargada" 
                      className="max-h-32 object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
                      <input 
                        type="checkbox"
                        checked={removeBgContrast}
                        onChange={(e) => setRemoveBgContrast(e.target.checked)}
                        className="rounded accent-purple-600"
                      />
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Eliminar fondo blanco automáticamente
                    </label>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-purple-600 font-semibold hover:underline"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre del Firmante</label>
              <input 
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Lugar y Fecha</label>
              <input 
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm shadow-md hover:shadow-purple-500/25 transition"
          >
            <Check className="w-4 h-4" /> Aplicar Firma al CV
          </button>
        </div>
      </div>
    </div>
  );
}
