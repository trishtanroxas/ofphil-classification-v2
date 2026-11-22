'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface NavigationBlockerContextType {
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  confirmNavigation: (targetUrl: string | (() => void)) => boolean;
  handleLinkClick: (e: React.MouseEvent, href: string) => boolean;
}

const NavigationBlockerContext = createContext<NavigationBlockerContextType>({
  isDirty: false,
  setIsDirty: () => {},
  confirmNavigation: () => true,
  handleLinkClick: () => true,
});

export function NavigationBlockerProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isDirty, setIsDirty] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | (() => void) | null>(null);

  // For programmatic buttons/actions that need unsaved-changes check before proceeding
  const confirmNavigation = useCallback(
    (target: string | (() => void)) => {
      if (!isDirty) {
        if (typeof target === 'string') {
          router.push(target);
        } else {
          target();
        }
        return true;
      }
      setPendingAction(() => target);
      setModalOpen(true);
      return false;
    },
    [isDirty, router]
  );

  // For standard Next.js <Link> elements to avoid duplicate concurrent router.push conflicts
  const handleLinkClick = useCallback(
    (e: React.MouseEvent, href: string) => {
      if (isDirty) {
        e.preventDefault();
        e.stopPropagation();
        setPendingAction(() => href);
        setModalOpen(true);
        return false;
      }
      // When not dirty, let Next.js <Link> navigate naturally on a single click without competing router.push calls
      return true;
    },
    [isDirty]
  );

  const handleConfirmDiscard = () => {
    setIsDirty(false);
    setModalOpen(false);
    if (pendingAction) {
      if (typeof pendingAction === 'string') {
        router.push(pendingAction);
      } else {
        pendingAction();
      }
      setPendingAction(null);
    }
  };

  const handleCancel = () => {
    setModalOpen(false);
    setPendingAction(null);
  };

  return (
    <NavigationBlockerContext.Provider value={{ isDirty, setIsDirty, confirmNavigation, handleLinkClick }}>
      {children}

      {/* Reusable Clinical In-App Modal for Unsaved Changes (No Native Localhost Prompts) */}
      {modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#D5E2D9] max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 border border-[#FDE68A]">
                <i className="fa-solid fa-triangle-exclamation text-lg" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-[#10241A] font-['Outfit'] m-0 mb-1">
                  Unsaved Changes Detected
                </h3>
                <p className="text-xs text-[#5A7466] m-0 leading-relaxed">
                  You have unsaved changes in this form. Navigating away or switching views will discard your recent edits.
                </p>
              </div>
            </div>

            <div className="bg-[#FAFBF8] border border-[#EEF2EF] rounded-xl p-3 mb-5 text-[11.5px] text-[#475569] flex items-center gap-2">
              <i className="fa-solid fa-circle-info text-[#0B6B3A] shrink-0" />
              <span>Click &quot;Stay &amp; Keep Editing&quot; to save your changes first, or proceed to discard.</span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#EEF2EF]">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded-xl border border-[#D5E2D9] hover:bg-slate-50 text-[#64748B] font-semibold text-xs cursor-pointer transition bg-transparent"
              >
                Stay &amp; Keep Editing
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="px-5 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs border-0 cursor-pointer shadow-sm flex items-center gap-2 transition"
              >
                <i className="fa-solid fa-arrow-right-from-bracket text-xs" />
                <span>Discard &amp; Proceed</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </NavigationBlockerContext.Provider>
  );
}

export function useNavigationBlocker() {
  return useContext(NavigationBlockerContext);
}
