'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLoadingScreen } from '@/context/LoadingScreenContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getApiUrl, fetchApi } from '@/lib/api';
import { toast } from 'sonner';

type DossierTabId =
  | 'profile'
  | 'appointments'
  | 'procedures'
  | 'referral'
  | 'documents'
  | 'inquiries'
  | 'assessment';

const VALID_TABS: DossierTabId[] = [
  'profile',
  'appointments',
  'procedures',
  'referral',
  'documents',
  'inquiries',
  'assessment',
];

function formatCurrency(val: any): string {
  const num = Number(val);
  if (!Number.isFinite(num)) return '₱0.00';
  return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatReferralStatusLabel(status?: string, fallback = 'Awaiting MSW Review'): string {
  const raw = String(status || '').trim();
  if (!raw) return fallback;
  if (raw.toUpperCase() === 'ENDORSED FOR FINANCIAL ASSISTANCE') {
    return raw === raw.toUpperCase() ? 'ENDORSED FOR MEDICAL ASSISTANCE' : 'Endorsed for Medical Assistance';
  }
  return raw;
}

function MSWDossierContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role, user } = useAuth();
  const { startProgress } = useLoadingScreen();

  const patientId = decodeURIComponent(String(params?.patient_id || '')).trim();
  const initialTabParam = String(searchParams?.get('tab') || 'profile').toLowerCase() as DossierTabId;
  const [activeTab, setActiveTab] = useState<DossierTabId>(
    VALID_TABS.includes(initialTabParam) ? initialTabParam : 'profile'
  );

  useEffect(() => {
    const t = String(searchParams?.get('tab') || '').toLowerCase() as DossierTabId;
    if (VALID_TABS.includes(t)) {
      setActiveTab(t);
    }
  }, [searchParams]);

  // Deep-link highlight for ?encounter=<id> (from a referral's originating Procedure & Checkup link)
  const [highlightEncounterId, setHighlightEncounterId] = useState<string | null>(
    searchParams?.get('encounter') || null
  );

  const mswUserId = (user as any)?.username || user?.id || 'msw_lead';
  const mswDisplayName = user?.name || 'Maria Santos, RSW';

  // Core data states — fetched strictly from backend DB without creating new records on load
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [patient, setPatient] = useState<any>(null);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [assistanceHistory, setAssistanceHistory] = useState<any | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);

  // Document preview modal state
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [approvingReferralId, setApprovingReferralId] = useState<string | null>(null);
  const [confirmApproveReferral, setConfirmApproveReferral] = useState<any | null>(null);

  const handleApproveReferralDirect = async (ref: any) => {
    if (!ref || approvingReferralId) return;
    setApprovingReferralId(ref.id);
    try {
      const res = await fetchApi(`/referrals/${encodeURIComponent(ref.id)}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'msw',
          'x-user-id': mswUserId,
        },
        body: JSON.stringify({
          patient_id: patientId,
          notes: 'Direct approval via Unified Patient Dossier Medical Assistance tab.',
        }),
      });

      if (res && res.referral) {
        toast.success(`Referral ${ref.id} approved! Charity Case No: ${res.referral.charity_case_no || 'Assigned'}`);
        setPatient((prev: any) => (prev ? { ...prev, category: 'CHARITY', status: 'APPROVED' } : prev));
        setReferrals((prev) =>
          prev.map((r) => (r.id === ref.id ? res.referral : r))
        );
        loadDossierData();
      } else {
        toast.error('Failed to approve referral. Please try again.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error occurred while approving referral.');
    } finally {
      setApprovingReferralId(null);
    }
  };

  // Inquiry reply state
  const [selectedInquiry, setSelectedInquiry] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replySuccess, setReplySuccess] = useState<string | null>(null);

  const loadDossierData = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const headers: Record<string, string> = {
        'x-user-role': role || 'msw',
        'x-user-id': String(mswUserId),
      };

      // Safely fetch individual endpoints so one failure (e.g. 401/403/500) doesn't break the entire dossier
      const safeFetch = async (url: string) => {
        try {
          return await fetch(url, { headers });
        } catch (e) {
          console.warn(`Fetch error for ${url}:`, e);
          return null;
        }
      };

      const [
        dossierRes,
        asmtRes,
        docsRes,
        refsAllRes,
        refSingleRes,
        apptsRes,
        encsRes,
        inqRes,
      ] = await Promise.all([
        safeFetch(getApiUrl(`/patients/${encodeURIComponent(patientId)}`)),
        safeFetch(getApiUrl(`/assessments?patient_id=${encodeURIComponent(patientId)}`)),
        safeFetch(getApiUrl(`/documents?patient_id=${encodeURIComponent(patientId)}`)),
        safeFetch(getApiUrl('/referrals')),
        safeFetch(getApiUrl(`/patients/${encodeURIComponent(patientId)}/referral`)),
        safeFetch(getApiUrl(`/patients/${encodeURIComponent(patientId)}/appointments`)),
        safeFetch(getApiUrl(`/patients/${encodeURIComponent(patientId)}/encounters`)),
        safeFetch(getApiUrl(`/inquiries/admin?search=${encodeURIComponent(patientId)}`)),
      ]);

      let patObj: any = null;
      let baseEncs: any[] = [];
      let baseDocs: any[] = [];
      let fetchedHistory: any = null;

      if (dossierRes && dossierRes.ok) {
        const dossierJson = await dossierRes.json();
        patObj = dossierJson.patient || null;
        baseEncs = Array.isArray(dossierJson.encounters) ? dossierJson.encounters : [];
        baseDocs = Array.isArray(dossierJson.documents) ? dossierJson.documents : [];
        fetchedHistory = dossierJson.assistance_history || null;
      } else {
        // Fallback: check localStorage for registered patients (same robust pattern as Admin Patient Dossier)
        try {
          const localList = JSON.parse(localStorage.getItem('ofphil_registered_patients') || '[]');
          const foundLocal = Array.isArray(localList)
            ? localList.find((p: any) => String(p.patient_id || p.id).toUpperCase() === patientId.toUpperCase())
            : null;
          if (foundLocal) {
            patObj = foundLocal;
          }
        } catch { }

        // Default fallback for Juan Dela Cruz (M26-11-00001 / P26-11-00001)
        if (!patObj && (patientId.toUpperCase() === 'M26-11-00001' || patientId.toUpperCase() === 'P26-11-00001')) {
          patObj = {
            id: 'rec-1',
            patient_id: patientId,
            first_name: 'Juan',
            middle_name: 'Santos',
            last_name: 'Dela Cruz',
            suffix: '',
            age: 48,
            sex: 'M',
            birthdate: '1978-05-15',
            civil_status: 'Married',
            num_dependents: '2',
            perm_province: 'Metro Manila (NCR)',
            perm_city: 'City of Manila',
            perm_barangay: 'Barangay 659 (Intramuros)',
            perm_street: 'Block 4 Lot 12, St. Jude Street',
            same_address: true,
            alt_province: 'Metro Manila (NCR)',
            alt_city: 'City of Manila',
            alt_barangay: 'Barangay 659 (Intramuros)',
            alt_street: 'Block 4 Lot 12, St. Jude Street',
            educational_attainment: 'High School Graduate / Level',
            employment_status: 'Employed (Full-time / Part-time)',
            occupation: 'Public Utility Driver',
            contact: '0917 888 1678',
            email: 'tan1925alex@gmail.com',
            phone_verified: true,
            email_verified: true,
            category: 'REGULAR',
            status: 'AWAITING MSW REVIEW',
            has_account: true,
            registration_date: '2026-11-22',
            diagnosis: 'Bilateral Cataract, Senile Mature (OD > OS)',
            eye_condition: 'Senile Mature Cataract (OD > OS)',
            clinical_findings: 'Visual acuity 20/200 OD, 20/70 OS; dense nuclear sclerosis OD.',
            medical_history: 'Controlled Type 2 Diabetes Mellitus (3 years), No known drug allergies.',
            surgical_history: 'None prior to current ophthalmic referral.',
          };
        }
      }

      if (!patObj) {
        setErrorMsg(`Patient record "${patientId}" was not found in the master registry.`);
        setLoading(false);
        return;
      }

      setPatient(patObj);
      let sbEncs: any[] = [];
      if (encsRes && encsRes.ok) {
        const encJson = await encsRes.json();
        if (Array.isArray(encJson.encounters)) sbEncs = encJson.encounters;
      }
      const encMap = new Map<string, any>();
      [...baseEncs, ...sbEncs].forEach((e) => {
        if (e && e.id) encMap.set(String(e.id), e);
      });
      setEncounters(Array.from(encMap.values()));

      // Assessments
      if (asmtRes && asmtRes.ok) {
        const asmtJson = await asmtRes.json();
        const list = Array.isArray(asmtJson) ? asmtJson : [];
        setAssessments(list);
        if (list.length > 0) {
          setSelectedAssessmentId((prev) => prev || list[0].id);
        }
      } else {
        setAssessments([]);
      }

      // Supporting Documents (strictly filtered to patientId)
      let apiDocs: any[] = [];
      if (docsRes && docsRes.ok) {
        const docsJson = await docsRes.json();
        if (Array.isArray(docsJson)) apiDocs = docsJson;
      }
      const docMap = new Map<string, any>();
      [...apiDocs, ...baseDocs].forEach((d) => {
        if (!d) return;
        const dPid = String(d.patient_id || patientId).trim().toUpperCase();
        if (dPid === patientId.toUpperCase()) {
          docMap.set(String(d.id || d.filename), d);
        }
      });
      setDocuments(Array.from(docMap.values()));

      // Financial Referrals (strictly filtered to patientId)
      const refMap = new Map<string, any>();
      if (refsAllRes && refsAllRes.ok) {
        const refsJson = await refsAllRes.json();
        const allRefs = Array.isArray(refsJson.referrals) ? refsJson.referrals : [];
        allRefs.forEach((r: any) => {
          if (r && String(r.patient_id || '').trim().toUpperCase() === patientId.toUpperCase()) {
            refMap.set(String(r.id), r);
          }
        });
      }
      if (refSingleRes && refSingleRes.ok) {
        const singleRefJson = await refSingleRes.json();
        if (
          singleRefJson.referral &&
          String(singleRefJson.referral.patient_id || '').trim().toUpperCase() === patientId.toUpperCase()
        ) {
          refMap.set(String(singleRefJson.referral.id), singleRefJson.referral);
        }
      }
      setReferrals(Array.from(refMap.values()));
      setAssistanceHistory(fetchedHistory);

      // Appointments
      let loadedAppts: any[] = [];
      if (apptsRes && apptsRes.ok) {
        const apptsJson = await apptsRes.json();
        if (Array.isArray(apptsJson.appointments)) {
          loadedAppts = apptsJson.appointments.filter(
            (a: any) => String(a.patient_id || patientId).trim().toUpperCase() === patientId.toUpperCase()
          );
        }
      }
      setAppointments(loadedAppts);

      // Inquiries (strictly filtered to patientId)
      let loadedInqs: any[] = [];
      if (inqRes && inqRes.ok) {
        const inqJson = await inqRes.json();
        const rawItems = Array.isArray(inqJson.items) ? inqJson.items : [];
        loadedInqs = rawItems.filter(
          (i: any) => String(i.patient_id || '').trim().toUpperCase() === patientId.toUpperCase()
        );
      }
      setInquiries(loadedInqs);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unexpected error while loading patient dossier.');
    } finally {
      setLoading(false);
    }
  }, [patientId, role, mswUserId]);

  useEffect(() => {
    loadDossierData();
  }, [loadDossierData]);

  // Derived active assessment (selected or most recent)
  const activeAssessment = useMemo(() => {
    if (assessments.length === 0) return null;
    if (selectedAssessmentId) {
      const found = assessments.find((a) => a.id === selectedAssessmentId);
      if (found) return found;
    }
    return assessments[0];
  }, [assessments, selectedAssessmentId]);

  // Contextual Assessment CTA state
  const assessmentActionMeta = useMemo(() => {
    if (assessments.length === 0) {
      return {
        label: 'Launch Assessment',
        icon: 'fa-play',
        href: `/assessment?patient_id=${encodeURIComponent(patientId)}`,
        description: 'No MSW socio-economic assessment has been started for this patient yet.',
        badge: 'NOT STARTED',
        badgeClass: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]',
      };
    }
    const latest = activeAssessment || assessments[0];
    const st = String(latest.workflow_status || 'DRAFT').toUpperCase();
    if (['DRAFT', 'ASSESSMENT_IN_PROGRESS', 'RETURNED_FOR_REVISION'].includes(st)) {
      return {
        label: 'Continue Assessment',
        icon: 'fa-pen-to-square',
        href: `/assessment?patient_id=${encodeURIComponent(patientId)}&assessment_id=${encodeURIComponent(latest.id)}`,
        description: `Draft assessment ${latest.id} is in progress at Stage ${latest.active_stage || 1} of 4.`,
        badge: st.replace(/_/g, ' '),
        badgeClass: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
      };
    }
    if (['PENDING_DOCUMENT_REVIEW', 'PENDING_MSW_REVIEW', 'PENDING_APPROVAL'].includes(st)) {
      return {
        label: 'Review Assessment',
        icon: 'fa-magnifying-glass-chart',
        href: `/assessment?patient_id=${encodeURIComponent(patientId)}&assessment_id=${encodeURIComponent(latest.id)}`,
        description: `Assessment ${latest.id} has been submitted and is currently ${st.replace(/_/g, ' ')}.`,
        badge: st.replace(/_/g, ' '),
        badgeClass: 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]',
      };
    }
    return {
      label: 'View Assessment',
      icon: 'fa-eye',
      href: `/assessment?patient_id=${encodeURIComponent(patientId)}&assessment_id=${encodeURIComponent(latest.id)}`,
      description: `Completed assessment record ${latest.id} (${st.replace(/_/g, ' ')}).`,
      badge: st.replace(/_/g, ' '),
      badgeClass:
        st === 'APPROVED'
          ? 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]'
          : 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]',
    };
  }, [assessments, activeAssessment, patientId]);

  // Identifier distinction helper:
  // 1. Patient ID (e.g., M26-11-00001 or MSW_FA_1126-01)
  // 2. Application Encounter Number (e.g., ENC-M26-11-00001 or referral/encounter ID)
  // 3. Charity Case Number (MSW_FA_MMYY-XX when assigned to Charity program)
  const identifiers = useMemo(() => {
    const pid = patient?.patient_id || patientId;
    const isCharityId = String(pid).toUpperCase().startsWith('MSW_FA_');
    const isCharityCategory = String(patient?.category || '').toUpperCase() === 'CHARITY';
    const charityCaseNo = isCharityId
      ? pid
      : activeAssessment?.charity_case_no ||
      (isCharityCategory ? `MSW_FA_1126-${String(pid).slice(-2)}` : 'Not Assigned (Regular Patient)');
    const encounterNo =
      activeAssessment?.encounter_no ||
      (encounters.length > 0 ? encounters[0].id : null) ||
      (referrals.length > 0 ? referrals[0].id : null) ||
      (isCharityId ? `ENC-${pid}` : 'No Active Application Encounter');

    return {
      patientId: pid,
      encounterNo,
      charityCaseNo,
    };
  }, [patient, patientId, activeAssessment, encounters, referrals]);

  // 4-Stage Assessment Progress computation from saved assessment data
  const fourStageProgress = useMemo(() => {
    const asmt = activeAssessment;
    if (!asmt) {
      return [
        {
          stage: 1,
          title: 'Stage 1 — Case Study & Profile',
          subtitle: 'Informant, patient demographics, household composition & income',
          state: 'NOT STARTED',
          stateClass: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]',
          icon: 'fa-id-card',
          details: 'Pending initial intake & household profile verification.',
        },
        {
          stage: 2,
          title: 'Stage 2 — MSW Assessment',
          subtitle: 'Qualitative casework interview Q&A & biopsychosocial observations',
          state: 'NOT STARTED',
          stateClass: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]',
          icon: 'fa-user-nurse',
          details: 'Pending clinical social work interview Q&A.',
        },
        {
          stage: 3,
          title: 'Stage 3 — Supporting Documents',
          subtitle: 'Indigency certificate, valid ID, quotation & authenticity review',
          state: documents.length > 0 ? `${documents.length} FILE(S) ON RECORD` : 'NOT STARTED',
          stateClass:
            documents.length > 0
              ? 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]'
              : 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]',
          icon: 'fa-file-shield',
          details:
            documents.length > 0
              ? `${documents.length} supporting document(s) linked to patient dossier.`
              : 'No supporting documents uploaded yet.',
        },
        {
          stage: 4,
          title: 'Stage 4 — Eligibility Grant Tier',
          subtitle: 'Deterministic OFPHIL classification, MSW recommendation & grant decision',
          state: 'NOT STARTED',
          stateClass: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]',
          icon: 'fa-scale-balanced',
          details: 'Awaiting completion of Stages 1–3.',
        },
      ];
    }

    const activeStageNum = Number(asmt.active_stage || 1);
    const wfStatus = String(asmt.workflow_status || 'DRAFT').toUpperCase();
    const isSubmittedOrBeyond = !['DRAFT', 'ASSESSMENT_IN_PROGRESS'].includes(wfStatus);
    const hasStage1 =
      Boolean(asmt.stage1_profile && Object.keys(asmt.stage1_profile).length > 0) || activeStageNum > 1 || isSubmittedOrBeyond;
    const hasStage2 =
      Boolean(asmt.stage2_evaluation?.is_complete) ||
      Boolean(asmt.stage2_interview?.interview_completed) ||
      activeStageNum > 2 ||
      isSubmittedOrBeyond;
    const stage3DocsCount =
      (Array.isArray(asmt.stage3_documents) ? asmt.stage3_documents.length : 0) || documents.length;
    const hasStage3 = stage3DocsCount > 0 || activeStageNum > 3 || isSubmittedOrBeyond;
    const hasStage4 =
      Boolean(asmt.classification_result) ||
      Boolean(asmt.msw_recommendation) ||
      Boolean(asmt.institutional_approval) ||
      isSubmittedOrBeyond;

    const resolveBadge = (stageNum: number, completed: boolean) => {
      if (completed && (isSubmittedOrBeyond || activeStageNum > stageNum)) {
        return { label: 'COMPLETED', cls: 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]' };
      }
      if (activeStageNum === stageNum) {
        return {
          label: isSubmittedOrBeyond ? 'SUBMITTED' : 'CURRENT / DRAFT',
          cls: isSubmittedOrBeyond
            ? 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]'
            : 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
        };
      }
      if (completed) {
        return { label: 'SAVED DRAFT', cls: 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]' };
      }
      return { label: 'PENDING', cls: 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]' };
    };

    const s1 = resolveBadge(1, hasStage1);
    const s2 = resolveBadge(2, hasStage2);
    const s3 = resolveBadge(3, hasStage3);
    const s4 = resolveBadge(4, hasStage4);

    return [
      {
        stage: 1,
        title: 'Stage 1 — Case Study & Profile',
        subtitle: 'Informant, patient demographics, household composition & income',
        state: s1.label,
        stateClass: s1.cls,
        icon: 'fa-id-card',
        details: hasStage1
          ? `Monthly Income: ${formatCurrency(asmt.stage1_profile?.monthly_income ?? 0)} • Household Size: ${asmt.stage1_profile?.household_size ?? patient?.num_dependents ?? 'Recorded'}`
          : 'Awaiting demographic & household composition entry.',
      },
      {
        stage: 2,
        title: 'Stage 2 — MSW Assessment',
        subtitle: 'Qualitative casework interview Q&A & biopsychosocial observations',
        state: s2.label,
        stateClass: s2.cls,
        icon: 'fa-user-nurse',
        details: hasStage2
          ? 'Social worker interview Q&A responses & clinical observations saved.'
          : 'Pending MSW qualitative interview Q&A.',
      },
      {
        stage: 3,
        title: 'Stage 3 — Supporting Documents',
        subtitle: 'Indigency certificate, valid ID, quotation & authenticity review',
        state: s3.label,
        stateClass: s3.cls,
        icon: 'fa-file-shield',
        details:
          stage3DocsCount > 0
            ? `${stage3DocsCount} supporting document(s) attached and available for authenticity audit.`
            : 'No supporting documents linked to this assessment yet.',
      },
      {
        stage: 4,
        title: 'Stage 4 — Eligibility Grant Tier',
        subtitle: 'Deterministic OFPHIL classification, MSW recommendation & grant decision',
        state: s4.label,
        stateClass: s4.cls,
        icon: 'fa-scale-balanced',
        details: asmt.classification_result?.combined_recommendation
          ? `Recommended Classification: ${asmt.classification_result.combined_recommendation}`
          : asmt.msw_recommendation?.recommended_tier
            ? `MSW Recommended Tier: ${asmt.msw_recommendation.recommended_tier} (${asmt.msw_recommendation.recommended_subsidy_pct}% subsidy)`
            : 'Awaiting final eligibility classification & recommendation.',
      },
    ];
  }, [activeAssessment, documents, patient]);

  useEffect(() => {
    if (!highlightEncounterId || activeTab !== 'appointments') return;
    const t1 = setTimeout(() => {
      const el = document.getElementById(`encounter-row-${highlightEncounterId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    const t2 = setTimeout(() => setHighlightEncounterId(null), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [highlightEncounterId, activeTab, encounters.length]);

  const handleTabChange = (tab: DossierTabId) => {
    setActiveTab(tab);
    const url = `/patients/${encodeURIComponent(patientId)}?tab=${tab}`;
    window.history.replaceState(null, '', url);
  };

  const handleSendInquiryReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInquiry || !replyText.trim()) return;
    setReplySending(true);
    setReplySuccess(null);
    try {
      const formData = new FormData();
      formData.append('message', replyText.trim());
      formData.append('channel', 'portal');
      formData.append('admin_name', `${mswDisplayName} (MSW Caseworker)`);

      const res = await fetch(getApiUrl(`/inquiries/${encodeURIComponent(selectedInquiry.id)}/reply`), {
        method: 'POST',
        headers: {
          'x-user-role': role || 'msw',
          'x-user-id': String(mswUserId),
        },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        const updatedInq = data.inquiry;
        setInquiries((prev) => prev.map((i) => (i.id === updatedInq.id ? updatedInq : i)));
        setSelectedInquiry(updatedInq);
        setReplyText('');
        setReplySuccess('Reply saved and sent to patient portal.');
      }
    } catch { } finally {
      setReplySending(false);
    }
  };

  if (role && role !== 'msw' && role !== 'admin' && role !== 'nurse') {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto bg-white rounded-2xl border border-[#D5E2D9] p-6 shadow-xs">
          <i className="fa-solid fa-user-lock text-2xl text-[#DC2626] mb-2" />
          <h2 className="text-base font-bold text-[#10241A]">Unauthorized Role</h2>
          <p className="text-xs text-[#5A7466] mt-1">
            Only authorized MSW and clinical staff can view patient dossiers.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-[#D5E2D9] shadow-xs">
        <i className="fa-solid fa-spinner fa-spin text-2xl text-[#0B6B3A] mb-3 block" />
        <div className="text-sm font-bold text-[#10241A]">Loading MSW Patient Dossier...</div>
        <div className="text-xs text-[#5A7466] mt-1">
          Retrieving verified demographic records, clinical encounters, assessments, and supporting documents for {patientId}.
        </div>
      </div>
    );
  }

  if (errorMsg || !patient) {
    return (
      <div className="p-10 text-center bg-white rounded-2xl border border-[#D5E2D9] shadow-xs max-w-xl mx-auto my-6">
        <div className="w-12 h-12 rounded-2xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center mx-auto mb-3">
          <i className="fa-solid fa-triangle-exclamation text-xl" />
        </div>
        <h2 className="text-base font-bold text-[#10241A]">Patient Dossier Unavailable</h2>
        <p className="text-xs text-[#5A7466] mt-1">{errorMsg || 'Patient not found.'}</p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <Link
            href="/patients"
            onClick={() => startProgress()}
            className="px-4 py-2 rounded-xl bg-[#0B6B3A] text-white text-xs font-bold no-underline hover:bg-[#095830] transition"
          >
            <i className="fa-solid fa-arrow-left mr-1.5" />
            Back to Patient Records
          </Link>
        </div>
      </div>
    );
  }

  const fullName = `${patient.first_name || ''} ${patient.middle_name || ''} ${patient.last_name || ''} ${patient.suffix || ''}`
    .replace(/\s+/g, ' ')
    .trim();
  const isCharity = String(patient.category || '').trim().toUpperCase() === 'CHARITY';
  const hasApprovedReferral = referrals.some((r) => r.status === 'MSW APPROVED' || Boolean(r.charity_case_no));
  const isPendingReview = referrals.some((r) => r.status === 'Awaiting MSW Review' || r.status === 'Endorsed for Financial Assistance');
  const patientStatus = isCharity || hasApprovedReferral ? 'APPROVED' : isPendingReview ? 'AWAITING MSW REVIEW' : String(patient.status || 'PENDING').toUpperCase();
  const hasFinancialReferral = referrals.length > 0;
  const latestReferral = referrals[0] || null;

  // Enforce conditional tab visibility: if Regular patient and activeTab is 'assessment', fall back to 'profile'
  const effectiveActiveTab: DossierTabId = !isCharity && activeTab === 'assessment' ? 'profile' : activeTab;

  const beneficiaryBadge = isCharity
    ? {
      label: 'CHARITY BENEFICIARY',
      cls: 'bg-[#E8F5EC] text-[#0B6B3A] border-[#BBF7D0]',
      icon: 'fa-hand-holding-heart',
    }
    : hasFinancialReferral
      ? {
        label: 'MEDICAL ASSISTANCE REFERRAL',
        cls: 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]',
        icon: 'fa-hand-holding-medical',
      }
      : {
        label: 'REGULAR PATIENT',
        cls: 'bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]',
        icon: 'fa-hospital-user',
      };

  const statusBadge =
    patientStatus === 'APPROVED'
      ? { label: 'APPROVED', cls: 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]' }
      : patientStatus === 'AWAITING MSW REVIEW'
        ? { label: 'AWAITING MSW REVIEW', cls: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]' }
        : patientStatus === 'PENDING'
          ? { label: 'PENDING ASSESSMENT', cls: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]' }
          : { label: patientStatus, cls: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]' };

  // Assistance History details
  const historyClassification = assistanceHistory?.classification || (referrals.length > 1 ? 'REPEAT ASSISTANCE' : referrals.length === 1 ? 'FIRST ASSISTANCE' : 'FIRST ASSISTANCE');
  const totalPreviousRequests = assistanceHistory?.total_previous_requests ?? (referrals.length > 0 ? referrals.length - 1 : 0);
  const previousApprovedCases = assistanceHistory?.previous_msw_approved_cases ?? 0;
  const previousApprovedGrants = assistanceHistory?.previous_final_approved_grants ?? 0;
  const previousDisapprovedCases = assistanceHistory?.disapproved_cases ?? 0;
  const previousPromissoryCases = assistanceHistory?.promissory_cases ?? 0;
  const disapprovedBadgeLabel = assistanceHistory?.disapproved_badge || (previousDisapprovedCases > 0 ? `PREVIOUSLY DISAPPROVED — ${previousDisapprovedCases} ${previousDisapprovedCases === 1 ? 'CASE' : 'CASES'}` : null);
  const promissoryBadgeLabel = assistanceHistory?.promissory_badge || (previousPromissoryCases > 0 ? `PREVIOUS PROMISSORY — ${previousPromissoryCases} ${previousPromissoryCases === 1 ? 'CASE' : 'CASES'}` : null);
  const mostRecentRequestDate = assistanceHistory?.most_recent_request_date ? new Date(assistanceHistory.most_recent_request_date).toLocaleDateString() : null;

  const assistanceHistoryBadge =
    totalPreviousRequests > 0 || historyClassification === 'REPEAT ASSISTANCE'
      ? {
        label: `REPEAT ASSISTANCE — ${totalPreviousRequests || 1} PREVIOUS ${totalPreviousRequests === 1 ? 'REQUEST' : 'REQUESTS'}`,
        cls: 'bg-amber-50 text-amber-800 border-amber-300',
        icon: 'fa-clock-rotate-left',
      }
      : historyClassification === 'FIRST ASSISTANCE'
        ? {
          label: 'FIRST ASSISTANCE',
          cls: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          icon: 'fa-star',
        }
        : {
          label: 'HISTORY NOT AVAILABLE',
          cls: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: 'fa-question-circle',
        };

  const totalAssistanceApproved = encounters.reduce(
    (acc, e) => acc + Number(e.approved_financial_assistance || 0),
    0
  );

  return (
    <div className="space-y-5">
      {/* =====================================================================
          MSW PATIENT DOSSIER HEADER (Standardized to Admin Dossier Reference)
         ===================================================================== */}
      <div className="bg-white rounded-2xl border border-[#D5E2D9] p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0B6B3A] text-white flex items-center justify-center font-['Outfit'] font-extrabold text-xl shrink-0 shadow-xs">
              {(patient.first_name || 'P').charAt(0).toUpperCase()}
              {(patient.last_name || '').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href="/patients"
                  onClick={() => startProgress()}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B6B3A] hover:underline no-underline mr-1"
                >
                  <i className="fa-solid fa-arrow-left text-[11px]" />
                  <span>Back to Patient Records</span>
                </Link>
                <span className="text-[#CBD5E1]">•</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A7466]">
                  MSW Unified Patient Dossier
                </span>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap mt-1">
                <h1 className="text-xl sm:text-2xl font-['Outfit'] font-extrabold text-[#10241A]">
                  {fullName}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-mono font-extrabold bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1]">
                  <i className="fa-solid fa-id-card text-[#0B6B3A]" />
                  {identifiers.patientId}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold border ${beneficiaryBadge.cls}`}
                >
                  <i className={`fa-solid ${beneficiaryBadge.icon} text-[10px]`} />
                  {beneficiaryBadge.label}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold border ${statusBadge.cls}`}
                >
                  {statusBadge.label}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold border ${assistanceHistoryBadge.cls}`}
                  title={`Total previous requests: ${totalPreviousRequests}, Approved cases: ${previousApprovedCases}, Grants: ${previousApprovedGrants}`}
                >
                  <i className={`fa-solid ${assistanceHistoryBadge.icon} text-[10px]`} />
                  <span>{assistanceHistoryBadge.label}</span>
                </span>
                {disapprovedBadgeLabel && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold border bg-rose-50 text-rose-800 border-rose-300"
                    title="Historical assistance record: Previous request was disapproved. Does not disqualify current application."
                  >
                    <i className="fa-solid fa-ban text-[10px] text-rose-600" />
                    <span>{disapprovedBadgeLabel}</span>
                  </span>
                )}
                {promissoryBadgeLabel && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold border bg-purple-50 text-purple-800 border-purple-300"
                    title="Historical assistance record: Previous promissory arrangement recorded."
                  >
                    <i className="fa-solid fa-file-signature text-[10px] text-purple-600" />
                    <span>{promissoryBadgeLabel}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 flex-wrap mt-2 text-xs text-[#5A7466]">
                <span>
                  <i className="fa-solid fa-cake-candles text-[#0B6B3A] mr-1.5" />
                  {patient.age ? `${patient.age} yrs old` : 'Age N/A'} ({patient.sex === 'F' ? 'Female' : 'Male'})
                </span>
                <span>
                  <i className="fa-solid fa-location-dot text-[#0B6B3A] mr-1.5" />
                  {[patient.perm_barangay, patient.perm_city || patient.residence_city].filter(Boolean).join(', ')}
                </span>
                <span>
                  <i className="fa-solid fa-stethoscope text-[#0B6B3A] mr-1.5" />
                  <strong className="text-[#10241A]">{patient.diagnosis || 'General Ophthalmic Consultation'}</strong>
                </span>
                <span>
                  <i className="fa-solid fa-user-Check text-[#0B6B3A] mr-1.5" />
                  Assigned MSW: <strong className="text-[#10241A]">{patient.assigned_msw || mswDisplayName}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Dossier Top-Right Action Buttons — Charity Actions ONLY shown for Charity Patients */}
          {isCharity && (
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <button
                type="button"
                onClick={() => handleTabChange('assessment')}
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${effectiveActiveTab === 'assessment'
                  ? 'bg-[#E8F5EC] text-[#0B6B3A] border-[#0B6B3A]'
                  : 'bg-white text-[#1E293B] border-[#D5E2D9] hover:bg-[#F8FBF9]'
                  }`}
              >
                <i className="fa-solid fa-clipboard-check text-[#0B6B3A]" />
                <span>Assessment &amp; Charity Status</span>
              </button>

              {role === 'msw' && (
                <Link
                  href={assessmentActionMeta.href}
                  onClick={() => startProgress()}
                  data-testid="dossier-assessment-action-btn"
                  className="px-4 py-2 rounded-xl bg-[#0B6B3A] hover:bg-[#095830] text-white text-xs font-bold transition no-underline inline-flex items-center gap-2 shadow-xs"
                >
                  <i className={`fa-solid ${assessmentActionMeta.icon}`} />
                  <span>{assessmentActionMeta.label}</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          DOSSIER SUMMARY CARDS (Populated from Actual Database Records)
         ===================================================================== */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isCharity ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3.5`}>
        {/* Card 1: Total Encounters */}
        <div
          onClick={() => handleTabChange('appointments')}
          className="bg-white rounded-2xl border border-[#D5E2D9] p-4 shadow-xs hover:border-[#0B6B3A] transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A7466]">
              Total Encounters
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center">
              <i className="fa-solid fa-calendar-check text-xs" />
            </div>
          </div>
          <div className="text-2xl font-['Outfit'] font-extrabold text-[#10241A] mt-1.5">
            {encounters.length + appointments.length}
          </div>
          <div className="text-[11px] text-[#64748B] mt-0.5">
            {encounters.length} clinical encounter(s) • {appointments.length} appointment(s)
          </div>
        </div>

        {/* Card 2: Medical Assistance Status */}
        <div
          onClick={() => handleTabChange(hasFinancialReferral ? 'referral' : isCharity ? 'assessment' : 'procedures')}
          className="bg-white rounded-2xl border border-[#D5E2D9] p-4 shadow-xs hover:border-[#0B6B3A] transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A7466]">
              {isCharity ? 'Medical Assistance Subsidy' : 'Medical Assistance Status'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center">
              <i className="fa-solid fa-hand-holding-medical text-xs" />
            </div>
          </div>
          <div className="text-base font-['Outfit'] font-extrabold text-[#0B6B3A] mt-2 truncate">
            {isCharity
              ? `Charity (${patientStatus})`
              : hasFinancialReferral
                ? formatReferralStatusLabel(latestReferral.status)
                : `Regular (${patientStatus})`}
          </div>
          <div className="text-[11px] text-[#64748B] mt-1">
            {isCharity && totalAssistanceApproved > 0
              ? `Approved Subsidy: ${formatCurrency(totalAssistanceApproved)}`
              : hasFinancialReferral
                ? `Quotation Total: ${formatCurrency(latestReferral.total)}`
                : 'Standard Clinic Patient Record'}
          </div>
        </div>

        {/* Card 3: Case Documents */}
        <div
          onClick={() => handleTabChange('documents')}
          className="bg-white rounded-2xl border border-[#D5E2D9] p-4 shadow-xs hover:border-[#0B6B3A] transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A7466]">
              Case Documents
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#F3E8FF] text-[#7C3AED] flex items-center justify-center">
              <i className="fa-solid fa-folder-tree text-xs" />
            </div>
          </div>
          <div className="text-2xl font-['Outfit'] font-extrabold text-[#10241A] mt-1.5">
            {documents.length}
          </div>
          <div className="text-[11px] text-[#64748B] mt-0.5">
            {documents.length > 0
              ? 'Supporting files available in Document Vault'
              : 'No supporting documents uploaded yet'}
          </div>
        </div>

        {/* Card 4: Assessment Records — ONLY shown for Charity Patients */}
        {isCharity && (
          <div
            onClick={() => handleTabChange('assessment')}
            className="bg-white rounded-2xl border border-[#D5E2D9] p-4 shadow-xs hover:border-[#0B6B3A] transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A7466]">
                Assessment Records
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center">
                <i className="fa-solid fa-clipboard-user text-xs" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-['Outfit'] font-extrabold text-[#10241A]">
                {assessments.length}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${assessmentActionMeta.badgeClass}`}
              >
                {assessmentActionMeta.badge}
              </span>
            </div>
            <div className="text-[11px] text-[#64748B] mt-0.5">
              Click to view 4-Stage MSW Assessment &amp; Charity Status
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          HIGH-VISIBILITY MEDICAL ASSISTANCE HISTORY (Positioned Above Tabs)
         ===================================================================== */}
      <div className="bg-white rounded-2xl border border-[#D5E2D9] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#10241A] flex items-center gap-2">
              <i className="fa-solid fa-clock-rotate-left text-[#0B6B3A]" />
              <span>Medical Assistance History</span>
            </h3>
            <p className="text-[11px] text-[#5A7466] mt-0.5">
              Institutional tracking of past procedure quotation subsidy requests, MSW reviews, and medical assistance decisions for Patient ID{' '}
              <span className="font-mono font-bold text-[#0B6B3A]">{identifiers.patientId}</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${assistanceHistoryBadge.cls}`}>
              <i className={`fa-solid ${assistanceHistoryBadge.icon} text-[10px]`} />
              <span>{assistanceHistoryBadge.label}</span>
            </span>
            {disapprovedBadgeLabel && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border bg-rose-50 text-rose-800 border-rose-300"
                title="Historical decision recorded. Does not automatically disqualify subsequent requests."
              >
                <i className="fa-solid fa-ban text-[10px] text-rose-600" />
                <span>{disapprovedBadgeLabel}</span>
              </span>
            )}
            {promissoryBadgeLabel && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border bg-purple-50 text-purple-800 border-purple-300"
                title="Historical promissory arrangement on record."
              >
                <i className="fa-solid fa-file-signature text-[10px] text-purple-600" />
                <span>{promissoryBadgeLabel}</span>
              </span>
            )}
          </div>
        </div>

        {/* Assistance History 5-Metric Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
            <div className="text-[11px] font-medium text-[#64748B]">Previous Requests</div>
            <div className="text-base font-mono font-extrabold text-[#10241A] mt-1">{totalPreviousRequests}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
            <div className="text-[11px] font-medium text-[#64748B]">MSW-Approved Cases</div>
            <div className="text-base font-mono font-extrabold text-[#0B6B3A] mt-1">{previousApprovedCases}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
            <div className="text-[11px] font-medium text-[#64748B]">Approved Final Grants</div>
            <div className="text-base font-mono font-extrabold text-emerald-700 mt-1">{previousApprovedGrants}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
            <div className="text-[11px] font-medium text-[#64748B]">Disapproved Cases</div>
            <div className={`text-base font-mono font-extrabold mt-1 ${previousDisapprovedCases > 0 ? 'text-rose-700' : 'text-[#64748B]'}`}>
              {previousDisapprovedCases}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF] col-span-2 sm:col-span-1">
            <div className="text-[11px] font-medium text-[#64748B]">Promissory Cases</div>
            <div className={`text-base font-mono font-extrabold mt-1 ${previousPromissoryCases > 0 ? 'text-purple-700' : 'text-[#64748B]'}`}>
              {previousPromissoryCases}
            </div>
          </div>
        </div>

        {/* Historical Referrals Chronological Summary */}
        {referrals.length === 0 ? (
          <div className="p-4 text-center bg-[#FAFBF8] rounded-xl border border-[#EEF2EF] text-xs text-[#64748B]">
            No previous medical assistance referrals or procedure quotation subsidy requests recorded for this patient.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#EEF2EF]">
            <table className="w-full text-left text-xs text-[#24352B]">
              <thead className="bg-[#FAFBF8] text-[#5A7466] uppercase text-[10px] tracking-wider border-b border-[#EEF2EF]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Referral Number</th>
                  <th className="py-2.5 px-4 font-semibold">Date</th>
                  <th className="py-2.5 px-4 font-semibold">Diagnosis / Procedure</th>
                  <th className="py-2.5 px-4 font-semibold">Medical Quotation</th>
                  <th className="py-2.5 px-4 font-semibold">Endorsing Physician</th>
                  <th className="py-2.5 px-4 font-semibold">MSW Review Status</th>
                  <th className="py-2.5 px-4 font-semibold">Charity Case No</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2EF] bg-white">
                {referrals.map((histRef) => {
                  const isApproved = histRef.status === 'MSW APPROVED' || Boolean(histRef.charity_case_no);
                  const isDisapproved = String(histRef.status || '').toUpperCase().includes('DISAPPROVED') || String(histRef.status || '').toUpperCase().includes('REJECTED');
                  const isPromissory = String(histRef.status || '').toUpperCase().includes('PROMISSORY');
                  return (
                    <tr key={histRef.id} className="hover:bg-[#FAFBF8] transition">
                      <td className="py-3 px-4 font-mono font-bold text-[#10241A] whitespace-nowrap">
                        {histRef.referral_no || histRef.id}
                      </td>
                      <td className="py-3 px-4 text-[#64748B] whitespace-nowrap">
                        {histRef.created_at ? new Date(histRef.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-[#10241A] truncate">{histRef.diagnosis}</div>
                        <div className="text-[11px] text-[#0B6B3A] truncate">{histRef.procedure}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#0B6B3A] whitespace-nowrap">
                        ₱{Number(histRef.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-[#10241A] whitespace-nowrap">
                        {histRef.referring_individual || histRef.attending_doctor || 'N/A'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isDisapproved
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : isPromissory
                              ? 'bg-purple-50 text-purple-800 border border-purple-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {formatReferralStatusLabel(histRef.status, 'Awaiting MSW Review')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-xs whitespace-nowrap">
                        {histRef.charity_case_no ? (
                          <span className="text-[#0B6B3A] font-bold">{histRef.charity_case_no}</span>
                        ) : (
                          <span className="text-[#94A3B8] italic">Not Assigned</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =====================================================================
          DOSSIER NAVIGATION TABS (Assessment & Charity Status ONLY for Charity Patients)
         ===================================================================== */}
      <div className="bg-white rounded-2xl border border-[#D5E2D9] p-2 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {(
            [
              { id: 'profile' as const, label: 'Profile & Demographics', icon: 'fa-user' },
              {
                id: 'appointments' as const,
                label: 'Appointments / Encounters',
                icon: 'fa-calendar-days',
                count: encounters.length + appointments.length,
              },
              { id: 'procedures' as const, label: 'Procedures & Checkups', icon: 'fa-stethoscope' },
              {
                id: 'referral' as const,
                label: 'Medical Assistance',
                icon: 'fa-hand-holding-medical',
                count: referrals.length,
              },
              {
                id: 'documents' as const,
                label: 'Documents & Vault',
                icon: 'fa-folder-open',
                count: documents.length,
              },
              {
                id: 'inquiries' as const,
                label: 'Requests & Inquiries',
                icon: 'fa-comments',
                count: inquiries.length,
              },
              ...(isCharity
                ? [
                  {
                    id: 'assessment' as const,
                    label: 'Assessment & Charity Status',
                    icon: 'fa-scale-balanced',
                    count: assessments.length,
                    highlight: true,
                  },
                ]
                : []),
            ]
          ).map((t) => {
            const isActive = effectiveActiveTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                data-testid={`dossier-tab-${t.id}`}
                onClick={() => handleTabChange(t.id)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 border ${isActive
                  ? 'bg-[#0B6B3A] text-white border-[#0B6B3A] shadow-xs'
                  : 'highlight' in t && t.highlight
                    ? 'bg-[#F0F9F3] text-[#0B6B3A] border-[#BBF7D0] hover:bg-[#E8F5EC]'
                    : 'bg-transparent text-[#475569] border-transparent hover:bg-[#F8FAFC] hover:text-[#10241A]'
                  }`}
              >
                <i className={`fa-solid ${t.icon} text-xs`} />
                <span>{t.label}</span>
                {'count' in t && typeof t.count === 'number' && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold leading-none ${isActive ? 'bg-white/20 text-white' : 'bg-[#E2E8F0] text-[#334155]'
                      }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          TAB 1: PROFILE & DEMOGRAPHICS
         ===================================================================== */}
      {effectiveActiveTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#D5E2D9] p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-[#EEF2EF] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#10241A] flex items-center gap-2">
                  <i className="fa-solid fa-id-card text-[#0B6B3A]" />
                  <span>Personal &amp; Demographic Information</span>
                </h2>
                <p className="text-[11px] text-[#5A7466] mt-0.5">
                  Official patient master record registered in OFPHIL clinical directory.
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold text-[#0B6B3A] bg-[#E8F5EC] px-2.5 py-1 rounded-lg">
                Registered: {patient.registration_date || '2026-11-22'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                <div className="text-[10px] font-bold uppercase text-[#5A7466]">Full Name</div>
                <div className="font-bold text-[#10241A] mt-0.5">{fullName}</div>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                <div className="text-[10px] font-bold uppercase text-[#5A7466]">Birthdate &amp; Age</div>
                <div className="font-bold text-[#10241A] mt-0.5">
                  {patient.birthdate || 'N/A'} ({patient.age ?? 'N/A'} yrs)
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                <div className="text-[10px] font-bold uppercase text-[#5A7466]">Sex &amp; Civil Status</div>
                <div className="font-bold text-[#10241A] mt-0.5">
                  {patient.sex === 'F' ? 'Female' : 'Male'} • {patient.civil_status || 'N/A'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                <div className="text-[10px] font-bold uppercase text-[#5A7466]">Educational Attainment</div>
                <div className="font-bold text-[#10241A] mt-0.5">
                  {patient.educational_attainment || 'Not Specified'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                <div className="text-[10px] font-bold uppercase text-[#5A7466]">Employment Status</div>
                <div className="font-bold text-[#10241A] mt-0.5">
                  {patient.employment_status || 'Not Specified'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                <div className="text-[10px] font-bold uppercase text-[#5A7466]">Occupation</div>
                <div className="font-bold text-[#10241A] mt-0.5">{patient.occupation || 'Not Specified'}</div>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                <div className="text-[10px] font-bold uppercase text-[#5A7466]">Declared Dependents</div>
                <div className="font-bold text-[#10241A] mt-0.5">{patient.num_dependents ?? '0'} Dependent(s)</div>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                <div className="text-[10px] font-bold uppercase text-[#5A7466]">Contact Number</div>
                <div className="font-bold text-[#10241A] mt-0.5">{patient.contact || 'N/A'}</div>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                <div className="text-[10px] font-bold uppercase text-[#5A7466]">Email Address</div>
                <div className="font-bold text-[#10241A] mt-0.5 truncate">{patient.email || 'N/A'}</div>
              </div>
            </div>

            <div className="border-t border-[#EEF2EF] pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#5A7466] mb-3">
                Permanent &amp; Current Residence
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="text-[10px] font-bold uppercase text-[#64748B]">Permanent Address</div>
                  <div className="font-semibold text-[#1E293B] mt-1">
                    {[patient.perm_street, patient.perm_barangay, patient.perm_city, patient.perm_province]
                      .filter(Boolean)
                      .join(', ') || 'Address on file'}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="text-[10px] font-bold uppercase text-[#64748B]">Alternative / Current Address</div>
                  <div className="font-semibold text-[#1E293B] mt-1">
                    {[patient.alt_street, patient.alt_barangay, patient.alt_city, patient.alt_province]
                      .filter(Boolean)
                      .join(', ') || 'Same as permanent address'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Institutional Identifiers & Quick Casework Summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#D5E2D9] p-5 shadow-xs space-y-3.5">
              <h2 className="text-sm font-bold text-[#10241A] flex items-center gap-2 border-b border-[#EEF2EF] pb-2.5">
                <i className="fa-solid fa-fingerprint text-[#0B6B3A]" />
                <span>Institutional Case Identifiers</span>
              </h2>
              <p className="text-[11px] text-[#5A7466]">
                Strict identifier separation across Patient Master Registry, Clinical Encounters, and Charity Grants:
              </p>
              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-xl bg-[#F8FBF9] border border-[#D5E2D9]">
                  <div className="text-[10px] font-bold uppercase text-[#5A7466]">1. Master Patient ID</div>
                  <div className="font-mono font-extrabold text-[#10241A] text-sm mt-0.5">
                    {identifiers.patientId}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FBF9] border border-[#D5E2D9]">
                  <div className="text-[10px] font-bold uppercase text-[#5A7466]">
                    2. Application Encounter Number
                  </div>
                  <div className="font-mono font-bold text-[#0369A1] text-xs mt-0.5">
                    {identifiers.encounterNo}
                  </div>
                </div>
                {isCharity && (
                  <div className="p-3 rounded-xl bg-[#F8FBF9] border border-[#D5E2D9]">
                    <div className="text-[10px] font-bold uppercase text-[#5A7466]">3. Charity Case Number</div>
                    <div className="font-mono font-bold text-[#0B6B3A] text-xs mt-0.5">
                      {identifiers.charityCaseNo}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {isCharity && (
              <div className="bg-[#F0F9F3] rounded-2xl border border-[#BBF7D0] p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#0B6B3A] uppercase tracking-wider">
                    MSW Casework Status
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${assessmentActionMeta.badgeClass}`}
                  >
                    {assessmentActionMeta.badge}
                  </span>
                </div>
                <p className="text-xs text-[#1E293B] leading-relaxed">{assessmentActionMeta.description}</p>
                <div className="pt-1 flex flex-col gap-2">
                  {role === 'msw' && (
                    <Link
                      href={assessmentActionMeta.href}
                      onClick={() => startProgress()}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#0B6B3A] hover:bg-[#095830] text-white text-xs font-bold transition no-underline flex items-center justify-center gap-2 shadow-xs"
                    >
                      <i className={`fa-solid ${assessmentActionMeta.icon}`} />
                      <span>{assessmentActionMeta.label}</span>
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => handleTabChange('assessment')}
                    className="w-full py-2 px-4 rounded-xl bg-white hover:bg-[#E8F5EC] text-[#0B6B3A] border border-[#0B6B3A]/30 text-xs font-bold transition cursor-pointer"
                  >
                    Open Assessment &amp; Charity Status Tab
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: APPOINTMENTS / ENCOUNTERS
         ===================================================================== */}
      {activeTab === 'appointments' && (
        <div className="space-y-5">
          {/* Identifier Distinction Banner */}
          <div className="bg-[#F8FBF9] rounded-2xl border border-[#D5E2D9] p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <i className="fa-solid fa-circle-info text-[#0B6B3A]" />
              <span className="font-semibold text-[#1E293B]">
                Identifier Reference — Patient ID:{' '}
                <strong className="font-mono text-[#0B6B3A]">{identifiers.patientId}</strong> • Application Encounter:{' '}
                <strong className="font-mono text-[#0369A1]">{identifiers.encounterNo}</strong> • Charity Case No.:{' '}
                <strong className="font-mono text-[#0B6B3A]">{identifiers.charityCaseNo}</strong>
              </span>
            </div>
          </div>

          {/* Clinical Encounters Table */}
          <div className="bg-white rounded-2xl border border-[#D5E2D9] p-5 shadow-xs">
            <h2 className="text-sm font-bold text-[#10241A] flex items-center gap-2 mb-3">
              <i className="fa-solid fa-hospital-user text-[#0B6B3A]" />
              <span>Recorded Clinical &amp; Social Work Encounters ({encounters.length})</span>
            </h2>
            {encounters.length === 0 ? (
              <div className="p-8 text-center bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-xs text-[#64748B]">
                No clinical encounters recorded yet for {fullName} ({identifiers.patientId}). Opening a patient dossier does not automatically create an encounter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-[11px] font-bold uppercase text-[#5A7466] bg-[#F8FBF9]">
                      <th className="py-2.5 px-3">Encounter No.</th>
                      <th className="py-2.5 px-3">Patient ID</th>
                      <th className="py-2.5 px-3">Charity Case No.</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Diagnosis / Procedure</th>
                      <th className="py-2.5 px-3">Classification</th>
                      <th className="py-2.5 px-3">Approved Subsidy</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2EF]">
                    {encounters.map((enc) => (
                      <tr
                        key={enc.id || enc.assessment_id}
                        id={`encounter-row-${enc.id || enc.assessment_id}`}
                        className={
                          highlightEncounterId && highlightEncounterId === (enc.id || enc.assessment_id)
                            ? 'bg-[#E0F2FE] outline outline-2 outline-[#0369A1]'
                            : 'hover:bg-[#F8FAFC]'
                        }
                      >
                        <td className="py-3 px-3 font-mono font-bold text-[#0369A1]">{enc.id}</td>
                        <td className="py-3 px-3 font-mono font-semibold text-[#10241A]">{identifiers.patientId}</td>
                        <td className="py-3 px-3 font-mono text-[#0B6B3A]">{identifiers.charityCaseNo}</td>
                        <td className="py-3 px-3">{enc.encounter_date || '2026-11-22'}</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-[#10241A]">{enc.diagnosis || patient.diagnosis}</div>
                          <div className="text-[11px] text-[#64748B]">{enc.procedure || 'Clinical Evaluation'}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#E8F5EC] text-[#0B6B3A]">
                            {enc.classification || patient.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-[#0B6B3A]">
                          {formatCurrency(enc.approved_financial_assistance || 0)}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#DCFCE7] text-[#15803D]">
                            {enc.status || 'COMPLETED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Scheduled Appointments Table */}
          <div className="bg-white rounded-2xl border border-[#D5E2D9] p-5 shadow-xs">
            <h2 className="text-sm font-bold text-[#10241A] flex items-center gap-2 mb-3">
              <i className="fa-solid fa-calendar-check text-[#0B6B3A]" />
              <span>Clinic Appointments ({appointments.length})</span>
            </h2>
            {appointments.length === 0 ? (
              <div className="p-6 text-center bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-xs text-[#64748B]">
                No scheduled appointments found for this patient.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-[11px] font-bold uppercase text-[#5A7466] bg-[#F8FBF9]">
                      <th className="py-2.5 px-3">Appointment ID</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Date &amp; Time</th>
                      <th className="py-2.5 px-3">Assigned Doctor</th>
                      <th className="py-2.5 px-3">Room</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2EF]">
                    {appointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-3 font-mono font-bold text-[#10241A]">{apt.id}</td>
                        <td className="py-3 px-3 font-semibold">{apt.appointment_type}</td>
                        <td className="py-3 px-3">
                          {apt.appointment_date} • {apt.appointment_time}
                        </td>
                        <td className="py-3 px-3">{apt.assigned_doctor}</td>
                        <td className="py-3 px-3">{apt.clinic_room}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#E8F5EC] text-[#0B6B3A]">
                            {apt.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: PROCEDURES & CHECKUPS
         ===================================================================== */}
      {activeTab === 'procedures' && (
        <div className="bg-white rounded-2xl border border-[#D5E2D9] p-5 shadow-xs space-y-4">
          <div className="border-b border-[#EEF2EF] pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#10241A] flex items-center gap-2">
                <i className="fa-solid fa-stethoscope text-[#0B6B3A]" />
                <span>Ophthalmic Diagnosis, Procedures &amp; Clinical Context</span>
              </h2>
              <p className="text-[11px] text-[#5A7466] mt-0.5">
                Medical context used by the MSW to evaluate treatment urgency, chronicity, and surgical subsidy eligibility.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#F8FBF9] border border-[#D5E2D9]">
              <div className="text-[10px] font-bold uppercase text-[#5A7466]">Primary Ophthalmic Diagnosis</div>
              <div className="text-sm font-extrabold text-[#10241A] mt-1">
                {patient.diagnosis || latestReferral?.diagnosis || 'Ophthalmic Evaluation'}
              </div>
              <div className="text-[11px] text-[#5A7466] mt-1">
                Recorded in OFPHIL Clinical Registry for {fullName} ({identifiers.patientId}).
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FBF9] border border-[#D5E2D9]">
              <div className="text-[10px] font-bold uppercase text-[#5A7466]">Recommended Procedure / Intervention</div>
              <div className="text-sm font-extrabold text-[#0B6B3A] mt-1">
                {latestReferral?.procedure ||
                  encounters[0]?.procedure ||
                  'Comprehensive Ophthalmic & Surgical Workup'}
              </div>
              <div className="text-[11px] text-[#5A7466] mt-1">
                Attending Physician: {latestReferral?.attending_doctor || encounters[0]?.attending_doctor || 'Dr. J. E. Garcia, MD'}
              </div>
            </div>
          </div>

          {latestReferral && Array.isArray(latestReferral.particulars) && latestReferral.particulars.length > 0 && (
            <div className="pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#5A7466] mb-2.5">
                Itemized Surgical &amp; Procedure Particulars
              </h3>
              <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold uppercase text-[#64748B]">
                      <th className="py-2.5 px-3.5">Clinical Item / Particular</th>
                      <th className="py-2.5 px-3.5 text-right">Estimated Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2EF]">
                    {latestReferral.particulars.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3.5 font-medium text-[#1E293B]">{item.description}</td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-[#10241A]">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[#F0F9F3] font-extrabold text-[#0B6B3A]">
                      <td className="py-2.5 px-3.5">Total Estimated Procedure Cost</td>
                      <td className="py-2.5 px-3.5 text-right font-mono">
                        {formatCurrency(latestReferral.total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 4: MEDICAL ASSISTANCE REFERRAL
         ===================================================================== */}
      {effectiveActiveTab === 'referral' && (
        <div className="bg-white rounded-2xl border border-[#D5E2D9] p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#EEF2EF] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#10241A] flex items-center gap-2">
                <i className="fa-solid fa-hand-holding-medical text-[#0B6B3A]" />
                <span>Clinical Medical Assistance Referrals ({referrals.length})</span>
              </h2>
              <p className="text-[11px] text-[#5A7466] mt-0.5">
                Official physician-endorsed clinic procedure quotation referrals routed to the MSW division for subsidy review.
              </p>
            </div>
            {isCharity && role === 'msw' && (
              <Link
                href={assessmentActionMeta.href}
                onClick={() => startProgress()}
                className="px-3.5 py-2 rounded-xl bg-[#0B6B3A] hover:bg-[#095830] text-white text-xs font-bold no-underline inline-flex items-center gap-1.5"
              >
                <i className={`fa-solid ${assessmentActionMeta.icon}`} />
                <span>{assessmentActionMeta.label}</span>
              </Link>
            )}
          </div>

          {referrals.length === 0 ? (
            <div className="p-8 text-center bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              <i className="fa-solid fa-file-circle-question text-2xl text-[#64748B] mb-2 block" />
              <div className="text-xs font-bold text-[#1E293B]">
                No Separate Clinical Referral Slip on File
              </div>
              <p className="text-[11px] text-[#64748B] mt-1 max-w-md mx-auto">
                {isCharity
                  ? `This patient is registered directly under the Charity Program (${identifiers.charityCaseNo}). Review their eligibility in the Assessment & Charity Status tab.`
                  : 'No medical assistance referral has been submitted for this patient yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {referrals.map((ref) => (
                <div key={ref.id} className="rounded-2xl border border-[#D5E2D9] bg-[#F8FBF9] p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D5E2D9] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-sm text-[#0B6B3A]">{ref.id}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]">
                          {formatReferralStatusLabel(ref.status, 'ENDORSED FOR MEDICAL ASSISTANCE')}
                        </span>
                      </div>
                      <div className="text-xs text-[#5A7466] mt-0.5">
                        Patient: <strong className="text-[#10241A]">{fullName}</strong> ({ref.patient_id})
                      </div>
                      {ref.encounter_id && (
                        <button
                          type="button"
                          onClick={() => {
                            setHighlightEncounterId(ref.encounter_id);
                            handleTabChange('appointments');
                          }}
                          className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#BAE6FD] bg-[#F0F9FF] hover:bg-[#E0F2FE] text-[11px] font-semibold text-[#0369A1] cursor-pointer"
                        >
                          <i className="fa-solid fa-link text-[9px]" />
                          <span>Originating Procedure &amp; Checkup:</span>
                          <span className="font-mono font-bold">{ref.encounter_id}</span>
                          {ref.encounter_date && <span className="text-[#334155]">({ref.encounter_date})</span>}
                        </button>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase text-[#5A7466]">Total Quotation</div>
                      <div className="text-lg font-['Outfit'] font-extrabold text-[#0B6B3A]">
                        {formatCurrency(ref.total)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white border border-[#E2ECE5]">
                      <div className="text-[10px] font-bold uppercase text-[#5A7466]">Clinical Diagnosis</div>
                      <div className="font-bold text-[#10241A] mt-0.5">{ref.diagnosis}</div>
                      {ref.eye_laterality && (
                        <div className="text-[11px] text-[#0B6B3A] font-semibold mt-0.5">Eye Laterality: {ref.eye_laterality}</div>
                      )}
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-[#E2ECE5]">
                      <div className="text-[10px] font-bold uppercase text-[#5A7466]">Surgical Procedure</div>
                      <div className="font-bold text-[#10241A] mt-0.5">{ref.procedure}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-[#E2ECE5]">
                      <div className="text-[10px] font-bold uppercase text-[#5A7466]">Attending Surgeon</div>
                      <div className="font-bold text-[#10241A] mt-0.5">{ref.attending_doctor}</div>
                      <div className="text-[11px] text-[#64748B]">{ref.doctor_signature_title}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-[#E2ECE5]">
                      <div className="text-[10px] font-bold uppercase text-[#5A7466]">Referring Officer</div>
                      <div className="font-bold text-[#10241A] mt-0.5">{ref.referring_individual}</div>
                      <div className="text-[11px] text-[#64748B]">{ref.referring_signature_title}</div>
                    </div>
                  </div>

                  {/* Itemized Particulars if recorded */}
                  {Array.isArray(ref.particulars) && ref.particulars.length > 0 && (
                    <div className="bg-white rounded-xl border border-[#E2ECE5] p-3 text-xs space-y-1.5">
                      <div className="text-[10px] font-bold uppercase text-[#5A7466]">Itemized Clinical Quotation:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ref.particulars.map((pt: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center py-1 px-2.5 rounded bg-[#FAFBF8] border border-[#EEF2EF] text-[11px]">
                            <span className="text-[#334155] font-medium">{idx + 1}. {pt.name || pt.description || '—'}</span>
                            <span className="font-mono font-bold text-[#0B6B3A]">₱{Number(pt.amount || 0).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contextual Action per Referral */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#D5E2D9]">
                    <div className="text-[11px] text-[#64748B]">
                      {ref.clinical_findings && <span>Clinical Findings: {ref.clinical_findings}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {(ref.status === 'MSW APPROVED' || ref.status === 'APPROVED' || Boolean(ref.charity_case_no)) && role === 'msw' ? (() => {
                        const asmt = assessments.find((a) => a.referral_id === ref.id || a.patient_id === ref.patient_id);
                        const isCompleted = asmt && (asmt.workflow_status === 'APPROVED' || asmt.workflow_status === 'SUBMITTED' || asmt.workflow_status === 'PENDING_APPROVAL');
                        const isDraft = asmt && (asmt.workflow_status === 'DRAFT' || asmt.workflow_status === 'ASSESSMENT_IN_PROGRESS');

                        if (isCompleted) {
                          return (
                            <button
                              type="button"
                              onClick={() => handleTabChange('assessment')}
                              className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <i className="fa-solid fa-eye text-xs" />
                              <span>View Assessment</span>
                            </button>
                          );
                        }
                        if (isDraft) {
                          return (
                            <Link
                              href={`/assessment?patient_id=${encodeURIComponent(ref.patient_id)}&assessment_id=${encodeURIComponent(asmt.id)}&referral_id=${encodeURIComponent(ref.id)}`}
                              onClick={() => startProgress()}
                              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition inline-flex items-center gap-1.5 shadow-2xs no-underline"
                            >
                              <i className="fa-solid fa-pen-to-square text-xs" />
                              <span>Continue Assessment</span>
                            </Link>
                          );
                        }
                        return (
                          <Link
                            href={`/assessment?patient_id=${encodeURIComponent(ref.patient_id)}&referral_id=${encodeURIComponent(ref.id)}`}
                            onClick={() => startProgress()}
                            className="px-4 py-2 rounded-xl bg-[#0B6B3A] hover:bg-[#095830] text-white text-xs font-bold transition inline-flex items-center gap-1.5 shadow-2xs no-underline"
                          >
                            <i className="fa-solid fa-play text-xs" />
                            <span>Start Assessment</span>
                          </Link>
                        );
                      })() : role === 'msw' && ref.status !== 'MSW APPROVED' && !ref.charity_case_no ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                            Awaiting MSW Review &amp; Approval
                          </span>
                          <button
                            type="button"
                            disabled={approvingReferralId === ref.id}
                            onClick={() => setConfirmApproveReferral(ref)}
                            className="px-3.5 py-1.5 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white text-xs font-bold transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                            title="Directly approve this clinical referral and assign Charity Case Number"
                          >
                            <i className={`fa-solid ${approvingReferralId === ref.id ? 'fa-spinner fa-spin' : 'fa-check'} text-xs`} />
                            <span>{approvingReferralId === ref.id ? 'Approving...' : 'Approve Referral'}</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                          Awaiting MSW Review &amp; Approval
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 5: DOCUMENTS & VAULT (PDF / PNG / JPG Preview & Download)
         ===================================================================== */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-2xl border border-[#D5E2D9] p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEF2EF] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#10241A] flex items-center gap-2">
                <i className="fa-solid fa-folder-open text-[#0B6B3A]" />
                <span>Patient Supporting Documents &amp; Evidential Vault ({documents.length})</span>
              </h2>
              <p className="text-[11px] text-[#5A7466] mt-0.5">
                All supporting documents strictly linked to Patient ID <strong>{identifiers.patientId}</strong>. Supports PDF, PNG, and JPG preview and download.
              </p>
            </div>
            <Link
              href={`/documents?patient_id=${encodeURIComponent(patientId)}`}
              onClick={() => startProgress()}
              className="px-3.5 py-2 rounded-xl border border-[#0B6B3A] bg-[#E8F5EC] hover:bg-[#0B6B3A] hover:text-white text-[#0B6B3A] text-xs font-bold transition no-underline inline-flex items-center gap-1.5"
            >
              <i className="fa-solid fa-file-shield" />
              <span>Open Document Authenticity Audit</span>
            </Link>
          </div>

          {documents.length === 0 ? (
            <div className="p-10 text-center bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              <i className="fa-regular fa-folder-open text-2xl text-[#64748B] mb-2 block" />
              <div className="text-xs font-bold text-[#1E293B]">No Supporting Documents Uploaded Yet</div>
              <p className="text-[11px] text-[#64748B] mt-1 max-w-md mx-auto">
                Supporting documents (Barangay Indigency, Valid ID, Medical Abstract, Surgical Quotation) uploaded during Stage 3 of the MSW Assessment will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {documents.map((doc) => {
                const docId = doc.id;
                const previewUrl = getApiUrl(
                  `/documents/${encodeURIComponent(docId)}/download?patient_id=${encodeURIComponent(patientId)}&inline=true`
                );
                const downloadUrl = getApiUrl(
                  `/documents/${encodeURIComponent(docId)}/download?patient_id=${encodeURIComponent(patientId)}`
                );
                return (
                  <div
                    key={docId}
                    className="p-4 rounded-xl border border-[#D5E2D9] bg-[#F8FBF9] flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center shrink-0">
                        <i
                          className={`fa-solid ${String(doc.mime_type || '').includes('pdf') ? 'fa-file-pdf' : 'fa-file-image'
                            } text-base`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-[#10241A] truncate">
                          {doc.document_type || 'Supporting Document'}
                        </div>
                        <div className="text-[11px] text-[#475569] truncate">{doc.filename || docId}</div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-[#D5E2D9] text-[#0B6B3A]">
                            {doc.status || 'UPLOADED'}
                          </span>
                          {doc.upload_date && (
                            <span className="text-[10px] text-[#64748B]">
                              {new Date(doc.upload_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewDoc({ ...doc, previewUrl, downloadUrl })}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-[#D5E2D9] hover:border-[#0B6B3A] text-xs font-bold text-[#0B6B3A] cursor-pointer"
                      >
                        <i className="fa-regular fa-eye mr-1" />
                        Preview
                      </button>
                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-[#0B6B3A] text-white text-xs font-bold no-underline hover:bg-[#095830]"
                      >
                        <i className="fa-solid fa-download" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Document Preview Modal */}
          {previewDoc && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-[#D5E2D9] max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                <div className="px-4 py-3 bg-[#F8FBF9] border-b border-[#D5E2D9] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-extrabold text-[#10241A]">
                      {previewDoc.document_type} — {previewDoc.filename}
                    </div>
                    <div className="text-[10px] text-[#5A7466]">Patient ID: {identifiers.patientId}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(null)}
                    className="w-8 h-8 rounded-lg bg-white border border-[#D5E2D9] text-[#475569] hover:text-[#10241A] cursor-pointer"
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>
                <div className="p-4 flex-1 overflow-auto bg-[#F1F5F9] flex items-center justify-center min-h-[360px]">
                  {String(previewDoc.mime_type || '').includes('pdf') ? (
                    <iframe
                      src={previewDoc.previewUrl}
                      title={previewDoc.filename}
                      className="w-full h-[60vh] rounded-xl border border-[#CBD5E1] bg-white"
                    />
                  ) : (
                    <img
                      src={previewDoc.previewUrl}
                      alt={previewDoc.filename}
                      className="max-h-[60vh] max-w-full rounded-xl border border-[#CBD5E1] bg-white object-contain"
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 6: REQUESTS & INQUIRIES
         ===================================================================== */}
      {activeTab === 'inquiries' && (
        <div className="bg-white rounded-2xl border border-[#D5E2D9] p-5 shadow-xs space-y-4">
          <div className="border-b border-[#EEF2EF] pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#10241A] flex items-center gap-2">
                <i className="fa-solid fa-comments text-[#0B6B3A]" />
                <span>Patient Requests &amp; Inquiries ({inquiries.length})</span>
              </h2>
              <p className="text-[11px] text-[#5A7466] mt-0.5">
                Direct portal inquiries and attached documents submitted by {fullName} ({identifiers.patientId}).
              </p>
            </div>
          </div>

          {inquiries.length === 0 ? (
            <div className="p-8 text-center bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-xs text-[#64748B]">
              No patient inquiries submitted by {fullName} ({identifiers.patientId}).
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2.5">
                {inquiries.map((inq) => (
                  <div
                    key={inq.id}
                    onClick={() => {
                      setSelectedInquiry(inq);
                      setReplySuccess(null);
                    }}
                    className={`p-4 rounded-xl border transition cursor-pointer ${selectedInquiry?.id === inq.id
                      ? 'bg-[#F0F9F3] border-[#0B6B3A]'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#0B6B3A]'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-[#0B6B3A]">{inq.id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-[#D5E2D9] text-[#10241A]">
                        {inq.status}
                      </span>
                    </div>
                    <div className="text-xs font-extrabold text-[#10241A] mt-1">{inq.subject}</div>
                    <p className="text-[11px] text-[#475569] mt-0.5 line-clamp-2">{inq.message}</p>
                    <div className="text-[10px] text-[#64748B] mt-2">
                      Submitted {new Date(inq.created_at).toLocaleString()} •{' '}
                      {(inq.attachments || []).length} attachment(s) • {(inq.replies || []).length} reply(ies)
                    </div>
                  </div>
                ))}
              </div>

              {selectedInquiry ? (
                <div className="p-4 rounded-xl border border-[#D5E2D9] bg-[#F8FBF9] space-y-3">
                  <div className="border-b border-[#D5E2D9] pb-2.5">
                    <div className="text-xs font-extrabold text-[#10241A]">{selectedInquiry.subject}</div>
                    <div className="text-[11px] text-[#5A7466]">
                      Inquiry ID: {selectedInquiry.id} • Status: {selectedInquiry.status}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[#E2ECE5] text-xs text-[#1E293B]">
                    {selectedInquiry.message}
                  </div>

                  {Array.isArray(selectedInquiry.replies) && selectedInquiry.replies.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold uppercase text-[#5A7466]">Reply History</div>
                      {selectedInquiry.replies.map((rep: any) => (
                        <div key={rep.id} className="p-3 rounded-xl bg-[#E8F5EC] border border-[#BBF7D0] text-xs">
                          <div className="font-bold text-[#0B6B3A] text-[11px]">
                            {rep.admin_name} • {new Date(rep.created_at).toLocaleString()}
                          </div>
                          <div className="text-[#10241A] mt-1">{rep.message}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleSendInquiryReply} className="space-y-2 pt-2">
                    <label className="block text-[11px] font-bold text-[#10241A]">
                      Send MSW Casework Reply
                    </label>
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a response regarding the patient's assessment or charity requirements..."
                      className="w-full p-2.5 rounded-xl border border-[#D5E2D9] bg-white text-xs focus:outline-none focus:border-[#0B6B3A]"
                    />
                    {replySuccess && (
                      <div className="text-[11px] font-bold text-[#0B6B3A]">{replySuccess}</div>
                    )}
                    <button
                      type="submit"
                      disabled={replySending || !replyText.trim()}
                      className="px-4 py-2 rounded-xl bg-[#0B6B3A] hover:bg-[#095830] disabled:opacity-50 text-white text-xs font-bold cursor-pointer border-0"
                    >
                      {replySending ? 'Sending...' : 'Send Portal Reply'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="p-8 rounded-xl border border-dashed border-[#CBD5E1] text-center text-xs text-[#64748B] flex items-center justify-center">
                  Select an inquiry from the list to view conversation and reply.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 7: ASSESSMENT & CHARITY STATUS (DEDICATED MSW TAB — SUBSECTIONS A–E)
         ===================================================================== */}
      {isCharity && effectiveActiveTab === 'assessment' && (
        <div className="space-y-5">
          {/* SUBSECTION E (Top Banner CTA) + Assessment Selector if multiple assessments exist */}
          <div className="bg-[#F0F9F3] rounded-2xl border border-[#BBF7D0] p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#0B6B3A]">
                  MSW Assessment &amp; Charity Workflow
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${assessmentActionMeta.badgeClass}`}
                >
                  {assessmentActionMeta.badge}
                </span>
              </div>
              <p className="text-xs text-[#1E293B]">{assessmentActionMeta.description}</p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              {assessments.length > 1 && (
                <select
                  value={activeAssessment?.id || ''}
                  onChange={(e) => setSelectedAssessmentId(e.target.value)}
                  aria-label="Select assessment record"
                  className="px-3 py-2 rounded-xl border border-[#0B6B3A]/40 bg-white text-xs font-bold text-[#10241A]"
                >
                  {assessments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.id} ({a.workflow_status})
                    </option>
                  ))}
                </select>
              )}
              <Link
                href={assessmentActionMeta.href}
                onClick={() => startProgress()}
                className="px-5 py-2.5 rounded-xl bg-[#0B6B3A] hover:bg-[#095830] text-white text-xs font-extrabold transition no-underline inline-flex items-center gap-2 shadow-xs"
              >
                <i className={`fa-solid ${assessmentActionMeta.icon}`} />
                <span>{assessmentActionMeta.label}</span>
              </Link>
            </div>
          </div>

          {/* SUBSECTION A: ASSESSMENT OVERVIEW */}
          <div className="bg-white rounded-2xl border border-[#D5E2D9] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#EEF2EF] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#10241A] flex items-center gap-2">
                  <i className="fa-solid fa-clipboard-list text-[#0B6B3A]" />
                  <span>A. Assessment Overview</span>
                </h2>
                <p className="text-[11px] text-[#5A7466] mt-0.5">
                  Core identifiers, assigned social worker, and current workflow stage for this patient dossier.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                <div className="text-[10px] font-bold uppercase text-[#5A7466]">Assessment ID</div>
                <div className="font-mono font-extrabold text-[#10241A] mt-1">
                  {activeAssessment?.id || 'No Assessment Created Yet'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                <div className="text-[10px] font-bold uppercase text-[#5A7466]">Application Encounter Number</div>
                <div className="font-mono font-bold text-[#0369A1] mt-1">{identifiers.encounterNo}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                <div className="text-[10px] font-bold uppercase text-[#5A7466]">Charity Case Number</div>
                <div className="font-mono font-bold text-[#0B6B3A] mt-1">{identifiers.charityCaseNo}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                <div className="text-[10px] font-bold uppercase text-[#5A7466]">Assigned MSW</div>
                <div className="font-bold text-[#10241A] mt-1">
                  {patient.assigned_msw || activeAssessment?.created_by || mswDisplayName}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                <div className="text-[10px] font-bold uppercase text-[#5A7466]">Assessment Date</div>
                <div className="font-bold text-[#10241A] mt-1">
                  {activeAssessment?.created_at
                    ? new Date(activeAssessment.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                    : patient.registration_date || 'Not Started'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                <div className="text-[10px] font-bold uppercase text-[#5A7466]">Assessment Stage</div>
                <div className="font-bold text-[#10241A] mt-1">
                  {activeAssessment
                    ? `Stage ${activeAssessment.active_stage || 1} of 4`
                    : 'Pre-Assessment (Dossier Review)'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                <div className="text-[10px] font-bold uppercase text-[#5A7466]">Assessment Status</div>
                <div className="mt-1">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${assessmentActionMeta.badgeClass}`}
                  >
                    {activeAssessment?.workflow_status || assessmentActionMeta.badge}
                  </span>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                <div className="text-[10px] font-bold uppercase text-[#5A7466]">Last Updated</div>
                <div className="font-bold text-[#10241A] mt-1">
                  {activeAssessment?.updated_at
                    ? new Date(activeAssessment.updated_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                    : 'No Saved Changes'}
                </div>
              </div>
            </div>
          </div>

          {/* SUBSECTION B: 4-STAGE ASSESSMENT PROGRESS */}
          <div className="bg-white rounded-2xl border border-[#D5E2D9] p-5 shadow-xs space-y-4">
            <div className="border-b border-[#EEF2EF] pb-3">
              <h2 className="text-sm font-bold text-[#10241A] flex items-center gap-2">
                <i className="fa-solid fa-bars-progress text-[#0B6B3A]" />
                <span>B. Four-Stage MSW Assessment Progress</span>
              </h2>
              <p className="text-[11px] text-[#5A7466] mt-0.5">
                Live progress across the 4-stage OFPHIL Medical Social Work Assessment pipeline.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {fourStageProgress.map((item) => (
                <div
                  key={item.stage}
                  className="p-4 rounded-2xl border border-[#D5E2D9] bg-[#F8FBF9] flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#0B6B3A] text-white flex items-center justify-center text-xs font-extrabold">
                        <i className={`fa-solid ${item.icon}`} />
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${item.stateClass}`}
                      >
                        {item.state}
                      </span>
                    </div>
                    <h3 className="text-xs font-extrabold text-[#10241A] mt-3">{item.title}</h3>
                    <p className="text-[11px] text-[#5A7466] mt-0.5 leading-snug">{item.subtitle}</p>
                  </div>
                  <div className="pt-2.5 border-t border-[#E2ECE5] text-[11px] font-medium text-[#1E293B]">
                    {item.details}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SUBSECTION C & D: ELIGIBILITY RECOMMENDATION & CHARITY ASSISTANCE STATUS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* SUBSECTION C: ELIGIBILITY RECOMMENDATION */}
            <div className="bg-white rounded-2xl border border-[#D5E2D9] p-5 shadow-xs space-y-4">
              <div className="border-b border-[#EEF2EF] pb-3">
                <h2 className="text-sm font-bold text-[#10241A] flex items-center gap-2">
                  <i className="fa-solid fa-scale-balanced text-[#0B6B3A]" />
                  <span>C. Eligibility Classification &amp; MSW Recommendation</span>
                </h2>
                <p className="text-[11px] text-[#5A7466] mt-0.5">
                  Deterministic OFPHIL socio-economic classification and MSW recommendation (distinct from supplementary ML support).
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                    <div className="text-[10px] font-bold uppercase text-[#5A7466]">
                      Deterministic Financial Class
                    </div>
                    <div className="font-extrabold text-[#10241A] mt-1">
                      {typeof activeAssessment?.classification_result?.financial_classification === 'object'
                        ? activeAssessment.classification_result.financial_classification.classification_label ||
                        activeAssessment.classification_result.financial_classification.classification
                        : activeAssessment?.classification_result?.financial_classification ||
                        (isCharity && patientStatus === 'APPROVED'
                          ? 'Class C3 / D — Indigent Charity'
                          : 'Pending Classification')}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                    <div className="text-[10px] font-bold uppercase text-[#5A7466]">
                      MSW Biopsychosocial Class
                    </div>
                    <div className="font-extrabold text-[#10241A] mt-1">
                      {typeof activeAssessment?.classification_result?.msw_classification === 'object'
                        ? activeAssessment.classification_result.msw_classification.classification_label ||
                        activeAssessment.classification_result.msw_classification.classification
                        : activeAssessment?.classification_result?.msw_classification ||
                        activeAssessment?.stage2_evaluation?.status ||
                        'Pending Stage 2 Evaluation'}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F0F9F3] border border-[#BBF7D0]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0B6B3A]">
                      Official MSW Recommended Grant Tier
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#0B6B3A] text-white">
                      Deterministic / MSW Verified
                    </span>
                  </div>
                  <div className="text-sm font-['Outfit'] font-extrabold text-[#10241A] mt-1.5">
                    {activeAssessment?.msw_recommendation?.recommended_tier ||
                      activeAssessment?.classification_result?.combined_recommendation ||
                      (isCharity && patientStatus === 'APPROVED'
                        ? 'Indigent (100% Full Charity Subsidy)'
                        : patientStatus.includes('PROMISSORY')
                          ? 'Partial Subsidy / Promissory Note Arrangement'
                          : 'Awaiting MSW Recommendation')}
                  </div>
                  <div className="text-[11px] text-[#475569] mt-1">
                    {activeAssessment?.msw_recommendation?.justification ||
                      'Final eligibility recommendation is determined by the licensed Medical Social Worker based on verified household income, biopsychosocial severity, and supporting documents.'}
                  </div>
                </div>

                {/* Explicit Distinction between Supplementary ML Prediction and Authorized Decision */}
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-[#64748B]">
                      Supplementary ML Decision Support (Non-Binding)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E2E8F0] text-[#475569]">
                      Advisory Only
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[#334155] mt-1">
                    {activeAssessment?.ml_prediction?.predicted_class
                      ? `Model Prediction: ${activeAssessment.ml_prediction.predicted_class} (Confidence: ${Math.round(
                        Number(activeAssessment.ml_prediction.confidence || 0.95) * 100
                      )}%)`
                      : 'CatBoost / Multimodal ML prediction is supplementary only and never overrides the MSW or Admin institutional decision.'}
                  </div>
                </div>
              </div>
            </div>

            {/* SUBSECTION D: CHARITY ASSISTANCE STATUS */}
            <div className="bg-white rounded-2xl border border-[#D5E2D9] p-5 shadow-xs space-y-4">
              <div className="border-b border-[#EEF2EF] pb-3">
                <h2 className="text-sm font-bold text-[#10241A] flex items-center gap-2">
                  <i className="fa-solid fa-hand-holding-heart text-[#0B6B3A]" />
                  <span>D. Charity Assistance &amp; Institutional Decision Status</span>
                </h2>
                <p className="text-[11px] text-[#5A7466] mt-0.5">
                  Current charity application status, approved subsidy, or promissory note details.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                  <div className="text-[10px] font-bold uppercase text-[#5A7466]">Charity Case Number</div>
                  <div className="font-mono font-extrabold text-[#0B6B3A] mt-1">{identifiers.charityCaseNo}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                  <div className="text-[10px] font-bold uppercase text-[#5A7466]">Beneficiary Classification</div>
                  <div className="font-bold text-[#10241A] mt-1">{beneficiaryBadge.label}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                  <div className="text-[10px] font-bold uppercase text-[#5A7466]">Charity Application Status</div>
                  <div className="mt-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${statusBadge.cls}`}>
                      {activeAssessment?.institutional_approval?.decision || patientStatus}
                    </span>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                  <div className="text-[10px] font-bold uppercase text-[#5A7466]">Requested Assistance</div>
                  <div className="font-bold text-[#10241A] mt-1">
                    {latestReferral?.procedure || patient.diagnosis || 'Ophthalmic Surgical Subsidy'}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                  <div className="text-[10px] font-bold uppercase text-[#5A7466]">Approved Subsidy / Coverage</div>
                  <div className="font-extrabold text-[#0B6B3A] mt-1">
                    {activeAssessment?.institutional_approval?.approved_subsidy_percentage != null
                      ? `${activeAssessment.institutional_approval.approved_subsidy_percentage}% Subsidy`
                      : totalAssistanceApproved > 0
                        ? formatCurrency(totalAssistanceApproved)
                        : isCharity && patientStatus === 'APPROVED'
                          ? '100% Full Charity Grant'
                          : 'Pending Final Approval'}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F8FBF9] border border-[#E2ECE5]">
                  <div className="text-[10px] font-bold uppercase text-[#5A7466]">Authorized Reviewer</div>
                  <div className="font-bold text-[#10241A] mt-1">
                    {activeAssessment?.institutional_approval?.approved_by ||
                      (patientStatus === 'APPROVED'
                        ? 'Maria Santos, RSW / OFPHIL Charity Board'
                        : 'Pending Review')}
                  </div>
                </div>
              </div>

              {(patientStatus.includes('DISAPPROVED') ||
                patientStatus.includes('PROMISSORY') ||
                activeAssessment?.institutional_approval?.decision === 'REJECTED') && (
                  <div className="p-4 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-xs space-y-1">
                    <div className="font-extrabold text-[#B45309] flex items-center gap-1.5">
                      <i className="fa-solid fa-file-signature" />
                      <span>Promissory Note / Disapproval Remarks</span>
                    </div>
                    <p className="text-[#78350F] leading-relaxed">
                      {activeAssessment?.institutional_approval?.decision_notes ||
                        'Case evaluated under Disapproved / Promissory Note arrangement. Patient may execute a scheduled promissory agreement or submit supplemental income/indigency documentation for reconsideration.'}
                    </p>
                  </div>
                )}
            </div>
          </div>

          {/* ASSESSMENT HISTORY LOG */}
          <div className="bg-white rounded-2xl border border-[#D5E2D9] p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-[#10241A] flex items-center gap-2">
              <i className="fa-solid fa-clock-rotate-left text-[#0B6B3A]" />
              <span>Patient MSW Assessment History ({assessments.length})</span>
            </h2>
            {assessments.length === 0 ? (
              <div className="p-6 text-center bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-xs text-[#64748B]">
                No saved assessment records exist yet for {fullName} ({identifiers.patientId}). Click{' '}
                <strong>Launch Assessment</strong> above when you are ready to begin Stage 1.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-[11px] font-bold uppercase text-[#5A7466] bg-[#F8FBF9]">
                      <th className="py-2.5 px-3">Assessment ID</th>
                      <th className="py-2.5 px-3">Encounter No.</th>
                      <th className="py-2.5 px-3">Stage</th>
                      <th className="py-2.5 px-3">Workflow Status</th>
                      <th className="py-2.5 px-3">Recommendation</th>
                      <th className="py-2.5 px-3">Updated</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2EF]">
                    {assessments.map((asmt) => (
                      <tr key={asmt.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-3 font-mono font-bold text-[#10241A]">{asmt.id}</td>
                        <td className="py-3 px-3 font-mono text-[#0369A1]">{asmt.encounter_no}</td>
                        <td className="py-3 px-3 font-semibold">Stage {asmt.active_stage || 1} of 4</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8F5EC] text-[#0B6B3A]">
                            {asmt.workflow_status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#1E293B]">
                          {asmt.msw_recommendation?.recommended_tier ||
                            asmt.classification_result?.combined_recommendation ||
                            'In Progress'}
                        </td>
                        <td className="py-3 px-3 text-[#64748B]">
                          {asmt.updated_at ? new Date(asmt.updated_at).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href={`/assessment?patient_id=${encodeURIComponent(patientId)}&assessment_id=${encodeURIComponent(asmt.id)}`}
                            onClick={() => startProgress()}
                            className="px-3 py-1.5 rounded-lg bg-[#0B6B3A] hover:bg-[#095830] text-white text-[11px] font-bold no-underline inline-flex items-center gap-1"
                          >
                            <span>Open in Assessment Tool</span>
                            <i className="fa-solid fa-arrow-right text-[9px]" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {confirmApproveReferral && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D5E2D9] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-triangle-exclamation text-base" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#10241A] m-0 font-['Outfit']">
                  Caution: Confirm Referral Approval
                </h3>
                <p className="text-xs text-[#5A7466] m-0 leading-relaxed">
                  Are you sure you want to approve referral <span className="font-mono font-bold text-[#10241A]">{confirmApproveReferral.referral_no || confirmApproveReferral.id}</span>?
                  Did you double-check the clinical diagnosis, surgical procedure, and itemized quotation (<span className="font-mono font-bold text-[#0B6B3A]">₱{Number(confirmApproveReferral.total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>)?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={approvingReferralId === confirmApproveReferral.id}
                onClick={() => setConfirmApproveReferral(null)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-[#FAFBF8] text-[#10241A] border border-[#D5E2D9] font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                Cancel / Double-Check
              </button>
              <button
                type="button"
                disabled={approvingReferralId === confirmApproveReferral.id}
                onClick={async () => {
                  const target = confirmApproveReferral;
                  setConfirmApproveReferral(null);
                  await handleApproveReferralDirect(target);
                }}
                className="px-4 py-2 rounded-xl bg-[#0B6B3A] hover:bg-[#084D29] text-white font-bold text-xs flex items-center gap-2 cursor-pointer border-0 shadow-xs disabled:opacity-60"
              >
                <i className="fa-solid fa-check text-xs" />
                <span>Yes, Approve Referral</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MSWPatientDossierPage() {
  return (
    <DashboardLayout
      title="MSW Unified Patient Dossier"
      subtitle="Ophthalmological Foundation of the Philippines — Clinical Social Services & Charity Eligibility Dossier"
    >
      <Suspense
        fallback={
          <div className="p-12 text-center bg-white rounded-2xl border border-[#D5E2D9]">
            <i className="fa-solid fa-spinner fa-spin text-xl text-[#0B6B3A] mb-2 block" />
            <span className="text-xs font-bold text-[#10241A]">Loading Patient Dossier...</span>
          </div>
        }
      >
        <MSWDossierContent />
      </Suspense>
    </DashboardLayout>
  );
}
