'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

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
  login: (role: UserRole, usernameOrId?: string) => void;
  logout: () => void;
}

const DEFAULT_USERS: Record<UserRole, AuthUser> = {
  patient: {
    id: 'PAT-PORTAL-00000000',
    name: 'Patient Beneficiary',
    username: 'patient_portal',
    role: 'patient',
    isCharity: true,
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

const AuthContext = createContext<AuthContextType>({
  user: DEFAULT_USERS.admin,
  role: 'admin',
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>('admin');
  const [user, setUser] = useState<AuthUser | null>(DEFAULT_USERS.admin);

  useEffect(() => {
    try {
      const savedRole = localStorage.getItem('ofphil_current_role') as UserRole;
      if (savedRole && DEFAULT_USERS[savedRole]) {
        setRole(savedRole);
        setUser(DEFAULT_USERS[savedRole]);
      } else {
        setRole('admin');
        setUser(DEFAULT_USERS.admin);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const login = (newRole: UserRole, customName?: string) => {
    const baseUser = DEFAULT_USERS[newRole] || DEFAULT_USERS.msw;
    const finalUser = customName ? { ...baseUser, name: customName } : baseUser;
    setRole(newRole);
    setUser(finalUser);
    try {
      localStorage.setItem('ofphil_current_role', newRole);
    } catch (e) {}
  };

  const logout = () => {
    try {
      localStorage.removeItem('ofphil_current_role');
    } catch (e) {}
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
