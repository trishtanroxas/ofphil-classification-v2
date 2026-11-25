'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import PsgcCascadingFields from '@/components/PsgcCascadingFields';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';

const EDUCATION_LEVELS = [
  'No Formal Education',
  'Elementary',
  'High School',
  'Vocational / Tech-Voc',
  'College',
  'Post-graduate',
] as const;

function normalizeEducationLevel(raw?: string | null): string {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return 'High School';
  if (s.includes('no formal') || s === 'none') return 'No Formal Education';
  if (s.includes('post') || s.includes('master') || s.includes('doctor')) return 'Post-graduate';
  if (s.includes('voc') || s.includes('tech') || s.includes('tesda')) return 'Vocational / Tech-Voc';
  if (s.includes('college') || s.includes('bachelor') || s.includes('undergrad') || s.includes('university')) return 'College';
  if (s.includes('elem') || s.includes('primary') || s.includes('grade school')) return 'Elementary';
  if (s.includes('high school') || s.includes('secondary') || s.includes('senior high')) return 'High School';
  const exact = EDUCATION_LEVELS.find((l) => l.toLowerCase() === s);
  return exact || 'High School';
}

function normalizeSuffix(raw?: string | null): string {
  const s = String(raw || '').trim();
  if (!s || s.toLowerCase() === 'none' || s.toLowerCase() === 'n/a') return 'None';
  if (/^jr\.?$/i.test(s)) return 'Jr.';
  if (/^sr\.?$/i.test(s)) return 'Sr.';
  return s;
}

