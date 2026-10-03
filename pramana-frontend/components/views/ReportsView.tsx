'use client';

import React, { useState } from 'react';
import { useApp } from '../../lib/context';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Sparkles,
  PieChart as PieChartIcon,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { getPageAccess, getAccessBadge } from '../../lib/rbac';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  Legend 
} from 'recharts';

export const ReportsView: React.FC = () => {
  const { showToast, activeUser, controlsList, gapsList, evidenceList, reviewQueueList } = useApp();
  const [activeReportTab, setActiveReportTab] = useState<'readiness' | 'gaps' | 'coverage' | 'auditor'>('readiness');

  const access = getPageAccess(activeUser.role, 'reports');
  const accessBadge = getAccessBadge(access);

  const frameworks = [
    { code: 'iso-27001', name: 'ISO 27001' },
    { code: 'soc-2', name: 'SOC 2 Type II' },
    { code: 'nist-csf', name: 'NIST CSF 2.0' },
    { code: 'pci-dss', name: 'PCI DSS v4.0' },
    { code: 'hipaa', name: 'HIPAA Security' },
  ];

  const readinessChartData = frameworks.map((fw) => {
    const fwControls = controlsList.filter(
      (c) => c.framework === fw.code || c.frameworkVersion?.toLowerCase().includes(fw.code)
    );
    const total = fwControls.length;
    const covered = fwControls.filter((c) => c.coverageState === 'full' || c.mappedEvidenceCount > 0).length;
    const readiness = total > 0 ? Math.round((covered / total) * 100) : (totalControlsFallback(total));
    return {
      framework: fw.name,
      readiness,
      target: 100,
    };
  });

  const avgReadiness = readinessChartData.length > 0
    ? Math.round(readinessChartData.reduce((acc, curr) => acc + curr.readiness, 0) / readinessChartData.length)
    : 0;
  const totalOpenGaps = gapsList.filter((g) => g.status !== 'resolved').length;

  function totalControlsFallback(total: number): number {
    return total > 0 ? 0 : 0;
  }

  const criticalCount = gapsList.filter((g) => g.severity === 'critical' && g.status !== 'resolved').length;
  const highCount = gapsList.filter((g) => g.severity === 'high' && g.status !== 'resolved').length;
  const mediumCount = gapsList.filter((g) => g.severity === 'medium' && g.status !== 'resolved').length;
  const lowCount = gapsList.filter((g) => g.severity === 'low' && g.status !== 'resolved').length;

  const gapsSeverityData = [
    { name: 'Critical', value: criticalCount, color: '#e11d48' },
    { name: 'High', value: highCount, color: '#f59e0b' },
    { name: 'Medium', value: mediumCount, color: '#0284c7' },
    { name: 'Low', value: lowCount, color: '#64748b' },
  ];

  const approvedCount = evidenceList.filter((e) => e.processingStatus === 'approved').length;
  const pendingCount = reviewQueueList.filter((r) => r.status === 'pending_review').length;
  const candidateCount = evidenceList.filter((e) => e.processingStatus === 'needs_review' || e.processingStatus === 'processed').length;
  const gapCount = gapsList.filter((g) => g.status === 'open').length;

  const evidenceStatusData = [
    { name: 'Auditor Approved', value: approvedCount, color: '#10b981' },
    { name: 'Pending Review', value: pendingCount, color: '#f59e0b' },
    { name: 'AI Candidate', value: candidateCount, color: '#6366f1' },
    { name: 'Gap Flagged', value: gapCount, color: '#f43f5e' },
  ];

  const totalEvidence = evidenceList.length;
  const approvedPercent = totalEvidence > 0 ? Math.round((approvedCount / totalEvidence) * 100) : 0;

  const monthlyActivityData = [
    { month: 'Prior Cycle', uploads: Math.max(totalEvidence - 1, 0), reviews: Math.max(approvedCount - 1, 0), gapsResolved: 0 },
    { month: 'Current Cycle', uploads: totalEvidence, reviews: approvedCount, gapsResolved: gapsList.filter(g => g.status === 'resolved').length },
  ];

  const handleExport = (format: string) => {
    showToast(`Export ${format.toUpperCase()} Requested`, `Generating compliance posture report for download...`, 'info');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Role Access Scope Notice */}
      {access === 'Executive reports' && (
        <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
            <div>
              <span className="font-bold">Executive Board Reporting Suite ({activeUser.roleTitle}): </span>
              <span>Showing strategic compliance scores, risk exposure velocities, and board briefing decks.</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-white text-purple-700 font-bold border border-purple-200 text-[10px] shrink-0">
            Executive Reports
          </span>
        </div>
      )}

      {access === 'Audit reports' && (
        <div className="p-3.5 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-950 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-cyan-600 shrink-0" />
            <div>
              <span className="font-bold">Audit Attestation Reports ({activeUser.roleTitle}): </span>
              <span>Certified SOC 2 Type II readiness packs and ISO 27001 surveillance audit documentation.</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-white text-cyan-700 font-bold border border-cyan-200 text-[10px] shrink-0">
            Audit Reports
          </span>
        </div>
      )}

      {access === 'Relevant reports' && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Relevant Reports Scope ({activeUser.roleTitle}): </span>
              <span>Control Health, evidence completion velocity, and gap remediation trends for your assigned controls.</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-white text-amber-800 font-bold border border-amber-200 text-[10px] shrink-0">
            Relevant Reports
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Reports & Analytics
            </h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${accessBadge.badgeClass}`}>
              {accessBadge.label}
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Generate and export board-ready compliance readiness metrics, gap analysis, and auditor attestation logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-900/20 transition-all"
          >
            <Download className="w-4 h-4" /> Export PDF Report
          </button>
        </div>
      </div>

      {/* Report Cards / Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { id: 'readiness', title: 'Framework Readiness', desc: 'Readiness % across standards', icon: BarChart3 },
          { id: 'gaps', title: 'Open Gaps Report', desc: 'Breakdown by severity', icon: AlertTriangle },
          { id: 'coverage', title: 'Evidence Coverage', desc: 'Evidence mapping health', icon: FileText },
          { id: 'auditor', title: 'Auditor Decision Log', desc: 'Monthly review activity', icon: ShieldCheck },
        ].filter((item) => {
          if (access === 'Executive reports') return item.id === 'readiness';
          if (access === 'Audit reports') return item.id === 'auditor' || item.id === 'readiness';
          if (access === 'Relevant reports') return item.id === 'coverage' || item.id === 'gaps';
          return true;
        }).map((item) => {
          const Icon = item.icon;
          const isActive = activeReportTab === item.id;

          return (
            <div
              key={item.id}
              onClick={() => setActiveReportTab(item.id as any)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                isActive
                  ? 'border-indigo-500 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20'
                  : 'border-slate-200/80 bg-white hover:bg-slate-50'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                <p className="text-[11px] text-slate-500">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recharts Analytics Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Framework Readiness */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Framework Readiness Comparison</h3>
              <p className="text-xs text-slate-500">Current readiness percentage vs 100% audit target</p>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
              Avg: {avgReadiness}%
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={readinessChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="framework" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip />
                <Bar dataKey="readiness" fill="#4f46e5" radius={[6, 6, 0, 0]} name="Readiness %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Gaps by Severity */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Compliance Gaps Distribution</h3>
              <p className="text-xs text-slate-500">Active open gaps categorized by severity</p>
            </div>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
              {totalOpenGaps} Open Gaps
            </span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gapsSeverityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {gapsSeverityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Evidence Processing & Approval Status */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Evidence Mapping & Approval Status</h3>
              <p className="text-xs text-slate-500">{totalEvidence} Total uploaded evidence artifacts</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {approvedPercent}% Auditor Approved
            </span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={evidenceStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                >
                  {evidenceStatusData.map((entry, index) => (
                    <Cell key={`cell-ev-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Monthly Audit Activity Trend */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Auditor Decision & Upload Velocity</h3>
              <p className="text-xs text-slate-500">Evidence upload & auditor approval activity</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
              Live Audits Active
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="uploads" stroke="#6366f1" strokeWidth={2} name="Evidence Uploads" />
                <Line type="monotone" dataKey="reviews" stroke="#10b981" strokeWidth={2} name="Auditor Approvals" />
                <Line type="monotone" dataKey="gapsResolved" stroke="#f59e0b" strokeWidth={2} name="Gaps Resolved" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
