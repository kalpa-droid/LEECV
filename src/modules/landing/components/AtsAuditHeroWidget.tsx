import React, { useState, useCallback, useRef } from 'react';
import { isTextLayerCoherent } from '../../../shared/core/cv-import/textCoherenceHeuristic';
import { ensurePdfjsWorkerConfigured } from '../../../shared/core/pdf-engine/pdfjsWorkerSetup';

export default function AtsAuditHeroWidget() {
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'done'>('idle');
  const [score, setScore] = useState(0);
  const [findings, setFindings] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setStatus('analyzing');
    setFindings([]);

    try {
      const pdfjsLib = ensurePdfjsWorkerConfigured();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

      let rawText = '';
      for (let i = 1; i <= Math.min(pdf.numPages, 2); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        rawText += content.items.map((item: any) => item.str).join(' ') + ' ';
      }

      const coherent = isTextLayerCoherent(rawText);
      let s = 0;
      const findingsLocal: string[] = [];

      if (!coherent || rawText.trim().length < 20) {
        s = 25;
        findingsLocal.push('Capa de texto fragmentada o aplanada (típica de Canva/escaneos). Corregí con LeeCV.');
      } else {
        s = 60;
        findingsLocal.push('Texto estructurado y legible detectado.');

        if (/email|tel[eé]fono|phone/i.test(rawText)) { s += 15; }
        if (/experiencia|experience/i.test(rawText)) { s += 15; }
        if (/educacion|education/i.test(rawText)) { s += 15; }
      }

      if (s > 85) findingsLocal.push('Listo para enviar a sistemas ATS.');
      else if (s > 60) findingsLocal.push('Buen candidato; revisá secciones faltantes.');

      setScore(Math.min(100, s));
      setFindings(findingsLocal);
      setStatus('done');
    } catch {
      setScore(0);
      setFindings(['No se pudo leer la capa de texto del archivo.']);
      setStatus('done');
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
      handleFile(file);
    }
  }, [handleFile]);

  const onInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="w-full max-w-xl mx-auto p-6 rounded-2xl bg-[var(--ui-bg-card)] border border-[var(--ui-border)] shadow-lg">
      <h3 className="text-xl font-bold text-[var(--ui-text-primary)] mb-2">Auditor ATS en vivo</h3>
      <p className="text-sm text-[var(--ui-text-secondary)] mb-4">Subí tu PDF y sabé si pasás los filtros automáticos.</p>

      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-[var(--ui-border)] rounded-xl p-6 text-center hover:border-[var(--color-accent-base)] transition-colors"
      >
        <input type="file" accept=".pdf,application/pdf" className="hidden" id="ats-file" onChange={onInput} />
        <label htmlFor="ats-file" className="cursor-pointer block text-sm font-medium text-[var(--ui-text-primary)]">
          {status === 'idle' ? 'Arrastrá tu CV o imagen' : fileName}
        </label>
        {status === 'analyzing' && <p className="text-xs text-[var(--ui-text-secondary)] mt-2">Analizando capa de texto...</p>}
      </div>

      {status === 'done' && (
        <div className="mt-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-full h-4 bg-[var(--ui-bg-base)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--color-accent-base)] transition-all" style={{ width: `${score}%` }} />
            </div>
            <span className="text-sm font-bold text-[var(--ui-text-primary)] min-w-[3ch]">{score}</span>
          </div>
          <ul className="text-sm space-y-1 text-[var(--ui-text-secondary)]">
            {findings.map((f, i) => <li key={i}>• {f}</li>)}
          </ul>
          <a href="/crear-cv" className="inline-block mt-3 px-4 py-2 rounded-lg bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] text-sm font-bold hover:opacity-90">Corregir y optimizar con LeeCV</a>
        </div>
      )}
    </div>
  );
}
