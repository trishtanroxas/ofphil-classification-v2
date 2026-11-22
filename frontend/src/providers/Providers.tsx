'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext';
import { LoadingScreenProvider } from '@/context/LoadingScreenContext';
import { NavigationBlockerProvider } from '@/context/NavigationBlockerContext';

function DynamicPageTitleUpdater() {
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  useEffect(() => {
    let pageLabel = 'Ophthalmological Foundation of the Philippines';

    if (pathname === '/') {
      pageLabel = 'Ophthalmological Foundation of the Philippines';
    } else if (pathname.startsWith('/login-admin')) {
      pageLabel = 'Staff & Admin Sign In';
    } else if (pathname.startsWith('/login-msw')) {
      pageLabel = 'MSW Caseworker Sign In';
    } else if (pathname.startsWith('/login-patient') || pathname === '/login') {
      pageLabel = 'Patient Portal Sign In';
    } else if (pathname.startsWith('/forgot-password')) {
      pageLabel = 'Account Password Recovery';
    } else if (pathname.startsWith('/reset-password')) {
      pageLabel = 'Set Up New Password';
    } else if (pathname.startsWith('/verify-otp')) {
      pageLabel = 'Two-Factor OTP Verification';
    } else if (pathname === '/admin/register-patient') {
      pageLabel = 'Register Patient';
    } else if (pathname === '/admin/patient-records') {
      if (tab === 'charity') pageLabel = 'Charity Patients · Patient Records';
      else if (tab === 'regular' || tab === 'non-charity') pageLabel = 'Regular Patients · Patient Records';
      else if (tab === 'with-accounts' || tab === 'accounts') pageLabel = 'Patients with Accounts · Patient Records';
      else pageLabel = 'Patient Records Directory';
    } else if (pathname === '/admin/patient-records/charity') {
      pageLabel = 'Charity Patients · Patient Records';
    } else if (pathname === '/admin/patient-records/non-charity') {
      pageLabel = 'Regular Patients · Patient Records';
    } else if (pathname === '/admin/patient-records/with-accounts') {
      pageLabel = 'Patients with Accounts · Patient Records';
    } else if (pathname.startsWith('/admin/patient-records/')) {
      const pid = decodeURIComponent(pathname.replace('/admin/patient-records/', '').split('/')[0]);
      pageLabel = `Patient Record (${pid})`;
    } else if (pathname.startsWith('/admin/inquiries')) {
      pageLabel = 'Patient Inquiries Desk';
    } else if (pathname.startsWith('/admin/settings')) {
      pageLabel = 'System Settings & Governance';
    } else if (pathname.startsWith('/admin/role-management')) {
      pageLabel = 'Role & Staff Management';
    } else if (pathname.startsWith('/admin/profile')) {
      pageLabel = 'Administrator Profile';
    } else if (pathname.startsWith('/dashboard')) {
      pageLabel = 'MSW Caseworker Dashboard';
    } else if (pathname.startsWith('/assessment/new')) {
      pageLabel = 'New Patient Charity Assessment';
    } else if (pathname.startsWith('/queue')) {
      pageLabel = 'Evaluation Queue & Case Files';
    } else if (pathname.startsWith('/inquiries')) {
      pageLabel = 'Patient Inquiries · MSW Desk';
    } else if (pathname.startsWith('/audit')) {
      pageLabel = 'Quotation Audit & Surgery Verification';
    } else if (pathname.startsWith('/analytics')) {
      pageLabel = 'Reports & Analytics';
    } else if (pathname.startsWith('/settings')) {
      pageLabel = 'MSW Caseworker Settings';
    } else if (pathname.startsWith('/profile')) {
      pageLabel = 'MSW Caseworker Profile';
    } else if (pathname.startsWith('/portal')) {
      if (tab === 'applications') pageLabel = 'My Assistance Applications · Patient Portal';
      else if (tab === 'profile') pageLabel = 'My Profile · Patient Portal';
      else if (tab === 'settings') pageLabel = 'Settings & Preferences · Patient Portal';
      else pageLabel = 'Patient Dashboard · Patient Portal';
    }

    document.title = `${pageLabel} · OFPHIL`;
  }, [pathname, tab]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <AuthProvider>
      <LoadingScreenProvider>
        <NavigationBlockerProvider>
          <QueryClientProvider client={queryClient}>
            <Suspense fallback={null}>
              <DynamicPageTitleUpdater />
            </Suspense>
            {children}
            <Toaster
              position="top-right"
              richColors
              duration={3500}
              toastOptions={{
                className: 'animate-toast-fade-in',
                style: {
                  borderRadius: '12px',
                  fontFamily: 'var(--font-sans, Figtree, sans-serif)',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                },
              }}
            />
          </QueryClientProvider>
        </NavigationBlockerProvider>
      </LoadingScreenProvider>
    </AuthProvider>
  );
}
