'use client';

import React from 'react';
import { useApp } from '../../lib/context';
import { Lock, ShieldCheck, Building2, CheckCircle2, UserCheck, ArrowRight } from 'lucide-react';

export const PublicTenantArchitecture: React.FC = () => {
  const { login } = useApp();

  return (
    <section id="tenant-security" className="py-20 bg-[#FAF9F6] border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block">
            Strict Multi-Tenancy Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Isolated Merchant Organization Data Vaults
          </h2>
          <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
            Data security is non-negotiable. Pramana enforces cryptographic tenant isolation so merchants and auditors access <strong>ONLY</strong> evidence and controls belonging to their organization.
          </p>
        </div>

        {/* Interactive Architecture Flow Diagram Card */}
        <div className="p-6 md:p-10 rounded-3xl bg-slate-900 text-white shadow-2xl space-y-8 max-w-4xl mx-auto border border-slate-800">
          
          <div className="text-center border-b border-slate-800 pb-6">
            <span className="text-xs font-mono text-indigo-400 font-bold uppercase tracking-wider">
              Tenant Isolation Data Flow Model
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            
            {/* Step 1: Public Home */}
            <div className="p-5 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto font-bold">
                1
              </div>
              <h4 className="text-sm font-bold text-white">Public Home Page</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Public website introducing Pramana's features, frameworks, and pricing.
              </p>
            </div>

            {/* Step 2: Auth Gate */}
            <div className="p-5 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center mx-auto font-bold">
                2
              </div>
              <h4 className="text-sm font-bold text-white">Login / Signup Auth</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Authentication binds users to their specific merchant organization tenant ID.
              </p>
            </div>

            {/* Step 3: Isolated Dashboard */}
            <div className="p-5 rounded-2xl bg-emerald-950/60 border border-emerald-700/80 space-y-3 text-center ring-2 ring-emerald-500/30">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto font-bold">
                3
              </div>
              <h4 className="text-sm font-bold text-emerald-300">Merchant Data Vault</h4>
              <p className="text-xs text-emerald-100/80 leading-relaxed">
                Dashboard displays <strong>ONLY</strong> evidence, controls, and audit logs for that merchant.
              </p>
            </div>

          </div>

          {/* Quick Demo Switcher Links */}
          <div className="pt-4 border-t border-slate-800 text-center space-y-3">
            <p className="text-xs text-slate-400 font-medium">Test Multi-Tenant Switching in Live Demo:</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => login('aarav.mehta@acme.com', 'Password123!', 'org-1')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-2 cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Acme Technologies Vault (Org 1)</span>
              </button>

              <button
                onClick={() => login('leo@nova.com', 'Password123!', 'org-2')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-2 cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Nova Fintech Vault (Org 2)</span>
              </button>

              <button
                onClick={() => login('david@audits.com', 'Password123!', 'org-1')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-2 cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>External Auditor Vault</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
