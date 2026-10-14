'use client';

import React, { useState } from 'react';
import { AppProvider, useApp } from '../lib/context';
import { LandingPage } from '../components/landing/LandingPage';
import { Sidebar } from '../components/layout/Sidebar';
import { TopNav } from '../components/layout/TopNav';
import { GlobalSearchModal } from '../components/layout/GlobalSearchModal';
import { ToastContainer } from '../components/ui/Toast';

// Modals & Drawers
import { UploadEvidenceModal } from '../components/modals/UploadEvidenceModal';
import { ReviewDecisionModal } from '../components/modals/ReviewDecisionModal';
import { EvidenceDetailDrawer } from '../components/drawers/EvidenceDetailDrawer';
import { ControlDetailDrawer } from '../components/drawers/ControlDetailDrawer';
import { AuditLogDetailDrawer } from '../components/drawers/AuditLogDetailDrawer';


// Views
import { OverviewView } from '../components/views/OverviewView';
import { SelectFrameworksView } from '../components/views/SelectFrameworksView';
import { EvidenceLibraryView } from '../components/views/EvidenceLibraryView';
import { ControlCenterView } from '../components/views/ControlCenterView';
import { GapAnalysisView } from '../components/views/GapAnalysisView';
import { ReviewQueueView } from '../components/views/ReviewQueueView';
import { AuditTrailView } from '../components/views/AuditTrailView';
import { ReportsView } from '../components/views/ReportsView';
import { FrameworksView } from '../components/views/FrameworksView';
import { SuperAdminView } from '../components/views/SuperAdminView';
import { SettingsView } from '../components/views/SettingsView';
import { AccessRestricted } from '../components/ui/AccessRestricted';
import { canAccessPage, hasPageAccess } from '../lib/rbac';
import { ActiveView } from '../types';

const PAGE_NAMES: Record<string, string> = {
  overview: 'Overview Dashboard',
  'select-frameworks': 'Select Certification Frameworks',
  evidence: 'Evidence Library',
  controls: 'Control Center',
  gaps: 'Gap Analysis',
  'review-queue': 'Review Queue',
  'audit-trail': 'Audit Trail',
  reports: 'Reports & Analytics',
  frameworks: 'Frameworks',
  'super-admin': 'Super Admin Console',
  'admin-organizations': 'Organizations Management',
  'admin-frameworks': 'Frameworks Registry',
  'admin-users': 'User Management',
  settings: 'Settings',
};

function ProtectedMerchantDashboard() {
  const { activeView, setActiveView, activeUser } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync ?view= from URL on load and URL parameter changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view') as ActiveView | null;
      if (viewParam && viewParam !== activeView && PAGE_NAMES[viewParam]) {
        setActiveView(viewParam);
      }
    }
  }, []);

  // Update URL query parameter when activeView changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.get('view') !== activeView) {
        currentUrl.searchParams.set('view', activeView);
        window.history.replaceState(null, '', currentUrl.toString());
      }
    }
  }, [activeView]);

  const renderActiveView = () => {
    // RBAC Route Guard: Block access if the active role does not have permission for this page
    if (!canAccessPage(activeUser, activeView)) {
      return (
        <AccessRestricted
          pageName={PAGE_NAMES[activeView] || activeView}
          pageId={activeView}
        />
      );
    }

    switch (activeView) {
      case 'overview':
        return <OverviewView />;
      case 'select-frameworks':
        return <SelectFrameworksView />;
      case 'evidence':
        return <EvidenceLibraryView />;
      case 'controls':
        return <ControlCenterView />;
      case 'gaps':
        return <GapAnalysisView />;
      case 'review-queue':
        return <ReviewQueueView />;
      case 'audit-trail':
        return <AuditTrailView />;
      case 'reports':
        return <ReportsView />;
      case 'frameworks':
        return <FrameworksView />;
      case 'super-admin':
        return <SuperAdminView initialTab="overview" />;
      case 'admin-organizations':
        return <SuperAdminView initialTab="organizations" />;
      case 'admin-frameworks':
        return <SuperAdminView initialTab="frameworks" />;
      case 'admin-users':
        return <SuperAdminView initialTab="users" />;
      case 'settings':
        return <SettingsView />;
      default:
        return <OverviewView />;
    }
  };

  return (
    <div className="flex h-screen bg-[#FAF9F6] text-slate-900 font-sans overflow-hidden antialiased">
      {/* Sidebar for Desktop */}
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-64 bg-slate-900 h-full">
            <Sidebar collapsed={false} setCollapsed={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopNav onMobileMenuClick={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Global Overlays & Modals */}
      <ToastContainer />
      <GlobalSearchModal />
      <UploadEvidenceModal />
      <ReviewDecisionModal />

      {/* Global Slide-Over Drawers */}
      <EvidenceDetailDrawer />
      <ControlDetailDrawer />
      <AuditLogDetailDrawer />

    </div>
  );
}

function MainRootRouter() {
  const { isAuthenticated, isAuthLoading } = useApp();

  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-semibold tracking-tight text-slate-100">Verifying Security & Access Permissions</h2>
        <p className="text-sm text-slate-400 mt-1">Authenticating session and resolving authorized pages...</p>
      </div>
    );
  }

  // If not authenticated -> Show Public Landing Page with Login / Signup
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // If authenticated -> Show Merchant's Organization Dashboard
  return <ProtectedMerchantDashboard />;
}

export default function Page() {
  return (
    <AppProvider>
      <MainRootRouter />
    </AppProvider>
  );
}
