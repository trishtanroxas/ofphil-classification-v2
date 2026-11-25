'use client';

import React from 'react';
import Link from 'next/link';

export interface CharityHistorySectionProps {
  referrals: any[];
}

function getAssistanceLabel(indexFromOldest: number): string {
  const order = indexFromOldest + 1;
  if (order === 1) return 'FIRST ASSISTANCE';
  if (order === 2) return 'SECOND ASSISTANCE';
  if (order === 3) return 'THIRD ASSISTANCE';
  return `${order}TH ASSISTANCE`;
}

export function CharityHistorySection({ referrals }: CharityHistorySectionProps) {
  if (!Array.isArray(referrals) || referrals.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-[#D5E2D9] p-6 shadow-xs space-y-4">
      <div className="border-b border-[#EEF2EF] pb-3 flex items-center justify-between">
        <div>
          <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0 flex items-center gap-2">
            <i className="fa-solid fa-clock-rotate-left text-[#0B6B3A]" />
            <span>Charity History</span>
          </h3>
          <p className="text-xs text-[#5A7466] m-0 mt-0.5">
            Previous charity assistance referrals and their recorded outcomes.
          </p>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAFBF8] text-[#5A7466] border border-[#D5E2D9]">
          {referrals.length} {referrals.length === 1 ? 'Record' : 'Records'}
        </span>
      </div>

      <div className="space-y-3">
        {referrals.map((ref: any, idx: number) => {
          const refIdentifier = ref?.id || ref?.referral_no || '';
          const detailHref = `/portal/charity-status/${encodeURIComponent(String(refIdentifier))}`;
          const assistanceClass =
            ref?.assistance_classification || getAssistanceLabel(referrals.length - 1 - idx);
          const totalQuotation = Number(ref?.total_amount ?? ref?.total_quotation ?? 0);
          const approvedAmount = ref?.approved_grant_amount ?? ref?.approved_subsidy_amount;

          return (
            <div
              key={refIdentifier || idx}
              className="p-4 rounded-xl bg-[#FAFBF8] border border-[#E2E8F0] space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#E8F5EC] text-[#0B6B3A] border border-[#A7F3D0]">
                    {ref?.referral_no || ref?.id || '—'}
                  </span>
                  {ref?.charity_case_no && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      Case No: {ref.charity_case_no}
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                    {assistanceClass}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {ref?.status || 'PENDING'}
                  </span>
                </div>
                <Link
                  href={detailHref}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0B6B3A] hover:bg-[#084D29] text-white font-bold text-xs flex items-center gap-1.5 no-underline shadow-xs"
                >
                  <i className="fa-solid fa-eye text-xs" />
                  <span>View Status</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-[10px] font-bold uppercase text-[#5A7466]">Submission Date</div>
                  <div className="font-semibold text-[#10241A]">
                    {ref?.created_at
                      ? new Date(ref.created_at).toLocaleDateString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-[#5A7466]">Diagnosis &amp; Procedure</div>
                  <div className="font-semibold text-[#10241A] truncate">
                    {ref?.diagnosis || '—'} / {ref?.procedure || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-[#5A7466]">Total Quotation</div>
                  <div className="font-mono font-bold text-[#10241A]">
                    ₱{totalQuotation.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-[#5A7466]">MSW Recommendation</div>
                  <div className="font-semibold text-[#10241A]">{ref?.msw_recommendation || 'Pending'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-[#5A7466]">Final Authorized Decision</div>
                  <div className="font-semibold text-[#10241A]">{ref?.final_decision || ref?.status || 'Pending'}</div>
                </div>
                {approvedAmount != null && Number(approvedAmount) > 0 && (
                  <div>
                    <div className="text-[10px] font-bold uppercase text-[#5A7466]">Approved Grant Amount</div>
                    <div className="font-mono font-bold text-[#0B6B3A]">
                      ₱{Number(approvedAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
