'use client';
import React, { useEffect } from 'react';

export interface CautionModalProps {
  isOpen: boolean;
  title?: string;
  settingName: string;
  description?: string;
  warningDetails?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CautionModal({
  isOpen,
  title = 'Caution: Disable Security Control?',
  settingName,
  description = 'You are about to turn off an institutional protection control. Disabling this setting may expose sensitive clinical data or reduce the security posture of the clinic.',
  warningDetails,
  confirmLabel = 'Yes, Turn Off Protection',
  cancelLabel = 'Cancel & Keep Protected',
  onConfirm,
  onCancel,
}: CautionModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs modal-backdrop-animate"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full border border-[#D5E2D9] shadow-2xl p-6 text-xs font-sans modal-content-animate"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Icon + Title */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg border border-amber-200 shrink-0">
            <i className="fa-solid fa-triangle-exclamation" />
          </div>
          <div className="flex-1">
            <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0 leading-tight">
              {title}
            </h3>
            <p className="text-[11px] text-[#5A7466] m-0 mt-0.5">
              Institutional Governance &amp; Data Security Warning
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 p-1 border-0 bg-transparent cursor-pointer transition text-sm"
            aria-label="Close modal"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Affected Setting Tag */}
        <div className="mb-4 p-3 rounded-xl bg-[#FAFBF8] border border-[#E2E8F0]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
            Target Security Control:
          </span>
          <span className="font-semibold text-xs text-[#1E293B] flex items-center gap-2">
            <i className="fa-solid fa-shield-halved text-[#0B6B3A] text-xs" />
            {settingName}
          </span>
        </div>

        {/* Warning Description */}
        <p className="text-xs text-[#475569] leading-relaxed mb-3">
          {description}
        </p>

        {warningDetails && (
          <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl text-[11px] text-red-800 leading-relaxed mb-5">
            <i className="fa-solid fa-circle-exclamation mr-1.5 text-red-600" />
            {warningDetails}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#EEF2EF]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-[#334155] font-semibold text-xs hover:bg-[#F8FAFC] transition cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <i className="fa-solid fa-check text-xs" />
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
