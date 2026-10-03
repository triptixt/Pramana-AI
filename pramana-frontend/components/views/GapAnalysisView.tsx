'use client';

import React, { useState } from 'react';
import { useApp } from '../../lib/context';
import { StatusBadge } from '../ui/Badge';
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  FilePlus2,
  Check
} from 'lucide-react';
import { GapItem, GapSeverity, GapStatus } from '../../types';
import { getPageAccess, getAccessBadge } from '../../lib/rbac';

export const GapAnalysisView: React.FC = () => {
  const { gapsList, resolveGap, setIsUploadModalOpen, setSelectedGapId, activeUser, runAIGapAnalysis } = useApp();

  const access = getPageAccess(activeUser.role, 'gaps');
  const accessBadge = getAccessBadge(access);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isRunningAI, setIsRunningAI] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);

  const handleRunAIGap = async () => {
    try {
      setIsRunningAI(true);
      const res = await runAIGapAnalysis();
      setAiResult(res);
    } catch {
      // Toast already displayed in context
    } finally {
      setIsRunningAI(false);
    }
  };

  const filteredGaps = gapsList.filter((g) => {
    // RBAC scoping
    if (access === 'Assigned gaps' || access === 'Assigned actions') {
      const isOwner = g.owner.toLowerCase().includes(activeUser.name.split(' ')[0].toLowerCase());
      if (!isOwner) return false;
    }

    const matchesSearch = g.title.toLowerCase().includes(searchTerm.toLowerCase()) || g.controlId.toLowerCase().includes(searchTerm.toLowerCase()) || g.owner.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = selectedSeverity === 'all' || g.severity === selectedSeverity;
    const matchesStatus = selectedStatus === 'all' || g.status === selectedStatus;

    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const totalOpen = gapsList.filter((g) => g.status !== 'resolved').length;
  const criticalCount = gapsList.filter((g) => g.severity === 'critical' && g.status !== 'resolved').length;
  const highCount = gapsList.filter((g) => g.severity === 'high' && g.status !== 'resolved').length;
  const mediumCount = gapsList.filter((g) => g.severity === 'medium' && g.status !== 'resolved').length;
  const resolvedMonth = gapsList.filter((g) => g.status === 'resolved').length;

  const [resolvingGapId, setResolvingGapId] = useState<string | null>(null);
  const [remediationNote, setRemediationNote] = useState('');

  const handleResolveSubmit = (gapId: string) => {
    if (!remediationNote.trim()) return;
    resolveGap(gapId, remediationNote);
    setResolvingGapId(null);
    setRemediationNote('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* RBAC Scoped Scope Banner */}
      {access === 'Summary' && (
        <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-purple-600 shrink-0" />
            <div>
              <span className="font-bold">Executive Gap Summary Mode ({activeUser.roleTitle}): </span>
              <span>Displaying high-level risk exposure, severity trends, and remediation velocities for executive reporting. Technical remediation actions are restricted.</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-white text-purple-700 font-bold border border-purple-200 text-[10px] shrink-0">
            Executive Summary
          </span>
        </div>
      )}

      {access === 'Assigned gaps' && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Assigned Gaps Ownership ({activeUser.roleTitle}): </span>
              <span>Showing compliance gaps specifically impacting your owned controls and infrastructure components.</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-white text-amber-800 font-bold border border-amber-200 text-[10px] shrink-0">
            Assigned Gaps
          </span>
        </div>
      )}

      {access === 'Assigned actions' && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">Assigned Actions ({activeUser.roleTitle}): </span>
              <span>Showing tactical remediation actions and missing evidence files assigned to you.</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-white text-emerald-700 font-bold border border-emerald-200 text-[10px] shrink-0">
            Assigned Actions
          </span>
        </div>
      )}

      {access === 'Assigned only' && (
        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <span className="font-bold">Audit Scope Findings ({activeUser.roleTitle}): </span>
              <span>Open non-conformities and remediation items under the active audit scope.</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-white text-indigo-700 font-bold border border-indigo-200 text-[10px] shrink-0">
            Assigned Only
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              {access === 'Summary' ? 'Executive Gap Risk Summary' : 'Gap Analysis & Remediation'}
            </h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${accessBadge.badgeClass}`}>
              {accessBadge.label}
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            {access === 'Summary'
              ? 'Executive overview of compliance risk exposure, severity breakdown, and remediation trajectory.'
              : 'Automated compliance gap detection, severity tracking, and remediation workflows across all active frameworks.'}
          </p>
        </div>

        <button
          onClick={handleRunAIGap}
          disabled={isRunningAI}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white text-xs font-bold hover:from-indigo-700 hover:to-violet-800 disabled:opacity-50 transition-all shadow-md shadow-indigo-600/25 shrink-0"
        >
          <Sparkles className={`w-4 h-4 ${isRunningAI ? 'animate-spin' : 'animate-pulse'}`} />
          {isRunningAI ? 'Evaluating with Ollama...' : 'Run AI Gap Analysis'}
        </button>
      </div>

      {/* Live AI Gap Analysis Banner if Available */}
      {aiResult && (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-violet-50/50 to-slate-50 border border-indigo-200 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
              <span>Pramana AI Engine Assessment (Run #{aiResult.run_id})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                Compliance Score: {aiResult.compliance_score}%
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                Ollama Local RAG
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-indigo-100">
            {aiResult.summary}
          </p>

          {aiResult.gaps && aiResult.gaps.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-indigo-950 block">
                Detected Framework Gaps ({aiResult.gaps.length}):
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {aiResult.gaps.map((g: any, gIdx: number) => (
                  <div key={gIdx} className="p-2.5 rounded-xl bg-white border border-rose-100 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-rose-700">{g.control_code}</span>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                        {g.severity}
                      </span>
                    </div>
                    <p className="font-medium text-slate-800 text-[11px]">{g.findings}</p>
                    {g.recommendation && (
                      <p className="text-slate-500 text-[10px] italic">Rec: {g.recommendation}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Open Gaps</p>
            <p className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5">{totalOpen}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Critical Severity</p>
            <p className="text-2xl font-extrabold text-rose-600 font-mono mt-0.5">{criticalCount}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">High Severity</p>
            <p className="text-2xl font-extrabold text-amber-600 font-mono mt-0.5">{highCount}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Medium Severity</p>
            <p className="text-2xl font-extrabold text-sky-600 font-mono mt-0.5">{mediumCount}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolved This Month</p>
            <p className="text-2xl font-extrabold text-emerald-600 font-mono mt-0.5">{resolvedMonth}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search gaps, control ID, or owner..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_remediation">In Remediation</option>
            <option value="needs_verification">Needs Verification</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Gap Cards List */}
      <div className="space-y-4">
        {filteredGaps.map((gap) => (
          <div
            key={gap.id}
            className={`p-5 rounded-2xl bg-white border transition-all space-y-4 shadow-xs ${gap.status === 'resolved'
              ? 'border-emerald-200/80 bg-emerald-50/20'
              : gap.severity === 'critical'
                ? 'border-rose-200/90'
                : 'border-slate-200/80'
              }`}
          >
            {/* Header Line */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <StatusBadge severity={gap.severity} size="sm" />
                <span className="font-mono text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                  {gap.controlId}
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase">{gap.framework}</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" /> Owner: <strong>{gap.owner}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Due: <strong>{gap.dueDate}</strong>
                </span>
              </div>
            </div>

            {/* Gap Title & AI Breakdown */}
            <div>
              <h3 className="text-base font-bold text-slate-900">{gap.title}</h3>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 mt-2 space-y-1">
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Why Identified by Pramana AI:
                </p>
                <p className="text-slate-600 leading-relaxed">{gap.whyIdentified}</p>
              </div>
            </div>

            {/* Actionable Remediation Guidance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/80">
                <p className="font-bold text-amber-900 mb-1">Missing Evidence / Configuration:</p>
                <p className="text-amber-800">{gap.missingInfo}</p>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200/80">
                <p className="font-bold text-indigo-950 mb-1">Recommended Remediation Action:</p>
                <p className="text-indigo-900">{gap.recommendedAction}</p>
              </div>
            </div>

            {/* Resolution Form or Actions */}
            {gap.status === 'resolved' ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">Resolved by Compliance Team</p>
                  {gap.remediationNotes && <p className="text-[11px] text-emerald-700 italic">"{gap.remediationNotes}"</p>}
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                  >
                    <FilePlus2 className="w-4 h-4" />
                    Upload Evidence File
                  </button>
                </div>

                {resolvingGapId === gap.id ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      value={remediationNote}
                      onChange={(e) => setRemediationNote(e.target.value)}
                      placeholder="Enter resolution notes..."
                      className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
                    />
                    <button
                      onClick={() => handleResolveSubmit(gap.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700"
                    >
                      Confirm
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setResolvingGapId(gap.id)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 shadow-xs transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Mark Gap Resolved
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {filteredGaps.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
            <p className="text-sm font-semibold text-slate-700">No open compliance gaps!</p>
            <p className="text-xs text-slate-400 mt-1">All frameworks are maintaining active evidence coverage.</p>
          </div>
        )}
      </div>
    </div>
  );
};
