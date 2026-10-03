'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../lib/context';
import { Search, FileText, ShieldCheck, AlertTriangle, Users, ArrowRight, X } from 'lucide-react';
import { ActiveView } from '../../types';
import { hasPageAccess, getPageAccess } from '../../lib/rbac';

export const GlobalSearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, evidenceList, controlsList, gapsList, setActiveView, setSelectedEvidenceId, setSelectedControlId, setSelectedGapId, activeUser } = useApp();
  const [query, setQuery] = useState('');

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

  const canViewEvidence = hasPageAccess(activeUser.role, 'evidence');
  const canViewControls = hasPageAccess(activeUser.role, 'controls');
  const canViewGaps = hasPageAccess(activeUser.role, 'gaps');

  const filteredEvidence = (query.trim() && canViewEvidence)
    ? evidenceList.filter((e) => {
        const access = getPageAccess(activeUser.role, 'evidence');
        if (access === 'Assigned only') {
          const isAuditorScope = activeUser.role === 'external_auditor' || activeUser.role === 'auditor';
          const isOwnerMatch = e.owner.toLowerCase().includes(activeUser.name.split(' ')[0].toLowerCase());
          if (!isAuditorScope && !isOwnerMatch) return false;
        }
        return e.name.toLowerCase().includes(query.toLowerCase()) || e.fileName.toLowerCase().includes(query.toLowerCase());
      })
    : [];

  const filteredControls = (query.trim() && canViewControls)
    ? controlsList.filter((c) => {
        return c.title.toLowerCase().includes(query.toLowerCase()) || c.id.toLowerCase().includes(query.toLowerCase()) || c.code.toLowerCase().includes(query.toLowerCase());
      })
    : [];

  const filteredGaps = (query.trim() && canViewGaps)
    ? gapsList.filter((g) => {
        const access = getPageAccess(activeUser.role, 'gaps');
        if (access === 'Assigned gaps' || access === 'Assigned actions') {
          const isOwner = g.owner.toLowerCase().includes(activeUser.name.split(' ')[0].toLowerCase());
          if (!isOwner) return false;
        }
        return g.title.toLowerCase().includes(query.toLowerCase()) || g.id.toLowerCase().includes(query.toLowerCase());
      })
    : [];

  const handleSelect = (view: ActiveView, id?: string, type?: 'evidence' | 'control' | 'gap') => {
    setActiveView(view);
    if (type === 'evidence' && id) setSelectedEvidenceId(id);
    if (type === 'control' && id) setSelectedControlId(id);
    if (type === 'gap' && id) setSelectedGapId(id);
    setIsSearchOpen(false);
    setQuery('');
  };

  const hasResults = filteredEvidence.length > 0 || filteredControls.length > 0 || filteredGaps.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Search Bar Input */}
        <div className="flex items-center px-4 border-b border-slate-200 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search evidence files, controls, gaps, or team members..."
            className="w-full py-4 px-3 bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none text-base font-medium"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {!query.trim() && (
            <div className="text-center py-8 text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">Type a search query to scan Pramana compliance repository...</p>
              <p className="text-xs text-slate-400 mt-1">Try searching "AWS", "Okta", "ISO", "Penetration", "Encryption"</p>
            </div>
          )}

          {query.trim() && !hasResults && (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm font-medium">No matching evidence, controls, or gaps found for "{query}".</p>
            </div>
          )}

          {/* Evidence Results */}
          {filteredEvidence.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" /> Evidence Library ({filteredEvidence.length})
              </h4>
              <div className="space-y-1">
                {filteredEvidence.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => handleSelect('evidence', ev.id, 'evidence')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100/80 text-left transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600">{ev.name}</p>
                      <p className="text-xs text-slate-500">{ev.fileName} • {ev.fileSize} • Owner: {ev.owner}</p>
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
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Controls ({filteredControls.length})
              </h4>
              <div className="space-y-1">
                {filteredControls.map((ctrl) => (
                  <button
                    key={ctrl.id}
                    onClick={() => handleSelect('controls', ctrl.id, 'control')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100/80 text-left transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-emerald-600">
                        <span className="font-mono text-indigo-600 mr-2">{ctrl.id}</span>
                        {ctrl.title}
                      </p>
                      <p className="text-xs text-slate-500">{ctrl.category} • Review Status: {ctrl.reviewStatus}</p>
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
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Compliance Gaps ({filteredGaps.length})
              </h4>
              <div className="space-y-1">
                {filteredGaps.map((gap) => (
                  <button
                    key={gap.id}
                    onClick={() => handleSelect('gaps', gap.id, 'gap')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100/80 text-left transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-rose-600">{gap.title}</p>
                      <p className="text-xs text-slate-500">Control: {gap.controlId} • Severity: {gap.severity.toUpperCase()}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-transform group-hover:translate-x-1" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 px-4">
          <span>Navigate with arrow keys or click</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
};
