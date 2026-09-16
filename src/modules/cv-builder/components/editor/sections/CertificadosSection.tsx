import React, { useState, useRef } from 'react';
import { Camera, Upload, RotateCw, Trash2 } from 'lucide-react';
import { button, elevationSystem, radius } from '../../../../../shared/core/uiDesignSystem';
import { SectionToggle } from './ui/SectionToggle';
import { SectionManualAdjustment } from '../SectionManualAdjustment';
import CertCropperModal from '../../CertCropperModal';
import { useToast } from '../../../../../shared/core/ui/Toast';
import { useConfirm } from '../../../../../shared/core/ui/ConfirmDialog';

export const CertificadosSection = ({ cvData, setCvData, registeredItems }: any) => {
  const { confirm } = useConfirm();
  const { showSuccess, showError, showWarning } = useToast();
  const [certMode, setCertMode] = useState('upload');
  const [selectedRegIdx, setSelectedRegIdx] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCertCropperOpen, setIsCertCropperOpen] = useState(false);
  const [rawCertSrc, setRawCertSrc] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      setCertMode('camera');
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      showError('No se pudo acceder a la cámara. Por favor verifica los permisos o sube una imagen.');
      setCertMode('upload');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const compressRawImageBeforeCropping = (dataUrl: string, callback: (url: string) => void) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1600;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        const lightweightDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        callback(lightweightDataUrl);
      }
    };
    img.src = dataUrl;
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      stopCamera();
      setCertMode('upload');
      compressRawImageBeforeCropping(dataUrl, (compressedUrl) => {
        setRawCertSrc(compressedUrl);
        setIsCertCropperOpen(true);
      });
    }
  };

  const handleFileUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt: any) => {
        compressRawImageBeforeCropping(evt.target.result, (compressedUrl) => {
          setRawCertSrc(compressedUrl);
          setIsCertCropperOpen(true);
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-4">
      <SectionToggle sectionKey="certificados" sectionTitle="Certificados Escaneados" cvData={cvData} setCvData={setCvData} />

      {cvData?.sectionVisibility?.certificados !== false && (
        <>
          {/* 1. Selector */}
          <div>
            <label className="block text-xs font-black text-[var(--ui-rose)] mb-1.5 uppercase tracking-wide">
              IDENTIFICA TU CERTIFICADO *
            </label>
            <select
              value={selectedRegIdx}
              onChange={(e) => setSelectedRegIdx(e.target.value)}
              className={`w-full text-xs p-2.5 rounded-[${radius.card}] border-2 border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] font-extrabold outline-none focus:border-[var(--color-accent-base)] focus:ring-2 focus:ring-[var(--color-accent-rose-muted)] transition ${elevationSystem.raised}`}
            >
              <option value="">-- Hacer clic para elegir un título o curso --</option>
              {registeredItems.map((item: any, idx: number) => (
                <option key={idx} value={idx}>
                  [{item.category}] {item.title} ({item.year})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                if (selectedRegIdx === '') {
                  showWarning('Por favor selecciona primero tu certificado en "IDENTIFICA TU CERTIFICADO".');
                  return;
                }
                stopCamera();
                setCertMode('upload');
                fileInputRef.current?.click();
              }}
              className={`p-2.5 rounded-[${radius.card}] border-2 flex items-center justify-center gap-1.5 font-black text-xs transition ${
                certMode === 'upload'
                  ? `border-[var(--color-accent-base)] bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.raised}`
                  : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] hover:bg-[var(--color-neutral-surface-warm)]'
              }`}
            >
              <Upload className="w-4 h-4" /> Subir Imagen
            </button>
            <button
              onClick={() => {
                if (selectedRegIdx === '') {
                  showWarning('Por favor selecciona primero tu certificado en "IDENTIFICA TU CERTIFICADO".');
                  return;
                }
                startCamera();
              }}
              className={`p-2.5 rounded-[${radius.card}] border-2 flex items-center justify-center gap-1.5 font-black text-xs transition ${
                certMode === 'camera'
                  ? `border-[var(--color-accent-base)] bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.raised}`
                  : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] hover:bg-[var(--color-neutral-surface-warm)]'
              }`}
            >
              <Camera className="w-4 h-4" /> Usar Cámara
            </button>
          </div>

          {/* 3. Camera view or File dropzone with "CLIC AQUÍ" */}
          {certMode === 'camera' && isCameraActive ? (
            <div className={`relative rounded-[${radius.card}] overflow-hidden bg-black flex flex-col items-center justify-center h-52`}>
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <button
                onClick={capturePhoto}
                className={`absolute bottom-3 flex items-center gap-1.5 px-5 py-2 font-black text-xs rounded-full transition ${button.primary}`}
              >
                <Camera className="w-4 h-4" /> Capturar Foto
              </button>
            </div>
          ) : (
            <div 
              onClick={() => {
                if (selectedRegIdx === '') {
                  showWarning('Por favor selecciona primero tu certificado en "IDENTIFICA TU CERTIFICADO".');
                  return;
                }
                fileInputRef.current?.click();
              }}
              className={`w-full h-28 border-2 border-dashed border-[var(--color-secondary-base)] bg-[var(--ui-bg-card)] rounded-[${radius.modal}] flex flex-col items-center justify-center cursor-pointer hover:bg-[var(--color-secondary-muted)]/30 transition group ${elevationSystem.raised}`}
            >
              <Upload className="w-6 h-6 text-[var(--color-secondary-text)] mb-1 group-hover:scale-110 transition duration-300" />
              <span className="font-black text-xs text-[var(--color-accent-text)] uppercase tracking-wider">CLIC AQUÍ</span>
              <span className="text-[10px] text-[var(--color-neutral-text-primary)] font-bold">Seleccionar archivo o foto de certificado</span>
            </div>
          )}

          <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileUpload} className="hidden" />

          {/* 4. List of Attached Certificates */}
          <div className="pt-3 border-t-2 border-[var(--color-neutral-border)] space-y-3">
            <span className="text-xs font-black text-[var(--color-neutral-text-primary)] uppercase tracking-wider">
              ANEXADOS: ({cvData.certificatesScanned.length})
            </span>

            {cvData.certificatesScanned.length === 0 ? (
              <p className={`text-xs text-[var(--color-neutral-text-primary)] font-bold italic text-center py-4 border-2 border-dashed border-[var(--color-neutral-border)] rounded-[${radius.card}] bg-[var(--ui-bg-card)]`}>
                No hay certificados anexados aún.
              </p>
            ) : (
              <div className="space-y-2">
                {cvData.certificatesScanned.map((cert: any) => (
                  <div key={cert.id} className={`flex items-center gap-3 p-2.5 bg-[var(--ui-bg-card)] rounded-[${radius.card}] border-2 border-[var(--color-neutral-border)] ${elevationSystem.raised}`}>
                    <img 
                      src={cert.dataUrl || cert.imageUrl} 
                      alt={cert.title} 
                      style={{ transform: `rotate(${cert.rotation || 0}deg)` }}
                      className={`w-12 h-14 object-cover rounded-[${radius.control}] border border-[var(--color-neutral-border)] flex-shrink-0`} 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-[var(--color-neutral-text-primary)] truncate">{cert.title}</p>
                      <p className="text-[10px] text-[var(--color-neutral-text-primary)] font-bold">{cert.institution} ({cert.year})</p>
                    </div>

                    {/* Rotate button */}
                    <button
                      onClick={() => {
                        setCvData((prev: any) => ({
                          ...prev,
                          certificatesScanned: prev.certificatesScanned.map((c: any) => 
                            c.id === cert.id ? { ...c, rotation: ((c.rotation || 0) + 90) % 360 } : c
                          )
                        }));
                      }}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-[${radius.control}] bg-[var(--color-accent-amber-muted)] border border-[var(--color-accent-amber)] text-[var(--color-neutral-text-primary)] font-black text-[11px] hover:bg-[var(--color-accent-amber)] transition`}
                      title="Girar imagen 90°"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-[var(--color-accent-text)]" />
                      <span>Girar ({cert.rotation || 0}°)</span>
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => {
                        const name = cert.title || 'este certificado';
                        confirm({
                          title: '¿Eliminar certificado?',
                          message: `¿Estás seguro de que deseas eliminar el certificado "${name}"?`,
                          confirmText: 'Eliminar',
                          onConfirm: () => {
                            setCvData((prev: any) => ({
                              ...prev,
                              certificatesScanned: (prev.certificatesScanned || []).filter((c: any) => c.id !== cert.id)
                            }));
                            showSuccess('Certificado eliminado.');
                          }
                        });
                      }}
                      className="p-1.5 text-[var(--color-neutral-text-primary)] hover:text-[var(--color-status-danger-text)] transition"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CertCropperModal Panel */}
          <CertCropperModal
            isOpen={isCertCropperOpen}
            onClose={() => { setIsCertCropperOpen(false); setRawCertSrc(''); }}
            registeredItems={registeredItems}
            selectedRegIdx={selectedRegIdx}
            setSelectedRegIdx={setSelectedRegIdx}
            onAcceptCropped={(croppedUrl: string, targetRegIdx: string) => {
              const selectedItem = registeredItems[parseInt(targetRegIdx, 10)] || { title: 'CERTIFICADO', institution: '', year: '' };
              const newCert = {
                id: Date.now().toString(),
                title: selectedItem.title,
                institution: selectedItem.institution,
                year: selectedItem.year,
                dataUrl: croppedUrl,
                imageUrl: croppedUrl,
                rotation: 0
              };
              setCvData((prev: any) => ({
                ...prev,
                certificatesScanned: [...prev.certificatesScanned, newCert]
              }));
              setRawCertSrc('');
              setSelectedRegIdx('');
              setIsCertCropperOpen(false);
            }}
            rawImageSrc={rawCertSrc}
          />
          <div className="pt-2 border-t border-[var(--color-neutral-border)]">
            <SectionManualAdjustment sectionId="certificados" cvData={cvData} setCvData={setCvData} />
          </div>
        </>
      )}
    </div>
  );
};
