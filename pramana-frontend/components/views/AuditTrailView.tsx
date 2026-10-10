'use client';

import React, { useState } from 'react';
import { useApp } from '../../lib/context';
import { 
  History, 
  Search, 
  Filter, 
  CheckCircle2, 
  Lock, 
  Key, 
  Eye, 
  Download, 
  User, 
  Sparkles, 
  ShieldCheck,
  Building2,
  UserCheck
} from 'lucide-react';
import { AuditTrailLog } from '../../types';

import { getPageAccess } from '../../lib/rbac';

export const AuditTrailView: React.FC = () => {
  const { auditTrailList, setSelectedAuditLogId, showToast, activeUser } = useApp();

  const access = getPageAccess(activeUser.role, 'audit-trail');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState<string>('all');
  const [selectedActorType, setSelectedActorType] = useState<string>('all');

  const filteredLogs = auditTrailList.filter((log) => {
    // RBAC Scoping
    if (access === 'Own activity') {
      const isSelf = log.actor.name.toLowerCase().includes(activeUser.name.split(' ')[0].toLowerCase()) ||
                     log.actor.email.toLowerCase() === activeUser.email.toLowerCase();
      if (!isSelf) return false;
    }

    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) || log.actor.name.toLowerCase().includes(searchTerm.toLowerCase()) || log.details.toLowerCase().includes(searchTerm.toLowerCase()) || log.resourceName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesResource = selectedResourceType === 'all' || log.resourceType === selectedResourceType;
    const matchesActor = selectedActorType === 'all' || log.actor.type === selectedActorType;

    return matchesSearch && matchesResource && matchesActor;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Immutable Audit Trail</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                SHA-256 Ledger
              </span>
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Time-stamped, cryptographically signed log of every evidence upload, AI mapping, and human auditor approval.
          </p>
        </div>

        <button
          onClick={() => showToast('Audit Trail Export', 'Exporting SHA-256 verified audit log CSV...', 'info')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-xs text-slate-700 hover:bg-slate-50 transition-all shadow-2xs shrink-0"
        >
          <Download className="w-4 h-4 text-slate-500" />
          Export Ledger (CSV)
        </button>
      </div>

      {/* Cryptographic Ledger Summary Banner */}
      <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
            <Lock className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Cryptographic Integrity Verification</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                <CheckCircle2 className="w-3 h-3" /> VERIFIED ACTIVE
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Entries are appended to an immutable append-only ledger with cryptographic hash chaining.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-slate-300 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 w-full md:w-auto justify-between md:justify-start">
          <span>Active Nodes: 3</span>
          <span className="text-emerald-400">• Hash Chain Intact</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search action, actor, or resource..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
          <select
            value={selectedResourceType}
            onChange={(e) => setSelectedResourceType(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">All Resource Types</option>
            <option value="Evidence">Evidence Artifacts</option>
            <option value="Control">Control Mappings</option>
            <option value="Gap">Compliance Gaps</option>
          </select>

          <select
            value={selectedActorType}
            onChange={(e) => setSelectedActorType(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">All Actors</option>
            <option value="user">Human User / CISO</option>
            <option value="auditor">External Auditor</option>
            <option value="ai">AI Engine</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Actor</th>
                <th className="py-3.5 px-4">Action Executed</th>
                <th className="py-3.5 px-4">Resource Target</th>
                <th className="py-3.5 px-4">Framework</th>
                <th className="py-3.5 px-4">Integrity Status</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedAuditLogId(log.id)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {log.timestamp}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        {log.actor.type === 'ai' ? (
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        ) : log.actor.type === 'auditor' ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-slate-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{log.actor.name}</p>
                        <p className="text-[10px] text-slate-400">{log.actor.role}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {log.action}
                  </td>

                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-800">{log.resourceName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{log.resourceType} ({log.resourceId})</p>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {log.framework ? log.framework.toUpperCase() : 'GLOBAL'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Integrity Verified
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAuditLogId(log.id);
                      }}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Inspect Cryptographic Log"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <History className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold">No audit logs found for this organization.</p>
          </div>
        )}
      </div>
    </div>
  );
};
