'use client';

import React from 'react';
import { useApp } from '../../lib/context';
import { ShieldAlert, Lock, ArrowLeft } from 'lucide-react';
import { getRoleDefaultPage, ROLES_CONFIG, normalizeRole } from '../../lib/rbac';
import { ActiveView } from '../../types';

interface AccessRestrictedProps {
  pageName: string;
  pageId: ActiveView;
}

export const AccessRestricted: React.FC<AccessRestrictedProps> = ({ pageName, pageId }) => {
  const { activeUser, setActiveView } = useApp();
  const normRole = normalizeRole(activeUser.role);
  const cfg = ROLES_CONFIG[normRole] || ROLES_CONFIG['ciso'];

  const allowedPage = getRoleDefaultPage(activeUser.role);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-200">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-rose-50 border-2 border-rose-200 flex items-center justify-center text-rose-600 shadow-lg shadow-rose-500/10">
          <Lock className="w-10 h-10" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-white">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
        </div>
      </div>

      <div className="space-y-2 mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100/70 text-rose-700 border border-rose-200 mb-2">
          <span>RBAC Enforcement: 403 Restricted</span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Access Restricted to {pageName}
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed max-w-lg">
          Your current account, <span className="font-bold text-slate-800">{activeUser.name}</span> (<span className="font-bold text-indigo-600">{activeUser.roleTitle}</span>), is not authorized to access this workspace under your organization's security policy.
        </p>
      </div>

      {/* Role Identity Box */}
      <div className="w-full p-4 mb-8 rounded-2xl bg-white border border-slate-200 text-left shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <p className="text-xs font-bold text-slate-900">{cfg.title}</p>
            <p className="text-[11px] text-slate-500">{cfg.department}</p>
          </div>
          <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${cfg.badgeBg} ${cfg.badgeText} border ${cfg.badgeBorder}`}>
            Assigned Role
          </span>
        </div>
        <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
          {cfg.description}
        </p>
      </div>

      {/* Action */}
      <div className="flex items-center justify-center">
        <button
          onClick={() => setActiveView(allowedPage)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Authorized Workspace ({allowedPage})</span>
        </button>
      </div>
    </div>
  );
};
