'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../lib/context';
import { api } from '../../lib/api';
import {
  Building2, Users, ShieldCheck, Settings2, Plus, Search,
  XCircle, ChevronRight, Cpu, Lock, Bell, Database,
  ToggleLeft, ToggleRight, Crown, Activity, TrendingUp,
  Eye, Edit3, Trash2, UserPlus, RefreshCw, Server, Zap,
  CheckCircle2, AlertCircle, Globe, Layers, Link2, LogIn
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Role } from '../../types';
import { normalizeRole } from '../../lib/rbac';

type AdminTab = 'overview' | 'organizations' | 'frameworks' | 'users' | 'platform';

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
  inactive:  'bg-slate-100   text-slate-500',
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
  rose:    'bg-rose-50    text-rose-600',
  slate:   'bg-slate-50   text-slate-600',
};

interface SuperAdminViewProps {
  initialTab?: AdminTab;
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({ initialTab = 'overview' }) => {
  const { 
    organizations, 
    usersList, 
    isBackendConnected, 
    refreshBackendData,
    createOrganizationBackend, 
    deleteOrganizationBackend,
    createUserBackend, 
    deleteUserBackend,
    impersonateUser,
    showToast,
    activeView,
    setActiveView
  } = useApp();

  const [tab, setTab] = useState<AdminTab>(initialTab);

  // Sync tab with activeView navigation from sidebar
  useEffect(() => {
    if (activeView === 'admin-organizations') {
      setTab('organizations');
    } else if (activeView === 'admin-frameworks') {
      setTab('frameworks');
    } else if (activeView === 'admin-users') {
      setTab('users');
    } else if (activeView === 'super-admin') {
      setTab('overview');
    } else if (initialTab) {
      setTab(initialTab);
    }
  }, [activeView, initialTab]);
  const [orgQ, setOrgQ]       = useState('');
  const [userQ, setUserQ]     = useState('');
  const [frameworkQ, setFrameworkQ] = useState('');

  const [overviewData, setOverviewData] = useState<any>(null);
  const [frameworks, setFrameworks] = useState<any[]>([]);

  // Modals state
  const [isNewOrgModalOpen, setIsNewOrgModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');

  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('grc');
  const [newUserOrgId, setNewUserOrgId] = useState<number>(1);

  const [isNewFrameworkModalOpen, setIsNewFrameworkModalOpen] = useState(false);
  const [newFrameworkName, setNewFrameworkName] = useState('');
  const [newFrameworkCode, setNewFrameworkCode] = useState('');
  const [newFrameworkVersion, setNewFrameworkVersion] = useState('1.0');
  const [newFrameworkAuthority, setNewFrameworkAuthority] = useState('');
  const [newFrameworkDesc, setNewFrameworkDesc] = useState('');
  const [newFrameworkFile, setNewFrameworkFile] = useState<File | null>(null);
  const [uploadingFramework, setUploadingFramework] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');

  // Control Inspection Modal
  const [inspectingFramework, setInspectingFramework] = useState<any | null>(null);
  const [inspectControlsList, setInspectControlsList] = useState<any[]>([]);
  const [loadingControls, setLoadingControls] = useState(false);

  // Platform toggle states
  const defaultToggles: Record<string,boolean> = {};
  platformSections.forEach(s => s.settings.forEach(i => { defaultToggles[i.label] = i.on; }));
  const [toggles, setToggles] = useState(defaultToggles);
  const isFetchingAdminRef = useRef(false);

  const fetchOverview = async () => {
    try {
      const res = await api.platform.overview();
      setOverviewData(res.data);
    } catch (err: any) {
      console.warn("Could not fetch overview data", err);
    }
  };

  const fetchFrameworks = async () => {
    try {
      const res = await api.frameworks.list();
      setFrameworks(res);
    } catch (err: any) {
      console.warn("Could not fetch frameworks", err);
    }
  };

  useEffect(() => {
    if (!api.auth.getToken() || isFetchingAdminRef.current) return;
    isFetchingAdminRef.current = true;
    Promise.all([fetchOverview(), fetchFrameworks()]).finally(() => {
      isFetchingAdminRef.current = false;
    });
  }, []);

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
    fetchOverview();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    try {
      await createUserBackend({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        organization_id: newUserOrgId,
        role: newUserRole,
        password: newUserPassword.trim() || undefined,
      });
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setIsNewUserModalOpen(false);
      fetchOverview();
    } catch (err: any) {
      // Toast handles error display
    }
  };

  const handleUploadFramework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFrameworkName.trim() || !newFrameworkCode.trim()) {
      showToast('Validation Error', 'Framework Name and Code are required.', 'error');
      return;
    }
    if (!newFrameworkFile) {
      showToast('File Required', 'Please select a real framework file (PDF, DOCX, JSON, CSV, TXT) to upload.', 'warning');
      return;
    }

