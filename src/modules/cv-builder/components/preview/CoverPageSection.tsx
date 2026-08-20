import React from 'react';

export function CoverPageSection({ cvData, totalPagesCalculated = 1 }) {
  const p = cvData?.personalInfo || {};
  const theme = cvData?.theme || {};
  const primaryColor = theme.primaryColor || '#00A8A0';
  const fontFamily = theme.fontFamily || 'Inter, sans-serif';

  return (
    <div 
      className="cv-page cv-cover-page relative bg-white flex flex-col justify-between p-12 overflow-hidden border border-slate-200 shadow-2xl mb-8"
      style={{
        width: '794px',
        height: '1123px',
        fontFamily
      }}
    >
      {/* Decorative Corridor */}
      <div 
        className="absolute top-0 right-0 w-32 h-full opacity-10 pointer-events-none"
        style={{ backgroundColor: primaryColor }}
      />

      {/* Top Badge */}
      <div className="flex items-center justify-between border-b-2 pb-4 border-slate-200 z-10">
        <div className="flex items-center gap-2">
          <span 
            className="w-3 h-3 rounded-full inline-block"
            style={{ backgroundColor: primaryColor }}
          />
          <span className="text-xs font-black tracking-widest uppercase text-slate-700">
            PORTAFOLIO PROFESIONAL
          </span>
        </div>

        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          DOCUMENTO OFICIAL - {totalPagesCalculated} {totalPagesCalculated === 1 ? 'HOJA' : 'HOJAS'}
        </span>
      </div>

      {/* Main Cover Title & Profile */}
      <div className="my-auto space-y-8 z-10">
        {p.photoUrl && (
          <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-slate-100 shadow-xl mx-auto md:mx-0">
            <img src={p.photoUrl} alt={p.fullName} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="space-y-3">
          <h1 
            className="text-4xl font-black tracking-tight text-slate-900 uppercase leading-none"
            style={{ fontFamily }}
          >
            {p.fullName || 'NOMBRE Y APELLIDO'}
          </h1>

          <p 
            className="text-xl font-bold uppercase tracking-wider"
            style={{ color: primaryColor }}
          >
            {p.title || 'POSTULANTE'}
          </p>
        </div>

        {/* Dynamic Roles Summary Badge List */}
        {Array.isArray(cvData?.roles) && cvData.roles.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {cvData.roles.filter(Boolean).map((role, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full text-xs font-black uppercase border shadow-sm"
                style={{
                  borderColor: primaryColor,
                  color: primaryColor,
                  backgroundColor: `${primaryColor}10`
                }}
              >
                {role}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Details */}
      <div className="border-t-2 pt-6 border-slate-200 flex items-end justify-between text-xs text-slate-600 font-medium z-10">
        <div className="space-y-1">
          {p.location && <p className="font-bold">📍 {p.location}</p>}
          {p.email && <p>✉️ {p.email}</p>}
          {p.phone && <p>📞 {p.phone}</p>}
        </div>

        <div className="text-right">
          <p className="text-[10px] uppercase font-bold text-slate-400">FECHA DE EMISIÓN</p>
          <p className="font-bold text-slate-800">
            {new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
}
