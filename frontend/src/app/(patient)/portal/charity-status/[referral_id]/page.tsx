'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function CharityReferralDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const referralId = decodeURIComponent(String(params?.referral_id || ''));

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pid = (user as any)?.patient_id || (user as any)?.uid || (user as any)?.id || '';
    if (!pid) {
      setError('Authenticated patient session not found. Please log in again.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/v1/patient-portal/charity-assistance-status/${encodeURIComponent(referralId)}`,
          {
            headers: {
              'x-user-role': 'patient',
              'x-user-id': String(pid),
            },
          }
        );
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.detail || `Failed to load referral status (${res.status})`);
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Unable to load charity referral details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, referralId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-2xl border border-[#D5E2D9] p-12 text-center text-sm text-[#5A7466]">
          <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#0B6B3A] mb-3" />
          <div>Loading Charity Referral Status...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <Link
          href="/portal?tab=charity-status"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] text-xs font-bold text-[#10241A] no-underline"
        >
          <i className="fa-solid fa-arrow-left" />
          <span>Back to Charity Assistance Status</span>
        </Link>
        <div className="bg-red-50 rounded-2xl border border-red-200 p-6 text-sm text-red-800">
          {error || 'Referral record not found.'}
        </div>
      </div>
    );
  }

  const appInfo = data.application_info || {};
  const asmtStatus = data.assessment_status || {};
  const elig = data.eligibility_and_decision || {};
  const progress = Array.isArray(data.application_progress) ? data.application_progress : [];
  const referral = data.referral || {};

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header with Back button */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-[#D5E2D9] p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/portal?tab=charity-status')}
            className="px-3.5 py-2 rounded-xl border border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] text-[#10241A] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <i className="fa-solid fa-arrow-left text-[11px]" />
            <span>Back</span>
          </button>
          <div>
            <h1 className="font-['Outfit'] text-lg font-bold text-[#10241A] m-0">
              Referral Status Details &bull;{' '}
              <span className="font-mono text-[#0B6B3A]">{referral.referral_no || referralId}</span>
            </h1>
            <p className="text-xs text-[#5A7466] m-0 mt-0.5">
              {referral.diagnosis || '—'} {referral.procedure ? `— ${referral.procedure}` : ''}
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase bg-[#E8F5EC] text-[#0B6B3A] border border-[#A7F3D0]">
          {referral.status || 'PENDING'}
        </span>
      </div>

      {/* A. Charity Application Information & B. MSW Assessment Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-[#D5E2D9] p-6 shadow-xs space-y-4">
          <div className="border-b border-[#EEF2EF] pb-3 flex items-center justify-between">
            <h2 className="font-['Outfit'] text-sm font-bold text-[#10241A] m-0 flex items-center gap-2">
              <i className="fa-solid fa-id-card-clip text-[#0B6B3A]" />
              <span>A. Charity Application Information</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E8F5EC] text-[#0B6B3A]">
              {appInfo.beneficiary_classification || 'CHARITY'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
              <div className="text-[10px] font-bold uppercase text-[#64748B]">Patient Name</div>
              <div className="font-bold text-[#10241A] mt-0.5">{appInfo.patient_name || '—'}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
              <div className="text-[10px] font-bold uppercase text-[#64748B]">Patient ID</div>
              <div className="font-mono font-bold text-[#0B6B3A] mt-0.5">{appInfo.patient_id || '—'}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
              <div className="text-[10px] font-bold uppercase text-[#64748B]">Charity Case Number</div>
              <div className="font-mono font-bold text-[#10241A] mt-0.5">
                {appInfo.charity_case_no || 'Not Yet Assigned'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
              <div className="text-[10px] font-bold uppercase text-[#64748B]">Application Encounter Number</div>
              <div className="font-mono font-bold text-[#10241A] mt-0.5">
                {appInfo.application_encounter_no || '—'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
              <div className="text-[10px] font-bold uppercase text-[#64748B]">Application Date</div>
              <div className="font-semibold text-[#10241A] mt-0.5">{appInfo.application_date || '—'}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
              <div className="text-[10px] font-bold uppercase text-[#64748B]">Beneficiary Classification</div>
              <div className="font-bold text-[#0B6B3A] mt-0.5">{appInfo.beneficiary_classification || 'CHARITY'}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#D5E2D9] p-6 shadow-xs space-y-4">
          <div className="border-b border-[#EEF2EF] pb-3 flex items-center justify-between">
            <h2 className="font-['Outfit'] text-sm font-bold text-[#10241A] m-0 flex items-center gap-2">
              <i className="fa-solid fa-clipboard-check text-[#0B6B3A]" />
              <span>B. MSW Assessment Status</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAFBF8] text-[#5A7466] border border-[#D5E2D9]">
              {asmtStatus.submission_status || 'Not Submitted'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
              <div className="text-[10px] font-bold uppercase text-[#64748B]">Current Assessment Status</div>
              <div className="font-bold text-[#10241A] mt-0.5">{asmtStatus.current_status || 'Pending'}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
              <div className="text-[10px] font-bold uppercase text-[#64748B]">Assigned MSW</div>
              <div className="font-semibold text-[#10241A] mt-0.5">{asmtStatus.assigned_msw || 'Maria Santos, RSW'}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
              <div className="text-[10px] font-bold uppercase text-[#64748B]">Assessment Date</div>
              <div className="font-semibold text-[#10241A] mt-0.5">
                {asmtStatus.assessment_date ? new Date(asmtStatus.assessment_date).toLocaleDateString() : '—'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
              <div className="text-[10px] font-bold uppercase text-[#64748B]">Assessment Stage</div>
              <div className="font-semibold text-[#10241A] mt-0.5">{asmtStatus.assessment_stage || 'Not Started'}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
              <div className="text-[10px] font-bold uppercase text-[#64748B]">Submission Status</div>
              <div className="font-semibold text-[#10241A] mt-0.5">{asmtStatus.submission_status || 'Not Submitted'}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
              <div className="text-[10px] font-bold uppercase text-[#64748B]">Last Updated Date</div>
              <div className="font-semibold text-[#10241A] mt-0.5">
                {asmtStatus.last_updated ? new Date(asmtStatus.last_updated).toLocaleString() : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* C. Eligibility Recommendation & Final Authorized Charity Decision */}
      <div className="bg-white rounded-2xl border border-[#D5E2D9] p-6 shadow-xs space-y-4">
        <div className="border-b border-[#EEF2EF] pb-3">
          <h2 className="font-['Outfit'] text-sm font-bold text-[#10241A] m-0 flex items-center gap-2">
            <i className="fa-solid fa-scale-balanced text-[#0B6B3A]" />
            <span>C. Eligibility Recommendation &amp; Final Authorized Charity Decision</span>
          </h2>
          <p className="text-[11px] text-[#5A7466] m-0 mt-0.5">
            An MSW eligibility recommendation is distinct from the final authorized administrative charity decision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#FAFBF8] border border-[#D5E2D9] space-y-2.5">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#0B6B3A]">
              1. MSW Eligibility Recommendation
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-[#64748B]">Recommended Grant Tier</div>
              <div className="font-bold text-[#10241A] mt-0.5">
                {elig.recommended_grant_tier || elig.msw_eligibility_recommendation || 'Pending MSW Recommendation'}
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase text-[#64748B]">Recommendation Status</div>
                <div className="font-semibold text-[#10241A] mt-0.5">{elig.recommendation_status || 'Pending'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-[#64748B]">Recommendation Date</div>
                <div className="font-semibold text-[#10241A] mt-0.5">
                  {elig.recommendation_date ? new Date(elig.recommendation_date).toLocaleDateString() : '—'}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#FAFBF8] border border-[#D5E2D9] space-y-2.5">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#10241A]">
              2. Final Authorized Charity Decision
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] font-bold uppercase text-[#64748B]">Final Decision</div>
                <div className="font-bold text-[#10241A] mt-0.5">
                  {elig.final_authorized_decision || 'Pending Official Decision'}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-[#64748B]">Approved Grant Tier</div>
                <div className="font-semibold text-[#10241A] mt-0.5">
                  {elig.approved_grant_tier || 'Not Yet Finalized'}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-[#64748B]">Approved Subsidy Amount</div>
                <div className="font-mono font-bold text-[#0B6B3A] mt-0.5">
                  {elig.approved_subsidy_amount != null
                    ? `₱${Number(elig.approved_subsidy_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                    : elig.approved_subsidy_pct != null
                      ? `${elig.approved_subsidy_pct}% Subsidy`
                      : '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-[#64748B]">Decision Date</div>
                <div className="font-semibold text-[#10241A] mt-0.5">
                  {elig.decision_date ? new Date(elig.decision_date).toLocaleDateString() : '—'}
                </div>
              </div>
            </div>
            {elig.authorized_reviewer && (
              <div>
                <div className="text-[10px] font-bold uppercase text-[#64748B]">Authorized Reviewer</div>
                <div className="font-semibold text-[#10241A] mt-0.5">{elig.authorized_reviewer}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* D. Charity Application Progress (7 stages) */}
      <div className="bg-white rounded-2xl border border-[#D5E2D9] p-6 shadow-xs space-y-4">
        <div className="border-b border-[#EEF2EF] pb-3">
          <h2 className="font-['Outfit'] text-sm font-bold text-[#10241A] m-0 flex items-center gap-2">
            <i className="fa-solid fa-list-check text-[#0B6B3A]" />
            <span>D. Charity Application Progress</span>
          </h2>
        </div>
        <div className="space-y-3">
          {progress.map((st: any) => (
            <div
              key={st.stage}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  st.completed ? 'bg-[#0B6B3A] text-white' : 'bg-[#E2E8F0] text-[#475569]'
                }`}
              >
                {st.completed ? <i className="fa-solid fa-check" /> : st.stage}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-bold text-[#10241A]">{st.title}</div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      st.completed ? 'bg-[#E8F5EC] text-[#0B6B3A]' : 'bg-[#F1F5F9] text-[#64748B]'
                    }`}
                  >
                    {st.status}
                  </span>
                </div>
                <div className="text-[11px] text-[#5A7466] mt-0.5">{st.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