function extractIsoDate(val: any): string | null {
  if (!val) return null;
  const str = String(val).trim();
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function MSWAssessmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdParam = searchParams?.get('patient_id')?.trim() || '';
  const assessmentIdParam = searchParams?.get('assessment_id')?.trim() || '';
  const referralIdParam = searchParams?.get('referral_id')?.trim() || '';

  const [activeReferral, setActiveReferral] = useState<any | null>(null);

  const [patientLoadStatus, setPatientLoadStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>(
    patientIdParam ? 'loading' : 'missing'
  );
  const [patientLoadError, setPatientLoadError] = useState<string | null>(null);

  // Stages: 1 = Case Study & Profile, 2 = MSW Assessment, 3 = Supporting Documents, 4 = Eligibility Grant Tier
  const [activeStage, setActiveStage] = useState<1 | 2 | 3 | 4>(1);

  // Common Header & Encounter metadata
  const [applicationEncounterNo, setApplicationEncounterNo] = useState('');
  const [charityCaseNo, setCharityCaseNo] = useState('');
  const [canonicalPatientId, setCanonicalPatientId] = useState(patientIdParam || '');
  const [mswNumber, setMswNumber] = useState('');
  const [interviewDate, setInterviewDate] = useState(new Date().toISOString().slice(0, 10));
  const [timeStarted, setTimeStarted] = useState('09:00 AM');
  const [timeEnded, setTimeEnded] = useState('09:45 AM');
  const [sourceOfReferral, setSourceOfReferral] = useState('EYE CLINIC REFERRAL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic patient loading from database — NEVER falls back to hardcoded/random patients
  useEffect(() => {
    let cancelled = false;
    async function loadPatientDetails() {
      if (!patientIdParam) {
        setPatientLoadStatus('missing');
        setPatientLoadError('No patient selected. Please select a patient from Master Records before launching an assessment.');
        return;
      }
      setPatientLoadStatus('loading');
      setPatientLoadError(null);
      // Reset state so previous patient's data never leaks
      setAssessmentId(null);
      setWorkflowStatus('DRAFT');
      setBackendEval(null);
      setAssessmentHistory([]);
      setMswCaseNotes('');
      setDiscrepancyNotes('');
      setApprovalNotes('');
      setFamilyMembers([]);
      setInfFirstName('');
      setInfMiddleName('');
      setInfLastName('');
      setInfSuffix('None');
      setInfAge('');
      setInfDob('');
      setInfSex('');
      setInfReligion('');
      setInfCivilStatus('');
      setInfAddress('');
      setInfBarangay('');
      setInfCity('');
      setInfProvince('');
      setInfRegion('');
      setInfContact('');
      setInfRelation('');
      setInfOccupation('');
      setInfIncome('0.0');
      setInfEducation('High School');
      setIsInformantPatient(false);
      setPatIncome('0.0');
      setPatSourceOfFundsDetail('');
      setPatSourceOfFundsRate('');
      setPatSourceOfFundsPeriod('per day');
      setSpouseSourceNotApplicable(false);
      setSpouseSourceOfFundsDetail('');
      setSpouseSourceOfFundsRate('');
      setSpouseSourceOfFundsPeriod('per day');
      setGovAssistanceEnrolled('No');
      setGovAssistancePrograms('');
      setRentExpenseAmount('0');
      setRentHousingNote('');
      setWaterBillAmount('0');
      setElectricityBillAmount('0');
      setTransportExpenseAmount('0');
      setTransportExpenseNotes('');
      setOtherMedicalExpenses([]);
      setEyeMaintenanceExpense('0');
      setFirstConsultationDate('');
      setFirstConsultationSource('');
      setApplicationEncounterNo(patientIdParam);

      try {
        const res = await fetchApi(`/patients/${encodeURIComponent(patientIdParam)}`, {
          headers: { 'x-user-role': 'msw', 'x-user-id': 'msw_lead' },
        });
        if (cancelled) return;
        if (!res || !res.patient) {
          setPatientLoadStatus('error');
          setPatientLoadError(`Patient record '${patientIdParam}' could not be found.`);
          return;
        }
        let p = { ...res.patient };
        try {
          const localList = JSON.parse(localStorage.getItem('ofphil_registered_patients') || '[]');
          const matched = Array.isArray(localList)
            ? localList.find((item: any) => String(item.patient_id || '').toUpperCase() === (p.patient_id || patientIdParam).toUpperCase())
            : null;
          if (matched) {
            p = { ...matched, ...p };
          }
        } catch {}

        const pid = p.patient_id || patientIdParam;
        setCanonicalPatientId(pid);
        setCharityCaseNo(p.charity_case_no || '');
        setApplicationEncounterNo(
          (p.encounters && p.encounters.length > 0 ? (p.encounters[0].id || p.encounters[0].encounter_no) : null) ||
          `ENC-${pid}-01`
        );
        setMswNumber(p.charity_case_no || pid);
        setPatFirstName(p.first_name || '');
        setPatMiddleName(p.middle_name || '');
        setPatLastName(p.last_name || '');
        setPatSuffix(normalizeSuffix(p.suffix));
        
        // Age calculation from DOB if age not explicitly provided
        let calcAge = p.age ? String(p.age) : '';
        if (!calcAge && p.birthdate) {
          const birthDate = new Date(p.birthdate);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          if (age >= 0) calcAge = String(age);
        }
        setPatAge(calcAge);
        setPatDob(p.birthdate || '');
        setPatSex(p.sex === 'M' ? 'Male' : p.sex === 'F' ? 'Female' : (p.sex || ''));
        setPatReligion(p.religion || 'Roman Catholic');
        setPatCivilStatus(p.civil_status || 'Single');
        setPatContact(p.contact || '');
        setPatEmail(p.email || '');

        // Pre-fill structured permanent & alternative addresses cleanly without duplicating segments
        const pStreet = p.perm_street || '';
        const pBgy = p.perm_barangay || '';
        const pCity = p.perm_city || p.residence_city || '';
        const pProv = p.perm_province || '';
        const pReg =
          p.perm_region ||
          p.residence_region ||
          (pProv.toLowerCase().includes('ncr') || pProv.toLowerCase().includes('metro manila')
            ? 'National Capital Region (NCR)'
            : '');

        setPatStreet(pStreet);
        setPatBarangay(pBgy);
        setPatCity(pCity);
        setPatProvince(pProv);
        setPatRegion(pReg);

        const fullPermAddr =
          [pStreet, pBgy, pCity, pProv].filter(Boolean).join(', ') || p.address || p.residence_city || '';
        setPatAddress(fullPermAddr);

        const isSameAddr =
          p.same_address !== undefined
            ? Boolean(p.same_address)
            : !Boolean(p.alt_street || p.alt_barangay || p.alt_city || p.alt_province);
        setSameAsPermAddress(isSameAddr);

        const aStreet = isSameAddr ? pStreet : p.alt_street || '';
        const aBgy = isSameAddr ? pBgy : p.alt_barangay || '';
        const aCity = isSameAddr ? pCity : p.alt_city || '';
        const aProv = isSameAddr ? pProv : p.alt_province || '';
        const aReg = isSameAddr
          ? pReg
          : p.alt_region ||
            (aProv.toLowerCase().includes('ncr') || aProv.toLowerCase().includes('metro manila')
              ? 'National Capital Region (NCR)'
              : '');

        setPatAltStreet(aStreet);
        setPatAltBarangay(aBgy);
        setPatAltCity(aCity);
        setPatAltProvince(aProv);
        setPatAltRegion(aReg);

        const fullAltAddr =
          [aStreet, aBgy, aCity, aProv].filter(Boolean).join(', ') || p.alt_address || fullPermAddr;
        setPatAltAddress(fullAltAddr);

        setPatOccupation(p.occupation || '');
        setPatEmploymentStatus(p.employment_status || '');
        const rawInc = p.monthly_income !== undefined ? p.monthly_income : (p.monthly_household_income !== undefined ? p.monthly_household_income : p.income);
        setPatIncome(rawInc !== undefined && rawInc !== null ? String(rawInc) : '0.0');
        setPatEducation(normalizeEducationLevel(p.educational_attainment));
        setPatNumDependents(p.num_dependents !== undefined ? String(p.num_dependents) : '0');

        // Auto-default Spouse N/A if Single or Widowed (can be toggled freely by MSW)
        const civNorm = String(p.civil_status || '').toLowerCase();
        if (civNorm === 'single' || civNorm === 'widowed') {
          setSpouseSourceNotApplicable(true);
        }

        // Pre-fill Patient Source of Funds detail from existing occupation if available
        if (p.occupation) {
          setPatSourceOfFundsDetail(p.occupation);
        }

        // Pre-populate First Consultation in OFPHIL from earliest clinical encounter / appointment date
        const candidateDates: Array<{ date: string; source: string }> = [];
        const allInitialEncs = [
          ...(Array.isArray(res.encounters) ? res.encounters : []),
          ...(Array.isArray(p.encounters) ? p.encounters : []),
        ];
        allInitialEncs.forEach((enc: any) => {
          const d = extractIsoDate(enc?.encounter_date || enc?.application_date || enc?.date || enc?.created_at);
          if (d) candidateDates.push({ date: d, source: `Clinical Encounter (${enc?.id || enc?.encounter_no || d})` });
        });

        try {
          const localAppts = JSON.parse(localStorage.getItem(`ofphil_appointments_${pid}`) || '[]');
          if (Array.isArray(localAppts)) {
            localAppts.forEach((ap: any) => {
              const d = extractIsoDate(ap?.appointment_date || ap?.created_at);
              if (d) candidateDates.push({ date: d, source: `Scheduled Appointment (${ap?.id || d})` });
            });
          }
          const localEncs = JSON.parse(localStorage.getItem(`ofphil_encounters_${pid}`) || '[]');
          if (Array.isArray(localEncs)) {
            localEncs.forEach((enc: any) => {
              const d = extractIsoDate(enc?.encounter_date || enc?.date || enc?.created_at);
              if (d) candidateDates.push({ date: d, source: `Clinical Encounter (${enc?.id || d})` });
            });
          }
        } catch {}

        // Also query Supabase / backend encounter & appointment endpoints non-blockingly
        Promise.allSettled([
          fetchApi(`/patients/${encodeURIComponent(pid)}/encounters`, { headers: { 'x-user-role': 'msw', 'x-user-id': 'msw_lead' } }),
          fetchApi(`/patients/${encodeURIComponent(pid)}/appointments`, { headers: { 'x-user-role': 'msw', 'x-user-id': 'msw_lead' } }),
        ]).then((results) => {
          if (cancelled) return;
          const extraDates = [...candidateDates];
          if (results[0].status === 'fulfilled' && Array.isArray(results[0].value?.encounters)) {
            results[0].value.encounters.forEach((enc: any) => {
              const d = extractIsoDate(enc?.encounter_date || enc?.created_at);
              if (d) extraDates.push({ date: d, source: `Clinical Encounter (${enc?.id || d})` });
            });
          }
          if (results[1].status === 'fulfilled' && Array.isArray(results[1].value?.appointments)) {
            results[1].value.appointments.forEach((ap: any) => {
              const d = extractIsoDate(ap?.appointment_date || ap?.created_at);
              if (d) extraDates.push({ date: d, source: `Appointment (${ap?.id || d})` });
            });
          }
          if (extraDates.length > 0) {
            extraDates.sort((a, b) => a.date.localeCompare(b.date));
            setFirstConsultationDate((prev) => prev || extraDates[0].date);
            setFirstConsultationSource((prev) => prev || extraDates[0].source);
          }
        });

        if (candidateDates.length > 0) {
          candidateDates.sort((a, b) => a.date.localeCompare(b.date));
          setFirstConsultationDate(candidateDates[0].date);
          setFirstConsultationSource(candidateDates[0].source);
        } else {
          const regDate = extractIsoDate(p.registration_date);
          if (regDate) {
            setFirstConsultationDate(regDate);
            setFirstConsultationSource('Patient Registration Record');
          }
        }

        // Sectoral Membership Pre-fill (supports string, array, or object representations)
        const secRaw = p.sectoral_membership;
        const secStr = Array.isArray(secRaw)
          ? secRaw.join(' ').toLowerCase()
          : typeof secRaw === 'object' && secRaw !== null
          ? Object.entries(secRaw)
              .filter(([, v]) => Boolean(v))
              .map(([k]) => k)
              .join(' ')
              .toLowerCase()
          : String(secRaw || '').toLowerCase();
        const occEmpStr = `${p.occupation || ''} ${p.employment_status || ''}`.toLowerCase();
        const isSenior = Number(calcAge) >= 60 || secStr.includes('senior');
        const isPwd = secStr.includes('pwd') || String(p.disability_status || '').toLowerCase().includes('pwd');
        setSectoral({
          artisanalFisherfolk: Boolean(secRaw?.artisanalFisherfolk) || secStr.includes('fisherfolk'),
          seniorCitizens: Boolean(secRaw?.seniorCitizens) || isSenior,
          urbanPoor:
            Boolean(secRaw?.urbanPoor) ||
            secStr.includes('urban poor') ||
            secStr.includes('indigent') ||
            String(p.philhealth_category || '').toLowerCase().includes('indigent'),
          victimsOfDisasters: Boolean(secRaw?.victimsOfDisasters) || secStr.includes('disaster') || secStr.includes('calamity'),
          farmersLandless: Boolean(secRaw?.farmersLandless) || secStr.includes('farmer'),
          informalSector:
            Boolean(secRaw?.informalSector) ||
            secStr.includes('informal') ||
            occEmpStr.includes('informal') ||
            occEmpStr.includes('vendor') ||
            occEmpStr.includes('driver'),
          pwd: Boolean(secRaw?.pwd) || isPwd,
          indigenousPeoples: Boolean(secRaw?.indigenousPeoples) || secStr.includes('indigenous'),
          formalLaborMigrant: Boolean(secRaw?.formalLaborMigrant) || secStr.includes('migrant') || secStr.includes('ofw'),
        });
        if (p.sectoral_others) {
          setSectoralOthers(String(p.sectoral_others));
        }
        if (isPwd) {
          setDisabilityStatus('PWD Verified');
        } else if (p.disability_status) {
          setDisabilityStatus(p.disability_status);
        }

        if (p.diagnosis) {
          setAdmittingDiagnosis(p.diagnosis);
          setFinalDiagnosis(p.diagnosis);
        }
        if (p.recommended_procedure) {
          setPresentTreatmentPlan(p.recommended_procedure);
        }
        setPatientLoadStatus('ready');
      } catch (e: any) {
        if (cancelled) return;
        setPatientLoadStatus('error');
        setPatientLoadError(e?.message || `Unable to load patient '${patientIdParam}'.`);
      }
    }
    loadPatientDetails();
    return () => {
      cancelled = true;
    };
  }, [patientIdParam]);

  // STAGE 1: Informant / Representative State & Patient Sync Lock
  const [isInformantPatient, setIsInformantPatient] = useState(false);
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
  const [infEducation, setInfEducation] = useState('High School');

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
  const [patEmail, setPatEmail] = useState('');
  const [patStreet, setPatStreet] = useState('');
  const [patAddress, setPatAddress] = useState('');
  const [patBarangay, setPatBarangay] = useState('');
  const [patCity, setPatCity] = useState('');
  const [patProvince, setPatProvince] = useState('');
  const [patRegion, setPatRegion] = useState('');
  const [sameAsPermAddress, setSameAsPermAddress] = useState(true);
  const [patAltStreet, setPatAltStreet] = useState('');
  const [patAltBarangay, setPatAltBarangay] = useState('');
  const [patAltCity, setPatAltCity] = useState('');
  const [patAltProvince, setPatAltProvince] = useState('');
  const [patAltRegion, setPatAltRegion] = useState('');
  const [patAltAddress, setPatAltAddress] = useState('');
  const [patNationality, setPatNationality] = useState('Filipino');
  const [patOccupation, setPatOccupation] = useState('');
  const [patEmploymentStatus, setPatEmploymentStatus] = useState('');
  const [patIncome, setPatIncome] = useState('0.0');
  const [patEducation, setPatEducation] = useState('High School');
  const [patNumDependents, setPatNumDependents] = useState('0');

  // Copy Patient profile data into Informant fields and activate lock
  const copyPatientToInformant = (relationLabel: 'Self' | 'Patient' = 'Self') => {
    setIsInformantPatient(true);
    setInfRelation(relationLabel);
    setInfLastName(patLastName);
    setInfFirstName(patFirstName);
    setInfMiddleName(patMiddleName);
    setInfSuffix(patSuffix || 'None');
    setInfAge(patAge);
    setInfDob(patDob);
    setInfSex(patSex);
    setInfReligion(patReligion);
    setInfCivilStatus(patCivilStatus);
    setInfAddress(patStreet || patAddress);
    setInfBarangay(patBarangay);
    setInfCity(patCity);
    setInfProvince(patProvince);
    setInfRegion(patRegion);
    setInfContact(patContact);
    setInfOccupation(patOccupation);
    setInfIncome(patIncome);
    setInfEducation(patEducation);
    setInterviewedPerson('PATIENT');
    setRepresentativeRelationship('Self');
  };

  const handleToggleInformantIsPatient = (checked: boolean) => {
    if (checked) {
      copyPatientToInformant('Self');
    } else {
      setIsInformantPatient(false);
      if (infRelation === 'Self' || infRelation === 'Patient') {
        setInfRelation('');
      }
    }
  };

  const handleInformantRelationChange = (newRel: string) => {
    setInfRelation(newRel);
    const norm = newRel.trim().toLowerCase();
    if (norm === 'self' || norm === 'patient') {
      copyPatientToInformant(newRel === 'Patient' ? 'Patient' : 'Self');
    } else {
      setIsInformantPatient(false);
      if (newRel) {
        setInterviewedPerson('REPRESENTATIVE');
        setRepresentativeRelationship(newRel);
      }
    }
  };

  // STAGE 1 SECTION II: Socio-Economic & Monthly Expenses State (Clinical Intake Sheet)
  const [patSourceOfFundsDetail, setPatSourceOfFundsDetail] = useState('');
  const [patSourceOfFundsRate, setPatSourceOfFundsRate] = useState('');
  const [patSourceOfFundsPeriod, setPatSourceOfFundsPeriod] = useState<'per day' | 'per week' | 'per month' | 'irregular'>('per day');

  const [spouseSourceNotApplicable, setSpouseSourceNotApplicable] = useState(false);
  const [spouseSourceOfFundsDetail, setSpouseSourceOfFundsDetail] = useState('');
  const [spouseSourceOfFundsRate, setSpouseSourceOfFundsRate] = useState('');
  const [spouseSourceOfFundsPeriod, setSpouseSourceOfFundsPeriod] = useState<'per day' | 'per week' | 'per month' | 'irregular'>('per day');

  const [govAssistanceEnrolled, setGovAssistanceEnrolled] = useState<'No' | 'Yes'>('No');
  const [govAssistancePrograms, setGovAssistancePrograms] = useState('');

  const [rentExpenseAmount, setRentExpenseAmount] = useState('0');
  const [rentHousingNote, setRentHousingNote] = useState('');

  const [waterBillAmount, setWaterBillAmount] = useState('0');
  const [electricityBillAmount, setElectricityBillAmount] = useState('0');

  const [transportExpenseAmount, setTransportExpenseAmount] = useState('0');
  const [transportExpenseNotes, setTransportExpenseNotes] = useState('');

  const [otherMedicalExpenses, setOtherMedicalExpenses] = useState<
    Array<{ id: string; condition: string; monthlyCost: string }>
  >([]);

  const [eyeMaintenanceExpense, setEyeMaintenanceExpense] = useState('0');
  const [firstConsultationDate, setFirstConsultationDate] = useState('');
  const [firstConsultationSource, setFirstConsultationSource] = useState('');

  const handleAddOtherMedicalExpense = () => {
    setOtherMedicalExpenses((prev) => [
      ...prev,
      { id: `med-${Date.now()}-${prev.length}`, condition: '', monthlyCost: '0' },
    ]);
  };

  const handleRemoveOtherMedicalExpense = (id: string) => {
    setOtherMedicalExpenses((prev) => prev.filter((item) => item.id !== id));
  };

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

  // Qualitative Rubric Options (No manual raw numbers entered by MSW)
  const SEVERITY_LEVEL_OPTIONS = [
    { value: 'LEVEL_1_MINIMAL', label: 'Minimal / No Significant Impairment (Level 1)' },
    { value: 'LEVEL_2_MILD', label: 'Mild Impairment / Low Barrier (Level 2)' },
    { value: 'LEVEL_3_MODERATE', label: 'Moderate Impairment / Moderate Barrier (Level 3)' },
    { value: 'LEVEL_4_MODERATELY_SEVERE', label: 'Moderately Severe / High Barrier (Level 4)' },
    { value: 'LEVEL_5_SEVERE', label: 'Severe Impairment / Extreme Barrier (Level 5)' },
    { value: 'LEVEL_6_CATASTROPHIC', label: 'Catastrophic / Crisis Level (Level 6)' },
  ];

  const COPING_LEVEL_OPTIONS = [
    { value: 'LEVEL_1_SUPERIOR', label: 'Superior / Fully Adequate Coping (Level 1)' },
    { value: 'LEVEL_2_ADEQUATE', label: 'Adequate Coping / Strong Support (Level 2)' },
    { value: 'LEVEL_3_VULNERABLE', label: 'Vulnerable / Partially Strained Coping (Level 3)' },
    { value: 'LEVEL_4_INADEQUATE', label: 'Inadequate / Heavily Strained Coping (Level 4)' },
    { value: 'LEVEL_5_SEVERE_BREAKDOWN', label: 'Severe Breakdown / Marginal Coping (Level 5)' },
    { value: 'LEVEL_6_CRISIS', label: 'Complete Coping Failure / Crisis State (Level 6)' },
  ];

  // STAGE 2: Structured MSW Interview State
  const [interviewStartTime, setInterviewStartTime] = useState('09:00 AM');
  const [interviewEndTime, setInterviewEndTime] = useState('09:45 AM');
  const [assignedMsw, setAssignedMsw] = useState('Maria Santos, RSW');
  const [interviewedPerson, setInterviewedPerson] = useState<'PATIENT' | 'REPRESENTATIVE'>('PATIENT');
  const [representativeRelationship, setRepresentativeRelationship] = useState('');
  const [interviewMethod, setInterviewMethod] = useState<'FACE_TO_FACE' | 'TELECONSULTATION' | 'HOSPITAL_BEDSIDE' | 'HOME_VISIT'>('FACE_TO_FACE');
  const [interviewStatus, setInterviewStatus] = useState<'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'>('IN_PROGRESS');
  const [consentObtained, setConsentObtained] = useState(true);
  const [consentNotes, setConsentNotes] = useState('Patient/Representative signed social service intake acknowledgment and privacy consent.');
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [isSavingInterview, setIsSavingInterview] = useState(false);

  // Subsection B: Patient and Family Background (Separated Patient Responses & MSW Observations)
  const [livingSituation, setLivingSituation] = useState('Renting a small room in high-density settlement; informal tenancy');
  const [livingSituationObs, setLivingSituationObs] = useState('Crowded living quarters; verified with barangay certificate of residency');
  const [householdComposition, setHouseholdComposition] = useState('4 household members: patient, spouse, and 2 minor school-age children');
  const [householdCompositionObs, setHouseholdCompositionObs] = useState('Two vulnerable minor dependents entirely reliant on parental labor');
  const [familySupport, setFamilySupport] = useState('Spouse provides primary home caregiving, guided mobility, and basic nursing');
  const [familySupportObs, setFamilySupportObs] = useState('Caregiver shows high dedication but experiences substantial emotional strain');
  const [employmentSituation, setEmploymentSituation] = useState('Patient previously worked as daily informal utility driver; now incapacitated by cataract');
  const [employmentObs, setEmploymentObs] = useState('Complete loss of primary family livelihood directly attributable to ocular disability');
  const [incomeSources, setIncomeSources] = useState('Irregular earnings from spouse home laundry and occasional sibling assistance');
  const [incomeSourcesObs, setIncomeSourcesObs] = useState('Combined monthly earnings below poverty threshold; unstable and intermittent');
  const [financialResponsibilities, setFinancialResponsibilities] = useState('Monthly room rental (₱3,500), basic food sustenance, children educational needs');
  const [financialResponsibilitiesObs, setFinancialResponsibilitiesObs] = useState('Zero emergency savings; family accumulating neighborhood sari-sari store debt');

  // Subsection C: Medical and Financial Difficulties
  const [medicalConditionSummary, setMedicalConditionSummary] = useState('Mature cataract with near-total visual acuity loss in operative eye; secondary glare');
  const [medicalConditionObs, setMedicalConditionObs] = useState('Clinical referral confirms urgent surgical necessity to prevent bilateral blindness');
  const [durationProblems, setDurationProblems] = useState('2 years progressive visual deterioration with significant functional impairment');
  const [previousTreatment, setPreviousTreatment] = useState('Over-the-counter lubricant eyedrops; optical consultation with local optometrist');
  const [presentTreatmentPlan, setPresentTreatmentPlan] = useState('Phacoemulsification with Foldable IOL (OS)');
  const [admittingDiagnosis, setAdmittingDiagnosis] = useState('Senile Immature Cataract');
  const [finalDiagnosis, setFinalDiagnosis] = useState('Senile Immature Cataract');
  const [estimatedExpenses, setEstimatedExpenses] = useState('11600');
  const [financialBarriers, setFinancialBarriers] = useState('Inability to afford hospital surgical package, intraocular lens, and post-op medication');
  const [financialBarriersObs, setFinancialBarriersObs] = useState('Out-of-pocket surgical expense represents over 100% of entire monthly family earnings');
  const [healthAccessibilityProblem, setHealthAccessibilityProblem] = useState('Lack of specialized ophthalmic surgical center in local municipal district');
  const [availableHealthcareResources, setAvailableHealthcareResources] = useState('PhilHealth Indigent Member, Barangay Certificate of Indigency, Malasakit Referral');

  // Subsection D: Psychosocial Circumstances
  const [accessibilityConcerns, setAccessibilityConcerns] = useState('Patient cannot safely travel alone; requires two jeepney transfers and companion fare');
  const [accessibilityConcernsObs, setAccessibilityConcernsObs] = useState('Travel barriers pose safety hazards; companion wage loss is a major deterrent');
  const [discriminationExperienced, setDiscriminationExperienced] = useState('Experienced job refusal and societal stigma due to visible white cataract pupillary reflex');
  const [discriminationObs, setDiscriminationObs] = useState('Social isolation and withdrawal observed; loss of social status as productive worker');
  const [safetyHazards, setSafetyHazards] = useState('Multiple indoor stumble incidents; unpaved wet pathways around dwelling');
  const [safetyHazardsObs, setSafetyHazardsObs] = useState('High fall and domestic trauma risk without restoration of bilateral stereoscopic vision');
  const [socialResponsibilities, setSocialResponsibilities] = useState('Traditional role as head of household and family protector now severely impaired');
  const [socialResponsibilitiesObs, setSocialResponsibilitiesObs] = useState('Role reversal causing distress; spouse forced to seek outside daily labor');
  const [supportSystems, setSupportSystems] = useState('Barangay health worker, parish charity fund, and extended family neighbors');
  const [supportSystemsObs, setSupportSystemsObs] = useState('Informal community support present but financial capacity of neighbors is also limited');
  const [basicNeedsLivingConditions, setBasicNeedsLivingConditions] = useState('Shared communal water meter; reliance on subsidized rice ration');
  const [basicNeedsObs, setBasicNeedsObs] = useState('Basic caloric intake maintained with difficulty; vulnerable to inflationary food shocks');
  const [copingCapacityNarrative, setCopingCapacityNarrative] = useState('Patient relies on faith and spouse encouragement, but feels burdened by inactivity');
  const [copingCapacityObs, setCopingCapacityObs] = useState('Psychological resilience present; highly motivated for sight restoration and return to work');

  // Domain V: Health Factors Checklist (DOH-PIE Qualitative Levels & Observations - No Raw Numbers)
  const [healthFactors, setHealthFactors] = useState([
    {
      factor: 'Absence of adequate health services',
      severityLevel: 'LEVEL_4_MODERATELY_SEVERE',
      copingLevel: 'LEVEL_4_INADEQUATE',
      patientReported: 'High surgical fee barrier; nearest specialty tertiary hospital requires substantial out-of-pocket payment.',
      mswObservation: 'Nearest tertiary hospital with phacoemulsification equipment requires inter-city transport.',
    },
    {
      factor: 'Inaccessibility of Health Services',
      severityLevel: 'LEVEL_4_MODERATELY_SEVERE',
      copingLevel: 'LEVEL_4_INADEQUATE',
      patientReported: 'No direct ophthalmic subspecialist in local municipality; requires long travel with escort.',
      mswObservation: 'Public transportation inaccessible for unaccompanied visually impaired patient.',
    },
    {
      factor: 'Absence of support services needed to use health services',
      severityLevel: 'LEVEL_3_MODERATE',
      copingLevel: 'LEVEL_3_VULNERABLE',
      patientReported: 'Limited caregiver capacity; primary earner cannot take leave without wage loss.',
      mswObservation: 'Caregiver wage loss represents substantial portion of weekly household sustenance.',
    },
    {
      factor: 'Absence of adequate Mental Health / Psychosocial Support services',
      severityLevel: 'LEVEL_2_MILD',
      copingLevel: 'LEVEL_2_ADEQUATE',
      patientReported: 'Mild anxiety over deteriorating sight; community social worker supportive.',
      mswObservation: 'Patient emotionally supported by spouse and parish counseling; well-oriented.',
    },
  ]);

  // Domains VI to IX: Qualitative Levels & Observations (No Raw Numbers)
  const [discrimSeverityLevel, setDiscrimSeverityLevel] = useState('LEVEL_3_MODERATE');
  const [discrimCopingLevel, setDiscrimCopingLevel] = useState('LEVEL_3_VULNERABLE');
  const [discrimPatientReported, setDiscrimPatientReported] = useState('Faced hiring reluctance and wage discount due to visual impairment.');
  const [discrimMswObs, setDiscrimMswObs] = useState('Economic marginalization directly linked to progressive cataract blindness.');

  const [safetySeverityLevel, setSafetySeverityLevel] = useState('LEVEL_3_MODERATE');
  const [safetyCopingLevel, setSafetyCopingLevel] = useState('LEVEL_3_VULNERABLE');
  const [safetyPatientReported, setSafetyPatientReported] = useState('Frequent stumbling and disorientation at dusk.');
  const [safetyMswObs, setSafetyMswObs] = useState('Home environment lacks handrails and adequate task lighting.');

  const [roleSeverityLevel, setRoleSeverityLevel] = useState('LEVEL_4_MODERATELY_SEVERE');
  const [roleCopingLevel, setRoleCopingLevel] = useState('LEVEL_4_INADEQUATE');
  const [rolePatientReported, setRolePatientReported] = useState('Unable to work or guide children safely.');
  const [roleMswObs, setRoleMswObs] = useState('Severe breadwinner role strain; spouse forced into informal work.');

  const [envSeverityLevel, setEnvSeverityLevel] = useState('LEVEL_4_MODERATELY_SEVERE');
  const [envPatientReported, setEnvPatientReported] = useState('Congested rental room with communal water facility.');
  const [envMswObs, setEnvMswObs] = useState('Substandard dwelling conditions with high vulnerability to economic shocks.');

  // Backend Live Evaluation State & Assessment ID
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<string>('DRAFT');
  const [backendEval, setBackendEval] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  // Total Household Income (Derived from Stage 1 Informant + Patient + Family Members; prevents double-count when Informant is Patient)
  const totalHouseholdIncome =
    (isInformantPatient ? 0 : Number(infIncome || 0)) +
    Number(patIncome || 0) +
    familyMembers.reduce((acc, f) => acc + (Number(f.income) || 0), 0);

  // Total Monthly Expenses (Derived from Stage 1 Socio-Economic & Monthly Expenses)
  const otherMedicalExpensesSubtotal = otherMedicalExpenses.reduce(
    (sum, item) => sum + Math.max(0, Number(item.monthlyCost || 0)),
    0
  );
  const totalMonthlyExpenses =
    Math.max(0, Number(rentExpenseAmount || 0)) +
    Math.max(0, Number(waterBillAmount || 0)) +
    Math.max(0, Number(electricityBillAmount || 0)) +
    Math.max(0, Number(transportExpenseAmount || 0)) +
    otherMedicalExpensesSubtotal +
    Math.max(0, Number(eyeMaintenanceExpense || 0));

  // Dynamic badge and classification values derived strictly from backend API evaluation result
  const currentMswClass = backendEval?.msw_classification?.classification || (backendEval?.is_complete ? 'FINANCIALLY_CAPACITATED' : 'INCOMPLETE');
  const mswClassification = backendEval?.msw_classification?.classification_label || (backendEval?.is_complete ? 'Financially Capacitated' : 'Assessment Incomplete');
  const subsidyLevel = backendEval?.subsidy_recommendation || (backendEval?.is_complete ? 'Full Pay (0%)' : 'Pending Classification');
  const averageSeverity = Number(backendEval?.average_severity ?? 0);
  const averageCoping = Number(backendEval?.average_coping ?? 0);
  const totalRisk = Number(backendEval?.total_risk ?? 0);
  const badgeColor = currentMswClass === 'INDIGENT'
    ? 'bg-[#E8F5EC] text-[#0B6B3A] border-[#86EFAC]'
    : currentMswClass === 'FINANCIALLY_INCAPACITATED_B1'
    ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#93C5FD]'
    : currentMswClass === 'FINANCIALLY_INCAPACITATED_B2'
    ? 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
    : currentMswClass === 'INCOMPLETE'
    ? 'bg-amber-50 text-amber-800 border-amber-300'
    : 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]';
  const bannerColor = currentMswClass === 'INDIGENT'
    ? 'bg-[#E8F5EC] border-[#86EFAC]'
    : currentMswClass === 'FINANCIALLY_INCAPACITATED_B1'
    ? 'bg-[#EFF6FF] border-[#93C5FD]'
    : currentMswClass === 'FINANCIALLY_INCAPACITATED_B2'
    ? 'bg-[#FFFBEB] border-[#FDE68A]'
    : currentMswClass === 'INCOMPLETE'
    ? 'bg-amber-50 border-amber-300'
    : 'bg-[#F8FAFC] border-[#CBD5E1]';

  // STAGE 3: Supporting Documents Checklist State (4 Required Documents)
  const [docStatuses, setDocStatuses] = useState<Record<string, 'Pending' | 'Submitted' | 'Verified' | 'N/A'>>({
    'SIGNED CERTIFICATE OF INDIGENCY': 'Pending',
    'GOVERNMENT ISSUED ID': 'Pending',
    'ELECTRICITY BILL': 'Pending',
    'WATER BILL': 'Pending',
  });

  const verifiedDocsCount = Object.values(docStatuses).filter((s) => s === 'Verified' || s === 'Submitted').length;

  // Backend-driven Assessment Workflow, Classification, Documents, and ML State
  const MSW_HDRS = { 'x-user-role': 'msw', 'x-user-id': 'msw_lead' };
  const ADMIN_HDRS = { 'x-user-role': 'admin', 'x-user-id': 'admin_officer_01' };
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

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

  // Restore latest draft & load ML inventory + documents + referral details (runs after patient record loads)
  useEffect(() => {
    async function initWorkflow() {
      if (!patientIdParam || patientLoadStatus !== 'ready') return;
      loadPatientDocuments(patientIdParam);

      // Load Referral information if referral_id parameter is present or if patient has referrals
      try {
        let loadedRef: any = null;
        if (referralIdParam) {
          const singleRefRes = await fetchApi(`/referrals/${encodeURIComponent(referralIdParam)}`, { headers: MSW_HDRS });
          if (singleRefRes && singleRefRes.referral) {
            loadedRef = singleRefRes.referral;
          }
        }
        if (!loadedRef) {
          const patientRefRes = await fetchApi(`/patients/${encodeURIComponent(patientIdParam)}/referral`, { headers: MSW_HDRS });
          if (patientRefRes && patientRefRes.referral) {
            loadedRef = patientRefRes.referral;
          }
        }

        if (loadedRef) {
          setActiveReferral(loadedRef);
          if (loadedRef.referring_individual) {
            setSourceOfReferral(`CLINICAL REFERRAL: ${loadedRef.referring_individual}`);
          }
          if (loadedRef.diagnosis) {
            setAdmittingDiagnosis(loadedRef.diagnosis);
            setFinalDiagnosis(loadedRef.diagnosis);
          }
          if (loadedRef.procedure) {
            setPresentTreatmentPlan(loadedRef.procedure);
          }
          if (loadedRef.total) {
            setEstimatedExpenses(String(loadedRef.total));
          }
          if (loadedRef.attending_doctor) {
            setAssignedMsw((prev) => prev || 'Maria Santos, RSW');
          }
        }
      } catch (e) {
        // non-blocking
      }

      try {
        const mlRes = await fetchApi('/ml/models', { headers: MSW_HDRS });
        setMlInventory(mlRes);
      } catch {
        // ignore
      }
      try {
        let a: any = null;
        if (assessmentIdParam) {
          a = await fetchApi(`/assessments/${encodeURIComponent(assessmentIdParam)}`, { headers: MSW_HDRS });
        } else {
          const qUrl = referralIdParam
            ? `/assessments/patient/${encodeURIComponent(patientIdParam)}/latest-draft?referral_id=${encodeURIComponent(referralIdParam)}`
            : `/assessments/patient/${encodeURIComponent(patientIdParam)}/latest-draft`;
          const draftRes = await fetchApi(qUrl, {
            headers: MSW_HDRS,
          });
          if (draftRes?.found && draftRes.assessment) a = draftRes.assessment;
        }
        if (a) {
          setAssessmentId(a.id);
          setWorkflowStatus(a.workflow_status || 'DRAFT');
          if (a.referral_id && !activeReferral) {
            fetchApi(`/referrals/${encodeURIComponent(a.referral_id)}`, { headers: MSW_HDRS })
              .then((res) => { if (res?.referral) setActiveReferral(res.referral); })
              .catch(() => {});
          }
          if (a.encounter_no) {
            // Charity patients use their case number directly without random prefixes or suffixes
            if (patientIdParam?.startsWith('MSW_FA_')) {
              setApplicationEncounterNo(patientIdParam);
            } else {
              setApplicationEncounterNo(a.encounter_no);
            }
          }
          if (a.interview_date) setInterviewDate(a.interview_date);
          if (a.source_of_referral) setSourceOfReferral(a.source_of_referral);
          const s1 = a.stage1_data || {};
          if (s1.informant_is_patient !== undefined) setIsInformantPatient(Boolean(s1.informant_is_patient));
          if (s1.informant_relation) setInfRelation(s1.informant_relation);
          if (s1.informant_first_name) setInfFirstName(s1.informant_first_name);
          if (s1.informant_middle_name) setInfMiddleName(s1.informant_middle_name);
          if (s1.informant_last_name) setInfLastName(s1.informant_last_name);
          if (s1.informant_suffix) setInfSuffix(normalizeSuffix(s1.informant_suffix));
          if (s1.informant_age !== undefined && s1.informant_age !== '') setInfAge(String(s1.informant_age));
          if (s1.informant_dob) setInfDob(s1.informant_dob);
          if (s1.informant_sex) setInfSex(s1.informant_sex);
          if (s1.informant_religion) setInfReligion(s1.informant_religion);
          if (s1.informant_civil_status) setInfCivilStatus(s1.informant_civil_status);
          if (s1.informant_street !== undefined) setInfAddress(s1.informant_street);
          if (s1.informant_barangay) setInfBarangay(s1.informant_barangay);
          if (s1.informant_city) setInfCity(s1.informant_city);
          if (s1.informant_province) setInfProvince(s1.informant_province);
          if (s1.informant_region) setInfRegion(s1.informant_region);
          if (s1.informant_contact) setInfContact(s1.informant_contact);
          if (s1.informant_occupation) setInfOccupation(s1.informant_occupation);
          if (s1.informant_education) setInfEducation(normalizeEducationLevel(s1.informant_education));
          if (s1.informant_income !== undefined) setInfIncome(String(s1.informant_income));

          if (s1.patient_first_name) setPatFirstName(s1.patient_first_name);
          if (s1.patient_middle_name) setPatMiddleName(s1.patient_middle_name);
          if (s1.patient_last_name) setPatLastName(s1.patient_last_name);
          if (s1.patient_suffix) setPatSuffix(normalizeSuffix(s1.patient_suffix));
          if (s1.patient_age !== undefined && s1.patient_age !== '') setPatAge(String(s1.patient_age));
          if (s1.patient_dob) setPatDob(s1.patient_dob);
          if (s1.patient_sex) setPatSex(s1.patient_sex);
          if (s1.patient_religion) setPatReligion(s1.patient_religion);
          if (s1.patient_civil_status) setPatCivilStatus(s1.patient_civil_status);
          if (s1.patient_contact) setPatContact(s1.patient_contact);
          if (s1.patient_email) setPatEmail(s1.patient_email);
          if (s1.patient_occupation) setPatOccupation(s1.patient_occupation);
          if (s1.patient_income !== undefined) setPatIncome(String(s1.patient_income));
          if (s1.patient_street !== undefined) setPatStreet(s1.patient_street);
          if (s1.patient_barangay) setPatBarangay(s1.patient_barangay);
          if (s1.patient_city) setPatCity(s1.patient_city);
          if (s1.patient_province) setPatProvince(s1.patient_province);
          if (s1.patient_region) setPatRegion(s1.patient_region);
          if (s1.patient_permanent_address) setPatAddress(s1.patient_permanent_address);
          if (s1.same_as_permanent_address !== undefined) setSameAsPermAddress(Boolean(s1.same_as_permanent_address));
          if (s1.patient_alt_street !== undefined) setPatAltStreet(s1.patient_alt_street);
          if (s1.patient_alt_barangay) setPatAltBarangay(s1.patient_alt_barangay);
          if (s1.patient_alt_city) setPatAltCity(s1.patient_alt_city);
          if (s1.patient_alt_province) setPatAltProvince(s1.patient_alt_province);
          if (s1.patient_alt_region) setPatAltRegion(s1.patient_alt_region);
          if (s1.patient_alt_address) setPatAltAddress(s1.patient_alt_address);
          if (s1.patient_education) setPatEducation(normalizeEducationLevel(s1.patient_education));
          if (s1.sectoral && typeof s1.sectoral === 'object') setSectoral((prev) => ({ ...prev, ...s1.sectoral }));
          if (s1.sectoral_others !== undefined) setSectoralOthers(s1.sectoral_others);
          if (Array.isArray(s1.family_members)) setFamilyMembers(s1.family_members);

          const se = s1.socio_economic_expenses || {};
          if (se.patient_source_detail !== undefined) setPatSourceOfFundsDetail(se.patient_source_detail);
          if (se.patient_source_rate !== undefined) setPatSourceOfFundsRate(String(se.patient_source_rate));
          if (se.patient_source_period) setPatSourceOfFundsPeriod(se.patient_source_period);
          if (se.spouse_not_applicable !== undefined) setSpouseSourceNotApplicable(Boolean(se.spouse_not_applicable));
          if (se.spouse_source_detail !== undefined) setSpouseSourceOfFundsDetail(se.spouse_source_detail);
          if (se.spouse_source_rate !== undefined) setSpouseSourceOfFundsRate(String(se.spouse_source_rate));
          if (se.spouse_source_period) setSpouseSourceOfFundsPeriod(se.spouse_source_period);
          if (se.gov_assistance_enrolled) setGovAssistanceEnrolled(se.gov_assistance_enrolled);
          if (se.gov_assistance_programs !== undefined) setGovAssistancePrograms(se.gov_assistance_programs);
          if (se.rent_amount !== undefined) setRentExpenseAmount(String(se.rent_amount));
          if (se.rent_note !== undefined) setRentHousingNote(se.rent_note);
          if (se.water_bill !== undefined) setWaterBillAmount(String(se.water_bill));
          if (se.electricity_bill !== undefined) setElectricityBillAmount(String(se.electricity_bill));
          if (se.transportation_amount !== undefined) setTransportExpenseAmount(String(se.transportation_amount));
          if (se.transportation_notes !== undefined) setTransportExpenseNotes(se.transportation_notes);
          if (Array.isArray(se.other_medical_expenses)) setOtherMedicalExpenses(se.other_medical_expenses);
          if (se.eye_maintenance_amount !== undefined) setEyeMaintenanceExpense(String(se.eye_maintenance_amount));
          if (se.first_consultation_date) setFirstConsultationDate(se.first_consultation_date);
          const s2 = a.stage2_data || {};
          if (s2.interview_info) {
            if (s2.interview_info.interview_date) setInterviewDate(s2.interview_info.interview_date);
            if (s2.interview_info.interview_start_time) setInterviewStartTime(s2.interview_info.interview_start_time);
            if (s2.interview_info.interview_end_time) setInterviewEndTime(s2.interview_info.interview_end_time);
            if (s2.interview_info.assigned_msw) setAssignedMsw(s2.interview_info.assigned_msw);
            if (s2.interview_info.interviewed_person) setInterviewedPerson(s2.interview_info.interviewed_person);
            if (s2.interview_info.representative_relationship) setRepresentativeRelationship(s2.interview_info.representative_relationship);
            if (s2.interview_info.interview_method) setInterviewMethod(s2.interview_info.interview_method);
            if (s2.interview_info.interview_status) setInterviewStatus(s2.interview_info.interview_status);
            if (s2.interview_info.consent_obtained !== undefined) setConsentObtained(s2.interview_info.consent_obtained);
            if (s2.interview_info.consent_notes) setConsentNotes(s2.interview_info.consent_notes);
          }
          if (s2.background) {
            if (s2.background.living_situation) setLivingSituation(s2.background.living_situation);
            if (s2.background.living_situation_obs) setLivingSituationObs(s2.background.living_situation_obs);
            if (s2.background.household_composition) setHouseholdComposition(s2.background.household_composition);
            if (s2.background.household_composition_obs) setHouseholdCompositionObs(s2.background.household_composition_obs);
            if (s2.background.family_support) setFamilySupport(s2.background.family_support);
            if (s2.background.family_support_obs) setFamilySupportObs(s2.background.family_support_obs);
            if (s2.background.employment_situation) setEmploymentSituation(s2.background.employment_situation);
            if (s2.background.employment_obs) setEmploymentObs(s2.background.employment_obs);
            if (s2.background.income_sources) setIncomeSources(s2.background.income_sources);
            if (s2.background.income_sources_obs) setIncomeSourcesObs(s2.background.income_sources_obs);
            if (s2.background.financial_responsibilities) setFinancialResponsibilities(s2.background.financial_responsibilities);
            if (s2.background.financial_responsibilities_obs) setFinancialResponsibilitiesObs(s2.background.financial_responsibilities_obs);
          }
          if (s2.medical_difficulties) {
            if (s2.medical_difficulties.medical_condition_summary) setMedicalConditionSummary(s2.medical_difficulties.medical_condition_summary);
            if (s2.medical_difficulties.medical_condition_obs) setMedicalConditionObs(s2.medical_difficulties.medical_condition_obs);
            if (s2.medical_difficulties.problem_duration) setDurationProblems(s2.medical_difficulties.problem_duration);
            if (s2.medical_difficulties.previous_treatments) setPreviousTreatment(s2.medical_difficulties.previous_treatments);
            if (s2.medical_difficulties.recommended_procedure) setPresentTreatmentPlan(s2.medical_difficulties.recommended_procedure);
            if (s2.medical_difficulties.estimated_treatment_expenses) setEstimatedExpenses(String(s2.medical_difficulties.estimated_treatment_expenses));
            if (s2.medical_difficulties.financial_barriers) setFinancialBarriers(s2.medical_difficulties.financial_barriers);
            if (s2.medical_difficulties.financial_barriers_obs) setFinancialBarriersObs(s2.medical_difficulties.financial_barriers_obs);
            if (s2.medical_difficulties.service_accessibility) setHealthAccessibilityProblem(s2.medical_difficulties.service_accessibility);
            if (s2.medical_difficulties.available_healthcare_resources) setAvailableHealthcareResources(s2.medical_difficulties.available_healthcare_resources);
          }
          if (s2.psychosocial) {
            if (s2.psychosocial.accessibility_concerns) setAccessibilityConcerns(s2.psychosocial.accessibility_concerns);
            if (s2.psychosocial.discrimination_experienced) setDiscriminationExperienced(s2.psychosocial.discrimination_experienced);
            if (s2.psychosocial.discrimination_obs) setDiscriminationObs(s2.psychosocial.discrimination_obs);
            if (s2.psychosocial.safety_hazards) setSafetyHazards(s2.psychosocial.safety_hazards);
            if (s2.psychosocial.safety_hazards_obs) setSafetyHazardsObs(s2.psychosocial.safety_hazards_obs);
            if (s2.psychosocial.social_responsibilities) setSocialResponsibilities(s2.psychosocial.social_responsibilities);
            if (s2.psychosocial.social_responsibilities_obs) setSocialResponsibilitiesObs(s2.psychosocial.social_responsibilities_obs);
            if (s2.psychosocial.support_systems) setSupportSystems(s2.psychosocial.support_systems);
            if (s2.psychosocial.support_systems_obs) setSupportSystemsObs(s2.psychosocial.support_systems_obs);
            if (s2.psychosocial.basic_needs_living_conditions) setBasicNeedsLivingConditions(s2.psychosocial.basic_needs_living_conditions);
            if (s2.psychosocial.basic_needs_obs) setBasicNeedsObs(s2.psychosocial.basic_needs_obs);
            if (s2.psychosocial.coping_capacity_narrative) setCopingCapacityNarrative(s2.psychosocial.coping_capacity_narrative);
            if (s2.psychosocial.coping_capacity_obs) setCopingCapacityObs(s2.psychosocial.coping_capacity_obs);
          }
          if (Array.isArray(s2.health_factors) && s2.health_factors.length > 0) {
            setHealthFactors(s2.health_factors.map((hf: any) => ({
              factor: hf.factor,
              severityLevel: hf.severity_level || (hf.severity ? `LEVEL_${hf.severity}_${hf.severity <= 2 ? 'MILD' : hf.severity <= 4 ? 'MODERATE' : 'SEVERE'}` : 'LEVEL_3_MODERATE'),
              copingLevel: hf.coping_level || (hf.coping ? `LEVEL_${hf.coping}_${hf.coping <= 2 ? 'ADEQUATE' : hf.coping <= 4 ? 'INADEQUATE' : 'CRISIS'}` : 'LEVEL_3_VULNERABLE'),
              patientReported: hf.patient_reported || hf.obs || '',
              mswObservation: hf.msw_observation || hf.obs || '',
            })));
          }
          if (s2.discrimination_severity_level) setDiscrimSeverityLevel(s2.discrimination_severity_level);
          if (s2.discrimination_coping_level) setDiscrimCopingLevel(s2.discrimination_coping_level);
          if (s2.safety_severity_level) setSafetySeverityLevel(s2.safety_severity_level);
          if (s2.safety_coping_level) setSafetyCopingLevel(s2.safety_coping_level);
          if (s2.roles_severity_level) setRoleSeverityLevel(s2.roles_severity_level);
          if (s2.roles_coping_level) setRoleCopingLevel(s2.roles_coping_level);
          if (s2.environment_severity_level) setEnvSeverityLevel(s2.environment_severity_level);
          if (s2.discrimination_patient_reported !== undefined) setDiscrimPatientReported(s2.discrimination_patient_reported);
          if (s2.discrimination_msw_observation !== undefined) setDiscrimMswObs(s2.discrimination_msw_observation);
          if (s2.safety_patient_reported !== undefined) setSafetyPatientReported(s2.safety_patient_reported);
          if (s2.safety_msw_observation !== undefined) setSafetyMswObs(s2.safety_msw_observation);
          if (s2.roles_patient_reported !== undefined) setRolePatientReported(s2.roles_patient_reported);
          if (s2.roles_msw_observation !== undefined) setRoleMswObs(s2.roles_msw_observation);
          if (s2.environment_patient_reported !== undefined) setEnvPatientReported(s2.environment_patient_reported);
          if (s2.environment_msw_observation !== undefined) setEnvMswObs(s2.environment_msw_observation);
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
  }, [patientIdParam, assessmentIdParam, patientLoadStatus]);

  // Lock body scroll and dismiss modals on Escape key
  useEffect(() => {
    if (inspectDoc !== null || dossierOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setInspectDoc(null);
          setDossierOpen(false);
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [inspectDoc, dossierOpen]);

  // Backend-authoritative OFPHIL Stage 2 Interview Assessment Evaluation
  const runBackendClassification = async () => {
    const hs = Math.max(1, familyMembers.length + 1);
    const inc = Math.max(0, totalHouseholdIncome);
    setIsEvaluating(true);
    setEvalError(null);
    try {
      const res = await fetchApi('/classification/evaluate-stage2', {
        method: 'POST',
        headers: MSW_HDRS,
        body: JSON.stringify({
          patient_id: patientIdParam,
          total_household_income: inc,
          household_size: hs,
          is_initial_load: true,
          assessment_context: 'live_recalculation',
          interview_info: {
            interview_date: interviewDate,
            interview_start_time: interviewStartTime,
            interview_end_time: interviewEndTime,
            assigned_msw: assignedMsw,
            interviewed_person: interviewedPerson,
            representative_relationship: representativeRelationship,
            interview_method: interviewMethod,
            interview_status: interviewStatus,
            consent_obtained: consentObtained,
            consent_notes: consentNotes,
          },
          background: {
            living_situation: livingSituation,
            living_situation_obs: livingSituationObs,
            household_composition: householdComposition,
            household_composition_obs: householdCompositionObs,
            family_support: familySupport,
            family_support_obs: familySupportObs,
            employment_situation: employmentSituation,
            employment_obs: employmentObs,
            income_sources: incomeSources,
            income_sources_obs: incomeSourcesObs,
            financial_responsibilities: financialResponsibilities,
            financial_responsibilities_obs: financialResponsibilitiesObs,
          },
          medical_difficulties: {
            medical_condition_summary: medicalConditionSummary,
            medical_condition_obs: medicalConditionObs,
            problem_duration: durationProblems,
            previous_treatments: previousTreatment,
            recommended_procedure: presentTreatmentPlan,
            estimated_treatment_expenses: estimatedExpenses ? Number(estimatedExpenses) : 11600,
            financial_barriers: financialBarriers,
            financial_barriers_obs: financialBarriersObs,
            service_accessibility: healthAccessibilityProblem,
            available_healthcare_resources: availableHealthcareResources,
          },
          psychosocial: {
            accessibility_concerns: accessibilityConcerns,
            discrimination_experienced: discriminationExperienced,
            discrimination_obs: discriminationObs,
            safety_hazards: safetyHazards,
            safety_hazards_obs: safetyHazardsObs,
            social_responsibilities: socialResponsibilities,
            social_responsibilities_obs: socialResponsibilitiesObs,
            support_systems: supportSystems,
            support_systems_obs: supportSystemsObs,
            basic_needs_living_conditions: basicNeedsLivingConditions,
            basic_needs_obs: basicNeedsObs,
            coping_capacity_narrative: copingCapacityNarrative,
            coping_capacity_obs: copingCapacityObs,
          },
          health_factors: healthFactors.map((hf) => ({
            factor: hf.factor,
            severity_level: hf.severityLevel,
            coping_level: hf.copingLevel,
            patient_reported: hf.patientReported,
            msw_observation: hf.mswObservation,
          })),
          discrimination_severity_level: discrimSeverityLevel,
          discrimination_coping_level: discrimCopingLevel,
          discrimination_patient_reported: discrimPatientReported,
          discrimination_msw_observation: discrimMswObs,
          safety_severity_level: safetySeverityLevel,
          safety_coping_level: safetyCopingLevel,
          safety_patient_reported: safetyPatientReported,
          safety_msw_observation: safetyMswObs,
          roles_severity_level: roleSeverityLevel,
          roles_coping_level: roleCopingLevel,
          roles_patient_reported: rolePatientReported,
          roles_msw_observation: roleMswObs,
          environment_severity_level: envSeverityLevel,
          environment_patient_reported: envPatientReported,
          environment_msw_observation: envMswObs,
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
    }, 400);
    return () => clearTimeout(t);
  }, [
    totalHouseholdIncome,
    familyMembers.length,
    interviewDate,
    interviewStartTime,
    interviewEndTime,
    assignedMsw,
    interviewedPerson,
    healthFactors,
    discrimSeverityLevel,
    discrimCopingLevel,
    safetySeverityLevel,
    safetyCopingLevel,
    roleSeverityLevel,
    roleCopingLevel,
    envSeverityLevel,
  ]);

  const handleSaveInterviewDraft = async (markCompleted: boolean = false) => {
    setIsSavingInterview(true);
    try {
      let id = assessmentId;
      if (!id) {
        id = await saveDraftToBackend(true);
      }
      if (id) {
        await fetchApi(`/assessments/${id}/interview`, {
          method: 'POST',
          headers: MSW_HDRS,
          body: JSON.stringify({
            interview_info: {
              interview_date: interviewDate,
              interview_start_time: interviewStartTime,
              interview_end_time: interviewEndTime,
              assigned_msw: assignedMsw,
              interviewed_person: interviewedPerson,
              representative_relationship: representativeRelationship,
              interview_method: interviewMethod,
              interview_status: markCompleted ? 'COMPLETED' : interviewStatus,
              consent_obtained: consentObtained,
              consent_notes: consentNotes,
            },
            background: {
              living_situation: livingSituation,
              living_situation_obs: livingSituationObs,
              household_composition: householdComposition,
              household_composition_obs: householdCompositionObs,
              family_support: familySupport,
              family_support_obs: familySupportObs,
              employment_situation: employmentSituation,
              employment_obs: employmentObs,
              income_sources: incomeSources,
              income_sources_obs: incomeSourcesObs,
              financial_responsibilities: financialResponsibilities,
              financial_responsibilities_obs: financialResponsibilitiesObs,
            },
            medical_difficulties: {
              medical_condition_summary: medicalConditionSummary,
              medical_condition_obs: medicalConditionObs,
              problem_duration: durationProblems,
              previous_treatments: previousTreatment,
              recommended_procedure: presentTreatmentPlan,
              estimated_treatment_expenses: estimatedExpenses ? Number(estimatedExpenses) : 11600,
              financial_barriers: financialBarriers,
              financial_barriers_obs: financialBarriersObs,
              service_accessibility: healthAccessibilityProblem,
              available_healthcare_resources: availableHealthcareResources,
            },
            psychosocial: {
              accessibility_concerns: accessibilityConcerns,
              discrimination_experienced: discriminationExperienced,
              discrimination_obs: discriminationObs,
              safety_hazards: safetyHazards,
              safety_hazards_obs: safetyHazardsObs,
              social_responsibilities: socialResponsibilities,
              social_responsibilities_obs: socialResponsibilitiesObs,
              support_systems: supportSystems,
              support_systems_obs: supportSystemsObs,
              basic_needs_living_conditions: basicNeedsLivingConditions,
              basic_needs_obs: basicNeedsObs,
              coping_capacity_narrative: copingCapacityNarrative,
              coping_capacity_obs: copingCapacityObs,
            },
            health_factors: healthFactors.map((hf) => ({
              factor: hf.factor,
              severity_level: hf.severityLevel,
              coping_level: hf.copingLevel,
              patient_reported: hf.patientReported,
              msw_observation: hf.mswObservation,
            })),
            notes: consentNotes,
            mark_completed: markCompleted,
          }),
        });
        if (markCompleted) {
          setInterviewStatus('COMPLETED');
          toast.success('MSW Interview marked as Completed and logged in official audit record!');
        } else {
          toast.success('MSW Clinical Interview draft saved successfully!');
        }
        // Refresh classification
        runBackendClassification();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save interview draft.');
    } finally {
      setIsSavingInterview(false);
    }
  };

  const buildStagePayload = (stageOverride?: number) => ({
    active_stage: stageOverride ?? activeStage,
    interview_date: interviewDate,
    source_of_referral: sourceOfReferral,
    stage1_data: {
      informant_is_patient: isInformantPatient,
      informant_relation: infRelation,
      informant_first_name: infFirstName,
      informant_middle_name: infMiddleName,
      informant_last_name: infLastName,
      informant_suffix: infSuffix,
      informant_age: infAge,
      informant_dob: infDob,
      informant_sex: infSex,
      informant_religion: infReligion,
      informant_civil_status: infCivilStatus,
      informant_street: infAddress,
      informant_barangay: infBarangay,
      informant_city: infCity,
      informant_province: infProvince,
      informant_region: infRegion,
      informant_contact: infContact,
      informant_occupation: infOccupation,
      informant_education: infEducation,
      informant_income: Number(infIncome || 0),
      patient_first_name: patFirstName,
      patient_middle_name: patMiddleName,
      patient_last_name: patLastName,
      patient_suffix: patSuffix,
      patient_age: patAge,
      patient_dob: patDob,
      patient_sex: patSex,
      patient_religion: patReligion,
      patient_civil_status: patCivilStatus,
      patient_contact: patContact,
      patient_email: patEmail,
      patient_occupation: patOccupation,
      patient_income: Number(patIncome || 0),
      patient_street: patStreet,
      patient_barangay: patBarangay,
      patient_city: patCity,
      patient_province: patProvince,
      patient_region: patRegion,
      patient_permanent_address:
        [patStreet, patBarangay, patCity, patProvince, patRegion].filter(Boolean).join(', ') || patAddress,
      same_as_permanent_address: sameAsPermAddress,
      patient_alt_street: sameAsPermAddress ? patStreet : patAltStreet,
      patient_alt_barangay: sameAsPermAddress ? patBarangay : patAltBarangay,
      patient_alt_city: sameAsPermAddress ? patCity : patAltCity,
      patient_alt_province: sameAsPermAddress ? patProvince : patAltProvince,
      patient_alt_region: sameAsPermAddress ? patRegion : patAltRegion,
      patient_alt_address: sameAsPermAddress
        ? [patStreet, patBarangay, patCity, patProvince, patRegion].filter(Boolean).join(', ') || patAddress
        : [patAltStreet, patAltBarangay, patAltCity, patAltProvince, patAltRegion].filter(Boolean).join(', ') || patAltAddress,
      patient_education: patEducation,
      sectoral,
      sectoral_others: sectoralOthers,
      household_size: Math.max(1, familyMembers.length + 1),
      total_household_income: Math.max(0, totalHouseholdIncome),
      family_members: familyMembers,
      socio_economic_expenses: {
        patient_source_detail: patSourceOfFundsDetail,
        patient_source_rate: patSourceOfFundsRate,
        patient_source_period: patSourceOfFundsPeriod,
        spouse_not_applicable: spouseSourceNotApplicable,
        spouse_source_detail: spouseSourceNotApplicable ? 'Not Applicable' : spouseSourceOfFundsDetail,
        spouse_source_rate: spouseSourceNotApplicable ? '' : spouseSourceOfFundsRate,
        spouse_source_period: spouseSourceOfFundsPeriod,
        gov_assistance_enrolled: govAssistanceEnrolled,
        gov_assistance_programs: govAssistanceEnrolled === 'Yes' ? govAssistancePrograms : '',
        rent_amount: Number(rentExpenseAmount || 0),
        rent_note: rentHousingNote,
        water_bill: Number(waterBillAmount || 0),
        electricity_bill: Number(electricityBillAmount || 0),
        transportation_amount: Number(transportExpenseAmount || 0),
        transportation_notes: transportExpenseNotes,
        other_medical_expenses: otherMedicalExpenses,
        eye_maintenance_amount: Number(eyeMaintenanceExpense || 0),
        total_monthly_expenses: totalMonthlyExpenses,
        first_consultation_date: firstConsultationDate,
      },
      admitting_diagnosis: admittingDiagnosis,
      final_diagnosis: finalDiagnosis,
      treatment_plan: presentTreatmentPlan,
    },
    stage2_data: {
      interview_info: {
        interview_date: interviewDate,
        interview_start_time: interviewStartTime,
        interview_end_time: interviewEndTime,
        assigned_msw: assignedMsw,
        interviewed_person: interviewedPerson,
        representative_relationship: representativeRelationship,
        interview_method: interviewMethod,
        interview_status: interviewStatus,
        consent_obtained: consentObtained,
        consent_notes: consentNotes,
      },
      background: {
        living_situation: livingSituation,
        living_situation_obs: livingSituationObs,
        household_composition: householdComposition,
        household_composition_obs: householdCompositionObs,
        family_support: familySupport,
        family_support_obs: familySupportObs,
        employment_situation: employmentSituation,
        employment_obs: employmentObs,
        income_sources: incomeSources,
        income_sources_obs: incomeSourcesObs,
        financial_responsibilities: financialResponsibilities,
        financial_responsibilities_obs: financialResponsibilitiesObs,
      },
      medical_difficulties: {
        medical_condition_summary: medicalConditionSummary,
        medical_condition_obs: medicalConditionObs,
        problem_duration: durationProblems,
        previous_treatments: previousTreatment,
        recommended_procedure: presentTreatmentPlan,
        estimated_treatment_expenses: estimatedExpenses ? Number(estimatedExpenses) : 11600,
        financial_barriers: financialBarriers,
        financial_barriers_obs: financialBarriersObs,
        service_accessibility: healthAccessibilityProblem,
        available_healthcare_resources: availableHealthcareResources,
      },
      psychosocial: {
        accessibility_concerns: accessibilityConcerns,
        discrimination_experienced: discriminationExperienced,
        discrimination_obs: discriminationObs,
        safety_hazards: safetyHazards,
        safety_hazards_obs: safetyHazardsObs,
        social_responsibilities: socialResponsibilities,
        social_responsibilities_obs: socialResponsibilitiesObs,
        support_systems: supportSystems,
        support_systems_obs: supportSystemsObs,
        basic_needs_living_conditions: basicNeedsLivingConditions,
        basic_needs_obs: basicNeedsObs,
        coping_capacity_narrative: copingCapacityNarrative,
        coping_capacity_obs: copingCapacityObs,
      },
      health_factors: healthFactors.map((hf) => ({
        factor: hf.factor,
        severity_level: hf.severityLevel,
        coping_level: hf.copingLevel,
        patient_reported: hf.patientReported,
        msw_observation: hf.mswObservation,
      })),
      discrimination_severity_level: discrimSeverityLevel,
      discrimination_coping_level: discrimCopingLevel,
      discrimination_patient_reported: discrimPatientReported,
      discrimination_msw_observation: discrimMswObs,
      safety_severity_level: safetySeverityLevel,
      safety_coping_level: safetyCopingLevel,
      safety_patient_reported: safetyPatientReported,
      safety_msw_observation: safetyMswObs,
      roles_severity_level: roleSeverityLevel,
      roles_coping_level: roleCopingLevel,
      roles_patient_reported: rolePatientReported,
      roles_msw_observation: roleMswObs,
      environment_severity_level: envSeverityLevel,
      environment_patient_reported: envPatientReported,
      environment_msw_observation: envMswObs,
      average_severity: backendEval?.average_severity,
      average_coping: backendEval?.average_coping,
      total_risk: backendEval?.total_risk,
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
            referral_id: activeReferral?.id || referralIdParam || null,
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
          body: JSON.stringify({
            ...payload,
            referral_id: activeReferral?.id || referralIdParam || undefined,
          }),
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

  if (patientLoadStatus === 'loading') {
    return (
      <DashboardLayout
        title="Medical Social Work Assessment Tool"
        subtitle="Ophthalmological Foundation of the Philippines — Patient Intake & Evaluation"
      >
        <div className="py-20 text-center">
          <i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#0B6B3A] mb-3" />
          <p className="text-xs font-semibold text-[#64748B]">
            Loading verified patient record ({patientIdParam})...
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (patientLoadStatus === 'missing' || patientLoadStatus === 'error') {
    return (
      <DashboardLayout
        title="Medical Social Work Assessment Tool"
        subtitle="Ophthalmological Foundation of the Philippines — Patient Intake & Evaluation"
      >
        <div className="max-w-xl mx-auto my-12 bg-white border border-[#D5E2D9] rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto text-xl">
            <i className="fa-solid fa-user-check" />
          </div>
          <h2 className="font-['Outfit'] text-lg font-bold text-[#10241A] m-0">
            {patientLoadStatus === 'missing' ? 'Patient Selection Required' : 'Patient Record Unavailable'}
          </h2>
          <p className="text-xs text-[#5A7466] leading-relaxed m-0">
            {patientLoadError || 'Please select a patient from Patient Master Records to begin or continue an MSW assessment.'}
          </p>
          <div className="pt-2">
            <Link
              href="/patients"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white text-xs font-bold transition no-underline shadow-xs"
            >
              <i className="fa-solid fa-arrow-left text-xs" />
              <span>Go to Patient Master Records</span>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Medical Social Work Assessment Tool"
      subtitle="Ophthalmological Foundation of the Philippines — AI-Assisted Patient Intake & Evaluation"
    >
      <div className="w-full pb-12 text-xs">
        {/* Top Control Bar: Back to Patient Records, Status Badge, Print Assessment, Patient Dossier */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Link
              href={patientIdParam ? `/patients/${encodeURIComponent(patientIdParam)}` : '/patients'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC] font-semibold text-xs transition no-underline shadow-2xs"
            >
              <i className="fa-solid fa-arrow-left text-[11px]" />
              <span>{patientIdParam ? 'Back to Patient Dossier' : 'Back to Patient Records'}</span>
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

            {/* Institutional Identifiers Summary Box */}
            <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-right shrink-0 space-y-1">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#64748B] mr-1.5">PATIENT ID:</span>
                <span className="font-mono font-bold text-sm text-[#0B6B3A]">{canonicalPatientId || patientIdParam}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#64748B] mr-1.5">CHARITY CASE NO:</span>
                <span className="font-mono font-bold text-xs text-[#0F172A]">{charityCaseNo || 'NOT ASSIGNED'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#64748B] mr-1.5">APPLICATION ENCOUNTER NO:</span>
                <span className="font-mono text-xs text-[#334155]">{applicationEncounterNo || 'PENDING'}</span>
              </div>
            </div>
          </div>

          {/* ========================================================
              STAGE 1: CASE STUDY & PROFILE (Images 1 & 2)
             ======================================================== */}
          {activeStage === 1 && (
            <div className="space-y-6">
              {/* Physician-Endorsed Referral Clinical & Financial Banner */}
              {activeReferral && (
                <div className="bg-[#F8FBF9] border border-[#A7F3D0] rounded-2xl p-4.5 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D5E2D9] pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-xs">
                        <i className="fa-solid fa-file-invoice-dollar" />
                      </span>
                      <div>
                        <div className="text-xs font-bold text-[#10241A] flex items-center gap-2">
                          <span>Clinical Referral Basis:</span>
                          <span className="font-mono text-[#0B6B3A]">{activeReferral.id}</span>
                          <span className="text-[10px] font-semibold text-[#64748B]">({activeReferral.referral_no || 'REF'})</span>
                        </div>
                        <div className="text-[11px] text-[#5A7466]">
                          Endorsed by <strong>{activeReferral.referring_individual}</strong> &bull; Attending Surgeon: <strong>{activeReferral.attending_doctor}</strong>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase text-[#5A7466]">Medical Quotation</div>
                      <div className="font-mono font-extrabold text-[#0B6B3A] text-sm sm:text-base">
                        ₱{Number(activeReferral.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-white border border-[#E2ECE5]">
                      <div className="text-[10px] font-bold uppercase text-[#5A7466]">Clinical Diagnosis</div>
                      <div className="font-bold text-[#10241A] mt-0.5">{activeReferral.diagnosis}</div>
                      {activeReferral.eye_laterality && (
                        <div className="text-[10.5px] text-[#0B6B3A] mt-0.5 font-medium">Eye Laterality: {activeReferral.eye_laterality}</div>
                      )}
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-[#E2ECE5]">
                      <div className="text-[10px] font-bold uppercase text-[#5A7466]">Recommended Procedure</div>
                      <div className="font-bold text-[#10241A] mt-0.5">{activeReferral.procedure}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-[#E2ECE5]">
                      <div className="text-[10px] font-bold uppercase text-[#5A7466]">Clinical Findings &amp; Urgency</div>
                      <div className="text-[11px] text-[#1E293B] mt-0.5 line-clamp-2">
                        {activeReferral.clinical_findings || 'Physician validated urgent surgical indication.'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                  <span className="text-[11px] text-[#0B6B3A] bg-[#E8F5EC] px-2.5 py-0.5 rounded-full font-semibold">
                    Auto-Populated from Patient Record
                  </span>
                </div>

                {/* 1. INFORMANT / REPRESENTATIVE */}
                <div className="space-y-3.5 p-4 rounded-xl border border-[#E2E8F0] bg-[#FAFBF8]/50">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#0B6B3A]">
                      1. INFORMANT / REPRESENTATIVE
                    </div>

                    {/* Informant-is-Patient Toggle */}
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#86EFAC] bg-[#F0FDF4] text-[#14532D] text-xs font-bold cursor-pointer select-none shadow-2xs hover:bg-[#DCFCE7] transition">
                      <input
                        type="checkbox"
                        checked={isInformantPatient}
                        onChange={(e) => handleToggleInformantIsPatient(e.target.checked)}
                        className="accent-[#0B6B3A] w-4 h-4 rounded cursor-pointer"
                      />
                      <i className="fa-solid fa-user-check text-[#0B6B3A] text-[11px]" />
                      <span>Informant is the Patient (Self)</span>
                    </label>
                  </div>

                  {/* Name Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">LAST NAME *</label>
                      <input
                        type="text"
                        placeholder="Enter last name"
                        value={infLastName}
                        onChange={(e) => {
                          setInfLastName(e.target.value);
                          if (isInformantPatient) setPatLastName(e.target.value);
                        }}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">FIRST NAME *</label>
                      <input
                        type="text"
                        placeholder="Enter first name"
                        value={infFirstName}
                        onChange={(e) => {
                          setInfFirstName(e.target.value);
                          if (isInformantPatient) setPatFirstName(e.target.value);
                        }}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">MIDDLE NAME</label>
                      <input
                        type="text"
                        placeholder="Enter middle name"
                        value={infMiddleName}
                        onChange={(e) => {
                          setInfMiddleName(e.target.value);
                          if (isInformantPatient) setPatMiddleName(e.target.value);
                        }}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">EXT. / SUFFIX</label>
                      <select
                        value={infSuffix}
                        onChange={(e) => {
                          setInfSuffix(e.target.value);
                          if (isInformantPatient) setPatSuffix(e.target.value);
                        }}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                      >
                        <option value="None">None</option>
                        <option value="Jr.">Jr.</option>
                        <option value="Sr.">Sr.</option>
                        <option value="II">II</option>
                        <option value="III">III</option>
                        <option value="IV">IV</option>
                        {!['None', 'Jr.', 'Sr.', 'II', 'III', 'IV'].includes(infSuffix) && infSuffix && (
                          <option value={infSuffix}>{infSuffix}</option>
                        )}
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
                        onChange={(e) => {
                          setInfAge(e.target.value);
                          if (isInformantPatient) setPatAge(e.target.value);
                        }}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">DATE OF BIRTH</label>
                      <input
                        type="date"
                        value={infDob}
                        onChange={(e) => {
                          setInfDob(e.target.value);
                          if (isInformantPatient) setPatDob(e.target.value);
                        }}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">SEX</label>
                      <select
                        value={infSex}
                        onChange={(e) => {
                          setInfSex(e.target.value);
                          if (isInformantPatient) setPatSex(e.target.value);
                        }}
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
                        onChange={(e) => {
                          setInfReligion(e.target.value);
                          if (isInformantPatient) setPatReligion(e.target.value);
                        }}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      >
                        <option value="">-- Select Religion --</option>
                        <option value="Roman Catholic">Roman Catholic</option>
                        <option value="Christian">Christian</option>
                        <option value="Iglesia Ni Cristo">Iglesia Ni Cristo</option>
                        <option value="Islam">Islam</option>
                        <option value="Others">Others</option>
                        {!['', 'Roman Catholic', 'Christian', 'Iglesia Ni Cristo', 'Islam', 'Others'].includes(infReligion) && (
                          <option value={infReligion}>{infReligion}</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">CIVIL STATUS</label>
                      <select
                        value={infCivilStatus}
                        onChange={(e) => {
                          setInfCivilStatus(e.target.value);
                          if (isInformantPatient) setPatCivilStatus(e.target.value);
                        }}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      >
                        <option value="">-- Select Civil Status --</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Widowed">Widowed</option>
                        <option value="Separated">Separated</option>
                        {!['', 'Single', 'Married', 'Widowed', 'Separated'].includes(infCivilStatus) && (
                          <option value={infCivilStatus}>{infCivilStatus}</option>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Cascading PSGC Philippine Location Selectors: Region -> Province/District -> City/Municipality -> Barangay + Street */}
                  <PsgcCascadingFields
                    region={infRegion}
                    province={infProvince}
                    city={infCity}
                    barangay={infBarangay}
                    street={infAddress}
                    showStreet={true}
                    streetLabel="HOUSE / STREET / PUROK"
                    streetPlaceholder="House No., Street, Purok / Subd."
                    onChange={(next) => {
                      setInfRegion(next.region);
                      setInfProvince(next.province);
                      setInfCity(next.city);
                      setInfBarangay(next.barangay);
                      setInfAddress(next.street || '');
                      if (isInformantPatient) {
                        setPatRegion(next.region);
                        setPatProvince(next.province);
                        setPatCity(next.city);
                        setPatBarangay(next.barangay);
                        setPatStreet(next.street || '');
                        const composed = [next.street, next.barangay, next.city, next.province].filter(Boolean).join(', ');
                        setPatAddress(composed);
                        if (sameAsPermAddress) {
                          setPatAltRegion(next.region);
                          setPatAltProvince(next.province);
                          setPatAltCity(next.city);
                          setPatAltBarangay(next.barangay);
                          setPatAltStreet(next.street || '');
                          setPatAltAddress(composed);
                        }
                      }
                    }}
                  />

                  {/* Contact Number, Relation, Occupation, Monthly Income */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">CONTACT NUMBER</label>
                      <input
                        type="text"
                        placeholder="Enter contact number"
                        value={infContact}
                        onChange={(e) => {
                          setInfContact(e.target.value);
                          if (isInformantPatient) setPatContact(e.target.value);
                        }}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">RELATION TO PATIENT</label>
                      <select
                        value={infRelation}
                        onChange={(e) => handleInformantRelationChange(e.target.value)}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white font-semibold text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                      >
                        <option value="">-- Select Relation to Patient --</option>
                        <option value="Self">Self (Informant is Patient)</option>
                        <option value="Patient">Patient</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Child">Child</option>
                        <option value="Parent">Parent</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Relative">Relative</option>
                        <option value="Guardian / Companion">Guardian / Companion</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">OCCUPATION</label>
                      <input
                        type="text"
                        placeholder="Enter occupation"
                        value={infOccupation}
                        onChange={(e) => {
                          setInfOccupation(e.target.value);
                          if (isInformantPatient) setPatOccupation(e.target.value);
                        }}
                        className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                        MONTHLY INCOME (₱) {isInformantPatient && <span className="text-[#0B6B3A] text-[10px]">(Synced)</span>}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={infIncome}
                        onChange={(e) => {
                          setInfIncome(e.target.value);
                          if (isInformantPatient) setPatIncome(e.target.value);
                        }}
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
                      {EDUCATION_LEVELS.map((lvl) => (
                        <label key={lvl} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="inf_education"
                            checked={infEducation === lvl}
                            onChange={() => {
                              setInfEducation(lvl);
                              if (isInformantPatient) setPatEducation(lvl);
                            }}
                            className="accent-[#0B6B3A]"
                          />
                          <span>{lvl}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. PATIENT INFORMATION */}
                <div
                  className={`space-y-3.5 p-4 rounded-xl border transition ${
                    isInformantPatient
                      ? 'border-amber-300 bg-slate-50/90'
                      : 'border-[#E2E8F0] bg-[#FAFBF8]/50'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#0B6B3A]">
                        2. PATIENT INFORMATION
                      </span>
                      {isInformantPatient ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <i className="fa-solid fa-lock text-[9px]" />
                          <span>Locked — Synced with Informant (Self)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#E8F5EC] text-[#0B6B3A]">
                          <i className="fa-solid fa-database text-[9px]" />
                          <span>Pre-filled from Master Record</span>
                        </span>
                      )}
                    </div>

                    {isInformantPatient && (
                      <button
                        type="button"
                        onClick={() => handleToggleInformantIsPatient(false)}
                        className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 underline cursor-pointer bg-transparent border-0"
                      >
                        Change Informant Relation to Unlock
                      </button>
                    )}
                  </div>

                  {/* Lock Banner Explanation when Informant is the Patient */}
                  {isInformantPatient && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                      <i className="fa-solid fa-shield-halved text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <strong>Patient Fields Locked (Read-Only):</strong> Because the informant is the patient (
                        <code>{infRelation || 'Self'}</code>), these fields are synced with Section 1 to prevent duplicate or conflicting edits and avoid double-counting monthly income. Change <strong>Relation to Patient</strong> (e.g., Spouse, Child, Relative) to unlock independent editing.
                      </div>
                    </div>
                  )}

                  <fieldset disabled={isInformantPatient} className="space-y-3.5 border-0 p-0 m-0 min-w-0">
                    {/* Name Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#475569] mb-1">LAST NAME *</label>
                        <input
                          type="text"
                          placeholder="Enter last name"
                          value={patLastName}
                          onChange={(e) => setPatLastName(e.target.value)}
                          className={`w-full h-9 px-3 border rounded-lg text-xs focus:outline-none ${
                            isInformantPatient
                              ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                              : 'bg-white text-[#10241A] border-[#CBD5E1] focus:border-[#0B6B3A]'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#475569] mb-1">FIRST NAME *</label>
                        <input
                          type="text"
                          placeholder="Enter first name"
                          value={patFirstName}
                          onChange={(e) => setPatFirstName(e.target.value)}
                          className={`w-full h-9 px-3 border rounded-lg text-xs focus:outline-none ${
                            isInformantPatient
                              ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                              : 'bg-white text-[#10241A] border-[#CBD5E1] focus:border-[#0B6B3A]'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#475569] mb-1">MIDDLE NAME</label>
                        <input
                          type="text"
                          placeholder="Enter middle name"
                          value={patMiddleName}
                          onChange={(e) => setPatMiddleName(e.target.value)}
                          className={`w-full h-9 px-3 border rounded-lg text-xs focus:outline-none ${
                            isInformantPatient
                              ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                              : 'bg-white text-[#10241A] border-[#CBD5E1] focus:border-[#0B6B3A]'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#475569] mb-1">EXT. / SUFFIX</label>
                        <select
                          value={patSuffix}
                          onChange={(e) => setPatSuffix(e.target.value)}
                          className={`w-full h-9 px-3 border rounded-lg text-xs focus:outline-none ${
                            isInformantPatient
                              ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                              : 'bg-white text-[#10241A] border-[#CBD5E1] focus:border-[#0B6B3A]'
                          }`}
                        >
                          <option value="None">None</option>
                          <option value="Jr.">Jr.</option>
                          <option value="Sr.">Sr.</option>
                          <option value="II">II</option>
                          <option value="III">III</option>
                          <option value="IV">IV</option>
                          {!['None', 'Jr.', 'Sr.', 'II', 'III', 'IV'].includes(patSuffix) && patSuffix && (
                            <option value={patSuffix}>{patSuffix}</option>
                          )}
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
                          className={`w-full h-9 px-3 border rounded-lg text-xs focus:outline-none ${
                            isInformantPatient
                              ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                              : 'bg-white border-[#CBD5E1] focus:border-[#0B6B3A]'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#475569] mb-1">DATE OF BIRTH</label>
                        <input
                          type="date"
                          value={patDob}
                          onChange={(e) => setPatDob(e.target.value)}
                          className={`w-full h-9 px-3 border rounded-lg text-xs focus:outline-none ${
                            isInformantPatient
                              ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                              : 'bg-white border-[#CBD5E1] focus:border-[#0B6B3A]'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#475569] mb-1">SEX *</label>
                        <select
                          value={patSex}
                          onChange={(e) => setPatSex(e.target.value)}
                          className={`w-full h-9 px-3 border rounded-lg text-xs focus:outline-none ${
                            isInformantPatient
                              ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                              : 'bg-white border-[#CBD5E1] focus:border-[#0B6B3A]'
                          }`}
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
                          className={`w-full h-9 px-3 border rounded-lg text-xs focus:outline-none ${
                            isInformantPatient
                              ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                              : 'bg-white border-[#CBD5E1] focus:border-[#0B6B3A]'
                          }`}
                        >
                          <option value="">-- Select Religion --</option>
                          <option value="Roman Catholic">Roman Catholic</option>
                          <option value="Christian">Christian</option>
                          <option value="Iglesia Ni Cristo">Iglesia Ni Cristo</option>
                          <option value="Islam">Islam</option>
                          <option value="Others">Others</option>
                          {!['', 'Roman Catholic', 'Christian', 'Iglesia Ni Cristo', 'Islam', 'Others'].includes(patReligion) && (
                            <option value={patReligion}>{patReligion}</option>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#475569] mb-1">CIVIL STATUS</label>
                        <select
                          value={patCivilStatus}
                          onChange={(e) => setPatCivilStatus(e.target.value)}
                          className={`w-full h-9 px-3 border rounded-lg text-xs focus:outline-none ${
                            isInformantPatient
                              ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                              : 'bg-white border-[#CBD5E1] focus:border-[#0B6B3A]'
                          }`}
                        >
                          <option value="">-- Select Civil Status --</option>
                          <option value="Single">Single</option>
                          <option value="Married">Married</option>
                          <option value="Widowed">Widowed</option>
                          <option value="Separated">Separated</option>
                          {!['', 'Single', 'Married', 'Widowed', 'Separated'].includes(patCivilStatus) && (
                            <option value={patCivilStatus}>{patCivilStatus}</option>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Contact Number, Email, Occupation, Monthly Income */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#475569] mb-1">CONTACT NUMBER</label>
                        <input
                          type="text"
                          placeholder="Contact number"
                          value={patContact}
                          onChange={(e) => setPatContact(e.target.value)}
                          className={`w-full h-9 px-3 border rounded-lg text-xs focus:outline-none ${
                            isInformantPatient
                              ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                              : 'bg-white border-[#CBD5E1] focus:border-[#0B6B3A]'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#475569] mb-1">EMAIL ADDRESS</label>
                        <input
                          type="email"
                          placeholder="Email address"
                          value={patEmail}
                          onChange={(e) => setPatEmail(e.target.value)}
                          className={`w-full h-9 px-3 border rounded-lg text-xs focus:outline-none ${
                            isInformantPatient
                              ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                              : 'bg-white border-[#CBD5E1] focus:border-[#0B6B3A]'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#475569] mb-1">OCCUPATION</label>
                        <input
                          type="text"
                          placeholder="Enter occupation"
                          value={patOccupation}
                          onChange={(e) => setPatOccupation(e.target.value)}
                          className={`w-full h-9 px-3 border rounded-lg text-xs focus:outline-none ${
                            isInformantPatient
                              ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                              : 'bg-white border-[#CBD5E1] focus:border-[#0B6B3A]'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#475569] mb-1">MONTHLY INCOME (₱)</label>
                        <input
                          type="number"
                          min="0"
                          value={patIncome}
                          onChange={(e) => setPatIncome(e.target.value)}
                          className={`w-full h-9 px-3 border rounded-lg text-xs focus:outline-none ${
                            isInformantPatient
                              ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                              : 'bg-white border-[#CBD5E1] focus:border-[#0B6B3A]'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Structured Permanent Address (PSGC Cascading Dropdowns) */}
                    <div className="p-3 rounded-xl border border-[#E2E8F0] bg-white/80 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10.5px] font-bold uppercase text-[#0B6B3A]">
                          Permanent Address (PSGC Verified)
                        </span>
                        <span className="text-[11px] text-[#64748B] truncate max-w-md">
                          {[patStreet, patBarangay, patCity, patProvince, patRegion].filter(Boolean).join(', ') || patAddress || '—'}
                        </span>
                      </div>
                      <PsgcCascadingFields
                        region={patRegion}
                        province={patProvince}
                        city={patCity}
                        barangay={patBarangay}
                        street={patStreet}
                        disabled={isInformantPatient}
                        streetLabel="HOUSE / STREET / PUROK"
                        onChange={(next) => {
                          setPatRegion(next.region);
                          setPatProvince(next.province);
                          setPatCity(next.city);
                          setPatBarangay(next.barangay);
                          setPatStreet(next.street || '');
                          const composed = [next.street, next.barangay, next.city, next.province].filter(Boolean).join(', ');
                          setPatAddress(composed);
                          if (sameAsPermAddress) {
                            setPatAltRegion(next.region);
                            setPatAltProvince(next.province);
                            setPatAltCity(next.city);
                            setPatAltBarangay(next.barangay);
                            setPatAltStreet(next.street || '');
                            setPatAltAddress(composed);
                          }
                        }}
                      />
                    </div>

                    {/* Structured Current / Alternative Address */}
                    <div className="p-3 rounded-xl border border-[#E2E8F0] bg-white/80 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10.5px] font-bold uppercase text-[#0B6B3A]">
                          Current / Alternative Address
                        </span>
                        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#334155] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sameAsPermAddress}
                            disabled={isInformantPatient}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSameAsPermAddress(checked);
                              if (checked) {
                                setPatAltRegion(patRegion);
                                setPatAltProvince(patProvince);
                                setPatAltCity(patCity);
                                setPatAltBarangay(patBarangay);
                                setPatAltStreet(patStreet);
                                setPatAltAddress(patAddress);
                              }
                            }}
                            className="accent-[#0B6B3A] rounded"
                          />
                          <span>Same as Permanent Address</span>
                        </label>
                      </div>

                      {sameAsPermAddress ? (
                        <input
                          type="text"
                          readOnly
                          value={
                            [patStreet, patBarangay, patCity, patProvince, patRegion].filter(Boolean).join(', ') ||
                            patAltAddress ||
                            patAddress ||
                            ''
                          }
                          placeholder="Same as permanent residence"
                          className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs bg-slate-100 text-slate-600"
                        />
                      ) : (
                        <PsgcCascadingFields
                          region={patAltRegion}
                          province={patAltProvince}
                          city={patAltCity}
                          barangay={patAltBarangay}
                          street={patAltStreet}
                          disabled={isInformantPatient}
                          streetLabel="CURRENT HOUSE / STREET"
                          onChange={(next) => {
                            setPatAltRegion(next.region);
                            setPatAltProvince(next.province);
                            setPatAltCity(next.city);
                            setPatAltBarangay(next.barangay);
                            setPatAltStreet(next.street || '');
                            setPatAltAddress(
                              [next.street, next.barangay, next.city, next.province].filter(Boolean).join(', ')
                            );
                          }}
                        />
                      )}
                    </div>

                    {/* Radio: Highest Educational Attainment */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1.5">
                        HIGHEST EDUCATIONAL ATTAINMENT
                      </label>
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        {EDUCATION_LEVELS.map((lvl) => (
                          <label
                            key={lvl}
                            className={`flex items-center gap-1.5 ${
                              isInformantPatient ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                            }`}
                          >
                            <input
                              type="radio"
                              name="pat_education"
                              disabled={isInformantPatient}
                              checked={patEducation === lvl}
                              onChange={() => setPatEducation(lvl)}
                              className="accent-[#0B6B3A]"
                            />
                            <span>{lvl}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </fieldset>
                </div>
              </div>

              {/* SECTION II: SOCIO-ECONOMIC & MONTHLY EXPENSES (Clinical Intake Sheet) */}
              <div className="p-4 sm:p-5 rounded-xl border border-[#E2E8F0] bg-white space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#EEF2EF]">
                  <span className="font-bold text-xs text-[#0B6B3A] flex items-center gap-1.5 uppercase tracking-wide">
                    <i className="fa-solid fa-wallet text-sm" />
                    <span>II. SOCIO-ECONOMIC &amp; MONTHLY EXPENSES</span>
                  </span>
                  <span className="text-[11px] font-semibold text-[#475569] bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-0.5 rounded-full">
                    Estimated Monthly Expenses:{' '}
                    <strong className="text-[#0B6B3A] font-mono">
                      ₱{totalMonthlyExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </span>
                </div>

                {/* Row 1: Patient Source of Funds & Spouse Source of Funds */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* 1. Patient Source of Funds */}
                  <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#FAFBF8]/70 space-y-2.5">
                    <label className="block text-[11px] font-bold text-[#10241A] uppercase">
                      1. Patient Source of Funds
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Vendor (Pantalon; cigarettes)"
                      value={patSourceOfFundsDetail}
                      onChange={(e) => setPatSourceOfFundsDetail(e.target.value)}
                      className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#64748B] mb-1">RATE / EARNINGS (₱)</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="e.g., 300"
                          value={patSourceOfFundsRate}
                          onChange={(e) => setPatSourceOfFundsRate(e.target.value)}
                          className="w-full h-8 px-2.5 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#64748B] mb-1">FREQUENCY</label>
                        <select
                          value={patSourceOfFundsPeriod}
                          onChange={(e) => setPatSourceOfFundsPeriod(e.target.value as any)}
                          className="w-full h-8 px-2 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                        >
                          <option value="per day">per day</option>
                          <option value="per week">per week</option>
                          <option value="per month">per month</option>
                          <option value="irregular">irregular / seasonal</option>
                        </select>
                      </div>
                    </div>
                    {(patSourceOfFundsDetail || patSourceOfFundsRate) && (
                      <div className="text-[10.5px] text-[#0B6B3A] font-medium">
                        Summary: {patSourceOfFundsDetail || 'Unspecified'}
                        {patSourceOfFundsRate ? ` – Php ${Number(patSourceOfFundsRate).toLocaleString()} ${patSourceOfFundsPeriod}` : ''}
                      </div>
                    )}
                  </div>

                  {/* 2. Spouse Source of Funds */}
                  <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#FAFBF8]/70 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-bold text-[#10241A] uppercase">
                        2. Spouse Source of Funds
                      </label>
                      <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#475569] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={spouseSourceNotApplicable}
                          onChange={(e) => setSpouseSourceNotApplicable(e.target.checked)}
                          className="accent-[#0B6B3A] rounded"
                        />
                        <span>Not Applicable (N/A)</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      disabled={spouseSourceNotApplicable}
                      placeholder={spouseSourceNotApplicable ? 'Not Applicable' : 'e.g., Home laundry / Sari-sari helper'}
                      value={spouseSourceNotApplicable ? 'Not Applicable' : spouseSourceOfFundsDetail}
                      onChange={(e) => setSpouseSourceOfFundsDetail(e.target.value)}
                      className={`w-full h-9 px-3 border rounded-lg text-xs focus:outline-none ${
                        spouseSourceNotApplicable
                          ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                          : 'bg-white border-[#CBD5E1] focus:border-[#0B6B3A]'
                      }`}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#64748B] mb-1">RATE / EARNINGS (₱)</label>
                        <input
                          type="number"
                          min="0"
                          disabled={spouseSourceNotApplicable}
                          placeholder={spouseSourceNotApplicable ? 'N/A' : 'e.g., 250'}
                          value={spouseSourceNotApplicable ? '' : spouseSourceOfFundsRate}
                          onChange={(e) => setSpouseSourceOfFundsRate(e.target.value)}
                          className={`w-full h-8 px-2.5 border rounded-lg text-xs focus:outline-none ${
                            spouseSourceNotApplicable
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              : 'bg-white border-[#CBD5E1] focus:border-[#0B6B3A]'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#64748B] mb-1">FREQUENCY</label>
                        <select
                          disabled={spouseSourceNotApplicable}
                          value={spouseSourceOfFundsPeriod}
                          onChange={(e) => setSpouseSourceOfFundsPeriod(e.target.value as any)}
                          className={`w-full h-8 px-2 border rounded-lg text-xs focus:outline-none ${
                            spouseSourceNotApplicable
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              : 'bg-white border-[#CBD5E1] focus:border-[#0B6B3A]'
                          }`}
                        >
                          <option value="per day">per day</option>
                          <option value="per week">per week</option>
                          <option value="per month">per month</option>
                          <option value="irregular">irregular / seasonal</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 2: Enrolled Government Assistance Programs & First Consultation in OFPHIL */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 p-3.5 rounded-xl border border-[#E2E8F0] bg-[#FAFBF8]/70 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-[11px] font-bold text-[#10241A] uppercase">
                        3. Enrolled Government Assistance Programs
                      </label>
                      <div className="inline-flex rounded-lg border border-[#CBD5E1] bg-white p-0.5">
                        {(['Yes', 'No'] as const).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setGovAssistanceEnrolled(opt)}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                              govAssistanceEnrolled === opt
                                ? 'bg-[#0B6B3A] text-white'
                                : 'text-[#475569] hover:bg-slate-50'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {govAssistanceEnrolled === 'Yes' ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Specify program(s): e.g., 4Ps, Senior Citizen Social Pension, DSWD AICS..."
                          value={govAssistancePrograms}
                          onChange={(e) => setGovAssistancePrograms(e.target.value)}
                          className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                        />
                        <div className="flex flex-wrap gap-1.5">
                          {['4Ps', 'Senior Citizen Pension', 'PhilHealth Indigent', 'DSWD AICS', 'PCSO / Malasakit'].map(
                            (tag) => {
                              const active = govAssistancePrograms.toLowerCase().includes(tag.toLowerCase());
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => {
                                    if (active) return;
                                    setGovAssistancePrograms((prev) => (prev.trim() ? `${prev.trim()}, ${tag}` : tag));
                                  }}
                                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold border cursor-pointer transition ${
                                    active
                                      ? 'bg-[#E8F5EC] text-[#0B6B3A] border-[#86EFAC]'
                                      : 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-slate-50'
                                  }`}
                                >
                                  + {tag}
                                </button>
                              );
                            }
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#64748B]">
                        No active government cash/subsidy program declared. Toggle <strong>Yes</strong> to specify 4Ps, Senior Citizen Pension, etc.
                      </div>
                    )}
                  </div>

                  {/* 9. First Consultation in OFPHIL */}
                  <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#FAFBF8]/70 space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <label className="text-[11px] font-bold text-[#10241A] uppercase">
                        9. First Consultation in OFPHIL
                      </label>
                      {firstConsultationSource && (
                        <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-[#E8F5EC] text-[#0B6B3A]">
                          Auto-Filled
                        </span>
                      )}
                    </div>
                    <input
                      type="date"
                      value={firstConsultationDate}
                      onChange={(e) => setFirstConsultationDate(e.target.value)}
                      className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white text-[#10241A] font-semibold focus:outline-none focus:border-[#0B6B3A]"
                    />
                    <div className="text-[10.5px] text-[#64748B]">
                      {firstConsultationSource
                        ? `Pre-populated from ${firstConsultationSource}`
                        : 'Select earliest OFPHIL clinic consultation date'}
                    </div>
                  </div>
                </div>

                {/* Row 3: Rent, Utilities (Water + Electricity), Transportation, Eye Maintenance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* 4. Rent Expenses */}
                  <div className="p-3 rounded-xl border border-[#E2E8F0] bg-[#FAFBF8]/70 space-y-2">
                    <label className="block text-[11px] font-bold text-[#10241A] uppercase">4. Rent Expenses (₱/mo)</label>
                    <input
                      type="number"
                      min="0"
                      value={rentExpenseAmount}
                      onChange={(e) => setRentExpenseAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-8 px-2.5 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                    />
                    <input
                      type="text"
                      value={rentHousingNote}
                      onChange={(e) => setRentHousingNote(e.target.value)}
                      placeholder="e.g., NONE (Owned by relative)"
                      className="w-full h-8 px-2.5 border border-[#CBD5E1] rounded-lg text-[11px] bg-white focus:outline-none focus:border-[#0B6B3A]"
                    />
                  </div>

                  {/* 5. Utility Expenses (Water & Electricity) */}
                  <div className="p-3 rounded-xl border border-[#E2E8F0] bg-[#FAFBF8]/70 space-y-2">
                    <label className="block text-[11px] font-bold text-[#10241A] uppercase">5. Utility Expenses (₱/mo)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="block text-[9.5px] font-semibold text-[#64748B] mb-0.5">WATER BILL (₱)</span>
                        <input
                          type="number"
                          min="0"
                          value={waterBillAmount}
                          onChange={(e) => setWaterBillAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full h-8 px-2 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                        />
                      </div>
                      <div>
                        <span className="block text-[9.5px] font-semibold text-[#64748B] mb-0.5">ELECTRICITY (₱)</span>
                        <input
                          type="number"
                          min="0"
                          value={electricityBillAmount}
                          onChange={(e) => setElectricityBillAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full h-8 px-2 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 6. Transportation Expenses */}
                  <div className="p-3 rounded-xl border border-[#E2E8F0] bg-[#FAFBF8]/70 space-y-2">
                    <label className="block text-[11px] font-bold text-[#10241A] uppercase">6. Transportation (₱/mo)</label>
                    <input
                      type="number"
                      min="0"
                      value={transportExpenseAmount}
                      onChange={(e) => setTransportExpenseAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-8 px-2.5 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                    />
                    <input
                      type="text"
                      value={transportExpenseNotes}
                      onChange={(e) => setTransportExpenseNotes(e.target.value)}
                      placeholder="Notes (e.g., Jeepney + escort fare)"
                      className="w-full h-8 px-2.5 border border-[#CBD5E1] rounded-lg text-[11px] bg-white focus:outline-none focus:border-[#0B6B3A]"
                    />
                  </div>

                  {/* 8. Eye Maintenance Expenses */}
                  <div className="p-3 rounded-xl border border-[#E2E8F0] bg-[#FAFBF8]/70 space-y-2">
                    <label className="block text-[11px] font-bold text-[#10241A] uppercase">8. Eye Maintenance (₱/mo)</label>
                    <input
                      type="number"
                      min="0"
                      value={eyeMaintenanceExpense}
                      onChange={(e) => setEyeMaintenanceExpense(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-8 px-2.5 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                    />
                    <div className="text-[10.5px] text-[#64748B] pt-1">
                      Ophthalmic drops / glaucoma or lubricant maintenance
                    </div>
                  </div>
                </div>

                {/* Row 4: 7. Medical Expenses from Other Illness(es) (Dynamic Itemized List) */}
                <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#FAFBF8]/70 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-[#10241A] uppercase">
                        7. Medical Expenses from Other Illness(es)
                      </span>
                      <span className="text-[11px] text-[#64748B] ml-2">
                        (e.g., Hypertension maintenance – Php 660/mo, Cholesterol maintenance – Php 510/mo)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddOtherMedicalExpense}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-[#0B6B3A] bg-[#E8F5EC] text-[#0B6B3A] font-bold text-[11px] hover:bg-[#D5E2D9] transition cursor-pointer"
                    >
                      <i className="fa-solid fa-plus text-[10px]" />
                      <span>Add Illness Entry</span>
                    </button>
                  </div>

                  {otherMedicalExpenses.length === 0 ? (
                    <div className="text-[11px] text-[#94A3B8] py-1">
                      No maintenance expenses from other illnesses added yet. Click <strong>Add Illness Entry</strong> if applicable.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {otherMedicalExpenses.map((item, idx) => (
                        <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-8">
                            <input
                              type="text"
                              placeholder="Condition & maintenance medication (e.g., Hypertension maintenance)"
                              value={item.condition}
                              onChange={(e) => {
                                const updated = [...otherMedicalExpenses];
                                updated[idx].condition = e.target.value;
                                setOtherMedicalExpenses(updated);
                              }}
                              className="w-full h-8 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[#64748B]">₱</span>
                              <input
                                type="number"
                                min="0"
                                placeholder="Monthly cost"
                                value={item.monthlyCost}
                                onChange={(e) => {
                                  const updated = [...otherMedicalExpenses];
                                  updated[idx].monthlyCost = e.target.value;
                                  setOtherMedicalExpenses(updated);
                                }}
                                className="w-full h-8 pl-6 pr-2.5 border border-[#CBD5E1] rounded-lg text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                              />
                            </div>
                          </div>
                          <div className="sm:col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveOtherMedicalExpense(item.id)}
                              className="h-8 px-2.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs cursor-pointer"
                              title="Remove entry"
                            >
                              <i className="fa-solid fa-trash-can" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="text-right text-[11px] font-semibold text-[#334155]">
                        Other Medical Maintenance Subtotal:{' '}
                        <strong className="text-[#0B6B3A] font-mono">
                          ₱{otherMedicalExpensesSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo
                        </strong>
                      </div>
                    </div>
                  )}
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
              STAGE 2: MSW ASSESSMENT & CLINICAL DATA
             ======================================================== */}
          {activeStage === 2 && (
            <div className="space-y-6">
              {/* STAGE 2 ACTION, PROMINENT DUAL-MODE SWITCHER & STATUS TOOLBAR */}
              <div className="p-4 rounded-xl border border-[#0B6B3A]/30 bg-[#F0FDF4] space-y-3 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-['Outfit'] font-bold text-sm text-[#14532D]">
                        Stage 2: Structured MSW Clinical Intake Interview &amp; Assessment
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          interviewStatus === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : interviewStatus === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {interviewStatus === 'COMPLETED'
                          ? 'Interview Completed'
                          : interviewStatus === 'IN_PROGRESS'
                          ? 'Interview In Progress'
                          : 'Interview Not Started'}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-[#166534] mt-0.5 mb-0">
                      Toggle between active <strong>Edit Form</strong> entry and the locked <strong>Review Summary Interview</strong> dossier view.
                    </p>
                  </div>

                  {/* Save & Complete Actions (Active in Edit Form Mode) */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveInterviewDraft(false)}
                      disabled={isSavingInterview}
                      className="px-3 py-1.5 rounded-lg border border-[#86EFAC] bg-white hover:bg-emerald-50 text-xs font-semibold text-[#0B6B3A] transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      {isSavingInterview ? (
                        <i className="fa-solid fa-circle-notch fa-spin text-[11px]" />
                      ) : (
                        <i className="fa-solid fa-floppy-disk text-[11px]" />
                      )}
                      <span>Save Draft</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveInterviewDraft(true)}
                      disabled={isSavingInterview}
                      className="px-3.5 py-1.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <i className="fa-solid fa-check text-[11px]" />
                      <span>Mark Completed</span>
                    </button>
                  </div>
                </div>

                {/* Prominent Segmented Dual-Mode Switcher: Edit Form vs. Review Summary Interview */}
                <div className="pt-2.5 border-t border-[#BBF7D0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="inline-flex rounded-xl border border-[#CBD5E1] bg-white p-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setIsReviewMode(false)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                        !isReviewMode
                          ? 'bg-[#0B6B3A] text-white shadow-xs'
                          : 'text-[#475569] hover:bg-slate-50'
                      }`}
                    >
                      <i className="fa-solid fa-pen-to-square text-[11px]" />
                      <span>Edit Form</span>
                      <span
                        className={`text-[9.5px] px-1.5 py-0.5 rounded uppercase ${
                          !isReviewMode ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Editable
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        runBackendClassification();
                        if (assessmentId) {
                          saveDraftToBackend(true);
                        }
                        setIsReviewMode(true);
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                        isReviewMode
                          ? 'bg-[#0B6B3A] text-white shadow-xs'
                          : 'text-[#475569] hover:bg-slate-50'
                      }`}
                    >
                      <i className="fa-solid fa-lock text-[11px]" />
                      <span>Review Summary Interview</span>
                      <span
                        className={`text-[9.5px] px-1.5 py-0.5 rounded uppercase ${
                          isReviewMode ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        Read-Only
                      </span>
                    </button>
                  </div>

                  <div className="text-[11px] text-[#166534] flex items-center gap-1.5">
                    <i className={`fa-solid ${isReviewMode ? 'fa-lock text-amber-700' : 'fa-unlock text-[#0B6B3A]'}`} />
                    <span>
                      {isReviewMode
                        ? 'Strict Read-Only Mode: All inputs and rubric selections are locked.'
                        : 'Edit Mode Active: Interview fields and qualitative rubric tiers are unlocked.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* REVIEW SUMMARY INTERVIEW MODE (STRICT READ-ONLY CONSOLIDATED VIEW) */}
              {isReviewMode ? (
                <fieldset disabled className="space-y-5 border-0 p-0 m-0 min-w-0">
                  {/* Strict Read-Only Lock Banner */}
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-lock text-amber-700 text-sm" />
                      <span>
                        <strong>Review Summary Interview (Read-Only):</strong> All interview responses, checkboxes, radio buttons, and rubric selections are locked. Switch back to <strong>Edit Form</strong> to modify any entry.
                      </span>
                    </div>
                  </div>

                  {/* 1. Consolidated Socioeconomic Rubric Scoring & Computed Eligibility Tier */}
                  <div className={`p-5 rounded-2xl border ${bannerColor} space-y-4 shadow-xs`}>
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#CBD5E1]/70">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#0B6B3A] text-white flex items-center justify-center text-sm font-bold">
                          <i className="fa-solid fa-scale-balanced" />
                        </div>
                        <div>
                          <h4 className="font-['Outfit'] font-bold text-sm text-[#10241A] m-0">
                            Socioeconomic Rubric Scoring Breakdown &amp; Computed Eligibility Tier
                          </h4>
                          <p className="text-[11px] text-[#475569] m-0">
                            Deterministic OFPHIL Dual-Rubric Calculation (Rubric v{backendEval?.rubric_version || '1.0'})
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeColor}`}>
                          MSW Tier: {mswClassification}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#0B6B3A] text-white">
                          {subsidyLevel}
                        </span>
                      </div>
                    </div>

                    {/* Score Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                      <div className="p-3 bg-white border border-[#CBD5E1] rounded-xl">
                        <div className="text-[10px] font-bold text-[#64748B] uppercase">Avg Severity</div>
                        <div className="text-lg font-extrabold text-[#0B6B3A] mt-0.5">
                          {backendEval?.is_complete ? averageSeverity.toFixed(2) : '—'}
                        </div>
                      </div>
                      <div className="p-3 bg-white border border-[#CBD5E1] rounded-xl">
                        <div className="text-[10px] font-bold text-[#64748B] uppercase">Avg Coping</div>
                        <div className="text-lg font-extrabold text-[#0284C7] mt-0.5">
                          {backendEval?.is_complete ? averageCoping.toFixed(2) : '—'}
                        </div>
                      </div>
                      <div className="p-3 bg-white border border-[#CBD5E1] rounded-xl">
                        <div className="text-[10px] font-bold text-[#64748B] uppercase">Total Risk</div>
                        <div className="text-lg font-extrabold text-[#0F766E] mt-0.5">
                          {backendEval?.is_complete ? `${totalRisk.toFixed(1)}%` : '—'}
                        </div>
                      </div>
                      <div className="p-3 bg-white border border-[#CBD5E1] rounded-xl">
                        <div className="text-[10px] font-bold text-[#64748B] uppercase">Monthly Income</div>
                        <div className="text-lg font-extrabold text-[#10241A] mt-0.5">
                          ₱{totalHouseholdIncome.toLocaleString()}
                        </div>
                      </div>
                      <div className="p-3 bg-white border border-[#CBD5E1] rounded-xl">
                        <div className="text-[10px] font-bold text-[#64748B] uppercase">Monthly Expenses</div>
                        <div className="text-lg font-extrabold text-rose-700 mt-0.5">
                          ₱{totalMonthlyExpenses.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Financial vs MSW Classification Side-by-Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-white border border-[#CBD5E1] space-y-1">
                        <div className="text-[10px] font-bold uppercase text-[#64748B]">
                          A. Financial Per Capita Rubric
                        </div>
                        <div className="font-bold text-sm text-[#10241A]">
                          {backendEval?.financial_classification?.classification_label || mswClassification}
                        </div>
                        <div className="text-[#475569]">
                          {backendEval?.financial_classification?.explanation ||
                            `Household Size: ${Math.max(1, familyMembers.length + 1)} member(s)`}
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-white border border-[#CBD5E1] space-y-1">
                        <div className="text-[10px] font-bold uppercase text-[#64748B]">
                          B. MSW Psychosocial &amp; Risk Rubric
                        </div>
                        <div className="font-bold text-sm text-[#0B6B3A]">
                          {mswClassification} ({subsidyLevel})
                        </div>
                        <div className="text-[#475569]">
                          {backendEval?.msw_classification?.explanation || 'Computed from DOH-PIE qualitative domains.'}
                        </div>
                      </div>
                    </div>

                    {/* Read-Only DOH-PIE Domain-by-Domain Rubric Breakdown Table */}
                    <div className="bg-white border border-[#CBD5E1] rounded-xl overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10.5px] uppercase text-[#475569]">
                            <th className="py-2.5 px-3">DOH-PIE Clinical Domain</th>
                            <th className="py-2.5 px-3">Severity Level</th>
                            <th className="py-2.5 px-3">Coping Level</th>
                            <th className="py-2.5 px-3">Patient Response</th>
                            <th className="py-2.5 px-3">MSW Observation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEF2EF]">
                          {healthFactors.map((hf, idx) => (
                            <tr key={`rev-hf-${idx}`}>
                              <td className="py-2 px-3 font-semibold text-[#10241A]">
                                V-{idx + 1}. {hf.factor}
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px] text-[#0B6B3A] font-bold">
                                {SEVERITY_LEVEL_OPTIONS.find((o) => o.value === hf.severityLevel)?.label || hf.severityLevel}
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px] text-[#0284C7] font-bold">
                                {COPING_LEVEL_OPTIONS.find((o) => o.value === hf.copingLevel)?.label || hf.copingLevel}
                              </td>
                              <td className="py-2 px-3 text-[#334155]">{hf.patientReported || '—'}</td>
                              <td className="py-2 px-3 text-[#14532D]">{hf.mswObservation || '—'}</td>
                            </tr>
                          ))}
                          <tr>
                            <td className="py-2 px-3 font-semibold text-[#10241A]">VI. Discrimination Burden</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-[#0B6B3A] font-bold">
                              {SEVERITY_LEVEL_OPTIONS.find((o) => o.value === discrimSeverityLevel)?.label || discrimSeverityLevel}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-[#0284C7] font-bold">
                              {COPING_LEVEL_OPTIONS.find((o) => o.value === discrimCopingLevel)?.label || discrimCopingLevel}
                            </td>
                            <td className="py-2 px-3 text-[#334155]">{discrimPatientReported || '—'}</td>
                            <td className="py-2 px-3 text-[#14532D]">{discrimMswObs || '—'}</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-semibold text-[#10241A]">VII. Safety / Hazards</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-[#0B6B3A] font-bold">
                              {SEVERITY_LEVEL_OPTIONS.find((o) => o.value === safetySeverityLevel)?.label || safetySeverityLevel}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-[#0284C7] font-bold">
                              {COPING_LEVEL_OPTIONS.find((o) => o.value === safetyCopingLevel)?.label || safetyCopingLevel}
                            </td>
                            <td className="py-2 px-3 text-[#334155]">{safetyPatientReported || '—'}</td>
                            <td className="py-2 px-3 text-[#14532D]">{safetyMswObs || '—'}</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-semibold text-[#10241A]">VIII. Social Roles</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-[#0B6B3A] font-bold">
                              {SEVERITY_LEVEL_OPTIONS.find((o) => o.value === roleSeverityLevel)?.label || roleSeverityLevel}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-[#0284C7] font-bold">
                              {COPING_LEVEL_OPTIONS.find((o) => o.value === roleCopingLevel)?.label || roleCopingLevel}
                            </td>
                            <td className="py-2 px-3 text-[#334155]">{rolePatientReported || '—'}</td>
                            <td className="py-2 px-3 text-[#14532D]">{roleMswObs || '—'}</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-semibold text-[#10241A]">IX. Environment &amp; Basic Needs</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-[#0B6B3A] font-bold">
                              {SEVERITY_LEVEL_OPTIONS.find((o) => o.value === envSeverityLevel)?.label || envSeverityLevel}
                            </td>
                            <td className="py-2 px-3 text-[11px] text-[#94A3B8]">N/A (Severity Only)</td>
                            <td className="py-2 px-3 text-[#334155]">{envPatientReported || '—'}</td>
                            <td className="py-2 px-3 text-[#14532D]">{envMswObs || '—'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 2. Consolidated Administrative, Clinical & Narrative Interview Summary */}
                  <div className="space-y-4 p-5 bg-white border border-[#CBD5E1] rounded-2xl shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#0B6B3A] text-white flex items-center justify-center text-sm font-bold">
                          <i className="fa-solid fa-file-invoice" />
                        </div>
                        <div>
                          <h4 className="font-['Outfit'] font-bold text-sm text-[#10241A] m-0">
                            Consolidated Interview Responses &amp; Clinical Casework Summary
                          </h4>
                          <p className="text-[11px] text-[#5A7466] m-0">
                            MSW No: <strong>{mswNumber}</strong> &bull; Assigned MSW: <strong>{assignedMsw}</strong> &bull; Date: <strong>{interviewDate}</strong> ({interviewStartTime} – {interviewEndTime})
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={consentObtained} disabled readOnly className="accent-[#0B6B3A]" />
                        <span className="font-semibold text-[#334155]">
                          Consent: {consentObtained ? 'Confirmed' : 'Pending'}
                        </span>
                      </div>
                    </div>

                    {/* Diagnostic & Clinical Profile Summary Strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-[#FAFBF8] border border-[#E2E8F0] text-xs">
                      <div>
                        <span className="block text-[10px] font-bold uppercase text-[#64748B]">Admitting / Final Diagnosis</span>
                        <strong className="text-[#10241A]">{finalDiagnosis || admittingDiagnosis || '—'}</strong>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold uppercase text-[#64748B]">Treatment Plan</span>
                        <strong className="text-[#10241A]">{presentTreatmentPlan || '—'}</strong>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold uppercase text-[#64748B]">Duration &amp; Prior Care</span>
                        <span className="text-[#334155]">{durationProblems || '—'} ({previousTreatment || 'None'})</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold uppercase text-[#64748B]">Estimated Surgical Cost</span>
                        <strong className="text-[#0B6B3A] font-mono">₱{Number(estimatedExpenses || 0).toLocaleString()}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Patient Disclosures Column */}
                      <div className="p-4 bg-[#F8FAFC] border border-blue-200 rounded-xl space-y-2.5">
                        <div className="flex items-center gap-2 text-blue-900 font-bold text-xs pb-2 border-b border-blue-200">
                          <i className="fa-solid fa-user-tag text-blue-600" />
                          <span>Patient / Representative Disclosed Responses</span>
                        </div>
                        <div className="text-xs space-y-2 text-[#334155]">
                          <div><strong className="text-slate-700">Interviewed Person:</strong> {interviewedPerson} {representativeRelationship ? `(${representativeRelationship})` : ''}</div>
                          <div><strong className="text-slate-700">Living Situation:</strong> {livingSituation || '—'}</div>
                          <div><strong className="text-slate-700">Household Composition:</strong> {householdComposition || '—'}</div>
                          <div><strong className="text-slate-700">Family Support:</strong> {familySupport || '—'}</div>
                          <div><strong className="text-slate-700">Employment &amp; Livelihood:</strong> {employmentSituation || '—'}</div>
                          <div><strong className="text-slate-700">Income Sources:</strong> {incomeSources || '—'}</div>
                          <div><strong className="text-slate-700">Medical Condition:</strong> {medicalConditionSummary || '—'}</div>
                          <div><strong className="text-slate-700">Financial Barriers:</strong> {financialBarriers || '—'}</div>
                          <div><strong className="text-slate-700">Stigma / Discrimination:</strong> {discriminationExperienced || '—'}</div>
                          <div><strong className="text-slate-700">Safety &amp; Fall Hazards:</strong> {safetyHazards || '—'}</div>
                          <div><strong className="text-slate-700">Coping Narrative:</strong> {copingCapacityNarrative || '—'}</div>
                        </div>
                      </div>

                      {/* MSW Observations Column */}
                      <div className="p-4 bg-[#F0FDF4] border border-emerald-200 rounded-xl space-y-2.5">
                        <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs pb-2 border-b border-emerald-200">
                          <i className="fa-solid fa-user-doctor text-emerald-600" />
                          <span>MSW Professional Clinical Observations</span>
                        </div>
                        <div className="text-xs space-y-2 text-[#14532D]">
                          <div><strong className="text-[#166534]">Interview Method:</strong> {interviewMethod.replace(/_/g, ' ')}</div>
                          <div><strong className="text-[#166534]">Living Quarters Finding:</strong> {livingSituationObs || '—'}</div>
                          <div><strong className="text-[#166534]">Dependents Vulnerability:</strong> {householdCompositionObs || '—'}</div>
                          <div><strong className="text-[#166534]">Caregiver Burden:</strong> {familySupportObs || '—'}</div>
                          <div><strong className="text-[#166534]">Productivity Loss:</strong> {employmentObs || '—'}</div>
                          <div><strong className="text-[#166534]">Financial Stability:</strong> {financialResponsibilitiesObs || '—'}</div>
                          <div><strong className="text-[#166534]">Clinical Urgency:</strong> {medicalConditionObs || '—'}</div>
                          <div><strong className="text-[#166534]">Subsidy Gap Analysis:</strong> {financialBarriersObs || '—'}</div>
                          <div><strong className="text-[#166534]">Discrimination Burden:</strong> {discriminationObs || '—'}</div>
                          <div><strong className="text-[#166534]">Domestic Trauma Risk:</strong> {safetyHazardsObs || '—'}</div>
                          <div><strong className="text-[#166534]">Resilience Index:</strong> {copingCapacityObs || '—'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </fieldset>
              ) : null}

              {isReviewMode && (
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReviewMode(false)}
                    className="px-4 py-2 rounded-xl bg-white border border-[#CBD5E1] text-xs font-bold text-[#334155] hover:bg-slate-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-pen-to-square text-[#0B6B3A]" />
                    <span>Switch to Edit Form</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStage(3)}
                    className="px-4 py-2 rounded-xl bg-[#0B6B3A] text-white text-xs font-bold hover:bg-[#064826] cursor-pointer"
                  >
                    Proceed to Supporting Documents (Stage 3) &rarr;
                  </button>
                </div>
              )}

              {/* EDIT FORM MODE (UNLOCKED FOR ACTIVE ENTRY; HIDDEN & LOCKED WHEN IN REVIEW SUMMARY MODE) */}
              {!isReviewMode && (
                <fieldset disabled={isReviewMode} className="space-y-6 border-0 p-0 m-0 min-w-0">
              {/* SECTION II-A: ADMINISTRATIVE INTERVIEW DETAILS */}
              <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#EEF2EF]">
                  <span className="font-bold text-xs text-[#0B6B3A] flex items-center gap-1.5 uppercase tracking-wide">
                    <i className="fa-solid fa-id-card-clip text-sm" />
                    <span>II-A. MSW Clinical Intake &amp; Interview Information</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase text-[#0B6B3A] bg-[#E8F5EC] px-2 py-0.5 rounded">
                    ADMINISTRATIVE DATA
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">MSW NUMBER *</label>
                    <input
                      type="text"
                      value={mswNumber}
                      readOnly
                      className="w-full h-8 px-2.5 font-mono font-bold text-[#0B6B3A] bg-[#FAFBF8] border border-[#CBD5E1] rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">ASSIGNED MSW *</label>
                    <input
                      type="text"
                      value={assignedMsw}
                      onChange={(e) => setAssignedMsw(e.target.value)}
                      className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded font-semibold text-[#10241A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">DATE OF INTERVIEW *</label>
                    <input
                      type="date"
                      value={interviewDate}
                      onChange={(e) => setInterviewDate(e.target.value)}
                      className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">START / END TIME</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={interviewStartTime}
                        onChange={(e) => setInterviewStartTime(e.target.value)}
                        placeholder="Start"
                        className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded text-[11px]"
                      />
                      <input
                        type="text"
                        value={interviewEndTime}
                        onChange={(e) => setInterviewEndTime(e.target.value)}
                        placeholder="End"
                        className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded text-[11px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-[#EEF2EF]">
                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">INTERVIEWED PERSON *</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setInterviewedPerson('PATIENT')}
                        className={`flex-1 h-8 rounded border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          interviewedPerson === 'PATIENT'
                            ? 'bg-[#0B6B3A] text-white border-[#0B6B3A]'
                            : 'bg-white text-[#475569] border-[#CBD5E1]'
                        }`}
                      >
                        <i className="fa-solid fa-user text-[10px]" />
                        <span>Patient</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInterviewedPerson('REPRESENTATIVE')}
                        className={`flex-1 h-8 rounded border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          interviewedPerson === 'REPRESENTATIVE'
                            ? 'bg-[#0B6B3A] text-white border-[#0B6B3A]'
                            : 'bg-white text-[#475569] border-[#CBD5E1]'
                        }`}
                      >
                        <i className="fa-solid fa-users text-[10px]" />
                        <span>Representative</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">
                      REPRESENTATIVE RELATIONSHIP {interviewedPerson === 'REPRESENTATIVE' ? '*' : '(IF APPLICABLE)'}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Spouse / Eldest Daughter / Sibling"
                      value={representativeRelationship}
                      onChange={(e) => setRepresentativeRelationship(e.target.value)}
                      disabled={interviewedPerson === 'PATIENT'}
                      className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">INTERVIEW METHOD *</label>
                    <select
                      value={interviewMethod}
                      onChange={(e: any) => setInterviewMethod(e.target.value)}
                      className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded font-semibold text-[#10241A]"
                    >
                      <option value="FACE_TO_FACE">Face-to-Face (Eye Center Clinic)</option>
                      <option value="TELECONSULTATION">Teleconsultation / Video Intake</option>
                      <option value="HOSPITAL_BEDSIDE">Hospital Bedside Intake</option>
                      <option value="HOME_VISIT">Home Visit / Field Casework</option>
                    </select>
                  </div>
                </div>

                {/* Consent & Acknowledgment Status */}
                <div className="p-3 bg-[#FAFBF8] border border-[#E2E8F0] rounded-lg text-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="consentCheck"
                      checked={consentObtained}
                      onChange={(e) => setConsentObtained(e.target.checked)}
                      className="w-4 h-4 text-[#0B6B3A] border-[#CBD5E1] rounded focus:ring-0"
                    />
                    <label htmlFor="consentCheck" className="font-bold text-[#10241A] cursor-pointer">
                      Informed Social Work Consent, Voluntary Disclosure &amp; Data Privacy Acknowledgment Confirmed
                    </label>
                  </div>
                  <input
                    type="text"
                    value={consentNotes}
                    onChange={(e) => setConsentNotes(e.target.value)}
                    placeholder="Consent documentation reference or patient acknowledgment notes..."
                    className="w-full h-7 px-2.5 bg-white border border-[#CBD5E1] rounded text-[11px]"
                  />
                </div>
              </div>

              {/* SECTION II-B: PATIENT & FAMILY BACKGROUND (SEPARATED RESPONSES & MSW OBSERVATIONS) */}
              <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#EEF2EF]">
                  <div>
                    <span className="font-bold text-xs text-[#0B6B3A] flex items-center gap-1.5 uppercase tracking-wide">
                      <i className="fa-solid fa-people-roof text-sm" />
                      <span>II-B. Patient &amp; Family Background</span>
                    </span>
                    <p className="text-[11px] text-[#5A7466] mt-0.5 mb-0">
                      Dual-source documentation: Left column records patient disclosures; right column records verified clinical observations.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    INTERVIEW DUAL-PANEL
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Living Situation */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border border-blue-100 bg-blue-50/40 space-y-1">
                      <label className="block text-[10.5px] font-bold text-blue-900 uppercase">
                        1. Living Situation (Patient Disclosure)
                      </label>
                      <textarea
                        rows={2}
                        value={livingSituation}
                        onChange={(e) => setLivingSituation(e.target.value)}
                        placeholder="Patient description of home dwelling, ownership, tenancy, condition..."
                        className="w-full p-2 bg-white border border-[#CBD5E1] rounded text-xs"
                      />
                    </div>
                    <div className="p-3 rounded-lg border border-emerald-100 bg-[#F0FDF4]/50 space-y-1">
                      <label className="block text-[10.5px] font-bold text-[#14532D] uppercase">
                        MSW Clinical Observation &amp; Verification
                      </label>
                      <textarea
                        rows={2}
                        value={livingSituationObs}
                        onChange={(e) => setLivingSituationObs(e.target.value)}
                        placeholder="Objective findings, barangay verification, physical environment notes..."
                        className="w-full p-2 bg-white border border-[#CBD5E1] rounded text-xs"
                      />
                    </div>
                  </div>

                  {/* Household Composition */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border border-blue-100 bg-blue-50/40 space-y-1">
                      <label className="block text-[10.5px] font-bold text-blue-900 uppercase">
                        2. Household Composition &amp; Dependents (Patient Disclosure)
                      </label>
                      <textarea
                        rows={2}
                        value={householdComposition}
                        onChange={(e) => setHouseholdComposition(e.target.value)}
                        placeholder="Members residing in household, school-age children, elderly dependents..."
                        className="w-full p-2 bg-white border border-[#CBD5E1] rounded text-xs"
                      />
                    </div>
                    <div className="p-3 rounded-lg border border-emerald-100 bg-[#F0FDF4]/50 space-y-1">
                      <label className="block text-[10.5px] font-bold text-[#14532D] uppercase">
                        MSW Clinical Observation &amp; Dependent Risk
                      </label>
                      <textarea
                        rows={2}
                        value={householdCompositionObs}
                        onChange={(e) => setHouseholdCompositionObs(e.target.value)}
                        placeholder="Assessment of family dependency ratio, vulnerable minor protection..."
                        className="w-full p-2 bg-white border border-[#CBD5E1] rounded text-xs"
                      />
                    </div>
                  </div>

                  {/* Family Support */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border border-blue-100 bg-blue-50/40 space-y-1">
                      <label className="block text-[10.5px] font-bold text-blue-900 uppercase">
                        3. Family Support System (Patient Disclosure)
                      </label>
                      <textarea
                        rows={2}
                        value={familySupport}
                        onChange={(e) => setFamilySupport(e.target.value)}
                        placeholder="Available caregiver assistance, family members assisting with mobility..."
                        className="w-full p-2 bg-white border border-[#CBD5E1] rounded text-xs"
                      />
                    </div>
                    <div className="p-3 rounded-lg border border-emerald-100 bg-[#F0FDF4]/50 space-y-1">
                      <label className="block text-[10.5px] font-bold text-[#14532D] uppercase">
                        MSW Clinical Observation &amp; Caregiver Burden
                      </label>
                      <textarea
                        rows={2}
                        value={familySupportObs}
                        onChange={(e) => setFamilySupportObs(e.target.value)}
                        placeholder="Observed caregiver stress, psychological bandwidth, mobility accompaniment..."
                        className="w-full p-2 bg-white border border-[#CBD5E1] rounded text-xs"
                      />
                    </div>
                  </div>

                  {/* Current Employment */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border border-blue-100 bg-blue-50/40 space-y-1">
                      <label className="block text-[10.5px] font-bold text-blue-900 uppercase">
                        4. Current Employment &amp; Livelihood (Patient Disclosure)
                      </label>
                      <textarea
                        rows={2}
                        value={employmentSituation}
                        onChange={(e) => setEmploymentSituation(e.target.value)}
                        placeholder="Current employment status, informal jobs, daily wage, impact of blindness..."
                        className="w-full p-2 bg-white border border-[#CBD5E1] rounded text-xs"
                      />
                    </div>
                    <div className="p-3 rounded-lg border border-emerald-100 bg-[#F0FDF4]/50 space-y-1">
                      <label className="block text-[10.5px] font-bold text-[#14532D] uppercase">
                        MSW Clinical Observation &amp; Productivity Loss
                      </label>
                      <textarea
                        rows={2}
                        value={employmentObs}
                        onChange={(e) => setEmploymentObs(e.target.value)}
                        placeholder="Evaluation of work incapacity directly attributable to ocular disability..."
                        className="w-full p-2 bg-white border border-[#CBD5E1] rounded text-xs"
                      />
                    </div>
                  </div>

                  {/* Income Sources & Financial Responsibilities */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border border-blue-100 bg-blue-50/40 space-y-1">
                      <label className="block text-[10.5px] font-bold text-blue-900 uppercase">
                        5. Income Sources &amp; Responsibilities (Patient Disclosure)
                      </label>
                      <textarea
                        rows={2}
                        value={incomeSources}
                        onChange={(e) => setIncomeSources(e.target.value)}
                        placeholder="Reported earnings, informal assistance, debts, rent obligations..."
                        className="w-full p-2 bg-white border border-[#CBD5E1] rounded text-xs"
                      />
                    </div>
                    <div className="p-3 rounded-lg border border-emerald-100 bg-[#F0FDF4]/50 space-y-1">
                      <label className="block text-[10.5px] font-bold text-[#14532D] uppercase">
                        MSW Clinical Observation &amp; Financial Stability
                      </label>
                      <textarea
                        rows={2}
                        value={financialResponsibilitiesObs}
                        onChange={(e) => setFinancialResponsibilitiesObs(e.target.value)}
                        placeholder="Verified per capita threshold, food security risk, emergency liquidity..."
                        className="w-full p-2 bg-white border border-[#CBD5E1] rounded text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION II-C: MEDICAL & FINANCIAL DIFFICULTIES */}
              <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#EEF2EF]">
                  <span className="font-bold text-xs text-[#0B6B3A] flex items-center gap-1.5 uppercase tracking-wide">
                    <i className="fa-solid fa-hand-holding-dollar text-sm" />
                    <span>II-C. Medical &amp; Financial Difficulties</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase text-[#0B6B3A] bg-[#E8F5EC] px-2 py-0.5 rounded">
                    TREATMENT BARRIERS
                  </span>
                </div>

                {/* Referral Cost & Socioeconomic Balance Reference */}
                {activeReferral && (
                  <div className="p-3.5 rounded-xl bg-[#F8FBF9] border border-[#D5E2D9] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-[#10241A] flex items-center gap-2">
                        <i className="fa-solid fa-scale-balanced text-[#0B6B3A]" />
                        <span>Clinical Referral Quotation vs. Household Financial Capacity</span>
                      </div>
                      <span className="font-mono font-extrabold text-[#0B6B3A] text-sm">
                        Total Medical Quotation: ₱{Number(activeReferral.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-[#E2ECE5] text-[11px]">
                      <div>
                        <span className="text-[#64748B]">Monthly Household Income:</span>{' '}
                        <strong className="text-[#10241A]">₱{totalHouseholdIncome.toLocaleString()}</strong>
                      </div>
                      <div>
                        <span className="text-[#64748B]">Quotation vs. Monthly Income:</span>{' '}
                        <strong className="text-amber-700">
                          {totalHouseholdIncome > 0
                            ? `${((Number(activeReferral.total || 0) / totalHouseholdIncome) * 100).toFixed(0)}% of monthly earnings`
                            : 'Exceeds household earnings (100%+)'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#64748B]">Attending Surgeon:</span>{' '}
                        <strong className="text-[#10241A]">{activeReferral.attending_doctor || 'Attending Doctor'}</strong>
                      </div>
                    </div>
                    {Array.isArray(activeReferral.particulars) && activeReferral.particulars.length > 0 && (
                      <div className="pt-1.5">
                        <div className="text-[10px] font-bold uppercase text-[#5A7466] mb-1">Itemized Surgical Quotation:</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {activeReferral.particulars.map((pt: any, idx: number) => (
                            <div key={idx} className="flex justify-between bg-white px-2 py-1 rounded border border-[#E2ECE5] text-[11px]">
                              <span className="text-[#334155]">{pt.description}</span>
                              <span className="font-mono font-semibold text-[#0B6B3A]">₱{Number(pt.amount || 0).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-blue-100 bg-blue-50/40 space-y-1">
                    <label className="block text-[10.5px] font-bold text-blue-900 uppercase">
                      Current Medical Condition (Patient Disclosure)
                    </label>
                    <textarea
                      rows={2}
                      value={medicalConditionSummary}
                      onChange={(e) => setMedicalConditionSummary(e.target.value)}
                      placeholder="Symptoms, vision loss impact on daily tasks..."
                      className="w-full p-2 bg-white border border-[#CBD5E1] rounded text-xs"
                    />
                  </div>
                  <div className="p-3 rounded-lg border border-emerald-100 bg-[#F0FDF4]/50 space-y-1">
                    <label className="block text-[10.5px] font-bold text-[#14532D] uppercase">
                      MSW Clinical Observation &amp; Urgent Procedure Need
                    </label>
                    <textarea
                      rows={2}
                      value={medicalConditionObs}
                      onChange={(e) => setMedicalConditionObs(e.target.value)}
                      placeholder="Clinical referral cross-check, surgical urgency..."
                      className="w-full p-2 bg-white border border-[#CBD5E1] rounded text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-2 border-t border-[#EEF2EF]">
                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">DURATION OF PROBLEM</label>
                    <input
                      type="text"
                      value={durationProblems}
                      onChange={(e) => setDurationProblems(e.target.value)}
                      placeholder="e.g. 2 years progressive blurring"
                      className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">PREVIOUS TREATMENT</label>
                    <input
                      type="text"
                      value={previousTreatment}
                      onChange={(e) => setPreviousTreatment(e.target.value)}
                      placeholder="e.g. OTC eyedrops"
                      className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">ESTIMATED EXPENSES (PHP)</label>
                    <input
                      type="text"
                      value={estimatedExpenses}
                      onChange={(e) => setEstimatedExpenses(e.target.value)}
                      placeholder="e.g. 11600"
                      className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded font-bold text-[#0B6B3A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-blue-100 bg-blue-50/40 space-y-1">
                    <label className="block text-[10.5px] font-bold text-blue-900 uppercase">
                      Financial Barriers to Treatment (Patient Disclosure)
                    </label>
                    <textarea
                      rows={2}
                      value={financialBarriers}
                      onChange={(e) => setFinancialBarriers(e.target.value)}
                      placeholder="Inability to pay hospital fees, lens costs, transportation..."
                      className="w-full p-2 bg-white border border-[#CBD5E1] rounded text-xs"
                    />
                  </div>
                  <div className="p-3 rounded-lg border border-emerald-100 bg-[#F0FDF4]/50 space-y-1">
                    <label className="block text-[10.5px] font-bold text-[#14532D] uppercase">
                      MSW Clinical Observation &amp; Subsidy Gap
                    </label>
                    <textarea
                      rows={2}
                      value={financialBarriersObs}
                      onChange={(e) => setFinancialBarriersObs(e.target.value)}
                      placeholder="Out-of-pocket proportion relative to total monthly income..."
                      className="w-full p-2 bg-white border border-[#CBD5E1] rounded text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION II-D: PSYCHOSOCIAL CIRCUMSTANCES */}
              <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#EEF2EF]">
                  <span className="font-bold text-xs text-[#0B6B3A] flex items-center gap-1.5 uppercase tracking-wide">
                    <i className="fa-solid fa-brain text-sm" />
                    <span>II-D. Psychosocial Circumstances</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase text-[#0B6B3A] bg-[#E8F5EC] px-2 py-0.5 rounded">
                    COPING &amp; RESILIENCE
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-blue-100 bg-blue-50/40 space-y-1">
                    <label className="block text-[10.5px] font-bold text-blue-900 uppercase">
                      Stigma / Discrimination Experiences (Patient Disclosure)
                    </label>
                    <textarea
                      rows={2}
                      value={discriminationExperienced}
                      onChange={(e) => setDiscriminationExperienced(e.target.value)}
                      placeholder="Work refusal, social isolation due to visible cataract..."
                      className="w-full p-2 bg-white border border-[#CBD5E1] rounded text-xs"
                    />
                  </div>
                  <div className="p-3 rounded-lg border border-emerald-100 bg-[#F0FDF4]/50 space-y-1">
                    <label className="block text-[10.5px] font-bold text-[#14532D] uppercase">
                      MSW Clinical Observation &amp; Discrimination Burden
                    </label>
                    <textarea
                      rows={2}
                      value={discriminationObs}
                      onChange={(e) => setDiscriminationObs(e.target.value)}
                      placeholder="Observed psychological withdrawal, employment marginalization..."
                      className="w-full p-2 bg-white border border-[#CBD5E1] rounded text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-blue-100 bg-blue-50/40 space-y-1">
                    <label className="block text-[10.5px] font-bold text-blue-900 uppercase">
                      Safety Concerns &amp; Fall Hazards (Patient Disclosure)
                    </label>
                    <textarea
                      rows={2}
                      value={safetyHazards}
                      onChange={(e) => setSafetyHazards(e.target.value)}
                      placeholder="Stumbling, cooking hazards, difficulty with stairs/paths..."
                      className="w-full p-2 bg-white border border-[#CBD5E1] rounded text-xs"
                    />
                  </div>
                  <div className="p-3 rounded-lg border border-emerald-100 bg-[#F0FDF4]/50 space-y-1">
                    <label className="block text-[10.5px] font-bold text-[#14532D] uppercase">
                      MSW Clinical Observation &amp; Domestic Trauma Risk
                    </label>
                    <textarea
                      rows={2}
                      value={safetyHazardsObs}
                      onChange={(e) => setSafetyHazardsObs(e.target.value)}
                      placeholder="Physical safety hazards without bilateral stereoscopic restoration..."
                      className="w-full p-2 bg-white border border-[#CBD5E1] rounded text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-blue-100 bg-blue-50/40 space-y-1">
                    <label className="block text-[10.5px] font-bold text-blue-900 uppercase">
                      Coping Capacity Narrative (Patient Disclosure)
                    </label>
                    <textarea
                      rows={2}
                      value={copingCapacityNarrative}
                      onChange={(e) => setCopingCapacityNarrative(e.target.value)}
                      placeholder="Emotional coping, faith, family encouragement, daily struggle..."
                      className="w-full p-2 bg-white border border-[#CBD5E1] rounded text-xs"
                    />
                  </div>
                  <div className="p-3 rounded-lg border border-emerald-100 bg-[#F0FDF4]/50 space-y-1">
                    <label className="block text-[10.5px] font-bold text-[#14532D] uppercase">
                      MSW Clinical Observation &amp; Resilience Index
                    </label>
                    <textarea
                      rows={2}
                      value={copingCapacityObs}
                      onChange={(e) => setCopingCapacityObs(e.target.value)}
                      placeholder="Emotional orientation, motivation to regain independence and work..."
                      className="w-full p-2 bg-white border border-[#CBD5E1] rounded text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION IV: MEDICAL DATA */}
              <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#EEF2EF]">
                  <span className="font-bold text-xs text-[#0B6B3A] flex items-center gap-1.5 uppercase tracking-wide">
                    <i className="fa-solid fa-stethoscope text-sm" />
                    <span>IV. Medical Data (Diagnostic Profile)</span>
                  </span>
                  <span className="text-[11px] text-[#94A3B8]">Clinical Reference</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1">ADMITTING DIAGNOSIS</label>
                    <input
                      type="text"
                      value={admittingDiagnosis}
                      onChange={(e) => setAdmittingDiagnosis(e.target.value)}
                      className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1">FINAL DIAGNOSIS</label>
                    <input
                      type="text"
                      value={finalDiagnosis}
                      onChange={(e) => setFinalDiagnosis(e.target.value)}
                      className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1">PRESENT TREATMENT PLAN</label>
                    <input
                      type="text"
                      value={presentTreatmentPlan}
                      onChange={(e) => setPresentTreatmentPlan(e.target.value)}
                      className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1">HEALTH ACCESSIBILITY PROBLEM</label>
                    <input
                      type="text"
                      value={healthAccessibilityProblem}
                      onChange={(e) => setHealthAccessibilityProblem(e.target.value)}
                      placeholder="e.g. High cost of surgical consumables and lack of local facility"
                      className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* LIVE DOH-PIE COMPOSITE SCORING & MSW CLASSIFICATION DASHBOARD (100% API CALCULATED) */}
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
                        Deterministically calculated by backend API using approved OFPHIL qualitative rubric mappings
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {backendEval?.is_complete ? (
                      <>
                        <span className="text-[11px] font-bold text-[#14532D]">MSW Classification:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeColor} shadow-2xs`}>
                          {mswClassification}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#0B6B3A] text-white shadow-2xs">
                          {subsidyLevel}
                        </span>
                      </>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs flex items-center gap-1.5">
                        <i className="fa-solid fa-triangle-exclamation text-amber-600" />
                        <span>ASSESSMENT INCOMPLETE — CLASSIFICATION PENDING</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Incomplete assessment warning alert */}
                {backendEval && !backendEval.is_complete && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5">
                      <i className="fa-solid fa-circle-exclamation text-amber-600" />
                      <span>The following required interview or rubric factors are pending completion:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(backendEval.missing_factors || []).map((mf: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-white border border-amber-300 text-amber-800 text-[10.5px] font-semibold">
                          {mf}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10.5px] text-amber-700 m-0 pt-1">
                      OFPHIL institutional policy prohibits fabricating or manually calculating scores. Complete the qualitative options below to generate official classification.
                    </p>
                  </div>
                )}

                {/* 4 Metric Cards (API-calculated) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-white border border-[#CBD5E1] rounded-xl shadow-2xs">
                    <div className="text-[10px] font-bold text-[#64748B] uppercase">Average Severity</div>
                    <div className="text-xl font-extrabold text-[#0B6B3A] my-0.5">
                      {backendEval?.is_complete ? averageSeverity.toFixed(2) : '—'}
                    </div>
                    <div className="text-[10px] text-[#94A3B8]">Threshold &ge; 3.8 / 2.8</div>
                  </div>

                  <div className="p-3 bg-white border border-[#CBD5E1] rounded-xl shadow-2xs">
                    <div className="text-[10px] font-bold text-[#64748B] uppercase">Average Coping</div>
                    <div className="text-xl font-extrabold text-[#0284C7] my-0.5">
                      {backendEval?.is_complete ? averageCoping.toFixed(2) : '—'}
                    </div>
                    <div className="text-[10px] text-[#94A3B8]">Threshold &ge; 3.8 / 2.8</div>
                  </div>

                  <div className="p-3 bg-white border border-[#CBD5E1] rounded-xl shadow-2xs">
                    <div className="text-[10px] font-bold text-[#64748B] uppercase">Total Risk Score</div>
                    <div className="text-xl font-extrabold text-[#0F766E] my-0.5">
                      {backendEval?.is_complete ? `${totalRisk.toFixed(1)}%` : '—'}
                    </div>
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

              {/* V. HEALTH (PHYSICAL & MENTAL HEALTH SERVICES / ACCESS) - QUALITATIVE OPTIONS */}
              <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#EEF2EF]">
                  <span className="font-bold text-xs text-[#0B6B3A] flex items-center gap-1.5 uppercase tracking-wide">
                    <i className="fa-solid fa-heart-pulse text-sm" />
                    <span>V. HEALTH (PHYSICAL &amp; MENTAL HEALTH SERVICES / ACCESS)</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase text-[#0B6B3A] bg-[#E8F5EC] px-2 py-0.5 rounded">
                    QUALITATIVE CLINICAL TIERS
                  </span>
                </div>

                <div className="space-y-4">
                  {healthFactors.map((hf, i) => (
                    <div key={i} className="p-3.5 bg-[#FAFBF8] border border-[#CBD5E1] rounded-xl space-y-3">
                      <div className="font-semibold text-xs text-[#1E293B] flex items-center justify-between">
                        <span>{i + 1}. {hf.factor}</span>
                        <span className="text-[10px] text-[#64748B] font-normal">DOH-PIE Clinical Factor</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-[#0B6B3A] uppercase mb-1">
                            Severity Tier (Qualitative) *
                          </label>
                          <select
                            value={hf.severityLevel}
                            onChange={(e) => {
                              const updated = [...healthFactors];
                              updated[i].severityLevel = e.target.value;
                              setHealthFactors(updated);
                            }}
                            className="w-full h-8 px-2 border border-[#CBD5E1] rounded text-xs bg-white font-bold text-[#0B6B3A]"
                          >
                            {SEVERITY_LEVEL_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[#0284C7] uppercase mb-1">
                            Coping Tier (Qualitative) *
                          </label>
                          <select
                            value={hf.copingLevel}
                            onChange={(e) => {
                              const updated = [...healthFactors];
                              updated[i].copingLevel = e.target.value;
                              setHealthFactors(updated);
                            }}
                            className="w-full h-8 px-2 border border-[#CBD5E1] rounded text-xs bg-white font-bold text-[#0284C7]"
                          >
                            {COPING_LEVEL_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-blue-900 uppercase mb-0.5">
                            Patient / Representative Response
                          </label>
                          <input
                            type="text"
                            value={hf.patientReported}
                            onChange={(e) => {
                              const updated = [...healthFactors];
                              updated[i].patientReported = e.target.value;
                              setHealthFactors(updated);
                            }}
                            placeholder="Reported accessibility barrier or difficulty..."
                            className="w-full h-8 px-2.5 border border-[#CBD5E1] rounded text-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[#14532D] uppercase mb-0.5">
                            MSW Clinical Observation &amp; Evidence
                          </label>
                          <input
                            type="text"
                            value={hf.mswObservation}
                            onChange={(e) => {
                              const updated = [...healthFactors];
                              updated[i].mswObservation = e.target.value;
                              setHealthFactors(updated);
                            }}
                            placeholder="Clinical finding, referral cross-check..."
                            className="w-full h-8 px-2.5 border border-[#CBD5E1] rounded text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* VI to IX SUBTOPIC ADJUSTERS - QUALITATIVE OPTIONS */}
              <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#EEF2EF]">
                  <span className="font-bold text-xs text-[#0B6B3A] flex items-center gap-1.5 uppercase tracking-wide">
                    <i className="fa-solid fa-layer-group text-sm" />
                    <span>VI to IX. Psychosocial Domains (Qualitative Tiers &amp; Dual Observations)</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase text-[#0B6B3A] bg-[#E8F5EC] px-2 py-0.5 rounded">
                    INTERVIEW RUBRIC
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* VI. Discrimination Burden */}
                  <div className="p-3.5 bg-[#FAFBF8] border border-[#CBD5E1] rounded-xl space-y-2.5">
                    <div className="font-bold text-xs text-[#1E293B]">VI. Discrimination Burden</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9.5px] font-bold text-[#0B6B3A] uppercase mb-1">Severity</label>
                        <select
                          value={discrimSeverityLevel}
                          onChange={(e) => setDiscrimSeverityLevel(e.target.value)}
                          className="w-full h-8 px-2 border border-[#CBD5E1] rounded text-[11px] font-bold text-[#0B6B3A] bg-white"
                        >
                          {SEVERITY_LEVEL_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9.5px] font-bold text-[#0284C7] uppercase mb-1">Coping</label>
                        <select
                          value={discrimCopingLevel}
                          onChange={(e) => setDiscrimCopingLevel(e.target.value)}
                          className="w-full h-8 px-2 border border-[#CBD5E1] rounded text-[11px] font-bold text-[#0284C7] bg-white"
                        >
                          {COPING_LEVEL_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <input
                        type="text"
                        value={discrimPatientReported}
                        onChange={(e) => setDiscrimPatientReported(e.target.value)}
                        placeholder="Patient reported discrimination..."
                        className="w-full h-7 px-2 border border-[#CBD5E1] rounded text-[11px] bg-white"
                      />
                      <input
                        type="text"
                        value={discrimMswObs}
                        onChange={(e) => setDiscrimMswObs(e.target.value)}
                        placeholder="MSW clinical observation..."
                        className="w-full h-7 px-2 border border-[#CBD5E1] rounded text-[11px] bg-white"
                      />
                    </div>
                  </div>

                  {/* VII. Safety / Hazards */}
                  <div className="p-3.5 bg-[#FAFBF8] border border-[#CBD5E1] rounded-xl space-y-2.5">
                    <div className="font-bold text-xs text-[#1E293B]">VII. Safety / Hazards</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9.5px] font-bold text-[#0B6B3A] uppercase mb-1">Severity</label>
                        <select
                          value={safetySeverityLevel}
                          onChange={(e) => setSafetySeverityLevel(e.target.value)}
                          className="w-full h-8 px-2 border border-[#CBD5E1] rounded text-[11px] font-bold text-[#0B6B3A] bg-white"
                        >
                          {SEVERITY_LEVEL_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9.5px] font-bold text-[#0284C7] uppercase mb-1">Coping</label>
                        <select
                          value={safetyCopingLevel}
                          onChange={(e) => setSafetyCopingLevel(e.target.value)}
                          className="w-full h-8 px-2 border border-[#CBD5E1] rounded text-[11px] font-bold text-[#0284C7] bg-white"
                        >
                          {COPING_LEVEL_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <input
                        type="text"
                        value={safetyPatientReported}
                        onChange={(e) => setSafetyPatientReported(e.target.value)}
                        placeholder="Patient reported safety risks..."
                        className="w-full h-7 px-2 border border-[#CBD5E1] rounded text-[11px] bg-white"
                      />
                      <input
                        type="text"
                        value={safetyMswObs}
                        onChange={(e) => setSafetyMswObs(e.target.value)}
                        placeholder="MSW domestic hazard observation..."
                        className="w-full h-7 px-2 border border-[#CBD5E1] rounded text-[11px] bg-white"
                      />
                    </div>
                  </div>

                  {/* VIII. Social Roles */}
                  <div className="p-3.5 bg-[#FAFBF8] border border-[#CBD5E1] rounded-xl space-y-2.5">
                    <div className="font-bold text-xs text-[#1E293B]">VIII. Social Roles</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9.5px] font-bold text-[#0B6B3A] uppercase mb-1">Severity</label>
                        <select
                          value={roleSeverityLevel}
                          onChange={(e) => setRoleSeverityLevel(e.target.value)}
                          className="w-full h-8 px-2 border border-[#CBD5E1] rounded text-[11px] font-bold text-[#0B6B3A] bg-white"
                        >
                          {SEVERITY_LEVEL_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9.5px] font-bold text-[#0284C7] uppercase mb-1">Coping</label>
                        <select
                          value={roleCopingLevel}
                          onChange={(e) => setRoleCopingLevel(e.target.value)}
                          className="w-full h-8 px-2 border border-[#CBD5E1] rounded text-[11px] font-bold text-[#0284C7] bg-white"
                        >
                          {COPING_LEVEL_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <input
                        type="text"
                        value={rolePatientReported}
                        onChange={(e) => setRolePatientReported(e.target.value)}
                        placeholder="Patient role strain disclosure..."
                        className="w-full h-7 px-2 border border-[#CBD5E1] rounded text-[11px] bg-white"
                      />
                      <input
                        type="text"
                        value={roleMswObs}
                        onChange={(e) => setRoleMswObs(e.target.value)}
                        placeholder="MSW breadwinner role strain observation..."
                        className="w-full h-7 px-2 border border-[#CBD5E1] rounded text-[11px] bg-white"
                      />
                    </div>
                  </div>

                  {/* IX. Environment Basic Needs */}
                  <div className="p-3.5 bg-[#FAFBF8] border border-[#CBD5E1] rounded-xl space-y-2.5">
                    <div className="font-bold text-xs text-[#1E293B]">IX. Environment &amp; Basic Needs</div>
                    <div>
                      <label className="block text-[9.5px] font-bold text-[#0B6B3A] uppercase mb-1">
                        Severity (Basic Needs Barrier)
                      </label>
                      <select
                        value={envSeverityLevel}
                        onChange={(e) => setEnvSeverityLevel(e.target.value)}
                        className="w-full h-8 px-2 border border-[#CBD5E1] rounded text-[11px] font-bold text-[#0B6B3A] bg-white"
                      >
                        {SEVERITY_LEVEL_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <input
                        type="text"
                        value={envPatientReported}
                        onChange={(e) => setEnvPatientReported(e.target.value)}
                        placeholder="Patient basic needs dwelling report..."
                        className="w-full h-7 px-2 border border-[#CBD5E1] rounded text-[11px] bg-white"
                      />
                      <input
                        type="text"
                        value={envMswObs}
                        onChange={(e) => setEnvMswObs(e.target.value)}
                        placeholder="MSW living condition observation..."
                        className="w-full h-7 px-2 border border-[#CBD5E1] rounded text-[11px] bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
                </fieldset>
              )}
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
                    {verifiedDocsCount} / 4 VERIFIED
                  </span>
                </div>
              </div>

              {/* Grid of 4 Required Documents */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { id: '1. SIGNED CERTIFICATE OF INDIGENCY', key: 'SIGNED CERTIFICATE OF INDIGENCY', sub: 'From City Hall / MSWDO / Barangay' },
                  { id: '2. GOVERNMENT ISSUED ID', key: 'GOVERNMENT ISSUED ID', sub: 'PhilSys National ID, Senior Citizen, UMID, Driver’s License, Voter’s' },
                  { id: '3. ELECTRICITY BILL', key: 'ELECTRICITY BILL', sub: 'Recent Meralco or provincial cooperative power bill' },
                  { id: '4. WATER BILL', key: 'WATER BILL', sub: 'Recent Manila Water / Maynilad / Local Water District bill' },
                ].map((doc) => (
                  <div key={doc.id} className="p-3.5 rounded-xl border border-[#CBD5E1] bg-white space-y-2">
                    <div className="font-bold text-[11px] text-[#1E293B] leading-snug">{doc.id}</div>
                    <div className="text-[10.5px] text-[#64748B] line-clamp-2 leading-relaxed">{doc.sub}</div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#EEF2EF]">
                      <select
                        value={docStatuses[doc.key] || docStatuses[doc.id] || 'Pending'}
                        onChange={(e) =>
                          setDocStatuses({
                            ...docStatuses,
                            [doc.key]: e.target.value as any,
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

              {/* REAL DOCUMENT AUTHENTICITY & VERIFICATION UPLOAD QUEUE */}
              <div className="p-4 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-xs text-[#10241A]">
                      Document Authenticity &amp; Verification — Secure Upload, OCR &amp; Forensics
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
                      <option value="SIGNED CERTIFICATE OF INDIGENCY">1. Certificate of Indigency</option>
                      <option value="GOVERNMENT ISSUED ID">2. Government Issued ID</option>
                      <option value="ELECTRICITY BILL">3. Electricity Bill</option>
                      <option value="WATER BILL">4. Water Bill</option>
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
                      <strong>Checklist Verified:</strong> {verifiedDocsCount} / 4 items
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
