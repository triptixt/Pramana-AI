'use client';

import React from 'react';
import { 
  Upload, 
  Sparkles, 
  ShieldCheck, 
  History, 
  Building2, 
  Lock, 
  CheckCircle2, 
  Layers 
} from 'lucide-react';

export const PublicFeatures: React.FC = () => {
  return (
    <section id="features" className="py-20 bg-white border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 inline-block">
            Product Capabilities
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Built for Enterprise CISOs, GRC Teams & External Auditors
          </h3>
          <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
            Eliminate repetitive evidence collection. Pramana streamlines multi-framework compliance with AI assistance while maintaining 100% human auditor decision authority.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Feature 1 */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 hover:border-indigo-300 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shadow-sm group-hover:scale-105 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Upload Once, Map Across Frameworks</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upload IAM policies, penetration test reports, and SSO logs once. Pramana automatically links single artifacts across ISO 27001, SOC 2, PCI DSS, and DPDP controls.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 hover:border-indigo-300 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center font-bold shadow-sm group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">AI Control Mapping & Clause Analysis</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pramana AI Engine scans uploaded evidence, extracts key security clauses, calculates confidence scores, and flags potential compliance gaps before your audit.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 hover:border-indigo-300 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold shadow-sm group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Mandatory Human Auditor Approval Gate</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              AI recommendations remain strictly labeled as "AI Suggestions". Final compliance decisions require authorized human auditor review and cryptographic sign-off.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 hover:border-indigo-300 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold shadow-sm group-hover:scale-105 transition-transform">
              <History className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Cryptographic SHA-256 Audit Trail</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every evidence upload, AI suggestion, and auditor approval is timestamped and signed with SHA-256 cryptographic hashes for tamper-proof audit readiness.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 hover:border-indigo-300 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold shadow-sm group-hover:scale-105 transition-transform">
              <Building2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Strict Merchant Tenant Data Isolation</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Multi-tenant security architecture guarantees that merchants and organization users view and access ONLY data belonging to their specific organization.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 hover:border-indigo-300 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shadow-sm group-hover:scale-105 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Real-time Gap Remediation Workflows</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Identify missing logs or unencrypted storage buckets early. Assign remediation tasks to compliance owners with automated due date tracking.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
};
