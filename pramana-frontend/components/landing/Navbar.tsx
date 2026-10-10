'use client';

import React from 'react';
import { useApp } from '../../lib/context';
import { Shield, Check, ArrowRight, Lock, UserCheck } from 'lucide-react';

export const PublicNavbar: React.FC = () => {
  const { setIsAuthModalOpen, setAuthModalMode, isAuthenticated, logout } = useApp();

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white font-bold text-xl shadow-md shadow-indigo-900/30 ring-1 ring-indigo-500/30">
            <Shield className="w-5 h-5 text-white" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-slate-950 font-bold" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                PRAMANA
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                AI + AUDITOR
              </span>
            </div>
            <p className="text-[10px] font-medium text-slate-500 -mt-0.5">Enterprise Compliance Platform</p>
          </div>
        </div>

        {/* Public Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
          <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
          <a href="#frameworks" className="hover:text-indigo-600 transition-colors">Frameworks</a>
          <a href="#tenant-security" className="hover:text-indigo-600 transition-colors">Tenant Isolation</a>
          <a href="#pricing" className="hover:text-indigo-600 transition-colors">Pricing</a>
        </nav>

        {/* Auth CTA Buttons */}
        <div className="flex items-center gap-3">
          {!isAuthenticated ? (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-900/20 hover:from-indigo-700 hover:to-indigo-800 transition-all cursor-pointer"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={logout}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
