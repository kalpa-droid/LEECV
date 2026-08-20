import React from 'react';
import { RotateCw } from 'lucide-react';

export interface ScannedCertificatesPagesProps {
  certificates?: any[];
  theme?: any;
  onRotateCert?: (id: string) => void;
}

export function ScannedCertificatesPages({
  certificates = [],
  theme = {},
  onRotateCert
}: ScannedCertificatesPagesProps) {
  if (!Array.isArray(certificates) || certificates.length === 0) return null;

  const fontFamily = theme.fontFamily || 'Inter, sans-serif';
  const primaryColor = theme.primaryColor || '#00A8A0';

  return (
    <>
      {certificates.map((cert, index) => (
        <div
          key={cert.id || index}
          className="cv-page cv-cert-page relative bg-white flex flex-col justify-between p-8 border border-slate-200 shadow-2xl mb-8 overflow-hidden"
          style={{
            width: '794px',
            height: '1123px',
            fontFamily
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-3 border-slate-200 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
              <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
                ANEXO DE CERTIFICACIÓN COMPROBATORIA #{index + 1}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onRotateCert && cert.id && (
                <button
                  onClick={() => onRotateCert(cert.id)}
                  className="no-print px-2.5 py-1 rounded-lg bg-slate-900 text-white hover:bg-[#FF2E63] transition text-[11px] font-black flex items-center gap-1 shadow cursor-pointer"
                  title="Girar certificado 90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Girar 90°</span>
                </button>
              )}
              <span className="text-[10px] font-bold text-slate-400">DOCUMENTO OFICIAL A4</span>
            </div>
          </div>

          {/* Certificate Image Frame */}
          <div className="my-auto flex-1 flex items-center justify-center p-2 border-2 border-slate-100 rounded-xl bg-slate-50 overflow-hidden max-h-[920px]">
            {cert.imageUrl ? (
              <img
                src={cert.imageUrl}
                alt={cert.title || 'Certificado'}
                className="max-w-full max-h-full object-contain shadow-md rounded"
                style={{
                  transform: `rotate(${cert.rotation || 0}deg)`,
                  transition: 'transform 0.3s ease'
                }}
              />
            ) : (
              <div className="text-center text-slate-400 py-12">
                <p className="text-sm font-bold">Imagen de certificado no disponible</p>
              </div>
            )}
          </div>

          {/* Footer Title */}
          <div className="border-t pt-3 border-slate-200 text-center mt-4">
            <p className="text-xs font-black text-slate-900 uppercase">{cert.title || 'CERTIFICADO'}</p>
            {cert.institution && <p className="text-[11px] text-slate-500 font-medium">{cert.institution} ({cert.year || '2025'})</p>}
          </div>
        </div>
      ))}
    </>
  );
}
