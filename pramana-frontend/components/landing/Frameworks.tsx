'use client';

import React, { useState } from 'react';
import { useApp } from '../../lib/context';
import { 
  ShieldCheck, 
  Layers, 
  CheckCircle2, 
  ArrowRight, 
  ChevronRight,
  Check
} from 'lucide-react';

interface FrameworkDetail {
  id: 'iso-27001' | 'soc-2' | 'pci-dss' | 'dpdp';
  code: string;
  name: string;
  badge: string;
  badgeColor: string;
  iconBg: string;
  iconColor: string;
  version: string;
  tagline: string;
  summary: string;
  governingBody: string;
  totalControls: number;
  auditFrequency: string;
  targetAudience: string;
  readinessRate: number;
  coreDomains: string[];
}

const frameworksData: FrameworkDetail[] = [
  {
    id: 'iso-27001',
    code: 'ISO 27001',
    name: 'ISO/IEC 27001:2022',
    badge: 'Global Security Standard',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    iconBg: 'bg-indigo-500/10 text-indigo-600 border-indigo-200/50',
    iconColor: 'text-indigo-600',
    version: '2022 Revision (v2.1)',
    tagline: 'International standard for Information Security Management Systems (ISMS)',
    summary: 'The world’s most recognized standard for systematically managing enterprise information risks. Covers technological, physical, and organizational safeguards to protect customer data assets.',
    governingBody: 'International Organization for Standardization (ISO / IEC)',
    totalControls: 146,
    auditFrequency: 'Annual Surveillance / 3-Year Recertification',
    targetAudience: 'Global B2B SaaS, Enterprise Vendors, Multi-National Cloud Organizations',
    readinessRate: 78,
    coreDomains: [
      'Annex A.5: Organizational Controls (Policies & Roles)',
      'Annex A.6: People Controls (Remote Work & Screening)',
      'Annex A.7: Physical Controls (Perimeter & Equipment)',
      'Annex A.8: Technological Controls (Access, Crypto & IAM)'
    ]
  },
  {
    id: 'soc-2',
    code: 'SOC 2 Type II',
    name: 'AICPA SOC 2 Type II',
    badge: 'Trust Services Criteria',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-200/50',
    iconColor: 'text-emerald-600',
    version: '2024 Trust Services Criteria (v4.0)',
    tagline: 'Evaluation of operational effectiveness over a continuous 6–12 month window',
    summary: 'The prerequisite security benchmark for North American enterprise procurement. Verifies that your systems safeguard customer data against unauthorized access, breaches, and downtime over continuous time windows.',
    governingBody: 'American Institute of CPAs (AICPA)',
    totalControls: 87,
    auditFrequency: 'Annual Attestation (Continuous 6–12 Month Period)',
    targetAudience: 'Cloud Service Providers, SaaS Platforms, FinTechs, Enterprise Vendors',
    readinessRate: 71,
    coreDomains: [
      'Security (Common Criteria CC1.0 - CC9.0)',
      'Availability (System Monitoring & Disaster Recovery)',
      'Confidentiality (Data Classification & Destruction)',
      'Processing Integrity & Privacy Controls'
    ]
  },
  {
    id: 'pci-dss',
    code: 'PCI DSS',
    name: 'PCI DSS v4.0',
    badge: 'Payment Security Standard',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    iconBg: 'bg-amber-500/10 text-amber-600 border-amber-200/50',
    iconColor: 'text-amber-600',
    version: 'v4.0 Global Standard Specification',
    tagline: 'Technical and operational standard for securing Cardholder Data Environments (CDE)',
    summary: 'Mandated by payment brands (Visa, Mastercard, Amex) for any entity storing, processing, or transmitting credit card and transaction data. Version 4.0 places strict focus on customized validation, multi-factor authentication, and e-commerce payment script integrity.',
    governingBody: 'Payment Card Industry Security Standards Council (PCI SSC)',
    totalControls: 65,
    auditFrequency: 'Annual Report on Compliance (RoC) / SAQ-D',
    targetAudience: 'Payment Gateways, Checkout Platforms, E-Commerce, Financial Services',
    readinessRate: 64,
    coreDomains: [
      'Build and Maintain a Secure Network and Systems (Req 1 & 2)',
      'Protect Account & Cardholder Data (Req 3 & 4)',
      'Maintain a Vulnerability Management Program (Req 5 & 6)',
      'Implement Strong Access Control & Logging (Req 7 to 10)'
    ]
  },
  {
    id: 'dpdp',
    code: 'DPDP Act',
    name: 'DPDP Act 2023 (India)',
    badge: 'Data Protection & Privacy',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
    iconBg: 'bg-violet-500/10 text-violet-600 border-violet-200/50',
    iconColor: 'text-violet-600',
    version: '2023 Statutory Regulations (v1.0)',
    tagline: 'Digital Personal Data Protection Act governing Data Fiduciaries & Processors',
    summary: 'India’s landmark statutory framework regulating the processing of digital personal data. Establishes legal duties for Data Fiduciaries, unambiguous itemized consent architecture, cross-border transfer rules, and data principal rights.',
    governingBody: 'Data Protection Board of India (DPBI) / MeitY',
    totalControls: 34,
    auditFrequency: 'Continuous Compliance & Periodic Board Audits',
    targetAudience: 'Companies handling Indian citizen data, Data Fiduciaries, HealthTech, FinTech',
    readinessRate: 82,
    coreDomains: [
      'Section 6: Consent Architecture & Itemized Notice Workflow',
      'Section 8: Data Fiduciary Obligations & Reasonable Security',
      'Section 9 & 10: Special Provisions for Children & Significant Fiduciaries',
      'Section 11-13: Data Principal Rights (Access, Correction, Erasure)'
    ]
  }
];

