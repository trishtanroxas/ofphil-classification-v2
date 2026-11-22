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

  // Route-change auto dismissal and instant top progress bar pulse
  useEffect(() => {
    setActive(false);
    setIsProgressBarActive(true);
    const timer = setTimeout(() => {
      setIsProgressBarActive(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [pathname]);

  const showLoading = (message?: string) => {
    if (message) setLoadingMessage(message);
    setActive(true);
    setIsProgressBarActive(true);
    // Safety auto-dismiss fallback so overlay never gets stuck
    setTimeout(() => {
      setActive(false);
      setIsProgressBarActive(false);
    }, 2000);
  };

  const hideLoading = () => {
    setActive(false);
    setIsProgressBarActive(false);
  };

  // Instant trigger for immediate feedback on clicks (e.g. tabs, links, actions)
  const startProgress = () => {
    setIsProgressBarActive(true);
    // Auto reset after 500ms if not explicitly stopped
    setTimeout(() => {
      setIsProgressBarActive(false);
    }, 500);
  };

  const stopProgress = () => {
    setIsProgressBarActive(false);
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
      {children}

      {/* Modern Clinical Transition Overlay Loading Screen - Logo Only */}
      {active && (
        <div className="fixed inset-0 z-[9999] bg-[#FAFBF8]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 select-none transition-all duration-300">
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
