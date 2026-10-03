'use client';

import React from 'react';
import { useApp } from '../../lib/context';
import { Drawer } from '../ui/Drawer';
import { StatusBadge } from '../ui/Badge';
import { 
  FileText, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  Download, 
  ExternalLink, 
  ShieldCheck, 
  Lock, 
  Tag, 
  AlertCircle,
  FileCode,
  User,
  Calendar,
  Layers,
  BookOpen,
  MessageSquare,
  FileCheck2,
  ListChecks,
  Cpu
} from 'lucide-react';

export const EvidenceDetailDrawer: React.FC = () => {
  const {
    selectedEvidenceId,
    setSelectedEvidenceId,
    evidenceList,
    controlsList,
    setActiveView,
    setSelectedReviewItem,
    reviewQueueList,
    showToast,
    analyzeEvidenceAI,
    summarizeEvidenceAI,
    setIsAIChatOpen,
    setAIChatEvidenceId,
  } = useApp();

  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isSummarizing, setIsSummarizing] = React.useState(false);
  const [summaryResult, setSummaryResult] = React.useState<{
    summary: string;
    key_takeaways: string[];
    document_type: string;
    model_name: string;
  } | null>(null);
  const [analysisResult, setAnalysisResult] = React.useState<any | null>(null);

  const item = evidenceList.find((e) => e.id === selectedEvidenceId);

  if (!item) return null;

  const numericId = parseInt(item.id.replace(/^[a-z]+-/, ''), 10) || 1;

  const handleAnalyzeAI = async () => {
    try {
      setIsAnalyzing(true);
      const res = await analyzeEvidenceAI(numericId);
      setAnalysisResult(res);
    } catch {
      // Toast already shown by context
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSummarizeAI = async () => {
    try {
      setIsSummarizing(true);
      const res = await summarizeEvidenceAI(numericId);
      setSummaryResult(res);
    } catch {
      // Toast already shown by context
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleChatWithDoc = () => {
    setAIChatEvidenceId(numericId);
    setIsAIChatOpen(true);
  };

  const handleClose = () => setSelectedEvidenceId(null);

  const mappedControls = controlsList.filter((c) => item.mappedControlIds.includes(c.id));
  const reviewQueueMatch = reviewQueueList.find((r) => r.evidenceId === item.id);

  return (
    <Drawer
      isOpen={!!selectedEvidenceId}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          <span className="truncate">{item.name}</span>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
            {item.version || 'v1.0'}
          </span>
        </div>
      }
      subtitle={`File: ${item.fileName} • Size: ${item.fileSize}`}
      width="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            onClick={() => {
              showToast('Evidence Download Initiated', `Downloading ${item.fileName} (${item.version || 'v1.0'} encrypted stream).`, 'info');
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Download File ({item.version || 'v1.0'})
          </button>

          {reviewQueueMatch && (
            <button
              onClick={() => {
                setSelectedReviewItem(reviewQueueMatch);
                handleClose();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-900/20"
            >
              <ShieldCheck className="w-4 h-4" />
              Auditor Sign-Off
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Status Badge, Classification & Version Banner (PRD Section 14, 15, 32) */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Review Status & Data Classification</p>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge type={item.decisionType} size="md">
                {item.decisionType === 'human_decision'
                  ? `Human Approved (${item.auditorName || 'Auditor'})`
                  : item.decisionType === 'pending_human_review'
                  ? 'Pending Auditor Decision'
                  : 'AI Candidate Suggestion'}
              </StatusBadge>

              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                item.securityLevel === 'Confidential'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : item.securityLevel === 'Restricted'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {item.securityLevel}
              </span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Version & Expiry</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold text-slate-800 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                {item.version || 'v1.0'}
              </span>
              {item.expiryDate && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" /> Exp: {item.expiryDate}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* AI Direct Action Toolbar */}
        <div className="p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
            <Cpu className="w-4 h-4 text-indigo-600" />
            <span>AI Operations:</span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={handleAnalyzeAI}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:bg-indigo-400 transition-all shadow-sm"
              title="Run deep RAG control extraction on this document"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              {isAnalyzing ? 'Analyzing...' : 'Deep Analysis'}
            </button>

            <button
              onClick={handleSummarizeAI}
              disabled={isSummarizing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-50 disabled:opacity-50 transition-all shadow-xs"
              title="Generate AI executive summary and key takeaways"
            >
              <FileCheck2 className={`w-3.5 h-3.5 ${isSummarizing ? 'animate-spin' : ''}`} />
              {isSummarizing ? 'Summarizing...' : 'Executive Summary'}
            </button>

            <button
              onClick={handleChatWithDoc}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all shadow-sm"
              title="Open RAG chat scoped to this document"
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-300" />
              Chat
            </button>
          </div>
        </div>

        {/* Live Executive Summary Output if Available */}
        {summaryResult && (
          <div className="p-4 rounded-2xl bg-violet-50/70 border border-violet-200 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-violet-950 font-bold text-xs">
                <FileCheck2 className="w-4 h-4 text-violet-600" />
                <span>AI Executive Summary ({summaryResult.document_type || 'Evidence Document'})</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-100 text-violet-700 font-bold">
                {summaryResult.model_name || 'qwen2.5:7b'}
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-violet-100">
              {summaryResult.summary}
            </p>
            {summaryResult.key_takeaways && summaryResult.key_takeaways.length > 0 && (
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-violet-900 block">Key Takeaways:</span>
                <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5 bg-white/70 p-2.5 rounded-xl border border-violet-100">
                  {summaryResult.key_takeaways.map((takeaway, tIdx) => (
                    <li key={tIdx}>{takeaway}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Live Deep Analysis Result if Available */}
        {analysisResult && (
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                <ListChecks className="w-4 h-4 text-emerald-600" />
                <span>Deep Analysis Live Output (Run #{analysisResult.run_id})</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                {analysisResult.status}
              </span>
            </div>

            {analysisResult.matched_controls && analysisResult.matched_controls.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-emerald-900 block">
                  Matched Controls ({analysisResult.matched_controls.length}):
                </span>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {analysisResult.matched_controls.map((mc: any, mIdx: number) => (
                    <div key={mIdx} className="p-2 rounded-lg bg-white border border-emerald-100 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-emerald-700">{mc.control_code}</span>
                        <span className="text-[10px] font-bold text-slate-500">
                          Confidence: {Math.round(mc.confidence_score * 100)}%
                        </span>
                      </div>
                      <p className="font-medium text-slate-800 text-[11px] mt-0.5">{mc.title}</p>
                      {mc.reasoning && (
                        <p className="text-slate-500 text-[10px] mt-1 italic">{mc.reasoning}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysisResult.gaps && analysisResult.gaps.length > 0 && (
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-rose-800 block">
                  Identified Gaps ({analysisResult.gaps.length}):
                </span>
                <div className="space-y-1">
                  {analysisResult.gaps.map((g: any, gIdx: number) => (
                    <div key={gIdx} className="p-2 rounded-lg bg-white border border-rose-200 text-xs">
                      <span className="font-mono font-bold text-rose-700">{g.control_code}: </span>
                      <span className="font-medium text-slate-800">{g.findings}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Analysis Summary & Traceable Citations */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-violet-50/40 to-slate-50 border border-indigo-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
              <span>Pramana AI RAG Analysis & Citation Traceability</span>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
              Confidence: {item.aiConfidence}%
            </span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">{item.aiReasoning}</p>

          {/* AI Model Execution Metadata */}
          {item.aiModelInfo && (
            <div className="flex items-center justify-between text-[10px] text-indigo-800/80 font-mono bg-indigo-100/60 p-2 rounded-lg border border-indigo-200/60">
              <span>Engine: {item.aiModelInfo.model} ({item.aiModelInfo.modelVersion})</span>
              <span>Prompt: {item.aiModelInfo.promptVersion}</span>
              <span>Run: #{item.aiModelInfo.runId}</span>
            </div>
          )}

          {/* Traceable Citations from PRD Section 34 */}
          {item.citations && item.citations.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] font-bold text-indigo-950 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> Evidence Source Citations:
              </p>
              <div className="space-y-1">
                {item.citations.map((cite, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-white border border-indigo-100 text-xs flex items-start gap-2">
                    <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 shrink-0">
                      Pg {cite.page} • {cite.section}
                    </span>
                    <p className="text-slate-700 text-[11px] italic">"{cite.text}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Evidence List from PRD Section 20 */}
          {item.missingEvidenceList && item.missingEvidenceList.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
              <p className="font-bold text-amber-900 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Supplementary Information Missing:
              </p>
              <ul className="list-disc list-inside text-amber-800 text-[11px] space-y-0.5">
                {item.missingEvidenceList.map((missing, idx) => (
                  <li key={idx}>{missing}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Mapped Controls Section */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Mapped Controls across Frameworks ({mappedControls.length})
          </h4>
          <div className="space-y-2">
            {mappedControls.map((ctrl) => (
              <div
                key={ctrl.id}
                onClick={() => {
                  setActiveView('controls');
                  handleClose();
                }}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/60 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600">{ctrl.id}</span>
                    <span className="text-xs font-bold text-slate-900">{ctrl.title}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{ctrl.category}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </div>
            ))}
          </div>
        </div>

        {/* Auditor Notes if Present */}
        {item.auditorNotes && (
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-1">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Auditor Review Note ({item.auditorName})</span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">{item.auditorNotes}</p>
            <p className="text-[10px] text-emerald-600 font-medium">Recorded at: {item.auditorDecisionDate}</p>
          </div>
        )}

        {/* File Technical Metadata & Cryptography */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Cryptographic Integrity & Chain of Custody
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">Uploader / Owner</span>
              <span className="font-semibold text-slate-700">{item.owner}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Upload Timestamp</span>
              <span className="font-semibold text-slate-700">{item.uploadDate}</span>
            </div>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] mb-0.5">SHA-256 Hash Signature</span>
            <p className="font-mono text-[10px] bg-slate-200/80 p-1.5 rounded-lg text-slate-800 break-all select-all">
              {item.fileHash}
            </p>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
