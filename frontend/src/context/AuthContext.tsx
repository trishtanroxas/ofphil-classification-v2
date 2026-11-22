'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export type UserRole = 'patient' | 'msw' | 'admin' | 'nurse';

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  isCharity?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (role: UserRole, usernameOrId?: string) => void;
  logout: (redirectUrl?: string) => void;
}

const DEFAULT_USERS: Record<UserRole, AuthUser> = {
  patient: {
    id: 'M26-11-00001',
    name: 'Juan Dela Cruz',
    username: 'M26-11-00001',
    role: 'patient',
    isCharity: false,
  },
  msw: {
    id: 'STF-MSW-0012',
    name: 'Maria Santos, RSW',
    username: 'msw_lead',
    role: 'msw',
  },
  admin: {
    id: 'STF-ADM-0001',
    name: 'Dr. Roberto Reyes',
    username: 'admin_sys',
    role: 'admin',
  },
  nurse: {
    id: 'STF-NUR-0044',
    name: 'Nurse Clara Garcia',
    username: 'nurse_desk',
    role: 'nurse',
  },
};

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/login-admin',
  '/login-msw',
  '/login-patient',
  '/verify-otp',
  '/reset-password',
];

function isPublicRoute(pathname: string | null): boolean {
  if (!pathname) return true;
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith('/forgot-password')) return true;
  if (pathname.startsWith('/login')) return true;
  return false;
}

function getLoginUrlForPath(pathname: string | null, lastRole?: string | null): string {
  if (pathname?.startsWith('/admin')) return '/login-admin';
  if (pathname?.startsWith('/portal')) return '/login-patient';
  if (
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/assessment') ||
    pathname?.startsWith('/documents') ||
    pathname?.startsWith('/profile') ||
    pathname?.startsWith('/settings')
  ) {
    return '/login-msw';
  }
  if (lastRole === 'admin' || lastRole === 'nurse') return '/login-admin';
  if (lastRole === 'msw') return '/login-msw';
  if (lastRole === 'patient') return '/login-patient';
  return '/login-admin';
}

function getWorkspaceHomeForRole(role: UserRole): string {
  if (role === 'admin' || role === 'nurse') return '/admin/patient-records';
  if (role === 'msw') return '/dashboard';
  return '/portal?tab=dashboard';
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'admin',
  isAuthenticated: false,
  isHydrated: false,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole>('admin');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  const syncAuthFromStorage = useCallback(() => {
    try {
      const savedRole = localStorage.getItem('ofphil_current_role') as UserRole | null;
      const loggedOutFlag = sessionStorage.getItem('ofphil_logged_out') === 'true';

      if (savedRole && DEFAULT_USERS[savedRole] && !loggedOutFlag) {
        setRole(savedRole);
        setUser(DEFAULT_USERS[savedRole]);
        setIsAuthenticated(true);
        return { authenticated: true, role: savedRole };
      } else {
        setUser(null);
        setIsAuthenticated(false);
        return { authenticated: false, role: null };
      }
    } catch (e) {
      setUser(null);
      setIsAuthenticated(false);
      return { authenticated: false, role: null };
    }
  }, []);

  // Initial hydration + route guard + BFCache / Back-button protection
  useEffect(() => {
    const state = syncAuthFromStorage();
    setIsHydrated(true);

    // Handle browser back/forward cache (pageshow) and history popstate
    const handlePageShowOrPopState = () => {
      const currentPath = window.location.pathname;
      const savedRole = localStorage.getItem('ofphil_current_role') as UserRole | null;
      const loggedOutFlag = sessionStorage.getItem('ofphil_logged_out') === 'true';
      const lastRole = localStorage.getItem('ofphil_last_role');

      if ((!savedRole || loggedOutFlag) && !isPublicRoute(currentPath)) {
        const targetLogin = getLoginUrlForPath(currentPath, lastRole);
        window.location.replace(targetLogin);
      }
    };

    window.addEventListener('pageshow', handlePageShowOrPopState);
    window.addEventListener('popstate', handlePageShowOrPopState);

    return () => {
      window.removeEventListener('pageshow', handlePageShowOrPopState);
      window.removeEventListener('popstate', handlePageShowOrPopState);
    };
  }, [syncAuthFromStorage]);

  // Enforce route protection & strict role isolation whenever pathname or auth state changes
  useEffect(() => {
    if (!isHydrated) return;

    const savedRole = localStorage.getItem('ofphil_current_role') as UserRole | null;
    const loggedOutFlag = sessionStorage.getItem('ofphil_logged_out') === 'true';
    const lastRole = localStorage.getItem('ofphil_last_role');

    // 1. If not authenticated and trying to access a protected route (e.g. via browser Back button after logout)
    if ((!savedRole || loggedOutFlag) && !isPublicRoute(pathname)) {
      const targetLogin = getLoginUrlForPath(pathname, lastRole);
      window.location.replace(targetLogin);
      return;
    }

    // 2. If authenticated, enforce strict role boundaries so an Admin route never renders with a Patient sidebar or vice versa
    if (savedRole && !loggedOutFlag && !isPublicRoute(pathname)) {
      const isOnAdminRoute = pathname?.startsWith('/admin');
      const isOnPatientRoute = pathname?.startsWith('/portal');
      const isOnMswRoute =
        pathname?.startsWith('/dashboard') ||
        pathname?.startsWith('/assessment') ||
        pathname?.startsWith('/documents') ||
        pathname === '/profile' ||
        pathname === '/settings';

      if (isOnAdminRoute && savedRole !== 'admin' && savedRole !== 'nurse') {
        window.location.replace(getWorkspaceHomeForRole(savedRole));
        return;
      }
      if (isOnPatientRoute && savedRole !== 'patient') {
        window.location.replace(getWorkspaceHomeForRole(savedRole));
        return;
      }
      if (isOnMswRoute && savedRole === 'patient') {
        window.location.replace('/portal?tab=dashboard');
        return;
      }
    }
  }, [pathname, isHydrated, isAuthenticated, role]);

  const login = (newRole: UserRole, customName?: string) => {
    const baseUser = DEFAULT_USERS[newRole] || DEFAULT_USERS.admin;
    const finalUser = customName ? { ...baseUser, name: customName } : baseUser;
    setRole(newRole);
    setUser(finalUser);
    setIsAuthenticated(true);
    try {
      sessionStorage.removeItem('ofphil_logged_out');
      localStorage.setItem('ofphil_current_role', newRole);
      localStorage.setItem('ofphil_last_role', newRole);
    } catch (e) {}
  };

  const logout = (redirectUrl?: string) => {
    const currentRole = role;
    try {
      localStorage.setItem('ofphil_last_role', currentRole);
      localStorage.removeItem('ofphil_current_role');
      sessionStorage.clear();
      sessionStorage.setItem('ofphil_logged_out', 'true');
    } catch (e) {}

    setUser(null);
    setIsAuthenticated(false);

    const target =
      redirectUrl ||
      (currentRole === 'msw'
        ? '/login-msw'
        : currentRole === 'patient'
          ? '/login-patient'
          : '/login-admin');

    if (typeof window !== 'undefined') {
      // Push and replace history state so Back button stays on the login page
      window.history.pushState(null, '', target);
      window.location.replace(target);
    }
  };

  // Prevent rendering protected route content with wrong fallback role while redirecting after logout
  const shouldBlockRender = isHydrated && !isAuthenticated && !isPublicRoute(pathname);

  return (
    <AuthContext.Provider value={{ user, role, isAuthenticated, isHydrated, login, logout }}>
      {shouldBlockRender ? null : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
