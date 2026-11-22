import React, { useState, useEffect, useRef } from 'react';
import { Award, Upload, RotateCw, Loader2, CheckCircle2, FileText } from 'lucide-react';
import { Modal } from '../../../../shared/core/ui/Modal';
import { Field } from '../../../../shared/core/ui/Field';
import { button, radius } from '../../../../shared/core/uiDesignSystem';
import { ensurePdfjsWorkerConfigured } from '../../../../shared/core/pdf-engine/pdfjsWorkerSetup';
import { analyzePdfPage } from '../../../../shared/core/cv-import/pdfPageLayout';
import {
  clampCanvasSize,
  computeRenderScale,
  encodeCanvasWithinBudget,
  encodeImageFileWithinBudget,
  prepareOpaquePdfCanvas,
  MAX_PAGE_PAYLOAD_BYTES,
} from '../../../../shared/core/cv-import/pageImageEncoder';
import { apiClient } from '../../../../shared/core/utils/apiClient';

export type CertificateTargetSectionId = 'cursos' | 'formacion' | 'profesion' | 'idiomas' | 'informatica';

export interface ExtractedCertificatePayload {
  targetSectionId: CertificateTargetSectionId;
  record: {
    id: string;
    tituloOGrado: string;
    institucion: string;
    periodo: string;
    cargaHoraria: string;
    modalidad: string;
    resolucion: string;
    tomoFolio: string;
    matricula: string;
    url: string;
    descripcion: string;
  };
  attachAsScanned: boolean;
  certificateImageDataUrl: string | null;
  rotation: number;
}

interface ImportCertificateAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmCertificate: (result: ExtractedCertificatePayload, addAnother?: boolean) => void;
}

const SECTION_TARGETS: Array<{ id: CertificateTargetSectionId; label: string }> = [
  { id: 'cursos', label: 'Cursos y Capacitaciones' },
  { id: 'formacion', label: 'Formación Académica' },
  { id: 'profesion', label: 'Títulos Profesionales' },
  { id: 'idiomas', label: 'Idiomas' },
  { id: 'informatica', label: 'Informática y TICs' },
];

