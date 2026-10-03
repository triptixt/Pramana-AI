'use client';

import React from 'react';
import { useApp } from '../../lib/context';
import { StatusBadge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import {
  BarChart3,
  TrendingUp,
  FileCheck,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Calendar,
  AlertCircle
} from 'lucide-react';


import { getPageAccess, getAccessBadge, hasPageAccess } from '../../lib/rbac';

export const OverviewView: React.FC = () => {
  const {
    activeUser,
    setActiveView,
    setIsUploadModalOpen,
    evidenceList,
    controlsList,
    gapsList,
    reviewQueueList,
    auditTrailList,
    setActiveFrameworkFilter,
    setSelectedEvidenceId,
    setSelectedReviewItem
  } = useApp();

  const access = getPageAccess(activeUser.role, 'overview');
  const accessBadge = getAccessBadge(access);

  const totalControls = controlsList.length;
  const coveredControls = controlsList.filter(
    (c) => c.coverageState === 'full' || c.mappedEvidenceCount > 0
  ).length;
  const readinessPercent = totalControls > 0 ? Math.round((coveredControls / totalControls) * 100) : 0;
  const pendingReviewsCount = reviewQueueList.filter((r) => r.status === 'pending_review').length;
  const openGapsCount = gapsList.filter((g) => g.status === 'open' || g.status === 'in_remediation').length;
  const highPriorityGaps = gapsList.filter((g) => (g.severity === 'critical' || g.severity === 'high') && g.status !== 'resolved');

  return (
    <div className="space-y-6 pb-12">
      {/* Role Access Scope Notice if Limited or View */}
      {access === 'Limited' && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Scoped Overview Active ({activeUser.roleTitle}): </span>
              <span>
                Displaying metrics and control health scoped strictly to your assigned controls and designated engagement boundaries.
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-white text-amber-800 font-bold border border-amber-200 text-[10px] shrink-0">
            Limited Scope
          </span>
        </div>
      )}

      {access === 'View' && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <span className="font-bold">Executive / Auditor View Mode: </span>
              <span>High-level compliance overview. Administrative configuration controls are read-only.</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-white text-blue-800 font-bold border border-blue-200 text-[10px] shrink-0">
            View Only
          </span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Hi, {activeUser.name.split(' ')[0]} 👋
            </h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${accessBadge.badgeClass}`}>
              {accessBadge.label}
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Real-time compliance posture across ISO 27001, SOC 2, NIST CSF, PCI DSS & HIPAA.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasPageAccess(activeUser.role, 'reports') && (
            <button
              onClick={() => setActiveView('reports')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-xs text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs"
            >
              <BarChart3 className="w-4 h-4 text-slate-500" />
              View Reports
            </button>
          )}
        </div>
      </div>

      {/* Audit Readiness Banner */}
      <div className="p-5 md:p-6 rounded-2xl bg-indigo-700 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              <span>Real-Time Compliance Audit Status</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              {readinessPercent}% of active compliance framework controls covered
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Pramana AI analyzed {totalControls} controls across active frameworks. Auditor verification is active for {pendingReviewsCount} pending review items.
            </p>
          </div>

          <div className="w-full lg:w-72 bg-slate-800/80 backdrop-blur-md p-4 rounded-xl border border-slate-700/80 space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-300">Framework Coverage Status</span>
              <span className="text-emerald-400 font-mono">{readinessPercent}%</span>
            </div>
            <ProgressBar value={readinessPercent} color="emerald" size="md" />
            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>Target: SOC 2 & ISO Audit</span>
              <span>{coveredControls} / {totalControls} Controls</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Readiness</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">{readinessPercent}%</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Active
            </span>
          </div>
          <p className="text-xs text-slate-500">Across verified compliance frameworks</p>
        </div>

        {/* KPI 2 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Evidence Coverage</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">{coveredControls}</span>
            <span className="text-xs font-semibold text-slate-500">/ {totalControls} controls</span>
          </div>
          <ProgressBar value={readinessPercent} color="emerald" size="sm" />
        </div>

        {/* KPI 3 */}
        <div
          onClick={() => setActiveView('review-queue')}
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Reviews</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">{pendingReviewsCount}</span>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Auditor Queue
            </span>
          </div>
          <p className="text-xs text-indigo-600 font-semibold group-hover:underline flex items-center gap-1">
            Review auditor queue <ChevronRight className="w-3.5 h-3.5" />
          </p>
        </div>

        {/* KPI 4 */}
        <div
          onClick={() => setActiveView('gaps')}
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open Gaps</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">{openGapsCount}</span>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              {highPriorityGaps.length} High Priority
            </span>
          </div>
          <p className="text-xs text-rose-600 font-semibold group-hover:underline flex items-center gap-1">
            View gap analysis <ChevronRight className="w-3.5 h-3.5" />
          </p>
        </div>
      </div>


      {/* Lower Section: Activity Feed & Priority Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Priority Actions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Priority Actions Required</h3>
            <span className="text-xs text-slate-500">Live items requiring attention</span>
          </div>

          <div className="space-y-3">
            {highPriorityGaps.length > 0 ? (
              highPriorityGaps.slice(0, 2).map((gap) => (
                <div key={gap.id} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">{gap.title}</h4>
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">Due {gap.dueDate}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{gap.whyIdentified}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs">
                      {hasPageAccess(activeUser.role, 'gaps') && (
                        <button onClick={() => setActiveView('gaps')} className="font-semibold text-rose-600 hover:underline">
                          View Gap & Remediate →
                        </button>
                      )}
                      <span className="text-slate-400">• Owner: {gap.owner}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-xs text-emerald-800 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">No High Priority Compliance Gaps: </span>
                  <span>Active framework controls have been mapped or are currently compliant.</span>
                </div>
              </div>
            )}

            {pendingReviewsCount > 0 ? (
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">{pendingReviewsCount} Evidence Item(s) Awaiting Auditor Review</h4>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Pending</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    AI suggestions generated from uploaded documents awaiting human-in-the-loop verification.
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    {hasPageAccess(activeUser.role, 'review-queue') && (
                      <button onClick={() => setActiveView('review-queue')} className="font-semibold text-amber-700 hover:underline">
                        Go to Auditor Review Queue →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Upload evidence prompt if library is empty or needed */}
            {(getPageAccess(activeUser.role, 'evidence') === 'Full' || getPageAccess(activeUser.role, 'evidence') === 'Create/Upload') && (
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">Upload New Compliance Evidence</h4>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">Active</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Submit audit reports, security policies, architecture diagrams, or logs for automated AI parsing.
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <button onClick={() => setIsUploadModalOpen(true)} className="font-semibold text-indigo-600 hover:underline">
                      Upload Document →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Recent Audit Trail Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Recent Audit Activity</h3>
            {hasPageAccess(activeUser.role, 'audit-trail') && (
              <button
                onClick={() => setActiveView('audit-trail')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Full Trail
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-4 divide-y divide-slate-100">
            {auditTrailList.length > 0 ? (
              auditTrailList.slice(0, 4).map((log) => (
                <div key={log.id} className="pt-3 first:pt-0 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{log.action}</span>
                    <span className="text-[10px] text-slate-400">{log.timestamp.split(' ')[1]}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{log.details}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                    <span>By: {log.actor.name}</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">
                No recent audit activity for this organization.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
