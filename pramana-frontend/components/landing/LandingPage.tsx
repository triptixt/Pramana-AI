'use client';

import React from 'react';
import { PublicNavbar } from './Navbar';
import { PublicHero } from './Hero';
import { PublicFeatures } from './Features';
import { PublicFrameworks } from './Frameworks';
import { PublicTenantArchitecture } from './TenantArchitecture';
import { PublicFooter } from './Footer';
import { AuthModal } from './AuthModal';
import { ToastContainer } from '../ui/Toast';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 font-sans selection:bg-indigo-500 selection:text-white">
      <PublicNavbar />
      <PublicHero />
      <PublicFeatures />
      <PublicFrameworks />
      <PublicTenantArchitecture />
      <PublicFooter />
      <AuthModal />
      <ToastContainer />
    </div>
  );
};
