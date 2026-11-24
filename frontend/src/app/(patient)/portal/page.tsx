'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PatientAppShell from '@/components/PatientAppShell';
import { useAuth } from '@/context/AuthContext';
import { fetchApi, API_BASE_URL } from '@/lib/api';
import { toast } from 'sonner';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';
import PsgcAddressSelector from '@/components/PsgcAddressSelector';
import ProfilePasswordChangeCard from '@/components/ProfilePasswordChangeCard';
import SecureContactChangeModal, { ContactChangeType } from '@/components/SecureContactChangeModal';

interface PatientState {
  name: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  birthdate: string;
  civil_status: string;
  num_dependents: string;
  perm_province: string;
  perm_city: string;
  perm_barangay: string;
  perm_street: string;
  educational_attainment: string;
  employment_status: string;
  occupation: string;
  username: string;
  patient_id: string;
  sex: string;
  age: number | null;
  residence: string;
  contact: string;
  email: string;
  category: string;
  status: string;
  [key: string]: any;
}

function PatientPortalContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { user } = useAuth();
  const [contactModalType, setContactModalType] = useState<ContactChangeType | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'applications' | 'charity-status' | 'appointments' | 'notifications' | 'profile' | 'settings'>('dashboard');
  const [charityStatusData, setCharityStatusData] = useState<any | null>(null);
  const [charityStatusLoading, setCharityStatusLoading] = useState(false);
  const [charityStatusError, setCharityStatusError] = useState<string | null>(null);
  const [charityDocPreview, setCharityDocPreview] = useState<{ name: string; url: string; type: 'pdf' | 'image' } | null>(null);
  const [apptHistoryFilter, setApptHistoryFilter] = useState<'all' | 'Scheduled' | 'Pending Nurse Approval' | 'Completed' | 'Cancelled'>('all');
  const [apptHistorySearch, setApptHistorySearch] = useState('');
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [readNotifIds, setReadNotifIds] = useState<string[]>([]);
  const [patientNotifPage, setPatientNotifPage] = useState(1);
  const patientNotifPageSize = 10;

  const [isLoading, setIsLoading] = useState(false);

  const [patient, setPatient] = useState<PatientState>(() => {
    const storedPid = typeof window !== 'undefined' ? localStorage.getItem('ofphil_user_id') : null;
    const storedName = typeof window !== 'undefined' ? localStorage.getItem('ofphil_user_name') : null;
    return {
      name: storedName || user?.name || 'Patient',
      first_name: storedName?.split(' ')[0] || '',
      middle_name: '',
      last_name: storedName?.split(' ').slice(1).join(' ') || '',
      suffix: '',
      birthdate: '',
      civil_status: 'Single',
      num_dependents: '0',
      perm_province: 'Metro Manila (NCR)',
      perm_city: 'City of Manila',
      perm_barangay: '',
      perm_street: '',
      educational_attainment: 'High School Graduate / Level',
      employment_status: 'Employed (Full-time / Part-time)',
      occupation: '',
      username: storedPid || user?.username || 'M26-11-00001',
      patient_id: storedPid || user?.id || 'M26-11-00001',
      sex: 'M',
      age: null,
      residence: 'City of Manila, Metro Manila (NCR)',
      contact: '',
      email: '',
      category: 'REGULAR',
      status: 'APPROVED',
    };
  });

  const [encounters, setEncounters] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [reqApptModalOpen, setReqApptModalOpen] = useState(false);
  const [isSubmittingApptReq, setIsSubmittingApptReq] = useState(false);
  const [editingApptId, setEditingApptId] = useState<string | null>(null);
  const [reqApptForm, setReqApptForm] = useState({
    appointment_type: 'Comprehensive Eye Consultation & Visual Acuity Screening',
    appointment_date: '2026-11-23', // Monday
    appointment_time: '08:00 AM – 09:00 AM',
    notes: '',
  });
  const [dateWeekdayError, setDateWeekdayError] = useState<string | null>(null);

  // Lock body scroll and dismiss on Escape when appointment modal is open
  useEffect(() => {
    if (reqApptModalOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setReqApptModalOpen(false);
      };
      window.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [reqApptModalOpen]);

  const isMondayToFriday = (dateStr: string) => {
    if (!dateStr) return false;
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3) return false;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const day = d.getDay(); // 0 = Sun, 6 = Sat
    return day >= 1 && day <= 5;
  };

  const handleReqDateChange = (val: string) => {
    setReqApptForm((prev) => ({ ...prev, appointment_date: val }));
    if (val && !isMondayToFriday(val)) {
      setDateWeekdayError('Clinic appointments are only available Monday to Friday (8:00 AM – 5:00 PM). Weekends (Saturday & Sunday) are closed.');
    } else {
      setDateWeekdayError(null);
    }
  };

  const handleOpenNewApptRequest = () => {
    setEditingApptId(null);
    setDateWeekdayError(null);
    setReqApptForm({
      appointment_type: 'Comprehensive Eye Consultation & Visual Acuity Screening',
      appointment_date: '2026-11-23',
      appointment_time: '08:00 AM – 09:00 AM',
      notes: '',
    });
    setReqApptModalOpen(true);
  };

  const handleOpenEditApptRequest = (appt: any) => {
    setEditingApptId(appt.id);
    setDateWeekdayError(null);
    setReqApptForm({
      appointment_type: appt.appointment_type || 'Comprehensive Eye Consultation & Visual Acuity Screening',
      appointment_date: appt.appointment_date || '2026-11-23',
      appointment_time: appt.appointment_time || '08:00 AM – 09:00 AM',
      notes: appt.notes || '',
    });
    setReqApptModalOpen(true);
  };

  const handleCancelApptRequest = (apptId: string) => {
    const pid = patient.patient_id;
    const updated = appointments.filter((a) => a.id !== apptId);
    setAppointments(updated);
    try {
      localStorage.setItem(`ofphil_appointments_${pid}`, JSON.stringify(updated));
      setTimeout(() => window.dispatchEvent(new Event('ofphil-appointments-updated')), 0);
    } catch { }
    toast.success(`Appointment request ${apptId} cancelled.`);
  };

  const handleSubmitPatientApptRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqApptForm.appointment_date) {
      toast.error('Please select a preferred weekday date (Monday – Friday).');
      return;
    }
    if (!isMondayToFriday(reqApptForm.appointment_date)) {
      setDateWeekdayError('Clinic appointments are only available Monday to Friday (8:00 AM – 5:00 PM). Please pick a weekday.');
      toast.error('Invalid date: Clinic only operates Monday to Friday (8:00 AM – 5:00 PM).');
      return;
    }

    setIsSubmittingApptReq(true);
    const pid = patient.patient_id;
    const nowStr = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    let updated: any[] = [];
    if (editingApptId) {
      updated = appointments.map((item) =>
        item.id === editingApptId
          ? {
            ...item,
            appointment_type: reqApptForm.appointment_type,
            appointment_date: reqApptForm.appointment_date,
            appointment_time: reqApptForm.appointment_time,
            notes: reqApptForm.notes.trim(),
            status: 'Pending Nurse Approval',
            requested_by: 'patient',
            updated_at: nowStr,
          }
          : item
      );
      toast.success(`Appointment request (${editingApptId}) updated and sent to Admin / Nurse Desk for approval!`);
    } else {
      const reqId = `REQ-APT-${Math.floor(1000 + Math.random() * 9000)}`;
      const newReq = {
        id: reqId,
        patient_id: pid,
        patient_name: patient.name,
        appointment_type: reqApptForm.appointment_type,
        appointment_date: reqApptForm.appointment_date,
        appointment_time: reqApptForm.appointment_time,
        assigned_doctor: 'Pending Nurse / Ophthalmologist Assignment',
        clinic_room: 'OFPHIL Main Eye Center (Mon–Fri • 8:00 AM – 5:00 PM)',
        notes: reqApptForm.notes.trim(),
        status: 'Pending Nurse Approval',
        requested_by: 'patient',
        recipient_email: patient.email || 'roxas.t.bscs@gmail.com',
        recipient_phone: patient.contact || '0917 888 1678',
        email_sent: false,
        sms_sent: false,
        created_at: nowStr,
      };
      updated = [newReq, ...appointments];
    }

    // Dispatch automatic Gmail / Brevo SMTP notification to roxas.t.bscs@gmail.com
    const targetEmail =
      patient.email && !patient.email.endsWith('@example.ph')
        ? patient.email
        : 'roxas.t.bscs@gmail.com';
    try {
      await fetchApi('/appointments/schedule', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: pid,
          patient_name: patient.name,
          appointment_type: `${reqApptForm.appointment_type} (Patient Request — Pending Nurse Approval)`,
          appointment_date: reqApptForm.appointment_date,
          appointment_time: reqApptForm.appointment_time,
          assigned_doctor: 'Pending Nurse / Ophthalmologist Assignment',
          clinic_room: 'OFPHIL Main Eye Center (Mon–Fri • 8:00 AM – 5:00 PM)',
          notes: reqApptForm.notes.trim(),
          recipient_email: targetEmail,
          recipient_phone: patient.contact || '0917 888 1678',
          send_email: true,
          send_sms: false,
        }),
      });
    } catch {
      // Non-blocking: localStorage request is already saved
    }

    updated.forEach((appt) => {
      fetchApi(`/patients/${pid}/appointments`, {
        method: 'POST',
        body: JSON.stringify(appt),
      }).catch(() => { });
    });
    setIsSubmittingApptReq(false);
    toast.success(
      editingApptId
        ? `Appointment request (${editingApptId}) updated and sent for Nurse approval!`
        : 'Appointment request submitted! Waiting for Admin / Nurse approval.'
    );

    setAppointments(updated);
    try {
      localStorage.setItem(`ofphil_appointments_${pid}`, JSON.stringify(updated));
      setTimeout(() => window.dispatchEvent(new Event('ofphil-appointments-updated')), 0);
    } catch { }
    setReqApptModalOpen(false);
    setEditingApptId(null);
  };
  const [urgentAlerts, setUrgentAlerts] = useState<any[]>([]);
  const [myInquiries, setMyInquiries] = useState<any[]>([]);

  // Missing requirements list (only shown when an urgent request has been sent by Admin/MSW)
  const missingRequirements = [
    'Certificate of Indigency',
    'Government Valid ID',
    'Medical Expense Quotation',
    'Clinical Case Study / Medical Abstract',
    'Proof of Income / Payslip',
    'Utility Bill',
  ];

  // Upload requirement or send inquiry state in Applications tab
  const [selectedDocType, setSelectedDocType] = useState('Certificate of Indigency');
  const [optionalNote, setOptionalNote] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Send New Inquiry to Clinic Desk state
  const [inqSubject, setInqSubject] = useState('');
  const [inqMessage, setInqMessage] = useState('');
  const [inqFiles, setInqFiles] = useState<Array<{ file: File; name: string; type: 'pdf' | 'image'; size: string; sizeBytes: number }>>([]);
  const [isSubmittingInq, setIsSubmittingInq] = useState(false);
  const [activeInquiryModal, setActiveInquiryModal] = useState<any | null>(null);
  const [inqPreviewAtt, setInqPreviewAtt] = useState<{ name: string; url: string; type: 'pdf' | 'image' } | null>(null);

  // Profile form state (Tab 3: My Profile & Dashboard Edit)
  const [profileFirstName, setProfileFirstName] = useState('Juan');
  const [profileMiddleName, setProfileMiddleName] = useState('Santos');
  const [profileLastName, setProfileLastName] = useState('Dela Cruz');
  const [profileName, setProfileName] = useState('Juan Dela Cruz');
  const [profileEmail, setProfileEmail] = useState('juan.delacruz@example.ph');
  const [profilePhone, setProfilePhone] = useState('0917 888 1678');
  const [profileBirthdate, setProfileBirthdate] = useState('1978-05-15');
  const [profileAge, setProfileAge] = useState('48');
  const [profileSex, setProfileSex] = useState('M');
  const [profileCivilStatus, setProfileCivilStatus] = useState('Married');
  const [profileDependents, setProfileDependents] = useState('2');
  const [profileProvince, setProfileProvince] = useState('Metro Manila (NCR)');
  const [profileCity, setProfileCity] = useState('City of Manila');
  const [profileBarangay, setProfileBarangay] = useState('Barangay 659');
  const [profileStreet, setProfileStreet] = useState('Block 4 Lot 12, St. Jude Street');
  const [profileEducation, setProfileEducation] = useState('High School Graduate / Level');
  const [profileEmployment, setProfileEmployment] = useState('Employed (Full-time / Part-time)');
  const [profileOccupation, setProfileOccupation] = useState('Public Utility Driver');
  const [profileSaved, setProfileSaved] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passUpdated, setPassUpdated] = useState(false);

  const handleGeneratePortalPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
    setConfirmPassword(pwd);
    toast.success('Generated secure portal password');
  };

  // Settings & Preferences state (Tab 4: Settings & Preferences)
  const [settingsActiveSubTab, setSettingsActiveSubTab] = useState<
    'profile' | 'security' | 'appointments' | 'notifications' | 'privacy' | 'accessibility' | 'account'
  >('profile');
  const [settingsFullName, setSettingsFullName] = useState('Juan Dela Cruz');
  const [settingsEmail, setSettingsEmail] = useState('juan.delacruz@example.ph');
  const [settingsPhone, setSettingsPhone] = useState('0917 888 1678');
  const [settingsAddress, setSettingsAddress] = useState('Manila, NCR');
  const [settingsEmergency, setSettingsEmergency] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    if (tabParam === 'inquiries' || tabParam === 'applications') {
      setActiveTab('applications');
    } else if (
      tabParam === 'charity-status' ||
      tabParam === 'appointments' ||
      tabParam === 'notifications' ||
      tabParam === 'profile' ||
      tabParam === 'settings'
    ) {
      setActiveTab(tabParam);
    } else {
      setActiveTab('dashboard');
    }
  }, [tabParam]);

  const fetchAuthenticatedCharityStatus = React.useCallback(async (pid: string) => {
    setCharityStatusLoading(true);
    setCharityStatusError(null);
    try {
      const res = await fetchApi('/patient-portal/charity-assistance-status', {
        headers: {
          'x-user-role': 'patient',
          'x-user-id': pid,
        },
      });
      setCharityStatusData(res);
    } catch (err: any) {
      setCharityStatusData(null);
      setCharityStatusError(
        err?.message ||
        'Access denied: Charity Assistance Status is only available to patients officially classified as a Charity Patient.'
      );
    } finally {
      setCharityStatusLoading(false);
    }
  }, []);

  const handleCharityDocumentAction = async (doc: any, download: boolean) => {
    try {
      const pid = patient.patient_id;
      const url = `${API_BASE_URL}/documents/${encodeURIComponent(doc.id)}/download?patient_id=${encodeURIComponent(pid)}&inline=${download ? 'false' : 'true'}`;
      const resp = await fetch(url, {
        headers: {
          'x-user-role': 'patient',
          'x-user-id': pid,
        },
      });
      if (!resp.ok) {
        throw new Error('Unable to access document.');
      }
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      if (download) {
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = doc.filename || 'document';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(objUrl), 3000);
      } else {
        setCharityDocPreview({
          name: `${doc.document_type} — ${doc.filename}`,
          url: objUrl,
          type: String(doc.mime_type || '').includes('pdf') ? 'pdf' : 'image',
        });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Unable to open supporting document.');
    }
  };

  // Fetch actual patient record from backend + sync localStorage dynamic state
  useEffect(() => {
    async function loadPatientPortalData() {
      const storedPid = typeof window !== 'undefined' ? localStorage.getItem('ofphil_user_id') : null;
      const pid = (storedPid || user?.id || user?.username || 'M26-11-00001').trim();
      try {
        const res = await fetchApi(`/patients/${pid}`);
        if (res?.patient) {
          let p = { ...res.patient };
          try {
            const localList = JSON.parse(localStorage.getItem('ofphil_registered_patients') || '[]');
            const foundLocal = Array.isArray(localList)
              ? localList.find((item: any) => String(item.patient_id).toUpperCase() === pid.toUpperCase())
              : null;
            if (foundLocal) {
              // Database classification (res.patient.category) always takes authoritative precedence
              p = { ...foundLocal, ...p, category: res.patient.category || foundLocal.category || 'REGULAR' };
            }
          } catch { }

          const dbCategory = String(p.category || 'REGULAR').toUpperCase() === 'CHARITY' ? 'CHARITY' : 'REGULAR';
          if (dbCategory === 'CHARITY') {
            fetchAuthenticatedCharityStatus(p.patient_id || pid);
          } else {
            setCharityStatusData(null);
          }

          const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Patient';
          const prov = p.perm_province || p.residence_region || 'Metro Manila (NCR)';
          const cty = p.perm_city || p.residence_city || 'City of Manila';
          const bgy = p.perm_barangay || '';
          const str = p.perm_street || '';

          setPatient({
            name: fullName,
            first_name: p.first_name || '',
            middle_name: p.middle_name || '',
            last_name: p.last_name || '',
            suffix: p.suffix || '',
            birthdate: p.birthdate || '',
            civil_status: p.civil_status || 'Single',
            num_dependents: String(p.num_dependents ?? '0'),
            perm_province: prov,
            perm_city: cty,
            perm_barangay: bgy,
            perm_street: str,
            educational_attainment: p.educational_attainment || 'High School Graduate / Level',
            employment_status: p.employment_status || 'Employed (Full-time / Part-time)',
            occupation: p.occupation || '',
            username: p.patient_id || pid,
            patient_id: p.patient_id || pid,
            sex: p.sex || 'M',
            age: p.age ?? null,
            residence: `${cty}, ${prov}`,
            contact: p.contact || '',
            email: p.email || '',
            category: p.category || 'REGULAR',
            status: p.status || 'APPROVED',
          });
          setProfileFirstName(p.first_name || '');
          setProfileMiddleName(p.middle_name || '');
          setProfileLastName(p.last_name || '');
          setProfileName(fullName);
          setProfileEmail(p.email || '');
          setProfilePhone(p.contact || '');
          setProfileBirthdate(p.birthdate || '');
          setProfileAge(String(p.age ?? ''));
          setProfileSex(p.sex || 'M');
          setProfileCivilStatus(p.civil_status || 'Single');
          setProfileDependents(String(p.num_dependents ?? '0'));
          setProfileProvince(prov);
          setProfileCity(cty);
          setProfileBarangay(bgy);
          setProfileStreet(str);
          setProfileEducation(p.educational_attainment || 'High School Graduate / Level');
          setProfileEmployment(p.employment_status || 'Employed (Full-time / Part-time)');
          setProfileOccupation(p.occupation || 'Public Utility Driver');

          setSettingsFullName(fullName);
          setSettingsEmail(p.email || 'juan.delacruz@example.ph');
          setSettingsPhone(p.contact || '0917 888 1678');
          setSettingsAddress(`${str}, ${bgy}, ${cty}, ${prov}`);
          const savedEncs = JSON.parse(localStorage.getItem('ofphil_encounters_M26-11-00001') || '[]');
          let sbEncs: any[] = [];
          try {
            const sbRes = await fetchApi(`/patients/${pid}/encounters`);
            sbEncs = Array.isArray(sbRes?.encounters) ? sbRes.encounters : [];
          } catch { }
          const apiEncs = res.encounters || [];
          const seenEnc = new Set<string>();
          const mergedEncs = [...sbEncs, ...(Array.isArray(savedEncs) ? savedEncs : []), ...apiEncs].filter((e: any) => {
            const eid = e?.assessment_id || e?.id;
            if (!eid || seenEnc.has(eid)) return false;
            seenEnc.add(eid);
            return true;
          });
          setEncounters(mergedEncs);
        }
      } catch (e) {
        // fallback to Juan Dela Cruz default clean state
      }

      // Load dynamic Urgent Alerts & Inquiries strictly belonging to this authenticated patient (exclude public landing form submissions)
      try {
        const savedAppts = JSON.parse(localStorage.getItem(`ofphil_appointments_${pid}`) || '[]');
        try {
          const sbApptRes = await fetchApi(`/patients/${pid}/appointments`);
          if (Array.isArray(sbApptRes?.appointments) && sbApptRes.appointments.length > 0) {
            const seenA = new Set<string>();
            const mergedA = [...sbApptRes.appointments, ...(Array.isArray(savedAppts) ? savedAppts : [])].filter((a: any) => {
              if (!a?.id || seenA.has(a.id)) return false;
              seenA.add(a.id);
              return true;
            });
            setAppointments(mergedA);
          }
        } catch { }
        if (Array.isArray(savedAppts)) setAppointments(savedAppts);
        const savedReadIds = JSON.parse(localStorage.getItem(`ofphil_patient_read_notifs_${pid}`) || '[]');
        if (Array.isArray(savedReadIds)) setReadNotifIds(savedReadIds);
        const savedUrgent = JSON.parse(localStorage.getItem(`ofphil_urgent_${pid}`) || '[]');
        setUrgentAlerts(savedUrgent);

        try {
          const inqRes = await fetchApi('/inquiries/patient', {
            headers: { 'x-user-role': 'patient', 'x-user-id': pid },
          });
          if (Array.isArray(inqRes?.items)) {
            setMyInquiries(inqRes.items);
          }
        } catch { }
      } catch (e) { }
    }
    loadPatientPortalData();

    const syncLiveAppts = async () => {
      const storedPid = typeof window !== 'undefined' ? localStorage.getItem('ofphil_user_id') : null;
      const pid = (storedPid || user?.id || user?.username || 'M26-11-00001').trim();
      try {
        const savedAppts = JSON.parse(localStorage.getItem(`ofphil_appointments_${pid}`) || '[]');
        if (Array.isArray(savedAppts)) setAppointments(savedAppts);
      } catch { }
      try {
        const savedEncs = JSON.parse(localStorage.getItem(`ofphil_encounters_${pid}`) || '[]');
        if (Array.isArray(savedEncs) && savedEncs.length > 0) {
          setEncounters(savedEncs);
        }
      } catch { }
      try {
        const res = await fetchApi(`/patients/${pid}`);
        if (res?.patient) {
          const nextCat = String(res.patient.category || 'REGULAR').toUpperCase() === 'CHARITY' ? 'CHARITY' : 'REGULAR';
          setPatient((prev: any) => {
            if (prev.category !== nextCat || prev.status !== res.patient.status) {
              return { ...prev, category: nextCat, status: res.patient.status || prev.status };
            }
            return prev;
          });
          if (nextCat === 'CHARITY') {
            fetchAuthenticatedCharityStatus(pid);
          } else {
            setCharityStatusData(null);
          }
        }
      } catch { }
    };
    syncLiveAppts();
    window.addEventListener('storage', syncLiveAppts);
    window.addEventListener('ofphil-appointments-updated', syncLiveAppts);
    window.addEventListener('ofphil-encounters-updated', syncLiveAppts);
    window.addEventListener('ofphil-patient-classification-updated', syncLiveAppts);
    const interval = setInterval(syncLiveAppts, 4000);
    return () => {
      window.removeEventListener('storage', syncLiveAppts);
      window.removeEventListener('ofphil-appointments-updated', syncLiveAppts);
      window.removeEventListener('ofphil-encounters-updated', syncLiveAppts);
      window.removeEventListener('ofphil-patient-classification-updated', syncLiveAppts);
      clearInterval(interval);
    };
  }, [user, fetchAuthenticatedCharityStatus]);

  // Also trigger backend verification whenever patient explicitly opens charity-status tab
  useEffect(() => {
    const pid = patient.patient_id || user?.id || 'M26-11-00001';
    if (activeTab === 'charity-status') {
      fetchAuthenticatedCharityStatus(pid);
    }
  }, [activeTab, patient.patient_id, user, fetchAuthenticatedCharityStatus]);

  const handleInqFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const allowedExt = ['.pdf', '.png', '.jpg', '.jpeg'];
    const currentTotal = inqFiles.reduce((acc, item) => acc + item.sizeBytes, 0);
    let runningTotal = currentTotal;
    const added: Array<{ file: File; name: string; type: 'pdf' | 'image'; size: string; sizeBytes: number }> = [];

    for (const f of Array.from(files)) {
      if (inqFiles.length + added.length >= 5) {
        toast.error('Maximum 5 files allowed per inquiry.');
        break;
      }
      const lower = f.name.toLowerCase();
      if (!allowedExt.some((ext) => lower.endsWith(ext))) {
        toast.error(`Unsupported file "${f.name}". Only PDF, PNG, and JPG/JPEG are accepted.`);
        continue;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`File "${f.name}" exceeds the 5 MB per-file limit.`);
        continue;
      }
      if (runningTotal + f.size > 25 * 1024 * 1024) {
        toast.error('Total attachment size exceeds the 25 MB per-inquiry limit.');
        break;
      }
      runningTotal += f.size;
      added.push({
        file: f,
        name: f.name,
        type: f.type.includes('pdf') || lower.endsWith('.pdf') ? 'pdf' : 'image',
        size: f.size > 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(2)} MB` : `${Math.max(1, Math.round(f.size / 1024))} KB`,
        sizeBytes: f.size,
      });
    }

    if (added.length > 0) {
      setInqFiles((prev) => [...prev, ...added]);
    }
    e.target.value = '';
  };

  const handleSubmitDynamicInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingInq) return;
    if (!inqSubject.trim() || !inqMessage.trim()) {
      toast.error('Please enter both an inquiry subject and message.');
      return;
    }

    const pid = patient.patient_id;
    setIsSubmittingInq(true);
    try {
      const formData = new FormData();
      formData.append('subject', inqSubject.trim());
      formData.append('message', inqMessage.trim());
      for (const item of inqFiles) {
        formData.append('files', item.file);
      }

      const res = await fetchApi('/inquiries', {
        method: 'POST',
        headers: {
          'x-user-role': 'patient',
          'x-user-id': pid,
        },
        body: formData,
      });

      if (res?.inquiry) {
        setMyInquiries((prev) => [res.inquiry, ...prev]);
      } else {
        const listRes = await fetchApi('/inquiries/patient', {
          headers: { 'x-user-role': 'patient', 'x-user-id': pid },
        });
        if (Array.isArray(listRes?.items)) setMyInquiries(listRes.items);
      }

      setInqSubject('');
      setInqMessage('');
      setInqFiles([]);
      toast.success('Your inquiry and attachments have been saved to your clinic record!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit inquiry. Please check your entries and try again.');
    } finally {
      setIsSubmittingInq(false);
    }
  };

  const handleOpenPatientInquiry = async (inq: any) => {
    setActiveInquiryModal(inq);
    try {
      const res = await fetchApi(`/inquiries/${inq.id}?mark_read=true`, {
        headers: { 'x-user-role': 'patient', 'x-user-id': patient.patient_id },
      });
      if (res?.inquiry) {
        setActiveInquiryModal(res.inquiry);
        setMyInquiries((prev) => prev.map((item) => (item.id === inq.id ? res.inquiry : item)));
      }
    } catch {
      // Keep local modal open
    }
  };

  const handlePatientAttachmentAction = async (inquiryId: string, att: any, download: boolean) => {
    try {
      const url = `${API_BASE_URL}/inquiries/${encodeURIComponent(inquiryId)}/attachments/${encodeURIComponent(att.id)}?download=${download ? 'true' : 'false'}`;
      const resp = await fetch(url, {
        headers: { 'x-user-role': 'patient', 'x-user-id': patient.patient_id },
      });
      if (!resp.ok) {
        throw new Error('Unable to retrieve attachment.');
      }
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      if (download) {
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = att.original_filename || 'attachment';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(objUrl), 3000);
      } else {
        setInqPreviewAtt({
          name: att.original_filename || 'Attachment Preview',
          url: objUrl,
          type: att.file_type === 'pdf' ? 'pdf' : 'image',
        });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load attachment.');
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaved(true);
    const fullName = `${profileFirstName.trim()} ${profileLastName.trim()}`.trim() || profileName;
    const payload = {
      first_name: profileFirstName.trim() || 'Juan',
      middle_name: profileMiddleName.trim(),
      last_name: profileLastName.trim() || 'Dela Cruz',
      birthdate: profileBirthdate,
      age: parseInt(profileAge, 10) || 48,
      sex: profileSex,
      civil_status: profileCivilStatus,
      num_dependents: profileDependents,
      perm_province: profileProvince,
      perm_city: profileCity,
      perm_barangay: profileBarangay,
      perm_street: profileStreet,
      educational_attainment: profileEducation,
      employment_status: profileEmployment,
      occupation: profileOccupation,
      residence_city: profileCity,
      residence_region: profileProvince,
    };

    try {
      await fetchApi(`/patients/${patient.patient_id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } catch { }

    try {
      const list = JSON.parse(localStorage.getItem('ofphil_registered_patients') || '[]');
      const idx = Array.isArray(list)
        ? list.findIndex((item: any) => String(item.patient_id).toUpperCase() === patient.patient_id)
        : -1;
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...payload };
      } else {
        list.push({ patient_id: patient.patient_id, ...payload });
      }
      localStorage.setItem('ofphil_registered_patients', JSON.stringify(list));
    } catch { }

    setPatient((prev) => ({
      ...prev,
      ...payload,
      name: fullName,
      residence: `${profileCity}, ${profileProvince}`,
    }));
    setProfileName(fullName);
    setSettingsFullName(fullName);
    setSettingsAddress(`${profileStreet}, ${profileBarangay}, ${profileCity}, ${profileProvince}`);
    toast.success('Your patient profile, demographics & PSGC address have been updated and synced with Admin Records!');
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }
    setPassUpdated(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast.success('Portal password updated successfully!');
    setTimeout(() => setPassUpdated(false), 3000);
  };

  const handleSettingsProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaved(true);
    setPatient((prev) => ({
      ...prev,
      name: settingsFullName,
      residence: settingsAddress,
    }));
    toast.success('Personal details saved to master record!');
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  return (
    <PatientAppShell
      activeTab={activeTab}
      patientClassification={patient.category === 'CHARITY' ? 'CHARITY' : 'REGULAR'}
      pageTitle={
        activeTab === 'dashboard'
          ? 'Patient Dashboard'
          : activeTab === 'applications'
            ? 'My Inquiries & Clinic Replies'
            : activeTab === 'charity-status'
              ? 'Charity Assistance Status'
              : activeTab === 'appointments'
                ? 'Appointment History & Clinic Visits'
                : activeTab === 'notifications'
                  ? 'Patient Notifications & Clinic Alerts'
                  : activeTab === 'profile'
                    ? 'Patient Profile & Settings'
                    : 'Patient Account & Preferences'
      }
      pageSubtitle="Ophthalmological Foundation of the Philippines — Patient Master Registry & Clinical Directory"
    >
      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-28 rounded-2xl skeleton w-full" />
          <div className="h-36 rounded-2xl skeleton w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="h-28 rounded-2xl skeleton" />
            <div className="h-28 rounded-2xl skeleton" />
            <div className="h-28 rounded-2xl skeleton" />
          </div>
          <div className="h-64 rounded-2xl skeleton w-full" />
        </div>
      ) : (
        <>
          {/* ========================================================
              TAB 1: PATIENT DASHBOARD (JUAN DELA CRUZ - M26-11-00001)
             ======================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Dynamic Urgent Clinic Notifications Banner (Only shown if Admin/MSW actually dispatched an alert!) */}
              {urgentAlerts.length > 0 && (
                <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-5 text-[#92400E] shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-bell text-[#D97706] text-sm" />
                      <span className="font-bold text-xs uppercase tracking-wider text-[#B45309]">
                        Urgent Clinic Notifications &amp; Missing Requirements ({urgentAlerts.length})
                      </span>
                    </div>
                  </div>

                  {urgentAlerts.map((alert: any, idx: number) => (
                    <div key={alert.id || idx} className="text-xs bg-white/80 p-3.5 rounded-xl border border-[#FDE68A] space-y-2">
                      <div className="flex items-center justify-between font-bold text-[#78350F]">
                        <span>{alert.subject || alert.categoryLabel || 'Urgent Clinic Notice'}</span>
                        <span className="text-[10.5px] text-[#92400E]">{alert.timestamp}</span>
                      </div>
                      <p className="text-[#78350F] m-0 whitespace-pre-wrap leading-relaxed">{alert.message}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {missingRequirements.map((req, rIdx) => (
                          <button
                            key={rIdx}
                            type="button"
                            onClick={() => {
                              setSelectedDocType(req);
                              setActiveTab('applications');
                            }}
                            className="px-2.5 py-1 rounded-md bg-[#D97706] hover:bg-[#B45309] text-white text-[11px] font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                          >
                            <i className="fa-solid fa-upload text-[10px]" />
                            <span>Upload {req}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Welcome Hero Green Card — Synced with Juan Dela Cruz (M26-11-00001) */}
              <div className="rounded-2xl bg-gradient-to-r from-[#064826] to-[#0B6B3A] p-6 sm:p-7 text-white shadow-sm">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold mb-3 border border-white/15">
                  <span className="w-2 h-2 rounded-full bg-[#86EFAC] animate-pulse" />
                  <span>
                    Masterlist Verified Patient &bull; {patient.category === 'CHARITY' ? 'Charity Beneficiary' : 'Regular Patient'}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold font-['Outfit'] tracking-tight mb-3 text-white">
                  Welcome, {patient.name}
                </h1>
                <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-emerald-100 font-medium">
                  <span className="flex items-center gap-1.5">
                    <i className="fa-solid fa-id-card text-[11px]" />
                    <span>
                      Patient ID: <strong className="font-mono">{patient.patient_id}</strong>
                    </span>
                  </span>
                  <span>•</span>
                  <span>
                    Age &amp; Sex: <strong>{patient.age} yrs &bull; {patient.sex}</strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <i className="fa-solid fa-location-dot text-[11px]" />
                    <span>
                      Residence: <strong>{patient.residence}</strong>
                    </span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <i className="fa-solid fa-phone text-[11px]" />
                    <span>
                      Contact: <strong>{patient.contact}</strong>
                    </span>
                  </span>
                </div>
              </div>

              {/* 3 Metric Cards Grid (Dynamic Counts!) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Metric 1: Clinic Encounters */}
                <div className="bg-white rounded-2xl p-5 border border-[#EEF2EF] shadow-xs flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#5A7466] mb-1">
                      Clinic Encounters
                    </div>
                    <div className="text-3xl font-bold font-['Outfit'] text-[#10241A]">
                      {encounters.length}
                    </div>
                    <div className="text-[11px] text-[#5A7466] mt-1">
                      Recorded outpatient &amp; clinic visits
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-lg">
                    <i className="fa-solid fa-hospital-user" />
                  </div>
                </div>

                {/* Metric 2: Upcoming Appointments */}
                <div className="bg-white rounded-2xl p-5 border border-[#EEF2EF] shadow-xs flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#5A7466] mb-1">
                      Upcoming Appointments
                    </div>
                    <div className="text-3xl font-bold font-['Outfit'] text-[#0B6B3A]">
                      {appointments.length}
                    </div>
                    <div className="text-[11px] text-[#5A7466] mt-1">
                      Coordinated clinic consultations
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg">
                    <i className="fa-solid fa-calendar-check" />
                  </div>
                </div>

                {/* Metric 3: Inquiries & Assistance Filings */}
                <div className="bg-white rounded-2xl p-5 border border-[#EEF2EF] shadow-xs flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#5A7466] mb-1">
                      Inquiries &amp; Filings
                    </div>
                    <div className="text-3xl font-bold font-['Outfit'] text-[#10241A]">
                      {myInquiries.length}
                    </div>
                    <div className="text-[11px] text-[#5A7466] mt-1">
                      Submitted messages &amp; requests
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-lg">
                    <i className="fa-solid fa-clipboard-check" />
                  </div>
                </div>
              </div>

              {/* =====================================================================
                  PHASE 5: CHARITY ASSISTANCE OVERVIEW CONTAINER (CHARITY PATIENTS ONLY)
                 ===================================================================== */}
              {String(patient.category || 'REGULAR').toUpperCase() === 'CHARITY' && (
                <div
                  data-testid="charity-assistance-overview-container"
                  className="bg-white rounded-2xl border-2 border-[#A7F3D0] shadow-xs overflow-hidden"
                >
                  <div className="px-6 py-4 bg-gradient-to-r from-[#E8F5EC] via-[#F0FDF4] to-white border-b border-[#D5E2D9] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0B6B3A] text-white flex items-center justify-center text-base shadow-2xs shrink-0">
                        <i className="fa-solid fa-hand-holding-heart" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0">
                            Charity Assistance Overview
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold bg-[#0B6B3A] text-white">
                            Official Charity Beneficiary
                          </span>
                          {charityStatusData?.application_info?.charity_application_status && (
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${charityStatusData.application_info.charity_application_status === 'Approved'
                                ? 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]'
                                : charityStatusData.application_info.charity_application_status.includes('Disapproved') ||
                                  charityStatusData.application_info.charity_application_status.includes('Promissory')
                                  ? 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]'
                                  : charityStatusData.application_info.charity_application_status === 'No Active Charity Application'
                                    ? 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]'
                                    : 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]'
                                }`}
                            >
                              {charityStatusData.application_info.charity_application_status}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#5A7466] m-0 mt-0.5">
                          Live charity assistance application, MSW assessment progress, and authorized grant summary linked to Patient ID <strong>{patient.patient_id}</strong>.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('charity-status')}
                      className="px-4 py-2 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white font-bold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer border-0"
                    >
                      <span>View Full Charity Assistance Status</span>
                      <i className="fa-solid fa-arrow-right text-[10px]" />
                    </button>
                  </div>

                  <div className="p-6">
                    {charityStatusLoading && !charityStatusData ? (
                      <div className="py-6 text-center text-xs text-[#5A7466]">
                        <i className="fa-solid fa-spinner fa-spin text-[#0B6B3A] mr-2" />
                        Retrieving your official charity assistance records...
                      </div>
                    ) : !charityStatusData?.has_active_application ? (
                      <div
                        data-testid="charity-overview-empty-state"
                        className="p-5 rounded-xl bg-[#FAFBF8] border border-dashed border-[#A7F3D0] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center shrink-0 mt-0.5">
                            <i className="fa-solid fa-circle-info text-sm" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#10241A]">
                              No Active Charity Application Recorded Yet
                            </div>
                            <p className="text-xs text-[#334155] m-0 mt-1 leading-relaxed">
                              {charityStatusData?.empty_state_message ||
                                'Your account is classified as a Charity Patient, but no charity assistance application has been recorded yet. Please contact the clinic or authorized staff for assistance.'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('applications')}
                          className="px-3.5 py-2 rounded-xl border border-[#0B6B3A] bg-white hover:bg-[#E8F5EC] text-[#0B6B3A] font-bold text-xs shrink-0 cursor-pointer transition"
                        >
                          Contact Clinic Desk
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
                        <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                          <div className="text-[10.5px] font-bold uppercase text-[#5A7466]">Charity Case Number</div>
                          <div className="font-mono font-extrabold text-[#0B6B3A] text-sm mt-1">
                            {charityStatusData.application_info?.charity_case_no || 'Pending Assignment'}
                          </div>
                          {charityStatusData.application_info?.application_encounter_no && (
                            <div className="text-[10.5px] text-[#64748B] font-mono mt-0.5">
                              Encounter: {charityStatusData.application_info.application_encounter_no}
                            </div>
                          )}
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                          <div className="text-[10.5px] font-bold uppercase text-[#5A7466]">Assessment Status</div>
                          <div className="font-bold text-[#10241A] mt-1">
                            {charityStatusData.assessment_status?.current_status || 'Assessment Pending'}
                          </div>
                          <div className="text-[10.5px] text-[#647466] mt-0.5">
                            Stage: {charityStatusData.assessment_status?.assessment_stage || 'Not Started'}
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                          <div className="text-[10.5px] font-bold uppercase text-[#5A7466]">
                            Eligibility Recommendation
                          </div>
                          <div className="font-bold text-[#10241A] mt-1">
                            {charityStatusData.eligibility_and_decision?.msw_eligibility_recommendation ||
                              'Pending MSW Evaluation'}
                          </div>
                          <div className="text-[10.5px] text-[#64748B] mt-0.5">
                            Final Decision:{' '}
                            <strong className="text-[#0B6B3A]">
                              {charityStatusData.eligibility_and_decision?.final_authorized_decision || 'Pending'}
                            </strong>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                          <div className="text-[10.5px] font-bold uppercase text-[#5A7466]">
                            Approved Grant / Subsidy
                          </div>
                          <div className="font-extrabold text-[#0B6B3A] mt-1">
                            {charityStatusData.eligibility_and_decision?.approved_subsidy_amount != null
                              ? `₱${Number(charityStatusData.eligibility_and_decision.approved_subsidy_amount).toLocaleString('en-PH', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                              : charityStatusData.eligibility_and_decision?.approved_subsidy_pct != null
                                ? `${charityStatusData.eligibility_and_decision.approved_subsidy_pct}% Approved Subsidy`
                                : charityStatusData.eligibility_and_decision?.approved_grant_tier ||
                                'Awaiting Final Approval'}
                          </div>
                          <div className="text-[10.5px] text-[#64748B] mt-0.5">
                            Updated:{' '}
                            {charityStatusData.assessment_status?.last_updated
                              ? new Date(charityStatusData.assessment_status.last_updated).toLocaleDateString()
                              : 'Recent'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Appointments & Schedule Card (With Patient Appointment Request — Mon-Fri 8:00 AM - 5:00 PM) */}
              <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#EEF2EF]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-sm shrink-0">
                      <i className="fa-solid fa-calendar-days" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-['Outfit'] text-[15px] font-bold text-[#10241A] m-0">
                          Appointments &amp; Schedule in Clinic
                        </h3>
                        <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-[#E8F5EC] border border-[#A7F3D0] text-[#0B6B3A]">
                          {appointments.filter((a: any) => a.status === 'Scheduled').length} Approved &bull;{' '}
                          {appointments.filter((a: any) => a.status === 'Pending Nurse Approval').length} Pending Request
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5A7466] m-0 mt-0.5">
                        Clinic Hours: <strong>Monday – Friday, 8:00 AM – 5:00 PM</strong> &bull; Patient requests require Nurse / Admin approval
                      </p>
                    </div>
                  </div>


                </div>

                {appointments.length === 0 ? (
                  <div className="py-10 px-6 text-center text-[#5A7466] bg-[#FAFBF8] rounded-xl border border-dashed border-[#D5E2D9] flex flex-col items-center justify-center gap-2.5">
                    <i className="fa-regular fa-calendar-xmark text-3xl text-[#9DBFA9] block" />
                    <div className="text-xs font-bold text-[#10241A]">You have no upcoming appointments scheduled at this moment.</div>
                    <p className="text-[11.5px] text-[#5A7466] max-w-md m-0">
                      You may request an appointment slot between <strong>Monday and Friday (8:00 AM – 5:00 PM)</strong>. Once submitted, the Clinic Nurse / Admin will review and approve your schedule.
                    </p>

                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {appointments.map((appt: any) => {
                      const isPending = appt.status === 'Pending Nurse Approval';
                      const isCompleted = appt.status === 'Completed';
                      return (
                        <div
                          key={appt.id}
                          className={`rounded-xl border p-4 space-y-3 transition ${isPending
                            ? 'border-[#FDE68A] bg-[#FFFBEB]/60'
                            : 'border-[#D5E2D9] bg-[#FAFBF8]'
                            }`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-white text-[#0B6B3A] border border-[#D5E2D9]">
                              {appt.id}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isPending ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                  <i className="fa-solid fa-hourglass-half text-[9px]" />
                                  <span>Pending Nurse / Admin Approval</span>
                                </span>
                              ) : isCompleted ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                                  Completed
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                  <i className="fa-solid fa-circle-check text-[9px]" />
                                  <span>Approved &amp; Confirmed by Nurse/Admin</span>
                                </span>
                              )}
                              {appt.email_sent && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  Email Sent
                                </span>
                              )}
                              {appt.sms_sent && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  SMS Sent
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="font-bold text-sm text-[#10241A]">{appt.appointment_type}</div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#334155] bg-white p-3 rounded-lg border border-[#EEF2EF]">
                            <div><strong>Date (Mon–Fri):</strong> {appt.appointment_date}</div>
                            <div><strong>Time (8AM–5PM):</strong> {appt.appointment_time}</div>
                            <div className="sm:col-span-2"><strong>Specialist:</strong> {appt.assigned_doctor}</div>
                            <div className="sm:col-span-2"><strong>Room / Wing:</strong> {appt.clinic_room}</div>
                          </div>

                          {appt.notes && (
                            <div className="text-[11.5px] text-[#5A7466] bg-white/90 px-3 py-2 rounded-lg border border-[#EEF2EF]">
                              <strong className="text-[#10241A]">{isPending ? 'Your Reason / Notes:' : 'Clinic Instructions:'}</strong> {appt.notes}
                            </div>
                          )}

                          {/* Interactive Patient Actions: Edit / Reschedule Request or Cancel */}
                          <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                            <span className="text-[10.5px] text-[#64748B]">
                              {isPending
                                ? 'Awaiting nurse confirmation in Admin Panel'
                                : 'Confirmed clinic schedule'}
                            </span>
                            <div className="flex items-center gap-2">
                              {!isCompleted && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditApptRequest(appt)}
                                  className="px-2.5 py-1 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#FAFBF8] text-[#0B6B3A] font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
                                >
                                  <i className="fa-solid fa-pen-to-square text-[10px]" />
                                  <span>{isPending ? 'Edit Request' : 'Request Reschedule'}</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleCancelApptRequest(appt.id)}
                                className="px-2.5 py-1 rounded-lg border border-[#FECACA] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
                              >
                                <i className="fa-solid fa-xmark text-[10px]" />
                                <span>Cancel</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* History Record Table Card (Clean Empty State when 0 encounters) */}
              <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs overflow-hidden">
                <div className="p-5 border-b border-[#EEF2EF] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-file-medical text-[#0B6B3A] text-sm" />
                    <div>
                      <h3 className="font-['Outfit'] text-[15px] font-bold text-[#10241A]">
                        Record of Patient in Clinic
                      </h3>
                      <p className="text-[11px] text-[#5A7466]">
                        Chronological medical encounters, surgical records, ophthalmology diagnoses, and fee quotations
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-[#FAFBF8] border border-[#EEF2EF] text-[#5A7466]">
                    {encounters.length} Encounters Logged
                  </span>
                </div>

                {encounters.length === 0 ? (
                  <div className="py-12 px-6 text-center text-[#5A7466] space-y-2">
                    <i className="fa-solid fa-hospital-user text-3xl text-[#9DBFA9] block mx-auto" />
                    <div className="text-sm font-bold text-[#10241A]">No Clinical Encounters Recorded Yet</div>
                    <p className="text-xs text-[#5A7466] max-w-md mx-auto m-0">
                      Your clinical visits, ophthalmology diagnoses, and surgical quotations logged by your attending physician will appear here automatically.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#24352B]">
                      <thead className="bg-[#FAFBF8] text-[#5A7466] text-[11px] uppercase tracking-wider border-b border-[#EEF2EF]">
                        <tr>
                          <th className="py-3 px-5 font-semibold">Encounter ID</th>
                          <th className="py-3 px-5 font-semibold">Visit Date</th>
                          <th className="py-3 px-5 font-semibold">Diagnosis &amp; Eye Laterality</th>
                          <th className="py-3 px-5 font-semibold">Procedure / Intervention</th>
                          <th className="py-3 px-5 font-semibold">Attending Doctor</th>
                          <th className="py-3 px-5 font-semibold">Medical Quotation</th>
                          <th className="py-3 px-5 font-semibold">Category</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EEF2EF]">
                        {encounters.map((enc: any, idx: number) => (
                          <tr
                            key={idx}
                            onClick={() => {
                              window.location.href = `/portal/encounters/${enc.assessment_id || enc.id}`;
                            }}
                            className="hover:bg-[#E8F5EC]/60 transition cursor-pointer"
                            title="Click to view full encounter details & submitted documentation"
                          >
                            <td className="py-3.5 px-5 font-mono font-bold text-[#10241A]">{enc.assessment_id || enc.id || 'OFP-ENC'}</td>
                            <td className="py-3.5 px-5 text-[#5A7466] whitespace-nowrap">{enc.encounter_date}</td>
                            <td className="py-3.5 px-5">
                              <div className="font-semibold text-[#10241A]">{enc.diagnosis}</div>
                              <div className="text-[11px] text-[#5A7466]">{enc.laterality}</div>
                            </td>
                            <td className="py-3.5 px-5 text-[#10241A]">{enc.procedure}</td>
                            <td className="py-3.5 px-5 text-[#5A7466]">{enc.attending_doctor}</td>
                            <td className="py-3.5 px-5 font-bold text-[#0B6B3A]">
                              ₱{Number(enc.total_amount || 0).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-5">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F5EC] text-[#0B6B3A] border border-[#A7F3D0]">
                                {enc.classification || patient.category}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {/* Inquiries in Process (Not Yet Read by Admin) */}
              {(() => {
                const pendingInqs = myInquiries.filter(
                  (inq: any) => !inq.isRead && inq.status !== 'Answered' && inq.status !== 'Completed'
                );
                return (
                  <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#EEF2EF]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-sm shrink-0">
                          <i className="fa-solid fa-envelope-open-text" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-['Outfit'] text-[15px] font-bold text-[#10241A] m-0">
                              Inquiries in Process
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {pendingInqs.length} Awaiting Admin Review
                            </span>
                          </div>
                          <p className="text-[11px] text-[#5A7466] m-0 mt-0.5">
                            Submitted inquiries that are currently queued and not yet read by the Clinic Administrator.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('applications')}
                        className="px-3.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#FAFBF8] text-[#0B6B3A] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <span>View All / Submit Inquiry</span>
                        <i className="fa-solid fa-arrow-right text-[10px]" />
                      </button>
                    </div>

                    {pendingInqs.length === 0 ? (
                      <div className="py-8 text-center border border-dashed border-[#D5E2D9] rounded-xl bg-[#FAFBF8]">
                        <i className="fa-regular fa-envelope-open text-2xl text-[#94A3B8] mb-2 block" />
                        <p className="text-xs font-bold text-[#334155] m-0">No Unread Inquiries in Process</p>
                        <p className="text-[11px] text-[#64748B] mt-1 mb-0">
                          All your submitted inquiries have been reviewed, or you have no pending messages.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingInqs.map((inq: any, idx: number) => (
                          <div
                            key={inq.id || idx}
                            className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-[10.5px] font-bold px-2 py-0.5 rounded bg-white text-[#10241A] border border-amber-200">
                                  {inq.id}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                  In Process &bull; Unread by Admin
                                </span>
                              </div>
                              <div className="font-bold text-xs text-[#10241A]">{inq.subject || 'Clinic Inquiry'}</div>
                              <p className="text-[11px] text-[#5A7466] m-0 line-clamp-2">{inq.message}</p>
                            </div>
                            <span className="text-[11px] text-[#64748B] shrink-0">
                              {inq.createdAt || inq.date || 'Pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ========================================================
              TAB 2: MY INQUIRIES & CLINIC REPLIES (INQUIRY-ONLY PAGE)
             ======================================================== */}
          {activeTab === 'applications' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Submit an Inquiry or Document to Clinic Desk */}
                <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-6 space-y-4">
                  <div className="border-b border-[#EEF2EF] pb-3">
                    <h2 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0 flex items-center gap-2">
                      <i className="fa-solid fa-paper-plane text-[#0B6B3A]" />
                      <span>Submit Inquiry or Document to Clinic Desk</span>
                    </h2>
                    <p className="text-xs text-[#5A7466] m-0 mt-0.5">
                      Send a question or attach your supporting documents directly to your Patient Master Record ({patient.patient_id}).
                    </p>
                  </div>

                  <form onSubmit={handleSubmitDynamicInquiry} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block font-semibold text-[#10241A] mb-1">
                        Inquiry Subject <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Follow-up on Cataract Surgery Schedule or Document Submission"
                        value={inqSubject}
                        onChange={(e) => setInqSubject(e.target.value)}
                        className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#10241A] mb-1">
                        Message to Clinic / Medical Social Worker <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        required
                        placeholder="Type your message, question, or details about the attached files..."
                        value={inqMessage}
                        onChange={(e) => setInqMessage(e.target.value)}
                        className="w-full p-3 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-[#10241A]">
                          Attach Files / Photos (Optional &bull; {inqFiles.length}/5)
                        </label>
                        <span className="text-[10.5px] text-[#64748B]">PDF, PNG, JPG &bull; Max 5 files</span>
                      </div>
                      <label className="p-3 border border-dashed border-[#CBD5E1] hover:border-[#0B6B3A] rounded-xl bg-[#FAFBF8] flex items-center justify-between cursor-pointer transition">
                        <span className="text-xs text-[#475569] font-medium">
                          <i className="fa-solid fa-cloud-arrow-up text-[#0B6B3A] mr-2" />
                          Click to attach supporting documents or photos
                        </span>
                        <span className="px-2.5 py-1 rounded bg-white border border-[#D5E2D9] text-[11px] font-bold text-[#0B6B3A]">
                          Browse
                        </span>
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                          className="hidden"
                          onChange={handleInqFileAttach}
                        />
                      </label>

                      {inqFiles.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {inqFiles.map((f, idx) => (
                            <div key={idx} className="p-2 bg-[#FAFBF8] border border-[#D5E2D9] rounded-lg flex items-center justify-between">
                              <span className="font-semibold text-xs text-[#10241A] truncate">
                                <i className={`fa-solid ${f.type === 'pdf' ? 'fa-file-pdf text-red-600' : 'fa-file-image text-[#0B6B3A]'} mr-1.5`} />
                                {f.name} ({f.size})
                              </span>
                              <button
                                type="button"
                                disabled={isSubmittingInq}
                                onClick={() => setInqFiles((prev) => prev.filter((_, i) => i !== idx))}
                                className="text-red-600 text-[11px] font-bold cursor-pointer bg-transparent border-0"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingInq}
                      className="w-full py-2.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] disabled:opacity-65 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isSubmittingInq ? (
                        <>
                          <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                          <span>Submitting Inquiry...</span>
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-paper-plane text-xs" />
                          <span>Submit Inquiry to Clinic Record</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Right Column: My Submitted Inquiries & Clinic Responses */}
                <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-6 space-y-4">
                  <div className="border-b border-[#EEF2EF] pb-3 flex items-center justify-between">
                    <div>
                      <h2 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0 flex items-center gap-2">
                        <i className="fa-solid fa-comments text-[#0B6B3A]" />
                        <span>My Submitted Inquiries &amp; Clinic Replies</span>
                      </h2>
                      <p className="text-xs text-[#5A7466] m-0 mt-0.5">
                        Live history of your inquiries and responses from OFPHIL Clinic Administration.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F5EC] text-[#0B6B3A]">
                      {myInquiries.length} Recorded
                    </span>
                  </div>

                  {myInquiries.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-[#D5E2D9] rounded-xl text-[#5A7466] space-y-2">
                      <i className="fa-regular fa-comment-dots text-2xl text-[#94A3B8] block" />
                      <div className="text-xs font-bold text-[#10241A]">No Inquiries Submitted Yet</div>
                      <p className="text-[11px] text-[#5A7466] max-w-xs mx-auto m-0">
                        When you submit an inquiry using the form on the left, it will appear here and in your Admin Patient Record.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                      {myInquiries.map((inq: any, idx: number) => {
                        const badge = inq.patient_badge || (inq.status === 'CLOSED' ? 'CLOSED' : inq.replies?.length ? 'ANSWERED' : 'WAITING FOR RESPONSE');
                        const badgeClass =
                          badge === 'UNREAD REPLY'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : badge === 'ANSWERED'
                              ? 'bg-emerald-50 text-[#0B6B3A] border-emerald-200'
                              : badge === 'CLOSED'
                                ? 'bg-slate-100 text-slate-600 border-slate-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200';
                        const attCount = (inq.attachments || []).length;
                        const repCount = (inq.replies || []).length;
                        return (
                          <div
                            key={inq.id || idx}
                            onClick={() => handleOpenPatientInquiry(inq)}
                            className="p-4 rounded-xl bg-[#FAFBF8] hover:bg-[#F1F8F4] border border-[#D5E2D9] space-y-2 text-xs cursor-pointer transition"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF2EF] pb-2">
                              <div>
                                <span className="font-mono text-[10px] text-[#5A7466] mr-1.5">{inq.id}</span>
                                <span className="font-bold text-[#10241A]">{inq.subject}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                                {badge}
                              </span>
                            </div>
                            <p className="m-0 text-[#334155] line-clamp-2">{inq.message}</p>
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10.5px] text-[#64748B]">
                              <div className="flex items-center gap-3">
                                <span>
                                  <i className="fa-regular fa-clock mr-1" />
                                  {inq.created_at ? new Date(inq.created_at).toLocaleString() : inq.date}
                                </span>
                                {attCount > 0 && (
                                  <span className="text-[#0B6B3A] font-semibold">
                                    <i className="fa-solid fa-paperclip mr-1" />
                                    {attCount} file{attCount > 1 ? 's' : ''}
                                  </span>
                                )}
                                {repCount > 0 && (
                                  <span className="text-[#0B6B3A] font-semibold">
                                    <i className="fa-solid fa-reply mr-1" />
                                    {repCount} repl{repCount > 1 ? 'ies' : 'y'}
                                  </span>
                                )}
                              </div>
                              <span className="text-[#0B6B3A] font-bold">View Conversation &rarr;</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              PHASE 6 & 7: CHARITY ASSISTANCE STATUS PAGE (CHARITY PATIENTS ONLY)
             ======================================================== */}
          {activeTab === 'charity-status' && (
            <div className="space-y-6">
              {String(patient.category || 'REGULAR').toUpperCase() !== 'CHARITY' || charityStatusError ? (
                <div
                  data-testid="charity-status-access-denied"
                  className="bg-white rounded-2xl border border-[#FECACA] p-8 text-center shadow-xs max-w-xl mx-auto my-6 space-y-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center mx-auto text-xl">
                    <i className="fa-solid fa-lock" />
                  </div>
                  <h2 className="font-['Outfit'] text-lg font-bold text-[#10241A] m-0">
                    Charity Assistance Status Unavailable
                  </h2>
                  <p className="text-xs text-[#5A7466] m-0 leading-relaxed">
                    {charityStatusError ||
                      'Access denied: Your account is currently classified as a Regular Patient. Charity Assistance Status is only accessible to patients officially classified as a Charity Patient.'}
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('dashboard')}
                      className="px-4 py-2 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white font-bold text-xs cursor-pointer border-0"
                    >
                      Return to Patient Dashboard
                    </button>
                  </div>
                </div>
              ) : charityStatusLoading && !charityStatusData ? (
                <div className="bg-white rounded-2xl border border-[#EEF2EF] p-10 text-center text-xs text-[#5A7466]">
                  <i className="fa-solid fa-spinner fa-spin text-xl text-[#0B6B3A] mb-2 block" />
                  Loading your Charity Assistance Status...
                </div>
              ) : (
                <>
                  {/* Top Banner */}
                  <div className="bg-white rounded-2xl border border-[#D5E2D9] p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-[#0B6B3A] text-white flex items-center justify-center text-lg shrink-0 shadow-2xs">
                        <i className="fa-solid fa-hand-holding-heart" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-['Outfit'] text-lg font-bold text-[#10241A] m-0">
                            Charity Assistance Status
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#E8F5EC] text-[#0B6B3A] border border-[#A7F3D0]">
                            Read-Only Beneficiary Record
                          </span>
                        </div>
                        <p className="text-xs text-[#5A7466] m-0 mt-1">
                          Official status of your charity assistance application, MSW socio-economic assessment, and authorized grant decision.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => fetchAuthenticatedCharityStatus(patient.patient_id)}
                      className="px-3.5 py-2 rounded-xl border border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] text-xs font-bold text-[#10241A] flex items-center gap-1.5 cursor-pointer"
                    >
                      <i className="fa-solid fa-rotate-right text-[#0B6B3A]" />
                      <span>Refresh Status</span>
                    </button>
                  </div>

                  {/* Empty state notice if classified as CHARITY but no application exists yet */}
                  {!charityStatusData?.has_active_application && (
                    <div
                      data-testid="charity-page-empty-state"
                      className="bg-[#FFFBEB] rounded-2xl border border-[#FDE68A] p-5 text-xs text-[#92400E] flex items-start gap-3"
                    >
                      <i className="fa-solid fa-circle-info text-base text-[#D97706] mt-0.5" />
                      <div>
                        <div className="font-bold text-[#78350F]">No Charity Assistance Application Recorded Yet</div>
                        <p className="m-0 mt-1 text-[#78350F] leading-relaxed">
                          {charityStatusData?.empty_state_message ||
                            'Your account is classified as a Charity Patient, but no charity assistance application has been recorded yet. Please contact the clinic or authorized staff for assistance.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* SECTION A: CHARITY APPLICATION INFORMATION & SECTION B: ASSESSMENT STATUS */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* A. Charity Application Information */}
                    <div className="bg-white rounded-2xl border border-[#D5E2D9] p-6 shadow-xs space-y-4">
                      <div className="border-b border-[#EEF2EF] pb-3 flex items-center justify-between">
                        <h3 className="font-['Outfit'] text-sm font-bold text-[#10241A] m-0 flex items-center gap-2">
                          <i className="fa-solid fa-id-card-clip text-[#0B6B3A]" />
                          <span>A. Charity Application Information</span>
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E8F5EC] text-[#0B6B3A]">
                          {charityStatusData?.application_info?.beneficiary_classification || 'CHARITY'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                          <div className="text-[10px] font-bold uppercase text-[#64748B]">Patient Name</div>
                          <div className="font-bold text-[#10241A] mt-0.5">
                            {charityStatusData?.application_info?.patient_name || patient.name}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                          <div className="text-[10px] font-bold uppercase text-[#64748B]">Patient ID</div>
                          <div className="font-mono font-extrabold text-[#10241A] mt-0.5">
                            {charityStatusData?.application_info?.patient_id || patient.patient_id}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                          <div className="text-[10px] font-bold uppercase text-[#64748B]">Charity Case Number</div>
                          <div className="font-mono font-bold text-[#0B6B3A] mt-0.5">
                            {charityStatusData?.application_info?.charity_case_no || 'Not Yet Assigned'}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                          <div className="text-[10px] font-bold uppercase text-[#64748B]">
                            Application Encounter Number
                          </div>
                          <div className="font-mono font-bold text-[#0369A1] mt-0.5">
                            {charityStatusData?.application_info?.application_encounter_no || 'No Active Application'}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                          <div className="text-[10px] font-bold uppercase text-[#64748B]">Application Date</div>
                          <div className="font-bold text-[#10241A] mt-0.5">
                            {charityStatusData?.application_info?.application_date || 'Not Recorded'}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                          <div className="text-[10px] font-bold uppercase text-[#64748B]">
                            Beneficiary Classification
                          </div>
                          <div className="font-extrabold text-[#0B6B3A] mt-0.5">Charity Patient (CHARITY)</div>
                        </div>
                      </div>
                    </div>

                    {/* B. Assessment Status */}
                    <div className="bg-white rounded-2xl border border-[#D5E2D9] p-6 shadow-xs space-y-4">
                      <div className="border-b border-[#EEF2EF] pb-3 flex items-center justify-between">
                        <h3 className="font-['Outfit'] text-sm font-bold text-[#10241A] m-0 flex items-center gap-2">
                          <i className="fa-solid fa-clipboard-user text-[#0B6B3A]" />
                          <span>B. MSW Assessment Status</span>
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#F1F5F9] text-[#334155]">
                          {charityStatusData?.assessment_status?.submission_status || 'Not Submitted'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                          <div className="text-[10px] font-bold uppercase text-[#64748B]">Current Assessment Status</div>
                          <div className="font-bold text-[#10241A] mt-0.5">
                            {charityStatusData?.assessment_status?.current_status || 'No Active Charity Application'}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                          <div className="text-[10px] font-bold uppercase text-[#64748B]">Assigned MSW</div>
                          <div className="font-bold text-[#10241A] mt-0.5">
                            {charityStatusData?.assessment_status?.assigned_msw || 'Maria Santos, RSW'}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                          <div className="text-[10px] font-bold uppercase text-[#64748B]">Assessment Date</div>
                          <div className="font-bold text-[#10241A] mt-0.5">
                            {charityStatusData?.assessment_status?.assessment_date
                              ? new Date(charityStatusData.assessment_status.assessment_date).toLocaleDateString()
                              : 'Not Started'}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                          <div className="text-[10px] font-bold uppercase text-[#64748B]">Assessment Stage</div>
                          <div className="font-bold text-[#0B6B3A] mt-0.5">
                            {charityStatusData?.assessment_status?.assessment_stage || 'Not Started'}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                          <div className="text-[10px] font-bold uppercase text-[#64748B]">Submission Status</div>
                          <div className="font-bold text-[#10241A] mt-0.5">
                            {charityStatusData?.assessment_status?.submission_status || 'Not Submitted'}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                          <div className="text-[10px] font-bold uppercase text-[#64748B]">Last Updated Date</div>
                          <div className="font-bold text-[#10241A] mt-0.5">
                            {charityStatusData?.assessment_status?.last_updated
                              ? new Date(charityStatusData.assessment_status.last_updated).toLocaleString()
                              : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION C: ELIGIBILITY AND CHARITY DECISION */}
                  <div className="bg-white rounded-2xl border border-[#D5E2D9] p-6 shadow-xs space-y-4">
                    <div className="border-b border-[#EEF2EF] pb-3">
                      <h3 className="font-['Outfit'] text-sm font-bold text-[#10241A] m-0 flex items-center gap-2">
                        <i className="fa-solid fa-scale-balanced text-[#0B6B3A]" />
                        <span>C. Eligibility Recommendation &amp; Final Authorized Charity Decision</span>
                      </h3>
                      <p className="text-[11px] text-[#5A7466] m-0 mt-0.5">
                        An MSW eligibility recommendation is distinct from the final authorized administrative charity decision.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Left box: MSW Eligibility Recommendation */}
                      <div className="p-4 rounded-xl bg-[#FAFBF8] border border-[#D5E2D9] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#0369A1]">
                            1. MSW Eligibility Recommendation
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E0F2FE] text-[#0369A1]">
                            Social Work Assessment
                          </span>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase text-[#64748B]">
                            Recorded Eligibility Recommendation / Grant Tier
                          </div>
                          <div className="text-sm font-extrabold text-[#10241A] mt-0.5">
                            {charityStatusData?.eligibility_and_decision?.msw_eligibility_recommendation ||
                              'Pending MSW Recommendation'}
                          </div>
                        </div>
                        {charityStatusData?.eligibility_and_decision?.recommended_subsidy_pct != null && (
                          <div className="text-[11px] text-[#334155]">
                            Recommended Subsidy Percentage:{' '}
                            <strong>{charityStatusData.eligibility_and_decision.recommended_subsidy_pct}%</strong>
                          </div>
                        )}
                      </div>

                      {/* Right box: Final Authorized Charity Decision */}
                      <div className="p-4 rounded-xl bg-[#F0F9F3] border border-[#A7F3D0] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#0B6B3A]">
                            2. Final Authorized Charity Decision
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#0B6B3A] text-white">
                            Institutional Authority
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <div className="text-[10px] font-bold uppercase text-[#5A7466]">Authorized Decision</div>
                            <div className="text-sm font-extrabold text-[#0B6B3A] mt-0.5">
                              {charityStatusData?.eligibility_and_decision?.final_authorized_decision ||
                                'Pending Official Decision'}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold uppercase text-[#5A7466]">Approved Grant Tier</div>
                            <div className="font-bold text-[#10241A] mt-0.5">
                              {charityStatusData?.eligibility_and_decision?.approved_grant_tier || 'Not Yet Finalized'}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold uppercase text-[#5A7466]">Approved Subsidy</div>
                            <div className="font-extrabold text-[#0B6B3A] mt-0.5">
                              {charityStatusData?.eligibility_and_decision?.approved_subsidy_amount != null
                                ? `₱${Number(charityStatusData.eligibility_and_decision.approved_subsidy_amount).toLocaleString('en-PH', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`
                                : charityStatusData?.eligibility_and_decision?.approved_subsidy_pct != null
                                  ? `${charityStatusData.eligibility_and_decision.approved_subsidy_pct}% Subsidy`
                                  : 'Pending'}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold uppercase text-[#5A7466]">Decision Date</div>
                            <div className="font-bold text-[#10241A] mt-0.5">
                              {charityStatusData?.eligibility_and_decision?.decision_date
                                ? new Date(charityStatusData.eligibility_and_decision.decision_date).toLocaleDateString()
                                : 'Pending'}
                            </div>
                          </div>
                        </div>
                        {charityStatusData?.eligibility_and_decision?.decision_explanation && (
                          <div className="pt-2 border-t border-[#BBF7D0] text-[11px] text-[#1E293B]">
                            <strong>Decision Remarks:</strong>{' '}
                            {charityStatusData.eligibility_and_decision.decision_explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SECTION D: APPLICATION PROGRESS (7 STAGES) */}
                  <div className="bg-white rounded-2xl border border-[#D5E2D9] p-6 shadow-xs space-y-4">
                    <div className="border-b border-[#EEF2EF] pb-3">
                      <h3 className="font-['Outfit'] text-sm font-bold text-[#10241A] m-0 flex items-center gap-2">
                        <i className="fa-solid fa-diagram-project text-[#0B6B3A]" />
                        <span>D. Charity Application Progress</span>
                      </h3>
                      <p className="text-[11px] text-[#5A7466] m-0 mt-0.5">
                        Each stage is marked complete only when confirmed by an official backend record.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 text-xs">
                      {(charityStatusData?.application_progress || []).map((st: any) => (
                        <div
                          key={st.stage}
                          className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2 ${st.completed
                            ? 'bg-[#F0F9F3] border-[#86EFAC]'
                            : 'bg-[#FAFBF8] border-[#E2E8F0]'
                            }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-extrabold uppercase text-[#5A7466]">
                                Stage {st.stage}
                              </span>
                              <i
                                className={`fa-solid ${st.completed
                                  ? 'fa-circle-check text-[#0B6B3A]'
                                  : 'fa-circle-dot text-[#94A3B8]'
                                  }`}
                              />
                            </div>
                            <div className="font-bold text-[#10241A] mt-1.5 leading-snug">{st.title}</div>
                            <p className="text-[10.5px] text-[#5A7466] mt-1 m-0 leading-relaxed">
                              {st.description}
                            </p>
                          </div>
                          <div className="pt-2 border-t border-[#E2ECE5]">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold ${st.completed
                                ? 'bg-[#0B6B3A] text-white'
                                : 'bg-[#E2E8F0] text-[#475569]'
                                }`}
                            >
                              {st.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SECTION E: SUPPORTING DOCUMENTS */}
                  <div className="bg-white rounded-2xl border border-[#D5E2D9] p-6 shadow-xs space-y-4">
                    <div className="border-b border-[#EEF2EF] pb-3 flex items-center justify-between">
                      <div>
                        <h3 className="font-['Outfit'] text-sm font-bold text-[#10241A] m-0 flex items-center gap-2">
                          <i className="fa-solid fa-folder-open text-[#0B6B3A]" />
                          <span>
                            E. Supporting Documents ({(charityStatusData?.supporting_documents || []).length})
                          </span>
                        </h3>
                        <p className="text-[11px] text-[#5A7466] m-0 mt-0.5">
                          Authorized supporting documents linked to your charity assistance record.
                        </p>
                      </div>
                    </div>

                    {(charityStatusData?.supporting_documents || []).length === 0 ? (
                      <div className="p-8 text-center rounded-xl bg-[#FAFBF8] border border-dashed border-[#D5E2D9] text-xs text-[#5A7466]">
                        No supporting documents are currently attached to your charity assistance record.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                        {charityStatusData.supporting_documents.map((doc: any) => (
                          <div
                            key={doc.id}
                            className="p-4 rounded-xl bg-[#FAFBF8] border border-[#D5E2D9] flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-[#10241A] truncate">{doc.document_type}</div>
                              <div className="text-[11px] text-[#5A7466] truncate">{doc.filename}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8F5EC] text-[#0B6B3A]">
                                  {doc.review_status}
                                </span>
                                {doc.upload_date && (
                                  <span className="text-[10px] text-[#64748B]">
                                    {new Date(doc.upload_date).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleCharityDocumentAction(doc, false)}
                                className="px-2.5 py-1.5 rounded-lg border border-[#D5E2D9] bg-white hover:border-[#0B6B3A] text-[#0B6B3A] font-bold text-xs cursor-pointer"
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCharityDocumentAction(doc, true)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#0B6B3A] text-white font-bold text-xs cursor-pointer border-0"
                              >
                                Download
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Charity Document Preview Modal */}
                  {charityDocPreview && (
                    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                      <div className="bg-white rounded-2xl border border-[#D5E2D9] max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="px-4 py-3 bg-[#FAFBF8] border-b border-[#D5E2D9] flex items-center justify-between">
                          <span className="text-xs font-bold text-[#10241A]">{charityDocPreview.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              URL.revokeObjectURL(charityDocPreview.url);
                              setCharityDocPreview(null);
                            }}
                            className="w-8 h-8 rounded-lg border border-[#D5E2D9] bg-white text-[#475569] cursor-pointer"
                          >
                            <i className="fa-solid fa-xmark" />
                          </button>
                        </div>
                        <div className="p-4 flex-1 overflow-auto bg-[#F1F5F9] flex items-center justify-center min-h-[340px]">
                          {charityDocPreview.type === 'pdf' ? (
                            <iframe
                              src={charityDocPreview.url}
                              title={charityDocPreview.name}
                              className="w-full h-[60vh] rounded-xl border border-[#CBD5E1] bg-white"
                            />
                          ) : (
                            <img
                              src={charityDocPreview.url}
                              alt={charityDocPreview.name}
                              className="max-h-[60vh] max-w-full rounded-xl border border-[#CBD5E1] bg-white object-contain"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ========================================================
              TAB 2.5: PATIENT NOTIFICATIONS & CLINIC ALERTS PAGE
             ======================================================== */}
          {activeTab === 'appointments' && (() => {
            const totalAppts = appointments.length;
            const scheduledCount = appointments.filter((a) => a.status === 'Scheduled').length;
            const pendingCount = appointments.filter((a) => a.status === 'Pending Nurse Approval').length;
            const completedCount = appointments.filter((a) => a.status === 'Completed' || a.status === 'Cancelled').length;

            const filteredAppts = appointments
              .filter((a) => {
                if (apptHistoryFilter !== 'all' && a.status !== apptHistoryFilter) return false;
                if (apptHistorySearch.trim()) {
                  const q = apptHistorySearch.toLowerCase();
                  return (
                    (a.title || '').toLowerCase().includes(q) ||
                    (a.doctor || '').toLowerCase().includes(q) ||
                    (a.notes || '').toLowerCase().includes(q) ||
                    (a.date || '').toLowerCase().includes(q) ||
                    (a.status || '').toLowerCase().includes(q)
                  );
                }
                return true;
              })
              .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));

            return (
              <div className="space-y-6">
                {/* Header Card */}
                <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-lg shrink-0">
                      <i className="fa-solid fa-calendar-check" />
                    </div>
                    <div>
                      <h2 className="font-['Outfit'] text-lg font-bold text-[#10241A] m-0">
                        Appointment History &amp; Clinic Visits
                      </h2>
                      <p className="text-xs text-[#5A7466] m-0 mt-0.5">
                        Complete log of your past, upcoming, pending, and cancelled clinic appointments at OFPHIL.
                      </p>
                    </div>
                  </div>

                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-4">
                    <div className="text-[11px] font-bold uppercase text-[#5A7466]">Total Appointments</div>
                    <div className="font-['Outfit'] text-2xl font-extrabold text-[#10241A] mt-1">{totalAppts}</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-4">
                    <div className="text-[11px] font-bold uppercase text-[#0B6B3A]">Approved / Scheduled</div>
                    <div className="font-['Outfit'] text-2xl font-extrabold text-[#0B6B3A] mt-1">{scheduledCount}</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-4">
                    <div className="text-[11px] font-bold uppercase text-amber-700">Pending Nurse Approval</div>
                    <div className="font-['Outfit'] text-2xl font-extrabold text-amber-600 mt-1">{pendingCount}</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-4">
                    <div className="text-[11px] font-bold uppercase text-[#64748B]">Completed / Cancelled</div>
                    <div className="font-['Outfit'] text-2xl font-extrabold text-[#334155] mt-1">{completedCount}</div>
                  </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {(['all', 'Scheduled', 'Completed', 'Cancelled'] as const).map((statusKey) => (
                      <button
                        key={statusKey}
                        type="button"
                        onClick={() => setApptHistoryFilter(statusKey)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${apptHistoryFilter === statusKey
                          ? 'bg-[#0B6B3A] text-white'
                          : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                          }`}
                      >
                        {statusKey === 'all' ? 'All Records' : statusKey}
                      </button>
                    ))}
                  </div>
                  <div className="relative w-full sm:w-64">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8]" />
                    <input
                      type="text"
                      value={apptHistorySearch}
                      onChange={(e) => setApptHistorySearch(e.target.value)}
                      placeholder="Search purpose, doctor, date..."
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                    />
                  </div>
                </div>

                {/* Appointment History List */}
                <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-6">
                  {filteredAppts.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-[#D5E2D9] rounded-xl bg-[#FAFBF8]">
                      <i className="fa-solid fa-calendar-xmark text-3xl text-[#94A3B8] mb-2 block" />
                      <p className="text-sm font-bold text-[#334155] m-0">No appointment history found</p>
                      <p className="text-xs text-[#64748B] mt-1 mb-0">
                        {apptHistoryFilter === 'all' && !apptHistorySearch
                          ? 'Your past and upcoming clinic appointments will appear here.'
                          : 'Try adjusting your status filter or search query.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredAppts.map((appt) => {
                        const isPending = appt.status === 'Pending Nurse Approval';
                        const isScheduled = appt.status === 'Scheduled';
                        const isCompleted = appt.status === 'Completed';
                        return (
                          <div
                            key={appt.id}
                            className="p-4 rounded-xl border border-[#EEF2EF] bg-[#FAFBF8] hover:border-[#D5E2D9] transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase ${isScheduled
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isPending
                                      ? 'bg-amber-100 text-amber-800'
                                      : isCompleted
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-slate-200 text-slate-700'
                                    }`}
                                >
                                  {appt.status}
                                </span>
                                <span className="text-xs font-bold text-[#10241A]">
                                  <i className="fa-regular fa-calendar mr-1 text-[#0B6B3A]" />
                                  {appt.date} &bull; {appt.time}
                                </span>
                              </div>
                              <h4 className="font-['Outfit'] text-[15px] font-bold text-[#10241A] m-0">
                                {appt.title}
                              </h4>
                              <p className="text-xs text-[#5A7466] m-0">
                                <i className="fa-solid fa-user-doctor mr-1" />
                                {appt.doctor || 'OFPHIL Ophthalmology Clinic'}
                                {appt.notes ? ` — ${appt.notes}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {isPending && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditApptRequest(appt)}
                                  className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-xs font-bold text-[#10241A] cursor-pointer transition"
                                >
                                  <i className="fa-solid fa-pen mr-1 text-[#0B6B3A]" />
                                  Edit Request
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {activeTab === 'notifications' && (() => {
            const pid = patient.patient_id;
            const readSet = new Set(readNotifIds);

            const unifiedNotifs: Array<{
              id: string;
              category: 'Urgent Requirement Request' | 'Clinic Appointment Schedule' | 'Clinic Inquiry Response' | 'Clinical Diagnosis & Procedure';
              title: string;
              message: string;
              timestamp: string;
              badgeColor: string;
              icon: string;
              isRead: boolean;
              actionTab?: 'dashboard' | 'applications';
              actionLabel?: string;
            }> = [];

            // 4. Logged Clinical Encounters / Diagnoses
            encounters.forEach((enc: any, idx: number) => {
              const nid = `enc-${enc.assessment_id || enc.id || idx}`;
              unifiedNotifs.push({
                id: nid,
                category: 'Clinical Diagnosis & Procedure',
                title: `New Clinical Diagnosis Logged (${enc.assessment_id || enc.id || 'ENC'}): ${enc.diagnosis || 'Ophthalmology Assessment'}`,
                message: `Procedure: ${enc.procedure || 'N/A'} • Surgeon: ${enc.attending_doctor || 'OFPHIL Medical Team'} • Estimated Quotation: ₱${Number(enc.total_amount ?? enc.total_quotation ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
                timestamp: enc.encounter_date || enc.checkup_date || 'Recent',
                badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                icon: 'fa-stethoscope text-[#0B6B3A]',
                isRead: readSet.has(nid),
                actionTab: 'dashboard',
                actionLabel: 'View Clinical Record',
              });
            });

            // 1. Urgent Alerts / Missing Requirements from Admin/MSW
            urgentAlerts.forEach((u: any, idx: number) => {
              const nid = `urgent-${u.id || idx}`;
              unifiedNotifs.push({
                id: nid,
                category: 'Urgent Requirement Request',
                title: u.subject || u.categoryLabel || 'Urgent Notice from OFPHIL Clinic Desk',
                message: u.message || 'Please submit your lacking requirements in the Applications & Inquiries tab.',
                timestamp: u.timestamp || 'Recent',
                badgeColor: 'bg-red-50 text-red-700 border-red-200',
                icon: 'fa-triangle-exclamation text-red-600',
                isRead: readSet.has(nid),
                actionTab: 'applications',
                actionLabel: 'Go to Applications & Upload Requirements',
              });
            });

            // 2. Appointments & Schedule Updates (Approved or Pending)
            appointments.forEach((a: any, idx: number) => {
              const nid = `appt-${a.id || idx}-${a.status}`;
              const isApproved = a.status === 'Scheduled';
              unifiedNotifs.push({
                id: nid,
                category: 'Clinic Appointment Schedule',
                title: isApproved
                  ? `Appointment Approved & Confirmed (${a.id}): ${a.appointment_type}`
                  : `Appointment Request Submitted (${a.id}): ${a.appointment_type}`,
                message: isApproved
                  ? `Your clinic schedule on ${a.appointment_date} (${a.appointment_time}) with ${a.assigned_doctor} at ${a.clinic_room} has been approved by the Clinic Nurse.`
                  : `Your requested slot on ${a.appointment_date} (${a.appointment_time}) is currently awaiting Nurse / Admin approval.`,
                timestamp: a.created_at || a.appointment_date,
                badgeColor: isApproved
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200',
                icon: isApproved ? 'fa-calendar-check text-[#0B6B3A]' : 'fa-hourglass-half text-amber-600',
                isRead: readSet.has(nid),
                actionTab: 'dashboard',
                actionLabel: 'View in Appointments & Schedule',
              });
            });

            // 3. Clinic Replies to Patient's Inquiries
            myInquiries.forEach((inq: any) => {
              if (inq && Array.isArray(inq.replyHistory)) {
                inq.replyHistory.forEach((rep: any, rIdx: number) => {
                  const nid = `reply-${inq.id}-${rIdx}`;
                  unifiedNotifs.push({
                    id: nid,
                    category: 'Clinic Inquiry Response',
                    title: `Clinic Reply on "${inq.subject}" (${inq.id})`,
                    message: rep.message,
                    timestamp: rep.timestamp || inq.date,
                    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
                    icon: 'fa-envelope-open-text text-blue-600',
                    isRead: readSet.has(nid),
                    actionTab: 'applications',
                    actionLabel: 'View Inquiry Conversation',
                  });
                });
              }
            });

            const unreadCount = unifiedNotifs.filter((n) => !n.isRead).length;
            const patientTotalNotifs = unifiedNotifs.length;
            const patientTotalPages = Math.max(1, Math.ceil(patientTotalNotifs / patientNotifPageSize));
            const paginatedNotifs = unifiedNotifs.slice(
              (patientNotifPage - 1) * patientNotifPageSize,
              patientNotifPage * patientNotifPageSize
            );

            const handleToggleReadNotif = (nid: string) => {
              const next = readSet.has(nid)
                ? readNotifIds.filter((id) => id !== nid)
                : [...readNotifIds, nid];
              setReadNotifIds(next);
              try {
                localStorage.setItem(`ofphil_patient_read_notifs_${pid}`, JSON.stringify(next));
                setTimeout(() => window.dispatchEvent(new Event('ofphil-patient-notifs-updated')), 0);
              } catch { }
            };

            const handleMarkAllRead = () => {
              const allIds = unifiedNotifs.map((n) => n.id);
              setReadNotifIds(allIds);
              try {
                localStorage.setItem(`ofphil_patient_read_notifs_${pid}`, JSON.stringify(allIds));
                setTimeout(() => window.dispatchEvent(new Event('ofphil-patient-notifs-updated')), 0);
              } catch { }
              toast.success('All notifications marked as read!');
            };

            return (
              <div className="space-y-5 pb-12 text-xs">
                {/* Header Card */}
                <div className="bg-white p-5 rounded-2xl border border-[#D5E2D9] shadow-xs flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-[#E8F5EC] border border-[#A7F3D0] text-[#0B6B3A] flex items-center justify-center text-lg font-bold shrink-0">
                      <i className="fa-solid fa-bell" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-base font-bold text-[#10241A] font-['Outfit'] m-0">
                          Patient Notifications &amp; Clinic Alerts
                        </h2>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${unreadCount > 0
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-[#E8F5EC] text-[#0B6B3A] border-[#A7F3D0]'
                            }`}
                        >
                          {unreadCount} Unread / {unifiedNotifs.length} Total
                        </span>
                      </div>
                      <p className="text-xs text-[#5A7466] m-0 mt-0.5">
                        Real-time updates on your clinic appointments, nurse schedule approvals, urgent document requests, and inquiry replies.
                      </p>
                    </div>
                  </div>

                  {unifiedNotifs.length > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="px-4 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#FAFBF8] text-[#0B6B3A] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                    >
                      <i className="fa-solid fa-check-double text-xs" />
                      <span>Mark All as Read</span>
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                {unifiedNotifs.length === 0 ? (
                  <div className="bg-white border border-[#D5E2D9] rounded-2xl py-14 px-6 text-center shadow-xs flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#FAFBF8] border border-[#D5E2D9] text-[#0B6B3A] flex items-center justify-center text-xl">
                      <i className="fa-regular fa-bell" />
                    </div>
                    <div className="font-bold text-sm text-[#10241A]">You Have No Clinic Notifications Yet</div>
                    <p className="text-xs text-[#5A7466] max-w-md m-0 leading-relaxed">
                      When the Clinic Administrator, Nurse, or Medical Social Worker approves your appointment schedule, sends an urgent requirement request, or replies to your inquiry, it will appear here in real time.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {paginatedNotifs.map((n) => (
                        <div
                          key={n.id}
                          className={`p-5 rounded-2xl border transition shadow-xs flex flex-col gap-3 ${n.isRead
                            ? 'bg-white border-[#E2E8F0]'
                            : 'bg-[#F0FDF4]/50 border-[#A7F3D0]'
                            }`}
                        >
                          <div className="flex items-start gap-3.5 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-white border border-[#D5E2D9] flex items-center justify-center text-base shrink-0 shadow-2xs">
                              <i className={`fa-solid ${n.icon}`} />
                            </div>
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${n.badgeColor}`}>
                                  {n.category}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${n.isRead
                                    ? 'bg-slate-100 text-slate-600'
                                    : 'bg-[#DC2626] text-white'
                                    }`}
                                >
                                  {n.isRead ? 'READ' : 'UNREAD'}
                                </span>
                                <span className="text-[11px] text-[#64748B]">
                                  <i className="fa-regular fa-clock mr-1" />
                                  {n.timestamp}
                                </span>
                              </div>

                              <div className="font-bold text-sm text-[#10241A]">{n.title}</div>
                              <p className="text-xs text-[#334155] m-0 whitespace-pre-wrap leading-relaxed bg-white/90 p-3 rounded-xl border border-[#EEF2EF]">
                                {n.message}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleToggleReadNotif(n.id)}
                              className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#FAFBF8] text-[#10241A] font-semibold text-[11px] cursor-pointer transition"
                            >
                              {n.isRead ? 'Mark Unread' : '✓ Mark Read'}
                            </button>

                            {n.actionTab && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (!n.isRead) handleToggleReadNotif(n.id);
                                  setActiveTab(n.actionTab!);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white font-bold text-[11px] cursor-pointer transition border-0"
                              >
                                {n.actionLabel} &rarr;
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Patient Notifications Pagination Bar */}
                    {patientTotalNotifs > 0 && (
                      <div className="p-4 bg-white rounded-2xl border border-[#D5E2D9] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#5A7466]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>
                            Showing{' '}
                            <strong className="text-[#10241A] font-semibold">
                              {Math.min((patientNotifPage - 1) * patientNotifPageSize + 1, patientTotalNotifs)}–{Math.min(patientNotifPage * patientNotifPageSize, patientTotalNotifs)}
                            </strong>{' '}
                            of <strong className="text-[#10241A] font-semibold">{patientTotalNotifs}</strong> notifications
                          </span>
                          <span className="text-[#CBD5E1]">&bull;</span>
                          <span>
                            Page <strong className="text-[#10241A] font-semibold">{patientNotifPage}</strong> of{' '}
                            <strong className="text-[#10241A] font-semibold">{patientTotalPages}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={patientNotifPage <= 1}
                            onClick={() => setPatientNotifPage((p) => Math.max(1, p - 1))}
                            className="px-3.5 py-1.5 rounded-lg border border-[#D5E2E9] bg-white text-[#10241A] font-semibold hover:bg-[#FAFBF8] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <i className="fa-solid fa-chevron-left text-[10px]" />
                            <span>Previous</span>
                          </button>
                          <button
                            type="button"
                            disabled={patientNotifPage >= patientTotalPages}
                            onClick={() => setPatientNotifPage((p) => Math.min(patientTotalPages, p + 1))}
                            className="px-3.5 py-1.5 rounded-lg border border-[#D5E2D9] bg-white text-[#10241A] font-semibold hover:bg-[#FAFBF8] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <span>Next</span>
                            <i className="fa-solid fa-chevron-right text-[10px]" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ========================================================
              TAB 3: MY PROFILE (Juan Dela Cruz - M26-11-00001)
             ======================================================== */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Breadcrumb Header (Matching Admin Profile Format) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
                <div className="flex items-center gap-2 text-xs text-[#5A7466]">
                  <button
                    type="button"
                    onClick={() => setActiveTab('dashboard')}
                    className="text-[#0B6B3A] font-semibold flex items-center gap-1 hover:underline bg-transparent border-0 cursor-pointer p-0"
                  >
                    <i className="fa-solid fa-house text-xs" />
                    <span>Patient Portal</span>
                  </button>
                  <span>&bull;</span>
                  <span className="text-[#10241A] font-medium">My Account Profile</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="px-3.5 py-1.5 rounded-lg border border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] font-semibold text-xs text-[#10241A] flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                  >
                    <i className="fa-solid fa-sliders text-xs text-[#0B6B3A]" />
                    <span>Account Settings</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('dashboard')}
                    className="px-3.5 py-1.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-2xs border-0 cursor-pointer"
                  >
                    <i className="fa-solid fa-arrow-left text-xs" />
                    <span>Back to Dashboard</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Left Column: Compact Avatar & Quick Info Card + Separate Privacy Card */}
                <div className="space-y-5">
                  <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-6 flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-full bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-3xl font-extrabold font-['Outfit'] mb-3 border-2 border-[#A7F3D0] shadow-sm">
                      {patient.name.charAt(0)}
                    </div>
                    <h2 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0">{patient.name}</h2>
                    <div className="font-mono text-xs text-[#5A7466] mb-3">@{patient.username}</div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F5EC] border border-[#A7F3D0] text-[#0B6B3A] font-bold text-xs mb-4">
                      <i className="fa-solid fa-hospital-user text-xs" />
                      <span>Patient Beneficiary</span>
                    </div>

                    {/* Account Key Metrics (Matching Admin Profile Format) */}
                    <div className="w-full space-y-2.5 pt-4 border-t border-[#EEF2EF] text-left text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-[#5A7466] flex items-center gap-1.5">
                          <i className="fa-solid fa-circle-check text-[#0B6B3A]" />
                          <span>Account Status</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md font-bold text-[10.5px] bg-[#ECFDF5] text-[#0B6B3A]">
                          Active
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#5A7466] flex items-center gap-1.5">
                          <i className="fa-solid fa-hospital-user text-xs text-[#0B6B3A]" />
                          <span>User Role</span>
                        </span>
                        <span className="font-bold text-[#0B6B3A]">Patient Beneficiary</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#5A7466] flex items-center gap-1.5">
                          <i className="fa-solid fa-id-card text-xs" />
                          <span>Patient ID</span>
                        </span>
                        <span className="font-mono font-bold text-[#10241A]">{patient.patient_id}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#5A7466] flex items-center gap-1.5">
                          <i className="fa-solid fa-tag text-xs text-[#0B6B3A]" />
                          <span>Category</span>
                        </span>
                        <span className="font-bold text-[#10241A]">{patient.category}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#5A7466] flex items-center gap-1.5">
                          <i className="fa-solid fa-cake-candles text-xs text-[#0B6B3A]" />
                          <span>Birthday</span>
                        </span>
                        <span className="font-medium text-[#10241A]">{patient.birthdate}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#5A7466] flex items-center gap-1.5">
                          <i className="fa-solid fa-location-dot text-xs text-[#0B6B3A]" />
                          <span>City / Province</span>
                        </span>
                        <span className="font-medium text-[#10241A] text-right">
                          {patient.perm_city}, {patient.perm_province}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Separate Privacy Governance Card (Prevents Blank White Space) */}
                  <div className="p-5 rounded-2xl bg-[#FAFBF8] border border-[#EEF2EF] text-[11px] text-[#5A7466] text-left leading-relaxed shadow-xs">
                    <strong className="text-[#0B6B3A] flex items-center gap-1.5 mb-1.5 text-xs">
                      <i className="fa-solid fa-shield-halved" />
                      <span>Healthcare Privacy Protected</span>
                    </strong>
                    Your records are handled in strict compliance with Republic Act No. 10173 (Data Privacy Act of 2012).
                  </div>
                </div>

                {/* Right Column: Forms */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-6">
                    <div className="mb-4">
                      <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] mb-1">
                        Personal &amp; Contact Information
                      </h3>
                      <p className="text-xs text-[#5A7466]">
                        Keep your contact information up to date so the clinic team can reach you regarding consultations and assistance updates.
                      </p>
                    </div>

                    <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        <div>
                          <label className="block font-semibold text-[#10241A] mb-1">
                            First Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={profileFirstName}
                            onChange={(e) => setProfileFirstName(e.target.value)}
                            className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-[#10241A] mb-1">
                            Middle Name
                          </label>
                          <input
                            type="text"
                            value={profileMiddleName}
                            onChange={(e) => setProfileMiddleName(e.target.value)}
                            className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-[#10241A] mb-1">
                            Last Name / Surname <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={profileLastName}
                            onChange={(e) => setProfileLastName(e.target.value)}
                            className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                        <div>
                          <label className="block font-semibold text-[#10241A] mb-1">
                            Birthday / Date of Birth <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={profileBirthdate}
                            onChange={(e) => setProfileBirthdate(e.target.value)}
                            className="w-full h-10 px-3 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-[#10241A] mb-1">
                            Age
                          </label>
                          <input
                            type="number"
                            value={profileAge}
                            onChange={(e) => setProfileAge(e.target.value)}
                            className="w-full h-10 px-3 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-[#10241A] mb-1">
                            Sex
                          </label>
                          <select
                            value={profileSex}
                            onChange={(e) => setProfileSex(e.target.value)}
                            className="w-full h-10 px-3 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                          >
                            <option value="M">Male (M)</option>
                            <option value="F">Female (F)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-semibold text-[#10241A] mb-1">
                            Civil Status
                          </label>
                          <select
                            value={profileCivilStatus}
                            onChange={(e) => setProfileCivilStatus(e.target.value)}
                            className="w-full h-10 px-3 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                          >
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Widowed">Widowed</option>
                            <option value="Separated">Separated</option>
                          </select>
                        </div>
                      </div>

                      {/* PSGC API Address Dropdowns (Province, City/Municipality, Barangay, Street) */}
                      <div className="p-4 rounded-xl bg-[#FAFBF8] border border-[#D5E2D9] space-y-2">
                        <div className="font-bold text-xs text-[#0B6B3A] flex items-center gap-1.5 mb-1">
                          <i className="fa-solid fa-house-chimney" />
                          <span>Permanent Home Address (PSGC Verified Province, City &amp; Barangay)</span>
                        </div>
                        <PsgcAddressSelector
                          province={profileProvince}
                          city={profileCity}
                          barangay={profileBarangay}
                          street={profileStreet}
                          onProvinceChange={setProfileProvince}
                          onCityChange={setProfileCity}
                          onBarangayChange={setProfileBarangay}
                          onStreetChange={setProfileStreet}
                          streetLabel="House No., Street Name, Subd. / Building (Permanent Address)"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        <div>
                          <label className="block font-semibold text-[#10241A] mb-1">
                            Educational Attainment
                          </label>
                          <select
                            value={profileEducation}
                            onChange={(e) => setProfileEducation(e.target.value)}
                            className="w-full h-10 px-3 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                          >
                            <option value="Elementary Graduate / Level">Elementary Graduate / Level</option>
                            <option value="High School Graduate / Level">High School Graduate / Level</option>
                            <option value="Vocational / Tech Course">Vocational / Tech Course</option>
                            <option value="College Undergraduate">College Undergraduate</option>
                            <option value="College Graduate">College Graduate</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-semibold text-[#10241A] mb-1">
                            Occupation
                          </label>
                          <input
                            type="text"
                            value={profileOccupation}
                            onChange={(e) => setProfileOccupation(e.target.value)}
                            className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-[#10241A] mb-1">
                            No. of Dependents
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={profileDependents}
                            onChange={(e) => setProfileDependents(e.target.value)}
                            className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-semibold text-[#10241A]">Email Address</label>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#0B6B3A] text-[10px] font-bold">
                              <i className="fa-solid fa-circle-check" /> Verified
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="email"
                              value={profileEmail}
                              readOnly
                              className="flex-1 h-10 px-3.5 border border-[#EEF2EF] rounded-lg text-xs bg-[#FAFBF8] text-[#10241A] cursor-not-allowed"
                            />
                            <button
                              type="button"
                              onClick={() => setContactModalType('email')}
                              className="px-3 h-10 rounded-lg border border-[#0B6B3A] text-[#0B6B3A] hover:bg-[#E8F5EC] font-semibold text-xs transition cursor-pointer bg-white shrink-0"
                            >
                              Change
                            </button>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-semibold text-[#10241A]">
                              Mobile / Contact Number <span className="text-red-500">*</span>
                            </label>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#0B6B3A] text-[10px] font-bold">
                              <i className="fa-solid fa-circle-check" /> Verified
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="tel"
                              value={profilePhone}
                              readOnly
                              className="flex-1 h-10 px-3.5 border border-[#EEF2EF] rounded-lg text-xs bg-[#FAFBF8] text-[#10241A] cursor-not-allowed"
                            />
                            <button
                              type="button"
                              onClick={() => setContactModalType('mobile')}
                              className="px-3 h-10 rounded-lg border border-[#0B6B3A] text-[#0B6B3A] hover:bg-[#E8F5EC] font-semibold text-xs transition cursor-pointer bg-white shrink-0"
                            >
                              Change
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-semibold text-[#10241A] mb-1">
                            User Role / Account Classification
                          </label>
                          <input
                            type="text"
                            value="Patient Beneficiary (OFPHIL Portal)"
                            readOnly
                            className="w-full h-10 px-3.5 border border-[#EEF2EF] rounded-lg text-xs bg-[#FAFBF8] text-[#0B6B3A] font-bold cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-[#10241A] mb-1">
                            Assigned Patient ID / Username
                          </label>
                          <input
                            type="text"
                            value={patient.patient_id}
                            readOnly
                            className="w-full h-10 px-3.5 border border-[#EEF2EF] rounded-lg text-xs bg-[#FAFBF8] text-[#5A7466] cursor-not-allowed font-mono"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        {profileSaved && (
                          <span className="text-xs text-[#0B6B3A] font-bold">
                            ✓ Profile information saved successfully!
                          </span>
                        )}
                        <button
                          type="submit"
                          className="ml-auto px-5 py-2.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                        >
                          <i className="fa-solid fa-floppy-disk text-xs" />
                          <span>Save Profile Changes</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Change My Portal Password Card */}
                  <ProfilePasswordChangeCard
                    role="patient"
                    userId={patient.patient_id}
                    defaultEmail={patient.email}
                    defaultMobile={patient.contact}
                    title="Change My Portal Password"
                    subtitle="Maintain strong credentials to protect sensitive ophthalmology patient records, consultation schedules, and clinical logs."
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 4: SETTINGS & PREFERENCES (Juan Dela Cruz - M26-11-00001)
             ======================================================== */}
          {activeTab === 'settings' && (
            <div className="w-full pb-12">
              <div className="bg-white border border-[#D5E2D9] rounded-2xl p-2 mb-6 shadow-xs overflow-x-auto">
                <div className="flex items-center gap-1 sm:gap-2 min-w-max">
                  {(
                    [
                      { key: 'profile', icon: 'fa-user', label: '01. My Profile' },
                      { key: 'security', icon: 'fa-lock', label: '02. Account Security' },
                      { key: 'appointments', icon: 'fa-calendar-check', label: '03. Appointment Preferences' },
                      { key: 'notifications', icon: 'fa-bell', label: '04. Notifications' },
                      { key: 'privacy', icon: 'fa-shield-halved', label: '05. Privacy & Consent' },
                      { key: 'accessibility', icon: 'fa-universal-access', label: '06. Accessibility' },
                      { key: 'account', icon: 'fa-user-gear', label: '07. Account Management' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setSettingsActiveSubTab(t.key)}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border-0 ${settingsActiveSubTab === t.key
                        ? 'text-[#0B6B3A] border-b-2 border-[#0B6B3A] bg-[#E8F5EC]/60 font-bold'
                        : 'text-[#64748B] hover:text-[#10241A] hover:bg-[#F8FAFC]'
                        }`}
                    >
                      <i className={`fa-solid ${t.icon} text-xs`} />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#D5E2D9] p-6 sm:p-8 shadow-xs">
                {settingsActiveSubTab === 'profile' && (
                  <div>
                    <div className="mb-6">
                      <h3 className="font-['Outfit'] text-lg font-bold text-[#10241A] flex items-center gap-2 m-0 mb-1.5">
                        <i className="fa-solid fa-user text-[#0B6B3A] text-base" />
                        <span>Patient Personal Details</span>
                      </h3>
                      <p className="text-xs text-[#5A7466] m-0 leading-relaxed">
                        Your verified patient details on file with the OFPHIL Eye Center ({patient.patient_id}).
                      </p>
                    </div>

                    <form onSubmit={handleSettingsProfileSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-medium text-[#334155] mb-2">Full Name</label>
                          <input
                            type="text"
                            value={settingsFullName}
                            onChange={(e) => setSettingsFullName(e.target.value)}
                            required
                            className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-[#334155]">Email Address</label>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#0B6B3A] text-[10px] font-bold">
                              <i className="fa-solid fa-circle-check" /> Verified
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="email"
                              value={settingsEmail}
                              readOnly
                              className="flex-1 h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-[#F8FAFC] text-[#10241A] cursor-not-allowed"
                            />
                            <button
                              type="button"
                              onClick={() => setContactModalType('email')}
                              className="px-4 h-12 rounded-xl border border-[#0B6B3A] text-[#0B6B3A] hover:bg-[#E8F5EC] font-semibold text-xs transition cursor-pointer bg-white shrink-0"
                            >
                              Change
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-medium text-[#334155] mb-2">Assigned Patient ID No.</label>
                          <input
                            type="text"
                            value={patient.patient_id}
                            readOnly
                            className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm font-mono bg-[#F8FAFC] text-[#5A7466] cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-[#334155]">Contact Mobile Number (For OTP)</label>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#0B6B3A] text-[10px] font-bold">
                              <i className="fa-solid fa-circle-check" /> Verified
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="tel"
                              value={settingsPhone}
                              readOnly
                              className="flex-1 h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-[#F8FAFC] text-[#10241A] cursor-not-allowed"
                            />
                            <button
                              type="button"
                              onClick={() => setContactModalType('mobile')}
                              className="px-4 h-12 rounded-xl border border-[#0B6B3A] text-[#0B6B3A] hover:bg-[#E8F5EC] font-semibold text-xs transition cursor-pointer bg-white shrink-0"
                            >
                              Change
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-[#FAFBF8] border border-[#D5E2D9] space-y-2">
                        <div className="font-bold text-xs text-[#0B6B3A] flex items-center gap-1.5 mb-1">
                          <i className="fa-solid fa-map-location-dot" />
                          <span>Registered Home Address (PSGC Province, City/Municipality &amp; Barangay)</span>
                        </div>
                        <PsgcAddressSelector
                          province={profileProvince}
                          city={profileCity}
                          barangay={profileBarangay}
                          street={profileStreet}
                          onProvinceChange={setProfileProvince}
                          onCityChange={setProfileCity}
                          onBarangayChange={setProfileBarangay}
                          onStreetChange={setProfileStreet}
                          streetLabel="House No., Street Name, Subd. / Building"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-medium text-[#334155] mb-2">Birthday / Date of Birth</label>
                          <input
                            type="date"
                            value={profileBirthdate}
                            onChange={(e) => setProfileBirthdate(e.target.value)}
                            className="w-full h-11 px-4 border border-[#CBD5E1] rounded-xl text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#334155] mb-2">Emergency Contact Relative</label>
                          <input
                            type="text"
                            placeholder="e.g. Maria Dela Cruz (Spouse - 0917-000-1111)"
                            value={settingsEmergency}
                            onChange={(e) => setSettingsEmergency(e.target.value)}
                            className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-[#EEF2EF]">
                        {settingsSaved ? (
                          <span className="text-xs text-[#0B6B3A] font-bold">
                            ✓ Details updated and recorded on file!
                          </span>
                        ) : (
                          <span />
                        )}
                        <button
                          type="submit"
                          className="px-6 py-3 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white text-xs font-bold border-none cursor-pointer flex items-center gap-2 transition shadow-md"
                        >
                          <i className="fa-solid fa-floppy-disk text-xs" />
                          <span>Save My Profile Details</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {settingsActiveSubTab === 'security' && (
                  <div className="space-y-6 text-xs">
                    <div>
                      <h3 className="font-['Outfit'] text-[16px] font-bold text-[#10241A] flex items-center gap-2 mb-1">
                        <i className="fa-solid fa-lock text-[#0B6B3A]" />
                        <span>Account Security &amp; Sign-In Password</span>
                      </h3>
                      <p className="text-xs text-[#5A7466] m-0">
                        Manage your patient portal authentication credentials and password security.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF] space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[#5A7466]">Login Identifier:</span>
                        <strong className="text-[#10241A] font-mono">{patient.patient_id}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#5A7466]">Account Verification:</span>
                        <span className="px-2.5 py-0.5 rounded-md font-bold text-[11px] bg-[#E8F5EC] text-[#0B6B3A]">
                          Verified Patient Record (ID + DOB + OTP)
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#EEF2EF]">
                      <ProfilePasswordChangeCard
                        role="patient"
                        userId={patient.patient_id}
                        defaultEmail={patient.email}
                        defaultMobile={patient.contact}
                        title="Update Portal Password"
                        subtitle="Authorize password changes with 2-Factor OTP verification via Email or SMS."
                      />
                    </div>
                  </div>
                )}

                {settingsActiveSubTab === 'appointments' && (
                  <div className="space-y-4 text-xs">
                    <h3 className="font-['Outfit'] text-[16px] font-bold text-[#10241A] flex items-center gap-2">
                      <i className="fa-solid fa-calendar-check text-[#0B6B3A]" />
                      <span>Clinic Visit &amp; Follow-Up Reminders</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-[#10241A] mb-1">Preferred Reminder Channel</label>
                        <select className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A]">
                          <option>SMS Mobile Text &amp; Email (Recommended)</option>
                          <option>SMS Text Message Only</option>
                          <option>Email Notification Only</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-[#10241A] mb-1">Reminder Timing</label>
                        <select className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A]">
                          <option>2 Days and 1 Day Prior to Scheduled Eye Checkup</option>
                          <option>1 Day Prior Only</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {settingsActiveSubTab === 'notifications' && (
                  <div className="space-y-4 text-xs">
                    <h3 className="font-['Outfit'] text-[16px] font-bold text-[#10241A] flex items-center gap-2">
                      <i className="fa-solid fa-bell text-[#0B6B3A]" />
                      <span>Application Status Alerts</span>
                    </h3>
                    <div className="space-y-2.5 max-w-lg">
                      <label className="p-3.5 rounded-xl border border-[#EEF2EF] bg-[#FAFBF8] flex items-center justify-between cursor-pointer">
                        <span>Email alert when my surgery financial subsidy is approved</span>
                        <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#0B6B3A]" />
                      </label>
                      <label className="p-3.5 rounded-xl border border-[#EEF2EF] bg-[#FAFBF8] flex items-center justify-between cursor-pointer">
                        <span>Notice when medical social worker requests additional documents</span>
                        <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#0B6B3A]" />
                      </label>
                    </div>
                  </div>
                )}

                {settingsActiveSubTab === 'privacy' && (
                  <div className="space-y-4 text-xs">
                    <h3 className="font-['Outfit'] text-[16px] font-bold text-[#10241A] flex items-center gap-2">
                      <i className="fa-solid fa-shield-halved text-[#0B6B3A]" />
                      <span>Data Privacy Notice &amp; Patient Consent</span>
                    </h3>
                    <div className="bg-[#FAFBF8] p-4 rounded-xl border border-[#EEF2EF] text-[#5A7466] leading-relaxed">
                      <strong className="text-[#0B6B3A] block mb-1">Under Republic Act No. 10173 (Data Privacy Act of 2012):</strong>
                      Your personal records, medical diagnoses, and uploaded documents are kept strictly confidential and encrypted.
                    </div>
                  </div>
                )}

                {settingsActiveSubTab === 'accessibility' && (
                  <div className="space-y-4 text-xs">
                    <h3 className="font-['Outfit'] text-[16px] font-bold text-[#10241A] flex items-center gap-2">
                      <i className="fa-solid fa-universal-access text-[#0B6B3A]" />
                      <span>Display &amp; Visual Comfort (Low-Vision Reading Aid)</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-[#10241A] mb-1">Font Size</label>
                        <select className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A]">
                          <option>Standard (100%)</option>
                          <option>Comfortable Reading (110%)</option>
                          <option>Large Text (120%)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-[#10241A] mb-1">Visual Theme</label>
                        <select className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A]">
                          <option>Studio Clinical Light (Default)</option>
                          <option>High-Contrast Mode</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {settingsActiveSubTab === 'account' && (
                  <div className="space-y-4 text-xs">
                    <h3 className="font-['Outfit'] text-[16px] font-bold text-[#10241A] flex items-center gap-2">
                      <i className="fa-solid fa-user-xmark text-[#0B6B3A]" />
                      <span>Personal Data Correction &amp; Help Desk</span>
                    </h3>
                    <p className="text-[#5A7466]">
                      If you need to update your master record or request assistance, submit an inquiry from the Applications &amp; Inquiries tab.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal: Patient Request / Edit Clinic Appointment (Mon-Fri, 8:00 AM - 5:00 PM) */}
      {reqApptModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl md:max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-[#D5E2D9] shadow-2xl text-xs font-sans">
            <div className="px-6 py-4 bg-white border-b border-[#EEF2EF] flex items-start justify-between sticky top-0 z-10">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#E8F5EC] text-[#0B6B3A] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  <i className="fa-solid fa-calendar-plus text-[9.5px]" />
                  <span>Clinic Appointment Request &bull; Mon–Fri (8AM–5PM)</span>
                </span>
                <h3 className="font-['Outfit'] text-lg font-bold m-0 text-[#10241A]">
                  {editingApptId ? 'Modify Appointment Request' : 'Request Clinic Appointment'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReqApptModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-transparent hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#10241A] flex items-center justify-center cursor-pointer border-0 shrink-0"
                title="Close"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <form onSubmit={handleSubmitPatientApptRequest} className="p-6 space-y-5">
              <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-[11.5px] leading-relaxed flex items-start gap-2.5">
                <i className="fa-solid fa-circle-info text-[#D97706] mt-0.5 shrink-0" />
                <div>
                  <strong>Approval Notice:</strong> Submitting this form creates a <strong>Pending Request</strong> in the Admin &amp; Nurse Panel. Once approved by the clinic nurse, you will receive an official confirmation via <strong>Email or Text (SMS)</strong>.
                </div>
              </div>

              {/* Manual Reason / Type of Clinic Visit */}
              <div>
                <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1.5">
                  Reason / Type of Clinic Visit <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reqApptForm.appointment_type}
                  onChange={(e) => setReqApptForm({ ...reqApptForm, appointment_type: e.target.value })}
                  placeholder="e.g. Comprehensive Eye Consultation, Cataract Screening, Follow-up Checkup..."
                  className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-xs bg-white text-[#10241A] font-semibold focus:outline-none focus:border-[#0B6B3A]"
                />
              </div>

              {/* Custom Interactive Calendar + Custom Time Slot Picker */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                {/* Custom Mon-Fri Calendar */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-[#10241A] uppercase tracking-wider">
                      Preferred Date (Mon–Fri) <span className="text-red-600">*</span>
                    </label>
                    <span className="text-[11px] font-bold text-[#0B6B3A]">
                      {reqApptForm.appointment_date || 'Select a date'}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-[#D5E2D9] bg-[#FAFBF8]">
                    <div className="flex items-center justify-between mb-3">
                      <button
                        type="button"
                        onClick={() =>
                          setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                        }
                        className="w-7 h-7 rounded-lg border border-[#D5E2D9] bg-white hover:bg-[#E8F5EC] text-[#10241A] flex items-center justify-center cursor-pointer"
                        title="Previous Month"
                      >
                        <i className="fa-solid fa-chevron-left text-[10px]" />
                      </button>
                      <span className="font-['Outfit'] text-xs font-bold text-[#10241A]">
                        {calendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                        }
                        className="w-7 h-7 rounded-lg border border-[#D5E2D9] bg-white hover:bg-[#E8F5EC] text-[#10241A] flex items-center justify-center cursor-pointer"
                        title="Next Month"
                      >
                        <i className="fa-solid fa-chevron-right text-[10px]" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-[#64748B] mb-1.5">
                      <span>Su</span>
                      <span>Mo</span>
                      <span>Tu</span>
                      <span>We</span>
                      <span>Th</span>
                      <span>Fr</span>
                      <span>Sa</span>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const year = calendarMonth.getFullYear();
                        const month = calendarMonth.getMonth();
                        const firstDay = new Date(year, month, 1).getDay();
                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const cells: React.ReactNode[] = [];
                        for (let i = 0; i < firstDay; i++) {
                          cells.push(<div key={`empty-${i}`} className="h-8" />);
                        }
                        for (let day = 1; day <= daysInMonth; day++) {
                          const d = new Date(year, month, day);
                          const dow = d.getDay();
                          const isWeekend = dow === 0 || dow === 6;
                          const isPast = d < today;
                          const disabled = isWeekend || isPast;
                          const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const isSelected = reqApptForm.appointment_date === iso;
                          const isToday = d.getTime() === today.getTime();

                          cells.push(
                            <button
                              key={iso}
                              type="button"
                              disabled={disabled}
                              onClick={() => handleReqDateChange(iso)}
                              className={`h-8 rounded-lg text-[11px] font-bold flex items-center justify-center transition border-0 ${isSelected
                                ? 'bg-[#0B6B3A] text-white shadow-xs cursor-pointer'
                                : disabled
                                  ? 'text-[#94A3B8] opacity-40 cursor-not-allowed bg-transparent'
                                  : isToday
                                    ? 'bg-[#E8F5EC] text-[#0B6B3A] ring-1 ring-[#0B6B3A] cursor-pointer hover:bg-[#0B6B3A] hover:text-white'
                                    : 'bg-white text-[#10241A] hover:bg-[#E8F5EC] hover:text-[#0B6B3A] cursor-pointer'
                                }`}
                            >
                              {day}
                            </button>
                          );
                        }
                        return cells;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Custom Time Slot Picker (8:00 AM - 5:00 PM) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-[#10241A] uppercase tracking-wider">
                      Preferred Time (8AM – 5PM) <span className="text-red-600">*</span>
                    </label>
                    <span className="text-[11px] font-bold text-[#0B6B3A]">
                      {reqApptForm.appointment_time}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 p-3.5 rounded-xl border border-[#D5E2D9] bg-[#FAFBF8]">
                    {[
                      '08:00 AM – 09:00 AM',
                      '09:00 AM – 10:00 AM',
                      '10:00 AM – 11:00 AM',
                      '11:00 AM – 12:00 PM',
                      '01:00 PM – 02:00 PM',
                      '02:00 PM – 03:00 PM',
                      '03:00 PM – 04:00 PM',
                      '04:00 PM – 05:00 PM',
                    ].map((slot) => {
                      const active = reqApptForm.appointment_time === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setReqApptForm({ ...reqApptForm, appointment_time: slot })}
                          className={`w-full px-3 py-2 rounded-lg text-[11.5px] font-bold flex items-center justify-between transition cursor-pointer border ${active
                            ? 'bg-[#0B6B3A] text-white border-[#A7F3D0] shadow-xs'
                            : 'bg-white text-[#10241A] border-[#E2E8F0] hover:border-[#0B6B3A] hover:bg-[#E8F5EC]/50'
                            }`}
                        >
                          <span>
                            <i className={`fa-regular fa-clock mr-2 ${active ? 'text-[#A7F3D0]' : 'text-[#0B6B3A]'}`} />
                            {slot}
                          </span>
                          {active && <i className="fa-solid fa-circle-check text-xs text-[#A7F3D0]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {dateWeekdayError && (
                <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-[11.5px] font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-calendar-xmark shrink-0" />
                  <span>{dateWeekdayError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1.5">
                  Symptoms / Notes for the Clinic Nurse (Optional)
                </label>
                <textarea
                  rows={3}
                  value={reqApptForm.notes}
                  onChange={(e) => setReqApptForm({ ...reqApptForm, notes: e.target.value })}
                  placeholder="e.g. Blurred vision in right eye, requesting morning slot for pre-op checkup..."
                  className="w-full p-3 border border-[#D5E2D9] rounded-xl text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EEF2EF]">
                <button
                  type="button"
                  onClick={() => setReqApptModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#D5E2D9] bg-white text-[#5A7466] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingApptReq || Boolean(dateWeekdayError)}
                  className="px-5 py-2.5 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white font-bold flex items-center gap-2 transition shadow-xs cursor-pointer disabled:opacity-50 border-0"
                >
                  <i className={`fa-solid ${isSubmittingApptReq ? 'fa-spinner fa-spin' : 'fa-paper-plane'} text-xs`} />
                  <span>
                    {isSubmittingApptReq
                      ? 'Submitting & Sending Email...'
                      : editingApptId
                        ? 'Update Request for Nurse Approval'
                        : 'Submit Appointment Request'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
      <SecureContactChangeModal
        isOpen={contactModalType !== null}
        role="patient"
        userId={patient.patient_id}
        contactType={contactModalType || 'email'}
        currentValue={contactModalType === 'mobile' ? profilePhone : profileEmail}
        onClose={() => setContactModalType(null)}
        onVerified={(type, newVal) => {
          if (type === 'email') {
            setProfileEmail(newVal);
            setSettingsEmail(newVal);
            setPatient((prev) => ({ ...prev, email: newVal }));
          } else {
            setProfilePhone(newVal);
            setSettingsPhone(newVal);
            setPatient((prev) => ({ ...prev, contact: newVal }));
          }
        }}
      />

      {/* Patient Inquiry Conversation & Attachments Modal */}
      {activeInquiryModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setActiveInquiryModal(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#D5E2D9] shadow-2xl p-6 text-xs space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#EEF2EF] pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[11px] font-bold text-[#0B6B3A] bg-[#E8F5EC] px-2 py-0.5 rounded">
                    {activeInquiryModal.id}
                  </span>
                  <span className="text-[11px] text-[#64748B]">
                    {activeInquiryModal.created_at
                      ? new Date(activeInquiryModal.created_at).toLocaleString()
                      : activeInquiryModal.date}
                  </span>
                </div>
                <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0">
                  {activeInquiryModal.subject}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveInquiryModal(null)}
                className="text-gray-400 hover:text-gray-700 bg-transparent border-0 cursor-pointer text-base p-1"
                aria-label="Close conversation"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Patient Message */}
            <div className="p-4 rounded-xl bg-[#FAFBF8] border border-[#D5E2D9] space-y-2">
              <div className="flex items-center justify-between text-[11px] text-[#5A7466] font-semibold">
                <span>
                  <i className="fa-solid fa-user mr-1 text-[#0B6B3A]" />
                  Your Message ({patient.name})
                </span>
                <span>
                  {activeInquiryModal.admin_read ? (
                    <span className="text-[#0B6B3A]">
                      <i className="fa-solid fa-check-double mr-1" /> Read by Clinic Admin
                    </span>
                  ) : (
                    <span>Waiting for Admin Review</span>
                  )}
                </span>
              </div>
              <p className="m-0 text-[#10241A] whitespace-pre-wrap leading-relaxed">
                {activeInquiryModal.message}
              </p>

              {/* Submitted Attachments */}
              {Array.isArray(activeInquiryModal.attachments) && activeInquiryModal.attachments.length > 0 && (
                <div className="pt-3 border-t border-[#EEF2EF] space-y-2">
                  <div className="text-[11px] font-bold text-[#10241A]">
                    Submitted Attachments ({activeInquiryModal.attachments.length})
                  </div>
                  <div className="space-y-1.5">
                    {activeInquiryModal.attachments.map((att: any) => (
                      <div
                        key={att.id}
                        className="p-2.5 bg-white border border-[#D5E2D9] rounded-lg flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <i
                            className={`fa-solid ${att.file_type === 'pdf' ? 'fa-file-pdf text-red-600' : 'fa-file-image text-[#0B6B3A]'
                              } text-sm shrink-0`}
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-[#10241A] truncate">{att.original_filename}</div>
                            <div className="text-[10px] text-[#64748B]">
                              {att.content_type} &bull; {att.file_size_display}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handlePatientAttachmentAction(activeInquiryModal.id, att, false)}
                            className="px-2.5 py-1 rounded bg-[#E8F5EC] text-[#0B6B3A] hover:bg-[#D1FAE5] font-semibold border-0 cursor-pointer"
                          >
                            <i className="fa-regular fa-eye mr-1" /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePatientAttachmentAction(activeInquiryModal.id, att, true)}
                            className="px-2.5 py-1 rounded bg-white border border-[#D5E2D9] text-[#334155] hover:bg-slate-50 font-semibold cursor-pointer"
                          >
                            <i className="fa-solid fa-download mr-1" /> Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Admin Replies */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#5A7466]">
                Clinic Administration Replies ({(activeInquiryModal.replies || []).length})
              </div>
              {!activeInquiryModal.replies || activeInquiryModal.replies.length === 0 ? (
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-800 text-center">
                  <i className="fa-regular fa-clock mr-1.5" />
                  Waiting for Response — Our clinic team will reply to your inquiry shortly.
                </div>
              ) : (
                activeInquiryModal.replies.map((rep: any) => (
                  <div key={rep.id} className="p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#064826]">
                      <span>
                        <i className="fa-solid fa-user-shield mr-1.5" />
                        {rep.admin_name || 'OFPHIL Clinic Administration'}
                      </span>
                      <span className="font-normal text-[#0B6B3A]">
                        {rep.created_at ? new Date(rep.created_at).toLocaleString() : ''}
                      </span>
                    </div>
                    <p className="m-0 text-[#10241A] whitespace-pre-wrap leading-relaxed">{rep.message}</p>
                    {Array.isArray(rep.attachments) && rep.attachments.length > 0 && (
                      <div className="pt-2 space-y-1">
                        {rep.attachments.map((att: any) => (
                          <div key={att.id} className="flex items-center justify-between bg-white p-2 rounded border border-[#A7F3D0]">
                            <span className="font-semibold text-[#10241A] truncate">{att.original_filename}</span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => handlePatientAttachmentAction(activeInquiryModal.id, att, false)}
                                className="px-2 py-0.5 rounded bg-[#E8F5EC] text-[#0B6B3A] font-semibold border-0 cursor-pointer"
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePatientAttachmentAction(activeInquiryModal.id, att, true)}
                                className="px-2 py-0.5 rounded border border-[#D5E2D9] bg-white text-[#334155] font-semibold cursor-pointer"
                              >
                                Download
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {inqPreviewAtt && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70"
          onClick={() => {
            URL.revokeObjectURL(inqPreviewAtt.url);
            setInqPreviewAtt(null);
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-[#EEF2EF] flex items-center justify-between">
              <span className="font-bold text-xs text-[#10241A] truncate">{inqPreviewAtt.name}</span>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(inqPreviewAtt.url);
                  setInqPreviewAtt(null);
                }}
                className="text-gray-500 hover:text-gray-800 bg-transparent border-0 cursor-pointer text-sm"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto bg-[#F8FAFC] flex items-center justify-center">
              {inqPreviewAtt.type === 'pdf' ? (
                <iframe src={inqPreviewAtt.url} className="w-full h-[75vh] rounded border border-[#D5E2D9]" title={inqPreviewAtt.name} />
              ) : (
                <img src={inqPreviewAtt.url} alt={inqPreviewAtt.name} className="max-w-full max-h-[75vh] object-contain rounded" />
              )}
            </div>
          </div>
        </div>
      )}
    </PatientAppShell>
  );
}

export default function PatientPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFBF8] p-8 space-y-6 animate-pulse">
          <div className="h-20 rounded-2xl skeleton w-full" />
          <div className="h-64 rounded-2xl skeleton w-full" />
        </div>
      }
    >
      <PatientPortalContent />
    </Suspense>
  );
}
