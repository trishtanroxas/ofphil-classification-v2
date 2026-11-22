'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';

function MSWAssessmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdParam = searchParams?.get('patient_id') || 'M26-11-00001';

  // Stages: 1 = Case Study & Profile, 2 = MSW Assessment, 3 = Supporting Documents, 4 = Eligibility Grant Tier
  const [activeStage, setActiveStage] = useState<1 | 2 | 3 | 4>(1);

  // Common Header & Encounter metadata
  const [applicationEncounterNo, setApplicationEncounterNo] = useState(patientIdParam);
  const [mswNumber, setMswNumber] = useState('MSW_FA_0125-01');
  const [interviewDate, setInterviewDate] = useState('2026-11-22');
  const [timeStarted, setTimeStarted] = useState('09:00 AM');
  const [timeEnded, setTimeEnded] = useState('09:45 AM');
  const [sourceOfReferral, setSourceOfReferral] = useState('EYE CLINIC REFERRAL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic patient loading from database
  useEffect(() => {
    async function loadPatientDetails() {
      if (!patientIdParam) return;
      try {
        const res = await fetchApi(`/patients/${patientIdParam}`);
        if (res && res.patient) {
          const p = res.patient;
          setApplicationEncounterNo(p.patient_id || patientIdParam);
          if (p.patient_id && (p.patient_id.startsWith('MSW_FA_') || p.category === 'CHARITY')) {
            setMswNumber(p.patient_id);
          }
          setPatFirstName(p.first_name || '');
          setPatMiddleName(p.middle_name || '');
          setPatLastName(p.last_name || '');
          setPatSuffix(p.suffix || 'None');
          setPatAge(p.age ? String(p.age) : '48');
          setPatDob(p.birthdate || '1978-05-15');
          setPatSex(p.sex === 'M' ? 'Male' : p.sex === 'F' ? 'Female' : (p.sex || 'Male'));
          setPatCivilStatus(p.civil_status || 'Married');
          setPatContact(p.contact || '');
          setPatOccupation(p.occupation || 'Public Utility Driver');
          setPatEducation(p.educational_attainment || 'High School');
          if (p.diagnosis) {
            setAdmittingDiagnosis(p.diagnosis);
            setFinalDiagnosis(p.diagnosis);
          }
        }
      } catch (e) {
        // Fallback to default Juan Dela Cruz
      }
    }
    loadPatientDetails();
  }, [patientIdParam]);

  // STAGE 1: Informant / Representative State
  const [infLastName, setInfLastName] = useState('');
  const [infFirstName, setInfFirstName] = useState('');
  const [infMiddleName, setInfMiddleName] = useState('');
  const [infSuffix, setInfSuffix] = useState('None');
  const [infAge, setInfAge] = useState('');
  const [infDob, setInfDob] = useState('');
  const [infSex, setInfSex] = useState('');
  const [infReligion, setInfReligion] = useState('');
  const [infCivilStatus, setInfCivilStatus] = useState('');
  const [infAddress, setInfAddress] = useState('');
  const [infBarangay, setInfBarangay] = useState('');
  const [infCity, setInfCity] = useState('');
  const [infProvince, setInfProvince] = useState('');
  const [infRegion, setInfRegion] = useState('');
  const [infContact, setInfContact] = useState('');
  const [infRelation, setInfRelation] = useState('');
  const [infOccupation, setInfOccupation] = useState('');
  const [infIncome, setInfIncome] = useState('0.0');
  const [infEducation, setInfEducation] = useState('Elementary');

  // STAGE 1: Patient Information State
  const [patLastName, setPatLastName] = useState('');
  const [patFirstName, setPatFirstName] = useState('');
  const [patMiddleName, setPatMiddleName] = useState('');
  const [patSuffix, setPatSuffix] = useState('None');
  const [patAge, setPatAge] = useState('');
  const [patDob, setPatDob] = useState('');
  const [patSex, setPatSex] = useState('');
  const [patReligion, setPatReligion] = useState('');
  const [patCivilStatus, setPatCivilStatus] = useState('');
  const [patContact, setPatContact] = useState('');
  const [patNationality, setPatNationality] = useState('Filipino');
  const [patOccupation, setPatOccupation] = useState('');
  const [patIncome, setPatIncome] = useState('0.0');
  const [patEducation, setPatEducation] = useState('Elementary');

  // Sectoral Membership (Checkboxes)
  const [sectoral, setSectoral] = useState({
    artisanalFisherfolk: false,
    seniorCitizens: false,
    urbanPoor: false,
    victimsOfDisasters: false,
    farmersLandless: false,
    informalSector: false,
    pwd: false,
    indigenousPeoples: false,
    formalLaborMigrant: false,
  });
  const [sectoralOthers, setSectoralOthers] = useState('');
  const [disabilityStatus, setDisabilityStatus] = useState('UNKNOWN / Unverified Status');

  // Nature of Assistance Requested (Checkboxes)
  const [assistanceReq, setAssistanceReq] = useState({
    laboratory: false,
    consultation: false,
    financialAssistance: true,
    medicalCertificate: true,
    quotation: true,
  });

  // Family Composition Table State
  const [familyMembers, setFamilyMembers] = useState<
    Array<{
      id: string;
      name: string;
      relationship: string;
      age: string;
      civilStatus: string;
      education: string;
      occupation: string;
      income: string;
    }>
  >([]);

  const handleAddFamilyRow = () => {
    setFamilyMembers([
      ...familyMembers,
      {
        id: `fam-${Date.now()}`,
        name: '',
        relationship: 'Child',
        age: '',
        civilStatus: 'Single',
        education: 'High School',
        occupation: 'Worker',
        income: '0.00',
      },
    ]);
  };

  const handleRemoveFamilyRow = (id: string) => {
    setFamilyMembers(familyMembers.filter((f) => f.id !== id));
  };

  // STAGE 2: Medical Data & Health Access State
  const [admittingDiagnosis, setAdmittingDiagnosis] = useState('Senile Immature Cataract');
  const [finalDiagnosis, setFinalDiagnosis] = useState('Senile Immature Cataract');
  const [durationProblems, setDurationProblems] = useState('');
  const [previousTreatment, setPreviousTreatment] = useState('');
  const [presentTreatmentPlan, setPresentTreatmentPlan] = useState('Phacoemulsification with Foldable IOL (OS)');
  const [healthAccessibilityProblem, setHealthAccessibilityProblem] = useState('');

  // Health Factors Checklist (DOH-PIE Clinical Rubric)
  const [healthFactors, setHealthFactors] = useState([
    { factor: 'Absence of adequate health services', severity: 4, duration: 3, coping: 4, obs: 'High surgical fee barrier; nearest specialty tertiary hospital requires substantial out-of-pocket payment' },
    { factor: 'Inaccessibility of Health Services', severity: 4, duration: 4, coping: 4, obs: 'No direct ophthalmic subspecialist in local municipality; requires long travel with escort' },
    { factor: 'Absence of support services needed to use health services', severity: 3, duration: 3, coping: 3, obs: 'Limited caregiver capacity; primary earner cannot take leave without wage loss' },
    { factor: 'Absence of adequate Mental Health / Psychosocial Support services', severity: 2, duration: 2, coping: 2, obs: 'Mild anxiety over deteriorating sight; community social worker supportive' },
  ]);

  // Discrimination, Safety & Environmental Rubrics
  const [discrimSeverity, setDiscrimSeverity] = useState(3);
  const [discrimCoping, setDiscrimCoping] = useState(3);
  const [safetySeverity, setSafetySeverity] = useState(3);
  const [safetyCoping, setSafetyCoping] = useState(3);
  const [roleSeverity, setRoleSeverity] = useState(4);
  const [roleCoping, setRoleCoping] = useState(4);
  const [envSeverity, setEnvSeverity] = useState(4);

  // Live Rubric Calculations
  const averageSeverity = Number(
    ((healthFactors.reduce((acc, h) => acc + h.severity, 0) / healthFactors.length +
      discrimSeverity + safetySeverity + roleSeverity + envSeverity) / 5).toFixed(2)
  );

  const averageCoping = Number(
    ((healthFactors.reduce((acc, h) => acc + h.coping, 0) / healthFactors.length +
      discrimCoping + safetyCoping + roleCoping) / 4).toFixed(2)
  );

  // Total Risk Formula: (Average Severity * 8.5) + (Average Coping * 5.0)
  const totalRisk = Number(((averageSeverity * 8.5) + (averageCoping * 5.0)).toFixed(1));

  // Total Household Income
  const totalHouseholdIncome = Number(infIncome || 0) + Number(patIncome || 0) +
    familyMembers.reduce((acc, f) => acc + (Number(f.income) || 0), 0);

  // Evaluate MSW Classification based on Trigger Condition rubric:
  // 1. Indigent: Average Severity >= 3.8 OR Average Coping >= 3.8 OR Total Risk >= 65.0% (or Total Household Income <= ₱14,000 on initial load)
  // 2. Financially Incapacitated (B1): Average Severity >= 2.8 OR Average Coping >= 2.8 OR Total Risk >= 45.0%
  // 3. Financially Incapacitated (B2): Total Risk >= 30.0% (or Total Household Income <= ₱25,000 on initial load)
  // 4. Financially Capacitated (Full Pay): All scores below thresholds above
  let mswClassification = 'Financially Capacitated (Full Pay)';
  let subsidyLevel = 'Full Pay (Non-Charity)';
  let badgeColor = 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]';
  let bannerColor = 'bg-[#F8FAFC] border-[#CBD5E1] text-[#334155]';

  if (averageSeverity >= 3.8 || averageCoping >= 3.8 || totalRisk >= 65.0 || totalHouseholdIncome <= 14000) {
    mswClassification = 'Indigent';
    subsidyLevel = '100% Full Charity Subsidy';
    badgeColor = 'bg-[#E8F5EC] text-[#0B6B3A] border-[#86EFAC]';
    bannerColor = 'bg-[#F0FDF4] border-[#86EFAC] text-[#14532D]';
  } else if (averageSeverity >= 2.8 || averageCoping >= 2.8 || totalRisk >= 45.0) {
    mswClassification = 'Financially Incapacitated (B1)';
    subsidyLevel = 'High Partial Charity Subsidy';
    badgeColor = 'bg-[#EFF6FF] text-[#1D4ED8] border-[#93C5FD]';
    bannerColor = 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]';
  } else if (totalRisk >= 30.0 || totalHouseholdIncome <= 25000) {
    mswClassification = 'Financially Incapacitated (B2)';
    subsidyLevel = 'Moderate Partial Subsidy';
    badgeColor = 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]';
    bannerColor = 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]';
  }

  // STAGE 3: Supporting Documents Checklist State
  const [docStatuses, setDocStatuses] = useState<Record<string, 'Pending' | 'Submitted' | 'Verified' | 'N/A'>>({
    'REFERRAL FORM': 'Pending',
    'SIGNED CERTIFICATE OF INDIGENCY': 'Pending',
    'GOVERNMENT ISSUED ID': 'Pending',
    'MEDICAL CERTIFICATE / QUOTATION': 'Pending',
    'LANDLORD’S CONFIRMATION': 'Pending',
    'ELECTRICITY BILL': 'Pending',
    'WATER BILL': 'Pending',
    'PAY SLIP OF EMPLOYMENT': 'Pending',
  });

  const verifiedDocsCount = Object.values(docStatuses).filter((s) => s === 'Verified' || s === 'Submitted').length;

  // Backend-driven Assessment Workflow, Classification, Documents, and ML State
  const MSW_HDRS = { 'x-user-role': 'msw', 'x-user-id': 'msw_lead' };
  const ADMIN_HDRS = { 'x-user-role': 'admin', 'x-user-id': 'admin_officer_01' };
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<string>('DRAFT');
  const [backendEval, setBackendEval] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  // Stage 3 real documents & authenticity state
  const [patientDocs, setPatientDocs] = useState<any[]>([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [selectedUploadCategory, setSelectedUploadCategory] = useState('SIGNED CERTIFICATE OF INDIGENCY');
  const [inspectDoc, setInspectDoc] = useState<any>(null);
  const [inspectDetails, setInspectDetails] = useState<{ ocr?: any; sig?: any; auth?: any } | null>(null);
  const [manualDecision, setManualDecision] = useState<'ACCEPTED' | 'REJECTED' | 'RESUBMISSION_REQUIRED'>('ACCEPTED');
  const [manualReviewNotes, setManualReviewNotes] = useState('');

  // Stage 4 MSW Recommendation, Institutional Approval & ML state
  const [mswCaseNotes, setMswCaseNotes] = useState('');
  const [discrepancyNotes, setDiscrepancyNotes] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [mlInventory, setMlInventory] = useState<any>(null);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [assessmentHistory, setAssessmentHistory] = useState<any[]>([]);

  const loadPatientDocuments = async (pid: string) => {
    try {
      const docs = await fetchApi(`/documents?patient_id=${encodeURIComponent(pid)}`, { headers: MSW_HDRS });
      if (Array.isArray(docs)) setPatientDocs(docs);
    } catch {
      // ignore initial empty state
    }
  };

  // Restore latest draft & load ML inventory + documents
  useEffect(() => {
    async function initWorkflow() {
      if (!patientIdParam) return;
      loadPatientDocuments(patientIdParam);
      try {
        const mlRes = await fetchApi('/ml/models', { headers: MSW_HDRS });
        setMlInventory(mlRes);
      } catch {
        // ignore
      }
      try {
        const draftRes = await fetchApi(`/assessments/patient/${encodeURIComponent(patientIdParam)}/latest-draft`, {
          headers: MSW_HDRS,
        });
        if (draftRes?.found && draftRes.assessment) {
          const a = draftRes.assessment;
          setAssessmentId(a.id);
          setWorkflowStatus(a.workflow_status || 'DRAFT');
          if (a.encounter_no) setApplicationEncounterNo(a.encounter_no);
          if (a.interview_date) setInterviewDate(a.interview_date);
          if (a.source_of_referral) setSourceOfReferral(a.source_of_referral);
          const s1 = a.stage1_data || {};
          if (s1.patient_first_name) setPatFirstName(s1.patient_first_name);
          if (s1.patient_last_name) setPatLastName(s1.patient_last_name);
          if (s1.patient_income !== undefined) setPatIncome(String(s1.patient_income));
          if (s1.informant_income !== undefined) setInfIncome(String(s1.informant_income));
          if (Array.isArray(s1.family_members)) setFamilyMembers(s1.family_members);
          const s2 = a.stage2_data || {};
          if (Array.isArray(s2.health_factors) && s2.health_factors.length > 0) setHealthFactors(s2.health_factors);
          if (s2.discrimination_severity !== undefined) setDiscrimSeverity(s2.discrimination_severity);
          if (s2.discrimination_coping !== undefined) setDiscrimCoping(s2.discrimination_coping);
          if (s2.safety_severity !== undefined) setSafetySeverity(s2.safety_severity);
          if (s2.safety_coping !== undefined) setSafetyCoping(s2.safety_coping);
          if (s2.roles_severity !== undefined) setRoleSeverity(s2.roles_severity);
          if (s2.roles_coping !== undefined) setRoleCoping(s2.roles_coping);
          if (s2.environment_severity !== undefined) setEnvSeverity(s2.environment_severity);
          if (a.classification_result) setBackendEval(a.classification_result);
          if (Array.isArray(a.history)) setAssessmentHistory(a.history);
          if (a.msw_recommendation?.case_notes) setMswCaseNotes(a.msw_recommendation.case_notes);
          if (a.msw_recommendation?.discrepancy_explanation) setDiscrepancyNotes(a.msw_recommendation.discrepancy_explanation);
        }
      } catch {
        // ignore if no draft yet
      }
    }
    initWorkflow();
  }, [patientIdParam]);

  // Backend-authoritative OFPHIL classification evaluation
  const runBackendClassification = async () => {
    const hs = Math.max(1, familyMembers.length + 1);
    const inc = Math.max(0, totalHouseholdIncome);
    const hSevAvg = healthFactors.reduce((acc, h) => acc + h.severity, 0) / Math.max(1, healthFactors.length);
    const hCopAvg = healthFactors.reduce((acc, h) => acc + h.coping, 0) / Math.max(1, healthFactors.length);
    setIsEvaluating(true);
    setEvalError(null);
    try {
      const res = await fetchApi('/classification/evaluate', {
        method: 'POST',
        headers: MSW_HDRS,
        body: JSON.stringify({
          total_monthly_household_income: inc,
          household_size: hs,
          is_initial_load: false,
          assessment_context: 'live_recalculation',
          factors: {
            health_severity_avg: Number(hSevAvg.toFixed(2)),
            discrimination_severity: discrimSeverity,
            safety_severity: safetySeverity,
            roles_severity: roleSeverity,
            environment_severity: envSeverity,
            health_coping_avg: Number(hCopAvg.toFixed(2)),
            discrimination_coping: discrimCoping,
            safety_coping: safetyCoping,
            roles_coping: roleCoping,
          },
        }),
      });
      setBackendEval(res);
    } catch (err: any) {
      setEvalError(err?.message || 'Unable to compute backend classification.');
    } finally {
      setIsEvaluating(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      runBackendClassification();
    }, 350);
    return () => clearTimeout(t);
  }, [
    totalHouseholdIncome,
    familyMembers.length,
    healthFactors,
    discrimSeverity,
    discrimCoping,
    safetySeverity,
    safetyCoping,
    roleSeverity,
    roleCoping,
    envSeverity,
  ]);

  const buildStagePayload = (stageOverride?: number) => ({
    active_stage: stageOverride ?? activeStage,
    interview_date: interviewDate,
    source_of_referral: sourceOfReferral,
    stage1_data: {
      informant_first_name: infFirstName,
      informant_last_name: infLastName,
      informant_income: Number(infIncome || 0),
      patient_first_name: patFirstName,
      patient_last_name: patLastName,
      patient_age: patAge,
      patient_sex: patSex,
      patient_contact: patContact,
      patient_occupation: patOccupation,
      patient_income: Number(patIncome || 0),
      household_size: Math.max(1, familyMembers.length + 1),
      total_household_income: Math.max(0, totalHouseholdIncome),
      family_members: familyMembers,
      admitting_diagnosis: admittingDiagnosis,
      final_diagnosis: finalDiagnosis,
      treatment_plan: presentTreatmentPlan,
    },
    stage2_data: {
      health_factors: healthFactors,
      discrimination_severity: discrimSeverity,
      discrimination_coping: discrimCoping,
      safety_severity: safetySeverity,
      safety_coping: safetyCoping,
      roles_severity: roleSeverity,
      roles_coping: roleCoping,
      environment_severity: envSeverity,
      average_severity: Number(backendEval?.average_severity ?? averageSeverity),
      average_coping: Number(backendEval?.average_coping ?? averageCoping),
      total_risk: Number(backendEval?.total_risk ?? totalRisk),
    },
    stage3_documents: patientDocs.map((d) => d.id),
  });

  const saveDraftToBackend = async (silent = false): Promise<string | null> => {
    if (Number(infIncome || 0) < 0 || Number(patIncome || 0) < 0) {
      toast.error('Monthly income values cannot be negative.');
      return null;
    }
    const payload = buildStagePayload();
    try {
      if (!assessmentId) {
        const created = await fetchApi('/assessments', {
          method: 'POST',
          headers: MSW_HDRS,
          body: JSON.stringify({
            patient_id: patientIdParam,
            interview_date: interviewDate,
            source_of_referral: sourceOfReferral,
            stage1_data: payload.stage1_data,
            stage2_data: payload.stage2_data,
            stage3_documents: payload.stage3_documents,
          }),
        });
        setAssessmentId(created.id);
        setWorkflowStatus(created.workflow_status);
        setApplicationEncounterNo(created.encounter_no);
        if (Array.isArray(created.history)) setAssessmentHistory(created.history);
        if (!silent) toast.success(`Draft saved (${created.encounter_no})`);
        return created.id;
      } else {
        const updated = await fetchApi(`/assessments/${assessmentId}`, {
          method: 'PATCH',
          headers: MSW_HDRS,
          body: JSON.stringify(payload),
        });
        setWorkflowStatus(updated.workflow_status);
        if (Array.isArray(updated.history)) setAssessmentHistory(updated.history);
        if (!silent) toast.success('Draft progress saved to database.');
        return updated.id;
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save draft.');
      return null;
    }
  };

  const handleUploadSupportingDoc = async (file: File) => {
    setIsUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', selectedUploadCategory);
      formData.append('patient_id', patientIdParam);
      formData.append('patient_name', `${patFirstName} ${patLastName}`.trim() || 'Patient Applicant');
      if (assessmentId) formData.append('assessment_id', assessmentId);

      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers: MSW_HDRS,
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Upload failed');
      }
      const doc = await res.json();
      toast.success(`Uploaded ${doc.filename}. Starting Document Authenticity processing...`);

      await fetchApi(`/documents/${doc.id}/process`, {
        method: 'POST',
        headers: MSW_HDRS,
        body: JSON.stringify({ assessment_id: assessmentId, ocr_engine: 'auto', run_forensics: true, run_signature_detection: true }),
      });

      setTimeout(() => loadPatientDocuments(patientIdParam), 800);
      loadPatientDocuments(patientIdParam);
    } catch (err: any) {
      toast.error(err?.message || 'Document upload failed.');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleInspectDocument = async (doc: any) => {
    setInspectDoc(doc);
    setInspectDetails(null);
    try {
      const [ocr, sig, auth] = await Promise.all([
        fetchApi(`/documents/${doc.id}/ocr-results`, { headers: MSW_HDRS }),
        fetchApi(`/documents/${doc.id}/signature-results`, { headers: MSW_HDRS }),
        fetchApi(`/documents/${doc.id}/authenticity-results`, { headers: MSW_HDRS }),
      ]);
      setInspectDetails({ ocr, sig, auth });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load authenticity details.');
    }
  };

  const handleSubmitManualDocReview = async () => {
    if (!inspectDoc) return;
    if (!manualReviewNotes.trim() || manualReviewNotes.trim().length < 3) {
      toast.error('Please enter review notes before recording decision.');
      return;
    }
    try {
      await fetchApi(`/documents/${inspectDoc.id}/review`, {
        method: 'POST',
        headers: MSW_HDRS,
        body: JSON.stringify({
          decision: manualDecision,
          review_notes: manualReviewNotes,
          reviewer_name: 'Maria Santos, RSW',
        }),
      });
      toast.success(`Manual review (${manualDecision}) recorded.`);
      setManualReviewNotes('');
      setInspectDoc(null);
      loadPatientDocuments(patientIdParam);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record manual review.');
    }
  };

  return (
    <DashboardLayout
      title="Medical Social Work Assessment Tool"
      subtitle="Ophthalmological Foundation of the Philippines — AI-Assisted Patient Intake & Evaluation"
    >
      <div className="w-full pb-12 text-xs">
        {/* Top Control Bar: Back to Queue, Screening Status Badge, Print Assessment, Patient Dossier */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC] font-semibold text-xs transition no-underline shadow-2xs"
            >
              <i className="fa-solid fa-arrow-left text-[11px]" />
              <span>Back to Step 1 Queue</span>
            </Link>

            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] flex items-center gap-1.5">
              <i className="fa-solid fa-layer-group text-[10px]" />
              <span>Status: {workflowStatus.replace(/_/g, ' ')}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC] font-semibold text-xs transition shadow-2xs cursor-pointer"
            >
              <i className="fa-solid fa-print text-xs" />
              <span>Print Assessment</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                if (assessmentId) {
                  try {
                    const hist = await fetchApi(`/assessments/${assessmentId}/history`, { headers: MSW_HDRS });
                    if (Array.isArray(hist?.history)) setAssessmentHistory(hist.history);
                  } catch {
                    // keep existing history
                  }
                }
                setDossierOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC] font-semibold text-xs transition shadow-2xs cursor-pointer"
            >
              <i className="fa-solid fa-folder-open text-xs text-[#0B6B3A]" />
              <span>Patient Dossier</span>
            </button>
          </div>
        </div>

        {/* 4 STAGE PROCESS PROGRESS TABS (Matching User Screenshots) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {/* Stage 1 Tab */}
          <div
            onClick={() => setActiveStage(1)}
            className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between shadow-2xs ${
              activeStage === 1
                ? 'bg-[#0B6B3A] text-white border-[#0B6B3A]'
                : 'bg-white text-[#334155] border-[#E2E8F0] hover:bg-[#FAFBF8]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                  activeStage === 1 ? 'bg-white text-[#0B6B3A]' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}
              >
                1
              </span>
              <div>
                <div className="text-[10px] font-bold uppercase opacity-80">STAGE 1</div>
                <div className="font-bold text-xs">Case Study &amp; Profile</div>
              </div>
            </div>
            <span
              className={`text-[9.5px] px-2 py-0.5 rounded-md font-bold uppercase ${
                activeStage === 1 ? 'bg-white/20 text-white' : 'bg-[#FEF3C7] text-[#92400E]'
              }`}
            >
              Needed
            </span>
          </div>

          {/* Stage 2 Tab */}
          <div
            onClick={() => setActiveStage(2)}
            className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between shadow-2xs ${
              activeStage === 2
                ? 'bg-[#0B6B3A] text-white border-[#0B6B3A]'
                : 'bg-white text-[#334155] border-[#E2E8F0] hover:bg-[#FAFBF8]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                  activeStage === 2 ? 'bg-white text-[#0B6B3A]' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}
              >
                2
              </span>
              <div>
                <div className="text-[10px] font-bold uppercase opacity-80">STAGE 2</div>
                <div className="font-bold text-xs">MSW Assessment</div>
              </div>
            </div>
            <span
              className={`text-[9.5px] px-2 py-0.5 rounded-md font-bold uppercase ${
                activeStage === 2 ? 'bg-white/20 text-white' : 'bg-[#F1F5F9] text-[#64748B]'
              }`}
            >
              Intake Review
            </span>
          </div>

          {/* Stage 3 Tab */}
          <div
            onClick={() => setActiveStage(3)}
            className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between shadow-2xs ${
              activeStage === 3
                ? 'bg-[#0B6B3A] text-white border-[#0B6B3A]'
                : 'bg-white text-[#334155] border-[#E2E8F0] hover:bg-[#FAFBF8]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                  activeStage === 3 ? 'bg-white text-[#0B6B3A]' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}
              >
                3
              </span>
              <div>
                <div className="text-[10px] font-bold uppercase opacity-80">STAGE 3</div>
                <div className="font-bold text-xs">Supporting Documents</div>
              </div>
            </div>
            <span
              className={`text-[9.5px] px-2 py-0.5 rounded-md font-bold uppercase ${
                activeStage === 3 ? 'bg-white/20 text-white' : 'bg-[#FEF3C7] text-[#92400E]'
              }`}
            >
              Ready
            </span>
          </div>

          {/* Stage 4 Tab */}
          <div
            onClick={() => setActiveStage(4)}
            className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between shadow-2xs ${
              activeStage === 4
                ? 'bg-[#0B6B3A] text-white border-[#0B6B3A]'
                : 'bg-white text-[#334155] border-[#E2E8F0] hover:bg-[#FAFBF8]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                  activeStage === 4 ? 'bg-white text-[#0B6B3A]' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}
              >
                4
              </span>
              <div>
                <div className="text-[10px] font-bold uppercase opacity-80">STAGE 4</div>
                <div className="font-bold text-xs">Eligibility Grant Tier</div>
              </div>
            </div>
            <span className="text-[9.5px] px-2 py-0.5 rounded-md font-bold uppercase bg-[#F1F5F9] text-[#64748B]">
              <i className="fa-solid fa-lock text-[9px] mr-1" />
              Locked Draft
            </span>
          </div>
        </div>

        {/* ========================================================
            MASTER TOOL CONTAINER CARD
           ======================================================== */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-6">
          {/* OFPHIL Tool Header Banner (Matching All Screenshots) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#EEF2EF]">
            <div className="flex items-center gap-3.5">
              <img
                src="/icons/ophil-logo.png"
                alt="OFPHIL Official Seal"
                width={48}
                height={48}
                className="w-12 h-12 object-contain shrink-0"
              />
              <div>
                <div className="text-[11px] font-semibold text-[#0B6B3A] tracking-wider uppercase">
                  OPHTHALMOLOGICAL FOUNDATION OF THE PHILIPPINES, INC.
                </div>
                <h1 className="font-['Outfit'] text-[22px] font-bold text-[#10241A] tracking-tight m-0">
                  MEDICAL SOCIAL WORK ASSESSMENT TOOL
                </h1>
                <div className="text-[11.5px] text-[#5A7466] mt-0.5">
                  Clinical Intake, Socioeconomic Rubric Scoring &amp; Subsidy Eligibility Determination
                </div>
              </div>
            </div>

            {/* Application Encounter Badge */}
            <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-right shrink-0">
              <div className="text-[10px] font-bold uppercase text-[#64748B]">APPLICATION ENCOUNTER NO.</div>
              <div className="font-mono font-bold text-sm text-[#0B6B3A]">{applicationEncounterNo}</div>
              <div className="text-[10.5px] text-[#D97706] font-semibold mt-0.5">
                Patient ID: <strong>Pending Intake</strong>
              </div>
            </div>
          </div>

          {/* ========================================================
              STAGE 1: CASE STUDY & PROFILE (Images 1 & 2)
             ======================================================== */}
          {activeStage === 1 && (
            <div className="space-y-6">
              {/* Notice Banner */}
              <div className="bg-[#F0FDF4] border border-[#86EFAC] rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-[#14532D]">
                <i className="fa-solid fa-circle-check text-[#16A34A] text-sm mt-0.5 shrink-0" />
                <div>
                  <strong>Step 1: General Intake Sheet Verification</strong>
                  <div className="text-[11.5px] text-[#166534] mt-0.5 leading-relaxed">
                    Review the information provided by the patient. Social worker can fill up or update any missing details before proceeding to scoring.
                  </div>
                </div>
              </div>

              {/* SECTION I: IDENTIFYING INFORMATION */}
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-[#EEF2EF]">
                  <span className="font-bold text-xs text-[#0B6B3A] flex items-center gap-1.5 uppercase tracking-wide">
                    <i className="fa-solid fa-id-card text-[11px]" />
                    <span>I. IDENTIFYING INFORMATION</span>
                  </span>
                  <span className="text-[11px] text-[#94A3B8]">Image 1 Standard Intake</span>
                </div>

                {/* 1. INFORMANT / REPRESENTATIVE */}
                <div className="space-y-3.5 p-4 rounded-xl border border-[#E2E8F0] bg-[#FAFBF8]/50">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#0B6B3A]">
                    1. INFORMANT / REPRESENTATIVE
                  </div>

                  {/* Name Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">LAST NAME *</label>
                      <input
                        type="text"
                        placeholder="Enter last name"
                        value={infLastName}
                        onChange={(e) => setInfLastName(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">FIRST NAME *</label>
                      <input
                        type="text"
                        placeholder="Enter first name"
                        value={infFirstName}
                        onChange={(e) => setInfFirstName(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">MIDDLE NAME</label>
                      <input
                        type="text"
                        placeholder="Enter middle name"
                        value={infMiddleName}
                        onChange={(e) => setInfMiddleName(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">EXT. / SUFFIX</label>
                      <select
                        value={infSuffix}
                        onChange={(e) => setInfSuffix(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                      >
                        <option value="None">None</option>
                        <option value="Jr.">Jr.</option>
                        <option value="Sr.">Sr.</option>
                        <option value="III">III</option>
                      </select>
                    </div>
                  </div>

                  {/* Age, DOB, Sex, Religion, Civil Status */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">AGE</label>
                      <input
                        type="number"
                        value={infAge}
                        onChange={(e) => setInfAge(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">DATE OF BIRTH</label>
                      <input
                        type="date"
                        value={infDob}
                        onChange={(e) => setInfDob(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">SEX</label>
                      <select
                        value={infSex}
                        onChange={(e) => setInfSex(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      >
                        <option value="">-- Select Sex --</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">RELIGION</label>
                      <select
                        value={infReligion}
                        onChange={(e) => setInfReligion(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      >
                        <option value="">-- Select Religion --</option>
                        <option value="Roman Catholic">Roman Catholic</option>
                        <option value="Christian">Christian</option>
                        <option value="Iglesia Ni Cristo">Iglesia Ni Cristo</option>
                        <option value="Islam">Islam</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">CIVIL STATUS</label>
                      <select
                        value={infCivilStatus}
                        onChange={(e) => setInfCivilStatus(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      >
                        <option value="">-- Select Civil Status --</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Widowed">Widowed</option>
                        <option value="Separated">Separated</option>
                      </select>
                    </div>
                  </div>

                  {/* Address Grid: House, Barangay, City, Province, Region */}
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">HOUSE / STREET / PUROK</label>
                      <input
                        type="text"
                        placeholder="Enter complete address"
                        value={infAddress}
                        onChange={(e) => setInfAddress(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">BARANGAY</label>
                      <input
                        type="text"
                        placeholder="Enter barangay"
                        value={infBarangay}
                        onChange={(e) => setInfBarangay(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">CITY / MUNICIPALITY</label>
                      <input
                        type="text"
                        placeholder="Select City / Municipality"
                        value={infCity}
                        onChange={(e) => setInfCity(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">PROVINCE / DISTRICT</label>
                      <input
                        type="text"
                        placeholder="Select Province / District"
                        value={infProvince}
                        onChange={(e) => setInfProvince(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">REGION</label>
                      <input
                        type="text"
                        placeholder="Select Region"
                        value={infRegion}
                        onChange={(e) => setInfRegion(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                  </div>

                  {/* Contact Number, Relation, Occupation, Monthly Income */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">CONTACT NUMBER</label>
                      <input
                        type="text"
                        placeholder="Enter contact number"
                        value={infContact}
                        onChange={(e) => setInfContact(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">RELATION TO PATIENT</label>
                      <select
                        value={infRelation}
                        onChange={(e) => setInfRelation(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      >
                        <option value="">-- Select Relation to Patient --</option>
                        <option value="Self">Self</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Child">Child</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Relative">Relative</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">OCCUPATION</label>
                      <input
                        type="text"
                        placeholder="Enter occupation"
                        value={infOccupation}
                        onChange={(e) => setInfOccupation(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">MONTHLY INCOME (₱)</label>
                      <input
                        type="number"
                        value={infIncome}
                        onChange={(e) => setInfIncome(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                  </div>

                  {/* Radio: Highest Educational Attainment */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1.5">
                      HIGHEST EDUCATIONAL ATTAINMENT
                    </label>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      {['No Formal Education', 'Elementary', 'High School', 'Vocational / Tech-Voc', 'College', 'Post-graduate'].map(
                        (lvl) => (
                          <label key={lvl} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="inf_education"
                              checked={infEducation === lvl}
                              onChange={() => setInfEducation(lvl)}
                              className="accent-[#0B6B3A]"
                            />
                            <span>{lvl}</span>
                          </label>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. PATIENT INFORMATION */}
                <div className="space-y-3.5 p-4 rounded-xl border border-[#E2E8F0] bg-[#FAFBF8]/50">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#0B6B3A]">
                    2. PATIENT INFORMATION
                  </div>

                  {/* Name Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">LAST NAME *</label>
                      <input
                        type="text"
                        placeholder="Enter last name"
                        value={patLastName}
                        onChange={(e) => setPatLastName(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">FIRST NAME *</label>
                      <input
                        type="text"
                        placeholder="Enter first name"
                        value={patFirstName}
                        onChange={(e) => setPatFirstName(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">MIDDLE NAME</label>
                      <input
                        type="text"
                        placeholder="Enter middle name"
                        value={patMiddleName}
                        onChange={(e) => setPatMiddleName(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">EXT. / SUFFIX</label>
                      <select
                        value={patSuffix}
                        onChange={(e) => setPatSuffix(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                      >
                        <option value="None">None</option>
                        <option value="Jr.">Jr.</option>
                        <option value="Sr.">Sr.</option>
                        <option value="III">III</option>
                      </select>
                    </div>
                  </div>

                  {/* Age, DOB, Sex, Religion, Civil Status */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">AGE *</label>
                      <input
                        type="number"
                        value={patAge}
                        onChange={(e) => setPatAge(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">DATE OF BIRTH</label>
                      <input
                        type="date"
                        value={patDob}
                        onChange={(e) => setPatDob(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">SEX *</label>
                      <select
                        value={patSex}
                        onChange={(e) => setPatSex(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      >
                        <option value="">-- Select Sex --</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">RELIGION</label>
                      <select
                        value={patReligion}
                        onChange={(e) => setPatReligion(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      >
                        <option value="">-- Select Religion --</option>
                        <option value="Roman Catholic">Roman Catholic</option>
                        <option value="Christian">Christian</option>
                        <option value="Iglesia Ni Cristo">Iglesia Ni Cristo</option>
                        <option value="Islam">Islam</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">CIVIL STATUS</label>
                      <select
                        value={patCivilStatus}
                        onChange={(e) => setPatCivilStatus(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      >
                        <option value="">-- Select Civil Status --</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Widowed">Widowed</option>
                        <option value="Separated">Separated</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION II: PATIENT INFORMATION — SECTORAL MEMBERSHIP & NATURE OF ASSISTANCE (Image 2) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Sectoral Membership */}
                <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-3">
                  <div className="font-bold text-[11px] uppercase tracking-wider text-[#0B6B3A] pb-2 border-b border-[#EEF2EF]">
                    SECTORAL MEMBERSHIP
                  </div>

                  <div className="space-y-2 text-xs">
                    {[
                      { key: 'artisanalFisherfolk', label: 'Artisanal Fisherfolk' },
                      { key: 'seniorCitizens', label: 'Senior Citizens' },
                      { key: 'urbanPoor', label: 'Urban Poor' },
                      { key: 'victimsOfDisasters', label: 'Victims of Disasters and Calamities' },
                      { key: 'farmersLandless', label: 'Farmers and Landless Workers' },
                      { key: 'informalSector', label: 'Workers in the Informal Sector' },
                      { key: 'pwd', label: 'Person With Disability (PWD)' },
                      { key: 'indigenousPeoples', label: 'Indigenous Peoples (IPs)' },
                      { key: 'formalLaborMigrant', label: 'Formal Labor and Migrant Workers' },
                    ].map((sec) => (
                      <label key={sec.key} className="flex items-center gap-2.5 p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#FAFBF8] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(sectoral as any)[sec.key]}
                          onChange={(e) => setSectoral({ ...sectoral, [sec.key]: e.target.checked })}
                          className="accent-[#0B6B3A] w-4 h-4 rounded"
                        />
                        <span className="text-[#334155]">{sec.label}</span>
                      </label>
                    ))}

                    <div className="pt-2">
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                        Others: Specify...
                      </label>
                      <input
                        type="text"
                        placeholder="Specify other sectoral affiliation"
                        value={sectoralOthers}
                        onChange={(e) => setSectoralOthers(e.target.value)}
                        className="w-full h-8 px-3 border border-[#CBD5E1] rounded-lg text-xs"
                      />
                    </div>

                    <div className="pt-2">
                      <label className="block text-[10.5px] font-bold text-[#64748B] mb-1">
                        Explicit Disability Status (Fairness-Audit Field)
                      </label>
                      <select
                        value={disabilityStatus}
                        onChange={(e) => setDisabilityStatus(e.target.value)}
                        className="w-full h-8 px-2.5 border border-[#CBD5E1] rounded-lg text-[11px] text-[#334155]"
                      >
                        <option value="UNKNOWN / Unverified Status">UNKNOWN / Unverified Status</option>
                        <option value="NON-PWD">NON-PWD</option>
                        <option value="PWD Verified">PWD Verified</option>
                      </select>
                      <span className="text-[10px] text-[#94A3B8] block mt-0.5">
                        Note: Unchecking sectoral PWD does not automatically imply Non-PWD. Retain UNKNOWN if unverified.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Nature of Assistance Requested */}
                <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-3">
                  <div className="font-bold text-[11px] uppercase tracking-wider text-[#0B6B3A] pb-2 border-b border-[#EEF2EF]">
                    NATURE OF ASSISTANCE REQUESTED
                  </div>

                  <div className="space-y-2 text-xs">
                    <label className="flex items-center gap-2.5 p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#FAFBF8] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assistanceReq.laboratory}
                        onChange={(e) => setAssistanceReq({ ...assistanceReq, laboratory: e.target.checked })}
                        className="accent-[#0B6B3A] w-4 h-4 rounded"
                      />
                      <span>Laboratory</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#FAFBF8] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assistanceReq.consultation}
                        onChange={(e) => setAssistanceReq({ ...assistanceReq, consultation: e.target.checked })}
                        className="accent-[#0B6B3A] w-4 h-4 rounded"
                      />
                      <span>Consultation (AOI)</span>
                    </label>

                    {/* Financial Assistance Requirement with nested checkboxes */}
                    <div className="p-3 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4]/60 space-y-2.5">
                      <label className="flex items-center gap-2.5 cursor-pointer font-bold text-[#14532D]">
                        <input
                          type="checkbox"
                          checked={assistanceReq.financialAssistance}
                          onChange={(e) =>
                            setAssistanceReq({ ...assistanceReq, financialAssistance: e.target.checked })
                          }
                          className="accent-[#0B6B3A] w-4 h-4 rounded"
                        />
                        <span>Financial Assistance Requirement</span>
                      </label>

                      <div className="pl-6 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer text-[#166534]">
                          <input
                            type="checkbox"
                            checked={assistanceReq.medicalCertificate}
                            onChange={(e) =>
                              setAssistanceReq({ ...assistanceReq, medicalCertificate: e.target.checked })
                            }
                            className="accent-[#0B6B3A] w-4 h-4 rounded"
                          />
                          <span>Medical Certificate</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-[#166534]">
                          <input
                            type="checkbox"
                            checked={assistanceReq.quotation}
                            onChange={(e) =>
                              setAssistanceReq({ ...assistanceReq, quotation: e.target.checked })
                            }
                            className="accent-[#0B6B3A] w-4 h-4 rounded"
                          />
                          <span>Quotation</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAMILY COMPOSITION (Image 2 Bottom) */}
              <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#EEF2EF]">
                  <span className="font-bold text-xs text-[#0B6B3A] flex items-center gap-1.5 uppercase tracking-wide">
                    <i className="fa-solid fa-people-roof text-sm" />
                    <span>FAMILY COMPOSITION</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddFamilyRow}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-[#0B6B3A] bg-[#E8F5EC] text-[#0B6B3A] font-bold text-[11px] hover:bg-[#D5E2D9] transition cursor-pointer"
                  >
                    <i className="fa-solid fa-plus text-[10px]" />
                    <span>Add Row</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#FAFBF8] text-[#64748B] uppercase text-[10px] tracking-wider border-b border-[#EEF2EF]">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">NAME *</th>
                        <th className="py-2 px-3">RELATIONSHIP</th>
                        <th className="py-2 px-3">AGE</th>
                        <th className="py-2 px-3">CIVIL STATUS</th>
                        <th className="py-2 px-3">EDUCATIONAL ATTAINMENT</th>
                        <th className="py-2 px-3">OCCUPATION</th>
                        <th className="py-2 px-3">MONTHLY INCOME (₱)</th>
                        <th className="py-2 px-3 text-center">ACT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEF2EF]">
                      {familyMembers.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-4 text-center text-[#94A3B8]">
                            Family Members: 0 &bull; Total Household Monthly Income: <strong>₱0.00</strong>
                          </td>
                        </tr>
                      ) : (
                        familyMembers.map((fam, idx) => (
                          <tr key={fam.id} className="hover:bg-[#FAFBF8]">
                            <td className="py-2 px-3 text-[#64748B] font-mono">{idx + 1}</td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                placeholder="Full Name"
                                value={fam.name}
                                onChange={(e) => {
                                  const updated = [...familyMembers];
                                  updated[idx].name = e.target.value;
                                  setFamilyMembers(updated);
                                }}
                                className="w-full h-8 px-2 border border-[#CBD5E1] rounded text-xs"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={fam.relationship}
                                onChange={(e) => {
                                  const updated = [...familyMembers];
                                  updated[idx].relationship = e.target.value;
                                  setFamilyMembers(updated);
                                }}
                                className="w-full h-8 px-2 border border-[#CBD5E1] rounded text-xs"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                value={fam.age}
                                onChange={(e) => {
                                  const updated = [...familyMembers];
                                  updated[idx].age = e.target.value;
                                  setFamilyMembers(updated);
                                }}
                                className="w-16 h-8 px-2 border border-[#CBD5E1] rounded text-xs"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={fam.civilStatus}
                                onChange={(e) => {
                                  const updated = [...familyMembers];
                                  updated[idx].civilStatus = e.target.value;
                                  setFamilyMembers(updated);
                                }}
                                className="h-8 px-2 border border-[#CBD5E1] rounded text-xs"
                              >
                                <option value="Single">Single</option>
                                <option value="Married">Married</option>
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={fam.education}
                                onChange={(e) => {
                                  const updated = [...familyMembers];
                                  updated[idx].education = e.target.value;
                                  setFamilyMembers(updated);
                                }}
                                className="w-full h-8 px-2 border border-[#CBD5E1] rounded text-xs"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={fam.occupation}
                                onChange={(e) => {
                                  const updated = [...familyMembers];
                                  updated[idx].occupation = e.target.value;
                                  setFamilyMembers(updated);
                                }}
                                className="w-full h-8 px-2 border border-[#CBD5E1] rounded text-xs"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                value={fam.income}
                                onChange={(e) => {
                                  const updated = [...familyMembers];
                                  updated[idx].income = e.target.value;
                                  setFamilyMembers(updated);
                                }}
                                className="w-24 h-8 px-2 border border-[#CBD5E1] rounded text-xs"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveFamilyRow(fam.id)}
                                className="text-rose-600 hover:text-rose-800 text-xs cursor-pointer border-0 bg-transparent"
                              >
                                <i className="fa-solid fa-trash-can" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              STAGE 2: MSW ASSESSMENT & CLINICAL DATA (Image 3)
             ======================================================== */}
          {activeStage === 2 && (
            <div className="space-y-6">
              {/* Interview Meta Bar */}
              <div className="p-3 bg-[#FAFBF8] border border-[#E2E8F0] rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-[#64748B] uppercase">MSW NUMBER *</label>
                  <input
                    type="text"
                    value={mswNumber}
                    readOnly
                    className="w-full h-8 px-2.5 font-mono font-bold text-[#0B6B3A] bg-white border border-[#CBD5E1] rounded"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#64748B] uppercase">DATE OF INTERVIEW *</label>
                  <input
                    type="text"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#64748B] uppercase">TIME STARTED / ENDED</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={timeStarted}
                      onChange={(e) => setTimeStarted(e.target.value)}
                      className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded text-[11px]"
                    />
                    <input
                      type="text"
                      value={timeEnded}
                      onChange={(e) => setTimeEnded(e.target.value)}
                      className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded text-[11px]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#64748B] uppercase">SOURCE OF REFERRAL</label>
                  <input
                    type="text"
                    value={sourceOfReferral}
                    onChange={(e) => setSourceOfReferral(e.target.value)}
                    className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded font-semibold text-[#10241A]"
                  />
                </div>
              </div>

              {/* IV. MEDICAL DATA */}
              <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#EEF2EF]">
                  <span className="font-bold text-xs text-[#0B6B3A] flex items-center gap-1.5 uppercase tracking-wide">
                    <i className="fa-solid fa-stethoscope text-sm" />
                    <span>IV. MEDICAL DATA</span>
                  </span>
                  <span className="text-[11px] text-[#94A3B8]">Image 2 Header</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1">ADMITTING DIAGNOSIS</label>
                    <input
                      type="text"
                      value={admittingDiagnosis}
                      onChange={(e) => setAdmittingDiagnosis(e.target.value)}
                      className="w-full h-10 px-3 border border-[#CBD5E1] rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1">FINAL DIAGNOSIS</label>
                    <input
                      type="text"
                      value={finalDiagnosis}
                      onChange={(e) => setFinalDiagnosis(e.target.value)}
                      className="w-full h-10 px-3 border border-[#CBD5E1] rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                      DURATION OF PROBLEMS / SYMPTOMS
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2 years progressive blurring of vision"
                      value={durationProblems}
                      onChange={(e) => setDurationProblems(e.target.value)}
                      className="w-full h-10 px-3 border border-[#CBD5E1] rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                      PREVIOUS TREATMENT / DURATION
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Eyedrops prescribed by local clinic"
                      value={previousTreatment}
                      onChange={(e) => setPreviousTreatment(e.target.value)}
                      className="w-full h-10 px-3 border border-[#CBD5E1] rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                      PRESENT TREATMENT PLAN
                    </label>
                    <input
                      type="text"
                      value={presentTreatmentPlan}
                      onChange={(e) => setPresentTreatmentPlan(e.target.value)}
                      className="w-full h-10 px-3 border border-[#CBD5E1] rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                      HEALTH ACCESSIBILITY PROBLEM
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. High cost of surgical consumables and lack of local facility"
                      value={healthAccessibilityProblem}
                      onChange={(e) => setHealthAccessibilityProblem(e.target.value)}
                      className="w-full h-10 px-3 border border-[#CBD5E1] rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* LIVE DOH-PIE COMPOSITE SCORING & MSW CLASSIFICATION DASHBOARD */}
              <div className="p-4 rounded-xl border border-[#0B6B3A]/30 bg-[#F0FDF4] space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#BBF7D0]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#0B6B3A] text-white flex items-center justify-center text-sm font-bold shadow-xs">
                      <i className="fa-solid fa-chart-line" />
                    </div>
                    <div>
                      <h4 className="font-['Outfit'] font-bold text-sm text-[#14532D] m-0">
                        Live DOH-PIE Clinical Scoring &amp; Decision Advisory
                      </h4>
                      <p className="text-[11px] text-[#166534] m-0">
                        Evaluated from live rubric factors and household income thresholds
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#14532D]">MSW Classification:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeColor} shadow-2xs`}>
                      {mswClassification}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#0B6B3A] text-white shadow-2xs">
                      {subsidyLevel}
                    </span>
                  </div>
                </div>

                {/* 4 Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-white border border-[#CBD5E1] rounded-xl shadow-2xs">
                    <div className="text-[10px] font-bold text-[#64748B] uppercase">Average Severity</div>
                    <div className="text-xl font-extrabold text-[#0B6B3A] my-0.5">{averageSeverity.toFixed(2)}</div>
                    <div className="text-[10px] text-[#94A3B8]">Threshold &ge; 3.8 / 2.8</div>
                  </div>

                  <div className="p-3 bg-white border border-[#CBD5E1] rounded-xl shadow-2xs">
                    <div className="text-[10px] font-bold text-[#64748B] uppercase">Average Coping</div>
                    <div className="text-xl font-extrabold text-[#0284C7] my-0.5">{averageCoping.toFixed(2)}</div>
                    <div className="text-[10px] text-[#94A3B8]">Threshold &ge; 3.8 / 2.8</div>
                  </div>

                  <div className="p-3 bg-white border border-[#CBD5E1] rounded-xl shadow-2xs">
                    <div className="text-[10px] font-bold text-[#64748B] uppercase">Total Risk Score</div>
                    <div className="text-xl font-extrabold text-[#0F766E] my-0.5">{totalRisk.toFixed(1)}%</div>
                    <div className="text-[10px] text-[#94A3B8]">(Sev &times; 8.5) + (Cop &times; 5)</div>
                  </div>

                  <div className="p-3 bg-white border border-[#CBD5E1] rounded-xl shadow-2xs">
                    <div className="text-[10px] font-bold text-[#64748B] uppercase">Total Household Income</div>
                    <div className="text-xl font-extrabold text-[#10241A] my-0.5">₱{totalHouseholdIncome.toLocaleString()}</div>
                    <div className="text-[10px] text-[#94A3B8]">Initial Load: &le; ₱14k / &le; ₱25k</div>
                  </div>
                </div>

                {/* Official Trigger Condition Reference Table Banner */}
                <div className="bg-white border border-[#CBD5E1] rounded-xl p-3 text-xs overflow-x-auto">
                  <div className="font-bold text-[11px] uppercase tracking-wide text-[#0B6B3A] mb-2 flex items-center gap-1.5">
                    <i className="fa-solid fa-table-list" />
                    <span>Official OFPHIL MSW Classification Rubric &amp; Trigger Conditions</span>
                  </div>
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-[#FAFBF8] border-b border-[#E2E8F0] text-[#64748B]">
                        <th className="py-1.5 px-2.5">MSW Classification</th>
                        <th className="py-1.5 px-2.5">Trigger Condition (Live Rubric &amp; Initial Load)</th>
                        <th className="py-1.5 px-2.5">Subsidy Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEF2EF]">
                      <tr className={mswClassification === 'Indigent' ? 'bg-[#F0FDF4] font-bold text-[#14532D]' : ''}>
                        <td className="py-1.5 px-2.5">Indigent</td>
                        <td className="py-1.5 px-2.5 font-mono text-[10.5px]">
                          Average Severity &ge; 3.8 <strong className="text-[#0B6B3A]">OR</strong> Average Coping &ge; 3.8 <strong className="text-[#0B6B3A]">OR</strong> Total Risk &ge; 65.0% (or Total Household Income &le; ₱14,000 on initial load)
                        </td>
                        <td className="py-1.5 px-2.5">100% Full Charity Subsidy</td>
                      </tr>
                      <tr className={mswClassification === 'Financially Incapacitated (B1)' ? 'bg-[#EFF6FF] font-bold text-[#1E40AF]' : ''}>
                        <td className="py-1.5 px-2.5">Financially Incapacitated (B1)</td>
                        <td className="py-1.5 px-2.5 font-mono text-[10.5px]">
                          Average Severity &ge; 2.8 <strong className="text-[#0B6B3A]">OR</strong> Average Coping &ge; 2.8 <strong className="text-[#0B6B3A]">OR</strong> Total Risk &ge; 45.0%
                        </td>
                        <td className="py-1.5 px-2.5">High Partial Charity Subsidy</td>
                      </tr>
                      <tr className={mswClassification === 'Financially Incapacitated (B2)' ? 'bg-[#FFFBEB] font-bold text-[#92400E]' : ''}>
                        <td className="py-1.5 px-2.5">Financially Incapacitated (B2)</td>
                        <td className="py-1.5 px-2.5 font-mono text-[10.5px]">
                          Total Risk &ge; 30.0% (or Total Household Income &le; ₱25,000 on initial load)
                        </td>
                        <td className="py-1.5 px-2.5">Moderate Partial Subsidy</td>
                      </tr>
                      <tr className={mswClassification === 'Financially Capacitated (Full Pay)' ? 'bg-[#F8FAFC] font-bold text-[#334155]' : ''}>
                        <td className="py-1.5 px-2.5">Financially Capacitated (Full Pay)</td>
                        <td className="py-1.5 px-2.5 font-mono text-[10.5px]">All scores below the thresholds above</td>
                        <td className="py-1.5 px-2.5">Full Pay (Non-Charity)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* V. HEALTH (PHYSICAL & MENTAL HEALTH SERVICES / ACCESS) */}
              <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#EEF2EF]">
                  <span className="font-bold text-xs text-[#0B6B3A] flex items-center gap-1.5 uppercase tracking-wide">
                    <i className="fa-solid fa-heart-pulse text-sm" />
                    <span>V. HEALTH (PHYSICAL &amp; MENTAL HEALTH SERVICES / ACCESS)</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase text-[#0B6B3A] bg-[#E8F5EC] px-2 py-0.5 rounded">
                    CLINICAL ASSESSMENT
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#FAFBF8] text-[#64748B] uppercase text-[10px] tracking-wider border-b border-[#EEF2EF]">
                      <tr>
                        <th className="py-2.5 px-3">HEALTH SERVICE / ACCESSIBILITY FACTOR</th>
                        <th className="py-2.5 px-3 w-28">SEVERITY (1-6)</th>
                        <th className="py-2.5 px-3 w-28">COPING (1-6)</th>
                        <th className="py-2.5 px-3">MSW CLINICAL OBSERVATIONS &amp; SPECIFIC DETAILS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEF2EF]">
                      {healthFactors.map((hf, i) => (
                        <tr key={i} className="hover:bg-[#FAFBF8]">
                          <td className="py-3 px-3 font-medium text-[#1E293B]">{hf.factor}</td>
                          <td className="py-3 px-3">
                            <select
                              value={hf.severity}
                              onChange={(e) => {
                                const updated = [...healthFactors];
                                updated[i].severity = Number(e.target.value);
                                setHealthFactors(updated);
                              }}
                              className="w-full h-8 px-2 border border-[#CBD5E1] rounded text-xs bg-white font-bold text-[#0B6B3A]"
                            >
                              {[1, 2, 3, 4, 5, 6].map((num) => (
                                <option key={num} value={num}>
                                  {num} - {num <= 2 ? 'Low' : num <= 4 ? 'Moderate' : 'Severe'}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-3">
                            <select
                              value={hf.coping}
                              onChange={(e) => {
                                const updated = [...healthFactors];
                                updated[i].coping = Number(e.target.value);
                                setHealthFactors(updated);
                              }}
                              className="w-full h-8 px-2 border border-[#CBD5E1] rounded text-xs bg-white font-bold text-[#0284C7]"
                            >
                              {[1, 2, 3, 4, 5, 6].map((num) => (
                                <option key={num} value={num}>
                                  {num} - {num <= 2 ? 'Adequate' : num <= 4 ? 'Inadequate' : 'No Coping'}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={hf.obs}
                              onChange={(e) => {
                                const updated = [...healthFactors];
                                updated[i].obs = e.target.value;
                                setHealthFactors(updated);
                              }}
                              className="w-full h-8 px-2.5 border border-[#CBD5E1] rounded text-xs"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* VI to IX SUBTOPIC ADJUSTERS */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-white border border-[#E2E8F0] rounded-xl text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                    VI. Discrimination Burden
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={discrimSeverity}
                      onChange={(e) => setDiscrimSeverity(Number(e.target.value))}
                      className="w-full h-8 px-2 border border-[#CBD5E1] rounded text-xs font-bold text-[#0B6B3A]"
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>Sev: {n}</option>
                      ))}
                    </select>
                    <select
                      value={discrimCoping}
                      onChange={(e) => setDiscrimCoping(Number(e.target.value))}
                      className="w-full h-8 px-2 border border-[#CBD5E1] rounded text-xs font-bold text-[#0284C7]"
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>Cop: {n}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                    VII. Safety / Hazards
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={safetySeverity}
                      onChange={(e) => setSafetySeverity(Number(e.target.value))}
                      className="w-full h-8 px-2 border border-[#CBD5E1] rounded text-xs font-bold text-[#0B6B3A]"
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>Sev: {n}</option>
                      ))}
                    </select>
                    <select
                      value={safetyCoping}
                      onChange={(e) => setSafetyCoping(Number(e.target.value))}
                      className="w-full h-8 px-2 border border-[#CBD5E1] rounded text-xs font-bold text-[#0284C7]"
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>Cop: {n}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                    VIII. Social Roles
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={roleSeverity}
                      onChange={(e) => setRoleSeverity(Number(e.target.value))}
                      className="w-full h-8 px-2 border border-[#CBD5E1] rounded text-xs font-bold text-[#0B6B3A]"
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>Sev: {n}</option>
                      ))}
                    </select>
                    <select
                      value={roleCoping}
                      onChange={(e) => setRoleCoping(Number(e.target.value))}
                      className="w-full h-8 px-2 border border-[#CBD5E1] rounded text-xs font-bold text-[#0284C7]"
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>Cop: {n}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                    IX. Environment Basic Needs
                  </label>
                  <select
                    value={envSeverity}
                    onChange={(e) => setEnvSeverity(Number(e.target.value))}
                    className="w-full h-8 px-2 border border-[#CBD5E1] rounded text-xs font-bold text-[#0B6B3A]"
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>Sev: {n}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              STAGE 3: SUPPORTING DOCUMENTS (Image 4)
             ======================================================== */}
          {activeStage === 3 && (
            <div className="space-y-6">
              {/* Notice Banner */}
              <div className="bg-[#F0FDF4] border border-[#86EFAC] rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5 text-[#14532D]">
                  <i className="fa-solid fa-file-shield text-[#16A34A] text-base mt-0.5 shrink-0" />
                  <div>
                    <strong>Stage 3: Evidential Supporting Documents &amp; Intake Cross-Check Scanner</strong>
                    <div className="text-[11.5px] text-[#166534] mt-0.5 leading-relaxed">
                      Scan or upload patient documents (Barangay Indigency, Quotation, Utility Bills) directly for New Patient Applicant (M26-11-00001). Real-time OCR cross-checks extracted details against Stage 1 General Intake &amp; Monthly Expenses.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveStage(4)}
                  className="px-3.5 py-2 rounded-xl bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-xs font-semibold text-[#334155] shrink-0 transition flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-lock text-[10px]" />
                  <span>Proceed to Stage 4 &rarr;</span>
                </button>
              </div>

              {/* REQUIREMENTS CHECKLIST STRIP */}
              <div className="bg-[#0B6B3A] text-white rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-clipboard-check text-base" />
                  <div>
                    <div className="font-bold text-xs">REQUIREMENTS CHECKLIST</div>
                    <div className="text-[10px] opacity-80">Official OFPHIL Patient Assistance Verification Slip</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white font-mono">
                    PATIENT: NEW PATIENT APPLICANT
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-white text-[#0B6B3A]">
                    {verifiedDocsCount} / 8 VERIFIED
                  </span>
                </div>
              </div>

              {/* Grid of 8 Required Documents (Image 4) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { id: '1. REFERRAL FORM', sub: 'Hospital, Doctor, LGU or Clinic Referral Letter' },
                  { id: '2. SIGNED CERTIFICATE OF INDIGENCY', sub: 'From City Hall / MSWDO / Barangay' },
                  { id: '3. GOVERNMENT ISSUED ID', sub: 'PhilSys National ID, Senior Citizen, UMID, Driver’s License, Voter’s' },
                  { id: '4. MEDICAL CERTIFICATE / QUOTATION', sub: 'Certificate of Other Physician / Prescription / Receipt of Expenses' },
                  { id: '5. LANDLORD’S CONFIRMATION', sub: 'Lease agreement or certified non-tenancy (if renting)' },
                  { id: '6. ELECTRICITY BILL', sub: 'Recent Meralco or provincial cooperative power bill' },
                  { id: '7. WATER BILL', sub: 'Recent Manila Water / Maynilad / Local Water District bill' },
                  { id: '8. PAY SLIP OF EMPLOYMENT', sub: 'Latest payslip, Certificate of Employment & Compensation (or N/A if informal/unemployed)' },
                ].map((doc) => (
                  <div key={doc.id} className="p-3.5 rounded-xl border border-[#CBD5E1] bg-white space-y-2">
                    <div className="font-bold text-[11px] text-[#1E293B] leading-snug">{doc.id}</div>
                    <div className="text-[10.5px] text-[#64748B] line-clamp-2 leading-relaxed">{doc.sub}</div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#EEF2EF]">
                      <select
                        value={docStatuses[doc.id] || 'Pending'}
                        onChange={(e) =>
                          setDocStatuses({
                            ...docStatuses,
                            [doc.id]: e.target.value as any,
                          })
                        }
                        className="h-7 px-2 border border-[#CBD5E1] rounded text-[10.5px] bg-white font-medium focus:outline-none focus:border-[#0B6B3A]"
                      >
                        <option value="Pending">Pending ▼</option>
                        <option value="Submitted">Submitted</option>
                        <option value="Verified">Verified</option>
                        <option value="N/A">N/A</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => toast.info(`Camera Scanner opened for ${doc.id}`)}
                        className="w-7 h-7 rounded border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center cursor-pointer transition"
                        title="Scan Document with Camera"
                      >
                        <i className="fa-solid fa-camera text-xs" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Checklist Action Buttons */}
              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-[#64748B] flex items-center gap-1.5 text-[11.5px]">
                  <i className="fa-solid fa-circle-check text-[#0B6B3A]" />
                  Checkboxes automatically sync with attached documents below. Changes auto-save instantly.
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allSubmitted: Record<string, 'Submitted'> = {};
                      Object.keys(docStatuses).forEach((k) => (allSubmitted[k] = 'Submitted'));
                      setDocStatuses(allSubmitted as any);
                      toast.success('Marked all documents as Submitted');
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-semibold hover:bg-[#FAFBF8]"
                  >
                    Mark All Submitted
                  </button>
                  <button
                    type="button"
                    onClick={() => saveDraftToBackend(false)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#0B6B3A] text-white text-xs font-bold hover:bg-[#064826]"
                  >
                    <i className="fa-solid fa-floppy-disk mr-1" /> Save Checklist
                  </button>
                </div>
              </div>

              {/* REAL DOCUMENT AUTHENTICITY API UPLOAD & VERIFICATION QUEUE */}
              <div className="p-4 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-xs text-[#10241A]">
                      Document Authenticity API — Secure Upload, OCR &amp; Forensics
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      Originals are stored immutably with SHA-256 verification. Automated checks are indicators only and never auto-reject applicants.
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedUploadCategory}
                      onChange={(e) => setSelectedUploadCategory(e.target.value)}
                      className="h-8 px-2.5 border border-[#CBD5E1] rounded-lg text-xs bg-white font-medium"
                    >
                      <option value="REFERRAL FORM">1. Referral Form</option>
                      <option value="SIGNED CERTIFICATE OF INDIGENCY">2. Certificate of Indigency</option>
                      <option value="GOVERNMENT ISSUED ID">3. Government Issued ID</option>
                      <option value="MEDICAL CERTIFICATE / QUOTATION">4. Medical Certificate / Quotation</option>
                      <option value="LANDLORD’S CONFIRMATION">5. Landlord’s Confirmation</option>
                      <option value="ELECTRICITY BILL">6. Electricity Bill</option>
                      <option value="WATER BILL">7. Water Bill</option>
                      <option value="PAY SLIP OF EMPLOYMENT">8. Pay Slip / Employment Cert</option>
                    </select>

                    <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white text-xs font-bold cursor-pointer transition">
                      <i className={`fa-solid ${isUploadingDoc ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'}`} />
                      <span>{isUploadingDoc ? 'Uploading...' : 'Upload & Scan Document'}</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.tiff"
                        className="hidden"
                        disabled={isUploadingDoc}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadSupportingDoc(f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>

                {patientDocs.length === 0 ? (
                  <div className="p-6 text-center bg-white rounded-xl border border-dashed border-[#CBD5E1] text-[#64748B] text-xs">
                    No uploaded documents yet for Patient <span className="font-mono font-bold">{patientIdParam}</span>. Upload a PDF, PNG, JPG, or TIFF credential above.
                  </div>
                ) : (
                  <div className="overflow-x-auto bg-white rounded-xl border border-[#E2E8F0]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#F1F5F9] text-[#475569] text-[10.5px] uppercase">
                          <th className="py-2.5 px-3">Document &amp; Category</th>
                          <th className="py-2.5 px-3">Processing</th>
                          <th className="py-2.5 px-3">Signature Indicator</th>
                          <th className="py-2.5 px-3">Authenticity</th>
                          <th className="py-2.5 px-3">Manual Review</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EEF2EF]">
                        {patientDocs.map((d) => (
                          <tr key={d.id} className="hover:bg-[#FAFBF8]">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-[#10241A]">{d.filename}</div>
                              <div className="text-[10.5px] text-[#64748B]">{d.document_type}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#1D4ED8]">
                                {d.processing_state?.processing_status || (d.ocr_processed ? 'COMPLETED' : 'NOT_CHECKED')}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F1F5F9] text-[#334155]">
                                {d.signature_status || 'NOT_CHECKED'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFFBEB] text-[#92400E]">
                                {d.authenticity_result?.overall_status || d.verification_status || 'UNVERIFIABLE'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {d.manual_review ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8F5EC] text-[#0B6B3A]">
                                  {d.manual_review.review_decision}
                                </span>
                              ) : (
                                <span className="text-[10.5px] text-[#94A3B8]">Pending MSW Review</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleInspectDocument(d)}
                                className="px-2.5 py-1 rounded-lg border border-[#0B6B3A] text-[#0B6B3A] hover:bg-[#E8F5EC] text-[11px] font-semibold cursor-pointer"
                              >
                                Inspect &amp; Review
                              </button>
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

          {/* ========================================================
              STAGE 4: ELIGIBILITY GRANT TIER
             ======================================================== */}
          {activeStage === 4 && (
            <div className="space-y-6">
              {/* Dual Classification Header Banner */}
              <div className={`p-6 rounded-2xl border ${bannerColor} text-center space-y-4 shadow-sm`}>
                <div className="w-14 h-14 rounded-full bg-white text-[#0B6B3A] flex items-center justify-center text-2xl mx-auto font-bold shadow-xs">
                  <i className="fa-solid fa-award" />
                </div>
                <div>
                  <h3 className="font-['Outfit'] text-xl font-bold text-[#10241A] m-0">
                    OFPHIL Dual-Rubric Eligibility &amp; Grant Tier Summary
                  </h3>
                  <p className="text-xs text-[#5A7466] max-w-2xl mx-auto mt-1 mb-0 leading-relaxed">
                    Computed deterministically by the OFPHIL Classification API (Rubric v{backendEval?.rubric_version || '1.0'}).
                    Financial Income Classification and MSW Scoring Classification are evaluated independently; final decisions remain with authorized institutional personnel.
                  </p>
                </div>

                {isEvaluating && (
                  <div className="text-xs font-semibold text-[#0B6B3A]">
                    <i className="fa-solid fa-circle-notch fa-spin mr-1.5" /> Recalculating via Backend Classification API...
                  </div>
                )}
                {evalError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">{evalError}</div>
                )}

                {/* Dual Classification Badges */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left pt-2">
                  <div className="p-4 rounded-xl bg-white border border-[#CBD5E1] space-y-1.5">
                    <div className="text-[10px] font-bold uppercase text-[#64748B]">A. OFPHIL Financial Income Classification</div>
                    <div className="text-base font-bold text-[#10241A]">
                      {backendEval?.financial_classification?.classification_label || mswClassification}
                    </div>
                    <div className="text-xs text-[#0B6B3A] font-semibold">
                      Monthly Per Capita Income: ₱{Number(backendEval?.monthly_per_capita_income ?? (totalHouseholdIncome / Math.max(1, familyMembers.length + 1))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-[#475569]">
                      {backendEval?.financial_classification?.explanation || 'Calculated using household income divided by household size.'}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-[#CBD5E1] space-y-1.5">
                    <div className="text-[10px] font-bold uppercase text-[#64748B]">B. OFPHIL MSW Scoring &amp; Subsidy Classification</div>
                    <div className="text-base font-bold text-[#10241A]">
                      {backendEval?.msw_classification?.classification_label || mswClassification}
                    </div>
                    <div className="text-xs text-[#0B6B3A] font-semibold">
                      Proposed Subsidy: {backendEval?.subsidy_recommendation || subsidyLevel}
                    </div>
                    <div className="text-[11px] text-[#475569]">
                      {backendEval?.msw_classification?.explanation || 'Calculated using Severity, Coping Capacity, and Total Risk.'}
                    </div>
                  </div>
                </div>

                {/* Discrepancy Alert */}
                {backendEval?.discrepancy_detected && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-left text-xs flex items-start gap-2.5">
                    <i className="fa-solid fa-triangle-exclamation text-amber-600 text-base mt-0.5 shrink-0" />
                    <div>
                      <strong>Classification Discrepancy Flagged for MSW Review:</strong>{' '}
                      {backendEval.discrepancy_details}
                    </div>
                  </div>
                )}

                <div className="max-w-2xl mx-auto pt-4 border-t border-[#CBD5E1]/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-white/80 rounded-xl border border-[#CBD5E1]">
                    <div className="text-[10px] text-[#64748B] font-bold">AVG SEVERITY</div>
                    <div className="text-sm font-black text-[#0B6B3A] mt-0.5">
                      {Number(backendEval?.average_severity ?? averageSeverity).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-2.5 bg-white/80 rounded-xl border border-[#CBD5E1]">
                    <div className="text-[10px] text-[#64748B] font-bold">AVG COPING</div>
                    <div className="text-sm font-black text-[#0284C7] mt-0.5">
                      {Number(backendEval?.average_coping ?? averageCoping).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-2.5 bg-white/80 rounded-xl border border-[#CBD5E1]">
                    <div className="text-[10px] text-[#64748B] font-bold">TOTAL RISK</div>
                    <div className="text-sm font-black text-[#0F766E] mt-0.5">
                      {Number(backendEval?.total_risk ?? totalRisk).toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-2.5 bg-white/80 rounded-xl border border-[#CBD5E1]">
                    <div className="text-[10px] text-[#64748B] font-bold">TOTAL INCOME</div>
                    <div className="text-sm font-black text-[#10241A] mt-0.5">₱{totalHouseholdIncome.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Triggered Conditions & Document Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-2.5">
                  <div className="font-bold text-xs text-[#10241A]">Triggered Classification Conditions (All Preserved)</div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {(backendEval?.triggered_conditions || []).length === 0 ? (
                      <div className="text-[11px] text-[#64748B]">Click &ldquo;Refresh Classification&rdquo; or adjust Stage 2 scores to view triggers.</div>
                    ) : (
                      (backendEval.triggered_conditions as any[]).map((t, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] flex items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-[#0B6B3A]">{t.tier}</span>: {t.rule}
                          </div>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 bg-white rounded border border-[#CBD5E1]">
                            {t.actual_value}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-2.5">
                  <div className="font-bold text-xs text-[#10241A]">Document Verification &amp; ML Readiness Summary</div>
                  <div className="text-[11px] text-[#475569] space-y-1">
                    <div>
                      <strong>Uploaded Credentials:</strong> {patientDocs.length} file(s) &bull;{' '}
                      <strong>Manually Reviewed:</strong> {patientDocs.filter((d) => d.manual_review).length}
                    </div>
                    <div>
                      <strong>Checklist Verified:</strong> {verifiedDocsCount} / 8 items
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-[11px] space-y-1">
                    <div className="font-bold text-[#334155]">Explainable ML Status (Supplementary Only)</div>
                    <div className="text-[#64748B]">
                      {mlInventory?.production_4tier_enabled
                        ? 'Validated 4-tier ML model active.'
                        : 'Gated (Awaiting 4-tier clinical calibration). Pretrained EBM & CatBoost binary models verified in backend; deterministic OFPHIL rules remain authoritative.'}
                    </div>
                  </div>
                </div>
              </div>

              {/* MSW Recommendation & Authorized Institutional Approval */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-[#CBD5E1] bg-white space-y-3">
                  <div className="font-bold text-xs text-[#0B6B3A] uppercase">1. MSW Professional Recommendation</div>
                  <textarea
                    rows={3}
                    value={mswCaseNotes}
                    onChange={(e) => setMswCaseNotes(e.target.value)}
                    placeholder="Enter professional MSW assessment notes and justification..."
                    className="w-full p-2.5 border border-[#CBD5E1] rounded-lg text-xs"
                  />
                  {backendEval?.discrepancy_detected && (
                    <input
                      type="text"
                      value={discrepancyNotes}
                      onChange={(e) => setDiscrepancyNotes(e.target.value)}
                      placeholder="Explain discrepancy between Financial and MSW classifications..."
                      className="w-full h-9 px-2.5 border border-amber-300 rounded-lg text-xs bg-amber-50/40"
                    />
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      const id = assessmentId || (await saveDraftToBackend(true));
                      if (!id) return;
                      if (!mswCaseNotes.trim() || mswCaseNotes.trim().length < 3) {
                        toast.error('Please enter MSW case notes before submitting recommendation.');
                        return;
                      }
                      try {
                        await fetchApi(`/assessments/${id}/submit`, {
                          method: 'POST',
                          headers: MSW_HDRS,
                          body: JSON.stringify({ is_initial_load: false, assessment_context: 'live_recalculation' }),
                        });
                        const recTier = backendEval?.msw_classification?.classification_label || mswClassification;
                        const recSub = recTier.includes('Indigent') ? 100 : recTier.includes('B1') ? 80 : recTier.includes('B2') ? 50 : 0;
                        const updated = await fetchApi(`/assessments/${id}/recommendation`, {
                          method: 'POST',
                          headers: MSW_HDRS,
                          body: JSON.stringify({
                            recommended_tier: recTier,
                            recommended_subsidy_pct: recSub,
                            case_notes: mswCaseNotes,
                            discrepancy_explanation: discrepancyNotes || null,
                            msw_assessor_name: 'Maria Santos, RSW',
                          }),
                        });
                        setWorkflowStatus(updated.workflow_status);
                        toast.success('MSW Recommendation submitted for Institutional Approval!');
                      } catch (err: any) {
                        toast.error(err?.message || 'Failed to submit MSW recommendation.');
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white text-xs font-bold cursor-pointer"
                  >
                    Submit MSW Recommendation
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-[#CBD5E1] bg-white space-y-3">
                  <div className="font-bold text-xs text-[#1E293B] uppercase">2. Authorized Institutional Approval</div>
                  <div className="text-[11px] text-[#64748B]">
                    Current Workflow Status: <strong className="text-[#0B6B3A]">{workflowStatus}</strong>
                  </div>
                  <textarea
                    rows={3}
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Authorized Institutional Officer decision notes..."
                    className="w-full p-2.5 border border-[#CBD5E1] rounded-lg text-xs"
                  />
                  <div className="flex flex-wrap gap-2">
                    {(['APPROVED', 'RETURNED_FOR_REVISION', 'REJECTED'] as const).map((dec) => (
                      <button
                        key={dec}
                        type="button"
                        onClick={async () => {
                          if (!assessmentId) {
                            toast.error('Please save and submit MSW recommendation first.');
                            return;
                          }
                          if (!approvalNotes.trim() || approvalNotes.trim().length < 3) {
                            toast.error('Please provide decision notes.');
                            return;
                          }
                          try {
                            const recTier = backendEval?.msw_classification?.classification_label || mswClassification;
                            const pct = dec === 'APPROVED' ? (recTier.includes('Indigent') ? 100 : recTier.includes('B1') ? 80 : recTier.includes('B2') ? 50 : 0) : 0;
                            const updated = await fetchApi(`/assessments/${assessmentId}/approval`, {
                              method: 'POST',
                              headers: ADMIN_HDRS,
                              body: JSON.stringify({
                                decision: dec,
                                approved_subsidy_percentage: pct,
                                decision_notes: approvalNotes,
                                approver_name: 'Institutional Approver',
                              }),
                            });
                            setWorkflowStatus(updated.workflow_status);
                            toast.success(`Institutional decision recorded: ${dec}`);
                          } catch (err: any) {
                            toast.error(err?.message || 'Approval action failed.');
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                          dec === 'APPROVED'
                            ? 'bg-[#0B6B3A] text-white border-[#0B6B3A]'
                            : dec === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {dec.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM FIXED / FLOATING STICKY ACTION BAR (Matching All Screenshots) */}
        <div className="mt-6 bg-white border border-[#D5E2D9] rounded-2xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="font-bold text-xs text-[#10241A]">Step 1 Evaluation Decision:</div>
            <div className="text-[11px] text-[#64748B] mt-0.5">
              Approving unlocks Step 2 for evidential document uploads and final casework evaluation.
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (confirm('Are you sure you want to disapprove Step 1?')) {
                  toast.error('Step 1 Disapproved');
                }
              }}
              className="px-4 py-2.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-xs" />
              <span>Disapprove Step 1</span>
            </button>

            <button
              type="button"
              onClick={() => saveDraftToBackend(false)}
              className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#334155] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <i className="fa-solid fa-floppy-disk text-xs" />
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={async () => {
                if (activeStage === 1 && (!patFirstName.trim() || !patLastName.trim())) {
                  toast.error('Please enter Patient First Name and Last Name before proceeding.');
                  return;
                }
                setIsSubmitting(true);
                try {
                  const savedId = await saveDraftToBackend(true);
                  if (!savedId) {
                    setIsSubmitting(false);
                    return;
                  }
                  if (activeStage >= 2) {
                    const classified = await fetchApi(`/assessments/${savedId}/submit`, {
                      method: 'POST',
                      headers: MSW_HDRS,
                      body: JSON.stringify({ is_initial_load: false, assessment_context: 'live_recalculation' }),
                    });
                    if (classified?.classification_result) setBackendEval(classified.classification_result);
                    if (classified?.workflow_status) setWorkflowStatus(classified.workflow_status);
                  }
                  if (activeStage < 4) {
                    setActiveStage((activeStage + 1) as any);
                    toast.success(`Saved & advanced to Stage ${activeStage + 1}!`);
                  } else {
                    await fetchApi(`/patients/${patientIdParam}/assessments`, {
                      method: 'POST',
                      headers: MSW_HDRS,
                      body: JSON.stringify({
                        patient_id: patientIdParam,
                        encounter_no: applicationEncounterNo,
                        interview_date: interviewDate,
                        socioeconomic_data: {
                          monthly_income: totalHouseholdIncome,
                          household_size: familyMembers.length + 1,
                          dependents: familyMembers.length,
                          housing_type: 'Rented',
                          philhealth_category: 'Indigent',
                        },
                        clinical_evaluation: {
                          diagnosis: finalDiagnosis || admittingDiagnosis || 'Cataract',
                          procedure: presentTreatmentPlan || 'Phacoemulsification with Foldable IOL Implant',
                          notes: mswCaseNotes || 'Comprehensive casework evaluation completed.',
                        },
                        eligibility_grant: {
                          tier_name: backendEval?.msw_classification?.classification_label || mswClassification,
                          subsidy_percentage:
                            (backendEval?.msw_classification?.classification || '').includes('INDIGENT')
                              ? 100
                              : (backendEval?.msw_classification?.classification || '').includes('B1')
                              ? 80
                              : (backendEval?.msw_classification?.classification || '').includes('B2')
                              ? 50
                              : 0,
                        },
                        msw_assessor: 'Maria Santos, RSW',
                      }),
                    });
                    toast.success('Assessment persisted and synchronized!');
                    router.push('/patients?tab=charity');
                  }
                } catch (err: any) {
                  toast.error(err.message || 'Failed to submit assessment to backend.');
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="px-5 py-2.5 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white text-xs font-bold flex items-center gap-2 transition shadow-md cursor-pointer border-0 disabled:opacity-50"
            >
              <i className="fa-solid fa-circle-check text-xs" />
              <span>
                {activeStage === 4
                  ? 'Complete & Finalize Charity Grant'
                  : `Approve Step ${activeStage} & Proceed`}
              </span>
            </button>
          </div>
        </div>

        {/* Human In the Loop Safeguard Callout */}
        <div className="mt-4 text-center text-[11px] text-[#64748B] flex items-center justify-center gap-2">
          <i className="fa-solid fa-circle-info text-[#0B6B3A]" />
          <span>AI-assisted eligibility assessment. Final eligibility decisions remain subject to authorized social worker review.</span>
        </div>
      </div>

      {/* Document Authenticity Inspection & Manual Review Modal */}
      {inspectDoc && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#CBD5E1] max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-xl text-xs">
            <div className="flex items-center justify-between border-b border-[#EEF2EF] pb-3">
              <div>
                <h4 className="font-bold text-sm text-[#10241A] m-0">Document Authenticity &amp; Manual Review</h4>
                <div className="text-[11px] text-[#64748B]">
                  {inspectDoc.filename} &bull; SHA-256: <span className="font-mono">{inspectDoc.sha256_hash?.slice(0, 16) || 'N/A'}...</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectDoc(null)}
                className="px-2.5 py-1 rounded-lg border border-[#CBD5E1] text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>

            {!inspectDetails ? (
              <div className="py-8 text-center text-[#64748B]">Loading OCR, signature, and forensic results...</div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="font-bold text-[#10241A] mb-1">OCR Extraction ({inspectDetails.ocr?.engine_used})</div>
                  <pre className="whitespace-pre-wrap text-[11px] text-[#334155] font-mono max-h-32 overflow-y-auto">
                    {inspectDetails.ocr?.extracted_text || inspectDetails.ocr?.unavailable_reason || 'No text extracted.'}
                  </pre>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="font-bold text-[#10241A]">Signature Presence</div>
                    <div className="font-mono text-[#0B6B3A] font-bold mt-1">{inspectDetails.sig?.signature_status}</div>
                    <div className="text-[10px] text-[#64748B] mt-1">{inspectDetails.sig?.disclaimer}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="font-bold text-[#10241A]">Forensic Indicators</div>
                    <div className="font-mono text-[#92400E] font-bold mt-1">{inspectDetails.auth?.overall_status}</div>
                    <div className="text-[10px] text-[#64748B] mt-1">{inspectDetails.auth?.disclaimer}</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-[#CBD5E1] space-y-2">
                  <div className="font-bold text-[#10241A]">MSW Manual Verification Decision</div>
                  <div className="flex gap-2">
                    {(['ACCEPTED', 'RESUBMISSION_REQUIRED', 'REJECTED'] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setManualDecision(d)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                          manualDecision === d ? 'bg-[#0B6B3A] text-white border-[#0B6B3A]' : 'bg-white text-[#334155] border-[#CBD5E1]'
                        }`}
                      >
                        {d.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    value={manualReviewNotes}
                    onChange={(e) => setManualReviewNotes(e.target.value)}
                    placeholder="Enter manual inspection findings..."
                    className="w-full p-2 border border-[#CBD5E1] rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleSubmitManualDocReview}
                    className="px-4 py-1.5 rounded-lg bg-[#0B6B3A] text-white text-xs font-bold cursor-pointer"
                  >
                    Record Manual Review
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Patient Dossier & Assessment History Modal */}
      {dossierOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#CBD5E1] max-w-xl w-full max-h-[80vh] overflow-y-auto p-6 space-y-4 shadow-xl text-xs">
            <div className="flex items-center justify-between border-b border-[#EEF2EF] pb-3">
              <div>
                <h4 className="font-bold text-sm text-[#10241A] m-0">Patient Dossier &amp; Assessment Audit Trail</h4>
                <div className="text-[11px] text-[#64748B]">
                  {patFirstName} {patLastName} &bull; Encounter: {applicationEncounterNo}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDossierOpen(false)}
                className="px-2.5 py-1 rounded-lg border border-[#CBD5E1] text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div><strong>Diagnosis:</strong> {finalDiagnosis || admittingDiagnosis}</div>
                <div><strong>Treatment Plan:</strong> {presentTreatmentPlan}</div>
                <div><strong>Household Income:</strong> ₱{totalHouseholdIncome.toLocaleString()} ({familyMembers.length + 1} members)</div>
              </div>
              <div className="font-bold text-[#10241A]">Workflow History ({assessmentHistory.length})</div>
              {assessmentHistory.length === 0 ? (
                <div className="text-[#64748B]">No persisted history events yet. Save draft or submit assessment to record history.</div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {assessmentHistory.map((h, i) => (
                    <div key={i} className="p-2 rounded-lg border border-[#E2E8F0] bg-white flex justify-between gap-2">
                      <div>
                        <span className="font-bold text-[#0B6B3A]">{h.event}</span>
                        <span className="text-[#64748B] ml-2">by {h.actor_id} ({h.role})</span>
                      </div>
                      <span className="font-mono text-[10px] text-[#64748B]">{String(h.timestamp).slice(0, 19)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function MSWAssessmentPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="py-20 text-center">
            <i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#0B6B3A] mb-3" />
            <p className="text-xs font-semibold text-[#64748B]">Loading assessment tool...</p>
          </div>
        </DashboardLayout>
      }
    >
      <MSWAssessmentContent />
    </Suspense>
  );
}
