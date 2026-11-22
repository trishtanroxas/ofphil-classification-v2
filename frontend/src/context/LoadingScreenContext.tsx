'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface LoadingScreenContextType {
  active: boolean;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  startProgress: () => void;
  stopProgress: () => void;
  isProgressBarActive: boolean;
}

const LoadingScreenContext = createContext<LoadingScreenContextType>({
  active: false,
  showLoading: () => {},
  hideLoading: () => {},
  startProgress: () => {},
  stopProgress: () => {},
  isProgressBarActive: false,
});

export function LoadingScreenProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading OFPHIL Clinical System...');
  const [isProgressBarActive, setIsProgressBarActive] = useState(false);
  const pathname = usePathname();
  const progressTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Route-change auto dismissal and instant top progress bar pulse
  useEffect(() => {
    setActive(false);
    setIsProgressBarActive(true);
    if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    progressTimerRef.current = setTimeout(() => {
      setIsProgressBarActive(false);
    }, 200);
    return () => {
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    };
  }, [pathname]);

  const showLoading = (message?: string) => {
    if (message) setLoadingMessage(message);
    setActive(true);
    setIsProgressBarActive(true);
    // Safety auto-dismiss fallback so overlay never gets permanently stuck
    setTimeout(() => {
      setActive(false);
      setIsProgressBarActive(false);
    }, 1500);
  };

  const hideLoading = () => {
    setActive(false);
    setIsProgressBarActive(false);
    if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
  };

  // Instant trigger for immediate visual feedback on clicks (tabs, links, actions)
  const startProgress = () => {
    setIsProgressBarActive(true);
    if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    progressTimerRef.current = setTimeout(() => {
      setIsProgressBarActive(false);
    }, 600);
  };

  const stopProgress = () => {
    setIsProgressBarActive(false);
    if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
  };

  return (
    <LoadingScreenContext.Provider
      value={{
        active,
        showLoading,
        hideLoading,
        startProgress,
        stopProgress,
        isProgressBarActive,
      }}
    >
      {/* Universal Fixed Top Loading Progress Bar - Non-blocking pointer-events-none */}
      {isProgressBarActive && (
        <div
          className="fixed top-0 left-0 right-0 h-[3px] bg-[#E6F1EA]/80 overflow-hidden z-[99999] pointer-events-none transition-opacity duration-150"
          aria-hidden="true"
        >
          <div className="h-full bg-gradient-to-r from-[#0B6B3A] via-[#10B981] to-[#047857] shadow-xs animate-clinical-progress" />
        </div>
      )}

      {children}

      {/* Modern Clinical Transition Overlay Loading Screen - Logo Only */}
      {active && (
        <div className="fixed inset-0 z-[9999] bg-[#FAFBF8]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 select-none transition-all duration-200">
          <div className="relative">
            {/* Pulsing ring aura */}
            <div className="w-24 h-24 rounded-full bg-[#E6F1EA] animate-ping absolute inset-0 opacity-75" />
            <div
              className="relative w-24 h-24 rounded-full bg-white border-2 border-[#0B6B3A] shadow-lg flex items-center justify-center p-3 animate-pulse"
              style={{ width: '96px', height: '96px', maxWidth: '96px', maxHeight: '96px' }}
            >
              <img
                src="/icons/ophil-logo.png"
                alt="OFPHIL Official Logo"
                width={64}
                height={64}
                style={{ width: '64px', height: '64px', maxWidth: '64px', maxHeight: '64px', objectFit: 'contain', display: 'block' }}
                className="w-16 h-16 object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </LoadingScreenContext.Provider>
  );
}

export function useLoadingScreen() {
  return useContext(LoadingScreenContext);
}
