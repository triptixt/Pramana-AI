'use client';

import React, { useState } from 'react';
import { useApp } from '../../lib/context';
import {
  Building2, Users, ShieldCheck, Settings2, Plus, Search,
  XCircle, ChevronRight, Cpu, Lock, Bell, Database,
  ToggleLeft, ToggleRight, Crown, Activity, TrendingUp,
  Eye, Edit3, Trash2, UserPlus, RefreshCw, Server, Zap,
  CheckCircle2, AlertCircle, Globe
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Role } from '../../types';

type AdminTab = 'organizations' | 'users' | 'roles' | 'platform';

const SYSTEM_ROLES = [
  { id: 'ciso',            name: 'Enterprise CISO',   description: 'Full tenant admin: manage evidence, controls, users, and compliance posture.', users: 8,  color: 'indigo', perms: ['Evidence CRUD','Control Approval','User Mgmt','Settings','Reports'] },
  { id: 'auditor',         name: 'External Auditor',  description: 'Auditor-in-the-loop portal: verify AI mappings, approve/reject controls, request evidence.', users: 5,  color: 'violet', perms: ['Evidence Read','Review Approve/Reject','Audit Trail','Evidence Requests'] },
  { id: 'compliance_team', name: 'Compliance Team',   description: 'Upload and organize evidence, respond to auditor evidence requests, resolve gaps.', users: 11, color: 'emerald',perms: ['Evidence Upload','Gap Mgmt','Control Read','Reports'] },
  { id: 'admin',           name: 'Super Admin',       description: 'Platform-level access across all tenants. Manage organizations, roles, and settings.', users: 2,  color: 'rose',   perms: ['All Permissions','Platform Config','Org Management','Billing'] },
  { id: 'viewer',          name: 'Read-Only Viewer',  description: 'View dashboards and compliance reports only. Cannot mutate data.', users: 18, color: 'slate',  perms: ['Dashboard Read','Reports Read','Evidence Read'] },
];

const platformSections = [
  { key: 'security',     label: 'Security & Auth',   Icon: Lock,     color: 'indigo', settings: [
    { label: 'Enforce MFA for all users',   desc: 'Require TOTP or hardware key on every login.',                       on: true  },
    { label: 'SAML SSO federation',         desc: 'Allow orgs to federate via SAML 2.0 IdP.',                           on: true  },
    { label: 'Session timeout (30 min)',    desc: 'Auto-logout inactive sessions after 30 minutes.',                    on: false },
  ]},
  { key: 'ai',          label: 'AI Evidence Engine', Icon: Cpu,      color: 'violet', settings: [
    { label: 'AI auto-mapping enabled',     desc: 'Pramana AI maps uploaded evidence to controls across frameworks.',    on: true  },
    { label: 'Confidence threshold alerts', desc: 'Alert auditors when AI confidence drops below 75%.',                 on: true  },
    { label: 'Multi-Framework Cross Mapping',desc: 'Automatically cross-map one document to multiple frameworks.',     on: true },
  ]},
  { key: 'notifs',      label: 'Notifications & Alerts', Icon: Bell,  color: 'amber',  settings: [
    { label: 'Global email digest',         desc: 'Send weekly platform-wide compliance summary to CISOs.',             on: true  },
    { label: 'Auditor request notifications', desc: 'Notify compliance team immediately when auditor requests evidence.', on: true },
    { label: 'Evidence expiry reminders',   desc: 'Notify owners 30 days before compliance documents expire.',           on: true  },
  ]},
  { key: 'data',        label: 'Data & Storage',     Icon: Database, color: 'emerald',settings: [
    { label: 'Tenant data isolation',       desc: 'Enforce strict multi-tenant database partitioning per organization.',on: true  },
    { label: 'Audit log immutability',      desc: 'SHA-256 hash every audit event; prevent log tampering.',             on: true  },
    { label: 'Cloud evidence sync',         desc: 'Replicate evidence vault to encrypted multi-region storage.',        on: true  },
  ]},
];

