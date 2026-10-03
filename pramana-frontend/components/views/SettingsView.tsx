'use client';

import React, { useState } from 'react';
import { useApp } from '../../lib/context';
import {
  Building2,
  Lock,
  Bell,
  Layers,
  CheckCircle2,
  ShieldCheck,
  Globe,
  Save,
  Key,
  Database,
  Cloud,
  Check,
  AlertCircle,
  Sparkles,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { getPageAccess, getAccessBadge } from '../../lib/rbac';
import { api } from '../../lib/api';

export const SettingsView: React.FC = () => {
  const { showToast, activeUser } = useApp();
  const [activeTab, setActiveTab] = useState<'org' | 'security' | 'notifs' | 'integrations' | 'ai'>('org');

  const [aiHealth, setAiHealth] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const fetchAiHealth = async () => {
    try {
      setLoadingAi(true);
      const res = await api.ai.checkHealth();
      setAiHealth(res);
    } catch (err: any) {
      setAiHealth({ status: 'offline', error: err.message });
    } finally {
      setLoadingAi(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'ai' && !aiHealth) {
      fetchAiHealth();
    }
  }, [activeTab]);

  const access = getPageAccess(activeUser.role, 'settings');
  const accessBadge = getAccessBadge(access);

  // Org state
  const [orgName, setOrgName] = useState('Acme Technologies Inc.');
  const [industry, setIndustry] = useState('B2B SaaS / Cloud Infrastructure');
  const [auditPeriod, setAuditPeriod] = useState('Annual Q3 Audit Window');

  // Notification toggles
  const [notifState, setNotifState] = useState({
    newEvidence: true,
    reviewRequired: true,
    gapDueDate: true,
    evidenceRejected: true,
    weeklyDigest: false,
  });

  const handleSave = () => {
    showToast('Settings Saved', 'Organization profile & security preferences updated successfully.', 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Role Access Scope Notice if Admin (Limited) */}
      {access === 'Admin/limited' && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">GRC Compliance Manager: Admin (Limited) Scope — </span>
              <span>
                You have administrative authority over organization details, notification policies, and integrations. Root platform deletion and cryptographic key rotation require full CISO credentials.
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-white text-amber-800 font-bold border border-amber-200 text-[10px] shrink-0">
            Admin / Limited
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Organization Settings
            </h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${accessBadge.badgeClass}`}>
              {accessBadge.label}
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Configure tenant security, SAML SSO, evidence notifications, and integrations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-900/20 hover:from-indigo-700 hover:to-indigo-800 transition-all shrink-0 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'org', label: 'Organization Profile', icon: Building2 },
          { id: 'security', label: 'Security & Authentication', icon: Lock },
          { id: 'notifs', label: 'Notification Preferences', icon: Bell },
          { id: 'integrations', label: 'Cloud Integrations', icon: Cloud },
          { id: 'ai', label: 'AI Engine & Ollama', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Organization Profile */}
      {activeTab === 'org' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-6 max-w-3xl">
          <h3 className="text-sm font-bold text-slate-900">Organization Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Organization Legal Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Industry Vertical</label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Current Audit Cycle Window</label>
            <input
              type="text"
              value={auditPeriod}
              onChange={(e) => setAuditPeriod(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Default Framework Scope</label>
            <div className="flex flex-wrap gap-2 pt-1">
              {['ISO/IEC 27001:2022', 'SOC 2 Type II', 'PCI DSS v4.0', 'DPDP Act 2023'].map((fw) => (
                <span key={fw} className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold font-mono">
                  {fw}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Security & Authentication */}
      {activeTab === 'security' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-6 max-w-3xl">
          <h3 className="text-sm font-bold text-slate-900">Tenant Security Controls</h3>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Multi-Factor Authentication (MFA)</h4>
                <p className="text-xs text-slate-500">Enforce WebAuthn / TOTP MFA for all workspace members</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">Enforced</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Single Sign-On (SAML 2.0 / Okta)</h4>
                <p className="text-xs text-slate-500">Enterprise SSO domain binding (@acme.com)</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 font-bold text-xs">Active</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Session Timeout Policy</h4>
                <p className="text-xs text-slate-500">Automatically terminate idle auditor sessions after 15 minutes</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-800 font-bold text-xs">15 Mins</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Notifications */}
      {activeTab === 'notifs' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4 max-w-3xl">
          <h3 className="text-sm font-bold text-slate-900">Email & Alert Settings</h3>

          {[
            { key: 'newEvidence', label: 'New Evidence Upload Alerts', desc: 'Notify GRC team when new security documents are uploaded' },
            { key: 'reviewRequired', label: 'Auditor Review Needed', desc: 'Alert assigned auditor when AI generates high-confidence control mapping' },
            { key: 'gapDueDate', label: 'Gap Remediation Due Alerts', desc: 'Send reminders 3 days before a gap remediation deadline' },
            { key: 'evidenceRejected', label: 'Auditor Rejection Alerts', desc: 'Notify uploader if auditor rejects candidate mapping' },
            { key: 'weeklyDigest', label: 'Weekly Executive Compliance Digest', desc: 'Send CISO weekly summary report on audit readiness progress' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50">
              <div>
                <h4 className="text-xs font-bold text-slate-900">{item.label}</h4>
                <p className="text-[11px] text-slate-500">{item.desc}</p>
              </div>

              <button
                onClick={() =>
                  setNotifState((prev) => ({ ...prev, [item.key]: !(prev as any)[item.key] }))
                }
                className={`w-11 h-6 rounded-full transition-colors relative ${(notifState as any)[item.key] ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${(notifState as any)[item.key] ? 'left-6' : 'left-1'
                    }`}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Cloud Integrations */}
      {activeTab === 'integrations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
          {[
            { name: 'Amazon Web Services (AWS)', category: 'Cloud Infrastructure', status: 'Connected', icon: Cloud },
            { name: 'Okta Identity Cloud', category: 'IdP & SSO Policy', status: 'Connected', icon: Lock },
            { name: 'Google Workspace Drive', category: 'Document Storage', status: 'Available', icon: Database },
            { name: 'Atlassian Jira Software', category: 'Task Remediation', status: 'Available', icon: Layers },
            { name: 'Slack Compliance Alerts', category: 'Messaging Notifications', status: 'Coming Soon', icon: Bell },
            { name: 'GitHub Enterprise Security', category: 'Code Repositories', status: 'Coming Soon', icon: Key },
          ].map((int) => {
            const Icon = int.icon;
            const isConnected = int.status === 'Connected';

            return (
              <div key={int.name} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{int.name}</h4>
                    <p className="text-[10px] text-slate-400">{int.category}</p>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${isConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : int.status === 'Available'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                  {int.status}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 5: AI Engine & Ollama Configuration */}
      {activeTab === 'ai' && (
        <div className="space-y-6 max-w-4xl">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Local Ollama AI Runtime</h3>
                  <p className="text-xs text-slate-500">
                    On-premise LLM inference and embeddings with zero third-party data transmission.
                  </p>
                </div>
              </div>

              <button
                onClick={fetchAiHealth}
                disabled={loadingAi}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAi ? 'animate-spin' : ''}`} />
                Check Status
              </button>
            </div>

            {aiHealth ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Service Status</span>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${aiHealth.status === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <span className="font-bold text-xs text-slate-800 capitalize font-mono">{aiHealth.status}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Configured LLM</span>
                    <span className="font-bold text-xs text-indigo-700 font-mono mt-1 block">
                      {aiHealth.configured_model || 'qwen2.5:7b'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Embeddings Model</span>
                    <span className="font-bold text-xs text-indigo-700 font-mono mt-1 block">
                      {aiHealth.configured_embed_model || 'nomic-embed-text'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-medium">Ollama Endpoint URL:</span>
                    <span className="font-mono text-slate-800">{aiHealth.ollama_base_url || 'http://localhost:11434'}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-medium">LLM Model Loaded:</span>
                    <span className={`font-semibold ${aiHealth.model_ready ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {aiHealth.model_ready ? '✓ Ready (In GPU Memory)' : '⚠ Loading / Standby'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-medium">Embedding Engine:</span>
                    <span className={`font-semibold ${aiHealth.embed_model_ready ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {aiHealth.embed_model_ready ? '✓ Ready' : '⚠ Loading / Standby'}
                    </span>
                  </div>
                </div>

                {aiHealth.installed_models && aiHealth.installed_models.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Installed Local Models ({aiHealth.installed_models.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {aiHealth.installed_models.map((m: string, mIdx: number) => (
                        <span
                          key={mIdx}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-mono font-medium text-slate-700 shadow-2xs"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                Click "Check Status" to query local Ollama engine.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
