import React from 'react';
import { User, Camera, Plus, Trash2 } from 'lucide-react';
import { useCVContext } from '../../../../context/CVContext';
import { useConfirm } from '../../../../shared/core/ui/ConfirmDialog';
import { useToast } from '../../../../shared/core/ui/Toast';

export default function PersonalInfoSection({ onOpenPhotoCropper, registeredItems = [] }) {
  const { cvData, setCvData, updatePersonalInfo, toggleSectionVisibility } = useCVContext();
  const { confirm } = useConfirm();
  const { showWarning } = useToast();

  if (!cvData) return null;

  const isVisible = cvData.sectionVisibility?.personales !== false;

  const updateRoles = (index, value) => {
    setCvData((prev) => {
      const newRoles = [...(prev.roles || [])];
      newRoles[index] = value;
      return { ...prev, roles: newRoles };
    });
  };

  const addRole = () => {
    setCvData((prev) => ({
      ...prev,
      roles: [...(prev.roles || []), ""]
    }));
  };

  const removeRole = (index) => {
    const roleName = cvData.roles?.[index] || `Rol #${index + 1}`;
    confirm({
      title: '¿Eliminar título / rol?',
      message: `¿Estás seguro de que deseas eliminar "${roleName}"?`,
      confirmText: 'Eliminar',
      onConfirm: () => {
        setCvData((prev) => ({
          ...prev,
          roles: (prev.roles || []).filter((_, i) => i !== index)
        }));
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Compact Section Header Toggle */}
      <div className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
        isVisible 
          ? 'bg-white border-[#EFE2C9] text-[#2B1B2E] shadow-sm' 
          : 'bg-slate-200 border-slate-300 text-slate-500 opacity-75'
      }`}>
        <span className="text-xs font-black uppercase tracking-wide">
          Datos Personales & Foto
        </span>
        <button
          type="button"
          onClick={() => toggleSectionVisibility('personales')}
          className={`px-3 py-1 rounded-full text-xs font-black transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
            isVisible
              ? 'bg-[#00A8A0] text-white hover:bg-[#00877F]'
              : 'bg-slate-400 text-white hover:bg-slate-500'
          }`}
        >
          <span>{isVisible ? 'ACTIVADA' : 'DESACTIVADA'}</span>
        </button>
      </div>

      {isVisible && (
        <>
          <h3 className="text-xs font-extrabold uppercase text-[#FF2E63] border-b pb-2 border-[#EFE2C9]">
            Información de Identificación y Contacto
          </h3>

      {/* Profile Photo Quick Trigger */}
      <div className="flex items-center gap-4 bg-purple-50 p-3.5 rounded-xl border border-purple-200">
        <div className="w-14 h-18 rounded-lg overflow-hidden bg-[#EFE2C9] flex items-center justify-center border border-purple-400">
          {cvData.personalInfo?.profilePhoto ? (
            <img src={cvData.personalInfo.profilePhoto} alt="Perfil" className="w-full h-full object-cover" />
          ) : (
            <User className="w-6 h-6 text-purple-400" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-[#2B1B2E]">Foto de Perfil</p>
          <p className="text-[11px] text-[#2B1B2E] font-medium mb-2">Se muestra únicamente en la portada y en la hoja 1.</p>
          <button
            onClick={onOpenPhotoCropper}
            className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            <Camera className="w-3 h-3" /> Cortar / Cambiar Foto
          </button>
        </div>
      </div>

      {/* Abreviaturas / Título Honorífico */}
      <div>
        <label className="block text-xs font-bold text-[#FF2E63] mb-1">
          Abreviaturas / Título (ej: Lic. / Prof. / Dr. / MP)
        </label>
        <input 
          type="text"
          value={cvData.personalInfo?.titlePrefix || ''}
          onChange={(e) => {
            const prefix = e.target.value;
            const given = cvData.personalInfo?.givenNames || '';
            const sur = cvData.personalInfo?.surname || '';
            const computed = `${prefix ? prefix + ' ' : ''}${given} ${sur}`.trim();
            updatePersonalInfo('titlePrefix', prefix);
            updatePersonalInfo('fullName', computed);
          }}
          placeholder="Ej: Lic. / Prof. / Dr. / Ing. / MP 1402"
          className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-[#FF2E63] mb-1">
          Frase de Presentación / Perfil Profesional (Aparece en Encabezado y Portada)
        </label>
        <textarea 
          rows={3}
          value={cvData.personalInfo?.quote || ''}
          onChange={(e) => updatePersonalInfo('quote', e.target.value)}
          placeholder="Ej: Mi experiencia personal y profesional me permite desarrollar eficientemente..."
          className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-[#FF2E63] mb-1">
          Iniciales de Sello / Monograma de Portada (ej: MB)
        </label>
        <input 
          type="text"
          maxLength={4}
          value={cvData.personalInfo?.initials || ''}
          onChange={(e) => updatePersonalInfo('initials', e.target.value.toUpperCase())}
          placeholder="Ej: MB"
          className="w-28 text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] font-black uppercase outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-[#2B1B2E] mb-1">
            Apellidos (Encabezado)
          </label>
          <input 
            type="text"
            value={cvData.personalInfo?.surname || ''}
            onChange={(e) => {
              const sur = e.target.value;
              const prefix = cvData.personalInfo?.titlePrefix || '';
              const given = cvData.personalInfo?.givenNames || '';
              const computed = `${prefix ? prefix + ' ' : ''}${given} ${sur}`.trim();
              updatePersonalInfo('surname', sur);
              updatePersonalInfo('fullName', computed);
            }}
            placeholder="Ej: BURGOS"
            className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#2B1B2E] mb-1">
            Nombres Completos
          </label>
          <input 
            type="text"
            value={cvData.personalInfo?.givenNames || ''}
            onChange={(e) => {
              const given = e.target.value;
              const prefix = cvData.personalInfo?.titlePrefix || '';
              const sur = cvData.personalInfo?.surname || '';
              const computed = `${prefix ? prefix + ' ' : ''}${given} ${sur}`.trim();
              updatePersonalInfo('givenNames', given);
              updatePersonalInfo('fullName', computed);
            }}
            placeholder="Ej: Mónica Daniela"
            className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-[#2B1B2E] mb-1">
            DNI
          </label>
          <input 
            type="text"
            value={cvData.personalInfo?.dni || ''}
            onChange={(e) => updatePersonalInfo('dni', e.target.value)}
            placeholder="Ej: 29334206"
            className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#2B1B2E] mb-1">
            CUIT / CUIL
          </label>
          <input 
            type="text"
            value={cvData.personalInfo?.cuit || ''}
            onChange={(e) => updatePersonalInfo('cuit', e.target.value)}
            placeholder="Ej: 27-29334206-2"
            className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-[#2B1B2E] mb-1">
          Fecha de Nacimiento
        </label>
        <input 
          type="text"
          value={cvData.personalInfo?.birthDate || ''}
          onChange={(e) => updatePersonalInfo('birthDate', e.target.value)}
          placeholder="Ej: 4 de febrero de 1982"
          className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-[#2B1B2E] mb-1">
          Domicilio y Barrio
        </label>
        <input 
          type="text"
          value={cvData.personalInfo?.address || ''}
          onChange={(e) => updatePersonalInfo('address', e.target.value)}
          placeholder="Ej: Manzana 751A Casa 11 - Ciudad Valdivia"
          className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-[#2B1B2E] mb-1">
          Teléfono Celular / WhatsApp
        </label>
        <input 
          type="text"
          value={cvData.personalInfo?.phone || ''}
          onChange={(e) => updatePersonalInfo('phone', e.target.value)}
          placeholder="Ej: 387-155121515"
          className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-[#2B1B2E] mb-1">
          Correo Electrónico
        </label>
        <input 
          type="text"
          value={cvData.personalInfo?.email || ''}
          onChange={(e) => updatePersonalInfo('email', e.target.value)}
          placeholder="Ej: Monicadanielaburgos@yahoo.com.ar"
          className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
        />
      </div>

      {/* QR Code Mode Selector */}
      <div className="p-3 bg-purple-50 rounded-2xl border-2 border-purple-200 space-y-2 shadow-sm">
        <label className="block text-xs font-black text-purple-900 uppercase tracking-wide flex items-center justify-between">
          <span>Configuración del Código QR</span>
          <span className="text-[10px] bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-bold">Smart QR</span>
        </label>
        <select
          value={cvData.qrMode || 'vcard'}
          onChange={(e) => setCvData(prev => ({ ...prev, qrMode: e.target.value }))}
          className="w-full text-xs p-2.5 rounded-xl border-2 border-purple-300 bg-white text-[#2B1B2E] font-bold outline-none focus:ring-2 focus:ring-purple-200 cursor-pointer"
        >
          <option value="vcard">📱 vCard: Guardar contacto en agenda del celular</option>
          <option value="public_link">🌐 Perfil Web: Abrir mi CV público en línea</option>
        </select>
        <p className="text-[10.5px] text-purple-700 font-medium leading-relaxed">
          {cvData.qrMode === 'public_link'
            ? 'Al escanear el QR desde un celular, abrirá tu página web de CV público sin descargas.'
            : 'Al escanear el QR desde un celular, agregará tu contacto directamente a la agenda.'}
        </p>
      </div>

      {/* Roles List */}
      <div className="pt-3 border-t border-[#EFE2C9]/80 space-y-3">
        <div>
          <label className="block text-xs font-black text-[#FF2E63] uppercase tracking-wide mb-1">
            Títulos y Roles Principales (Lista de Portada)
          </label>
          <p className="text-[11px] font-bold text-[#6B5B6E] leading-snug">
            ℹ️ Primero ingresa tus registros en las pestañas (Formación, Profesión o Cursos). Luego podrás seleccionarlos de esta lista desplegable sin necesidad de escribirlos manualmente:
          </p>
        </div>

        {/* Selector Desplegable para Agregar Registro Ingresado */}
        <div className="p-3 bg-white rounded-2xl border-2 border-[#FFC93C] shadow-sm space-y-2">
          <label className="block text-[11px] font-extrabold text-[#2B1B2E]">
            Seleccionar Título de Registros Ingresados:
          </label>
          
          {registeredItems.length === 0 ? (
            <div className="p-2.5 bg-[#FFF1C2] rounded-xl text-[11px] text-[#2B1B2E] font-bold border border-[#FFC93C]">
              ⚠️ Primero debes llenar tus registros en las pestañas <strong>Formación Académica</strong>, <strong>Títulos Profesionales</strong> o <strong>Cursos</strong> para que aparezcan en esta lista.
            </div>
          ) : (
            <select
              onChange={(e) => {
                const selectedVal = e.target.value;
                if (selectedVal) {
                  if (!cvData.roles?.includes(selectedVal)) {
                    setCvData(prev => ({
                      ...prev,
                      roles: [...(prev.roles || []), selectedVal]
                    }));
                  } else {
                    showWarning('Este título ya está agregado a la lista de la portada.');
                  }
                  e.target.value = '';
                }
              }}
              defaultValue=""
              className="w-full text-xs p-2.5 rounded-xl border-2 border-[#00A8A0] bg-white text-[#2B1B2E] font-bold outline-none focus:ring-2 focus:ring-[#CFF3F0] cursor-pointer"
            >
              <option value="" disabled>-- Hacer clic para elegir un título o curso cargado --</option>
              {registeredItems.map((item, i) => (
                <option key={i} value={item.title}>
                  [{item.category}] {item.title} ({item.year})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Roles Agregados a la Portada */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-[#2B1B2E] uppercase">
              Títulos Agregados a la Portada ({cvData.roles?.length || 0})
            </span>
            <button
              onClick={addRole}
              className="flex items-center gap-1 text-xs text-[#00A8A0] font-bold hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> + Agregar Título Libre
            </button>
          </div>

          {(!cvData.roles || cvData.roles.length === 0) ? (
            <p className="text-xs text-[#6B5B6E] font-bold italic text-center py-3 border-2 border-dashed border-[#EFE2C9] rounded-xl bg-white/50">
              No has agregado ningún título para la portada aún.
            </p>
          ) : (
            cvData.roles.map((role, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-[#EFE2C9] shadow-sm">
                <input 
                  type="text"
                  value={role}
                  onChange={(e) => updateRoles(idx, e.target.value)}
                  placeholder="Ej: Profesora de Educación Secundaria"
                  className="flex-1 text-xs p-2 rounded-lg border border-[#EFE2C9] bg-white text-[#2B1B2E] font-bold outline-none focus:border-[#FF2E63] transition"
                />
                <button
                  onClick={() => removeRole(idx)}
                  className="p-1.5 text-[#2B1B2E] font-medium hover:text-red-600 transition cursor-pointer"
                  title="Eliminar de la portada"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
