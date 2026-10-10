'use client';

import React, { useState } from 'react';
import { useApp } from '../../lib/context';
import {
  Search,
  Bell,
  HelpCircle,
  Building2,
  ChevronRight,
  User,
  Settings,
  LogOut,
  CheckCheck,
  ShieldAlert,
  Sparkles,
  Menu,
  ChevronDown,
  ShieldCheck,
  Check,
} from 'lucide-react';
import {
  ROLES_CONFIG,
  getPageAccess,
  hasPageAccess,
  normalizeRole,
} from '../../lib/rbac';
import { UserAvatar } from '../ui/UserAvatar';
import { Role } from '../../types';

interface TopNavProps {
  onMobileMenuClick?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onMobileMenuClick }) => {
  const {
    activeView,
    setActiveView,
    activeUser,
    currentOrg,
    organizations,
    switchOrganization,
    logout,
    setIsSearchOpen,
    setIsAIChatOpen,
    notificationsList,
    markNotificationRead,
    clearAllNotifications,
    showToast
  } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);

  const normRole = normalizeRole(activeUser.role);
  const isSuperAdmin = activeUser.role === 'super_admin' || normRole === 'super_admin';
  const roleConfig = ROLES_CONFIG[normRole] || ROLES_CONFIG['ciso'];
  const currentAccess = getPageAccess(activeUser.role, activeView);

  const unreadCount = notificationsList.filter((n) => !n.read).length;

  const viewTitles: Record<string, { category: string; title: string }> = {
    overview: { category: 'Workspace', title: 'Overview Dashboard' },
    'super-admin': { category: 'Platform Governance', title: 'Super Admin Console' },
    superadmin: { category: 'Platform Governance', title: 'Super Admin Console' },
    evidence: { category: 'Workspace', title: 'Evidence Library' },
    controls: { category: 'Workspace', title: 'Control Center' },
    gaps: { category: 'Workspace', title: 'Gap Analysis' },
    'review-queue': { category: 'Workspace', title: 'Auditor Review Queue' },
    'audit-trail': { category: 'Workspace', title: 'Audit Trail' },
    reports: { category: 'Workspace', title: 'Reports & Analytics' },
    frameworks: { category: 'Management', title: 'Frameworks' },
    team: { category: 'Management', title: 'Team & Access' },
    settings: { category: 'Management', title: 'Settings' },
  };

  const currentView = viewTitles[activeView] || { category: 'Workspace', title: 'Dashboard' };

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuClick}
          className="p-2 text-slate-500 hover:text-slate-800 rounded-lg md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav className="flex items-center gap-2 text-xs md:text-sm font-medium">
          <span className="text-slate-400">{currentView.category}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-bold">{currentView.title}</span>
        </nav>
      </div>

      {/* Center: Global Search Trigger */}
      <div className="hidden sm:flex items-center flex-1 max-w-md mx-6">
        <button
          onClick={() => setIsSearchOpen(true)}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50/80 text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-100/70 transition-all text-xs font-medium group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            <span>
              {isSuperAdmin
                ? 'Search organizations, users, frameworks, controls...'
                : `Search ${currentOrg?.name || 'organization'} evidence, controls, gaps...`}
            </span>
          </div>
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 rounded-md shadow-2xs">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right Actions: Notifications, Help, Org Switcher, User Avatar */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Mobile Search Button */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl sm:hidden"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Notifications Icon & Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">{currentOrg.name} System Alerts</h4>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-700 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <button
                  onClick={() => clearAllNotifications()}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Mark all read
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notificationsList.length > 0 ? (
                  notificationsList.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markNotificationRead(notif.id);
                        if (notif.linkTarget && hasPageAccess(activeUser.role, notif.linkTarget as any)) {
                          setActiveView(notif.linkTarget as any);
                        }
                        setShowNotifications(false);
                      }}
                      className={`p-4 hover:bg-slate-50/80 cursor-pointer transition-colors ${!notif.read ? 'bg-indigo-50/30' : ''
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {notif.type === 'review_required' && <Sparkles className="w-4 h-4 text-indigo-600" />}
                          {notif.type === 'gap_alert' && <ShieldAlert className="w-4 h-4 text-rose-600" />}
                          {notif.type === 'evidence_uploaded' && <CheckCheck className="w-4 h-4 text-emerald-600" />}
                          {notif.type === 'system' && <Bell className="w-4 h-4 text-slate-500" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-bold text-slate-900">{notif.title}</h5>
                            <span className="text-[10px] text-slate-400">{notif.timestamp}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{notif.description}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No notifications for {currentOrg.name}.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        {!isSuperAdmin && activeView !== 'super-admin' && (
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
        )}

        {/* Merchant Organization Switcher Dropdown (for non-SuperAdmin users) */}
        {!isSuperAdmin && activeView !== 'super-admin' && (
          <div className="relative hidden lg:block">
            <button
              onClick={() => setShowOrgDropdown(!showOrgDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-xs font-bold text-slate-800 transition-colors"
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>{currentOrg.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showOrgDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-150">
                <p className="px-3 py-1.5 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100">
                  Organization Vault
                </p>
                <div className="py-1 space-y-1">
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => {
                        switchOrganization(org.id);
                        setShowOrgDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors ${currentOrg.id === org.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                    >
                      <span>{org.name}</span>
                      <span className="text-[10px] opacity-75 font-mono">{org.plan}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Profile Avatar & Role Badge */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2.5 p-1 pl-2 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all text-left"
          >
            <div className="hidden sm:flex flex-col items-end">
              <div className="flex items-center gap-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${roleConfig.badgeBg} ${roleConfig.badgeText} border ${roleConfig.badgeBorder}`}>
                  {roleConfig.title}
                </span>
              </div>
              <span className="text-xs font-bold text-slate-800 leading-tight mt-0.5">
                {activeUser.name}
              </span>
            </div>
            <UserAvatar name={activeUser.name} size="md" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5 mb-2">
                  <UserAvatar name={activeUser.name} size="md" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{activeUser.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{activeUser.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100/70">
                  <span className="text-[11px] text-slate-500 font-medium">{roleConfig.department}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${roleConfig.badgeBg} ${roleConfig.badgeText} border ${roleConfig.badgeBorder}`}>
                    {roleConfig.title}
                  </span>
                </div>
              </div>

              <div className="py-2 space-y-1">
                {hasPageAccess(activeUser.role, 'settings') && (
                  <button
                    onClick={() => {
                      setActiveView('settings');
                      setShowUserDropdown(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 text-left"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    Organization Settings
                  </button>
                )}
              </div>

              <div className="border-t border-slate-100 pt-2 mt-1">
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 text-left"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  Sign Out to Home Page
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
