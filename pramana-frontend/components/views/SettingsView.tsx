'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../lib/context';
import {
  Building2,
  Lock,
  Bell,
  Layers,
  CheckCircle2,
  ShieldCheck,
  Globe,
  Save,
  Key,
  Database,
  Cloud,
  Check,
  AlertCircle,
  Cpu,
  RefreshCw,
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Filter,
  ShieldAlert,
  Mail,
  User as UserIcon,
} from 'lucide-react';
import { getPageAccess, normalizeRole, ROLES_CONFIG } from '../../lib/rbac';
import { api } from '../../lib/api';
import { Modal } from '../ui/Modal';
import { Role, UserProfile } from '../../types';

export const SettingsView: React.FC = () => {
  const {
    currentOrg,
    updateOrganizationBackend,
    createUserBackend,
    updateUserBackend,
    deleteUserBackend,
    refreshBackendData,
    usersList,
    showToast,
    activeUser,
    isBackendConnected
  } = useApp();

  const [activeTab, setActiveTab] = useState<'users' | 'org' | 'security' | 'notifs' | 'integrations'>('users');

  const access = getPageAccess(activeUser.role, 'settings');

  // Real Organization State from PostgreSQL
  const [orgName, setOrgName] = useState<string>(currentOrg.name || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [frameworks, setFrameworks] = useState<Array<{ id: number; name: string; code: string; description?: string }>>([]);
  const [isLoadingFw, setIsLoadingFw] = useState<boolean>(false);

  // ── User Management State ──────────────────────────────────────────────────
  const [userSearch, setUserSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Add User Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<Role>('control_owner');
  const [newUserPassword, setNewUserPassword] = useState<string>('');
  const [isSubmittingUser, setIsSubmittingUser] = useState<boolean>(false);

  // Edit User Modal State
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editUserName, setEditUserName] = useState<string>('');
  const [editUserEmail, setEditUserEmail] = useState<string>('');
  const [editUserRole, setEditUserRole] = useState<Role>('control_owner');
  const [editUserActive, setEditUserActive] = useState<boolean>(true);
  const [editUserPassword, setEditUserPassword] = useState<string>('');
  const [isUpdatingUser, setIsUpdatingUser] = useState<boolean>(false);

  // Delete User Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);

  // Notification preferences state
  const [notifState, setNotifState] = useState({
    newEvidence: true,
    reviewRequired: true,
    gapDueDate: true,
    evidenceRejected: true,
    weeklyDigest: false,
  });

  // Sync state whenever currentOrg updates
  useEffect(() => {
    if (currentOrg?.name) {
      setOrgName(currentOrg.name);
    }
  }, [currentOrg?.name]);

  // Load real compliance frameworks from PostgreSQL
  useEffect(() => {
    let isMounted = true;
    const loadRealFrameworks = async () => {
      setIsLoadingFw(true);
      try {
        const fwList = await api.frameworks.list();
        if (isMounted) {
          setFrameworks(fwList || []);
        }
      } catch (err: any) {
        console.warn('Could not fetch frameworks for settings:', err);
      } finally {
        if (isMounted) setIsLoadingFw(false);
      }
    };

    loadRealFrameworks();
    return () => {
      isMounted = false;
    };
  }, []);

  const emailDomain = activeUser.email && activeUser.email.includes('@')
    ? activeUser.email.split('@')[1]
    : 'domain.com';

  // Scope users strictly to current organization
  const orgUsers = useMemo(() => {
    return usersList.filter((u) => {
      // Check org match
      if (u.organizationId && currentOrg.id) {
        return u.organizationId === currentOrg.id || u.organizationId.replace('org-', '') === currentOrg.id.replace('org-', '');
      }
      return true;
    });
  }, [usersList, currentOrg.id]);

  // Filtered users based on search & filters
  const filteredUsers = useMemo(() => {
    return orgUsers.filter((u) => {
      const matchesSearch =
        !userSearch.trim() ||
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.roleTitle && u.roleTitle.toLowerCase().includes(userSearch.toLowerCase()));

      const norm = normalizeRole(u.role || '');
      const matchesRole = roleFilter === 'all' || norm === roleFilter;

      const userIsActive = u.status === 'active';
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && userIsActive) ||
        (statusFilter === 'inactive' && !userIsActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [orgUsers, userSearch, roleFilter, statusFilter]);

  // Assignable Organization Roles (Excludes Super Admin for CISO)
  const isSuperAdmin = activeUser.role === 'super_admin' || normalizeRole(activeUser.role) === 'super_admin';
  const assignableRoles: Array<{ id: Role; label: string; desc: string }> = [
    ...(isSuperAdmin ? [{ id: 'super_admin' as Role, label: 'Super Admin', desc: 'Full platform administration' }] : []),
    { id: 'ciso', label: 'CISO / Security Leadership', desc: 'Chief Information Security Officer' },
    { id: 'grc', label: 'GRC Manager', desc: 'Governance, risk & compliance operations' },
    { id: 'internal_auditor', label: 'Internal Auditor', desc: 'Audit inspection & review queue assurance' },
    { id: 'control_owner', label: 'Control Owner', desc: 'Owns assigned controls & evidence upload' },
    { id: 'evidence_contributor', label: 'Evidence Contributor', desc: 'Submits operational evidence artifacts' },
    { id: 'external_auditor', label: 'External Auditor', desc: 'Independent 3rd-party attestation' },
    { id: 'executive', label: 'Executive', desc: 'Board & executive visibility' },
  ];

  const handleSave = async () => {
    if (!orgName.trim() || orgName.trim().length < 2) {
      showToast('Validation Error', 'Organization name must be at least 2 characters long.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      if (orgName.trim() !== currentOrg.name) {
        await updateOrganizationBackend(currentOrg.id, orgName.trim());
      } else {
        showToast('Settings Saved', 'Organization security & preference settings updated.', 'success');
      }
    } catch (err: any) {
      showToast('Save Failed', err.message || 'Could not update organization settings.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Add User Handler ────────────────────────────────────────────────────────
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      showToast('Validation Error', 'Full Name and Email are required.', 'warning');
      return;
    }

    setIsSubmittingUser(true);
    try {
      const numericOrgId = parseInt(currentOrg.id.replace('org-', ''), 10) || 1;
      await createUserBackend({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole,
        password: newUserPassword.trim() || undefined,
        organization_id: numericOrgId,
      });

      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('control_owner');
      setIsAddUserModalOpen(false);
    } catch (err: any) {
      // error handled in createUserBackend toast
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // ── Open Edit Modal ─────────────────────────────────────────────────────────
  const handleOpenEdit = (user: UserProfile) => {
    setEditingUser(user);
    setEditUserName(user.name);
    setEditUserEmail(user.email);
    setEditUserRole(normalizeRole(user.role));
    setEditUserActive(user.status === 'active');
    setEditUserPassword('');
    setIsEditUserModalOpen(true);
  };

  // ── Save Edit User Handler ──────────────────────────────────────────────────
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editUserName.trim() || !editUserEmail.trim()) {
      showToast('Validation Error', 'Full Name and Email are required.', 'warning');
      return;
    }

    setIsUpdatingUser(true);
    try {
      await updateUserBackend(editingUser.id, {
        name: editUserName.trim(),
        email: editUserEmail.trim(),
        role: editUserRole,
        is_active: editUserActive,
        password: editUserPassword.trim() || undefined,
      });
      setIsEditUserModalOpen(false);
      setEditingUser(null);
    } catch (err: any) {
      // error handled in updateUserBackend toast
    } finally {
      setIsUpdatingUser(false);
    }
  };

  // ── Quick Toggle User Status ────────────────────────────────────────────────
  const handleToggleStatus = async (user: UserProfile) => {
    if (user.id === activeUser.id) {
      showToast('Action Denied', 'You cannot deactivate your own account.', 'warning');
      return;
    }
    const newStatus = user.status !== 'active';
    try {
      await updateUserBackend(user.id, {
        is_active: newStatus,
      });
    } catch (err: any) {
      // toast shown in updateUserBackend
    }
  };

  // ── Open Delete Modal ───────────────────────────────────────────────────────
  const handleOpenDelete = (user: UserProfile) => {
    if (user.id === activeUser.id) {
      showToast('Action Denied', 'You cannot delete your own account.', 'warning');
      return;
    }
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  // ── Confirm Delete User ─────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      await deleteUserBackend(userToDelete.id);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (err: any) {
      // error handled in deleteUserBackend
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Role Color Badges
  const getRoleBadge = (role: string) => {
    const norm = normalizeRole(role);
    switch (norm) {
      case 'super_admin':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'ciso':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'grc':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'internal_auditor':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'control_owner':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'evidence_contributor':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'external_auditor':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'executive':
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Organization Settings
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Manage users, security policies, and tenant configurations for <span className="font-semibold text-slate-700">{currentOrg.name}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'users' ? (
            <button
              onClick={() => setIsAddUserModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-900/20 hover:from-indigo-700 hover:to-indigo-800 transition-all shrink-0 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-900/20 hover:from-indigo-700 hover:to-indigo-800 transition-all shrink-0 cursor-pointer disabled:opacity-60"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'users', label: 'User Management', icon: Users },
          { id: 'org', label: 'Organization Profile', icon: Building2 },
          { id: 'security', label: 'Security & Authentication', icon: Lock },
          { id: 'notifs', label: 'Notification Preferences', icon: Bell },
          { id: 'integrations', label: 'Cloud Integrations', icon: Cloud },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: USER MANAGEMENT ────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Users</p>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">{orgUsers.length}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Accounts</p>
                <p className="text-xl font-extrabold text-emerald-600 mt-0.5">
                  {orgUsers.filter((u) => u.status === 'active').length}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Deactivated</p>
                <p className="text-xl font-extrabold text-slate-600 mt-0.5">
                  {orgUsers.filter((u) => u.status !== 'active').length}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                <UserX className="w-4 h-4" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tenant Scope</p>
                <p className="text-xs font-bold text-indigo-700 mt-1 font-mono truncate max-w-[110px]">
                  {currentOrg.name}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* User Management Main Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Header & Filter Controls */}
            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">User Management</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage users and access within your organization ({currentOrg.name}).
                </p>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-40 sm:w-48"
                  />
                </div>

                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
                >
                  <option value="all">All Roles</option>
                  <option value="ciso">CISO</option>
                  <option value="grc">GRC Manager</option>
                  <option value="internal_auditor">Internal Auditor</option>
                  <option value="control_owner">Control Owner</option>
                  <option value="evidence_contributor">Evidence Contributor</option>
                  <option value="external_auditor">External Auditor</option>
                  <option value="executive">Executive</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Deactivated</option>
                </select>

                {/* Add User Action */}
                <button
                  onClick={() => setIsAddUserModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add User</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">User & Email</th>
                    <th className="px-5 py-3">Organization Role</th>
                    <th className="px-5 py-3">Account Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((u) => {
                      const isActive = u.status === 'active';
                      const isSelf = u.id === activeUser.id;
                      const roleConfig = ROLES_CONFIG[normalizeRole(u.role || '')] || ROLES_CONFIG['ciso'];

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* User info */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                                {u.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">{u.name}</span>
                                  {isSelf && (
                                    <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                                      You
                                    </span>
                                  )}
                                </div>
                                <span className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                                  <Mail className="w-3 h-3 text-slate-400" />
                                  {u.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${getRoleBadge(u.role || '')}`}>
                              <ShieldCheck className="w-3 h-3" />
                              {roleConfig ? roleConfig.title : u.role}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-3.5">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-semibold">
                                <UserX className="w-3 h-3" />
                                Deactivated
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit Button */}
                              <button
                                onClick={() => handleOpenEdit(u)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                title="Edit User Details & Role"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Toggle Status Button */}
                              {!isSelf && (
                                <button
                                  onClick={() => handleToggleStatus(u)}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isActive
                                      ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                      : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                    }`}
                                  title={isActive ? 'Deactivate User Account' : 'Activate User Account'}
                                >
                                  {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                </button>
                              )}

                              {/* Delete Button */}
                              {!isSelf && (
                                <button
                                  onClick={() => handleOpenDelete(u)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete or Revoke User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 text-xs">
                        <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-600">No users found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {userSearch || roleFilter !== 'all' || statusFilter !== 'all'
                            ? 'No organization users match your search criteria.'
                            : 'No users registered for this organization yet.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: ORGANIZATION PROFILE ───────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'org' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-6 max-w-3xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900"> Organization Record</h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              Tenant ID: {currentOrg.id.replace('org-', '') || currentOrg.id || '1'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Enter organization name"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Created Date</label>
              <input
                type="text"
                disabled
                value={currentOrg.created_at ? new Date(currentOrg.created_at).toLocaleString() : 'Active Tenant'}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-slate-100 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Live Frameworks in Database</label>
            {isLoadingFw ? (
              <p className="text-xs text-slate-400 py-2">Loading frameworks from PostgreSQL...</p>
            ) : frameworks.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {frameworks.map((fw) => (
                  <span
                    key={fw.id}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{fw.name}</span>
                    <span className="text-[10px] opacity-75 font-mono">({fw.code})</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                No frameworks currently loaded in PostgreSQL. Add frameworks via the Frameworks management page.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: SECURITY & AUTHENTICATION ──────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'security' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-6 max-w-3xl">
          <h3 className="text-sm font-bold text-slate-900">Tenant Security & Access Controls</h3>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Multi-Factor Authentication (MFA)</h4>
                <p className="text-xs text-slate-500">Require TOTP authentication for all tenant accounts</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">Active</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">SSO & Domain Binding</h4>
                <p className="text-xs text-slate-500">Tenant bound to @{emailDomain} user accounts</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 font-bold text-xs font-mono">@{emailDomain}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Session Expiration</h4>
                <p className="text-xs text-slate-500">Stateless JWT session security</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-800 font-bold text-xs">60 Mins</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: NOTIFICATIONS ──────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'notifs' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4 max-w-3xl">
          <h3 className="text-sm font-bold text-slate-900">Alert & Notification Policies</h3>

          {[
            { key: 'newEvidence', label: 'New Evidence Ingestion', desc: 'Notify team when evidence is uploaded to PostgreSQL vault' },
            { key: 'reviewRequired', label: 'Auditor Review Triggers', desc: 'Alert assigned auditor when candidate mapping is ready for decision' },
            { key: 'gapDueDate', label: 'Remediation Reminders', desc: 'Send reminders before gap remediation target deadlines' },
            { key: 'evidenceRejected', label: 'Evidence Review Rejection', desc: 'Notify submitter if an auditor rejects candidate evidence' },
            { key: 'weeklyDigest', label: 'Executive Audit Digest', desc: 'Send compliance summary report for organization leadership' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
              <div>
                <h4 className="text-xs font-bold text-slate-900">{item.label}</h4>
                <p className="text-[11px] text-slate-500">{item.desc}</p>
              </div>

              <button
                onClick={() =>
                  setNotifState((prev) => ({ ...prev, [item.key]: !(prev as any)[item.key] }))
                }
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${(notifState as any)[item.key] ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${(notifState as any)[item.key] ? 'left-6' : 'left-1'
                    }`}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 5: CLOUD INTEGRATIONS ─────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'integrations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
          {[
            { name: 'Amazon Web Services (AWS)', category: 'Cloud Infrastructure', status: 'Connected', icon: Cloud },
            { name: 'Identity & SSO Provider', category: 'IdP & Authentication', status: 'Active', icon: Lock },
            { name: 'Document Vault Storage', category: 'PostgreSQL Storage', status: 'Active', icon: Database },
            { name: 'Issue & Task Tracker', category: 'Remediation Pipeline', status: 'Available', icon: Layers },
          ].map((int) => {
            const Icon = int.icon;
            const isConnected = int.status === 'Connected' || int.status === 'Active';

            return (
              <div key={int.name} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{int.name}</h4>
                    <p className="text-[10px] text-slate-400">{int.category}</p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${isConnected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}
                >
                  {int.status}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: ADD USER ───────────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => !isSubmittingUser && setIsAddUserModalOpen(false)}
        title="Add User to Organization"
        subtitle={`Create and assign an authorized user account for ${currentOrg.name}.`}
      >
        <form onSubmit={handleAddUser} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              disabled={isSubmittingUser}
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Corporate Email *
            </label>
            <input
              type="email"
              required
              disabled={isSubmittingUser}
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder={`e.g. alex@${emailDomain}`}
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Organization Role *
            </label>
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as Role)}
              disabled={isSubmittingUser}
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 focus:bg-white font-medium"
            >
              {assignableRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label} — {r.desc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Initial Password (Optional)
            </label>
            <input
              type="password"
              disabled={isSubmittingUser}
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              placeholder="Default: Pramana@123"
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 focus:bg-white"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              If left blank, defaults to initial temporary password <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">Pramana@123</code>.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmittingUser}
              onClick={() => setIsAddUserModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingUser}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isSubmittingUser ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span>{isSubmittingUser ? 'Creating...' : 'Register User'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: EDIT USER ──────────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={isEditUserModalOpen}
        onClose={() => !isUpdatingUser && setIsEditUserModalOpen(false)}
        title="Edit User Details & Role"
        subtitle={`Update account profile and RBAC permissions for ${editingUser?.name || 'user'}.`}
      >
        <form onSubmit={handleSaveEditUser} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              disabled={isUpdatingUser}
              value={editUserName}
              onChange={(e) => setEditUserName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Corporate Email *
            </label>
            <input
              type="email"
              required
              disabled={isUpdatingUser}
              value={editUserEmail}
              onChange={(e) => setEditUserEmail(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Organization Role
            </label>
            <select
              value={editUserRole}
              onChange={(e) => setEditUserRole(e.target.value as Role)}
              disabled={isUpdatingUser || editingUser?.id === activeUser.id}
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 focus:bg-white font-medium disabled:opacity-60"
            >
              {assignableRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label} — {r.desc}
                </option>
              ))}
            </select>
            {editingUser?.id === activeUser.id && (
              <p className="text-[11px] text-amber-600 mt-1">
                You cannot modify your own role to prevent administrative lockout.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Account Status
            </label>
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="editStatus"
                  checked={editUserActive}
                  disabled={isUpdatingUser || editingUser?.id === activeUser.id}
                  onChange={() => setEditUserActive(true)}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-semibold text-emerald-700">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="editStatus"
                  checked={!editUserActive}
                  disabled={isUpdatingUser || editingUser?.id === activeUser.id}
                  onChange={() => setEditUserActive(false)}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-semibold text-slate-600">Deactivated</span>
              </label>
            </div>
            {editingUser?.id === activeUser.id && (
              <p className="text-[11px] text-amber-600 mt-1">
                You cannot deactivate your own active session.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Reset Password (Optional)
            </label>
            <input
              type="password"
              disabled={isUpdatingUser}
              value={editUserPassword}
              onChange={(e) => setEditUserPassword(e.target.value)}
              placeholder="Leave blank to keep existing password"
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 focus:bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isUpdatingUser}
              onClick={() => setIsEditUserModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdatingUser}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isUpdatingUser ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isUpdatingUser ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: DELETE / REVOKE CONFIRMATION ───────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeletingUser && setIsDeleteModalOpen(false)}
        title="Revoke / Delete User"
        subtitle="Confirm account removal or deactivation."
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-900">Are you sure you want to remove this user?</p>
              <p className="text-rose-700 text-[11px] mt-1">
                You are about to remove user <span className="font-bold">{userToDelete?.name}</span> ({userToDelete?.email}).
              </p>
              <p className="text-rose-600 text-[10px] mt-1">
                If the user has associated audit reviews or evidence submissions, their account will be safely deactivated to preserve historical audit records.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-semibold">User:</span>
              <span className="font-bold text-slate-900">{userToDelete?.name}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-semibold">Email:</span>
              <span className="font-mono text-slate-800">{userToDelete?.email}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-semibold">Role:</span>
              <span className="font-semibold text-indigo-700">{userToDelete?.roleTitle || userToDelete?.role}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isDeletingUser}
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeletingUser}
              onClick={handleConfirmDelete}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isDeletingUser ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>{isDeletingUser ? 'Removing...' : 'Confirm Remove'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

