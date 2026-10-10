'use client';

import React, { useState } from 'react';
import { useApp } from '../../lib/context';
import { StatusBadge } from '../ui/Badge';
import { 
  ShieldCheck, 
  Sparkles, 
  AlertTriangle, 
  FileText, 
  Clock, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  FilePlus2, 
  Lock,
  Filter,
  Eye,
  MessageSquare
} from 'lucide-react';
import { ReviewQueueItem } from '../../types';
import { getPageAccess } from '../../lib/rbac';

export const ReviewQueueView: React.FC = () => {
  const { reviewQueueList, setSelectedReviewItem, setSelectedEvidenceId, activeUser } = useApp();

  const access = getPageAccess(activeUser.role, 'review-queue');

  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'high_confidence' | 'low_confidence' | 'evidence_requested'>('all');

  const filteredQueue = reviewQueueList.filter((item) => {
    // RBAC scoping
    if (access === 'Assigned items') {
      const isAuditorMatch = item.assignedAuditor.toLowerCase().includes(activeUser.name.split(' ')[0].toLowerCase());
      if (!isAuditorMatch) return false;
    }

    if (activeFilter === 'pending') return item.status === 'pending_review';
    if (activeFilter === 'high_confidence') return item.aiConfidence >= 90;
    if (activeFilter === 'low_confidence') return item.aiConfidence < 90;
    if (activeFilter === 'evidence_requested') return item.status === 'evidence_requested';
    return true;
  });

  const pendingCount = reviewQueueList.filter((r) => r.status === 'pending_review').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Auditor Review Queue
          </h1>
        </div>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Authorized human auditor decision portal for validating AI-suggested compliance control mappings.
        </p>
      </div>

      {/* Prominent Mandatory Compliance Governance Banner */}
      <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-50 border border-amber-300/80 text-amber-950 flex items-start gap-3.5 shadow-xs">
        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 border border-amber-200">
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
            <span>Mandatory Auditor Control Governance Principle</span>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900">
              ISO/SOC2 Standard
            </span>
          </h3>
          <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
            <strong>AI-generated mappings are candidate suggestions only.</strong> Final compliance certification & control verification decisions must always remain under the explicit authority of authorized human auditors.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'all', label: `All Items (${reviewQueueList.length})` },
          { id: 'pending', label: `Pending Review (${pendingCount})` },
          { id: 'high_confidence', label: 'High AI Confidence (>90%)' },
          { id: 'low_confidence', label: 'Low AI Confidence (<90%)' },
          { id: 'evidence_requested', label: 'Evidence Requested' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeFilter === tab.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Review Queue Cards */}
      <div className="space-y-4">
        {filteredQueue.map((item) => {
          const isApproved = item.status === 'approved';
          const isRejected = item.status === 'rejected';

          return (
            <div
              key={item.id}
              className={`p-5 rounded-2xl bg-white border transition-all space-y-4 shadow-xs ${
                isApproved
                  ? 'border-emerald-200/80 bg-emerald-50/20'
                  : isRejected
                  ? 'border-rose-200/80 bg-rose-50/20'
                  : 'border-slate-200/80 hover:border-indigo-300'
              }`}
            >
              {/* Top Meta Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                    {item.controlId}
                  </span>
                  <span className="text-xs font-bold text-slate-900">{item.controlTitle}</span>
                  <span className="text-xs text-slate-400 font-mono uppercase">({item.framework})</span>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge type={item.decisionType} size="sm">
                    {isApproved
                      ? `Human Decision (${item.humanDecisionBy || 'Auditor'})`
                      : isRejected
                      ? `Rejected by Auditor`
                      : `AI Suggestion (${item.aiConfidence}%)`}
                  </StatusBadge>
                </div>
              </div>

              {/* Evidence File Info & AI Reasoning */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Evidence Artifact info */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Evidence Artifact</span>
                  <p className="font-bold text-slate-900 text-xs truncate">{item.evidenceName}</p>
                  <p className="text-[11px] text-slate-500">Assigned Auditor: {item.assignedAuditor}</p>
                  <button
                    onClick={() => setSelectedEvidenceId(item.evidenceId)}
                    className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center gap-1 mt-1"
                  >
                    Inspect Document <Eye className="w-3 h-3" />
                  </button>
                </div>

                {/* AI Reasoning */}
                <div className="md:col-span-2 p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/70 to-violet-50/40 border border-indigo-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> AI Mapping Reasoning
                    </span>
                    <span className="text-[11px] font-bold text-indigo-700">Confidence: {item.aiConfidence}%</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{item.aiReasoning}</p>
                </div>
              </div>

              {/* Document Excerpt & Potential Concerns */}
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 font-mono text-[11px] text-slate-700">
                  <span className="text-slate-400 font-sans font-bold block mb-0.5">Extracted Clause Excerpt:</span>
                  <p className="italic text-slate-800">"{item.evidenceExcerpt}"</p>
                </div>

                {item.potentialConcerns && (
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>AI Pre-Audit Flag:</strong> {item.potentialConcerns}</span>
                  </div>
                )}
              </div>

              {/* Auditor Notes if already decided */}
              {item.auditorNotes && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" /> Recorded Auditor Note:
                  </p>
                  <p className="italic text-emerald-800">"{item.auditorNotes}"</p>
                  <p className="text-[10px] text-emerald-600">Decision timestamp: {item.humanDecisionDate || item.lastUpdated}</p>
                </div>
              )}

              {/* Auditor Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-400">
                  Last updated: {item.lastUpdated}
                </span>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setSelectedReviewItem(item)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-900/20 hover:from-indigo-700 hover:to-indigo-800 transition-all cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Auditor Review & Decision
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredQueue.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
            <p className="text-sm font-semibold text-slate-700">All review queue items processed!</p>
            <p className="text-xs text-slate-400 mt-1">No pending AI candidate mappings require human auditor sign-off right now.</p>
          </div>
        )}
      </div>
    </div>
  );
};