    try {
      setUploadingFramework(true);
      setUploadProgressMsg('Uploading file, extracting controls, and generating pgvector embeddings...');
      
      const res = await api.frameworks.upload(
        newFrameworkFile,
        newFrameworkName.trim(),
        newFrameworkCode.trim(),
        newFrameworkVersion.trim() || '1.0',
        newFrameworkDesc.trim(),
        newFrameworkAuthority.trim()
      );

      setUploadingFramework(false);
      setUploadProgressMsg('');
      setIsNewFrameworkModalOpen(false);
      setNewFrameworkName('');
      setNewFrameworkCode('');
      setNewFrameworkVersion('1.0');
      setNewFrameworkAuthority('');
      setNewFrameworkDesc('');
      setNewFrameworkFile(null);

      await fetchFrameworks();
      const relMsg = (res.relationships_created && res.relationships_created > 0)
        ? ` & ${res.relationships_created} control relationships`
        : '';
      showToast('Framework Ingested', `Successfully processed ${res.total_controls} controls${relMsg} into PostgreSQL & pgvector!`, 'success');
    } catch (err: any) {
      setUploadingFramework(false);
      setUploadProgressMsg('');
      showToast('Ingestion Failed', err.message || 'Could not ingest framework file', 'error');
    }
  };

  const handleViewControls = async (fw: any) => {
    setInspectingFramework(fw);
    setLoadingControls(true);
    setInspectControlsList([]);
    try {
      const controls = await api.frameworks.getControls(fw.id);
      setInspectControlsList(controls);
    } catch (err: any) {
      showToast('Error Loading Controls', err.message, 'error');
    } finally {
      setLoadingControls(false);
    }
  };

  const handleReprocessFramework = async (fwId: number) => {
    try {
      showToast('Reprocessing Started', 'Extracting controls and updating pgvector embeddings...', 'info');
      const res = await api.frameworks.reprocess(fwId);
      await fetchFrameworks();
      showToast('Reprocessing Complete', `Ingested ${res.total_controls} controls.`, 'success');
    } catch (err: any) {
      showToast('Reprocessing Failed', err.message, 'error');
    }
  };

  const handleToggleFrameworkStatus = async (fwId: number, fwName: string, currentlyActive: boolean) => {
    if (currentlyActive) {
      const confirmed = window.confirm(
        `Are you sure you want to off-role "${fwName}"?\n\nOrganizations will no longer be able to select this framework for new compliance assessments. Existing historical evidence and audit records will remain preserved.`
      );
      if (!confirmed) return;
    }

    try {
      const res = await api.frameworks.toggleStatus(fwId);
      await fetchFrameworks();
      await fetchOverview();
      showToast(
        res.is_active ? 'Framework Enrolled' : 'Framework Off-roled',
        `"${fwName}" is now ${res.is_active ? 'Active (Enrolled)' : 'Inactive (Off-role)'} for organizations.`,
        res.is_active ? 'success' : 'info'
      );
    } catch (err: any) {
      showToast('Status Update Failed', err.message || 'Failed to update framework status.', 'error');
    }
  };

  const handleDeleteFramework = async (fwId: number, fwName: string) => {
    if (!confirm(`Are you sure you want to delete framework "${fwName}"? This will delete all its extracted controls and embeddings.`)) {
      return;
    }
    try {
      await api.frameworks.delete(fwId);
      await fetchFrameworks();
      await fetchOverview();
      showToast('Framework Deleted', `Deleted "${fwName}" from platform.`, 'info');
    } catch (err: any) {
      showToast('Delete Failed', err.message, 'error');
    }
  };


  const filteredOrgs = organizations.filter(o => o.name.toLowerCase().includes(orgQ.toLowerCase()));
  const filteredUsers = usersList.filter(u => u.name.toLowerCase().includes(userQ.toLowerCase()) || u.email.toLowerCase().includes(userQ.toLowerCase()));
  const filteredFrameworks = frameworks.filter(f => f.name.toLowerCase().includes(frameworkQ.toLowerCase()) || f.code.toLowerCase().includes(frameworkQ.toLowerCase()));

  const tabs: { id: AdminTab; label: string; Icon: React.ElementType; count?: number }[] = [
    { id: 'overview',      label: 'Platform Overview', Icon: Activity },
    { id: 'organizations', label: 'Organizations',     Icon: Building2,  count: overviewData?.total_organizations || organizations.length  },
    { id: 'frameworks',    label: 'Frameworks',        Icon: Layers,     count: overviewData?.total_frameworks || frameworks.length },
    { id: 'users',         label: 'Users',             Icon: Users,      count: overviewData?.total_users || usersList.length },
    { id: 'platform',      label: 'System Settings',   Icon: Settings2 },
  ];

  const overviewCards = [
    { label: 'Total Orgs',      value: overviewData?.total_organizations ?? organizations.length, delta: 'Live in PostgreSQL', Icon: Building2,  color: 'indigo'  },
    { label: 'Active Users',    value: overviewData?.total_users ?? usersList.length, delta: 'Verified accounts', Icon: Users,    color: 'violet'  },
    { label: 'Frameworks',      value: overviewData?.total_frameworks ?? frameworks.length, delta: 'Global templates', Icon: Layers, color: 'slate' },
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
              fetchOverview();
              fetchFrameworks();
              showToast('Synced with Backend', 'Refreshed platform data from API.', 'success');
            }}
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors shadow-xs"
            title="Refresh from API"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ══ Overview Page ════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Executive Header Banner */}
          <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg border border-slate-800">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Master Console
                  </span>
                  <span className="text-xs text-slate-400">PostgreSQL Multi-Tenant Instance</span>
                </div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                  Platform Architecture & Governance
                </h2>
                <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
                  Real-time telemetry and management across all isolated tenant vaults, RBAC permission roles, and global compliance framework catalogs.
                </p>
              </div>

              {/* Quick Navigation to Dedicated Pages */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsNewOrgModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> New Org
                </button>
                <button
                  onClick={() => setIsNewUserModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-all border border-white/10 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add User
                </button>
                <button
                  onClick={() => setIsNewFrameworkModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-all border border-white/10 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" /> New Framework
                </button>
              </div>
            </div>

            {/* Subtle background glow effect */}
            <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          </div>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {overviewCards.map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold">{s.label}</p>
                    <p className="font-numeric text-3xl font-extrabold text-slate-900 mt-1 leading-none">{s.value}</p>
                    <p className="text-[11px] text-slate-400 mt-2 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      {s.delta}
                    </p>
                  </div>
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs ${statIconBg[s.color]}`}>
                    <s.Icon className="w-5 h-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Platform Settings & System Governance Sections */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {platformSections.map(sec => (
                <div key={sec.key} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${sectionIconBg[sec.color]}`}>
                      <sec.Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-heading text-card-title text-slate-900">{sec.label}</h3>
                  </div>
                  <div className="space-y-3">
                    {sec.settings.map(item => {
                      const isOn = toggles[item.label] ?? item.on;
                      return (
                        <div key={item.label} className="flex items-start justify-between gap-3 pt-2 first:pt-0 border-t first:border-0 border-slate-100">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 leading-snug">{item.label}</p>
                            <p className="text-label text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                          </div>
                          <button
                            onClick={() => handleToggle(item.label)}
                            className="mt-0.5 text-slate-400 hover:text-slate-600 transition-colors shrink-0 cursor-pointer"
                          >
                            {isOn ? (
                              <ToggleRight className="w-6 h-6 text-indigo-600" />
                            ) : (
                              <ToggleLeft className="w-6 h-6 text-slate-300" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Tenant Isolation Policy Callout */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 text-white border border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Logical Tenant Isolation & Multi-Framework Vector Indexing</span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Every organization operates in strict cryptographic and database isolation with row-level security boundaries. Evidence embeddings are partitioned with pgvector.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  PostgreSQL Active
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

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
                      <td className="px-5 py-3.5 font-numeric text-slate-700 font-medium">{orgUsersCount}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1 flex-wrap">
                          {org.activeFrameworks && org.activeFrameworks.length > 0 ? (
                            org.activeFrameworks.map(f => (
                              <span key={f} className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {f}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">All Active Frameworks</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{org.created_at ? new Date(org.created_at).toLocaleDateString('en-US') : 'Active Tenant'}</td>
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

      {/* ══ Frameworks Tab ════════════════════════════════════════════ */}
      {tab === 'frameworks' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-slate-100">
            <div>
              <h2 className="font-heading text-section-head text-slate-900">Framework Management</h2>
              <p className="text-label text-slate-500 mt-0.5">Real compliance frameworks, extracted controls, and pgvector embeddings stored in PostgreSQL.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text" placeholder="Search frameworks…" value={frameworkQ} onChange={e => setFrameworkQ(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 w-44 bg-slate-50"
                />
              </div>
              <button
                onClick={() => setIsNewFrameworkModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add / Upload Framework
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Framework', 'Category', 'Code & Version', 'Ingested Controls', 'Availability & Status', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredFrameworks.map(f => {
                  const isCompleted = f.status === 'completed';
                  const isProcessing = f.status === 'processing';
                  const isFailed = f.status === 'failed' || f.status === 'review_required';
                  const isActive = f.is_active !== false;

                  return (
                    <tr key={f.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{f.name}</p>
                            <p className="text-[11px] text-slate-400 line-clamp-1">{f.description || 'Standard compliance framework'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {f.category || 'Information Security & Cyber'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">{f.code}</span>
                          <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">v{f.version || '1.0'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-numeric font-bold text-slate-900 text-sm">
                            {f.total_controls || 0}
                          </span>
                          <span className="text-xs text-slate-400">controls (pgvector)</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active (Enrolled)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                                <XCircle className="w-3 h-3 text-slate-500" /> Off-role (Inactive)
                              </span>
                            )}

                            {isProcessing && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" /> Ingesting
                              </span>
                            )}
                            {isFailed && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200" title={f.error_message || ''}>
                                <AlertCircle className="w-3 h-3 text-rose-600" /> Error
                              </span>
                            )}
                          </div>
                          {f.file_name && (
                            <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                              <Database className="w-3 h-3 text-slate-400" /> {f.file_name}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {/* Enroll / Off-role Toggle Button */}
                          {isActive ? (
                            <button
                              onClick={() => handleToggleFrameworkStatus(f.id, f.name, true)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                              title="Turn off / Off-role this framework for organizations"
                            >
                              <ToggleLeft className="w-3.5 h-3.5 text-rose-600" /> Off-role
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleFrameworkStatus(f.id, f.name, false)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                              title="Enroll / Activate this framework for organizations"
                            >
                              <ToggleRight className="w-3.5 h-3.5 text-emerald-600" /> Enroll
                            </button>
                          )}

                          <button
                            onClick={() => handleViewControls(f)}
                            className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Inspect Real Extracted Controls"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {f.file_name && (
                            <button
                              onClick={() => handleReprocessFramework(f.id)}
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors"
                              title="Reprocess Framework with AI"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteFramework(f.id, f.name)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete Framework from Database"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredFrameworks.length === 0 && (
              <div className="py-16 text-center text-slate-400 text-sm">No frameworks match your search.</div>
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
                          onClick={() => {
                            const numericId = parseInt(u.id.replace(/\D/g, ''), 10);
                            if (numericId) impersonateUser(numericId);
                          }}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                          title={`Log in as ${u.name}`}
                        >
                          <LogIn className="w-3.5 h-3.5" />
                        </button>
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

      {/* ══ Platform & API Settings Tab ════════════════════════════════════════ */}
      {tab === 'platform' && (
        <div className="space-y-5">
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
      <Modal isOpen={isNewOrgModalOpen} onClose={() => setIsNewOrgModalOpen(false)} title="Register New Organization">
        <form onSubmit={handleCreateOrg} className="space-y-4">
          <p className="text-xs text-slate-500">Create an isolated organization tenant vault in the PostgreSQL database.</p>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Organization Name</label>
            <input type="text" required value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} placeholder="e.g. Nexus Cyber Systems Ltd." className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={() => setIsNewOrgModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs">Create Organization</button>
          </div>
        </form>
      </Modal>

      {/* ── New User Modal ── */}
      <Modal isOpen={isNewUserModalOpen} onClose={() => setIsNewUserModalOpen(false)} title="Add User to Platform">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Target Organization</label>
            <select
              value={newUserOrgId}
              onChange={(e) => setNewUserOrgId(parseInt(e.target.value, 10))}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-800"
            >
              {organizations.map((org) => {
                const numId = parseInt(org.id.replace('org-', ''), 10) || 1;
                return (
                  <option key={org.id} value={numId}>
                    {org.name} (ID: {numId})
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
            <input type="text" required value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="e.g. John Doe" className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Corporate Email</label>
            <input type="email" required value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="e.g. john@enterprise.com" className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Initial Password</label>
            <input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Default: Pramana@123 (if left blank)" className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            <p className="text-[11px] text-slate-500 mt-1">If blank, defaults to initial password <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">Pramana@123</code></p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Role</label>
            <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as Role)} className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-800">
              <option value="super_admin">Super Admin / Platform Administrator</option>
              <option value="ciso">CISO / Enterprise Security Leader</option>
              <option value="grc">GRC / Compliance Manager</option>
              <option value="internal_auditor">Internal Auditor</option>
              <option value="control_owner">Control Owner</option>
              <option value="evidence_contributor">Evidence Contributor</option>
              <option value="external_auditor">External Auditor</option>
              <option value="executive">Executive Leadership</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={() => setIsNewUserModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs">Create Account in DB</button>
          </div>
        </form>
      </Modal>

      {/* ── Upload & Ingest Framework Modal ── */}
      <Modal isOpen={isNewFrameworkModalOpen} onClose={() => !uploadingFramework && setIsNewFrameworkModalOpen(false)} title="Upload & Ingest Compliance Framework">
        <form onSubmit={handleUploadFramework} className="space-y-4">
          <p className="text-xs text-slate-500">
            Upload a REAL framework document (PDF, DOCX, JSON, CSV, TXT). Pramana AI will extract real controls, generate vector embeddings, and store them in PostgreSQL / pgvector.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Framework Name *</label>
              <input
                type="text"
                required
                disabled={uploadingFramework}
                value={newFrameworkName}
                onChange={(e) => {
                  setNewFrameworkName(e.target.value);
                  if (!newFrameworkCode) {
                    setNewFrameworkCode(e.target.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_'));
                  }
                }}
                placeholder="e.g. ISO/IEC 27001:2022"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Framework Code *</label>
              <input
                type="text"
                required
                disabled={uploadingFramework}
                value={newFrameworkCode}
                onChange={(e) => setNewFrameworkCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                placeholder="e.g. ISO_27001"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Version</label>
              <input
                type="text"
                disabled={uploadingFramework}
                value={newFrameworkVersion}
                onChange={(e) => setNewFrameworkVersion(e.target.value)}
                placeholder="e.g. 2022 or 1.0"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Authority / Standard Body</label>
              <input
                type="text"
                disabled={uploadingFramework}
                value={newFrameworkAuthority}
                onChange={(e) => setNewFrameworkAuthority(e.target.value)}
                placeholder="e.g. ISO/IEC or AICPA or NIST"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description</label>
            <textarea
              rows={2}
              disabled={uploadingFramework}
              value={newFrameworkDesc}
              onChange={(e) => setNewFrameworkDesc(e.target.value)}
              placeholder="Standard for Information Security Management Systems (ISMS)..."
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Framework Document / Data File *
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:border-indigo-400 transition-colors bg-slate-50/50">
              <input
                type="file"
                required
                disabled={uploadingFramework}
                accept=".pdf,.docx,.doc,.json,.csv,.txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setNewFrameworkFile(e.target.files[0]);
                  }
                }}
                className="hidden"
                id="framework-file-input"
              />
              <label htmlFor="framework-file-input" className="cursor-pointer block">
                <Database className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                {newFrameworkFile ? (
                  <div>
                    <p className="text-xs font-bold text-indigo-700">{newFrameworkFile.name}</p>
                    <p className="text-[11px] text-slate-400">{(newFrameworkFile.size / 1024).toFixed(1)} KB — Click to change file</p>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Click to upload framework file</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Supports PDF, Word (.docx), JSON, CSV, TXT (Max 50MB)</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {uploadingFramework && (
            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
              <div className="text-xs text-indigo-900">
                <p className="font-bold">Processing Real Framework Pipeline...</p>
                <p className="text-[11px] text-indigo-700">{uploadProgressMsg}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={uploadingFramework}
              onClick={() => setIsNewFrameworkModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadingFramework}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {uploadingFramework ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Ingesting Controls...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" /> Upload & Ingest Framework
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Extracted Controls Inspection Modal ── */}
      <Modal
        isOpen={!!inspectingFramework}
        onClose={() => setInspectingFramework(null)}
        title={inspectingFramework ? `Extracted Controls: ${inspectingFramework.name} (${inspectingFramework.code})` : 'Framework Controls'}
      >
        <div className="space-y-4 max-h-[75vh] flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
            <div>
              <p className="text-xs text-slate-500">
                Real compliance controls extracted and indexed with pgvector embeddings for AI RAG evaluation.
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold text-slate-800">Total Controls: {inspectControlsList.length}</span>
                <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                  pgvector indexed
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 pr-1">
            {loadingControls ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                <p className="text-xs">Loading extracted controls from PostgreSQL...</p>
              </div>
            ) : inspectControlsList.length > 0 ? (
              inspectControlsList.map((ctrl) => (
                <div key={ctrl.id} className="py-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {ctrl.control_code}
                      </span>
                      <h4 className="font-bold text-xs text-slate-900">{ctrl.title}</h4>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {ctrl.category || 'General'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-sans">
                    {ctrl.requirement || ctrl.description || ctrl.title}
                  </p>
                  {ctrl.guidance && (
                    <p className="text-[11px] text-slate-400 italic">
                      Guidance: {ctrl.guidance}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                No controls extracted for this framework version yet.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
            <button
              onClick={() => setInspectingFramework(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

