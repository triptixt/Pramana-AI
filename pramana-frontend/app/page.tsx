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
import { hasPageAccess } from '../lib/rbac';

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
  const { activeView, activeUser } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderActiveView = () => {
    // RBAC Route Guard: Block access if the active role has ❌ for this page
    if (!hasPageAccess(activeUser.role, activeView)) {
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
  const { isAuthenticated } = useApp();

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
