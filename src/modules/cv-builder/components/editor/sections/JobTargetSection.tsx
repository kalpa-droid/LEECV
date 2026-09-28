import React, { useState, useEffect } from 'react';
import { Briefcase, Target, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { Field } from '../../../../../shared/core/ui/Field';
import { radius } from '../../../../../shared/core/uiDesignSystem';

// --- UTILIDAD DE EXTRACCIÓN (Local, sin IA) ---
function extractKeywords(text: string) {
  if (!text) return [];
  // Normalizar acentos y pasar a minúsculas
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  
  // Palabras comunes a ignorar (stopwords)
  const stopwords = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'pero', 'si', 'no', 'en', 'para', 'con', 'por', 'de', 'del', 'al', 'a', 'su', 'sus', 'te', 'se', 'lo', 'que', 'como', 'mas', 'muy', 'este', 'esta', 'estos', 'estas', 'es', 'son', 'ser', 'estar', 'tiene', 'tienen', 'hacer', 'años', 'experiencia', 'busqueda', 'buscamos', 'importante', 'empresa', 'zona', 'lunes', 'viernes', 'horario', 'sueldo', 'remuneracion', 'puesto', 'cargo', 'requisitos', 'excluyente', 'deseable', 'secundario', 'completo']);
  
  // Extraer palabras que parecen herramientas, skills, o títulos (alfanuméricas, más de 3 letras)
  const words = normalized.match(/\b[a-z0-9#+]{3,}\b/g) || [];
  
  const freq: Record<string, number> = {};
  for (const w of words) {
    if (!stopwords.has(w) && !/^\d+$/.test(w)) { // Ignorar números solos
      freq[w] = (freq[w] || 0) + 1;
    }
  }
  
  // Ordenar por frecuencia y quedarnos con las 15 más repetidas/relevantes
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(e => e[0]);
}

// --- UTILIDAD DE BÚSQUEDA EN CV ---
function checkKeywordInCV(keyword: string, cvData: any): boolean {
  const cvText = JSON.stringify(cvData).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return cvText.includes(keyword);
}

export const JobTargetSection = ({ cvData, setCvData }: any) => {
  const jobTarget = cvData.jobTarget || {};
  
  const [extractedKeywords, setExtractedKeywords] = useState<{word: string, found: boolean}[]>([]);

  useEffect(() => {
    if (jobTarget.jobDescription) {
      const keywords = extractKeywords(jobTarget.jobDescription);
      const matched = keywords.map(kw => ({
        word: kw,
        found: checkKeywordInCV(kw, cvData)
      }));
      setExtractedKeywords(matched);
    } else {
      setExtractedKeywords([]);
    }
  }, [jobTarget.jobDescription, cvData]);

  const updateField = (field: string, val: string) => {
    setCvData((prev: any) => ({
      ...prev,
      jobTarget: {
        ...(prev.jobTarget || {}),
        [field]: val
      }
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-neutral-border)]">
        <Target className="w-5 h-5 text-[var(--color-primary-base)]" />
        <h2 className="text-lg font-semibold text-[var(--color-neutral-text-primary)]">Vacante Objetivo</h2>
      </div>

      <div className={`p-4 bg-[var(--color-primary-muted)] border border-[var(--color-primary-base)]/30 rounded-[${radius.card}] text-sm text-[var(--color-primary-text)] leading-relaxed space-y-2`}>
        <p>
          <strong>Alineá tu CV con una oferta real.</strong> Pegá el texto del aviso de trabajo acá. El sistema extraerá localmente las palabras clave más importantes (sin enviar datos a IA) y las comparará con tu CV para ver qué te falta.
        </p>
      </div>

      <div className="space-y-4">
        <Field
          label="Cargo / Puesto"
          value={jobTarget.jobTitle || ''}
          onChange={(e: any) => updateField('jobTitle', e.target.value)}
          placeholder="Ej: Desarrollador Frontend Semi Senior"
        />
        <Field
          label="Empresa"
          value={jobTarget.companyName || ''}
          onChange={(e: any) => updateField('companyName', e.target.value)}
          placeholder="Ej: Mercado Libre"
        />
        <div>
          <label className="block text-sm font-semibold mb-1">Descripción del Aviso (Pegar texto completo)</label>
          <textarea
            value={jobTarget.jobDescription || ''}
            onChange={(e) => updateField('jobDescription', e.target.value)}
            placeholder="Pegá acá todo el texto del aviso (requisitos, tareas, beneficios...)"
            rows={6}
            className={`w-full bg-[var(--ui-bg-input)] border border-[var(--ui-border)] rounded-[${radius.control}] p-2.5 text-sm focus:outline-none focus:border-[var(--color-primary-base)] resize-y min-h-[120px]`}
          />
        </div>
      </div>

      {extractedKeywords.length > 0 && (
        <div className="space-y-3 mt-6 pt-4 border-t border-[var(--color-neutral-border)]">
          <h3 className="text-md font-semibold text-[var(--color-neutral-text-primary)]">Palabras Clave Extraídas</h3>
          <p className="text-xs text-[var(--color-neutral-text-secondary)] mb-2">
            El sistema detectó estos términos frecuentes. Tratá de incluirlos en tu CV <strong>sólo si tenés la experiencia real</strong>.
          </p>
          
          <div className="flex flex-wrap gap-2">
            {extractedKeywords.map((kw, i) => (
              <div 
                key={i} 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                  kw.found 
                    ? 'bg-[var(--color-success-muted)] text-[var(--color-success-text)] border-[var(--color-success-base)]/50' 
                    : 'bg-[var(--color-danger-muted)] text-[var(--color-danger-text)] border-[var(--color-danger-base)]/50'
                }`}
              >
                {kw.found ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {kw.word}
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-[var(--ui-bg-page)] rounded text-xs text-[var(--color-neutral-text-secondary)] border border-dashed border-[var(--color-neutral-border)]">
            <strong>¿Dónde agregar las faltantes?</strong> 
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>Si es una herramienta técnica → <em>Habilidades Técnicas / Informática</em></li>
              <li>Si es un verbo de acción o tarea → <em>Viñetas de Experiencia</em></li>
              <li>Si es un concepto general → <em>Resumen Profesional / Objetivo</em></li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
