'use client';

import React, { useState } from 'react';
import { useApp } from '../../lib/context';
import { Users, UserPlus, ShieldCheck, Mail, Lock } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { UserProfile, Role } from '../../types';

export const TeamAccessView: React.FC = () => {
  const { currentOrg, activeUser, setActiveUser, usersList, createUserBackend, showToast } = useApp();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('grc');

  const orgUsers = usersList.filter((u) => u.organizationId === currentOrg.id);

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !inviteName.trim()) return;

    await createUserBackend({
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
    });

    setIsInviteModalOpen(false);
    setInviteEmail('');
    setInviteName('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Team & Access Control ({currentOrg.name})
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Manage enterprise team permissions, external auditor access scope, and RBAC security policies.
          </p>
        </div>

        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-900/20 hover:from-indigo-700 hover:to-indigo-800 transition-all shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" /> Invite Team Member
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tenant Active Users</p>
            <p className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5">{orgUsers.length}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">External Auditors</p>
            <p className="text-2xl font-extrabold text-emerald-600 font-mono mt-0.5">
              {orgUsers.filter((u) => u.role === 'external_auditor').length}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Invites</p>
            <p className="text-2xl font-extrabold text-amber-600 font-mono mt-0.5">
              {orgUsers.filter((u) => u.status === 'pending').length}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">MFA Enforced</p>
            <p className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5">100%</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4">User Name & Email</th>
                <th className="py-3.5 px-4">Role Title</th>
                <th className="py-3.5 px-4">Organization Vault</th>
                <th className="py-3.5 px-4">Last Active</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {orgUsers.map((usr) => (
                <tr key={usr.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                      <div>
                        <p className="font-bold text-slate-900">{usr.name}</p>
                        <p className="text-[11px] text-slate-400">{usr.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-lg border ${usr.role === 'ciso'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : usr.role === 'external_auditor'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                      {usr.roleTitle}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-slate-700 font-medium">
                    {usr.organizationName}
                  </td>

                  <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                    {usr.lastActive}
                  </td>

                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${usr.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                      {usr.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setActiveUser(usr);
                          showToast('Active Role Set', `Switched view persona to ${usr.name}.`, 'info');
                        }}
                        className="px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        Switch Role
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orgUsers.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold">No team members found for this organization.</p>
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title={`Invite Team Member to ${currentOrg.name}`}
        subtitle="Send an access invitation to join this isolated merchant organization vault."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name</label>
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="e.g., Sarah Jenkins"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Corporate Email Address</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="e.g., sarah@company.com"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Assigned Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-medium"
            >
              <option value="ciso">Enterprise CISO (Executive Admin)</option>
              <option value="grc">GRC / Compliance Manager</option>
              <option value="internal_auditor">Internal Auditor</option>
              <option value="control_owner">Control Owner</option>
              <option value="evidence_contributor">Evidence Contributor</option>
              <option value="external_auditor">External Auditor (Audit Review Scope)</option>
              <option value="executive">Executive Leadership</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setIsInviteModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSendInvite}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all"
            >
              Send Access Invitation
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
