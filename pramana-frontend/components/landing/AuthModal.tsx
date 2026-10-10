'use client';

import React, { useState } from 'react';
import { useApp } from '../../lib/context';
import { Modal } from '../ui/Modal';
import { Shield, Lock, Mail, ArrowRight, KeyRound, ArrowLeft } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    login,
    resetPassword,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleClose = () => {
    setIsAuthModalOpen(false);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (mode === 'login') {
      if (!email.trim() || !password) return;
      setIsSubmitting(true);
      try {
        const ok = await login(email.trim(), password);
        if (!ok) {
          setErrorMessage('Invalid email or password. Please check your credentials.');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Authentication failed');
      } finally {
        setIsSubmitting(false);
      }
    } else if (mode === 'reset') {
      if (!email.trim() || !newPassword) return;
      if (newPassword.length < 6) {
        setErrorMessage('New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }
      setIsSubmitting(true);
      try {
        const ok = await resetPassword(email.trim(), newPassword);
        if (ok) {
          setSuccessMessage('Password updated successfully in database! You can now sign in with your new password.');
          setPassword(newPassword);
          setNewPassword('');
          setConfirmPassword('');
          setMode('login');
        } else {
          setErrorMessage('Password reset failed. Please ensure the email exists in the database.');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Password reset failed');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Modal
      isOpen={isAuthModalOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <Shield className="w-4 h-4" />
          </div>
          <span>
            {mode === 'login' ? 'Sign In to Pramana Vault' : 'Reset Vault Password'}
          </span>
        </div>
      }
      subtitle={
        mode === 'login'
          ? 'Enter your corporate credentials to access your isolated compliance vault.'
          : 'Update your account password in the PostgreSQL database.'
      }
      maxWidth="md"
    >
      {errorMessage && (
        <div className="p-3 rounded-xl mb-4 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-xl mb-4 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Corporate Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. user@company.com"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {mode === 'login' ? (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">Password</label>
              <button
                type="button"
                onClick={() => { setMode('reset'); setErrorMessage(null); setSuccessMessage(null); }}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
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
        ) : (
          <>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">New Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Confirm New Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMessage(null); setSuccessMessage(null); }}
                className="text-[11px] text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back to Sign In</span>
              </button>
            </div>
          </>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-60 text-white font-bold text-xs shadow-md shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>
              {isSubmitting
                ? 'Processing...'
                : mode === 'login'
                  ? 'Sign In & Enter Vault'
                  : 'Update Password in PostgreSQL'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-center text-slate-400 mt-2">
          {mode === 'login'
            ? 'Tenant organizations and accounts are provisioned exclusively by Super Admin.'
            : 'Password hash will be securely encrypted and updated in PostgreSQL.'}
        </p>
      </form>
    </Modal>
  );
};
