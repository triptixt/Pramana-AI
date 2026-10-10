'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../lib/context';
import { Search, FileText, ShieldCheck, AlertTriangle, Users, Building2, ArrowRight, X, Layers } from 'lucide-react';
import { ActiveView } from '../../types';
import { hasPageAccess, getPageAccess } from '../../lib/rbac';

export const GlobalSearchModal: React.FC = () => {
  const {
    isSearchOpen,
    setIsSearchOpen,
    evidenceList,
    controlsList,
    gapsList,
    organizations,
    usersList,
    setActiveView,
    setSelectedEvidenceId,
    setSelectedControlId,
    setSelectedGapId,
    activeUser,
    switchOrganization
  } = useApp();

  const [query, setQuery] = useState('');

  const isSuperAdmin = activeUser.role === 'super_admin';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  if (!isSearchOpen) return null;

  const q = query.trim().toLowerCase();

  // 1. Search Organizations (for Super Admin or Tenant user)
  const filteredOrgs = q
    ? (organizations || []).filter(
        (o) =>
          (o.name && o.name.toLowerCase().includes(q)) ||
          (o.id && o.id.toLowerCase().includes(q))
      )
    : [];

  // 2. Search Users
  const filteredUsers = q
    ? (usersList || []).filter(
        (u) =>
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.role && u.role.toLowerCase().includes(q)) ||
          (u.roleTitle && u.roleTitle.toLowerCase().includes(q))
      )
    : [];

  // 3. Search Evidence
  const canViewEvidence = hasPageAccess(activeUser.role, 'evidence');
  const filteredEvidence = (q && canViewEvidence)
    ? (evidenceList || []).filter((e) => {
        const access = getPageAccess(activeUser.role, 'evidence');
        if (access === 'Assigned only') {
          const isAuditorScope = activeUser.role === 'external_auditor';
          const isOwnerMatch = e.owner && e.owner.toLowerCase().includes((activeUser.name || '').split(' ')[0].toLowerCase());
          if (!isAuditorScope && !isOwnerMatch) return false;
        }
        return (
          (e.name && e.name.toLowerCase().includes(q)) ||
          (e.fileName && e.fileName.toLowerCase().includes(q)) ||
          (e.extractedTextExcerpt && e.extractedTextExcerpt.toLowerCase().includes(q)) ||
          (e.aiReasoning && e.aiReasoning.toLowerCase().includes(q))
        );
      })
    : [];

  // 4. Search Controls
  const canViewControls = hasPageAccess(activeUser.role, 'controls');
  const filteredControls = (q && canViewControls)
    ? (controlsList || []).filter((c) => {
        return (
          (c.title && c.title.toLowerCase().includes(q)) ||
          (c.id && c.id.toLowerCase().includes(q)) ||
          (c.code && c.code.toLowerCase().includes(q)) ||
          (c.category && c.category.toLowerCase().includes(q)) ||
          (c.requirementText && c.requirementText.toLowerCase().includes(q))
        );
      })
    : [];

  // 5. Search Gaps
  const canViewGaps = hasPageAccess(activeUser.role, 'gaps');
  const filteredGaps = (q && canViewGaps)
    ? (gapsList || []).filter((g) => {
        const access = getPageAccess(activeUser.role, 'gaps');
        if (access === 'Assigned gaps' || access === 'Assigned actions') {
          const isOwner = g.owner && g.owner.toLowerCase().includes((activeUser.name || '').split(' ')[0].toLowerCase());
          if (!isOwner) return false;
        }
        return (
          (g.title && g.title.toLowerCase().includes(q)) ||
          (g.id && g.id.toLowerCase().includes(q)) ||
          (g.whyIdentified && g.whyIdentified.toLowerCase().includes(q)) ||
          (g.recommendedAction && g.recommendedAction.toLowerCase().includes(q))
        );
      })
    : [];

  const handleSelect = (view: ActiveView, id?: string, type?: 'evidence' | 'control' | 'gap' | 'org' | 'user') => {
    setActiveView(view);
    if (type === 'evidence' && id) setSelectedEvidenceId(id);
    if (type === 'control' && id) setSelectedControlId(id);
    if (type === 'gap' && id) setSelectedGapId(id);
    setIsSearchOpen(false);
    setQuery('');
  };

  const hasResults =
    filteredOrgs.length > 0 ||
    filteredUsers.length > 0 ||
    filteredEvidence.length > 0 ||
    filteredControls.length > 0 ||
    filteredGaps.length > 0;

  return (
    <div
      onClick={() => setIsSearchOpen(false)}
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]"
      >
        {/* Search Bar Input */}
        <div className="flex items-center px-4 border-b border-slate-200 bg-slate-50/70 shrink-0">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isSuperAdmin
                ? 'Search organizations, platform users, evidence, controls, gaps...'
                : 'Search evidence files, controls, gaps, team...'
            }
            className="w-full py-4 px-3 bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none text-sm font-medium"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {!q && (
            <div className="text-center py-8 text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-500">
                {isSuperAdmin
                  ? 'Type to search across all tenant vaults, users, frameworks, and controls'
                  : 'Type a search query to scan compliance repository'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Try searching by organization name, email, control code, or keyword</p>
            </div>
          )}

          {q && !hasResults && (
            <div className="text-center py-8 text-slate-500">
              <p className="text-xs font-semibold">No matching records found for "{query}".</p>
            </div>
          )}

          {/* Organizations (Super Admin or Tenant) */}
          {filteredOrgs.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Organizations ({filteredOrgs.length})
              </h4>
              <div className="space-y-1">
                {filteredOrgs.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      if (isSuperAdmin) {
                        handleSelect('super-admin', org.id, 'org');
                      } else {
                        switchOrganization(org.id);
                        handleSelect('overview');
                      }
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100/80 text-left transition-colors group cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">{org.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">Tenant ID: {org.id.replace('org-', '') || org.id}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Users */}
          {filteredUsers.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-600" /> Users ({filteredUsers.length})
              </h4>
              <div className="space-y-1">
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSelect(isSuperAdmin ? 'super-admin' : 'settings', u.id, 'user')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100/80 text-left transition-colors group cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-amber-600">{u.name}</p>
                      <p className="text-[11px] text-slate-500">{u.email} • Role: {u.roleTitle || u.role}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-1" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Evidence Results */}
          {filteredEvidence.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" /> Evidence Library ({filteredEvidence.length})
              </h4>
              <div className="space-y-1">
                {filteredEvidence.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => handleSelect('evidence', ev.id, 'evidence')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100/80 text-left transition-colors group cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">{ev.name}</p>
                      <p className="text-[11px] text-slate-500">{ev.fileName} • {ev.fileSize || 'Vault File'} • Owner: {ev.owner}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Control Results */}
          {filteredControls.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Controls ({filteredControls.length})
              </h4>
              <div className="space-y-1">
                {filteredControls.map((ctrl) => (
                  <button
                    key={ctrl.id}
                    onClick={() => handleSelect('controls', ctrl.id, 'control')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100/80 text-left transition-colors group cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-600">
                        <span className="font-mono text-indigo-600 mr-2">{ctrl.id}</span>
                        {ctrl.title}
                      </p>
                      <p className="text-[11px] text-slate-500">{ctrl.category} • Review Status: {ctrl.reviewStatus || 'Active'}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-1" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Gap Results */}
          {filteredGaps.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Compliance Gaps ({filteredGaps.length})
              </h4>
              <div className="space-y-1">
                {filteredGaps.map((gap) => (
                  <button
                    key={gap.id}
                    onClick={() => handleSelect('gaps', gap.id, 'gap')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100/80 text-left transition-colors group cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-rose-600">{gap.title}</p>
                      <p className="text-[11px] text-slate-500">Control: {gap.controlId} • Severity: {String(gap.severity || 'medium').toUpperCase()}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-transform group-hover:translate-x-1" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 px-4 shrink-0">
          <span>Click to select result</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
};

