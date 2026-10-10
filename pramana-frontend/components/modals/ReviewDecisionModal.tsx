'use client';

import React, { useState } from 'react';
import { useApp } from '../../lib/context';
import { Modal } from '../ui/Modal';
import { StatusBadge } from '../ui/Badge';
import { ShieldCheck, AlertTriangle, XCircle, FilePlus2, Sparkles, UserCheck } from 'lucide-react';

export const ReviewDecisionModal: React.FC = () => {
  const { 
    selectedReviewItem, 
    setSelectedReviewItem, 
    approveReviewItem, 
    rejectReviewItem, 
    requestAdditionalEvidence,
    activeUser,
    usersList
  } = useApp();

  const [decisionMode, setDecisionMode] = useState<'approve' | 'reject' | 'request'>('approve');
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [evidenceDetails, setEvidenceDetails] = useState('');
  const [assignedOwner, setAssignedOwner] = useState('Priya Sharma');
  const [dueDate, setDueDate] = useState('2026-10-15');

  if (!selectedReviewItem) return null;

  const handleClose = () => {
    setSelectedReviewItem(null);
    setNotes('');
    setRejectReason('');
    setEvidenceDetails('');
  };

  const handleSubmit = () => {
    if (decisionMode === 'approve') {
      approveReviewItem(selectedReviewItem.id, notes || 'Verified compliant by auditor.');
      handleClose();
    } else if (decisionMode === 'reject') {
      if (!rejectReason.trim()) return;
      rejectReviewItem(selectedReviewItem.id, rejectReason);
      handleClose();
    } else if (decisionMode === 'request') {
      if (!evidenceDetails.trim()) return;
      requestAdditionalEvidence(selectedReviewItem.id, evidenceDetails, assignedOwner, dueDate);
      handleClose();
    }
  };

  return (
    <Modal
      isOpen={!!selectedReviewItem}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          <span>Auditor Review & Decision Sign-Off</span>
        </div>
      }
      subtitle="Final compliance decisions require authorized human auditor review."
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Item Header Banner */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-indigo-600">{selectedReviewItem.controlId}</span>
            <StatusBadge type="ai_suggestion" size="sm">
              AI Confidence: {selectedReviewItem.aiConfidence}%
            </StatusBadge>
          </div>
          <h4 className="text-sm font-bold text-slate-900">{selectedReviewItem.evidenceName}</h4>
          <p className="text-xs text-slate-600">{selectedReviewItem.controlTitle}</p>
        </div>

        {/* AI Evidence Excerpt */}
        <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-indigo-900">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>AI Reasoning & Document Excerpt</span>
          </div>
          <p className="text-slate-700 italic">"{selectedReviewItem.evidenceExcerpt}"</p>
        </div>

        {/* Action Mode Tabs */}
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
            Select Auditor Decision Action:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setDecisionMode('approve')}
              className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all flex flex-col gap-1 ${
                decisionMode === 'approve'
                  ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Approve Mapping</span>
              </div>
              <span className="text-[10px] text-slate-500 font-normal">Confirm AI mapping as valid compliance evidence.</span>
            </button>

            <button
              onClick={() => setDecisionMode('reject')}
              className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all flex flex-col gap-1 ${
                decisionMode === 'reject'
                  ? 'border-rose-500 bg-rose-50/60 text-rose-900 ring-2 ring-rose-500/20 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Reject Mapping</span>
              </div>
              <span className="text-[10px] text-slate-500 font-normal">Reject suggested mapping with reason.</span>
            </button>

            <button
              onClick={() => setDecisionMode('request')}
              className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all flex flex-col gap-1 ${
                decisionMode === 'request'
                  ? 'border-amber-500 bg-amber-50/60 text-amber-900 ring-2 ring-amber-500/20 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <FilePlus2 className="w-4 h-4 text-amber-600" />
                <span>Request Evidence</span>
              </div>
              <span className="text-[10px] text-slate-500 font-normal">Assign evidence task to compliance owner.</span>
            </button>
          </div>
        </div>

        {/* Dynamic Fields based on Decision Mode */}
        {decisionMode === 'approve' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">
              Auditor Verification Note (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Verified IAM least privilege configuration against zero-trust standards..."
              className="w-full h-24 p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        )}

        {decisionMode === 'reject' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">
              Rejection Reason <span className="text-rose-500">* Required</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Document provided does not contain required quarterly review timestamps..."
              className="w-full h-24 p-3 rounded-xl border border-rose-200 bg-rose-50/20 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>
        )}

        {decisionMode === 'request' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Evidence Requirement Details <span className="text-rose-500">* Required</span>
              </label>
              <textarea
                value={evidenceDetails}
                onChange={(e) => setEvidenceDetails(e.target.value)}
                placeholder="Describe exact supplementary logs, policies, or export files required..."
                className="w-full h-20 p-3 rounded-xl border border-amber-200 bg-amber-50/20 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Assignee / Owner</label>
                <select
                  value={assignedOwner}
                  onChange={(e) => setAssignedOwner(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-medium"
                >
                  {usersList.length > 0 ? (
                    usersList.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name} ({u.roleTitle || u.role})
                      </option>
                    ))
                  ) : (
                    <option value="Compliance Team">Compliance Team</option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Remediation Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white font-medium"
                />
              </div>
            </div>
          </div>
        )}

        {/* Auditor Signature Note */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-100/70 border border-slate-200/80 text-xs text-slate-600">
          <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            Signing decision as <strong>{activeUser.name}</strong> ({activeUser.roleTitle}). Action will produce a cryptographic Audit Trail entry.
          </span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className={`px-5 py-2.5 text-xs font-semibold text-white rounded-xl shadow-md transition-all ${
              decisionMode === 'approve'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20'
                : decisionMode === 'reject'
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/20'
                : 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/20'
            }`}
          >
            Submit Auditor Decision
          </button>
        </div>
      </div>
    </Modal>
  );
};
