'use client';

import React from 'react';
import { useApp } from '../../lib/context';
import { Drawer } from '../ui/Drawer';
import { StatusBadge } from '../ui/Badge';
import { 
  ShieldCheck, 
  FileText, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  History, 
  UserCheck, 
  ExternalLink,
  Cpu,
  BookOpen,
  ArrowRight
} from 'lucide-react';

export const ControlDetailDrawer: React.FC = () => {
  const {
    selectedControlId,
    setSelectedControlId,
    controlsList,
    evidenceList,
    gapsList,
    setSelectedReviewItem,
    reviewQueueList,
    evaluateControlAI,
  } = useApp();

  const [isEvaluating, setIsEvaluating] = React.useState(false);
  const [evalResult, setEvalResult] = React.useState<any | null>(null);

  const ctrl = controlsList.find((c) => c.id === selectedControlId);

  if (!ctrl) return null;

  const numericControlId = parseInt(ctrl.id.replace(/^[a-z]+-/, ''), 10) || 1;

  const handleEvaluateAI = async () => {
    try {
      setIsEvaluating(true);
      const res = await evaluateControlAI(numericControlId);
      setEvalResult(res);
    } catch {
      // Toast already shown
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleClose = () => setSelectedControlId(null);

  const mappedEvidence = evidenceList.filter((e) => ctrl.evidenceIds.includes(e.id));
  const relatedGaps = gapsList.filter((g) => g.controlId === ctrl.id);
  const reviewQueueMatch = reviewQueueList.find((r) => r.controlId === ctrl.id);

  return (
    <Drawer
      isOpen={!!selectedControlId}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <span className="font-mono text-indigo-600 font-extrabold">{ctrl.id}</span>
          <span className="truncate">{ctrl.title}</span>
        </div>
      }
      subtitle={`Category: ${ctrl.category} • Framework: ${ctrl.framework.toUpperCase()}`}
      width="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            onClick={handleEvaluateAI}
            disabled={isEvaluating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all shadow-sm"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
            {isEvaluating ? 'Evaluating with AI...' : 'Evaluate Control with AI'}
          </button>

          {reviewQueueMatch && (
            <button
              onClick={() => {
                setSelectedReviewItem(reviewQueueMatch);
                handleClose();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-md transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Auditor Sign-Off
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Status & Coverage Banner */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Coverage State</p>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {ctrl.coverageState.toUpperCase()} COVERAGE
            </span>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Auditor Decision</p>
            <div className="mt-1">
              {ctrl.auditorDecision === 'approved' ? (
                <StatusBadge type="human_decision" size="sm">Auditor Approved</StatusBadge>
              ) : (
                <StatusBadge type="pending_human_review" size="sm">Pending Review</StatusBadge>
              )}
            </div>
          </div>
        </div>

        {/* Live AI Control Evaluation Result if Available */}
        {evalResult && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 to-violet-50/60 border border-indigo-200 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Live AI Evaluation Assessment</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                evalResult.evaluation?.status === 'compliant'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {evalResult.evaluation?.status || 'Assessed'} (Confidence: {Math.round((evalResult.evaluation?.confidence || 0) * 100)}%)
              </span>
            </div>

            {evalResult.evaluation?.findings && (
              <div className="p-3 rounded-xl bg-white border border-indigo-100 text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AI Findings:</span>
                <p className="text-slate-800 leading-relaxed">{evalResult.evaluation.findings}</p>
              </div>
            )}

            {evalResult.evaluation?.remediation && (
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-1">
                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">Recommended Remediation:</span>
                <p className="text-amber-800 leading-relaxed">{evalResult.evaluation.remediation}</p>
              </div>
            )}

            {evalResult.evaluation?.citations && evalResult.evaluation.citations.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> Cited Evidence:
                </span>
                <div className="space-y-1">
                  {evalResult.evaluation.citations.map((c: any, cIdx: number) => (
                    <div key={cIdx} className="p-2 rounded-lg bg-white border border-indigo-100 text-[11px] text-slate-700 italic">
                      "{c.text || c}"
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Control Requirement Description */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Control Specification & Requirement</h4>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 text-xs">
            <p className="font-semibold text-slate-900">{ctrl.description}</p>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 leading-relaxed italic">
              Requirement: "{ctrl.requirementText}"
            </div>
          </div>
        </div>

        {/* AI Mapping Reasoning */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-violet-50/40 to-slate-50 border border-indigo-100 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
              <span>AI Mapping Reasoning</span>
            </div>
            <span className="text-xs font-bold text-indigo-700">Confidence: {ctrl.aiConfidence}%</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">{ctrl.aiExplanation}</p>
        </div>

        {/* Linked Evidence Files */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Linked Evidence Artifacts ({mappedEvidence.length})
          </h4>
          <div className="space-y-2">
            {mappedEvidence.map((ev) => (
              <div
                key={ev.id}
                className="p-3 rounded-xl border border-slate-200 bg-white space-y-1 text-xs"
              >
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>{ev.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{ev.fileSize}</span>
                </div>
                <p className="text-slate-500 text-[11px]">Owner: {ev.owner} • Last Updated: {ev.lastUpdated}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Related Gaps if any */}
        {relatedGaps.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Open Gaps ({relatedGaps.length})
            </h4>
            {relatedGaps.map((gap) => (
              <div key={gap.id} className="p-3 rounded-xl bg-rose-50/60 border border-rose-200 text-xs space-y-1">
                <p className="font-bold text-rose-950">{gap.title}</p>
                <p className="text-rose-800">{gap.whyIdentified}</p>
              </div>
            ))}
          </div>
        )}

        {/* Auditor History Log */}
        {ctrl.auditorComments && ctrl.auditorComments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Auditor Notes & History</h4>
            <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Auditor Sign-off by {ctrl.auditorName || 'External Auditor'}</span>
              </div>
              {ctrl.auditorComments.map((note: string, idx: number) => (
                <p key={idx} className="text-emerald-800 text-[11px] italic">"{note}"</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};
