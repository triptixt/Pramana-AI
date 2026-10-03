'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../lib/context';
import { api } from '../../lib/api';
import { ProgressBar } from '../ui/ProgressBar';
import { StatusBadge } from '../ui/Badge';
import {
  Layers,
  Plus,
  ChevronRight,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Table as TableIcon,
  Check,
  X,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  FileText,
  Sliders,
  Info
} from 'lucide-react';
import { FrameworkId } from '../../types';
import { getPageAccess, getAccessBadge } from '../../lib/rbac';

interface FrameworkVersionMeta {
  id: number;
  version: string;
  authority: string;
  effective_date: string;
  status: string;
  source_url: string;
}

interface RealFramework {
  id: number;
  name: string;
  code: string;
  description: string;
  versions: FrameworkVersionMeta[];
}

export const FrameworksView: React.FC = () => {
  const { setActiveFrameworkFilter, setActiveView, showToast, activeUser } = useApp();

  const access = getPageAccess(activeUser.role, 'frameworks');
  const accessBadge = getAccessBadge(access);

  const [activeTab, setActiveTab] = useState<'registry' | 'matrix'>('registry');
  const [realFrameworks, setRealFrameworks] = useState<RealFramework[]>([]);
  const [activeFrameworkIds, setActiveFrameworkIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [matrixData, setMatrixData] = useState<any>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [selectedCell, setSelectedCell] = useState<any>(null);
  const [comparingCode, setComparingCode] = useState<string | null>(null);
  const [comparisonModalData, setComparisonModalData] = useState<any | null>(null);

  const handleRunFrameworkComparison = async (frameworkCode: string) => {
    try {
      setComparingCode(frameworkCode);
      showToast('AI Framework Audit Started', `Ollama is assessing tenant evidence against ${frameworkCode.toUpperCase()} controls...`, 'info');
      const res = await api.compliance.compareFramework({ framework_code_or_id: frameworkCode });
      setComparisonModalData(res);
      showToast('Audit Complete', `${frameworkCode.toUpperCase()} assessment ready: ${res.compliance_score || 0}% score.`, 'success');
    } catch (err: any) {
      showToast('Framework Audit Failed', err.message, 'error');
    } finally {
      setComparingCode(null);
    }
  };

  // Load Frameworks and Org Selections from backend
  const loadFrameworkData = async () => {
    try {
      setLoading(true);
      const [fws, orgFws] = await Promise.all([
        api.compliance.getFrameworks().catch(() => null),
        api.compliance.getOrganizationFrameworks().catch(() => null)
      ]);

      if (fws && Array.isArray(fws) && fws.length > 0) {
        setRealFrameworks(fws);
      }
      if (orgFws && Array.isArray(orgFws)) {
        setActiveFrameworkIds(orgFws.map((of: any) => of.framework_id));
      }
    } catch (err: any) {
      console.warn('Failed to load compliance frameworks from API:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Cross-Framework Comparison Matrix
  const loadMatrixData = async () => {
    try {
      setMatrixLoading(true);
      const res = await api.compliance.getCrossFrameworkMatrix(['nist-csf', 'iso-27001', 'soc-2']);
      setMatrixData(res);
    } catch (err: any) {
      console.warn('Failed to load cross-framework matrix:', err);
      showToast('Matrix Error', 'Could not load cross-framework comparison matrix.', 'error');
    } finally {
      setMatrixLoading(false);
    }
  };

  useEffect(() => {
    loadFrameworkData();
  }, []);

  useEffect(() => {
    if (activeTab === 'matrix' && !matrixData) {
      loadMatrixData();
    }
  }, [activeTab]);

  // Handle Organization Framework Activation Toggle
  const handleToggleFramework = async (frameworkId: number, versionId: number, currentlyActive: boolean) => {
    if (access !== 'Full') {
      showToast('Permission Denied', 'Your role cannot modify organization frameworks.', 'warning');
      return;
    }

    try {
      const res = await api.compliance.toggleFramework({
        framework_id: frameworkId,
        framework_version_id: versionId,
        active: !currentlyActive
      });

      if (currentlyActive) {
        setActiveFrameworkIds(prev => prev.filter(id => id !== frameworkId));
      } else {
        setActiveFrameworkIds(prev => [...prev, frameworkId]);
      }

      showToast(
        !currentlyActive ? 'Framework Enrolled' : 'Framework Deactivated',
        `${res.framework} is now ${res.status} for your organization.`,
        'success'
      );
    } catch (err: any) {
      showToast('Toggle Failed', err.message || 'Could not update framework selection.', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Role Access Scope Notice */}
      {access === 'Summary' && (
        <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
            <div>
              <span className="font-bold">Executive Framework Summary ({activeUser.roleTitle}): </span>
              <span>Displaying readiness completion percentages and high-level certification status across active standards.</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-white text-purple-700 font-bold border border-purple-200 text-[10px] shrink-0">
            Summary
          </span>
        </div>
      )}

      {access === 'View assigned' && (
        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <span className="font-bold">Assigned Audit Frameworks ({activeUser.roleTitle}): </span>
              <span>Frameworks enrolled under the active third-party certification audit.</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-white text-indigo-700 font-bold border border-indigo-200 text-[10px] shrink-0">
            View Assigned
          </span>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Compliance Frameworks
            </h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${accessBadge.badgeClass}`}>
              {accessBadge.label}
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Authoritative, recognized compliance standards evaluated against organizational evidence.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-1 bg-slate-100/80 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('registry')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'registry'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Framework Registry
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'matrix'
                ? 'bg-white text-indigo-600 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-indigo-600'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" /> Comparison Matrix
          </button>
        </div>
      </div>

      {/* ── TAB 1: FRAMEWORK REGISTRY ─────────────────────────────────── */}
      {activeTab === 'registry' && (
        <div className="space-y-6">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
              Loading compliance frameworks from database...
            </div>
          ) : realFrameworks.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <Layers className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              No compliance frameworks registered in the database.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {realFrameworks.map((fw: any) => {
              const latestVer = fw.versions && fw.versions.length > 0 ? fw.versions[0] : null;
              const isEnrolled = activeFrameworkIds.includes(fw.id) || (typeof fw.id === 'string' && fw.id === 'iso-27001');

              return (
                <div
                  key={fw.id}
                  className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-extrabold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200">
                        {fw.code || fw.id} {latestVer ? `(v${latestVer.version})` : `(${fw.version || '2022'})`}
                      </span>

                      {/* Enrollment Toggle */}
                      {access === 'Full' && latestVer ? (
                        <button
                          onClick={() => handleToggleFramework(fw.id, latestVer.id, isEnrolled)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                            isEnrolled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {isEnrolled ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" /> Active
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" /> Enroll
                            </>
                          )}
                        </button>
                      ) : (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isEnrolled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isEnrolled ? 'Enrolled' : 'Available'}
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg font-bold text-slate-900">{fw.name}</h2>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{fw.description}</p>
                  </div>

                  {/* Metadata and Authority */}
                  <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                    {latestVer && (
                      <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Authority:</span>
                          <span className="text-slate-800 font-bold text-right truncate max-w-[170px]" title={latestVer.authority}>
                            {latestVer.authority}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Effective Date:</span>
                          <span className="text-slate-800 font-mono">{latestVer.effective_date}</span>
                        </div>
                        {latestVer.source_url && (
                          <div className="flex justify-between pt-1 border-t border-slate-200/60">
                            <span className="text-slate-500 font-medium">Source:</span>
                            <a
                              href={latestVer.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                            >
                              Official Publication <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <button
                        onClick={() => handleRunFrameworkComparison(fw.code)}
                        disabled={comparingCode === fw.code}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-xs font-semibold text-white hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        title="Evaluate all controls in this framework against organizational evidence"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${comparingCode === fw.code ? 'animate-spin' : ''}`} />
                        {comparingCode === fw.code ? 'Auditing with Ollama...' : 'Run AI Framework Audit'}
                      </button>

                      <button
                        onClick={() => {
                          setActiveFrameworkFilter(
                            typeof fw.id === 'string' && ['iso-27001', 'soc-2', 'pci-dss'].includes(fw.id)
                              ? (fw.id as FrameworkId)
                              : ('iso-27001' as FrameworkId)
                          );
                          setActiveView('controls');
                        }}
                        className="w-full py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center justify-center gap-1.5"
                      >
                        Inspect Controls <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      )}

      {/* ── TAB 2: CROSS-FRAMEWORK COMPARISON MATRIX ───────────────────── */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          {/* Matrix Header Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Authoritative Cross-Framework Posture Matrix</h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-[10px] font-bold border border-indigo-400/30">
                  NIST IR 8477 Aligned
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Side-by-side compliance evaluation comparing your organization evidence against ISO/IEC 27001:2022, NIST CSF 2.0, and SOC 2 Type II controls.
              </p>
            </div>

            <button
              onClick={() => loadMatrixData()}
              disabled={matrixLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all cursor-pointer self-start sm:self-auto shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${matrixLoading ? 'animate-spin' : ''}`} />
              {matrixLoading ? 'Analyzing...' : 'Refresh Matrix'}
            </button>
          </div>

          {/* Matrix Table */}
          {matrixLoading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Evaluating Control Evidence Across Frameworks...</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                RAG is matching your evidence chunks against authoritative requirements in NIST CSF 2.0, ISO 27001, and SOC 2.
              </p>
            </div>
          ) : matrixData && matrixData.matrix ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-4 px-5 min-w-[220px]">Security & Compliance Domain</th>
                      {matrixData.frameworks.map((fw: any) => (
                        <th key={fw.code} className="py-4 px-5 min-w-[240px]">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-900">{fw.name}</span>
                            <span className="text-[10px] text-indigo-600 font-mono font-bold lowercase">
                              v{fw.version} • {fw.code}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {matrixData.matrix.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-5 align-top">
                          <div className="font-bold text-slate-900 text-sm">{row.domain}</div>
                          <span className="text-[11px] text-slate-500">Crosswalk Domain #{idx + 1}</span>
                        </td>

                        {matrixData.frameworks.map((fw: any) => {
                          const evalItem = row.framework_evaluations[fw.code];
                          if (!evalItem) {
                            return (
                              <td key={fw.code} className="py-4 px-5 align-top text-slate-400">
                                Not Mapped
                              </td>
                            );
                          }

                          const isCompliant = evalItem.status === 'COMPLIANT';
                          const isPartial = evalItem.status === 'PARTIALLY_COMPLIANT';
                          const isInsufficient = evalItem.status === 'INSUFFICIENT_EVIDENCE';

                          return (
                            <td key={fw.code} className="py-4 px-5 align-top">
                              <div
                                onClick={() => setSelectedCell({ ...evalItem, framework: fw.name, domain: row.domain })}
                                className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer space-y-2"
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="font-mono font-extrabold text-xs text-slate-800">
                                    {evalItem.control_code}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      isCompliant
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                        : isPartial
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                        : isInsufficient
                                        ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                                    }`}
                                  >
                                    {isCompliant
                                      ? 'Compliant'
                                      : isPartial
                                      ? 'Partial'
                                      : isInsufficient
                                      ? 'No Evidence'
                                      : evalItem.status}
                                  </span>
                                </div>

                                <div className="text-[11px] text-slate-600 font-medium line-clamp-1">
                                  {evalItem.control_title}
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/50">
                                  <span>Confidence: {Math.round((evalItem.confidence || 0) * 100)}%</span>
                                  <span className="font-semibold text-indigo-600">
                                    {evalItem.evidence_count} evidence doc{evalItem.evidence_count === 1 ? '' : 's'}
                                  </span>
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <p className="text-slate-500 text-sm">No matrix data available. Click "Refresh Matrix" to calculate.</p>
            </div>
          )}

          {/* Traceability Modal */}
          {selectedCell && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                      {selectedCell.framework}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {selectedCell.control_code}: {selectedCell.control_title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedCell(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-slate-500 font-bold block text-[11px]">Domain:</span>
                    <span className="text-slate-800 font-semibold">{selectedCell.domain}</span>
                  </div>

                  <div className="p-3 bg-indigo-50/60 rounded-xl space-y-1">
                    <span className="text-indigo-900 font-bold block text-[11px]">Audit Assessment:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">Status:</span>
                      <span className="font-extrabold text-indigo-700">{selectedCell.status}</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-bold text-slate-800">Confidence:</span>
                      <span className="font-extrabold text-indigo-700">
                        {Math.round((selectedCell.confidence || 0) * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-slate-500 font-bold block text-[11px]">Supporting Evidence:</span>
                    <p className="text-slate-700 leading-relaxed">
                      {selectedCell.evidence_count > 0
                        ? `${selectedCell.evidence_count} authoritative evidence document(s) verified via semantic RAG.`
                        : 'No evidence documents matching this requirement currently exist in your organizational vault.'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setSelectedCell(null)}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comparison Modal Overlay */}
      {comparisonModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {comparisonModalData.framework?.name || 'Framework'} Audit Report
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Version: {comparisonModalData.framework?.version || 'Latest'} • Authority: {comparisonModalData.framework?.authority || 'Standard Body'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setComparisonModalData(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score & Summary */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between shrink-0">
              <div>
                <span className="text-xs text-indigo-900 font-bold uppercase tracking-wider block">Compliance Health</span>
                <span className="text-2xl font-extrabold text-indigo-700 font-mono">
                  {comparisonModalData.compliance_score || 0}% Compliant
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Evaluated Controls</span>
                <span className="text-xs font-semibold text-slate-700 font-mono">
                  {comparisonModalData.evaluations?.length || 0} controls audited
                </span>
              </div>
            </div>

            {/* Controls List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {comparisonModalData.evaluations?.map((ev: any, evIdx: number) => (
                <div key={evIdx} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-indigo-600">{ev.control_code}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      ev.status === 'compliant'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {ev.status} ({Math.round((ev.confidence || 0) * 100)}%)
                    </span>
                  </div>
                  <p className="font-medium text-slate-800">{ev.control_title}</p>
                  {ev.findings && (
                    <p className="text-slate-600 text-[11px] leading-relaxed bg-slate-50 p-2 rounded-lg">
                      {ev.findings}
                    </p>
                  )}
                  {ev.remediation && (
                    <p className="text-amber-800 text-[11px] leading-relaxed bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                      <span className="font-bold">Remediation:</span> {ev.remediation}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end shrink-0">
              <button
                onClick={() => setComparisonModalData(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Close Audit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
