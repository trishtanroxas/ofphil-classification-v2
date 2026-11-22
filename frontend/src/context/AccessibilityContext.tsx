'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export type FontSizeOption = '100%' | '110%' | '120%' | '130%';
export type ThemeModeOption = 'Light' | 'Dark' | 'High Contrast';
export type FontFamilyOption = 'Clinical' | 'Serif' | 'Low-Vision';
export type TableDensityOption = 'Comfortable' | 'Compact';

export interface AccessibilityPreferences {
  fontSize: FontSizeOption;
  themeMode: ThemeModeOption;
  fontFamily: FontFamilyOption;
  tableDensity: TableDensityOption;
}

export const DEFAULT_ACCESSIBILITY_PREFS: AccessibilityPreferences = {
  fontSize: '100%',
  themeMode: 'Light',
  fontFamily: 'Clinical',
  tableDensity: 'Comfortable',
};

interface AccessibilityContextType extends AccessibilityPreferences {
  setFontSize: (size: FontSizeOption) => void;
  setThemeMode: (mode: ThemeModeOption) => void;
  setFontFamily: (family: FontFamilyOption) => void;
  setTableDensity: (density: TableDensityOption) => void;
  resetAccessibility: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType>({
  ...DEFAULT_ACCESSIBILITY_PREFS,
  setFontSize: () => {},
  setThemeMode: () => {},
  setFontFamily: () => {},
  setTableDensity: () => {},
  resetAccessibility: () => {},
});

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

function applyAccessibilityToDocument(prefs: AccessibilityPreferences) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // 1. Font Size & Scaling
  const scaleMap: Record<FontSizeOption, { attr: string; px: string }> = {
    '100%': { attr: '100', px: '16px' },
    '110%': { attr: '110', px: '17.6px' },
    '120%': { attr: '120', px: '19.2px' },
    '130%': { attr: '130', px: '20.8px' },
  };
  const scale = scaleMap[prefs.fontSize] || scaleMap['100%'];
  root.setAttribute('data-font-scale', scale.attr);
  root.style.fontSize = scale.px;

  // 2. Theme & Contrast Mode
  const themeAttr =
    prefs.themeMode === 'Dark'
      ? 'dark'
      : prefs.themeMode === 'High Contrast'
        ? 'high-contrast'
        : 'light';
  root.setAttribute('data-theme', themeAttr);

  // 3. Font Family Style
  const fontAttr =
    prefs.fontFamily === 'Serif'
      ? 'serif'
      : prefs.fontFamily === 'Low-Vision'
        ? 'accessible-sans'
        : 'clinical';
  root.setAttribute('data-font-family', fontAttr);

  // 4. Table Row Density
  const densityAttr = prefs.tableDensity === 'Compact' ? 'compact' : 'comfortable';
  root.setAttribute('data-table-density', densityAttr);
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const { user, role, isAuthenticated, isHydrated } = useAuth();
  const [prefs, setPrefs] = useState<AccessibilityPreferences>(DEFAULT_ACCESSIBILITY_PREFS);

  const actorId = isAuthenticated && user?.id ? user.id : 'guest';
  const actorRole = isAuthenticated ? role : 'guest';
  const storageKey = `ofphil_a11y_prefs_${actorRole}_${actorId}`;

  // Apply to DOM whenever prefs change
  useEffect(() => {
    applyAccessibilityToDocument(prefs);
  }, [prefs]);

  // Load user-scoped preferences on auth hydration or account switch
  useEffect(() => {
    if (!isHydrated) return;

    let initial = DEFAULT_ACCESSIBILITY_PREFS;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        initial = {
          fontSize: parsed.fontSize || '100%',
          themeMode: parsed.themeMode || 'Light',
          fontFamily: parsed.fontFamily || 'Clinical',
          tableDensity: parsed.tableDensity || 'Comfortable',
        };
      }
    } catch {
      initial = DEFAULT_ACCESSIBILITY_PREFS;
    }

    setPrefs(initial);
    applyAccessibilityToDocument(initial);

    if (!isAuthenticated) return;

    // Synchronize with backend user preferences
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/settings/accessibility`, {
          headers: {
            'x-user-role': actorRole,
            'x-user-id': actorId,
          },
        });
        if (!res.ok || cancelled) return;
        const serverPrefs = await res.json();
        if (serverPrefs && !cancelled) {
          const merged: AccessibilityPreferences = {
            fontSize: serverPrefs.fontSize || initial.fontSize,
            themeMode: serverPrefs.themeMode || initial.themeMode,
            fontFamily: serverPrefs.fontFamily || initial.fontFamily,
            tableDensity: serverPrefs.tableDensity || initial.tableDensity,
          };
          setPrefs(merged);
          applyAccessibilityToDocument(merged);
          try {
            localStorage.setItem(storageKey, JSON.stringify(merged));
          } catch {
            // ignore storage quota errors
          }
        }
      } catch {
        // Gracefully keep local preferences if backend is unreachable
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isHydrated, isAuthenticated, storageKey, actorRole, actorId]);

  const persistPrefs = useCallback(
    (next: AccessibilityPreferences) => {
      setPrefs(next);
      applyAccessibilityToDocument(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      if (isAuthenticated) {
        fetch(`${API_BASE}/admin/settings/accessibility`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': actorRole,
            'x-user-id': actorId,
          },
          body: JSON.stringify(next),
        }).catch(() => {
          // Graceful fallback without breaking UI
        });
      }
    },
    [storageKey, isAuthenticated, actorRole, actorId]
  );

  const setFontSize = useCallback(
    (fontSize: FontSizeOption) => persistPrefs({ ...prefs, fontSize }),
    [prefs, persistPrefs]
  );

  const setThemeMode = useCallback(
    (themeMode: ThemeModeOption) => persistPrefs({ ...prefs, themeMode }),
    [prefs, persistPrefs]
  );

  const setFontFamily = useCallback(
    (fontFamily: FontFamilyOption) => persistPrefs({ ...prefs, fontFamily }),
    [prefs, persistPrefs]
  );

  const setTableDensity = useCallback(
    (tableDensity: TableDensityOption) => persistPrefs({ ...prefs, tableDensity }),
    [prefs, persistPrefs]
  );

  const resetAccessibility = useCallback(() => {
    persistPrefs(DEFAULT_ACCESSIBILITY_PREFS);
  }, [persistPrefs]);

  return (
    <AccessibilityContext.Provider
      value={{
        ...prefs,
        setFontSize,
        setThemeMode,
        setFontFamily,
        setTableDensity,
        resetAccessibility,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  return useContext(AccessibilityContext);
}
