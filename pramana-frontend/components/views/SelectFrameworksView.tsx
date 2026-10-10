'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../lib/context';
import { api } from '../../lib/api';
import {
  Search,
  Check,
  ShieldCheck,
  Layers,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Building2,
  FileCheck,
  Info,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { getPageAccess } from '../../lib/rbac';

interface FrameworkVersionMeta {
  id: number;
  version: string;
  authority: string;
  effective_date: string;
  status: string;
  source_url: string;
}

interface RealFramework {
  id: number;
  name: string;
  code: string;
  description: string;
  category?: string;
  status?: string;
  total_controls?: number;
  versions: FrameworkVersionMeta[];
}

export const SelectFrameworksView: React.FC = () => {
  const { currentOrg, activeUser, setActiveView, showToast, refreshBackendData } = useApp();

  const access = getPageAccess(activeUser.role, 'select-frameworks');
  const isReadOnly = access === 'View' || access === '❌';

  const [frameworks, setFrameworks] = useState<RealFramework[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [initialLoadedIds, setInitialLoadedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Frameworks and Current Org Selections from PostgreSQL via FastAPI
  const loadData = async () => {
    if (!api.auth.getToken()) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const [fws, orgFws] = await Promise.all([
        api.compliance.getFrameworks(),
        api.compliance.getOrganizationFrameworks().catch(() => []),
      ]);

      if (fws && Array.isArray(fws)) {
        setFrameworks(fws);
      }

      if (orgFws && Array.isArray(orgFws)) {
        const activeIds = orgFws.map((of: any) => of.framework_id);
        setSelectedIds(activeIds);
        setInitialLoadedIds(activeIds);
      }
    } catch (err: any) {
      console.error('Failed to load certification frameworks:', err);
      setError(err.message || 'Could not load frameworks from server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentOrg.id]);

  // Toggle selection for a framework
  const toggleFramework = (frameworkId: number) => {
    if (isReadOnly) {
      showToast('Read-Only Access', 'Your current role does not have permission to modify framework assignments.', 'warning');
      return;
    }
    setSelectedIds((prev) =>
      prev.includes(frameworkId)
        ? prev.filter((id) => id !== frameworkId)
        : [...prev, frameworkId]
    );
  };

  // Group filtered frameworks by database category
  const categorizedFrameworks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = frameworks.filter((fw) => {
      if (!q) return true;
      return (
        fw.name.toLowerCase().includes(q) ||
        fw.code.toLowerCase().includes(q) ||
        (fw.description && fw.description.toLowerCase().includes(q)) ||
        (fw.category && fw.category.toLowerCase().includes(q))
      );
    });

    const groups: Record<string, RealFramework[]> = {};

    filtered.forEach((fw) => {
      const cat = fw.category && fw.category.trim() ? fw.category.trim() : 'Other Compliance Frameworks';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(fw);
    });

    return groups;
  }, [frameworks, searchQuery]);

  // Handle saving and proceeding to Evidence Upload
  const handleSaveAndContinue = async () => {
    if (selectedIds.length === 0) {
      showToast('Selection Required', 'Please select at least one certification framework to assess.', 'warning');
      return;
    }

    try {
      setSaving(true);
      const res = await api.compliance.selectFrameworks(selectedIds);
      await refreshBackendData();
      showToast(
        'Frameworks Assigned',
        `${selectedIds.length} framework${selectedIds.length === 1 ? '' : 's'} saved for ${currentOrg.name || 'Organization'}.`,
        'success'
      );
      // Navigate to Evidence Library
      setActiveView('evidence');
    } catch (err: any) {
      console.error('Failed to save framework selection:', err);
      showToast('Save Failed', err.message || 'Could not persist framework selection. Please retry.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const orgDisplayName = currentOrg.name || activeUser.organizationName || 'your organization';

  return (
    <div className="min-h-screen pb-32">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              Engagement Scope & Compliance Baseline
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Select certification frameworks
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
              Choose every framework this engagement covers, from the full catalog. Evidence uploaded later gets mapped once against all of them — no need to collect the same document twice.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
              title="Refresh catalog from PostgreSQL"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Sync Catalog
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-6 relative max-w-2xl">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search frameworks — e.g. GDPR, HIPAA, ISO 27001..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl shadow-xs placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-medium px-1.5 py-0.5"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
          <p className="text-sm font-semibold text-slate-800">Loading published frameworks from database...</p>
          <p className="text-xs text-slate-500 mt-1">Retrieving latest schemas, versions, and control counts.</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-rose-900">Unable to load framework catalog</h3>
            <p className="text-xs text-rose-700 mt-1">{error}</p>
            <button
              onClick={loadData}
              className="mt-3 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && Object.keys(categorizedFrameworks).length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">No frameworks found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No published frameworks matched your search for "${searchQuery}".`
              : 'No published frameworks are currently available in the database.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-lg hover:bg-indigo-100 transition"
            >
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* Categorized Frameworks List */}
      {!loading && !error && Object.entries(categorizedFrameworks).map(([categoryName, groupFrameworks]) => {
        const totalInCategory = groupFrameworks.length;
        const selectedInCategory = groupFrameworks.filter((f) => selectedIds.includes(f.id)).length;

        return (
          <div key={categoryName} className="mb-8">
            {/* Category Header */}
            <div className="flex items-center justify-between pb-2.5 mb-3.5 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-600" />
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  {categoryName}
                </h2>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80">
                {selectedInCategory} of {totalInCategory} selected
              </span>
            </div>

            {/* Framework Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-3.5">
              {groupFrameworks.map((fw) => {
                const isSelected = selectedIds.includes(fw.id);
                const latestVersion = fw.versions && fw.versions.length > 0 ? fw.versions[0] : null;
                const controlCount = fw.total_controls || 0;

                return (
                  <div
                    key={fw.id}
                    onClick={() => toggleFramework(fw.id)}
                    className={`group relative rounded-xl p-3.5 cursor-pointer transition-all duration-150 select-none border text-left flex flex-col justify-between ${
                      isSelected
                        ? 'bg-indigo-50/60 border-indigo-500 shadow-xs ring-1 ring-indigo-500/30'
                        : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs hover:-translate-y-0.5'
                    }`}
                  >
                    <div>
                      {/* Top Header inside Card */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100/80">
                              {fw.code}
                            </span>
                            {latestVersion?.version && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                {latestVersion.version}
                              </span>
                            )}
                          </div>
                          <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition truncate" title={fw.name}>
                            {fw.name}
                          </h3>
                        </div>

                        {/* Custom Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'border border-slate-300 group-hover:border-indigo-400 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Meta */}
                    <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-1 font-medium text-slate-600">
                        <FileCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>{controlCount} controls</span>
                      </div>

                      {latestVersion?.authority && (
                        <span className="text-[10px] font-medium text-slate-400 truncate max-w-[120px]" title={latestVersion.authority}>
                          {latestVersion.authority}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Sticky Bottom Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl py-4 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                <span className="text-indigo-600 font-extrabold">{selectedIds.length}</span> framework{selectedIds.length === 1 ? '' : 's'} selected for <span className="font-semibold">{orgDisplayName}</span>
              </p>
              <p className="text-xs text-slate-500">
                Evidence processed will automatically map across all selected standards in real time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleSaveAndContinue}
              disabled={selectedIds.length === 0 || saving || isReadOnly}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow-md hover:bg-indigo-700 active:scale-98 transition disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving Selection...
                </>
              ) : (
                <>
                  Continue to evidence upload
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