const planBadge: Record<string,string> = {
  Enterprise: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  Growth:     'bg-violet-100 text-violet-700 border border-violet-200',
  Starter:    'bg-slate-100  text-slate-600  border border-slate-200',
};
const statusBadge: Record<string,string> = {
  active:    'bg-emerald-100 text-emerald-700',
  trial:     'bg-amber-100   text-amber-700',
  suspended: 'bg-rose-100    text-rose-700',
  pending:   'bg-amber-100   text-amber-700',
  inactive:  'bg-slate-100   text-slate-500',
};
const roleCardBorder: Record<string,string> = {
  indigo:  'border-indigo-200  bg-indigo-50/40',
  violet:  'border-violet-200  bg-violet-50/40',
  emerald: 'border-emerald-200 bg-emerald-50/40',
  rose:    'border-rose-200    bg-rose-50/40',
  slate:   'border-slate-200   bg-slate-50/40',
};
const roleIconBg: Record<string,string> = {
  indigo:  'bg-indigo-100  text-indigo-600',
  violet:  'bg-violet-100  text-violet-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  rose:    'bg-rose-100    text-rose-600',
  slate:   'bg-slate-100   text-slate-500',
};
const sectionIconBg: Record<string,string> = {
  indigo:  'bg-indigo-100  text-indigo-600',
  violet:  'bg-violet-100  text-violet-600',
  amber:   'bg-amber-100   text-amber-600',
  emerald: 'bg-emerald-100 text-emerald-600',
};
const statIconBg: Record<string,string> = {
  indigo:  'bg-indigo-50  text-indigo-600',
  violet:  'bg-violet-50  text-violet-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber:   'bg-amber-50   text-amber-600',
};

