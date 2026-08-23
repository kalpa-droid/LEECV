import React, { useEffect, useState, FormEvent } from 'react';
import { Building, Users, UserPlus, Trash2, Mail, Check, X, HardDrive, Key, AlertCircle } from 'lucide-react';
import { 
  getOrganization, 
  listOrgMembers, 
  inviteMember, 
  removeMember, 
  acceptInvitation 
} from '../services/organizationService';
import { useToast } from '../../../../../shared/core/ui/Toast';
import { useConfirm } from '../../../../../shared/core/ui/ConfirmDialog';
import { Organization, OrgMember, OrgRole } from '../../../../../types/organization';

interface EnterpriseOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EnterpriseOrgModal({ isOpen, onClose }: EnterpriseOrgModalProps) {
  const { showSuccess, showError } = useToast();
  const { confirm } = useConfirm();
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('editor');
  const [invitationTokenInput, setInvitationTokenInput] = useState('');
  const [activeTab, setActiveTab] = useState<'team' | 'invite' | 'accept'>('team');

  async function loadOrgData() {
    try {
      const o = await getOrganization();
      setOrg(o);
      if (o?.id) {
        const m = await listOrgMembers(o.id);
        setMembers(m);
      }
    } catch (err: any) {
      console.error(err);
    }
  }

  useEffect(() => {
    if (isOpen) loadOrgData();
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSendInvite(e: FormEvent) {
    e.preventDefault();
    if (!inviteEmail || !org?.id) return;

    try {
      await inviteMember(org.id, inviteEmail, inviteRole);
      showSuccess(`✅ Invitación enviada a ${inviteEmail}`);
      setInviteEmail('');
      loadOrgData();
    } catch (err: any) {
      showError(err.message || 'Error al enviar invitación');
    }
  }

  async function handleRemoveMember(member: OrgMember) {
    confirm({
      title: `¿Remover a ${member.invited_email}?`,
      message: 'Esta persona perderá el acceso a la organización y los candidatos compartidos.',
      confirmText: 'Remover Integrante',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await removeMember(member.id);
          showSuccess(`Integrante desvinculado.`);
          loadOrgData();
        } catch (err: any) {
          showError(err.message || 'Error desvinculando integrante');
        }
      }
    });
  }

  async function handleAcceptToken(e: FormEvent) {
    e.preventDefault();
    if (!invitationTokenInput) return;

    try {
      await acceptInvitation(invitationTokenInput);
      showSuccess('🎉 ¡Te has unido a la organización con éxito!');
      setInvitationTokenInput('');
      loadOrgData();
    } catch (err: any) {
      showError(err.message || 'Token de invitación no válido');
    }
  }

  const activeCount = members.filter(m => m.status === 'active' || m.status === 'pending').length;
  const maxMembers = org?.max_members || 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="bg-[${colorSystem.neutral.textPrimary}] border border-purple-500/30 text-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-purple-500/20 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600/30 text-purple-300 border border-purple-500/40">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                {org?.name || 'Organización Enterprise'}
                <span className="px-2 py-0.5 rounded-md bg-purple-900/60 border border-purple-500/50 text-purple-300 text-[10px] font-extrabold">
                  Enterprise
                </span>
              </h2>
              <p className="text-[11px] text-purple-300/70">Gestión de Equipo Multi-Usuario, Permisos y Almacenamiento Compartido (50GB)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-6 bg-slate-950/40 border-b border-purple-500/20">
          <div className="p-3.5 bg-slate-900/80 rounded-xl border border-purple-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Miembros de Equipo</p>
                <p className="text-sm font-black text-white">{activeCount} / {maxMembers} Miembros</p>
              </div>
            </div>
            <div className="w-16 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
              <div 
                className="bg-purple-500 h-full transition-all" 
                style={{ width: `${Math.min((activeCount / maxMembers) * 100, 100)}%` }} 
              />
            </div>
          </div>

          <div className="p-3.5 bg-slate-900/80 rounded-xl border border-purple-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Almacenamiento Cloud</p>
                <p className="text-sm font-black text-emerald-400">50 GB LEECV Cloud</p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">
              Exclusivo Enterprise
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-purple-500/20 px-6 pt-2 bg-slate-900/30">
          <button
            onClick={() => setActiveTab('team')}
            className={`px-4 py-2 text-xs font-bold transition border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'team'
                ? 'border-purple-400 text-white bg-purple-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-400" /> Integrantes ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('invite')}
            className={`px-4 py-2 text-xs font-bold transition border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'invite'
                ? 'border-[${colorSystem.accent.base}] text-white bg-rose-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-[${colorSystem.accent.base}]" /> Invitar Miembro
          </button>
          <button
            onClick={() => setActiveTab('accept')}
            className={`px-4 py-2 text-xs font-bold transition border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'accept'
                ? 'border-[${colorSystem.secondary.base}] text-white bg-emerald-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-[${colorSystem.secondary.base}]" /> Aceptar Invitación
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto space-y-4">
          
          {/* TAB 1: TEAM MEMBERS */}
          {activeTab === 'team' && (
            <div className="space-y-3">
              {members.length === 0 ? (
                <div className="text-center py-8 text-slate-400 space-y-2">
                  <Users className="w-8 h-8 mx-auto text-slate-500" />
                  <p className="text-xs font-bold">No hay otros miembros invitados aún.</p>
                  <p className="text-[11px] text-slate-500">Utiliza la pestaña "Invitar Miembro" para sumar colaboradores a tu equipo.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div key={member.id} className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-purple-400" />
                          <span className="font-bold text-white">{member.invited_email}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold ${
                            member.status === 'active' 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {member.status === 'active' ? '✅ Activo' : '⏳ Pendiente'}
                          </span>
                        </div>
                        {member.invitation_token && member.status === 'pending' && (
                          <p className="text-[10px] text-slate-400 font-mono">
                            Token de invitación: <code className="text-purple-300 bg-slate-950 px-1 py-0.5 rounded">{member.invitation_token}</code>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{member.role}</span>
                        <button
                          onClick={() => handleRemoveMember(member)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                          title="Remover integrante"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INVITE MEMBER */}
          {activeTab === 'invite' && (
            <form onSubmit={handleSendInvite} className="space-y-4 max-w-md mx-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Email del Colaborador</label>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@empresa.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Rol en el Equipo</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500 transition cursor-pointer"
                >
                  <option value="editor">Editor (Puede crear y editar candidatos)</option>
                  <option value="admin">Administrador (Puede editar e invitar otros usuarios)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[${colorSystem.accent.base}] hover:bg-[#E31555] text-white font-extrabold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" /> Enviar Invitación al Equipo
              </button>
            </form>
          )}

          {/* TAB 3: ACCEPT INVITATION */}
          {activeTab === 'accept' && (
            <form onSubmit={handleAcceptToken} className="space-y-4 max-w-md mx-auto">
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-2.5 text-xs text-blue-200">
                <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px]">
                  Si te enviaron un token de invitación para unirte a una organización Enterprise, pégalo a continuación para activar tu acceso.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Token de Invitación</label>
                <input
                  type="text"
                  required
                  placeholder="Pega el token aquí..."
                  value={invitationTokenInput}
                  onChange={(e) => setInvitationTokenInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none focus:border-[${colorSystem.secondary.base}] transition"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[${colorSystem.secondary.base}] hover:bg-[#008f88] text-white font-extrabold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Unirse a la Organización
              </button>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-purple-500/20 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Organización id: <code className="text-purple-300">{org?.id || 'Enterprise'}</code></span>
          <button onClick={onClose} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-extrabold rounded-xl transition cursor-pointer">
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
