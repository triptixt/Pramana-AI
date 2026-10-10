'use client';

import React, { useState } from 'react';
import { useApp } from '../../lib/context';
import { ActiveView } from '../../types';
import {
  hasPageAccess,
  getPageAccess,
  getRoleDefaultPage,
  ROLES_CONFIG,
  normalizeRole,
} from '../../lib/rbac';
import {
  LayoutDashboard,
  FileText,
  ShieldCheck,
  AlertTriangle,
  ClipboardCheck,
  History,
  BarChart3,
  Layers,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  UserCheck,
  Shield,
  Check,
  LogOut,
  ChevronDown,
  Crown,
  Sparkles,
} from 'lucide-react';
import { UserAvatar } from '../ui/UserAvatar';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const {
    activeView,
    setActiveView,
    activeUser,
    setActiveUser,
    organizations,
    currentOrg,
    switchOrganization,
    logout,
    reviewQueueList,
    gapsList,
    showToast,
    setIsAIChatOpen,
  } = useApp();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showOrgMenu, setShowOrgMenu] = useState(false);

  const pendingReviewsCount = reviewQueueList.filter(r => r.status === 'pending_review').length;
  const openGapsCount = gapsList.filter(g => g.status === 'open' || g.status === 'in_remediation').length;

  const allWorkspaceNavItems = [
    { id: 'overview' as ActiveView, label: 'Overview', icon: LayoutDashboard },
    { id: 'select-frameworks' as ActiveView, label: 'Select Frameworks', icon: Layers },
    { id: 'evidence' as ActiveView, label: 'Evidence Library', icon: FileText },
    { id: 'controls' as ActiveView, label: 'Control Center', icon: ShieldCheck },
    {
      id: 'gaps' as ActiveView,
      label: 'Gap Analysis',
      icon: AlertTriangle,
      badge: openGapsCount > 0 ? openGapsCount : undefined,
      badgeColor: 'bg-rose-100 text-rose-700'
    },
    {
      id: 'review-queue' as ActiveView,
      label: 'Review Queue',
      icon: ClipboardCheck,
      badge: pendingReviewsCount > 0 ? pendingReviewsCount : undefined,
      badgeColor: 'bg-indigo-100 text-indigo-700 font-semibold'
    },
    { id: 'audit-trail' as ActiveView, label: 'Audit Trail', icon: History },
    { id: 'reports' as ActiveView, label: 'Reports', icon: BarChart3 },
  ];

  const isSuperAdmin = activeUser.role === 'super_admin' || normalizeRole(activeUser.role) === 'super_admin';

  const superAdminNavItems = [
    { id: 'super-admin' as ActiveView, label: 'Overview', icon: Crown },
    { id: 'admin-organizations' as ActiveView, label: 'Organizations', icon: Building2 },
    { id: 'admin-frameworks' as ActiveView, label: 'Frameworks', icon: Layers },
    { id: 'admin-users' as ActiveView, label: 'Users', icon: Users },
  ];

  const allManagementNavItems = [
    { id: 'frameworks' as ActiveView, label: 'Frameworks', icon: Layers },
    ...(isSuperAdmin ? [{ id: 'super-admin' as ActiveView, label: 'Super Admin Console', icon: Crown }] : []),
    { id: 'settings' as ActiveView, label: 'Settings', icon: Settings },
  ];

  // RBAC Matrix Enforcement: Hide pages marked as ❌ for the active user's role
  const workspaceNavItems = isSuperAdmin ? [] : allWorkspaceNavItems.filter((item) =>
    hasPageAccess(activeUser.role, item.id)
  );

  const managementNavItems = isSuperAdmin
    ? superAdminNavItems
    : allManagementNavItems.filter((item) =>
        hasPageAccess(activeUser.role, item.id)
      );

  return (
    <aside
      className={`relative flex flex-col h-screen bg-white text-slate-700 border-r border-slate-200 transition-all duration-300 select-none z-30 ${collapsed ? 'w-20' : 'w-64'
        }`}
    >
      {/* Top Brand Logo Section */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveView(getRoleDefaultPage(activeUser.role))}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 shadow-md shadow-indigo-900/40 text-white font-bold text-xl ring-1 ring-white/20">
              <Shield className="w-5 h-5 text-white" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-slate-950 font-bold" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  PRAMANA
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-600 border border-indigo-200">
                  AI
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-400 -mt-0.5">Audit &amp; Compliance</p>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setActiveView(getRoleDefaultPage(activeUser.role))}
            className="mx-auto flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 shadow-md shadow-indigo-900/40 text-white font-bold cursor-pointer"
          >
            <Shield className="w-5 h-5" />
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors hidden md:flex"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Scrollable Nav Menu */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
        {/* Workspace Section */}
        {workspaceNavItems.length > 0 && (
          <div>
            {!collapsed && (
              <h4 className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Workspace
              </h4>
            )}
            <nav className="space-y-1">
              {workspaceNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                const access = getPageAccess(activeUser.role, item.id);
                const isNonFull = access !== 'Full';

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`flex items-center w-full px-3 py-2 rounded-xl text-xs font-medium transition-all ${isActive
                      ? 'bg-indigo-50 text-indigo-700 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      } ${collapsed ? 'justify-center' : 'justify-between'}`}
                    title={collapsed ? `${item.label} (${access})` : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`shrink-0 ${collapsed ? 'w-5 h-5' : 'w-4 h-4'} ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!collapsed && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isNonFull && (
                          <span className="px-1.5 py-0.2 text-[9px] font-semibold rounded bg-slate-100 text-slate-500 border border-slate-200">
                            {access}
                          </span>
                        )}
                        {item.badge && (
                          <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* Management Section */}
        {managementNavItems.length > 0 && (
          <div>
            {!collapsed && (
              <h4 className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Management
              </h4>
            )}
            <nav className="space-y-1">
              {managementNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                const access = getPageAccess(activeUser.role, item.id);
                const isNonFull = access !== 'Full';

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`flex items-center w-full px-3 py-2 rounded-xl text-xs font-medium transition-all ${isActive
                      ? 'bg-indigo-50 text-indigo-700 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      } ${collapsed ? 'justify-center' : 'justify-between'}`}
                    title={collapsed ? `${item.label} (${access})` : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`shrink-0 ${collapsed ? 'w-5 h-5' : 'w-4 h-4'} ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!collapsed && isNonFull && (
                      <span className="px-1.5 py-0.2 text-[9px] font-semibold rounded bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                        {access}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Bottom Merchant Organization Selector & User Profile */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2 shrink-0">
        {/* Merchant Org Switcher Dropdown (non-SuperAdmin) */}
        {!collapsed && !isSuperAdmin && (
          <div className="relative">
            <button
              onClick={() => setShowOrgMenu(!showOrgMenu)}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{currentOrg.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{currentOrg.plan} Vault</p>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </button>

            {showOrgMenu && (
              <div className="absolute bottom-12 left-0 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 text-slate-700">
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Organization Vault</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Isolated tenant datasets:</p>
                </div>
                <div className="py-1 space-y-1">
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => {
                        switchOrganization(org.id);
                        setShowOrgMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors ${currentOrg.id === org.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-50 text-slate-600'
                        }`}
                    >
                      <span className="truncate">{org.name}</span>
                      <span className="text-[10px] opacity-75 font-mono">{org.plan}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Profile Card */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className={`w-full flex items-center p-2 rounded-xl hover:bg-slate-100 transition-colors ${collapsed ? 'justify-center' : 'justify-between'
              }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <UserAvatar name={activeUser.name} size="sm" />
              {!collapsed && (
                <div className="min-w-0 text-left">
                  <p className="text-xs font-semibold text-slate-800 truncate">{activeUser.name}</p>
                  <p className="text-[10px] text-indigo-500 font-medium truncate">{activeUser.roleTitle}</p>
                </div>
              )}
            </div>
            {!collapsed && (
              <UserCheck className="w-4 h-4 text-slate-400 hover:text-slate-700 shrink-0 ml-1" />
            )}
          </button>

          {/* User Persona & Logout Dropdown */}
          {showRoleMenu && (
            <div className="absolute bottom-12 left-0 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 text-slate-700">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tenant Persona</p>
                <p className="text-[11px] text-slate-600 mt-0.5">{activeUser.name} ({activeUser.roleTitle})</p>
              </div>

              <div className="py-1 space-y-1">
                <button
                  onClick={() => {
                    logout();
                    setShowRoleMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out to Public Home
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </aside>
  );
};
