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
              <span>Stage: Step 1: Pending Screening</span>
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
              onClick={() => toast.info('Loading patient medical dossier...')}
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
                    onClick={() => toast.success('Checklist state saved successfully!')}
                    className="px-3.5 py-1.5 rounded-lg bg-[#0B6B3A] text-white text-xs font-bold hover:bg-[#064826]"
                  >
                    <i className="fa-solid fa-floppy-disk mr-1" /> Save Checklist
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              STAGE 4: ELIGIBILITY GRANT TIER
             ======================================================== */}
          {activeStage === 4 && (
            <div className="space-y-6">
              <div className={`p-6 rounded-2xl border ${bannerColor} text-center space-y-4 shadow-sm`}>
                <div className="w-14 h-14 rounded-full bg-white text-[#0B6B3A] flex items-center justify-center text-2xl mx-auto font-bold shadow-xs">
                  <i className="fa-solid fa-award" />
                </div>
                <div>
                  <h3 className="font-['Outfit'] text-xl font-bold text-[#10241A] m-0">
                    Official MSW Eligibility Grant Recommendation
                  </h3>
                  <p className="text-xs text-[#5A7466] max-w-lg mx-auto mt-1 mb-0 leading-relaxed">
                    Evaluated against DOH Administrative Order &amp; OFPHIL Charity Guidelines using composite clinical severity, coping capacity, total risk score, and household income.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold border ${badgeColor} shadow-xs`}>
                    <i className="fa-solid fa-id-card-clip" />
                    <span>Classification: {mswClassification}</span>
                  </div>
                  <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#0B6B3A] text-white text-sm font-bold shadow-xs">
                    <i className="fa-solid fa-hand-holding-heart" />
                    <span>Subsidy Level: {subsidyLevel}</span>
                  </div>
                </div>

                <div className="max-w-xl mx-auto pt-4 border-t border-[#CBD5E1]/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-white/80 rounded-xl border border-[#CBD5E1]">
                    <div className="text-[10px] text-[#64748B] font-bold">AVG SEVERITY</div>
                    <div className="text-sm font-black text-[#0B6B3A] mt-0.5">{averageSeverity.toFixed(2)}</div>
                  </div>
                  <div className="p-2.5 bg-white/80 rounded-xl border border-[#CBD5E1]">
                    <div className="text-[10px] text-[#64748B] font-bold">AVG COPING</div>
                    <div className="text-sm font-black text-[#0284C7] mt-0.5">{averageCoping.toFixed(2)}</div>
                  </div>
                  <div className="p-2.5 bg-white/80 rounded-xl border border-[#CBD5E1]">
                    <div className="text-[10px] text-[#64748B] font-bold">TOTAL RISK</div>
                    <div className="text-sm font-black text-[#0F766E] mt-0.5">{totalRisk.toFixed(1)}%</div>
                  </div>
                  <div className="p-2.5 bg-white/80 rounded-xl border border-[#CBD5E1]">
                    <div className="text-[10px] text-[#64748B] font-bold">TOTAL INCOME</div>
                    <div className="text-sm font-black text-[#10241A] mt-0.5">₱{totalHouseholdIncome.toLocaleString()}</div>
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
              onClick={() => toast.success('Draft assessment saved!')}
              className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#334155] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <i className="fa-solid fa-floppy-disk text-xs" />
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                try {
                  await fetchApi(`/patients/${applicationEncounterNo}/assessments`, {
                    method: 'POST',
                    body: JSON.stringify({
                      patient_id: applicationEncounterNo,
                      encounter_no: `ENC-${applicationEncounterNo}`,
                      interview_date: interviewDate,
                      socioeconomic_data: {
                        monthly_income: totalHouseholdIncome || 12000,
                        household_size: familyMembers.length + 1,
                        dependents: familyMembers.length,
                        housing_type: 'Rented',
                        philhealth_category: 'Indigent'
                      },
                      clinical_evaluation: {
                        diagnosis: finalDiagnosis || admittingDiagnosis || 'Cataract',
                        procedure: presentTreatmentPlan || 'Phacoemulsification with Foldable IOL Implant',
                        notes: 'Comprehensive casework evaluation completed.'
                      },
                      eligibility_grant: {
                        tier_name: mswClassification,
                        subsidy_percentage: subsidyLevel.includes('100%') ? 100 : subsidyLevel.includes('75%') ? 75 : subsidyLevel.includes('50%') ? 50 : 25
                      },
                      msw_assessor: 'Maria Santos, RSW'
                    })
                  });

                  if (activeStage < 4) {
                    setActiveStage((activeStage + 1) as any);
                    toast.success(`Advanced to Stage ${activeStage + 1} and progress saved!`);
                  } else {
                    toast.success('Assessment completed, saved to database, and subsidy grant issued!');
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
