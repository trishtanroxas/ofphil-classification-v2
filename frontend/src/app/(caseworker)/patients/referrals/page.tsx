'use client';
import React, { Suspense } from 'react';
import MSWPatientsContent from '@/components/MSWPatientsView';
import { DashboardLayout } from '@/components/DashboardLayout';

export default function ReferralsPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="py-20 text-center">
            <i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#0B6B3A] mb-3" />
            <p className="text-xs font-semibold text-[#64748B]">Loading medical assistance referrals...</p>
          </div>
        </DashboardLayout>
      }
    >
      <MSWPatientsContent initialTab="referrals" />
    </Suspense>
  );
}
