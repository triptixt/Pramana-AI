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
import { getPageAccess } from '../../lib/rbac';

export const ControlCenterView: React.FC = () => {
  const { controlsList, activeFrameworkFilter, setActiveFrameworkFilter, setSelectedControlId, reviewQueueList, setSelectedReviewItem, activeUser } = useApp();

  const access = getPageAccess(activeUser.role, 'controls');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCoverage, setSelectedCoverage] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(20);

  // Dynamic framework tabs
  const frameworkTabs = [
    { id: 'all', label: 'All Frameworks', count: controlsList.length },
    { id: 'iso-27001', label: 'ISO 27001:2022', count: controlsList.filter(c => c.framework === 'iso-27001').length },
    { id: 'soc-2', label: 'SOC 2 Type II', count: controlsList.filter(c => c.framework === 'soc-2').length },
    { id: 'nist-csf', label: 'NIST CSF 2.0', count: controlsList.filter(c => c.framework === 'nist-csf').length },
    { id: 'pci-dss', label: 'PCI DSS v4.0', count: controlsList.filter(c => c.framework === 'pci-dss').length },
    { id: 'dpdp', label: 'DPDP Act 2023', count: controlsList.filter(c => c.framework === 'dpdp').length },
  ];

  const filteredControls = controlsList.filter((ctrl) => {
    // RBAC Scoping: only show controls assigned to this role when restricted
    if (access === 'Assigned controls' || access === 'View assigned' || access === 'Assigned only') {
      const isAssigned = ctrl.category.toLowerCase().includes('access') || ctrl.category.toLowerCase().includes('identity') || ctrl.category.toLowerCase().includes('security') || ctrl.category.toLowerCase().includes('annex') || ctrl.category.toLowerCase().includes('protect');
      if (!isAssigned) return false;
    }

    const matchesFramework = activeFrameworkFilter === 'all' || ctrl.framework === activeFrameworkFilter;
    const matchesSearch = 
      ctrl.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      ctrl.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      ctrl.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ctrl.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCoverage = selectedCoverage === 'all' || ctrl.coverageState === selectedCoverage;

    return matchesFramework && matchesSearch && matchesCoverage;
  });

  const total = controlsList.length;
  const fullCoverage = controlsList.filter((c) => c.coverageState === 'full').length;
  const partialCoverage = controlsList.filter((c) => c.coverageState === 'partial').length;
  const noCoverage = controlsList.filter((c) => c.coverageState === 'none').length;

  // Pagination calculation
  const effectivePageSize = pageSize === 'all' ? filteredControls.length : pageSize;
  const totalPages = effectivePageSize > 0 ? Math.ceil(filteredControls.length / effectivePageSize) : 1;
  const validCurrentPage = Math.min(Math.max(currentPage, 1), Math.max(totalPages, 1));
  const startIndex = (validCurrentPage - 1) * (pageSize === 'all' ? filteredControls.length : pageSize);
  const endIndex = pageSize === 'all' ? filteredControls.length : startIndex + pageSize;
  const paginatedControls = filteredControls.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Control Center
          </h1>
        </div>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Unified compliance control registry mapped across international standards ({total} total controls available).
        </p>
      </div>

      {/* Framework Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 custom-scrollbar">
        {frameworkTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveFrameworkFilter(tab.id as any);
              setCurrentPage(1);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeFrameworkFilter === tab.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeFrameworkFilter === tab.id
                ? 'bg-indigo-700 text-white'
                : 'bg-slate-200 text-slate-700'
            }`}>
              {tab.count}
            </span>
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
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search control ID, code, or name..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedCoverage}
            onChange={(e) => {
              setSelectedCoverage(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full sm:w-44 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">All Coverage States</option>
            <option value="full">Full Coverage</option>
            <option value="partial">Partial Coverage</option>
            <option value="none">Not Covered</option>
          </select>

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value));
              setCurrentPage(1);
            }}
            className="w-full sm:w-36 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
            <option value="all">View All (78)</option>
          </select>
        </div>
      </div>

      {/* Controls Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4">Control Code</th>
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
              {paginatedControls.map((ctrl) => {
                const reviewItem = reviewQueueList.find((r) => r.controlId === ctrl.id);

                return (
                  <tr
                    key={ctrl.id}
                    onClick={() => setSelectedControlId(ctrl.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-extrabold text-indigo-600">
                      {ctrl.code || ctrl.id}
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
            <p className="text-sm font-semibold">No controls found for the selected framework or filters.</p>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredControls.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-100 text-xs text-slate-500 bg-slate-50/50">
            <div>
              Showing <span className="font-bold text-slate-800">{startIndex + 1}</span> to{' '}
              <span className="font-bold text-slate-800">{Math.min(endIndex, filteredControls.length)}</span> of{' '}
              <span className="font-bold text-slate-800">{filteredControls.length}</span> controls
            </div>

            {pageSize !== 'all' && totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  disabled={validCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 font-medium text-slate-700 cursor-pointer"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    onClick={() => setCurrentPage(pg)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      validCurrentPage === pg
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'border border-slate-200 hover:bg-white text-slate-700'
                    }`}
                  >
                    {pg}
                  </button>
                ))}
                <button
                  disabled={validCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 font-medium text-slate-700 cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
