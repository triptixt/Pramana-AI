'use client';

import React, { useState } from 'react';
import { useApp } from '../../lib/context';
import { StatusBadge } from '../ui/Badge';
import {
  Upload,
  Search,
  Filter,
  FileText,
  Sparkles,
  Eye,
  Download,
  ShieldCheck,
  Lock,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileCode,
  Layers
} from 'lucide-react';
import { FrameworkId, ProcessingStatus } from '../../types';
import { getPageAccess } from '../../lib/rbac';

export const EvidenceLibraryView: React.FC = () => {
  const { evidenceList, setIsUploadModalOpen, setSelectedEvidenceId, setSelectedReviewItem, reviewQueueList, showToast, activeUser } = useApp();

  const access = getPageAccess(activeUser.role, 'evidence');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFileType, setSelectedFileType] = useState<string>('all');
  const [selectedFramework, setSelectedFramework] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filteredEvidence = evidenceList.filter((item) => {
    // RBAC Scoping
    if (access === 'Assigned only') {
      // Scoped to items owned by or mapped to the user/audit scope
      const isAuditorScope = activeUser.role === 'external_auditor';
      const isOwnerMatch = item.owner.toLowerCase().includes(activeUser.name.split(' ')[0].toLowerCase());
      if (!isAuditorScope && !isOwnerMatch) {
        return false;
      }
    } else if (access === 'Create/Upload') {
      // Evidence Contributor views uploaded items & items needing uploads
    }

    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.fileName.toLowerCase().includes(searchTerm.toLowerCase()) || item.owner.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedFileType === 'all' || item.fileType === selectedFileType;
    const matchesFramework = selectedFramework === 'all' || item.frameworks.includes(selectedFramework as FrameworkId);
    const matchesStatus = selectedStatus === 'all' || item.processingStatus === selectedStatus;

    return matchesSearch && matchesType && matchesFramework && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Evidence Library
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Upload security artifacts once. Pramana AI automatically maps them across ISO 27001, SOC 2, PCI & DPDP frameworks.
          </p>
        </div>

        {(access === 'Full' || access === 'Create/Upload') && (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-900/20 hover:from-indigo-700 hover:to-indigo-800 transition-all shrink-0 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Upload Evidence
          </button>
        )}
      </div>

      {/* Drag & Drop Quick Dropzone Bar (Only shown for uploaders) */}
      {(access === 'Full' || access === 'Create/Upload') && (
        <div
          onClick={() => setIsUploadModalOpen(true)}
          className="p-5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/70 hover:bg-indigo-50/30 transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-4 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600">
                Drag & drop new compliance evidence or click to browse
              </p>
              <p className="text-xs text-slate-500">
                PDF, JSON configurations, IAM policies, penetration testing reports, screenshot proofs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium shrink-0 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>AES-256 Encrypted Storage</span>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search evidence files or owner..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* File Type Filter */}
          <select
            value={selectedFileType}
            onChange={(e) => setSelectedFileType(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">All File Formats</option>
            <option value="pdf">PDF Documents</option>
            <option value="json">JSON Policy / Configs</option>
            <option value="png">PNG Screenshots</option>
            <option value="docx">Word DOCX</option>
          </select>

          {/* Framework Filter */}
          <select
            value={selectedFramework}
            onChange={(e) => setSelectedFramework(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">All Frameworks</option>
            <option value="iso-27001">ISO/IEC 27001</option>
            <option value="soc-2">SOC 2 Type II</option>
            <option value="pci-dss">PCI DSS v4.0</option>
            <option value="dpdp">DPDP Act 2023</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">All Processing Statuses</option>
            <option value="mapped">Mapped & Approved</option>
            <option value="needs_review">Needs Auditor Review</option>
            <option value="gap_detected">Gap Detected</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4">Evidence Artifact</th>
                <th className="py-3.5 px-4">Type & Size</th>
                <th className="py-3.5 px-4">Owner</th>
                <th className="py-3.5 px-4">Frameworks</th>
                <th className="py-3.5 px-4">Mapped Controls</th>
                <th className="py-3.5 px-4">AI & Auditor Status</th>
                <th className="py-3.5 px-4">Last Updated</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredEvidence.map((item) => {
                const reviewItem = reviewQueueList.find((r) => r.evidenceId === item.id);

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => setSelectedEvidenceId(item.id)}
                  >
                    {/* Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                          {item.fileType === 'json' ? <FileCode className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 hover:text-indigo-600 transition-colors">{item.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">{item.fileName}</p>
                        </div>
                      </div>
                    </td>

                    {/* Type & Size */}
                    <td className="py-3.5 px-4">
                      <span className="uppercase font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {item.fileType}
                      </span>
                      <span className="text-slate-400 block text-[10px] mt-1">{item.fileSize}</span>
                    </td>

                    {/* Owner */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200" />
                        <span className="text-slate-800">{item.owner}</span>
                      </div>
                    </td>

                    {/* Frameworks */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {item.frameworks.map((fw: FrameworkId) => (
                          <span key={fw} className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {fw.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Mapped Controls */}
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                      {item.mappedControlIds.join(', ')}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        {item.decisionType === 'human_decision' ? (
                          <StatusBadge type="human_decision" size="sm">
                            Approved ({item.auditorName?.split(' ')[0]})
                          </StatusBadge>
                        ) : item.processingStatus === 'gap_detected' ? (
                          <StatusBadge type="potential_gap" size="sm">
                            Gap Detected
                          </StatusBadge>
                        ) : (
                          <StatusBadge type="ai_suggestion" size="sm">
                            AI ({item.aiConfidence}%)
                          </StatusBadge>
                        )}
                      </div>
                    </td>

                    {/* Last Updated */}
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {item.lastUpdated}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedEvidenceId(item.id)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              showToast('AI Processing', `Extracting & Embedding ${item.fileName}...`, 'info');
                              const numericId = parseInt(item.id.replace(/^[a-z]+-/, ''), 10);
                              await import('../../lib/api').then(m => m.api.evidence.process(numericId));
                              showToast('Processing Complete', `${item.fileName} processed successfully`, 'success');
                            } catch (err: any) {
                              showToast('Processing Failed', err.message || 'Failed to process document', 'error');
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-fuchsia-600 hover:bg-fuchsia-50 rounded-lg transition-colors"
                          title="Process Document (Extract & Embed)"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>

                        {reviewItem && reviewItem.status === 'pending_review' && (
                          <button
                            onClick={() => setSelectedReviewItem(reviewItem)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Auditor Review"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => showToast('File Download', `Downloading ${item.fileName}...`, 'info')}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredEvidence.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold">No evidence documents match the filter parameters.</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing your search query or uploading a new file.</p>
          </div>
        )}
      </div>
    </div>
  );
};