export const SuperAdminView: React.FC = () => {
  const { 
    organizations, 
    usersList, 
    isBackendConnected, 
    backendInfo, 
    refreshBackendData,
    createOrganizationBackend, 
    deleteOrganizationBackend,
    createUserBackend, 
    deleteUserBackend,
    showToast 
  } = useApp();

  const [tab, setTab]         = useState<AdminTab>('organizations');
  const [orgQ, setOrgQ]       = useState('');
  const [userQ, setUserQ]     = useState('');

  // Modals state
  const [isNewOrgModalOpen, setIsNewOrgModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');

  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('compliance_team');

  // Platform toggle states
  const defaultToggles: Record<string,boolean> = {};
  platformSections.forEach(s => s.settings.forEach(i => { defaultToggles[i.label] = i.on; }));
  const [toggles, setToggles] = useState(defaultToggles);

  const handleToggle = (label: string) => {
    setToggles(prev => {
      const next = { ...prev, [label]: !prev[label] };
      showToast(next[label] ? 'Setting enabled' : 'Setting disabled', label, next[label] ? 'success' : 'info');
      return next;
    });
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    await createOrganizationBackend(newOrgName.trim());
    setNewOrgName('');
    setIsNewOrgModalOpen(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    await createUserBackend({
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
    });
    setNewUserName('');
    setNewUserEmail('');
    setIsNewUserModalOpen(false);
  };

  /* Filtered rows */
  const filteredOrgs = organizations.filter(o => o.name.toLowerCase().includes(orgQ.toLowerCase()));
  const filteredUsers = usersList.filter(u => u.name.toLowerCase().includes(userQ.toLowerCase()) || u.email.toLowerCase().includes(userQ.toLowerCase()));

  /* Tabs config */
  const tabs: { id: AdminTab; label: string; Icon: React.ElementType; count?: number }[] = [
    { id: 'organizations', label: 'Organizations',     Icon: Building2,  count: organizations.length  },
    { id: 'users',         label: 'Users',             Icon: Users,      count: usersList.length },
    { id: 'roles',         label: 'Roles',             Icon: ShieldCheck, count: SYSTEM_ROLES.length   },
    { id: 'platform',      label: 'Platform & API',    Icon: Settings2                              },
  ];

  const stats = [
    { label: 'Total Orgs',      value: organizations.length,                             delta: 'Live in database', Icon: Building2,  color: 'indigo'  },
    { label: 'Active Users',    value: usersList.filter(u=>u.status==='active').length, delta: 'Verified accounts', Icon: Users,    color: 'violet'  },
    { label: 'API Connection',  value: isBackendConnected ? 'Online' : 'Fallback',      delta: 'FastAPI Backend',  Icon: Activity,   color: 'emerald' },
    { label: 'Platform Uptime', value: '99.99%',                                        delta: 'Healthy status',   Icon: TrendingUp, color: 'amber'   },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-900/25 flex items-center justify-center">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-main-title text-slate-900 leading-tight">
                Super Admin Console
              </h1>
              {isBackendConnected ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  API Connected (Port 8000)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Local Vault Mode
                </span>
              )}
            </div>
            <p className="text-label text-slate-500 mt-0.5">
              Platform-wide management · Multi-tenant governance · System settings
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
            <Zap className="w-3.5 h-3.5" /> Super Admin
          </span>
          <button
            onClick={async () => {
              await refreshBackendData();
              showToast('Synced with Backend', 'Refreshed organizations, users, and audit logs from API.', 'success');
            }}
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors shadow-xs"
            title="Refresh from API"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── KPI Stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-label text-slate-500 font-medium">{s.label}</p>
                <p className="font-numeric text-3xl font-semibold text-slate-900 mt-1 leading-none">{s.value}</p>
                <p className="text-[11px] text-slate-400 mt-1.5">{s.delta}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statIconBg[s.color]}`}>
                <s.Icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl w-fit flex-wrap">
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <t.Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
              {t.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ══ Organizations Tab ════════════════════════════════════════════ */}
      {tab === 'organizations' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-slate-100">
            <div>
              <h2 className="font-heading text-section-head text-slate-900">Manage Organizations</h2>
              <p className="text-label text-slate-500 mt-0.5">All tenant organizations registered in Pramana database.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text" placeholder="Search orgs…" value={orgQ} onChange={e => setOrgQ(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 w-44 bg-slate-50"
                />
              </div>
              <button
                onClick={() => setIsNewOrgModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" /> New Org
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Organization','Plan','Users','Active Frameworks','Created','Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredOrgs.map(org => {
                  const orgUsersCount = usersList.filter(u => u.organizationId === org.id).length;
                  return (
                    <tr key={org.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{org.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{org.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${planBadge[org.plan] || planBadge.Enterprise}`}>{org.plan}</span>
                      </td>
                      <td className="px-5 py-3.5 font-numeric text-slate-700 font-medium">{orgUsersCount || 3}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1 flex-wrap">
                          {org.activeFrameworks?.map(f => (
                            <span key={f} className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {f}
                            </span>
                          )) || <span className="text-xs text-slate-400">ISO 27001</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{org.auditPeriod || 'Annual'}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => deleteOrganizationBackend(org.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete Organization from DB"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredOrgs.length === 0 && (
              <div className="py-16 text-center text-slate-400 text-sm">No organizations match your search.</div>
            )}
          </div>
        </div>
      )}

      {/* ══ Users Tab ════════════════════════════════════════════════════ */}
      {tab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-slate-100">
            <div>
              <h2 className="font-heading text-section-head text-slate-900">Manage Users</h2>
              <p className="text-label text-slate-500 mt-0.5">All platform accounts across every tenant organization in database.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text" placeholder="Search users…" value={userQ} onChange={e => setUserQ(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 w-44 bg-slate-50"
                />
              </div>
              <button
                onClick={() => setIsNewUserModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-sm cursor-pointer"
              >
                <UserPlus className="w-4 h-4" /> Add User
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['User','Role','Organization','Status','Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {u.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{u.name}</p>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                        {u.roleTitle || u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{u.organizationName || u.organizationId}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusBadge[u.status] || statusBadge.active}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteUserBackend(u.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Revoke User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="py-16 text-center text-slate-400 text-sm">No users match your search.</div>
            )}
          </div>
        </div>
      )}

      {/* ══ Roles Tab ════════════════════════════════════════════════════ */}
      {tab === 'roles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-section-head text-slate-900">Platform Role Hierarchy</h2>
              <p className="text-label text-slate-500 mt-0.5">Defined role-based access control (RBAC) scopes across the Pramana platform.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {SYSTEM_ROLES.map(role => (
              <div key={role.id} className={`rounded-2xl border p-5 space-y-4 hover:shadow-md transition-shadow ${roleCardBorder[role.color]}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${roleIconBg[role.color]}`}>
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{role.name}</p>
                      <p className="font-numeric text-xs text-slate-500">
                        {usersList.filter(u => u.role === role.id).length} accounts assigned
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{role.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {role.perms.map(p => (
                    <span key={p} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/80 text-slate-600 border border-slate-200">{p}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ Platform & API Settings Tab ════════════════════════════════════════ */}
      {tab === 'platform' && (
        <div className="space-y-5">
          {/* Live Backend Connection Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/15">
                  <Server className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold">FastAPI Backend Server</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Live at localhost:8000
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Database: Connected (Organizations, Evidence, Controls, Mappings, Gaps, Audits &amp; Immutable Audit Logs)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    await refreshBackendData();
                    showToast('Backend Polled', 'FastAPI health status 200 OK. Synced live tables.', 'success');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all border border-white/20 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-check Connection
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {platformSections.map(section => (
              <div key={section.key} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${sectionIconBg[section.color]}`}>
                    <section.Icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-subheading text-subheading text-slate-800">{section.label}</h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {section.settings.map(setting => {
                    const on = toggles[setting.label] ?? setting.on;
                    return (
                      <div key={setting.label} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">{setting.label}</p>
                          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{setting.desc}</p>
                        </div>
                        <button
                          onClick={() => handleToggle(setting.label)}
                          className="shrink-0 transition-transform active:scale-95"
                          title={on ? 'Disable' : 'Enable'}
                        >
                          {on
                            ? <ToggleRight className="w-9 h-9 text-indigo-600" />
                            : <ToggleLeft  className="w-9 h-9 text-slate-300"  />
                          }
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── New Organization Modal ── */}
      <Modal
        isOpen={isNewOrgModalOpen}
        onClose={() => setIsNewOrgModalOpen(false)}
        title="Register New Tenant Organization"
      >
        <form onSubmit={handleCreateOrg} className="space-y-4">
          <p className="text-xs text-slate-500">
            Initialize an isolated compliance tenant vault in the Pramana platform database.
          </p>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Organization Name
            </label>
            <input
              type="text"
              required
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="e.g. Nexus Cyber Systems Ltd."
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsNewOrgModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
            >
              Provision Organization
            </button>
          </div>
        </form>
      </Modal>

      {/* ── New User Modal ── */}
      <Modal
        isOpen={isNewUserModalOpen}
        onClose={() => setIsNewUserModalOpen(false)}
        title="Add User to Platform"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Corporate Email
            </label>
            <input
              type="email"
              required
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="e.g. john@enterprise.com"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Assigned Persona Role
            </label>
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as Role)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
            >
              <option value="ciso">Enterprise CISO (Manage evidence &amp; compliance)</option>
              <option value="auditor">External Auditor (Review queue &amp; decisions)</option>
              <option value="compliance_team">Compliance Team (Upload docs &amp; gaps)</option>
              <option value="admin">Super Admin (Platform governance)</option>
              <option value="viewer">Read-Only Viewer</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsNewUserModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
            >
              Create Account in DB
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