export default function ImportCertificateAiModal({
  isOpen,
  onClose,
  onConfirmCertificate,
}: ImportCertificateAiModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'pick' | 'analyzing' | 'review'>('pick');
  const [errorMsg, setErrorMsg] = useState('');
  const [fileName, setFileName] = useState('');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [targetSectionId, setTargetSectionId] = useState<CertificateTargetSectionId>('cursos');
  const [attachAsScanned, setAttachAsScanned] = useState(true);

  const [tituloOGrado, setTituloOGrado] = useState('');
  const [institucion, setInstitucion] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [cargaHoraria, setCargaHoraria] = useState('');
  const [modalidad, setModalidad] = useState('');
  const [resolucion, setResolucion] = useState('');
  const [tomoFolio, setTomoFolio] = useState('');
  const [matricula, setMatricula] = useState('');
  const [url, setUrl] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const resetState = () => {
    setStep('pick');
    setErrorMsg('');
    setFileName('');
    setPreviewDataUrl(null);
    setRotation(0);
    setTargetSectionId('cursos');
    setAttachAsScanned(true);
    setTituloOGrado('');
    setInstitucion('');
    setPeriodo('');
    setCargaHoraria('');
    setModalidad('');
    setResolucion('');
    setTomoFolio('');
    setMatricula('');
    setUrl('');
    setDescripcion('');
  };

  useEffect(() => {
    if (isOpen) resetState();
  }, [isOpen]);

  const handleAnalyzeFile = async (file: File) => {
    setFileName(file.name);
    setErrorMsg('');
    setStep('analyzing');

    try {
      let base64 = '';
      let mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/webp';
      let auxiliaryText = '';

      if (file.type.startsWith('image/')) {
        const encoded = await encodeImageFileWithinBudget(file);
        base64 = encoded.base64;
        mimeType = encoded.mimeType;
      } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const buffer = await file.arrayBuffer();
        const pdfjsLib = ensurePdfjsWorkerConfigured();
        const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
        const page = await pdfDoc.getPage(1);
        const textContent = await page.getTextContent();
        const baseViewport = page.getViewport({ scale: 1 });
        const analysis = analyzePdfPage(textContent.items as any, baseViewport.width, baseViewport.height);
        auxiliaryText = analysis.text || '';

        const scale = computeRenderScale(baseViewport.width, baseViewport.height);
        const viewport = page.getViewport({ scale });
        const { canvas, ctx } = prepareOpaquePdfCanvas(viewport.width, viewport.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        const encoded = encodeCanvasWithinBudget(clampCanvasSize(canvas), MAX_PAGE_PAYLOAD_BYTES, { digitalPage: true });
        canvas.width = 0;
        canvas.height = 0;
        base64 = encoded.base64;
        mimeType = encoded.mimeType;
      } else {
        throw new Error('Formato no compatible. Subí una imagen (JPG, PNG, WebP) o un PDF del certificado.');
      }

      const dataUrl = `data:${mimeType};base64,${base64}`;
      setPreviewDataUrl(dataUrl);
      setAttachAsScanned(true);

      const response = await apiClient.post<{ certificate?: any }>(
        '/api/cv-import-api?action=extract-certificate',
        {
          kind: 'image',
          content: base64,
          mimeType,
          auxiliaryText,
        },
        { requiresAuth: false },
      );

      if (!response.ok || !response.data?.certificate) {
        throw new Error(response.error || 'No se pudieron leer los datos del certificado.');
      }

      const cert = response.data.certificate;
      const validSections: CertificateTargetSectionId[] = ['cursos', 'formacion', 'profesion', 'idiomas', 'informatica'];
      const suggested = validSections.includes(cert.suggestedSection) ? cert.suggestedSection : 'cursos';

      setTargetSectionId(suggested);
      setTituloOGrado(String(cert.tituloOGrado || '').trim());
      setInstitucion(String(cert.institucion || '').trim());
      setPeriodo(String(cert.periodo || '').trim());
      setCargaHoraria(String(cert.cargaHoraria || '').trim());
      setModalidad(String(cert.modalidad || '').trim());
      setResolucion(String(cert.resolucion || '').trim());
      setTomoFolio(String(cert.tomoFolio || '').trim());
      setMatricula(String(cert.matricula || '').trim());
      setUrl(String(cert.url || '').trim());
      setDescripcion(String(cert.descripcion || '').trim());
      setStep('review');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Ocurrió un inconveniente al analizar el certificado.');
      setStep('pick');
    }
  };

  const handleConfirm = (addAnother: boolean) => {
    if (!tituloOGrado.trim() && !institucion.trim()) {
      setErrorMsg('Completá al menos el nombre del certificado o la institución emisora.');
      return;
    }

    onConfirmCertificate(
      {
        targetSectionId,
        record: {
          id: `rec_cert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          tituloOGrado: tituloOGrado.trim() || 'Certificado',
          institucion: institucion.trim(),
          periodo: periodo.trim(),
          cargaHoraria: cargaHoraria.trim(),
          modalidad: modalidad.trim(),
          resolucion: resolucion.trim(),
          tomoFolio: tomoFolio.trim(),
          matricula: matricula.trim(),
          url: url.trim(),
          descripcion: descripcion.trim(),
        },
        attachAsScanned: Boolean(attachAsScanned && previewDataUrl),
        certificateImageDataUrl: previewDataUrl,
        rotation,
      },
      addAnother,
    );

    if (addAnother) {
      resetState();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Agregar certificados con IA"
      helpText="Subí la foto o PDF de un diploma, constancia o certificado. La IA extrae los datos oficiales (curso, institución, fecha, horas y resolución) y te pregunta si querés adjuntar la imagen."
      icon={<Award className="w-5 h-5 text-[var(--color-accent-text)]" />}
      size="lg"
      footer={
        step === 'review' ? (
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={resetState} className={`${button.ghost} text-xs px-3 py-1.5`}>
              Elegir otro archivo
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleConfirm(true)}
                className={`${button.secondary} text-xs px-3 py-1.5`}
              >
                Guardar y sumar otro
              </button>
              <button
                type="button"
                onClick={() => handleConfirm(false)}
                className={`${button.primary} text-xs px-4 py-1.5 flex items-center gap-1.5`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Guardar en mi CV
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-end">
            <button type="button" onClick={onClose} className={`${button.secondary} text-xs px-4 py-1.5`}>
              Cancelar
            </button>
          </div>
        )
      }
    >
      <div className="space-y-4 text-sm text-[var(--ui-text-primary)]">
        {errorMsg && (
          <div className="p-3 rounded-[var(--ui-radius-card)] border border-[var(--color-status-danger-base)] bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)] text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {step === 'pick' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-10 px-4 rounded-[16px] border-2 border-dashed border-[var(--color-accent-base)]/60 bg-[var(--ui-bg-panel)] hover:bg-[var(--color-accent-muted)] transition flex flex-col items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-7 h-7 text-[var(--color-accent-text)]" />
              <span className="font-bold text-xs uppercase tracking-wider text-[var(--color-accent-text)]">
                Seleccionar foto o PDF del certificado
              </span>
              <span className="text-[11px] text-[var(--ui-text-secondary)]">
                JPG, PNG, WebP o PDF (página 1)
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                e.currentTarget.value = '';
                if (picked) void handleAnalyzeFile(picked);
              }}
            />
          </div>
        )}

        {step === 'analyzing' && (
          <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-accent-text)]" />
            <div className="space-y-1">
              <p className="font-bold text-sm">Analizando certificado{fileName ? `: ${fileName}` : ''}…</p>
              <p className="text-xs text-[var(--ui-text-secondary)]">
                Leyendo institución, título, fecha, carga horaria y resoluciones.
              </p>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {previewDataUrl && (
              <div className="flex items-center gap-4 p-3 rounded-[var(--ui-radius-card)] border border-[var(--ui-border)] bg-[var(--ui-bg-panel)]">
                <img
                  src={previewDataUrl}
                  alt="Vista previa del certificado"
                  style={{ transform: `rotate(${rotation}deg)` }}
                  className="w-20 h-20 object-cover rounded border border-[var(--ui-border)] shrink-0 bg-[var(--ui-bg-card)]"
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold flex items-center gap-1.5 truncate">
                      <FileText className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />
                      {fileName || 'Certificado cargado'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className={`${button.secondary} text-[11px] px-2 py-1 flex items-center gap-1`}
                    >
                      <RotateCw className="w-3 h-3" />
                      Girar
                    </button>
                  </div>

                  <label className="flex items-start gap-2 text-xs cursor-pointer p-2 rounded border border-[var(--color-accent-base)]/40 bg-[var(--color-accent-muted)]/30">
                    <input
                      type="checkbox"
                      checked={attachAsScanned}
                      onChange={(e) => setAttachAsScanned(e.target.checked)}
                      className="mt-0.5 rounded"
                    />
                    <span className="leading-snug">
                      <strong>¿Deseás guardar el certificado como adjunto</strong> para que también aparezca en la sección <strong>Certificados</strong> del CV?
                    </span>
                  </label>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold mb-1">Guardar registro extraído en la sección</label>
              <select
                value={targetSectionId}
                onChange={(e) => setTargetSectionId(e.target.value as CertificateTargetSectionId)}
                className="w-full rounded-[var(--ui-radius-control)] border border-[var(--ui-border)] bg-[var(--ui-bg-input)] text-[var(--ui-text-primary)] px-3 py-2 text-xs font-semibold"
              >
                {SECTION_TARGETS.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Nombre del curso / certificado / título"
                value={tituloOGrado}
                onChange={(e: any) => setTituloOGrado(e.target.value)}
              />
              <Field
                label="Institución / Ente emisor"
                value={institucion}
                onChange={(e: any) => setInstitucion(e.target.value)}
              />
              <Field
                label="Año o fecha"
                value={periodo}
                onChange={(e: any) => setPeriodo(e.target.value)}
              />
              <Field
                label="Carga horaria (opcional)"
                value={cargaHoraria}
                onChange={(e: any) => setCargaHoraria(e.target.value)}
              />
              <Field
                label="Modalidad (opcional)"
                value={modalidad}
                onChange={(e: any) => setModalidad(e.target.value)}
              />
              <Field
                label="Resolución / Registro (opcional)"
                value={resolucion}
                onChange={(e: any) => setResolucion(e.target.value)}
              />
            </div>

            <Field
              as="textarea"
              rows={2}
              label="Descripción / detalles"
              value={descripcion}
              onChange={(e: any) => setDescripcion(e.target.value)}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
