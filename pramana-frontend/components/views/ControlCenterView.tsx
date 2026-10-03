'use client';

import React, { useState } from 'react';
import { useApp } from '../../lib/context';
import { StatusBadge } from '../ui/Badge';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  ChevronRight,
  Eye,
  Layers
} from 'lucide-react';
import { FrameworkId } from '../../types';
import { getPageAccess, getAccessBadge } from '../../lib/rbac';

export const ControlCenterView: React.FC = () => {
  const { controlsList, activeFrameworkFilter, setActiveFrameworkFilter, setSelectedControlId, reviewQueueList, setSelectedReviewItem, activeUser } = useApp();

  const access = getPageAccess(activeUser.role, 'controls');
  const accessBadge = getAccessBadge(access);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCoverage, setSelectedCoverage] = useState<string>('all');

  const filteredControls = controlsList.filter((ctrl) => {
    // RBAC Scoping: only show controls assigned to this role, hide the others
    if (access === 'Assigned controls' || access === 'View assigned' || access === 'Assigned only') {
      const isAssigned = ctrl.category.toLowerCase().includes('access') || ctrl.category.toLowerCase().includes('identity') || ctrl.category.toLowerCase().includes('security') || ctrl.category.toLowerCase().includes('annex');
      if (!isAssigned) return false;
    }

    const matchesFramework = activeFrameworkFilter === 'all' || ctrl.framework === activeFrameworkFilter;
    const matchesSearch = ctrl.title.toLowerCase().includes(searchTerm.toLowerCase()) || ctrl.id.toLowerCase().includes(searchTerm.toLowerCase()) || ctrl.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCoverage = selectedCoverage === 'all' || ctrl.coverageState === selectedCoverage;

    return matchesFramework && matchesSearch && matchesCoverage;
  });

  const total = controlsList.length;
  const fullCoverage = controlsList.filter((c) => c.coverageState === 'full').length;
  const partialCoverage = controlsList.filter((c) => c.coverageState === 'partial').length;
  const noCoverage = controlsList.filter((c) => c.coverageState === 'none').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Role Access Scope Notice */}
      {access === 'Assigned controls' && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Assigned Controls Ownership ({activeUser.roleTitle}): </span>
              <span>Displaying controls specifically assigned to your engineering domain. You are responsible for evidence submission and gap remediation.</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-white text-amber-800 font-bold border border-amber-200 text-[10px] shrink-0">
            Assigned Controls
          </span>
        </div>
      )}

      {access === 'View assigned' && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">Contributor View ({activeUser.roleTitle}): </span>
              <span>Inspect control specifications and requirements where you are assigned to contribute evidence files.</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-white text-emerald-700 font-bold border border-emerald-200 text-[10px] shrink-0">
            View Assigned
          </span>
        </div>
      )}

      {access === 'Assigned only' && (
        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <span className="font-bold">Audit Scope Controls ({activeUser.roleTitle}): </span>
              <span>Controls designated under the active third-party audit window.</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-white text-indigo-700 font-bold border border-indigo-200 text-[10px] shrink-0">
            Assigned Only
          </span>
        </div>
      )}

      {access === 'View/Review' && (
        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-950 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
            <div>
              <span className="font-bold">Internal Audit Review Mode: </span>
              <span>Evaluate control implementation effectiveness, review evidence links, and verify AI explanations.</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-white text-sky-700 font-bold border border-sky-200 text-[10px] shrink-0">
            View / Review
          </span>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Control Center
          </h1>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${accessBadge.badgeClass}`}>
            {accessBadge.label}
          </span>
        </div>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Unified compliance control registry mapped across international standards with human auditor verification.
        </p>
      </div>

      {/* Framework Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'all', label: 'All Frameworks' },
          { id: 'iso-27001', label: 'ISO 27001:2022' },
          { id: 'soc-2', label: 'SOC 2 Type II' },
          { id: 'pci-dss', label: 'PCI DSS v4.0' },
          { id: 'dpdp', label: 'DPDP Act 2023' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFrameworkFilter(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeFrameworkFilter === tab.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Controls</p>
            <p className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5">{total}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Coverage</p>
            <p className="text-2xl font-extrabold text-emerald-600 font-mono mt-0.5">{fullCoverage}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Partial Coverage</p>
            <p className="text-2xl font-extrabold text-amber-600 font-mono mt-0.5">{partialCoverage}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Not Covered</p>
            <p className="text-2xl font-extrabold text-rose-600 font-mono mt-0.5">{noCoverage}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search control ID, code, or name..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedCoverage}
            onChange={(e) => setSelectedCoverage(e.target.value)}
            className="w-full sm:w-48 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">All Coverage States</option>
            <option value="full">Full Coverage</option>
            <option value="partial">Partial Coverage</option>
            <option value="none">Not Covered</option>
          </select>
        </div>
      </div>

      {/* Controls Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4">Control ID</th>
                <th className="py-3.5 px-4">Control Specification Title</th>
                <th className="py-3.5 px-4">Framework</th>
                <th className="py-3.5 px-4">Evidence Count</th>
                <th className="py-3.5 px-4">Coverage</th>
                <th className="py-3.5 px-4">AI Confidence</th>
                <th className="py-3.5 px-4">Auditor Decision</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredControls.map((ctrl) => {
                const reviewItem = reviewQueueList.find((r) => r.controlId === ctrl.id);

                return (
                  <tr
                    key={ctrl.id}
                    onClick={() => setSelectedControlId(ctrl.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-extrabold text-indigo-600">
                      {ctrl.id}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{ctrl.title}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-md">{ctrl.category}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {ctrl.framework.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {ctrl.mappedEvidenceCount} files
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full border ${
                        ctrl.coverageState === 'full'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : ctrl.coverageState === 'partial'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {ctrl.coverageState}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge type="ai_suggestion" size="sm">
                        {ctrl.aiConfidence}%
                      </StatusBadge>
                    </td>

                    <td className="py-3.5 px-4">
                      {ctrl.auditorDecision === 'approved' ? (
                        <StatusBadge type="human_decision" size="sm">
                          Auditor Approved
                        </StatusBadge>
                      ) : (
                        <StatusBadge type="pending_human_review" size="sm">
                          Pending Review
                        </StatusBadge>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedControlId(ctrl.id)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {reviewItem && reviewItem.status === 'pending_review' && (
                          <button
                            onClick={() => setSelectedReviewItem(reviewItem)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Auditor Review"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredControls.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold">No controls found for this organization.</p>
          </div>
        )}
      </div>
    </div>
  );
};
