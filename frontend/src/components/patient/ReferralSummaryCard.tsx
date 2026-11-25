'use client';

import React from 'react';
import Link from 'next/link';

export interface ReferralSummaryCardProps {
  referral: any;
  assistanceClassification?: string;
}

export function ReferralSummaryCard({ referral, assistanceClassification }: ReferralSummaryCardProps) {
  const refIdentifier = referral?.id || referral?.referral_no || '';
  const detailHref = `/portal/charity-status/${encodeURIComponent(String(refIdentifier))}`;
  const particulars = Array.isArray(referral?.particulars) ? referral.particulars : [];
  const totalQuotation = Number(referral?.total_amount ?? referral?.total_quotation ?? 0);

  return (
    <div className="bg-white rounded-2xl border border-[#D5E2D9] p-6 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF2EF] pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#E8F5EC] text-[#0B6B3A] border border-[#A7F3D0]">
              {referral?.referral_no || referral?.id || '—'}
            </span>
            {assistanceClassification && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                {assistanceClassification}
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
              {referral?.status || 'PENDING'}
            </span>
            {referral?.charity_case_no && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Case No: {referral.charity_case_no}
              </span>
            )}
          </div>
          <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0">
            Current Charity Referral
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase text-[#5A7466]">Submitted Date</div>
            <div className="text-xs font-semibold text-[#10241A]">
              {referral?.created_at
                ? new Date(referral.created_at).toLocaleDateString('en-PH', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : '—'}
            </div>
          </div>
          <Link
            href={detailHref}
            className="px-4 py-2 rounded-xl bg-[#0B6B3A] hover:bg-[#084D29] text-white font-bold text-xs flex items-center gap-1.5 no-underline shadow-xs"
          >
            <i className="fa-solid fa-eye text-xs" />
            <span>View Status</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#E2E8F0]">
          <div className="text-[10px] font-bold uppercase text-[#5A7466]">Clinical Diagnosis</div>
          <div className="font-semibold text-[#10241A] mt-0.5">{referral?.diagnosis || '—'}</div>
        </div>
        <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#E2E8F0]">
          <div className="text-[10px] font-bold uppercase text-[#5A7466]">Surgical Procedure</div>
          <div className="font-semibold text-[#10241A] mt-0.5">{referral?.procedure || '—'}</div>
        </div>
      </div>

      <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-[#FAFBF8] border-b border-[#E2E8F0] text-[10px] font-bold uppercase text-[#5A7466] text-left">
            <tr>
              <th className="py-2 px-3 w-10">No.</th>
              <th className="py-2 px-3">Quotation Particulars</th>
              <th className="py-2 px-3 text-right">Amount (PHP)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF2EF]">
            {particulars.map((p: any, i: number) => (
              <tr key={i}>
                <td className="py-2 px-3 font-mono text-[#5A7466]">{i + 1}</td>
                <td className="py-2 px-3 font-medium text-[#10241A]">{p.name || p.description || '—'}</td>
                <td className="py-2 px-3 text-right font-mono font-bold text-[#10241A]">
                  ₱{Number(p.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            <tr className="bg-[#E8F5EC]/50 font-bold">
              <td colSpan={2} className="py-2.5 px-3 text-[#0B6B3A] uppercase text-[10.5px]">
                Total Estimated Surgical Quotation
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-sm text-[#0B6B3A]">
                ₱{totalQuotation.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5A7466] pt-1">
        <div>
          Attending Physician:{' '}
          <strong className="text-[#10241A]">{referral?.attending_physician || '—'}</strong>
        </div>
        <div>
          Referring Individual:{' '}
          <strong className="text-[#10241A]">{referral?.referring_individual || '—'}</strong>
        </div>
      </div>
    </div>
  );
}
