import React from 'react';
import { Sparkles, ShieldCheck, Clock, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DecisionType, ProcessingStatus, GapSeverity } from '../../types';

interface BadgeProps {
  type?: 'ai_suggestion' | 'pending_human_review' | 'human_decision' | 'evidence_required' | 'potential_gap' | 'auditor_approved' | 'rejected' | 'processing';
  severity?: GapSeverity;
  size?: 'sm' | 'md';
  children?: React.ReactNode;
  className?: string;
}

export const StatusBadge: React.FC<BadgeProps> = ({
  type,
  severity,
  size = 'md',
  children,
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs font-medium' : 'px-2.5 py-1 text-xs font-semibold';

  // AI Suggestion
  if (type === 'ai_suggestion') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 border border-indigo-200/80 shadow-2xs ${sizeClasses} ${className}`}>
        <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
        <span>{children || 'AI Suggestion'}</span>
      </span>
    );
  }

  // Pending Human Review
  if (type === 'pending_human_review' || type === 'processing') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 ${sizeClasses} ${className}`}>
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        <span>{children || 'Pending Auditor Review'}</span>
      </span>
    );
  }

  // Human Decision / Auditor Approved
  if (type === 'human_decision' || type === 'auditor_approved') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 ${sizeClasses} ${className}`}>
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>{children || 'Human Decision (Approved)'}</span>
      </span>
    );
  }

  // Evidence Required
  if (type === 'evidence_required') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200/80 ${sizeClasses} ${className}`}>
        <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
        <span>{children || 'Evidence Required'}</span>
      </span>
    );
  }

  // Potential Gap / Rejected
  if (type === 'potential_gap' || type === 'rejected') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200/80 ${sizeClasses} ${className}`}>
        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
        <span>{children || (type === 'rejected' ? 'Rejected' : 'Potential Gap')}</span>
      </span>
    );
  }

  // Severity Badges
  if (severity === 'critical') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 font-bold border border-rose-300 ${sizeClasses} ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
        Critical
      </span>
    );
  }

  if (severity === 'high') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 font-semibold border border-amber-300 ${sizeClasses} ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
        High
      </span>
    );
  }

  if (severity === 'medium') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-sky-100 text-sky-800 font-medium border border-sky-300 ${sizeClasses} ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
        Medium
      </span>
    );
  }

  if (severity === 'low') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-300 ${sizeClasses} ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
        Low
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 ${sizeClasses} ${className}`}>
      {children}
    </span>
  );
};
