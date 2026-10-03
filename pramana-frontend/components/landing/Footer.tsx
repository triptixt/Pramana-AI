'use client';

import React from 'react';
import { useApp } from '../../lib/context';
import { Shield, Check } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  const { setIsAuthModalOpen, setAuthModalMode } = useApp();

  return (
    <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-700 text-white font-bold text-sm shadow-md">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-lg text-white tracking-tight">PRAMANA</span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              AI-assisted compliance audit platform. Upload evidence once and map controls across ISO 27001, SOC 2, PCI DSS, and DPDP Act while keeping final decisions under authorized human auditor control.
            </p>
            <p className="text-[11px] text-slate-500 pt-2">
              © {new Date().getFullYear()} Pramana Inc. All rights reserved. Encrypted B2B Compliance Infrastructure.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Framework Scope</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#frameworks" className="hover:text-white transition-colors">ISO/IEC 27001:2022</a></li>
              <li><a href="#frameworks" className="hover:text-white transition-colors">SOC 2 Type II</a></li>
              <li><a href="#frameworks" className="hover:text-white transition-colors">PCI DSS v4.0</a></li>
              <li><a href="#frameworks" className="hover:text-white transition-colors">Digital Personal Data Protection (DPDP)</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Access Portal</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => {
                    setAuthModalMode('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="hover:text-white transition-colors"
                >
                  Sign In (Merchant Vault)
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setAuthModalMode('signup');
                    setIsAuthModalOpen(true);
                  }}
                  className="hover:text-white transition-colors"
                >
                  Create Organization Vault
                </button>
              </li>
              <li><a href="#tenant-security" className="hover:text-white transition-colors">Tenant Data Privacy Policy</a></li>
            </ul>
          </div>

        </div>
      </div>
    </footer>
  );
};
