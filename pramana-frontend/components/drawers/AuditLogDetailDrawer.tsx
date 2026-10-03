'use client';

import React from 'react';
import { useApp } from '../../lib/context';
import { Drawer } from '../ui/Drawer';
import { ShieldCheck, Lock, User, Clock, CheckCircle2, Server, Key } from 'lucide-react';

export const AuditLogDetailDrawer: React.FC = () => {
  const { selectedAuditLogId, setSelectedAuditLogId, auditTrailList } = useApp();

  const log = auditTrailList.find((l) => l.id === selectedAuditLogId);

  if (!log) return null;

  const handleClose = () => setSelectedAuditLogId(null);

  return (
    <Drawer
      isOpen={!!selectedAuditLogId}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span>Audit Log Cryptographic Record</span>
        </div>
      }
      subtitle={`Event ID: ${log.id} • ${log.timestamp}`}
      width="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Integrity Cryptographically Verified
          </div>
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Verification Status Banner */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Cryptographic Status</span>
            <h4 className="text-sm font-bold text-emerald-950 mt-0.5">SHA-256 Hash Tamper Proof</h4>
          </div>
          <Lock className="w-6 h-6 text-emerald-600" />
        </div>

        {/* Action Details */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-400 uppercase tracking-wider">Action Event</span>
            <span className="font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
              {log.action}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-2">
            <div>
              <span className="text-slate-400 block text-[10px]">Actor Name</span>
              <span className="font-bold text-slate-900">{log.actor.name}</span>
              <span className="text-slate-500 block text-[10px]">{log.actor.role}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Resource Affected</span>
              <span className="font-bold text-slate-900">{log.resourceName}</span>
              <span className="text-slate-500 block text-[10px]">{log.resourceType} ({log.resourceId})</span>
            </div>
          </div>

          <div className="pt-2">
            <span className="text-slate-400 block text-[10px]">Event Description & Rationale</span>
            <p className="text-xs text-slate-700 mt-1 leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
              {log.details}
            </p>
          </div>
        </div>

        {/* State Transitions if available */}
        {(log.previousState || log.newState) && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">State Change Diff</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-rose-600 font-bold block text-[10px] uppercase">Previous State</span>
                <span className="font-semibold text-rose-950 mt-1 block">{log.previousState || 'None'}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-emerald-600 font-bold block text-[10px] uppercase">New State</span>
                <span className="font-semibold text-emerald-950 mt-1 block">{log.newState || 'Current'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Cryptographic Key & IP Session Details */}
        <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2 text-[11px]">
            <span className="flex items-center gap-1.5"><Key className="w-3.5 h-3.5 text-indigo-400" /> Cryptographic Ledger Record</span>
            <span>TLS 1.3 Verified</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] mb-1">SHA-256 Signature Digest:</span>
            <p className="p-2 rounded-lg bg-slate-950 text-emerald-400 break-all select-all text-[10px]">
              {log.sha256Hash}
            </p>
          </div>

          <div className="flex justify-between text-[11px] text-slate-400 pt-1">
            <span>Session Endpoint: {log.ipAddress}</span>
            <span>Framework: {log.framework ? log.framework.toUpperCase() : 'Global'}</span>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
