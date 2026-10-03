'use client';

import React, { useState } from 'react';
import { useApp } from '../../lib/context';
import { Modal } from '../ui/Modal';
import { Upload, FileText, CheckCircle2, Shield, Sparkles, Loader2, Lock, AlertTriangle } from 'lucide-react';

export const UploadEvidenceModal: React.FC = () => {
  const { isUploadModalOpen, setIsUploadModalOpen, uploadEvidence } = useApp();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStep, setUploadStep] = useState<'select' | 'uploading' | 'processing' | 'done'>('select');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
  };

  const startUploadProcess = async () => {
    if (!selectedFile) return;

    setErrorMessage(null);
    setUploadStep('uploading');
    setProgress(30);

    try {
      // Advance to processing state while backend parses and saves
      const timer = setTimeout(() => {
        setProgress(70);
        setUploadStep('processing');
      }, 400);

      // Perform real database persist & AI pipeline
      await uploadEvidence(selectedFile);
      clearTimeout(timer);

      setProgress(100);
      setUploadStep('done');

      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (err: any) {
      console.error('Evidence upload error:', err);
      setErrorMessage(err.message || 'Failed to save evidence to the database. Please try again.');
      setUploadStep('select');
      setProgress(0);
    }
  };

  const handleClose = () => {
    setIsUploadModalOpen(false);
    setSelectedFile(null);
    setUploadStep('select');
    setProgress(0);
    setErrorMessage(null);
  };

  return (
    <Modal
      isOpen={isUploadModalOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-indigo-600" />
          <span>Upload Security & Compliance Evidence</span>
        </div>
      }
      subtitle="Pramana AI will automatically scan your document, extract security clauses, and save to PostgreSQL database."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {uploadStep === 'select' && (
          <>
            {/* Drag & Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-50/50'
                  : selectedFile
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60'
              }`}
            >
              <input
                type="file"
                onChange={handleFileInput}
                accept=".pdf,.json,.png,.docx,.csv"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />

              {!selectedFile ? (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Drag & drop your evidence document here, or <span className="text-indigo-600 underline">browse</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports PDF, JSON policy exports, PNG screenshots, DOCX, CSV (Max 50MB)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3 p-2">
                  <FileText className="w-8 h-8 text-emerald-600" />
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-900">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>
              )}
            </div>

            {/* Security Note */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-100/80 border border-slate-200/80 text-xs text-slate-600">
              <Lock className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                <strong>Enterprise Security Notice:</strong> All files are encrypted using AES-256 at rest and TLS 1.3 in transit. AI processing remains completely contained within your tenant.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                disabled={!selectedFile}
                onClick={startUploadProcess}
                className={`px-5 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
                  selectedFile
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-900/20 hover:from-indigo-700 hover:to-indigo-800 cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Upload & Run AI Analysis
              </button>
            </div>
          </>
        )}

        {/* Progress Stages */}
        {(uploadStep === 'uploading' || uploadStep === 'processing' || uploadStep === 'done') && (
          <div className="py-6 space-y-6 text-center">
            {uploadStep === 'done' ? (
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-in zoom-in-75 duration-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            )}

            <div>
              <h4 className="text-base font-bold text-slate-900">
                {uploadStep === 'uploading' && 'Encrypting & Uploading Evidence...'}
                {uploadStep === 'processing' && 'Pramana AI Scanning & Mapping Controls...'}
                {uploadStep === 'done' && 'AI Analysis Complete!'}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {uploadStep === 'uploading' && 'Writing encrypted binary blob to secure vault.'}
                {uploadStep === 'processing' && 'Extracting key security clauses and calculating confidence score.'}
                {uploadStep === 'done' && 'Item added to Auditor Review Queue for human verification.'}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