export const PublicFrameworks: React.FC = () => {
  const { setIsAuthModalOpen, setAuthModalMode } = useApp();
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<'iso-27001' | 'soc-2' | 'pci-dss' | 'dpdp'>('iso-27001');

  const activeFramework = frameworksData.find((f) => f.id === selectedFrameworkId) || frameworksData[0];

  const handleOpenAuth = () => {
    setAuthModalMode('signup');
    setIsAuthModalOpen(true);
  };

  return (
    <section id="frameworks" className="py-24 bg-white border-t border-slate-200/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold shadow-2xs">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Pre-Loaded Compliance Standards</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            Supported Frameworks & Standards
          </h2>
          
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Eliminate audit silos. Pramana provides enterprise-grade compliance automation natively tailored for <strong>ISO 27001</strong>, <strong>SOC 2 Type II</strong>, <strong>PCI DSS</strong>, and the <strong>DPDP Act</strong>.
          </p>
        </div>

        {/* 4 Framework Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {frameworksData.map((framework) => {
            const isSelected = framework.id === selectedFrameworkId;
            return (
              <div
                key={framework.id}
                onClick={() => setSelectedFrameworkId(framework.id)}
                className={`cursor-pointer rounded-2xl p-6 border transition-all duration-200 flex flex-col justify-between relative group ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/10 scale-[1.02] ring-2 ring-indigo-500'
                    : 'bg-[#FAF9F6] text-slate-900 border-slate-200/90 hover:border-indigo-300 hover:bg-white hover:shadow-md'
                }`}
              >
                {/* Active Indicator Top Tag */}
                {isSelected && (
                  <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm flex items-center gap-1">
                    <Check className="w-3 h-3" /> Selected
                  </div>
                )}

                <div className="space-y-4">
                  {/* Badge & Version */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border font-mono ${
                        isSelected
                          ? 'bg-slate-800 text-indigo-300 border-slate-700'
                          : framework.badgeColor
                      }`}
                    >
                      {framework.code}
                    </span>
                    <span className={`text-[11px] font-semibold ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                      {framework.version.split(' ')[0]}
                    </span>
                  </div>

                  {/* Title & Tagline */}
                  <div>
                    <h3 className={`text-lg font-bold tracking-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                      {framework.name}
                    </h3>
                    <p className={`text-xs mt-1 line-clamp-2 leading-relaxed ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>
                      {framework.tagline}
                    </p>
                  </div>

                  {/* Key Metrics Pill */}
                  <div className={`grid grid-cols-2 gap-2 p-2.5 rounded-xl border text-center ${
                    isSelected 
                      ? 'bg-slate-800/80 border-slate-700 text-slate-200' 
                      : 'bg-white border-slate-200/80 text-slate-700'
                  }`}>
                    <div>
                      <span className={`block text-[10px] uppercase font-semibold ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                        Controls
                      </span>
                      <span className="text-sm font-extrabold font-mono text-indigo-500">
                        {framework.totalControls}
                      </span>
                    </div>
                    <div>
                      <span className={`block text-[10px] uppercase font-semibold ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                        Readiness
                      </span>
                      <span className="text-sm font-extrabold font-mono text-emerald-500">
                        {framework.readinessRate}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-4 mt-4 border-t border-dashed border-slate-200/30 flex items-center justify-between">
                  <span className={`text-xs font-semibold flex items-center gap-1 ${
                    isSelected ? 'text-indigo-400' : 'text-indigo-600 group-hover:translate-x-0.5 transition-transform'
                  }`}>
                    Inspect Domains <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Framework Deep Dive Interactive Inspector */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          {/* Top Panel Banner */}
          <div className="bg-slate-900 text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-mono text-xs font-extrabold">
                  {activeFramework.code} • {activeFramework.version}
                </span>
                <span className="text-xs text-slate-400">
                  Authority: <strong className="text-slate-200">{activeFramework.governingBody}</strong>
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {activeFramework.name}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                {activeFramework.summary}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleOpenAuth}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-900/40 hover:from-indigo-500 hover:to-indigo-600 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Audit Readiness Check</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Detailed Content */}
          <div className="p-6 sm:p-8 space-y-8 bg-slate-50/50">
            {/* 3 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Mandatory Scope
                </span>
                <p className="text-xs font-bold text-slate-800 leading-snug">
                  {activeFramework.targetAudience}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Audit Cadence
                </span>
                <p className="text-xs font-bold text-slate-800 leading-snug">
                  {activeFramework.auditFrequency}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Readiness Benchmark
                </span>
                <p className="text-xs font-bold text-emerald-600 leading-snug flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  {activeFramework.readinessRate}% Average Readiness
                </p>
              </div>
            </div>

            {/* Core Domains Grid */}
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Core Control Domains ({activeFramework.totalControls} Controls)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {activeFramework.coreDomains.map((domain, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl bg-white border border-slate-200/90 text-xs font-medium text-slate-700 flex items-start gap-3 shadow-2xs hover:border-indigo-200 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center shrink-0 mt-0.5 text-xs">
                      {index + 1}
                    </div>
                    <span className="leading-relaxed">{domain}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Global Cross-Framework Comparison Matrix */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 space-y-6 shadow-sm">
          <div className="max-w-2xl space-y-2">
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Framework Comparison at a Glance
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Compare requirements, compliance authorities, and how Pramana automates testing across all four standards.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75">
                  <th className="py-3 px-4 font-bold text-slate-600">Standard</th>
                  <th className="py-3 px-4 font-bold text-slate-600">Primary Objective</th>
                  <th className="py-3 px-4 font-bold text-slate-600">Controls</th>
                  <th className="py-3 px-4 font-bold text-slate-600">Auditor Authority</th>
                  <th className="py-3 px-4 font-bold text-slate-600">Audit Deliverable</th>
                  <th className="py-3 px-4 font-bold text-slate-600">Pramana Automation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      ISO/IEC 27001
                    </span>
                  </td>
                  <td className="py-3.5 px-4">Holistic Information Security Management System (ISMS)</td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">146 Controls</td>
                  <td className="py-3.5 px-4 text-slate-600">Accredited ISO Registrar (BSI, TÜV)</td>
                  <td className="py-3.5 px-4">3-Year ISO Certification + SoA</td>
                  <td className="py-3.5 px-4 text-emerald-700 font-semibold">92% Clause Auto-Map</td>
                </tr>

                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      SOC 2 Type II
                    </span>
                  </td>
                  <td className="py-3.5 px-4">Operational Security, Availability & Confidentiality</td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">87 Controls</td>
                  <td className="py-3.5 px-4 text-slate-600">Independent CPA Audit Firm</td>
                  <td className="py-3.5 px-4">Attestation Report (Type II)</td>
                  <td className="py-3.5 px-4 text-emerald-700 font-semibold">88% Continuous Evidence</td>
                </tr>

                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      PCI DSS v4.0
                    </span>
                  </td>
                  <td className="py-3.5 px-4">Securing Cardholder Data Environments (CDE)</td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">65 Core Controls</td>
                  <td className="py-3.5 px-4 text-slate-600">Qualified Security Assessor (QSA)</td>
                  <td className="py-3.5 px-4">Report on Compliance (RoC) / SAQ</td>
                  <td className="py-3.5 px-4 text-emerald-700 font-semibold">81% Automated CDE Checks</td>
                </tr>

                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                      DPDP Act 2023
                    </span>
                  </td>
                  <td className="py-3.5 px-4">Data Fiduciary Obligations & Consent Compliance</td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">34 Statutory Controls</td>
                  <td className="py-3.5 px-4 text-slate-600">Data Protection Board / Legal Counsel</td>
                  <td className="py-3.5 px-4">Statutory DPDP Audit Register</td>
                  <td className="py-3.5 px-4 text-emerald-700 font-semibold">85% Consent & Retention Checks</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </section>
  );
};
