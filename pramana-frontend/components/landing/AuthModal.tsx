'use client';

import React, { useState } from 'react';
import { useApp } from '../../lib/context';
import { Modal } from '../ui/Modal';
import { Shield, Lock, Building2, User, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { UserAvatar } from '../ui/UserAvatar';
import { ROLES_CONFIG, normalizeRole } from '../../lib/rbac';

import { UserProfile } from '../../types';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    login,
    signup,
    usersList
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleClose = () => setIsAuthModalOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (authModalMode === 'login') {
        await login(email, password, selectedOrgId);
      } else {
        await signup(name || 'Enterprise Admin', email, password, orgName || 'Acme Security');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const detectedUser: UserProfile | undefined = email.trim() ? usersList.find((u) => u.email.toLowerCase() === email.toLowerCase().trim()) : undefined;
  const detectedConfig = detectedUser ? (ROLES_CONFIG[detectedUser.role] || ROLES_CONFIG['ciso']) : ROLES_CONFIG['ciso'];

  return (
    <Modal
      isOpen={isAuthModalOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <Shield className="w-4 h-4" />
          </div>
          <span>{authModalMode === 'login' ? 'Sign In to Pramana Vault' : 'Initialize Merchant Tenant Vault'}</span>
        </div>
      }
      subtitle={
        authModalMode === 'login'
          ? 'Authenticate with your corporate email. Your assigned compliance role and workspace permissions will be applied automatically.'
          : 'Create a dedicated, multi-framework compliance vault for your organization.'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Toggle Mode */}
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setAuthModalMode('login')}
            className={`flex-1 py-2 rounded-lg transition-all ${authModalMode === 'login' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Sign In (Existing User)
          </button>
          <button
            type="button"
            onClick={() => setAuthModalMode('signup')}
            className={`flex-1 py-2 rounded-lg transition-all ${authModalMode === 'signup' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Sign Up (New Organization)
          </button>
        </div>

        {authModalMode === 'signup' && (
          <>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Your Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aarav Mehta"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Organization / Merchant Name</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. CyberShield Inc. or Nexus Health"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Corporate Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. rahul.verma@acme.com"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Automatically Identified Role Badge */}
        {detectedUser && (
          <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <UserAvatar name={detectedUser.name} size="sm" />
              <div>
                <p className="font-bold text-slate-900 text-xs">{detectedUser.name}</p>
                <p className="text-[11px] text-indigo-700 font-semibold">{detectedUser.roleTitle}</p>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${detectedConfig.badgeBg} ${detectedConfig.badgeText} border ${detectedConfig.badgeBorder}`}>
              Assigned Role
            </span>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-60 text-white font-bold text-xs shadow-md shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>
              {isSubmitting
                ? 'Authenticating...'
                : authModalMode === 'login'
                  ? 'Authenticate & Enter Vault'
                  : 'Provision Isolated Tenant Vault'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </Modal>
  );
};
