'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../lib/context';
import { api } from '../../lib/api';
import {
  Layers,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  Table as TableIcon,
  X,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { FrameworkId } from '../../types';

interface FrameworkVersionMeta {
  id: number;
  version: string;
  authority: string;
  effective_date: string;
  status: string;
  source_url: string;
  total_controls?: number;
}

interface RealFramework {
  id: number;
  name: string;
  code: string;
  description: string;
  category?: string;
  version?: string;
  status?: string;
  total_controls?: number;
  is_active?: boolean;
  versions: FrameworkVersionMeta[];
}

export const FrameworksView: React.FC = () => {
  const { setActiveFrameworkFilter, setActiveView, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'registry' | 'matrix'>('registry');
  const [realFrameworks, setRealFrameworks] = useState<RealFramework[]>([]);
  const [loading, setLoading] = useState(true);
  const [matrixData, setMatrixData] = useState<any>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [selectedCell, setSelectedCell] = useState<any>(null);

  // Load Frameworks from backend
  const loadFrameworkData = async () => {
    if (!api.auth.getToken()) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const fws = await api.compliance.getFrameworks().catch(() => null);

      if (fws && Array.isArray(fws) && fws.length > 0) {
        setRealFrameworks(fws);
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

  const getFrameworkKey = (codeOrName: string): FrameworkId => {
    const raw = (codeOrName || '').toUpperCase();
    if (raw.includes('DPDP')) return 'dpdp';
    if (raw.includes('NIST') || raw.includes('CSF')) return 'nist-csf';
    if (raw.includes('SOC')) return 'soc-2';
    if (raw.includes('PCI')) return 'pci-dss';
    if (raw.includes('ISO') || raw.includes('27001')) return 'iso-27001';
    return 'iso-27001';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Compliance Frameworks
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Standard Catalog
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Authoritative compliance standards evaluated against organization evidence in real-time.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-1 bg-slate-100/80 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('registry')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'registry'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Framework Registry
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
              Loading compliance frameworks from PostgreSQL...
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

                return (
                  <div
                    key={fw.id}
                    className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-5"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-extrabold px-3 py-1 rounded-lg border text-indigo-600 bg-indigo-50 border-indigo-200">
                          {fw.code || fw.id} {latestVer ? `(v${latestVer.version})` : `(${fw.version || '2022'})`}
                        </span>
                        <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-600">
                          Standard
                        </span>
                      </div>

                      <div>
                        <h2 className="text-lg font-bold text-slate-900">
                          {fw.name}
                        </h2>
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mt-1">{fw.description}</p>
                      </div>
                    </div>

                    {/* Metadata, Authority & Analysis Controls */}
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
                                Official Standard <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Primary Navigation Action */}
                      <button
                        onClick={() => {
                          const targetFw = getFrameworkKey(fw.code || fw.name || fw.id);
                          setActiveFrameworkFilter(targetFw);
                          setActiveView('controls');
                        }}
                        className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-slate-500" />
                        <span>Inspect & Map Controls</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
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
                RAG is matching your evidence chunks against authoritative requirements in active framework versions.
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
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
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
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

