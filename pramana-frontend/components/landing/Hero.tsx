'use client';

import React from 'react';
import { useApp } from '../../lib/context';
import { 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Lock, 
  CheckCircle2, 
  Layers, 
  FileCheck, 
  ShieldAlert,
  Building2,
  Clock
} from 'lucide-react';

export const PublicHero: React.FC = () => {
  const { setIsAuthModalOpen, setAuthModalMode, login } = useApp();

  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-gradient-to-b from-white via-[#FAF9F6] to-[#FAF9F6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top Announcement Pill */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
            <span>AI-Assisted Compliance Engine • ISO 27001, SOC 2, PCI & DPDP Act</span>
          </div>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Compliance clarity, <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 bg-clip-text text-transparent">
              backed by evidence.
            </span>
          </h1>

          <p className="text-lg sm:text-xl font-medium text-slate-600 max-w-2xl mx-auto leading-relaxed">
            "AI-assisted compliance. Human-approved decisions."
          </p>

          <p className="text-sm sm:text-base text-slate-500 max-w-3xl mx-auto leading-relaxed">
            Upload security evidence once and automatically map it across multiple frameworks. Pramana uses AI to analyze documents and suggest control mappings, while authorized human auditors make final compliance decisions in isolated merchant organization vaults.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => {
                setAuthModalMode('signup');
                setIsAuthModalOpen(true);
              }}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-extrabold text-sm shadow-xl shadow-indigo-900/25 hover:from-indigo-700 hover:to-indigo-800 transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <span>Initialize Organization Vault</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => login('aarav.mehta@acme.com', 'Password123!', 'org-acme')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-slate-300 bg-white font-extrabold text-sm text-slate-800 hover:bg-slate-50 hover:border-slate-400 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Explore Demo Tenant (Acme Inc.)</span>
            </button>
          </div>

          {/* Trust Badges */}
          <div className="pt-8 flex flex-wrap justify-center items-center gap-4 sm:gap-8 text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> ISO/IEC 27001:2022
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> SOC 2 Type II
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> PCI DSS v4.0
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> DPDP Act 2023
            </span>
          </div>
        </div>

        {/* Product Interactive Dashboard Preview Card */}
        <div className="mt-14 max-w-5xl mx-auto rounded-3xl bg-slate-900 p-3 sm:p-4 shadow-2xl ring-1 ring-slate-800">
          <div className="rounded-2xl bg-white overflow-hidden border border-slate-200 shadow-inner">
            {/* Top Bar Preview */}
            <div className="bg-slate-100/90 px-4 py-3 border-b border-slate-200 flex items-center justify-between text-xs font-medium text-slate-600">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="font-mono text-[11px] text-slate-500 ml-2">https://app.pramana.ai/org-acme/dashboard</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                TENANT DATA ISOLATED
              </span>
            </div>

            {/* Dashboard Teaser */}
            <div className="p-6 space-y-4 bg-[#FAF9F6]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Q3 Enterprise Audit Posture</h3>
                  <p className="text-xs text-slate-500">Real-time control readiness across 4 active frameworks</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                  72% Audit Readiness
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Evidence Coverage</span>
                  <p className="text-lg font-mono font-extrabold text-slate-900">184 / 247 Controls</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">AI Suggested Mappings</span>
                  <p className="text-lg font-mono font-extrabold text-indigo-600">18 Pending Review</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Human Auditor Approvals</span>
                  <p className="text-lg font-mono font-extrabold text-emerald-600">124 Verified</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
