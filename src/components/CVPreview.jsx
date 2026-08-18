import React from 'react';
import { 
  User, 
  GraduationCap, 
  Briefcase, 
  FileText, 
  BookOpen, 
  Laptop, 
  Leaf, 
  Award, 
  Phone, 
  Mail, 
  MapPin, 
  Globe,
  RotateCw,
  Calendar,
  Building2,
  Clock
} from 'lucide-react';

export default function CVPreview({ cvData, setCvData }) {
  const { 
    personalInfo = {}, 
    roles = [], 
    education = [], 
    profession = [], 
    experience = [],
    informatics = [], 
    ecology = {},
    coursesAndCertificates = [], 
    certificatesScanned = [], 
    signature = {}, 
    theme = {},
    certificateDisplay = { certsPerPage: 1 }
  } = cvData || {};

  // Helper to extract 4-digit year and sort items descending (2025 -> 2024 -> 2023...)
  const sortByYearDesc = (items) => {
    if (!Array.isArray(items)) return [];
    return [...items].sort((a, b) => {
      const yearA = parseInt((a.year || '').toString().match(/\d{4}/)?.[0] || '0', 10);
      const yearB = parseInt((b.year || '').toString().match(/\d{4}/)?.[0] || '0', 10);
      return yearB - yearA;
    });
  };

  const sortedCourses = sortByYearDesc(coursesAndCertificates);
  const sortedExperience = sortByYearDesc(experience);
  const sortedProfession = sortByYearDesc(profession);

  const EXP_PER_PAGE = 6;
  const COURSES_PER_PAGE = 6;
  const totalExpPages = Math.max(1, Math.ceil(sortedExperience.length / EXP_PER_PAGE));
  const totalCoursePages = Math.max(1, Math.ceil(sortedCourses.length / COURSES_PER_PAGE));

  // Rotate individual certificate (0° -> 90° -> 180° -> 270° -> 0°)
  const handleRotateCert = (certId) => {
    if (!setCvData) return;
    setCvData((prev) => ({
      ...prev,
      certificatesScanned: prev.certificatesScanned.map((c) => {
        if (c.id === certId) {
          const nextRot = ((c.rotation || 0) + 90) % 360;
          return { ...c, rotation: nextRot };
        }
        return c;
      })
    }));
  };

  // Toggle Certificates Per Page (1 or 2 per A4)
  const toggleCertsPerPage = (count) => {
    if (!setCvData) return;
    setCvData((prev) => ({
      ...prev,
      certificateDisplay: {
        ...prev.certificateDisplay,
        certsPerPage: count
      }
    }));
  };

  // Chunk certificates into groups of 1 or 2 per A4 page
  const certsPerPageCount = certificateDisplay?.certsPerPage || 1;
  const certPages = [];
  for (let i = 0; i < certificatesScanned.length; i += certsPerPageCount) {
    certPages.push(certificatesScanned.slice(i, i + certsPerPageCount));
  }

  // Dynamic Theme Styling
  const dynamicThemeStyle = {
    fontFamily: theme.fontFamily || 'Arial, sans-serif'
  };

  const showCover = cvData?.showCoverPage !== false;
  const startBodyPageNum = showCover ? 2 : 1;

  return (
    <div 
      className="w-full bg-slate-200 dark:bg-slate-950 p-4 md:p-8 flex flex-col items-center gap-8 print-wrapper"
      style={dynamicThemeStyle}
    >
      {/* Dynamic CSS Variables & Styles */}
      <style>{`
        :root {
          --primary-color: ${theme.primaryColor || '#ab5ba1'};
          --secondary-color: ${theme.secondaryColor || '#888888'};
          --accent-color: ${theme.accentColor || '#40a08e'};
          --text-color: ${theme.textColor || '#333333'};
          --bg-corridor: ${theme.bgCorridor || '#aa57a4'};
        }

        .a4-page-container {
          width: 210mm;
          min-height: 297mm;
          height: 297mm;
          background: white;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          page-break-after: always;
          break-after: page;
          margin-bottom: 2rem;
        }

        .perspective-corridor-cv {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, #d59fcf 0%, #f4e1f1 35%, #ffffff 50%, #ffffff 100%);
          clip-path: polygon(18% 0, 82% 0, 100% 100%, 0% 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }

          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .no-print {
            display: none !important;
          }

          .print-wrapper {
            padding: 0 !important;
            background: white !important;
          }

          .a4-page-container {
            box-shadow: none !important;
            margin: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            page-break-after: always !important;
            break-after: page !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .section-box-print {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* PAGE 1: PORTADA EDITORIAL DE ALTO IMPACTO (SI ESTÁ ACTIVADA) */}
      {/* ========================================================================= */}
      {showCover && (
        <div className="a4-page-container rounded-sm transition-all" style={{ backgroundColor: theme.primaryColor }}>
          <div className="perspective-corridor-cv">
            
            {/* Profile Photo */}
            <div 
              className="mt-12 w-44 h-56 border-4 flex flex-col items-center justify-center text-center p-2 shadow-2xl overflow-hidden transition-all duration-300 rounded-2xl"
              style={{ 
                borderColor: theme.accentColor || '#40a08e', 
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                boxShadow: `0 0 25px ${theme.accentColor || '#40a08e'}60`
              }}
            >
              {personalInfo.profilePhoto ? (
                <img src={personalInfo.profilePhoto} alt="Perfil" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="flex flex-col items-center text-white">
                  <User className="w-12 h-12 mb-2 stroke-[1.5]" style={{ stroke: theme.accentColor || '#ffffff' }} />
                  <span className="text-[11px] font-bold tracking-wider">[Foto de Perfil]</span>
                </div>
              )}
            </div>

            {/* Header Title */}
            <div className="mt-5 text-center space-y-1">
              <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-[10px] font-black uppercase text-white tracking-widest">
                PORTAFOLIO DOCENTE & PROFESIONAL
              </span>
              <h1 
                className="text-4xl font-black text-white tracking-wider uppercase drop-shadow-md text-center"
                style={{ fontFamily: 'Impact, Arial, sans-serif' }}
              >
                Curriculum Vitae
              </h1>
            </div>

            {/* Candidate Name & Featured Roles */}
            <div className="mt-6 w-5/6 text-center flex flex-col items-center flex-grow">
              <h2 
                className="text-2xl font-black italic mb-4 tracking-wide border-b-2 pb-2 border-white/20"
                style={{ color: theme.primaryColor, fontFamily: 'Georgia, serif' }}
              >
                {personalInfo.fullName}
              </h2>

              {/* Featured Roles Badges */}
              <div className="flex flex-wrap justify-center gap-1.5 max-w-lg">
                {roles.map((role, idx) => (
                  <span 
                    key={idx}
                    className="px-3 py-1 bg-slate-800/90 text-white rounded-lg text-[11px] font-extrabold shadow-sm border border-slate-700/60"
                  >
                    {role}
                  </span>
                ))}
              </div>

              {/* Profile Highlight Statement */}
              {personalInfo.quote && (
                <p className="mt-6 text-xs font-bold italic text-slate-700 max-w-md bg-white/40 p-3 rounded-xl backdrop-blur leading-relaxed">
                  {personalInfo.quote}
                </p>
              )}
            </div>

            {/* Bottom Identification Summary Badge */}
            <div className="absolute bottom-8 w-5/6 bg-slate-900/90 backdrop-blur text-white px-6 py-3 rounded-2xl flex items-center justify-between text-xs font-bold shadow-2xl border border-slate-800">
              <div>
                <p className="text-[10px] text-purple-300 font-extrabold uppercase">DNI: {personalInfo.dni} | CUIT: {personalInfo.cuit}</p>
                <p className="text-white text-[11px] font-extrabold">{personalInfo.cityProvince}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-purple-300 font-bold block">{personalInfo.initials} | AÑO {personalInfo.year}</span>
                <span className="text-[11px] text-teal-300 font-extrabold">DOCUMENTO OFICIAL A4</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 2: DATOS PERSONALES, FORMACIÓN Y PROFESIÓN */}
      {/* ========================================================================= */}
      <div className="a4-page-container grid grid-cols-3">
        {/* Left Sidebar */}
        <div className="col-span-1 text-white flex flex-col relative" style={{ backgroundColor: theme.primaryColor }}>
          <div className="p-4 flex justify-center" style={{ backgroundColor: theme.secondaryColor }}>
            <div 
              className="w-32 h-40 border-4 flex flex-col items-center justify-center text-center p-1 overflow-hidden shadow-md transition-all duration-300 rounded-lg" 
              style={{ 
                borderColor: theme.accentColor || '#40a08e',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                boxShadow: `0 0 12px ${theme.accentColor || '#40a08e'}40`
              }}
            >
              {personalInfo.profilePhoto ? (
                <img src={personalInfo.profilePhoto} alt="Perfil" className="w-full h-full object-cover rounded" />
              ) : (
                <User className="w-10 h-10 text-white/90" />
              )}
            </div>
          </div>

          <div className="p-4 space-y-5 flex-1 relative">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2.5 border-b border-white/30 pb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" style={{ color: theme.accentColor }} /> CONTACTO & REDES
              </h3>
              <ul className="space-y-2 text-[11px] font-bold leading-tight">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'white', color: theme.accentColor }}>
                    <Phone className="w-3 h-3" />
                  </span>
                  <span>{personalInfo.phone}</span>
                </li>
                <li className="flex items-center gap-2 break-all">
                  <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'white', color: theme.accentColor }}>
                    <Mail className="w-3 h-3" />
                  </span>
                  <span>{personalInfo.email}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'white', color: theme.accentColor }}>
                    <Globe className="w-3 h-3" />
                  </span>
                  <span>{personalInfo.facebook}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'white', color: theme.accentColor }}>
                    <MapPin className="w-3 h-3" />
                  </span>
                  <span>{personalInfo.address}</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2 border-b border-white/30 pb-1 flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5" style={{ color: theme.accentColor }} /> INFORMÁTICA & TICs
              </h3>
              <div className="text-[10px] space-y-2 font-medium opacity-90">
                {informatics.map((item, i) => (
                  <div key={i} className="border-l-2 border-white/40 pl-2">
                    <p className="font-bold">{item.institution}</p>
                    <p className="text-teal-200 font-semibold">{item.course}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2 border-b border-white/30 pb-1 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" style={{ color: theme.accentColor }} /> COMPETENCIAS CLAVE
              </h3>
              <div className="flex flex-wrap gap-1 text-[9px] font-bold">
                <span className="px-2 py-0.5 bg-white/20 rounded">Pedagogía Dialógica</span>
                <span className="px-2 py-0.5 bg-white/20 rounded">Comunidades de Aprendizaje</span>
                <span className="px-2 py-0.5 bg-white/20 rounded">Alfabetización Digital</span>
                <span className="px-2 py-0.5 bg-white/20 rounded">Educación Inclusiva</span>
                <span className="px-2 py-0.5 bg-white/20 rounded">Gestión Institucional</span>
              </div>
            </div>

            {/* Sidebar Footer */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-bold text-xs">
              <span>{personalInfo.initials}</span>
              <span className="text-2xl font-black">{startBodyPageNum}</span>
            </div>
          </div>
        </div>

        {/* Right Main Content */}
        <div className="col-span-2 p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                {personalInfo.surname} <span className="text-xl font-bold capitalize" style={{ color: theme.primaryColor }}>{personalInfo.givenNames}</span>
              </h1>
            </div>

            <p className="text-[11px] font-bold italic text-slate-700 text-center leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200 border-l-4" style={{ borderLeftColor: theme.primaryColor }}>
              {personalInfo.quote}
            </p>

            {/* Datos Personales */}
            <div className="section-box-print">
              <div className="text-white font-black text-xs uppercase px-4 py-2 flex items-center gap-2 -ml-6 pl-6 mb-2.5 shadow-sm rounded-r-lg" style={{ backgroundColor: theme.primaryColor }}>
                <User className="w-4 h-4" />
                <span>DATOS PERSONALES</span>
              </div>

              <div className="grid grid-cols-3 gap-y-1.5 text-[11px] font-medium bg-slate-50/90 p-3 rounded-xl border border-slate-200/80">
                <span className="font-bold text-right uppercase pr-2" style={{ color: theme.accentColor }}>DNI:</span>
                <span className="col-span-2 text-slate-900 font-extrabold">{personalInfo.dni}</span>

                <span className="font-bold text-right uppercase pr-2" style={{ color: theme.accentColor }}>CUIT:</span>
                <span className="col-span-2 text-slate-900 font-extrabold">{personalInfo.cuit}</span>

                <span className="font-bold text-right uppercase pr-2" style={{ color: theme.accentColor }}>FECHA NAC.:</span>
                <span className="col-span-2 text-slate-900 font-extrabold">{personalInfo.birthDate}</span>

                <span className="font-bold text-right uppercase pr-2" style={{ color: theme.accentColor }}>DOMICILIO:</span>
                <span className="col-span-2 text-slate-900 font-extrabold">{personalInfo.address}</span>

                <span className="font-bold text-right uppercase pr-2" style={{ color: theme.accentColor }}>CIUDAD:</span>
                <span className="col-span-2 text-slate-900 font-extrabold">{personalInfo.cityProvince}</span>
              </div>
            </div>

            {/* Formación Académica */}
            <div className="section-box-print">
              <div className="text-white font-black text-xs uppercase px-4 py-2 flex items-center gap-2 -ml-6 pl-6 mb-2.5 shadow-sm rounded-r-lg" style={{ backgroundColor: theme.primaryColor }}>
                <GraduationCap className="w-4 h-4" />
                <span>FORMACIÓN ACADÉMICA</span>
              </div>

              <div className="space-y-2">
                {education.map((edu, i) => (
                  <div key={i} className="bg-slate-50/90 border border-slate-200/80 p-3 rounded-xl space-y-1 border-l-4" style={{ borderLeftColor: theme.accentColor }}>
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black text-white whitespace-nowrap shadow-sm" style={{ backgroundColor: theme.primaryColor }}>
                        {edu.level}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black whitespace-nowrap" style={{ backgroundColor: 'rgba(64,160,142,0.12)', color: theme.accentColor }}>
                        AÑO {edu.year}
                      </span>
                    </div>
                    <h4 className="text-xs font-black text-slate-900 mt-1">{edu.degree}</h4>
                    <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" /> {edu.institution}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Profesión */}
            <div className="section-box-print">
              <div className="text-white font-black text-xs uppercase px-4 py-2 flex items-center gap-2 -ml-6 pl-6 mb-2.5 shadow-sm rounded-r-lg" style={{ backgroundColor: theme.primaryColor }}>
                <Briefcase className="w-4 h-4" />
                <span>PROFESIÓN & TITULACIONES ({sortedProfession.length})</span>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {sortedProfession.map((prof, i) => (
                  <div key={i} className="bg-slate-50/90 border border-slate-200/80 p-2.5 rounded-xl space-y-0.5 border-l-4" style={{ borderLeftColor: theme.primaryColor }}>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-900 leading-tight">{prof.degree}</h4>
                      <span className="px-2 py-0.5 rounded text-[9px] font-black text-white whitespace-nowrap ml-2 flex-shrink-0" style={{ backgroundColor: theme.primaryColor }}>
                        AÑO {prof.year}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold" style={{ color: theme.accentColor }}>{prof.institution}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGES TO N: EXPERIENCIA LABORAL DOCENTE (PAGINADA 6 POR HOJA) */}
      {/* ========================================================================= */}
      {Array.from({ length: totalExpPages }).map((_, expPageIdx) => {
        const pageNum = startBodyPageNum + 1 + expPageIdx;
        const expGroup = sortedExperience.slice(expPageIdx * EXP_PER_PAGE, (expPageIdx + 1) * EXP_PER_PAGE);

        return (
          <div key={`exp-${pageNum}`} className="a4-page-container grid grid-cols-3">
            {/* Left Sidebar */}
            <div className="col-span-1 text-white flex flex-col relative" style={{ backgroundColor: theme.primaryColor }}>
              <div className="p-5 text-center border-b border-white/20" style={{ backgroundColor: theme.secondaryColor }}>
                <span className="text-2xl font-black tracking-widest">{personalInfo.initials}</span>
                <p className="text-[10px] font-semibold tracking-wider uppercase opacity-80 mt-0.5">Trayectoria Docente</p>
              </div>

              <div className="p-4 space-y-5 flex-1 relative">
                {expPageIdx === 0 ? (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-3 border-b border-white/30 pb-1 flex items-center gap-1.5">
                      <Leaf className="w-3.5 h-3.5" style={{ color: theme.accentColor }} /> PROYECTOS & COMUNIDAD
                    </h3>

                    <div className="space-y-3 text-[10px]">
                      <div>
                        <p className="font-bold text-teal-200 uppercase mb-1">RURAL Y AGRICULTURA:</p>
                        {(ecology?.rural || []).map((r, rIdx) => (
                          <div key={rIdx} className="mb-2 border-l-2 border-white/30 pl-2">
                            <p className="font-bold text-white">{r.title}</p>
                            <p className="opacity-80 italic">{r.institution}</p>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-white/20">
                        <p className="font-bold text-teal-200 uppercase mb-1">MEDIO AMBIENTE:</p>
                        {(ecology?.environmental || []).map((env, eIdx) => (
                          <div key={eIdx} className="mb-2 border-l-2 border-white/30 pl-2">
                            <p className="font-bold text-white">{env.title}</p>
                            <p className="opacity-80 italic">{env.institution}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider mb-2 border-b border-white/30 pb-1 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5" style={{ color: theme.accentColor }} /> ÁREAS DE DESEMPEÑO
                      </h3>
                      <p className="text-[10px] leading-relaxed opacity-90 mb-3">
                        Registros {expPageIdx * EXP_PER_PAGE + 1} a {Math.min((expPageIdx + 1) * EXP_PER_PAGE, sortedExperience.length)} de {sortedExperience.length} de la trayectoria docente y gestión escolar.
                      </p>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-black uppercase text-teal-200 mb-1.5">PILARES PEDAGÓGICOS:</h4>
                      <ul className="text-[10px] space-y-1.5 font-semibold opacity-95">
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-300"></span>
                          <span>Gestión Documental & Archivo</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-300"></span>
                          <span>Mediación Lectora en Lengua</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-300"></span>
                          <span>Tutoría & Retención Rural</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-300"></span>
                          <span>Tertulias Dialógicas Literarias</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Sidebar Footer */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-bold text-xs">
                  <span>{personalInfo.initials}</span>
                  <span className="text-2xl font-black">{pageNum}</span>
                </div>
              </div>
            </div>

            {/* Right Main Content: Experiencia Laboral Docente */}
            <div className="col-span-2 p-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="border-b border-slate-200 pb-2">
                  <h1 className="text-xl font-black text-slate-900 uppercase">
                    {personalInfo.surname} <span style={{ color: theme.primaryColor }}>{personalInfo.givenNames}</span>
                  </h1>
                </div>

                <div className="text-white font-black text-xs uppercase px-4 py-2 flex items-center gap-2 -ml-6 pl-6 mb-3 shadow-sm rounded-r-lg" style={{ backgroundColor: theme.primaryColor }}>
                  <FileText className="w-4 h-4" />
                  <span>EXPERIENCIA LABORAL DOCENTE ({expPageIdx + 1}/{totalExpPages})</span>
                </div>

                <div className="space-y-2.5">
                  {expGroup.map((exp, idx) => (
                    <div key={idx} className="bg-slate-50/90 border border-slate-200/80 p-3 rounded-xl space-y-1 section-box-print shadow-sm border-l-4" style={{ borderLeftColor: theme.primaryColor }}>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-black text-slate-900 leading-snug">{exp.role}</h4>
                        <span 
                          className="px-2.5 py-0.5 rounded text-[10px] font-black text-white whitespace-nowrap shadow-sm flex-shrink-0 inline-flex items-center gap-1" 
                          style={{ backgroundColor: theme.primaryColor }}
                        >
                          <Calendar className="w-3 h-3" /> AÑO {exp.year}
                        </span>
                      </div>

                      <p className="text-[11px] font-bold flex items-center gap-1" style={{ color: theme.accentColor }}>
                        <Building2 className="w-3.5 h-3.5 flex-shrink-0" /> {exp.institution}
                      </p>
                      
                      {exp.details && (
                        <p className="text-[10px] text-slate-500 font-medium italic border-t border-slate-200/60 pt-1 mt-1">
                          {exp.details}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* ========================================================================= */}
      {/* PAGES TO N: CURSOS Y CAPACITACIONES DOCENTES (PAGINADAS 6 POR HOJA) */}
      {/* ========================================================================= */}
      {Array.from({ length: totalCoursePages }).map((_, pageIdx) => {
        const pageNum = startBodyPageNum + 1 + totalExpPages + pageIdx;
        const isLastPage = pageIdx === totalCoursePages - 1;
        const pageCoursesGroup = sortedCourses.slice(pageIdx * COURSES_PER_PAGE, (pageIdx + 1) * COURSES_PER_PAGE);

        return (
          <div key={`course-${pageNum}`} className="a4-page-container grid grid-cols-3">
            {/* Sidebar */}
            <div className="col-span-1 text-white flex flex-col relative" style={{ backgroundColor: theme.primaryColor }}>
              <div className="p-5 text-center border-b border-white/20" style={{ backgroundColor: theme.secondaryColor }}>
                <span className="text-2xl font-black tracking-widest">{personalInfo.initials}</span>
                <p className="text-[10px] font-semibold tracking-wider uppercase opacity-80 mt-0.5">Capacitación Continua</p>
              </div>

              <div className="p-4 space-y-4 flex-1 relative">
                <h3 className="text-xs font-bold uppercase tracking-wider border-b border-white/30 pb-1 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" style={{ color: theme.accentColor }} /> CERTIFICACIONES
                </h3>

                {pageIdx === 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] leading-relaxed opacity-90">
                      Formación pedagógica continua ordenada cronológicamente en instituciones educativas y plataformas de aprendizaje digital.
                    </p>
                    <div className="px-2.5 py-1.5 bg-white/20 rounded-lg text-[10px] font-extrabold text-white text-center border border-white/30">
                      Total: {sortedCourses.length} Certificaciones
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[10px] leading-relaxed opacity-90">
                      Registros {pageIdx * COURSES_PER_PAGE + 1} a {Math.min((pageIdx + 1) * COURSES_PER_PAGE, sortedCourses.length)} de {sortedCourses.length} certificaciones acreditadas.
                    </p>
                    
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-teal-200 mb-1.5">EJES TEMÁTICOS:</h4>
                      <div className="flex flex-wrap gap-1 text-[9px] font-bold">
                        <span className="px-2 py-0.5 bg-white/20 rounded">Educación Digital</span>
                        <span className="px-2 py-0.5 bg-white/20 rounded">Didáctica Lengua</span>
                        <span className="px-2 py-0.5 bg-white/20 rounded">ESI & Género</span>
                        <span className="px-2 py-0.5 bg-white/20 rounded">Gestión y Mediación</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sidebar Footer */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-bold text-xs">
                  <span>{personalInfo.initials}</span>
                  <span className="text-2xl font-black">{pageNum}</span>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="col-span-2 p-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="border-b border-slate-200 pb-2">
                  <h1 className="text-xl font-black text-slate-900 uppercase">
                    {personalInfo.surname} <span style={{ color: theme.primaryColor }}>{personalInfo.givenNames}</span>
                  </h1>
                </div>

                <div className="text-white font-black text-xs uppercase px-4 py-2 flex items-center gap-2 -ml-6 pl-6 mb-3 shadow-sm rounded-r-lg" style={{ backgroundColor: theme.primaryColor }}>
                  <BookOpen className="w-4 h-4" />
                  <span>CURSOS Y CAPACITACIONES DOCENTES ({pageIdx + 1}/{totalCoursePages})</span>
                </div>

                <div className="space-y-2.5">
                  {pageCoursesGroup.map((c, cIdx) => (
                    <div key={cIdx} className="bg-slate-50/90 border border-slate-200/80 p-3 rounded-xl space-y-1 section-box-print shadow-sm border-l-4" style={{ borderLeftColor: theme.accentColor }}>
                      <div className="flex items-center justify-between gap-2">
                        <span 
                          className="px-2.5 py-0.5 rounded text-[10px] font-black text-white whitespace-nowrap shadow-sm flex-shrink-0 inline-flex items-center gap-1" 
                          style={{ backgroundColor: theme.primaryColor }}
                        >
                          <Calendar className="w-3 h-3" /> AÑO {c.year}
                        </span>
                        
                        {c.hours && (
                          <span 
                            className="px-2.5 py-0.5 rounded text-[10px] font-black whitespace-nowrap flex-shrink-0 inline-flex items-center gap-1" 
                            style={{ backgroundColor: 'rgba(64,160,142,0.12)', color: theme.accentColor }}
                          >
                            <Clock className="w-3 h-3" /> {c.hours}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-black text-slate-900 leading-snug">{c.title}</h4>

                      <p className="text-[11px] font-bold flex items-center gap-1" style={{ color: theme.accentColor }}>
                        <Building2 className="w-3.5 h-3.5 flex-shrink-0" /> {c.institution}
                      </p>

                      {c.details && (
                        <p className="text-[10px] text-slate-500 font-medium italic border-t border-slate-200/60 pt-1 mt-1">
                          {c.details}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Digital Signature Block on Last Course Page */}
              {isLastPage && (
                <div className="mt-3 pt-2 border-t border-slate-300 flex flex-col items-end section-box-print">
                  <div className="w-56 text-center space-y-0.5">
                    {signature?.dataUrl ? (
                      <img src={signature.dataUrl} alt="Firma Digital" className="h-12 mx-auto object-contain mb-0.5" />
                    ) : (
                      <div className="h-9 border-b border-dashed border-slate-400 mb-0.5 flex items-center justify-center text-xs text-slate-400">
                        [Firma del Postulante]
                      </div>
                    )}
                    <p className="text-xs font-black text-slate-800">{signature?.signerName || personalInfo.fullName}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">{signature?.signerRole || 'Profesora de Educación Secundaria'}</p>
                    <p className="text-[10px] text-slate-400">{signature?.date || 'Salta, 2025'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* ========================================================================= */}
      {/* APPENDED CERTIFICATE PAGES */}
      {/* ========================================================================= */}
      {certPages.map((group, pageIdx) => (
        <div key={pageIdx} className="a4-page-container p-8 flex flex-col items-center justify-between border-8 border-purple-100">
          
          {/* Header Controls for Certificates (No Print) */}
          <div className="w-full flex items-center justify-between no-print bg-slate-100 dark:bg-slate-800 p-2 rounded-xl border border-slate-300 dark:border-slate-700 mb-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Distribución de Certificados en A4:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleCertsPerPage(1)}
                className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                  certsPerPageCount === 1 
                    ? 'bg-purple-600 text-white border-purple-600' 
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-200'
                }`}
              >
                1 por Hoja A4
              </button>
              <button
                onClick={() => toggleCertsPerPage(2)}
                className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                  certsPerPageCount === 2 
                    ? 'bg-purple-600 text-white border-purple-600' 
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-200'
                }`}
              >
                2 por Hoja A4
              </button>
            </div>
          </div>

          {/* Certificate Items Container */}
          <div className="flex-1 w-full flex flex-col items-center justify-around gap-4 overflow-hidden">
            {group.map((cert) => {
              const rotAngle = cert.rotation || 0;
              return (
                <div key={cert.id} className="w-full flex flex-col items-center justify-center flex-1 relative">
                  {/* Rotation button (No Print) */}
                  <div className="no-print absolute top-2 right-2 z-20">
                    <button
                      onClick={() => handleRotateCert(cert.id)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-bold rounded-lg backdrop-blur shadow transition"
                      title="Girar 90° para corregir orientación"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-amber-400" /> Girar 90° ({rotAngle}°)
                    </button>
                  </div>

                  <div className="w-full text-center mb-1">
                    <h3 className="text-sm font-black uppercase" style={{ color: theme.primaryColor }}>{cert.title}</h3>
                    <p className="text-[11px] font-bold text-slate-500">{cert.institution} • {cert.year}</p>
                  </div>

                  <div className="flex-1 w-full flex items-center justify-center overflow-hidden p-2">
                    <img 
                      src={cert.imageUrl} 
                      alt={cert.title} 
                      style={{ transform: `rotate(${rotAngle}deg)` }}
                      className="max-h-full max-w-full object-contain rounded-lg shadow border border-slate-300 transition-transform duration-300" 
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="w-full text-center border-t pt-2 border-slate-200 text-[10px] font-bold text-slate-400">
            {personalInfo.initials} | ANEXO CERTIFICADOS | CVPREMIUM 2025
          </div>
        </div>
      ))}

    </div>
  );
}
