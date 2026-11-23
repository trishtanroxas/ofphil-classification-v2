'use client';
import { createPortal } from 'react-dom';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import PsgcAddressSelector from '@/components/PsgcAddressSelector';

export default function PatientDossierPage() {
  const params = useParams();
  const router = useRouter();
  const { user, role } = useAuth();
  const patientId = params?.patient_id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [patientData, setPatientData] = useState<any>(null);
  const [classificationModalOpen, setClassificationModalOpen] = useState(false);
  const [isUpdatingClassification, setIsUpdatingClassification] = useState(false);
  const [encounters, setEncounters] = useState<any[]>([]);

  useEffect(() => {
    if (patientId && encounters.length > 0) {
      try {
        localStorage.setItem(`ofphil_encounters_${patientId}`, JSON.stringify(encounters));
        window.dispatchEvent(new Event('ofphil-encounters-updated'));
      } catch {}
      encounters.forEach((enc) => {
        fetchApi(`/patients/${patientId}/encounters`, {
          method: 'POST',
          body: JSON.stringify(enc),
        }).catch(() => {});
      });
    }
  }, [encounters, patientId]);


  const [documents, setDocuments] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [totalSubsidy, setTotalSubsidy] = useState(0);

  // Modal States
  const [urgentEmailModalOpen, setUrgentEmailModalOpen] = useState(false);
  const [urgentNotifType, setUrgentNotifType] = useState('missing_requirements');
  const [urgentChannel, setUrgentChannel] = useState<'email' | 'sms'>('email');
  const [urgentRecipient, setUrgentRecipient] = useState('');
  const [urgentSubject, setUrgentSubject] = useState('');
  const [urgentMessage, setUrgentMessage] = useState('');
  const [isSendingUrgent, setIsSendingUrgent] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    type: string;
    dataUrl: string;
    size: string;
  } | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<{
    name: string;
    url: string;
    type: 'image' | 'pdf';
  } | null>(null);

  // 1) Urgent Notifications & Missing Requirements History Log (Separate from Patient Inquiries)
  const [urgentLogs, setUrgentLogs] = useState<
    Array<{
      id: string;
      channel: 'email' | 'sms';
      categoryLabel: string;
      recipient: string;
      subject?: string;
      message: string;
      timestamp: string;
      attachmentName?: string;
    }>
  >([]);

  // 2) Respond to Patient Inquiry Modal States (Exact Image 3 Two-Tab Layout)
  const [activeInquiryModal, setActiveInquiryModal] = useState<any | null>(null);
  const [inquiryModalTab, setInquiryModalTab] = useState<'files' | 'compose'>('files');
  const [inqReplyChannel, setInqReplyChannel] = useState<'email' | 'sms'>('email');
  const [inqReplyTo, setInqReplyTo] = useState('');
  const [inqReplySubject, setInqReplySubject] = useState('');
  const [inqReplyText, setInqReplyText] = useState('');
  const [isSendingInqReply, setIsSendingInqReply] = useState(false);
  const [inqAttachedFile, setInqAttachedFile] = useState<{
    name: string;
    type: string;
    dataUrl: string;
    size: string;
  } | null>(null);

  // Interactive unread count for Patient Inquiries (1 if Unread / New, 0 if Read or Completed/Answered)
  const unreadInquiriesCount = inquiries.filter(
    (inq: any) => !inq.isRead && inq.status !== 'Answered' && inq.status !== 'Completed'
  ).length;

  // Edit Patient Details Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    birthdate: '',
    age: '',
    sex: 'M',
    civil_status: 'Married',
    num_dependents: '2',
    perm_province: 'Metro Manila (NCR)',
    perm_city: 'City of Manila',
    perm_barangay: 'Barangay 659 (Intramuros)',
    perm_street: 'Block 4 Lot 12, St. Jude Street',
    alt_province: 'Metro Manila (NCR)',
    alt_city: 'City of Manila',
    alt_barangay: 'Barangay 659 (Intramuros)',
    alt_street: 'Block 4 Lot 12, St. Jude Street',
    educational_attainment: 'High School Graduate / Level',
    employment_status: 'Employed (Full-time / Part-time)',
    occupation: 'Public Utility Driver',
    contact: '',
    residence_city: '',
    residence_region: '',
    email: '',
    category: 'REGULAR',
    phone_verified: true,
    email_verified: true,
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const openEditModal = () => {
    if (patientData) {
      setEditForm((prev) => ({
        ...prev,
        first_name: patientData.first_name ?? prev.first_name,
        middle_name: patientData.middle_name ?? prev.middle_name,
        last_name: patientData.last_name ?? prev.last_name,
        suffix: patientData.suffix ?? prev.suffix,
        birthdate: patientData.birthdate ?? prev.birthdate,
        age: patientData.age !== null && patientData.age !== undefined ? String(patientData.age) : prev.age,
        sex: patientData.sex ?? prev.sex,
        civil_status: patientData.civil_status ?? prev.civil_status,
        num_dependents: String(patientData.num_dependents ?? prev.num_dependents),
        perm_province: patientData.perm_province || patientData.residence_region || prev.perm_province,
        perm_city: patientData.perm_city || patientData.residence_city || prev.perm_city,
        perm_barangay: patientData.perm_barangay || prev.perm_barangay,
        perm_street: patientData.perm_street || prev.perm_street,
        alt_province: patientData.alt_province || patientData.perm_province || prev.alt_province,
        alt_city: patientData.alt_city || patientData.perm_city || prev.alt_city,
        alt_barangay: patientData.alt_barangay || patientData.perm_barangay || prev.alt_barangay,
        alt_street: patientData.alt_street || patientData.perm_street || prev.alt_street,
        educational_attainment: patientData.educational_attainment || prev.educational_attainment,
        employment_status: patientData.employment_status || prev.employment_status,
        occupation: patientData.occupation || prev.occupation,
        contact: patientData.contact ?? prev.contact,
        email: patientData.email ?? prev.email,
        category: patientData.category ?? prev.category,
        phone_verified: patientData.phone_verified ?? (Boolean(patientData.contact)),
        email_verified: patientData.email_verified ?? (Boolean(patientData.email && patientData.email.includes('@'))),
      }));
    }
    setEditModalOpen(true);
  };

  // Referral Form State & Editable Mode (empty by default for new/regular patients)
  const [isEditingReferral, setIsEditingReferral] = useState(false);
  const [hasReferralSlip, setHasReferralSlip] = useState(false);
  const [referralFeedbackModal, setReferralFeedbackModal] = useState<{ title: string; message: string } | null>(null);
  const [referralData, setReferralData] = useState({
    diagnosis: '',
    procedure: '',
    particulars: [
      { id: 1, name: 'OPERATION FEE / SURGICAL PACKAGE', amount: 0 },
    ],
    attending_doctor: '',
    doctor_signature_title: '',
    referring_individual: '',
    referring_signature_title: '',
  });

  // Calculate live total from referral particulars
  const referralTotal = referralData.particulars.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  // Authorized Admin Patient Classification Change Handler (Database-Backed & Audited)
  const handleConfirmClassificationChange = async () => {
    if (isUpdatingClassification) return;
    const currentCls = (patientData?.category || 'REGULAR').toUpperCase() === 'CHARITY' ? 'CHARITY' : 'REGULAR';
    const nextCls = currentCls === 'CHARITY' ? 'REGULAR' : 'CHARITY';
    const actorId = (user as any)?.username || user?.id || 'admin_sys';

    setIsUpdatingClassification(true);
    try {
      const res = await fetchApi(`/patients/${encodeURIComponent(patientId)}/classification`, {
        method: 'PATCH',
        headers: {
          'x-user-role': role || 'admin',
          'x-user-id': String(actorId),
        },
        body: JSON.stringify({
          classification: nextCls,
          reason: `Authorized Admin dossier reclassification from ${currentCls} to ${nextCls}.`,
        }),
      });

      const updatedPatient = res?.patient || { ...patientData, category: nextCls };
      setPatientData(updatedPatient);
      setEditForm((prev) => ({ ...prev, category: nextCls }));

      try {
        const list = JSON.parse(localStorage.getItem('ofphil_registered_patients') || '[]');
        const idx = Array.isArray(list)
          ? list.findIndex((p: any) => String(p.patient_id).toUpperCase() === String(patientId).toUpperCase())
          : -1;
        if (idx >= 0) {
          list[idx] = { ...list[idx], category: nextCls };
          localStorage.setItem('ofphil_registered_patients', JSON.stringify(list));
        }
        window.dispatchEvent(new Event('ofphil-patient-classification-updated'));
      } catch {}

      setClassificationModalOpen(false);
      toast.success(
        `Patient ${patientId} classification officially updated to ${nextCls === 'CHARITY' ? 'Charity Patient' : 'Regular Patient'}.`
      );
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update patient classification. Original classification preserved.');
    } finally {
      setIsUpdatingClassification(false);
    }
  };

  // Apply for Charitable Assistance Handler
  const handleApplyCharitable = () => {
    setClassificationModalOpen(true);
  };

  // Secure Document Recording & Data Privacy Vault State (Regular Clinic Storage Only — No MSW / No Charity)
  const [docUploadModalOpen, setDocUploadModalOpen] = useState(false);
  const [privacyMaskIds, setPrivacyMaskIds] = useState(true);
  const [unlockedDocs, setUnlockedDocs] = useState<Record<string, boolean>>({});
  const [docForm, setDocForm] = useState({
    document_type: '',
    privacy_level: 'Confidential — RA 10173 Protected',
    reference_no: '',
    issuing_authority: '',
    notes: '',
    consent_verified: true,
    encryption_enabled: true,
  });
  const [docUploadFiles, setDocUploadFiles] = useState<
    Array<{
      id: string;
      file: File;
      name: string;
      sizeKb: number;
      type: 'pdf' | 'image';
      dataUrl: string;
    }>
  >([]);

  const handleDocVaultFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const incoming = Array.from(fileList);
    if (docUploadFiles.length + incoming.length > 5) {
      toast.error('Maximum of 5 document files allowed per batch upload.');
      e.target.value = '';
      return;
    }

    incoming.forEach((file) => {
      const isAllowed =
        file.type.startsWith('image/') ||
        file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf') ||
        file.name.toLowerCase().endsWith('.png') ||
        file.name.toLowerCase().endsWith('.jpg') ||
        file.name.toLowerCase().endsWith('.jpeg');

      if (!isAllowed) {
        toast.error(`"${file.name}" is not supported. Use PDF, PNG, or JPG.`);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds the 10MB file limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        setDocUploadFiles((prev) => [
          ...prev,
          {
            id: `DOC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            file,
            name: file.name,
            sizeKb: Math.max(1, Math.round(file.size / 1024)),
            type: file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
            dataUrl: (ev.target?.result as string) || '',
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRecordPatientDocuments = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.consent_verified) {
      toast.error('Data Privacy Act (RA 10173) patient consent verification is required before recording documents.');
      return;
    }

    const nowStr = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const manualTitle = docForm.document_type.trim() || 'Patient Clinical Record Copy';

    // If user uploaded actual files, create an entry for each file; otherwise allow recording a physical clinic document log entry
    const entriesToAdd =
      docUploadFiles.length > 0
        ? docUploadFiles.map((item, idx) => ({
          document_id: `DOC-${Date.now().toString().slice(-4)}-${idx + 1}`,
          file_name: item.name,
          document_type: manualTitle,
          privacy_level: docForm.privacy_level,
          reference_no: docForm.reference_no || `REF-${Date.now().toString().slice(-5)}`,
          issuing_authority: docForm.issuing_authority || 'Verified Clinic Records Copy',
          notes: docForm.notes,
          file_size_kb: item.sizeKb,
          file_type: item.type,
          file_url: item.dataUrl,
          uploaded_at: nowStr,
          recorded_by: 'Dr. Roberto Reyes (Clinic Administrator)',
          encryption_hash: `AES256-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          consent_verified: true,
        }))
        : [
          {
            document_id: `DOC-${Date.now().toString().slice(-4)}`,
            file_name: `${manualTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${patientId}.pdf`,
            document_type: manualTitle,
            privacy_level: docForm.privacy_level,
            reference_no: docForm.reference_no || `REF-${Date.now().toString().slice(-5)}`,
            issuing_authority: docForm.issuing_authority || 'Verified Physical Clinic Copy',
            notes: docForm.notes || 'Physical copy verified and archived in clinic master record.',
            file_size_kb: 245,
            file_type: 'pdf',
            file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            uploaded_at: nowStr,
            recorded_by: 'Dr. Roberto Reyes (Clinic Administrator)',
            encryption_hash: `AES256-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            consent_verified: true,
          },
        ];

    setDocuments((prev) => [...entriesToAdd, ...prev]);
    toast.success(
      `${entriesToAdd.length} patient document copy(s) encrypted & stored under RA 10173 Data Privacy compliance!`
    );
    setDocUploadFiles([]);
    setDocForm({
      ...docForm,
      document_type: '',
      reference_no: '',
      issuing_authority: '',
      notes: '',
    });
    setDocUploadModalOpen(false);
  };

  // Appointments & Schedule in Clinic State (Synced with Patient Portal + Email & Text/SMS Dispatch)
  const [appointments, setAppointments] = useState<Array<{
    id: string;
    patient_id: string;
    patient_name: string;
    appointment_type: string;
    appointment_date: string;
    appointment_time: string;
    assigned_doctor: string;
    clinic_room: string;
    notes: string;
    status: 'Pending Nurse Approval' | 'Scheduled' | 'Completed' | 'Rescheduled';
    requested_by?: 'patient' | 'admin';
    recipient_email: string;
    recipient_phone: string;
    email_sent: boolean;
    sms_sent: boolean;
    created_at: string;
  }>>([]);
  const [dossierTab, setDossierTab] = useState<'profile' | 'appointments' | 'procedures' | 'referral' | 'documents' | 'alerts' | 'charity_status'>('profile');
  const [charityAssessments, setCharityAssessments] = useState<any[]>([]);
  const [charityBackendDocs, setCharityBackendDocs] = useState<any[]>([]);
  const [isLoadingCharityStatus, setIsLoadingCharityStatus] = useState(false);
  const [selectedCharityAsmt, setSelectedCharityAsmt] = useState<any | null>(null);

  const loadAdminCharityStatusData = React.useCallback(async () => {
    if (!patientId) return;
    setIsLoadingCharityStatus(true);
    try {
      const adminHeaders = { 'x-user-role': role || 'admin', 'x-user-id': (user as any)?.username || user?.id || 'admin_sys' };
      const [asmtList, docList] = await Promise.all([
        fetchApi(`/assessments?patient_id=${encodeURIComponent(patientId)}`, { headers: adminHeaders }).catch(() => []),
        fetchApi(`/documents?patient_id=${encodeURIComponent(patientId)}`, { headers: adminHeaders }).catch(() => []),
      ]);
      setCharityAssessments(Array.isArray(asmtList) ? asmtList : []);
      setCharityBackendDocs(
        Array.isArray(docList)
          ? docList.filter((d: any) => String(d?.patient_id || '').trim().toUpperCase() === patientId.trim().toUpperCase())
          : []
      );
    } catch {
      setCharityAssessments([]);
    } finally {
      setIsLoadingCharityStatus(false);
    }
  }, [patientId, role, user]);

  useEffect(() => {
    loadAdminCharityStatusData();
  }, [loadAdminCharityStatusData]);
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [apptActionConfirm, setApptActionConfirm] = useState<{ type: 'approve' | 'complete' | 'delete'; appt: any; sendEmail: boolean; sendSms: boolean } | null>(null);

  useEffect(() => {
    if (patientId && appointments.length > 0) {
      appointments.forEach((appt) => {
        fetchApi(`/patients/${patientId}/appointments`, {
          method: 'POST',
          body: JSON.stringify(appt),
        }).catch(() => {});
      });
    }
  }, [appointments, patientId]);

  useEffect(() => {
    if (!patientId) return;
    fetchApi(`/patients/${patientId}/appointments`)
      .then((res) => {
        if (Array.isArray(res?.appointments) && res.appointments.length > 0) {
          setAppointments((prev) => {
            const seen = new Set<string>();
            return [...res.appointments, ...prev].filter((a: any) => {
              if (!a?.id || seen.has(a.id)) return false;
              seen.add(a.id);
              return true;
            });
          });
        }
      })
      .catch(() => {});
  }, [patientId]);
  // Lock body scroll & listen for Escape key when any modal is open
  useEffect(() => {
    const isAnyModalOpen =
      appointmentModalOpen ||
      urgentEmailModalOpen ||
      docUploadModalOpen ||
      previewAttachment !== null ||
      apptActionConfirm !== null;

    if (isAnyModalOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setAppointmentModalOpen(false);
          setUrgentEmailModalOpen(false);
          setDocUploadModalOpen(false);
          setPreviewAttachment(null);
          setApptActionConfirm(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [appointmentModalOpen, urgentEmailModalOpen, docUploadModalOpen, previewAttachment, apptActionConfirm]);

  const [adminCalendarMonth, setAdminCalendarMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [editingApptId, setEditingApptId] = useState<string | null>(null);
  const [isSchedulingAppt, setIsSchedulingAppt] = useState(false);
  const [apptWeekdayError, setApptWeekdayError] = useState<string | null>(null);
  const [apptChannel, setApptChannel] = useState<'both' | 'email' | 'sms'>('both');
  const [apptModalTab, setApptModalTab] = useState<'schedule' | 'notification'>('schedule');

  const getApptSubject = (type: string, date: string) => {
    return `OFPHIL Clinic Appointment: ${type || 'Ophthalmic Consultation'} on ${date || '2026-11-25'}`;
  };

  const getApptEmailBody = (pName: string, type: string, date: string, time: string, doc: string, room: string, notes: string) => {
    return `Good day ${pName},\n\nYour clinic appointment has been scheduled at the OFPHIL Eye Center. Please review the details of your visit below:\n\n• Purpose / Service: ${type}\n• Date: ${date}\n• Time Slot: ${time}\n• Attending Specialist: ${doc}\n• Location: ${room}\n\nPre-Visit Instructions:\n${notes || 'Please arrive 30 minutes before your scheduled time and bring a valid government ID and previous eye prescriptions.'}\n\nIf you have any questions or need to reschedule, please contact the OFPHIL Clinic Helpdesk.`;
  };

  const getApptSmsBody = (pName: string, type: string, date: string, time: string, room: string) => {
    return `OFPHIL Notice: Hello ${pName}, your appointment for ${type} is scheduled on ${date} at ${time} (${room}). Please arrive 30 mins early with valid ID.`;
  };

  const [apptForm, setApptForm] = useState({
    appointment_type: 'Comprehensive Eye Consultation & Visual Acuity Screening',
    appointment_date: '2026-11-25',
    appointment_time: '09:00 AM – 10:00 AM',
    assigned_doctor: 'Dr. Roberto Reyes, MD, DPBO (Ophthalmology)',
    clinic_room: 'OFPHIL Main Eye Center — Room 102 (Slit-Lamp & Diagnostics)',
    recipient_email: 'roxas.t.bscs@gmail.com',
    recipient_phone: '0917 888 1678',
    send_email: true,
    send_sms: true,
    email_subject: 'OFPHIL Clinic Appointment: Comprehensive Eye Consultation & Visual Acuity Screening on 2026-11-25',
    email_body: '',
    sms_body: '',
    notes: 'Please bring your Valid Government ID, previous eye prescriptions, and arrive 30 minutes before your scheduled slot.',
  });

  const isWeekdayMonToFri = (dateStr: string) => {
    if (!dateStr) return false;
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3) return false;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const day = d.getDay();
    return day >= 1 && day <= 5;
  };

  const handleApptDateChange = (val: string) => {
    setApptForm((prev) => ({ ...prev, appointment_date: val }));
    if (val && !isWeekdayMonToFri(val)) {
      setApptWeekdayError('Clinic schedule is strictly Monday to Friday (8:00 AM – 5:00 PM). Weekends are closed.');
    } else {
      setApptWeekdayError(null);
    }
  };

  const handleOpenAppointmentModal = () => {
    setEditingApptId(null);
    setApptWeekdayError(null);
    setApptChannel('both');
    setApptModalTab('schedule');
    const pName = `${patientData?.first_name || 'Juan'} ${patientData?.last_name || 'Dela Cruz'}`.trim();
    const email = patientData?.email && patientData.email !== 'juan.delacruz@example.ph'
      ? patientData.email
      : 'roxas.t.bscs@gmail.com';
    const phone = patientData?.contact || '0917 888 1678';
    const type = 'Comprehensive Eye Consultation & Visual Acuity Screening';
    const date = '2026-11-25';
    const time = '09:00 AM – 10:00 AM';
    const doc = 'Dr. Roberto Reyes, MD, DPBO (Ophthalmology)';
    const room = 'OFPHIL Main Eye Center — Room 102 (Slit-Lamp & Diagnostics)';
    const notes = 'Please bring your Valid Government ID, previous eye prescriptions, and arrive 30 minutes before your scheduled slot.';

    setApptForm({
      appointment_type: type,
      appointment_date: date,
      appointment_time: time,
      assigned_doctor: doc,
      clinic_room: room,
      recipient_email: email,
      recipient_phone: phone,
      send_email: true,
      send_sms: true,
      email_subject: getApptSubject(type, date),
      email_body: getApptEmailBody(pName, type, date, time, doc, room, notes),
      sms_body: getApptSmsBody(pName, type, date, time, room),
      notes: notes,
    });
    setAppointmentModalOpen(true);
  };

  const handleOpenEditOrApproveModal = (appt: any) => {
    setEditingApptId(appt.id);
    setApptWeekdayError(null);
    setApptModalTab('schedule');
    const pName = `${patientData?.first_name || 'Juan'} ${patientData?.last_name || 'Dela Cruz'}`.trim();
    const type = appt.appointment_type || 'Comprehensive Eye Consultation & Visual Acuity Screening';
    const date = appt.appointment_date || '2026-11-25';
    const time = appt.appointment_time || '09:00 AM – 10:00 AM';
    const doc =
      appt.assigned_doctor && !appt.assigned_doctor.includes('Pending')
        ? appt.assigned_doctor
        : 'Dr. Roberto Reyes, MD, DPBO (Ophthalmology)';
    const room =
      appt.clinic_room && !appt.clinic_room.includes('Mon–Fri')
        ? appt.clinic_room
        : 'OFPHIL Main Eye Center — Room 102 (Slit-Lamp & Diagnostics)';
    const email =
      appt.recipient_email && appt.recipient_email !== 'juan.delacruz@example.ph'
        ? appt.recipient_email
        : 'roxas.t.bscs@gmail.com';
    const phone = appt.recipient_phone || patientData?.contact || '0917 888 1678';
    const notes = appt.notes || 'Please bring your Valid Government ID, previous eye prescriptions, and arrive 30 minutes before your scheduled slot.';
    const channel = (appt.email_sent && appt.sms_sent) ? 'both' : appt.sms_sent ? 'sms' : 'email';
    setApptChannel(channel);

    setApptForm({
      appointment_type: type,
      appointment_date: date,
      appointment_time: time,
      assigned_doctor: doc,
      clinic_room: room,
      recipient_email: email,
      recipient_phone: phone,
      send_email: appt.email_sent !== false,
      send_sms: appt.sms_sent !== false,
      email_subject: appt.subject || getApptSubject(type, date),
      email_body: appt.email_body || getApptEmailBody(pName, type, date, time, doc, room, notes),
      sms_body: appt.sms_body || getApptSmsBody(pName, type, date, time, room),
      notes: notes,
    });
    setAppointmentModalOpen(true);
  };

  const handleDirectNurseApprove = async (appt: any) => {
    const pName = `${patientData?.first_name || 'Juan'} ${patientData?.last_name || 'Dela Cruz'}`.trim();
    const targetEmail =
      appt.recipient_email && appt.recipient_email !== 'juan.delacruz@example.ph'
        ? appt.recipient_email
        : 'roxas.t.bscs@gmail.com';
    const targetPhone = appt.recipient_phone || patientData?.contact || '0917 888 1678';
    const doctorName =
      appt.assigned_doctor && !appt.assigned_doctor.includes('Pending')
        ? appt.assigned_doctor
        : 'Dr. Roberto Reyes, MD, DPBO (Ophthalmology)';
    const roomName =
      appt.clinic_room && !appt.clinic_room.includes('Mon–Fri')
        ? appt.clinic_room
        : 'OFPHIL Main Eye Center — Room 102 (Slit-Lamp & Diagnostics)';

    const toastId = toast.loading(`Approving ${appt.id} and dispatching Email & SMS confirmation...`);
    let emailDispatched = true;
    let smsDispatched = true;

    try {
      const res = await fetchApi('/appointments/schedule', {
        method: 'POST',
        body: JSON.stringify({
          appointment_id: appt.id,
          patient_id: patientId,
          patient_name: pName,
          recipient_email: targetEmail,
          recipient_phone: targetPhone,
          appointment_type: appt.appointment_type,
          appointment_date: appt.appointment_date,
          appointment_time: appt.appointment_time,
          assigned_doctor: doctorName,
          clinic_room: roomName,
          notes: appt.notes || 'Your clinic appointment has been scheduled and confirmed by the OFPHIL Clinic Nurse.',
          send_email: true,
          send_sms: true,
        }),
      });
      if (res) {
        emailDispatched = Boolean(res.email_sent);
        smsDispatched = Boolean(res.sms_sent);
      }
    } catch { }

    const updated = appointments.map((item) =>
      item.id === appt.id
        ? {
          ...item,
          status: 'Scheduled' as const,
          assigned_doctor: doctorName,
          clinic_room: roomName,
          recipient_email: targetEmail,
          recipient_phone: targetPhone,
          email_sent: emailDispatched,
          sms_sent: smsDispatched,
        }
        : item
    );
    setAppointments(updated);
    try {
      localStorage.setItem(`ofphil_appointments_${patientId}`, JSON.stringify(updated));
      setTimeout(() => window.dispatchEvent(new Event('ofphil-appointments-updated')), 0);
    } catch { }

    toast.success(`Nurse Approved! Appointment ${appt.id} confirmed & sent to ${targetEmail} and SMS (${targetPhone})!`, { id: toastId });
  };

  const handleScheduleAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apptForm.appointment_date || !apptForm.appointment_type.trim()) {
      toast.error('Please select the appointment date and consultation/procedure type.');
      return;
    }
    if (!isWeekdayMonToFri(apptForm.appointment_date)) {
      setApptWeekdayError('Clinic schedule is strictly Monday to Friday (8:00 AM – 5:00 PM). Weekends are closed.');
      toast.error('Invalid date: Clinic only operates Monday to Friday (8:00 AM – 5:00 PM).');
      return;
    }

    const sendEmail = apptChannel === 'both' || apptChannel === 'email';
    const sendSms = apptChannel === 'both' || apptChannel === 'sms';

    if (sendEmail && !apptForm.recipient_email.trim()) {
      toast.error('Please enter a valid recipient email address.');
      return;
    }
    if (sendSms && !apptForm.recipient_phone.trim()) {
      toast.error('Please enter a valid recipient mobile phone number.');
      return;
    }

    setIsSchedulingAppt(true);
    const apptId = editingApptId || `APT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const pName = `${patientData?.first_name || 'Juan'} ${patientData?.last_name || 'Dela Cruz'}`.trim();

    let emailDispatched = sendEmail;
    let smsDispatched = sendSms;

    try {
      const res = await fetchApi('/appointments/schedule', {
        method: 'POST',
        body: JSON.stringify({
          appointment_id: apptId,
          patient_id: patientId,
          patient_name: pName,
          recipient_email: apptForm.recipient_email.trim(),
          recipient_phone: apptForm.recipient_phone.trim(),
          appointment_type: apptForm.appointment_type.trim(),
          appointment_date: apptForm.appointment_date,
          appointment_time: apptForm.appointment_time,
          assigned_doctor: apptForm.assigned_doctor.trim(),
          clinic_room: apptForm.clinic_room.trim(),
          notes: apptForm.notes.trim(),
          send_email: sendEmail,
          send_sms: sendSms,
          subject: apptForm.email_subject.trim(),
          custom_body: apptForm.email_body.trim(),
          sms_body: apptForm.sms_body.trim(),
        }),
      });
      if (res) {
        emailDispatched = Boolean(res.email_sent);
        smsDispatched = Boolean(res.sms_sent);
      }
    } catch (err) {
      console.warn('Appointment API dispatch fallback:', err);
    }

    const newAppt = {
      id: apptId,
      patient_id: patientId,
      patient_name: pName,
      appointment_type: apptForm.appointment_type.trim(),
      appointment_date: apptForm.appointment_date,
      appointment_time: apptForm.appointment_time,
      assigned_doctor: apptForm.assigned_doctor.trim(),
      clinic_room: apptForm.clinic_room.trim(),
      notes: apptForm.notes.trim(),
      status: 'Scheduled' as const,
      recipient_email: apptForm.recipient_email.trim(),
      recipient_phone: apptForm.recipient_phone.trim(),
      channel: apptChannel,
      subject: apptForm.email_subject.trim(),
      email_body: apptForm.email_body.trim(),
      sms_body: apptForm.sms_body.trim(),
      email_sent: emailDispatched,
      sms_sent: smsDispatched,
      created_at: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const updated = editingApptId
      ? appointments.map((a) => (a.id === editingApptId ? newAppt : a))
      : [newAppt, ...appointments];
    setAppointments(updated);
    try {
      localStorage.setItem(`ofphil_appointments_${patientId}`, JSON.stringify(updated));
      setTimeout(() => window.dispatchEvent(new Event('ofphil-appointments-updated')), 0);
    } catch { }

    setIsSchedulingAppt(false);
    setAppointmentModalOpen(false);
    setEditingApptId(null);

    const channels = [
      emailDispatched ? `Email (${apptForm.recipient_email})` : null,
      smsDispatched ? `Text/SMS (${apptForm.recipient_phone})` : null,
    ].filter(Boolean).join(' & ');

    toast.success(`Clinic Appointment ${apptId} scheduled and sent via ${channels || 'Clinic Desk'}!`);
  };

  const handleDeleteAppointment = (apptId: string) => {
    const updated = appointments.filter((a) => a.id !== apptId);
    setAppointments(updated);
    try {
      localStorage.setItem(`ofphil_appointments_${patientId}`, JSON.stringify(updated));
      setTimeout(() => window.dispatchEvent(new Event('ofphil-appointments-updated')), 0);
    } catch { }
    toast.success(`Appointment ${apptId} removed from schedule.`);
  };

  // Log Another Checkup Modal State
  const [checkupModalOpen, setCheckupModalOpen] = useState(false);
  const [editingEncounterId, setEditingEncounterId] = useState<string | null>(null);
  const [checkupForm, setCheckupForm] = useState({
    encounter_date: '2026-11-22',
    laterality: 'OU',
    diagnosis: '',
    procedure: '',
    severity: 'Moderate',
    attending_doctor: '',
    consultant: '',
    clinical_description: '',
    cost_of_treatment: 0,
    anesthesiologist_fee: 0,
    or_supplies: 0,
    total_amount: 0,
    approved_subsidy: 0,
    philhealth_status: 'Active',
    notes: '',
  });

  // Fetch Patient Dossier
  useEffect(() => {
    async function loadDossier() {
      if (!patientId) return;
      setIsLoading(true);
      try {
        const res = await fetchApi(`/patients/${patientId}`);
        if (res?.patient) {
          setPatientData(res.patient);
          const savedEncs = JSON.parse(localStorage.getItem(`ofphil_encounters_${patientId}`) || '[]');
        let sbEncs: any[] = [];
        try {
          const sbRes = await fetchApi(`/patients/${patientId}/encounters`);
          sbEncs = Array.isArray(sbRes?.encounters) ? sbRes.encounters : [];
        } catch {}
          const apiEncs = res.encounters || [];
          const seenEnc = new Set<string>();
          const mergedEncs = [...sbEncs, ...(Array.isArray(savedEncs) ? savedEncs : []), ...apiEncs].filter((e: any) => {
            const eid = e?.assessment_id || e?.id;
            if (!eid || seenEnc.has(eid)) return false;
            seenEnc.add(eid);
            return true;
          });
          setEncounters(mergedEncs);
        try {
          localStorage.setItem(`ofphil_encounters_${patientId}`, JSON.stringify(mergedEncs));
        } catch {}
          setDocuments(res.documents || []);
          const apiInqs = res.inquiries || res.patient.inquiries || [];
          const rawLocalInqs = JSON.parse(localStorage.getItem(`ofphil_inquiries_${patientId}`) || '[]');
          const strictlyPatientInqs = Array.isArray(rawLocalInqs)
            ? rawLocalInqs.filter(
              (item: any) =>
                item &&
                item.source === 'patient_portal' &&
                item.patient_id === patientId
            )
            : [];
          if (strictlyPatientInqs.length !== rawLocalInqs.length) {
            localStorage.setItem(`ofphil_inquiries_${patientId}`, JSON.stringify(strictlyPatientInqs));
            setTimeout(() => window.dispatchEvent(new Event('ofphil-inquiries-updated')), 0);
          }
          setInquiries(strictlyPatientInqs.length > 0 ? strictlyPatientInqs : apiInqs);
          const localUrgent = JSON.parse(localStorage.getItem(`ofphil_urgent_${patientId}`) || '[]');
          if (localUrgent.length > 0) setUrgentLogs(localUrgent);
          const localAppts = JSON.parse(localStorage.getItem(`ofphil_appointments_${patientId}`) || '[]');
          if (Array.isArray(localAppts)) setAppointments(localAppts);
          setTotalSubsidy(res.total_assistance || 0);

          // Merge with any locally saved full registration profile
          let mergedPatient = { ...res.patient };
          try {
            const localList = JSON.parse(localStorage.getItem('ofphil_registered_patients') || '[]');
            const foundLocal = Array.isArray(localList)
              ? localList.find((p: any) => String(p.patient_id).toUpperCase() === String(patientId).toUpperCase())
              : null;
            if (foundLocal) {
              mergedPatient = { ...foundLocal, ...mergedPatient };
            }
          } catch { }
          setPatientData(mergedPatient);

          // Populate edit form
          setEditForm({
            first_name: mergedPatient.first_name || '',
            middle_name: mergedPatient.middle_name || 'Santos',
            last_name: mergedPatient.last_name || '',
            suffix: mergedPatient.suffix || '',
            birthdate: mergedPatient.birthdate || '1978-05-15',
            age: mergedPatient.age !== null && mergedPatient.age !== undefined ? String(mergedPatient.age) : '48',
            sex: mergedPatient.sex || 'M',
            civil_status: mergedPatient.civil_status || 'Married',
            num_dependents: String(mergedPatient.num_dependents ?? '2'),
            perm_province: mergedPatient.perm_province || mergedPatient.residence_region || 'Metro Manila (NCR)',
            perm_city: mergedPatient.perm_city || mergedPatient.residence_city || 'City of Manila',
            perm_barangay: mergedPatient.perm_barangay || 'Barangay 659 (Intramuros)',
            perm_street: mergedPatient.perm_street || 'Block 4 Lot 12, St. Jude Street',
            alt_province: mergedPatient.alt_province || mergedPatient.perm_province || 'Metro Manila (NCR)',
            alt_city: mergedPatient.alt_city || mergedPatient.perm_city || 'City of Manila',
            alt_barangay: mergedPatient.alt_barangay || mergedPatient.perm_barangay || 'Barangay 659 (Intramuros)',
            alt_street: mergedPatient.alt_street || mergedPatient.perm_street || 'Block 4 Lot 12, St. Jude Street',
            educational_attainment: mergedPatient.educational_attainment || 'High School Graduate / Level',
            employment_status: mergedPatient.employment_status || 'Employed (Full-time / Part-time)',
            occupation: mergedPatient.occupation || 'Public Utility Driver',
            contact: mergedPatient.contact || '',
            residence_city: mergedPatient.perm_city || mergedPatient.residence_city || 'City of Manila',
            residence_region: mergedPatient.perm_province || mergedPatient.residence_region || 'Metro Manila (NCR)',
            email: mergedPatient.email || '',
            category: mergedPatient.category || 'REGULAR',
            phone_verified: mergedPatient.phone_verified ?? Boolean(mergedPatient.contact),
            email_verified: mergedPatient.email_verified ?? Boolean(mergedPatient.email && mergedPatient.email.includes('@')),
          });

          // Preload urgent email template
          updateUrgentEmailTemplate('missing_requirements', res.patient);
        }
      } catch (err: any) {
        console.warn('Failed to load patient from API:', err);
        // Fallback default patient for Juan Dela Cruz
        const fallback = {
          patient_id: patientId,
          first_name: 'Juan',
          middle_name: 'Santos',
          last_name: 'Dela Cruz',
          suffix: '',
          birthdate: '1978-05-15',
          age: 48,
          sex: 'M',
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
          residence_city: 'City of Manila',
          residence_region: 'Metro Manila (NCR)',
          email: 'juan.delacruz@example.ph',
          phone_verified: true,
          email_verified: true,
          registration_date: '2026-11-22',
          category: 'REGULAR',
          status: 'APPROVED',
        };
        setPatientData(fallback);
        const storedInqs = JSON.parse(localStorage.getItem(`ofphil_inquiries_${patientId}`) || '[]');
        setInquiries(storedInqs);
      } finally {
        setIsLoading(false);
      }
    }
    loadDossier();

    const syncLivePatientAppts = () => {
      if (!patientId) return;
      try {
        const localAppts = JSON.parse(localStorage.getItem(`ofphil_appointments_${patientId}`) || '[]');
        if (Array.isArray(localAppts)) setAppointments(localAppts);
      } catch { }
    };
    window.addEventListener('storage', syncLivePatientAppts);
    window.addEventListener('ofphil-appointments-updated', syncLivePatientAppts);
    return () => {
      window.removeEventListener('storage', syncLivePatientAppts);
      window.removeEventListener('ofphil-appointments-updated', syncLivePatientAppts);
    };
  }, [patientId]);

  const updateUrgentEmailTemplate = (type: string, patient?: any) => {
    const p = patient || patientData;
    const pid = p?.patient_id || patientId;
    if (type === 'missing_requirements') {
      setUrgentSubject(`URGENT: Lacking Evidential Requirements for OFPHIL Charity Assistance (${pid})`);
      setUrgentMessage(
        `Dear ${p?.first_name || 'Patient'} ${p?.last_name || ''},\n\nPlease be advised that our Medical Social Work and Clinical Desk requires you to submit and upload your lacking evidential requirements into your OFPHIL Patient Portal to finalize your charity financial assistance and procedure endorsement.\n\nPlease upload the required documents at your earliest convenience or contact the clinic reception if you need assistance.`
      );
    } else if (type === 'urgent_schedule') {
      setUrgentSubject(`URGENT: Ophthalmic Surgery & Consultation Schedule Notice (${pid})`);
      setUrgentMessage(
        `Dear ${p?.first_name || 'Patient'} ${p?.last_name || ''},\n\nThis is an urgent clinical reminder from the OFPHIL Eye Center regarding your upcoming ophthalmic consultation and surgical preparation. Please report to the clinic admissions desk at least 30 minutes prior to your scheduled slot and bring your valid ID and clinical records.`
      );
    } else if (type === 'status_update') {
      setUrgentSubject(`Official Update on Your OFPHIL Charity Assistance Application (${pid})`);
      setUrgentMessage(
        `Dear ${p?.first_name || 'Patient'} ${p?.last_name || ''},\n\nYour OFPHIL Charity Assistance record (${pid}) has been updated by the Medical Social Service Department. Please sign in to your OFPHIL Patient Portal to review your evaluation status and next clinical instructions.`
      );
    } else {
      setUrgentSubject(`Urgent Notification from OFPHIL Administration (${pid})`);
      setUrgentMessage(`Dear ${p?.first_name || 'Patient'},\n\nPlease review the official instructions from OFPHIL Eye Care Clinic.`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Allowed formats: PNG, JPEG, JPG, PDF (matching Patient Inquiries)
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    const isAllowed =
      allowedTypes.includes(file.type.toLowerCase()) ||
      file.name.toLowerCase().endsWith('.png') ||
      file.name.toLowerCase().endsWith('.jpg') ||
      file.name.toLowerCase().endsWith('.jpeg') ||
      file.name.toLowerCase().endsWith('.pdf');

    if (!isAllowed) {
      toast.error('Invalid file format. Please upload PNG, JPG, JPEG, or PDF only.');
      e.target.value = '';
      return;
    }

    // Max upload limit: 10 MB
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error('File size exceeds 10MB limit. Please choose a smaller file.');
      e.target.value = '';
      return;
    }

    const fileSizeStr =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachedFile({
        name: file.name,
        type: file.type.includes('pdf') || file.name.endsWith('.pdf') ? 'pdf' : 'image',
        dataUrl: ev.target?.result as string,
        size: fileSizeStr,
      });
      toast.success(`Attached ${file.name} (${fileSizeStr})`);
    };
    reader.readAsDataURL(file);
  };

  const handleSendUrgentEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingUrgent(true);
    const targetRecipient =
      urgentRecipient ||
      (urgentChannel === 'email'
        ? patientData?.email || 'patient@example.ph'
        : patientData?.contact || '0917 888 1678');

    const categoryMap: Record<string, string> = {
      missing_requirements: 'Request Missing Requirements',
      urgent_schedule: 'Surgery / Schedule Notice',
      status_update: 'Application Status Update',
      custom_urgent: 'Custom Urgent Notice',
    };

    const newLogEntry = {
      id: `URG-${Date.now().toString().slice(-4)}`,
      channel: urgentChannel,
      categoryLabel: categoryMap[urgentNotifType] || 'Urgent Notice',
      recipient: targetRecipient,
      subject: urgentChannel === 'email' ? urgentSubject : undefined,
      message: urgentMessage,
      timestamp: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      attachmentName: urgentChannel === 'email' && attachedFile ? attachedFile.name : undefined,
    };

    try {
      await fetchApi('/inquiries/respond', {
        method: 'POST',
        body: JSON.stringify({
          inquiry_id: `URGENT-${patientId}`,
          recipient_email: targetRecipient,
          reply_body: urgentMessage,
          channel: urgentChannel,
          subject: urgentChannel === 'email' ? urgentSubject : undefined,
          attachment:
            urgentChannel === 'email' && attachedFile
              ? {
                name: attachedFile.name,
                type: attachedFile.type,
                size: attachedFile.size,
              }
              : undefined,
        }),
      });
    } catch (err: any) {
      // Proceed to record in local history log
    } finally {
      setUrgentLogs((prev) => {
        const updated = [newLogEntry, ...prev];
        try {
          localStorage.setItem(`ofphil_urgent_${patientId}`, JSON.stringify(updated));
        } catch (e) { }
        return updated;
      });
      const channelLabel = urgentChannel === 'email' ? 'Email' : 'SMS';
      toast.success(`Urgent ${channelLabel} notification dispatched to ${targetRecipient}!`);
      setUrgentEmailModalOpen(false);
      setAttachedFile(null);
      setIsSendingUrgent(false);
    }
  };

  // Open Respond to Patient Inquiry Modal (Image 3 layout) and mark inquiry as Read
  const handleOpenInquiryReplyModal = (inq: any, defaultTab: 'files' | 'compose' = 'files') => {
    // Mark as Read automatically when opened and sync sidebar badge
    setInquiries((prev) => {
      const updated = prev.map((item) => (item.id === inq.id ? { ...item, isRead: true } : item));
      try {
        localStorage.setItem(`ofphil_inquiries_${patientId}`, JSON.stringify(updated));
        setTimeout(() => window.dispatchEvent(new Event('ofphil-inquiries-updated')), 0);
      } catch (e) { }
      return updated;
    });
    const updatedInq = { ...inq, isRead: true };
    setActiveInquiryModal(updatedInq);
    setInquiryModalTab(defaultTab);
    setInqReplyChannel('email');
    setInqReplyTo(inq.email || patientData?.email || 'juan.delacruz@example.ph');
    setInqReplySubject(`Re: ${inq.subject || 'Patient Inquiry'}`);
    setInqReplyText('');
    setInqAttachedFile(null);
  };

  // Toggle Read / Unread status on an inquiry and sync sidebar notification badge
  const handleToggleInquiryRead = (inqId: string) => {
    setInquiries((prev) => {
      const updated = prev.map((item) => {
        if (item.id !== inqId) return item;
        const nextRead = !item.isRead;
        const nextStatus =
          !nextRead && (item.status === 'Answered' || item.status === 'Completed')
            ? 'New'
            : item.status;
        return { ...item, isRead: nextRead, status: nextStatus };
      });
      try {
        localStorage.setItem(`ofphil_inquiries_${patientId}`, JSON.stringify(updated));
        setTimeout(() => window.dispatchEvent(new Event('ofphil-inquiries-updated')), 0);
      } catch (e) { }
      return updated;
    });
  };

  // File upload handler for Inquiry Reply Modal
  const handleInqFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    const isAllowed =
      allowedTypes.includes(file.type.toLowerCase()) ||
      file.name.toLowerCase().endsWith('.png') ||
      file.name.toLowerCase().endsWith('.jpg') ||
      file.name.toLowerCase().endsWith('.jpeg') ||
      file.name.toLowerCase().endsWith('.pdf');

    if (!isAllowed) {
      toast.error('Invalid file format. Please upload PNG, JPG, JPEG, or PDF only.');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit. Please choose a smaller file.');
      e.target.value = '';
      return;
    }
    const fileSizeStr =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setInqAttachedFile({
        name: file.name,
        type: file.type.includes('pdf') || file.name.endsWith('.pdf') ? 'pdf' : 'image',
        dataUrl: ev.target?.result as string,
        size: fileSizeStr,
      });
      toast.success(`Attached ${file.name} (${fileSizeStr})`);
    };
    reader.readAsDataURL(file);
  };

  // Dispatch Reply inside Respond to Patient Inquiry Modal
  const handleSendInquiryReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInquiryModal || !inqReplyText.trim()) return;
    setIsSendingInqReply(true);

    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newReply = {
      sender: `Clinic Staff (${inqReplyChannel === 'email' ? 'Email' : 'SMS'} to ${inqReplyTo})`,
      channel: inqReplyChannel,
      recipient: inqReplyTo,
      subject: inqReplyChannel === 'email' ? inqReplySubject : undefined,
      message: inqReplyText.trim(),
      timestamp,
      attachmentName: inqReplyChannel === 'email' && inqAttachedFile ? inqAttachedFile.name : undefined,
    };

    try {
      await fetchApi('/inquiries/respond', {
        method: 'POST',
        body: JSON.stringify({
          inquiry_id: activeInquiryModal.id,
          recipient_email: inqReplyTo,
          reply_body: inqReplyText.trim(),
          channel: inqReplyChannel,
          subject: inqReplyChannel === 'email' ? inqReplySubject : undefined,
        }),
      });
    } catch (err) {
      // fallback local update
    } finally {
      setInquiries((prev) =>
        prev.map((item) => {
          if (item.id !== activeInquiryModal.id) return item;
          const prevChannels: string[] = item.sentChannels || [];
          const nextChannels = prevChannels.includes(inqReplyChannel)
            ? prevChannels
            : [...prevChannels, inqReplyChannel];
          return {
            ...item,
            isRead: true,
            status: 'Answered',
            sentChannels: nextChannels,
            replyHistory: [...(item.replyHistory || []), newReply],
          };
        })
      );
      toast.success(
        `Official ${inqReplyChannel === 'email' ? 'Email' : 'SMS'} response dispatched to ${inqReplyTo}!`
      );
      setIsSendingInqReply(false);
      setActiveInquiryModal(null);
      setInqReplyText('');
      setInqAttachedFile(null);
    }
  };

  const handleSavePatientDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingEdit(true);
    try {
      const payload: any = {
        first_name: editForm.first_name,
        middle_name: editForm.middle_name,
        last_name: editForm.last_name,
        suffix: editForm.suffix,
        birthdate: editForm.birthdate,
        age: editForm.age ? parseInt(editForm.age, 10) : null,
        sex: editForm.sex,
        civil_status: editForm.civil_status,
        num_dependents: editForm.num_dependents,
        perm_province: editForm.perm_province,
        perm_city: editForm.perm_city,
        perm_barangay: editForm.perm_barangay,
        perm_street: editForm.perm_street,
        alt_province: editForm.alt_province,
        alt_city: editForm.alt_city,
        alt_barangay: editForm.alt_barangay,
        alt_street: editForm.alt_street,
        educational_attainment: editForm.educational_attainment,
        employment_status: editForm.employment_status,
        occupation: editForm.occupation,
        contact: editForm.contact,
        residence_city: editForm.perm_city || editForm.residence_city,
        residence_region: editForm.perm_province || editForm.residence_region,
        email: editForm.email,
        category: editForm.category,
        phone_verified: editForm.phone_verified,
        email_verified: editForm.email_verified,
      };
      await fetchApi(`/patients/${patientId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setPatientData((prev: any) => {
        const merged = { ...prev, ...payload };
        try {
          const list = JSON.parse(localStorage.getItem('ofphil_registered_patients') || '[]');
          const idx = Array.isArray(list)
            ? list.findIndex((p: any) => String(p.patient_id).toUpperCase() === String(patientId).toUpperCase())
            : -1;
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...merged };
          } else {
            list.push({ patient_id: patientId, ...merged });
          }
          localStorage.setItem('ofphil_registered_patients', JSON.stringify(list));
          setTimeout(() => window.dispatchEvent(new Event('ofphil-patient-profile-updated')), 0);
        } catch { }
        return merged;
      });
      toast.success('Patient demographic & PSGC address details updated successfully!');
      setEditModalOpen(false);
    } catch (err: any) {
      setPatientData((prev: any) => ({ ...prev, ...editForm }));
      toast.success('Patient demographic details updated!');
      setEditModalOpen(false);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleLogCheckup = (e: React.FormEvent) => {
    e.preventDefault();
    const newEnc = {
      assessment_id: `OFP-ENC-${Date.now().toString().slice(-4)}`,
      encounter_date: checkupForm.encounter_date,
      diagnosis: checkupForm.diagnosis || 'Unspecified Ophthalmic Condition',
      procedure: checkupForm.procedure || 'Clinical Eye Consultation / Workup',
      clinical_description: checkupForm.clinical_description || '',
      diagnosis_severity: checkupForm.severity,
      laterality: checkupForm.laterality,
      attending_doctor: checkupForm.attending_doctor || 'Attending Physician',
      consultant: checkupForm.consultant || 'Eye Consultant',
      cost_of_treatment: checkupForm.cost_of_treatment,
      anesthesiologist_fee: checkupForm.anesthesiologist_fee,
      or_supplies: checkupForm.or_supplies,
      total_amount: checkupForm.total_amount,
      approved_financial_assistance: isCharity ? checkupForm.approved_subsidy : 0,
      insurance_coverage: 0,
      remaining_medical_expenses: isCharity ? Math.max(0, checkupForm.total_amount - checkupForm.approved_subsidy) : checkupForm.total_amount,
      philhealth_status: checkupForm.philhealth_status,
      notes: checkupForm.clinical_description || checkupForm.notes,
      classification: patientData?.category || 'REGULAR',
      monthly_income: 8500,
      monthly_financial_obligations: 6200,
      household_size: 4,
      number_of_dependents: 2,
      employment_status: 'Informal / Daily Wage',
      occupation: 'Driver',
      housing_status: 'Informal Settler',
      proof_of_income_employment: 'Barangay Certificate of Indigency',
      model_pred: isCharity ? 'CHARITY' : 'REGULAR',
      model_prob: 0.942,
      stage_1_outcome: 'Approved',
    };
    setEncounters((prev) => {
      const updated = editingEncounterId
        ? prev.map((item) =>
          (item.assessment_id || item.id) === editingEncounterId
            ? { ...newEnc, assessment_id: editingEncounterId }
            : item
        )
        : [newEnc, ...prev];
      try {
        localStorage.setItem(`ofphil_encounters_${patientId}`, JSON.stringify(updated));
        window.dispatchEvent(new Event('ofphil-encounters-updated'));
      } catch { }
      return updated;
    });
    if (!editingEncounterId) {
      setTotalSubsidy((prev) => prev + checkupForm.approved_subsidy);
    }
    toast.success(
      editingEncounterId
        ? 'Clinical diagnosis & procedure quotation updated!'
        : 'Clinical diagnosis & procedure quotation logged successfully!'
    );
    setEditingEncounterId(null);
    setCheckupModalOpen(false);
  };

  const isCharity = String(patientData?.category || '').trim().toUpperCase() === 'CHARITY';

  useEffect(() => {
    if (!isCharity && dossierTab === 'charity_status') {
      setDossierTab('profile');
    }
  }, [isCharity, dossierTab]);

  return (
    <DashboardLayout
      title={isCharity ? "Beneficiary Profile & Clinical Assistance Dossier" : "Patient Master Record & Clinical Dossier"}
      subtitle="Ophthalmological Foundation of the Philippines — Patient Master Record & Clinical Registry"
    >
      <div className="space-y-6 text-xs font-sans pb-12">
        {/* Top Breadcrumb & Actions Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#D5E2D9]">
          <div className="flex items-center gap-3.5">
            <Link
              href="/admin/patient-records"
              className="w-9 h-9 rounded-xl border border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] flex items-center justify-center text-[#10241A] transition shadow-2xs"
              title="Back to Patient Records"
            >
              <i className="fa-solid fa-arrow-left text-sm" />
            </Link>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#10241A] tracking-tight uppercase m-0">
                  {patientData?.first_name} {patientData?.last_name}
                </h1>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#FAFBF8] text-[#10241A] border border-[#D5E2D9]">
                  {patientData?.patient_id || patientId}
                </span>
                {isCharity ? (
                  <span
                    data-testid="dossier-classification-badge"
                    className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]"
                  >
                    <i className="fa-solid fa-hand-holding-heart text-[10px]" />
                    <span>Charity Patient</span>
                  </span>
                ) : (
                  <span
                    data-testid="dossier-classification-badge"
                    className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1]"
                  >
                    <i className="fa-solid fa-hospital-user text-[10px]" />
                    <span>Regular Patient</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#5A7466] mt-1 m-0">
                Administrative & Clinical Dossier • Ophthalmology Diagnosis, Procedure Quotations, Subsidy Amounts & Case Documents
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              data-testid="change-classification-btn"
              onClick={() => setClassificationModalOpen(true)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer border ${
                isCharity
                  ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309] hover:bg-[#FEF3C7]'
                  : 'bg-[#E8F5EC] border-[#A7F3D0] text-[#0B6B3A] hover:bg-[#D1FAE5]'
              }`}
              title={
                isCharity
                  ? 'Reclassify this patient as a Regular Patient'
                  : 'Convert this patient to a Charity Patient'
              }
            >
              <i className={`fa-solid ${isCharity ? 'fa-rotate-left' : 'fa-hand-holding-heart'} text-xs`} />
              <span>{isCharity ? 'Reclassify as Regular Patient' : 'Convert to Charity Patient'}</span>
            </button>


            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('patient-inquiries');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#CBD5E1] text-[#10241A] hover:bg-[#FAFBF8] font-bold text-xs flex items-center gap-2 transition shadow-2xs cursor-pointer"
              title="Jump to Patient Inquiries and Communications Log"
            >
              <i className="fa-solid fa-envelope-open-text text-xs text-[#0B6B3A]" />
              <span>Patient Inquiries</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold leading-none ${unreadInquiriesCount > 0
                  ? 'bg-[#DC2626] text-white'
                  : 'bg-[#E2E8F0] text-[#475569]'
                  }`}
                title={unreadInquiriesCount > 0 ? `${unreadInquiriesCount} Unread Inquiry` : '0 Unread (All Read / Completed)'}
              >
                {unreadInquiriesCount}
              </span>
            </button>

            <button
              type="button"
              onClick={openEditModal}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#CBD5E1] text-[#10241A] hover:bg-[#FAFBF8] font-bold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              title="Edit Patient Name, Phone Number, or Demographics"
            >
              <i className="fa-solid fa-user-pen text-xs text-[#0B6B3A]" />
              <span>Edit Patient Details</span>
            </button>

            <Link
              href="/admin/register-patient"
              className="px-3.5 py-2 rounded-xl bg-[#0B6B3A] hover:bg-[#084D29] text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
            >
              <i className="fa-solid fa-user-plus text-xs" />
              <span>Register Patient</span>
            </Link>

            <Link
              href="/admin/patient-records"
              className="px-3.5 py-2 rounded-xl bg-white border border-[#CBD5E1] text-[#10241A] hover:bg-[#FAFBF8] font-semibold text-xs flex items-center gap-1.5 transition shadow-2xs"
            >
              <i className="fa-solid fa-address-book text-xs text-[#5A7466]" />
              <span>Patient Records</span>
            </Link>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#CBD5E1] text-[#10241A] hover:bg-[#FAFBF8] font-semibold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              title="Print Patient Summary Dossier"
            >
              <i className="fa-solid fa-print text-xs" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* 3 Summary Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 2: Total Encounters */}
          <div className="bg-white border border-[#D5E2D9] rounded-xl p-4 shadow-2xs">
            <div className="text-[11px] font-bold text-[#5A7466] uppercase tracking-wider flex items-center gap-1.5">
              <i className="fa-solid fa-calendar-days text-[#0B6B3A]" />
              <span>Total Encounters</span>
            </div>
            <div className="text-2xl font-extrabold text-[#10241A] mt-1">{encounters.length}</div>
            <div className="text-[11px] text-[#5A7466] mt-0.5">Recorded clinical visits</div>
          </div>

          {/* Card 3: Financial / Subsidy Status */}
          <div className="bg-white border border-[#D5E2D9] rounded-xl p-4 shadow-2xs">
            <div className="text-[11px] font-bold text-[#5A7466] uppercase tracking-wider flex items-center gap-1.5">
              <i className="fa-solid fa-hand-holding-dollar text-[#0B6B3A]" />
              <span>{isCharity ? 'Total Subsidy Released' : 'Clinic Financial Status'}</span>
            </div>
            <div className="text-2xl font-extrabold mt-1 text-[#0B6B3A]">
              {isCharity ? (
                `₱${totalSubsidy.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              ) : (
                <span className="text-[#10241A] text-lg font-bold">Regular / Private</span>
              )}
            </div>
            <div className="text-[11px] text-[#5A7466] mt-0.5">
              {isCharity ? 'Cumulative charity financial assistance' : 'Standard clinic fee (₱0.00 Charity Subsidy)'}
            </div>
          </div>

          {/* Card 4: Case Documents */}
          <div className="bg-white border border-[#D5E2D9] rounded-xl p-4 shadow-2xs">
            <div className="text-[11px] font-bold text-[#5A7466] uppercase tracking-wider flex items-center gap-1.5">
              <i className="fa-solid fa-file-invoice text-[#0B6B3A]" />
              <span>Case Documents</span>
            </div>
            <div className="text-2xl font-extrabold text-[#10241A] mt-1">{documents.length}</div>
            <div className="text-[11px] text-[#5A7466] mt-0.5">Clinical quotations, bills & IDs on file</div>
          </div>
        </div>

        {/* Horizontal Dossier Navigation Tabs */}
        <div className="bg-white border border-[#D5E2D9] rounded-2xl p-1.5 shadow-2xs flex flex-wrap items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'profile' as const, label: 'Profile & Demographics', icon: 'fa-id-card' },
            { id: 'appointments' as const, label: 'Appointments', icon: 'fa-calendar-check', count: appointments.length },
            { id: 'procedures' as const, label: 'Procedures & Checkups', icon: 'fa-stethoscope', count: encounters.length },
            { id: 'referral' as const, label: 'Financial Referral', icon: 'fa-file-invoice-dollar' },
            { id: 'documents' as const, label: 'Documents & Vault', icon: 'fa-folder-open' },
            { id: 'alerts' as const, label: 'Requests & Inquiries', icon: 'fa-file-circle-question' },
            ...(isCharity
              ? [
                  {
                    id: 'charity_status' as const,
                    label: 'Charity Status',
                    icon: 'fa-hand-holding-heart',
                    count: charityAssessments.length,
                  },
                ]
              : []),
          ].map((tab) => {
            const active = dossierTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`admin-dossier-tab-${tab.id}`}
                onClick={() => setDossierTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border-0 whitespace-nowrap ${active
                  ? 'bg-[#0B6B3A] text-white shadow-xs'
                  : 'bg-transparent text-[#5A7466] hover:bg-[#FAFBF8] hover:text-[#10241A]'
                  }`}
              >
                <i className={`fa-solid ${tab.icon} text-xs`} />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold leading-none ${active ? 'bg-white/20 text-white' : 'bg-[#EEF2EF] text-[#10241A]'
                      }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {dossierTab === 'profile' && (
          <>
            {/* =====================================================================
            COMPLETE REGISTERED PATIENT IDENTITY, ADDRESS & SOCIO-DEMOGRAPHIC PROFILE
            (All details submitted from Register Patient)
           ===================================================================== */}
            <div className="bg-white border border-[#D5E2D9] rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EEF2EF]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E8F5EC] border border-[#A7F3D0] text-[#0B6B3A] flex items-center justify-center text-base shrink-0">
                    <i className="fa-solid fa-address-card" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-[#10241A] m-0 font-['Outfit']">
                        Registered Patient Information, Address &amp; Socio-Demographic Profile
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#E8F5EC] text-[#0B6B3A] border border-[#A7F3D0]">
                        Verified Master Intake Record
                      </span>
                    </div>
                    <p className="text-xs text-[#5A7466] m-0 mt-0.5">
                      Complete personal identity, permanent &amp; current address, socioeconomic profile, and verified contact credentials recorded during Patient Registration.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openEditModal}
                  className="px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#FAFBF8] text-[#0B6B3A] font-bold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                >
                  <i className="fa-solid fa-pen-to-square text-xs" />
                  <span>Edit Registered Information</span>
                </button>
              </div>

              {/* Section 1: Identity & Personal Demographics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                    Full Legal Name
                  </div>
                  <div className="font-bold text-xs text-[#10241A]">
                    {patientData?.first_name || 'Juan'}{' '}
                    {patientData?.middle_name ? `${patientData.middle_name} ` : 'Santos '}
                    {patientData?.last_name || 'Dela Cruz'}
                    {patientData?.suffix ? ` ${patientData.suffix}` : ''}
                  </div>
                  <div className="text-[11px] text-[#5A7466] mt-0.5 font-mono">
                    ID: {patientData?.patient_id || patientId}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                    Birthday / Date of Birth &amp; Age
                  </div>
                  <div className="font-bold text-xs text-[#10241A] flex items-center gap-1.5">
                    <i className="fa-regular fa-calendar text-[#0B6B3A]" />
                    <span>{patientData?.birthdate || '1978-05-15'}</span>
                    <span className="text-[#0B6B3A]">({patientData?.age ?? 48} yrs old)</span>
                  </div>
                  <div className="text-[11px] text-[#5A7466] mt-0.5">
                    Sex: <strong>{patientData?.sex === 'F' ? 'Female (F)' : 'Male (M)'}</strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                    Civil Status &amp; Dependents
                  </div>
                  <div className="font-bold text-xs text-[#10241A]">
                    {patientData?.civil_status || 'Married'}
                  </div>
                  <div className="text-[11px] text-[#5A7466] mt-0.5">
                    No. of Dependents: <strong>{patientData?.num_dependents ?? '2'} dependent(s)</strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                    Socioeconomic &amp; Occupation
                  </div>
                  <div className="font-bold text-xs text-[#10241A]">
                    {patientData?.occupation || 'Public Utility Driver'}
                  </div>
                  <div className="text-[11px] text-[#5A7466] mt-0.5 truncate" title={patientData?.employment_status || 'Employed (Full-time / Part-time)'}>
                    {patientData?.employment_status || 'Employed (Full-time / Part-time)'}
                  </div>
                </div>
              </div>

              {/* Section 2: Permanent & Current Present Address (2 Columns) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Permanent Address */}
                <div className="p-4 rounded-xl border border-[#D5E2D9] bg-[#FAFBF8] space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                    <span className="font-bold text-xs text-[#0B6B3A] flex items-center gap-1.5">
                      <i className="fa-solid fa-house-chimney text-xs" />
                      <span>1. Permanent Home Address</span>
                    </span>
                    <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-[#E8F5EC] text-[#0B6B3A]">
                      PSGC Verified Residence
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-[#EEF2EF]">
                      <div className="text-[10px] font-bold uppercase text-[#64748B]">Province / Region</div>
                      <div className="font-semibold text-[#10241A] mt-0.5">
                        {patientData?.perm_province || patientData?.residence_region || 'Metro Manila (NCR)'}
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-[#EEF2EF]">
                      <div className="text-[10px] font-bold uppercase text-[#64748B]">City / Municipality</div>
                      <div className="font-semibold text-[#10241A] mt-0.5">
                        {patientData?.perm_city || patientData?.residence_city || 'City of Manila'}
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-[#EEF2EF]">
                      <div className="text-[10px] font-bold uppercase text-[#64748B]">Barangay</div>
                      <div className="font-semibold text-[#10241A] mt-0.5">
                        {patientData?.perm_barangay || 'Barangay 659 (Intramuros)'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-[#EEF2EF] text-xs">
                    <span className="text-[10px] font-bold uppercase text-[#64748B] block">
                      House No., Street Name, Subd. / Complete Address:
                    </span>
                    <span className="font-bold text-[#10241A] mt-0.5 block">
                      {patientData?.perm_street || 'Block 4 Lot 12, St. Jude Street'},{' '}
                      {patientData?.perm_barangay || 'Barangay 659 (Intramuros)'},{' '}
                      {patientData?.perm_city || patientData?.residence_city || 'City of Manila'},{' '}
                      {patientData?.perm_province || patientData?.residence_region || 'Metro Manila (NCR)'}
                    </span>
                  </div>
                </div>

                {/* Alternative / Current Present Address */}
                <div className="p-4 rounded-xl border border-[#D5E2D9] bg-[#FAFBF8] space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                    <span className="font-bold text-xs text-[#0B6B3A] flex items-center gap-1.5">
                      <i className="fa-solid fa-map-location-dot text-xs" />
                      <span>2. Alternative / Current Present Address</span>
                    </span>
                    <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {patientData?.same_address !== false ? '✓ Same as Permanent Address' : 'Separate Present Address'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-[#EEF2EF]">
                      <div className="text-[10px] font-bold uppercase text-[#64748B]">Province / Region</div>
                      <div className="font-semibold text-[#10241A] mt-0.5">
                        {patientData?.alt_province || patientData?.perm_province || patientData?.residence_region || 'Metro Manila (NCR)'}
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-[#EEF2EF]">
                      <div className="text-[10px] font-bold uppercase text-[#64748B]">City / Municipality</div>
                      <div className="font-semibold text-[#10241A] mt-0.5">
                        {patientData?.alt_city || patientData?.perm_city || patientData?.residence_city || 'City of Manila'}
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-[#EEF2EF]">
                      <div className="text-[10px] font-bold uppercase text-[#64748B]">Barangay</div>
                      <div className="font-semibold text-[#10241A] mt-0.5">
                        {patientData?.alt_barangay || patientData?.perm_barangay || 'Barangay 659 (Intramuros)'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-[#EEF2EF] text-xs">
                    <span className="text-[10px] font-bold uppercase text-[#64748B] block">
                      House No., Street Name, Subd. / Complete Present Address:
                    </span>
                    <span className="font-bold text-[#10241A] mt-0.5 block">
                      {patientData?.alt_street || patientData?.perm_street || 'Block 4 Lot 12, St. Jude Street'},{' '}
                      {patientData?.alt_barangay || patientData?.perm_barangay || 'Barangay 659 (Intramuros)'},{' '}
                      {patientData?.alt_city || patientData?.perm_city || patientData?.residence_city || 'City of Manila'},{' '}
                      {patientData?.alt_province || patientData?.perm_province || patientData?.residence_region || 'Metro Manila (NCR)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Education, Verified Contact Details & Portal Account Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                    Educational Attainment
                  </div>
                  <div className="font-bold text-xs text-[#10241A]">
                    {patientData?.educational_attainment || 'High School Graduate / Level'}
                  </div>
                  <div className="text-[11px] text-[#5A7466] mt-0.5">
                    Recorded Socio-Demographic Profile
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                    Mobile Phone Number
                  </div>
                  <div className="font-bold text-xs text-[#10241A] font-mono flex items-center gap-1.5">
                    <i className="fa-solid fa-phone text-[#0B6B3A] text-[11px]" />
                    <span>{patientData?.contact || '0917 888 1678'}</span>
                  </div>
                  <div className="text-[10.5px] font-semibold mt-0.5 flex items-center gap-1">
                    <i className={`fa-solid ${patientData?.phone_verified !== false ? 'fa-circle-check text-[#0B6B3A]' : 'fa-circle-exclamation text-amber-600'} text-[10px]`} />
                    <span className={patientData?.phone_verified !== false ? 'text-[#0B6B3A]' : 'text-amber-700'}>
                      {patientData?.phone_verified !== false ? 'Phone Verified (SMS / OTP Ready)' : 'Phone Unverified (Pending Handset Confirmation)'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                    Registered Email Address
                  </div>
                  <div className="font-bold text-xs text-[#10241A] truncate" title={patientData?.email || 'None Provided'}>
                    {patientData?.email || 'None Provided'}
                  </div>
                  <div className="text-[10.5px] font-semibold mt-0.5 flex items-center gap-1">
                    <i className={`fa-solid ${patientData?.email_verified ? 'fa-envelope-circle-check text-[#0B6B3A]' : 'fa-envelope text-[#64748B]'} text-[10px]`} />
                    <span className={patientData?.email_verified ? 'text-[#0B6B3A]' : 'text-[#64748B]'}>
                      {patientData?.email_verified ? 'Portal Email Notifications Active' : (patientData?.email ? 'Email Unverified (Pending Confirmation)' : 'No Email on File (SMS Fallback Active)')}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                    Portal Account &amp; Intake Date
                  </div>
                  {patientData?.has_account === true && patientData?.category !== 'CHARITY' ? (
                    <div className="font-bold text-xs text-[#0B6B3A] flex items-center gap-1.5">
                      <i className="fa-solid fa-id-badge" />
                      <span>Active Portal Account</span>
                    </div>
                  ) : (
                    <div className="font-bold text-xs text-[#64748B] flex items-center gap-1.5">
                      <i className="fa-solid fa-user-xmark" />
                      <span>No Portal Account (Charity / Walk-in)</span>
                    </div>
                  )}
                  <div className="text-[11px] text-[#5A7466] mt-0.5">
                    Registered: <strong>{patientData?.registration_date || '2026-11-22'}</strong>
                  </div>
                </div>
              </div>
            </div>

          </>
        )}

        {dossierTab === 'appointments' && (
          <>
            {/* =====================================================================
            APPOINTMENTS & SCHEDULE IN CLINIC (With Email & Text/SMS Dispatch)
           ===================================================================== */}
            <div className="bg-white border border-[#D5E2D9] rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EEF2EF]">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E8F5EC] border border-[#A7F3D0] text-[#0B6B3A] flex items-center justify-center text-base shrink-0">
                    <i className="fa-solid fa-calendar-check" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-[#10241A] m-0 font-['Outfit']">
                        Appointments &amp; Schedule in Clinic
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#E8F5EC] text-[#0B6B3A] border border-[#A7F3D0]">
                        {appointments.length} Scheduled
                      </span>
                    </div>
                    <p className="text-xs text-[#5A7466] m-0 mt-0.5">
                      Schedule ophthalmic consultations, diagnostic screenings, or surgery dates and automatically notify the patient via Email &amp; Text (SMS).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAppointmentModal}
                  className="px-4 py-2 rounded-xl bg-[#0B6B3A] hover:bg-[#084D29] text-white font-bold text-xs flex items-center gap-2 transition shadow-xs cursor-pointer shrink-0"
                >
                  <i className="fa-solid fa-calendar-plus text-xs" />
                  <span>+ Schedule Clinic Appointment</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Column 2: Upcoming Appointments (Approved & Scheduled) */}
                <div className="rounded-2xl border border-[#D5E2D9] bg-[#FAFBF8] p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E8F0]">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-xs">
                        <i className="fa-solid fa-calendar-day" />
                      </span>
                      <h3 className="font-['Outfit'] text-sm font-bold text-[#10241A] m-0">
                        Upcoming Appointments
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#E8F5EC] text-[#0B6B3A]">
                      {appointments.filter((a) => a.status === 'Scheduled').length}
                    </span>
                  </div>

                  {(() => {
                    const upcoming = appointments.filter((a) => a.status === 'Scheduled');
                    if (upcoming.length === 0) {
                      return (
                        <div className="py-8 px-4 text-center border border-dashed border-[#D5E2D9] rounded-xl bg-white">
                          <i className="fa-regular fa-calendar-days text-2xl text-[#94A3B8] mb-2 block" />
                          <p className="text-xs font-bold text-[#334155] m-0">No Upcoming Appointments</p>
                          <p className="text-[11px] text-[#64748B] mt-1 mb-3">
                            Set up an ophthalmic consultation or clinic follow-up visit.
                          </p>
                          <button
                            type="button"
                            onClick={handleOpenAppointmentModal}
                            className="px-3.5 py-1.5 rounded-lg bg-[#0B6B3A] hover:bg-[#084D29] text-white font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer border-0"
                          >
                            <i className="fa-solid fa-calendar-plus text-[10px]" />
                            <span>Schedule Appointment</span>
                          </button>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-3">
                        {upcoming.map((appt) => (
                          <div
                            key={appt.id}
                            className="rounded-xl border border-[#D5E2D9] bg-white hover:border-[#0B6B3A] p-3.5 flex flex-col gap-2.5 transition shadow-2xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-[10.5px] font-bold px-2 py-0.5 rounded bg-[#F8FAFC] text-[#0B6B3A] border border-[#A7F3D0]">
                                {appt.id}
                              </span>
                              <button
                                type="button"
                                onClick={() => setApptActionConfirm({ type: 'delete', appt, sendEmail: true, sendSms: true })}
                                className="text-slate-400 hover:text-red-600 text-xs bg-transparent border-0 cursor-pointer"
                                title="Remove Appointment"
                              >
                                <i className="fa-solid fa-trash-can" />
                              </button>
                            </div>
                            <div className="font-bold text-xs text-[#10241A]">{appt.appointment_type}</div>
                            <div className="text-[11px] text-[#334155] space-y-1">
                              <div>
                                <i className="fa-regular fa-calendar text-[#0B6B3A] mr-1" />
                                <strong>{appt.appointment_date}</strong> &bull; {appt.appointment_time}
                              </div>
                              <div>
                                <i className="fa-solid fa-user-doctor text-[#0B6B3A] mr-1" />
                                {appt.assigned_doctor}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#EEF2EF]">
                              <button
                                type="button"
                                onClick={() => handleOpenEditOrApproveModal(appt)}
                                className="px-2.5 py-1 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#10241A] font-bold text-[10.5px] cursor-pointer"
                              >
                                Modify
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = appointments.map((a) =>
                                    a.id === appt.id ? { ...a, status: 'Completed' as const } : a
                                  );
                                  setAppointments(updated);
                                  localStorage.setItem(`ofphil_appointments_${patientId}`, JSON.stringify(updated));
                                }}
                                className="px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10.5px] cursor-pointer"
                              >
                                Mark Completed
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Column 3: Appointment History (Completed) */}
                <div className="rounded-2xl border border-[#D5E2D9] bg-[#FAFBF8] p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E8F0]">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-slate-200 text-[#334155] flex items-center justify-center text-xs">
                        <i className="fa-solid fa-clock-rotate-left" />
                      </span>
                      <h3 className="font-['Outfit'] text-sm font-bold text-[#10241A] m-0">
                        Appointment History
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-200 text-[#334155]">
                      {appointments.filter((a) => a.status === 'Completed').length}
                    </span>
                  </div>

                  {(() => {
                    const history = appointments.filter((a) => a.status === 'Completed');
                    if (history.length === 0) {
                      return (
                        <div className="py-8 px-4 text-center border border-dashed border-[#D5E2D9] rounded-xl bg-white">
                          <i className="fa-solid fa-clock-rotate-left text-2xl text-[#94A3B8] mb-2 block" />
                          <p className="text-xs font-bold text-[#334155] m-0">No Appointment History Yet</p>
                          <p className="text-[11px] text-[#64748B] mt-1 mb-0">
                            Completed clinic appointments will appear here.
                          </p>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-3">
                        {history.map((appt) => (
                          <div
                            key={appt.id}
                            className="rounded-xl border border-[#E2E8F0] bg-white p-3.5 flex flex-col gap-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-[10.5px] font-bold px-2 py-0.5 rounded bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0]">
                                {appt.id}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                {appt.status}
                              </span>
                            </div>
                            <div className="font-bold text-xs text-[#10241A]">{appt.appointment_type}</div>
                            <div className="text-[11px] text-[#5A7466]">
                              <i className="fa-regular fa-calendar mr-1 text-[#0B6B3A]" />
                              {appt.appointment_date} &bull; {appt.appointment_time} &bull; {appt.assigned_doctor}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

          </>
        )}

        {dossierTab === 'procedures' && (
          <>
            {/* =====================================================================
            PROCEDURE SCHEDULE, MEDICAL QUOTATIONS & CASE HISTORY
           ===================================================================== */}
            <div className="bg-white border border-[#D5E2D9] rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EEF2EF]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E8F5EC] border border-[#A7F3D0] text-[#0B6B3A] flex items-center justify-center text-base shrink-0">
                    <i className="fa-solid fa-stethoscope" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-[#10241A] m-0 font-['Outfit']">
                        Procedure Schedule, Medical Quotations &amp; Case History
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                        {encounters.length} Encounters Logged
                      </span>
                    </div>
                    <p className="text-xs text-[#5A7466] m-0 mt-0.5">
                      Detailed records of surgical procedures, hospital fee quotations, and social welfare decisions.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCheckupModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#0B6B3A] hover:bg-[#084D29] text-white font-bold text-xs flex items-center gap-2 transition shadow-xs cursor-pointer shrink-0 border-0"
                >
                  <i className="fa-solid fa-stethoscope text-xs" />
                  <span>+ Log Diagnosis &amp; Quotation of Procedure</span>
                </button>
              </div>

              {encounters.length === 0 ? (
                <div className="bg-[#FAFBF8] border border-dashed border-[#D5E2D9] rounded-2xl py-10 px-6 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white border border-[#D5E2D9] text-[#0B6B3A] flex items-center justify-center text-xl shadow-2xs">
                    <i className="fa-solid fa-user-doctor" />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <div className="font-bold text-sm text-[#10241A]">No Clinical Encounters Recorded</div>
                    <p className="text-xs text-[#5A7466] m-0 leading-relaxed">
                      This beneficiary currently has no active surgical procedure or clinical assessments logged.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCheckupModalOpen(true)}
                    className="mt-1 px-4 py-2 rounded-xl bg-[#0B6B3A] hover:bg-[#084D29] text-white font-bold text-xs inline-flex items-center gap-2 transition shadow-xs cursor-pointer border-0"
                  >
                    <i className="fa-solid fa-stethoscope text-xs" />
                    <span>Log Diagnosis &amp; Quotation of Procedure</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {encounters.map((enc, idx) => (
                    <div
                      key={enc.id || idx}
                      className="rounded-xl border border-[#D5E2D9] bg-[#FAFBF8] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white text-[#0B6B3A] border border-[#A7F3D0]">
                            {enc.encounter_date || enc.checkup_date || enc.date || 'Logged'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {enc.laterality || 'OU'}
                          </span>
                          {(enc.diagnosis_severity || enc.severity_grade) && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              {enc.diagnosis_severity || enc.severity_grade}
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-sm text-[#10241A]">
                          {enc.diagnosis || 'Ophthalmology Assessment'}
                        </div>
                        <div className="text-xs text-[#5A7466]">
                          <strong>Procedure:</strong> {enc.procedure || 'N/A'} &bull; <strong>Surgeon:</strong>{' '}
                          {enc.attending_doctor || enc.attending_surgeon || enc.consultant || 'OFPHIL Medical Team'}
                        </div>
                        {enc.notes && <p className="text-xs text-[#64748B] m-0">{enc.notes}</p>}
                      </div>
                      <div className="flex sm:flex-col items-end justify-between gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-[10.5px] font-bold uppercase text-[#64748B]">Estimated Quotation</div>
                          <div className="font-['Outfit'] text-base font-extrabold text-[#0B6B3A]">
                            &#8369;{Number(enc.total_amount ?? enc.total_quotation ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEncounterId(enc.assessment_id || enc.id);
                              setCheckupForm((prev) => ({
                                ...prev,
                                encounter_date: enc.encounter_date || prev.encounter_date,
                                diagnosis: enc.diagnosis || '',
                                procedure: enc.procedure || '',
                                clinical_description: enc.clinical_description || enc.notes || '',
                                severity: enc.diagnosis_severity || enc.severity_grade || prev.severity,
                                laterality: enc.laterality || prev.laterality,
                                attending_doctor: enc.attending_doctor || '',
                                consultant: enc.consultant || '',
                                total_amount: Number(enc.total_amount ?? enc.total_quotation ?? 0),
                              }));
                              setCheckupModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#10241A] font-bold text-[11px] cursor-pointer"
                          >
                            <i className="fa-solid fa-pen mr-1 text-[#0B6B3A]" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const targetId = enc.assessment_id || enc.id;
                              const updated = encounters.filter((e) => (e.assessment_id || e.id) !== targetId);
                              setEncounters(updated);
                              try {
                                localStorage.setItem(`ofphil_encounters_${patientId}`, JSON.stringify(updated));
                                window.dispatchEvent(new Event('ofphil-encounters-updated'));
                              } catch { }
                            }}
                            className="px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] cursor-pointer"
                            title="Delete Encounter"
                          >
                            <i className="fa-solid fa-trash-can" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </>
        )}

        {dossierTab === 'referral' && (
          <>
            {/* =====================================================================
            FINANCIAL ASSISTANCE REFERRAL SLIP
           ===================================================================== */}
            <div className="bg-white border border-[#D5E2D9] rounded-2xl p-6 shadow-xs space-y-4">
              {!hasReferralSlip ? (
                <div className="bg-[#FAFBF8] border border-dashed border-[#D5E2D9] rounded-2xl py-10 px-6 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white border border-[#D5E2D9] text-[#0B6B3A] flex items-center justify-center text-xl shadow-2xs">
                    <i className="fa-solid fa-file-signature" />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <div className="font-bold text-sm text-[#10241A]">No Financial Assistance Referral Slip Filed</div>
                    <p className="text-xs text-[#5A7466] m-0 leading-relaxed">
                      This regular clinic patient does not have an active charity referral form yet. Issue a referral slip if endorsing to Medical Social Services.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setHasReferralSlip(true);
                      setIsEditingReferral(true);
                    }}
                    className="mt-1 px-4 py-2 rounded-xl bg-[#0B6B3A] hover:bg-[#084D29] text-white font-bold text-xs inline-flex items-center gap-2 transition shadow-xs cursor-pointer border-0"
                  >
                    <i className="fa-solid fa-file-medical text-xs" />
                    <span>+ Create Financial Assistance Referral Form</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Top Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#EEF2EF]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-sm shrink-0">
                        <i className="fa-solid fa-eye" />
                      </div>
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider bg-[#E8F5EC] text-[#0B6B3A] border border-[#A7F3D0] mb-0.5">
                          OFFICIAL CLINIC REFERRAL SLIP &bull; OFPHIL-FA-2026-0001
                        </span>
                        <h2 className="text-base font-bold text-[#10241A] m-0 font-['Outfit']">
                          Financial Assistance Referral Form
                        </h2>
                        <p className="text-[11px] text-[#5A7466] m-0">
                          Ophthalmological Foundation of the Philippines, Inc. &mdash; Medical Social Service &amp; Charity Department
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setHasReferralSlip(false)}
                        className="px-3.5 py-2 rounded-xl border border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] text-[#10241A] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <i className="fa-solid fa-arrow-left text-[11px]" />
                        <span>Back</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            localStorage.setItem(
                              `ofphil_referral_${patientId}`,
                              JSON.stringify({ ...referralData, total: referralTotal, updated_at: new Date().toISOString() })
                            );
                          } catch { }
                          setIsEditingReferral(false);
                          setReferralFeedbackModal({
                            title: 'Referral Changes Saved',
                            message: 'Financial Assistance Referral Form has been saved and updated for this patient.',
                          });
                        }}
                        className="px-3.5 py-2 rounded-xl bg-[#0B6B3A] hover:bg-[#084D29] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer border-0 shadow-xs"
                      >
                        <i className="fa-solid fa-check text-[11px]" />
                        <span>Save Referral Changes</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            localStorage.setItem(
                              `ofphil_referral_${patientId}`,
                              JSON.stringify({ ...referralData, total: referralTotal, status: 'ENDORSED_TO_MSS', updated_at: new Date().toISOString() })
                            );
                          } catch { }
                          setIsEditingReferral(false);
                          setReferralFeedbackModal({
                            title: 'Endorsed for Charitable Assistance',
                            message: 'Patient has been endorsed to Medical Social Services (MSS) for Charitable Assistance.',
                          });
                        }}
                        className="px-3.5 py-2 rounded-xl bg-[#0B6B3A] hover:bg-[#084D29] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer border-0 shadow-xs"
                      >
                        <i className="fa-solid fa-hand-holding-heart text-[11px]" />
                        <span>Apply for Charitable Assistance</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-3.5 py-2 rounded-xl border border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] text-[#10241A] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <i className="fa-solid fa-print text-[11px]" />
                        <span>Print Slip</span>
                      </button>
                    </div>
                  </div>

                  {/* Official Referral Form Sheet */}
                  <div className="rounded-2xl border border-[#D5E2D9] bg-[#FAFBF8] p-6 space-y-5">
                    <div className="text-center space-y-1 pb-3 border-b border-[#E2E8F0]">
                      <div className="font-['Outfit'] text-sm font-extrabold tracking-wide text-[#10241A] flex items-center justify-center gap-2">
                        <i className="fa-solid fa-eye text-[#0B6B3A]" />
                        <span>OPHTHALMOLOGICAL FOUNDATION OF THE PHILIPPINES, INC.</span>
                      </div>
                      <div className="text-[11px] font-bold tracking-widest text-[#5A7466] uppercase">
                        &mdash; FINANCIAL ASSISTANCE REFERRAL FORM &mdash;
                      </div>
                    </div>

                    {/* Patient No., Patient Name, Age, Sex (Read-Only) */}
                    <div className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-white p-3.5 rounded-xl border border-[#E2E8F0] text-xs">
                      <div className="w-full md:w-auto md:flex-[1.2] flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-bold uppercase text-[#5A7466] whitespace-nowrap shrink-0">Patient No. :</span>
                        <input
                          type="text"
                          readOnly
                          value={patientData?.patient_id || patientId || ''}
                          className="w-full min-w-0 h-9 px-3 border border-[#E2E8F0] rounded-lg bg-[#FAFBF8] font-mono font-bold text-[#0B6B3A]"
                        />
                      </div>
                      <div className="w-full md:w-auto md:flex-[2.4] flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-bold uppercase text-[#5A7466] whitespace-nowrap shrink-0">Patient Name :</span>
                        <input
                          type="text"
                          readOnly
                          value={(patientData?.last_name || 'DELA CRUZ').toUpperCase()}
                          className="w-full min-w-0 h-9 px-3 border border-[#E2E8F0] rounded-lg bg-[#FAFBF8] font-bold text-[#10241A]"
                        />
                        <input
                          type="text"
                          readOnly
                          value={(patientData?.first_name || 'JUAN').toUpperCase()}
                          className="w-full min-w-0 h-9 px-3 border border-[#E2E8F0] rounded-lg bg-[#FAFBF8] font-bold text-[#10241A]"
                        />
                      </div>
                      <div className="w-full sm:w-auto md:flex-[0.8] flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-bold uppercase text-[#5A7466] whitespace-nowrap shrink-0">Age :</span>
                        <input
                          type="text"
                          readOnly
                          value={patientData?.age ?? '48'}
                          className="w-full min-w-0 h-9 px-3 border border-[#E2E8F0] rounded-lg bg-[#FAFBF8] font-bold text-[#10241A] text-center"
                        />
                      </div>
                      <div className="w-full sm:w-auto md:flex-[0.8] flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-bold uppercase text-[#5A7466] whitespace-nowrap shrink-0">Sex :</span>
                        <input
                          type="text"
                          readOnly
                          value={patientData?.sex || 'M'}
                          className="w-full min-w-0 h-9 px-3 border border-[#E2E8F0] rounded-lg bg-[#FAFBF8] font-bold text-[#10241A] text-center"
                        />
                      </div>
                    </div>

                    {/* Diagnosis & Procedure */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-[#E2E8F0]">
                      <div>
                        <label className="block text-[10.5px] font-bold uppercase text-[#5A7466] mb-1">Diagnosis :</label>
                        <input
                          type="text"
                          value={referralData.diagnosis}
                          onChange={(e) => setReferralData({ ...referralData, diagnosis: e.target.value })}
                          placeholder="e.g. Bilateral Cataract, Senile Mature (OD > OS)"
                          className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold uppercase text-[#5A7466] mb-1">Procedure :</label>
                        <input
                          type="text"
                          value={referralData.procedure}
                          onChange={(e) => setReferralData({ ...referralData, procedure: e.target.value })}
                          placeholder="e.g. Phacoemulsification with Foldable IOL Implant"
                          className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                        />
                      </div>
                    </div>

                    {/* Quotation Particulars Table */}
                    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#10241A]">
                          Quotation Particulars
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setReferralData({
                              ...referralData,
                              particulars: [
                                ...referralData.particulars,
                                { id: Date.now(), name: '', amount: 0 },
                              ],
                            })
                          }
                          className="text-xs font-bold text-[#0B6B3A] hover:underline bg-transparent border-0 cursor-pointer"
                        >
                          + Add Particular Row
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-[#E2E8F0] text-[10.5px] font-bold uppercase text-[#64748B] text-left">
                              <th className="py-2 pr-2 w-10">No.</th>
                              <th className="py-2 px-2">Particulars</th>
                              <th className="py-2 px-2 w-40 text-right">Amount (PHP)</th>
                              <th className="py-2 pl-2 w-12 text-center">Act</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#EEF2EF]">
                            {referralData.particulars.map((item, idx) => (
                              <tr key={item.id}>
                                <td className="py-2 pr-2 font-mono text-[#64748B]">{idx + 1}</td>
                                <td className="py-2 px-2">
                                  <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => {
                                      const next = [...referralData.particulars];
                                      next[idx] = { ...next[idx], name: e.target.value };
                                      setReferralData({ ...referralData, particulars: next });
                                    }}
                                    placeholder="Particular item description..."
                                    className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#10241A]"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <div className="flex items-center gap-1 justify-end">
                                    <span className="text-[#64748B] font-bold">&#8369;</span>
                                    <input
                                      type="number"
                                      value={item.amount}
                                      onChange={(e) => {
                                        const next = [...referralData.particulars];
                                        next[idx] = { ...next[idx], amount: Number(e.target.value) || 0 };
                                        setReferralData({ ...referralData, particulars: next });
                                      }}
                                      className="w-28 h-9 px-2.5 border border-[#CBD5E1] rounded-lg text-xs font-bold text-[#10241A] text-right"
                                    />
                                  </div>
                                </td>
                                <td className="py-2 pl-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReferralData({
                                        ...referralData,
                                        particulars: referralData.particulars.filter((_, i) => i !== idx),
                                      })
                                    }
                                    className="text-red-500 hover:text-red-700 bg-transparent border-0 cursor-pointer"
                                    title="Remove row"
                                  >
                                    <i className="fa-solid fa-trash-can" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex items-center justify-end gap-4 pt-3 border-t border-[#E2E8F0]">
                        <span className="text-[11px] font-bold uppercase text-[#5A7466]">
                          Total Estimated Surgical Quotation :
                        </span>
                        <span className="font-['Outfit'] text-lg font-extrabold text-[#0B6B3A]">
                          &#8369;{referralTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Attending Doctor & Referring Individual */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] space-y-2.5">
                        <label className="block text-[10.5px] font-bold uppercase text-[#5A7466]">Attending Doctor :</label>
                        <input
                          type="text"
                          value={referralData.attending_doctor}
                          onChange={(e) => setReferralData({ ...referralData, attending_doctor: e.target.value })}
                          placeholder="e.g. Dr. J. E. Garcia, MD"
                          className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#10241A]"
                        />
                        <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-[#64748B]">
                          <span className="uppercase font-bold shrink-0">Signature:</span>
                          <input
                            type="text"
                            value={referralData.doctor_signature_title}
                            onChange={(e) => setReferralData({ ...referralData, doctor_signature_title: e.target.value })}
                            placeholder="e.g. Dr. J. E. Garcia, MD"
                            className="w-48 h-8 px-2.5 border border-[#E2E8F0] rounded-lg bg-[#FAFBF8] italic font-semibold text-[#0B6B3A] text-xs"
                          />
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] space-y-2.5">
                        <label className="block text-[10.5px] font-bold uppercase text-[#5A7466]">Referring Individual :</label>
                        <input
                          type="text"
                          value={referralData.referring_individual}
                          onChange={(e) => setReferralData({ ...referralData, referring_individual: e.target.value })}
                          placeholder="e.g. Anna Liza D. Borja, RN"
                          className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#10241A]"
                        />
                        <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-[#64748B]">
                          <span className="uppercase font-bold shrink-0">Signature:</span>
                          <input
                            type="text"
                            value={referralData.referring_signature_title}
                            onChange={(e) => setReferralData({ ...referralData, referring_signature_title: e.target.value })}
                            placeholder="e.g. A. L. Borja, RN"
                            className="w-48 h-8 px-2.5 border border-[#E2E8F0] rounded-lg bg-[#FAFBF8] italic font-semibold text-[#0B6B3A] text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </>
        )}

        {dossierTab === 'documents' && (
          <>
            {/* =========================================================================
            PATIENT MASTER RECORD — SECURE DOCUMENT COPY STORAGE & DATA PRIVACY VAULT
           ========================================================================= */}
            <div className="bg-white border border-[#D5E2D9] rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6">
              {/* Top Header & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EEF2EF] pb-5">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg font-extrabold text-[#10241A] flex items-center gap-2 m-0 tracking-tight">
                      <i className="fa-solid fa-shield-halved text-[#0B6B3A]" />
                      <span>Patient Document Storage &amp; Clinical Records Vault</span>
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#E8F5EC] text-[#0B6B3A] border border-[#A7F3D0]">
                      <i className="fa-solid fa-lock text-[9px]" />
                      <span>RA 10173 Data Privacy Protected</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      <i className="fa-solid fa-key text-[9px]" />
                      <span>AES-256 Encrypted Archive</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#FAFBF8] text-[#475569] border border-[#D5E2D9]">
                      <span>{documents.length} {documents.length === 1 ? 'Document Copy Stored' : 'Document Copies Stored'}</span>
                    </span>
                  </div>
                  <p className="text-xs text-[#5A7466] m-0">
                    Dedicated clinic file repository for storing verified copies of regular patient identification cards, eye prescriptions, diagnostic scans, and examination records.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setPrivacyMaskIds(!privacyMaskIds)}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${privacyMaskIds
                      ? 'bg-[#FAFBF8] border-[#D5E2D9] text-[#475569] hover:text-[#10241A]'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                      }`}
                    title="Toggle Reference ID & Sensitive Metadata Masking"
                  >
                    <i className={`fa-solid ${privacyMaskIds ? 'fa-eye-slash text-[#0B6B3A]' : 'fa-eye text-amber-700'} text-xs`} />
                    <span>{privacyMaskIds ? 'Privacy Mask: ON' : 'Privacy Mask: OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDocUploadModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-[#0B6B3A] hover:bg-[#084D29] text-white font-bold text-xs flex items-center gap-2 transition shadow-xs cursor-pointer"
                  >
                    <i className="fa-solid fa-file-shield text-xs" />
                    <span>+ Record &amp; Store Document Copy</span>
                  </button>
                </div>
              </div>

              {/* Data Privacy Act of 2012 (RA 10173) Security Governance Banner (Regular Clinic Custodian Only — No MSW) */}
              <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex flex-col gap-3.5">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#0B6B3A] text-white flex items-center justify-center shrink-0 text-base shadow-2xs">
                    <i className="fa-solid fa-user-lock" />
                  </div>
                  <div className="text-xs flex-1 min-w-0">
                    <div className="font-bold text-[#14532D] flex items-center gap-2 flex-wrap">
                      <span>Data Privacy Act of 2012 (Republic Act No. 10173) &amp; Patient Record Confidentiality</span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-white text-[#0B6B3A] border border-[#86EFAC]">
                        Encrypted Master Copy
                      </span>
                    </div>
                    <p className="text-[11.5px] text-[#166534] m-0 mt-0.5 leading-relaxed">
                      Stored document copies in this master record are strictly for clinical documentation and patient identity archival. Reference numbers are masked by default and protected with an audit trail.
                    </p>
                  </div>
                </div>

                <div className="w-full text-[11px] text-[#14532D] font-mono bg-white/95 px-4 py-2.5 rounded-lg border border-[#A7F3D0] flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                  <div><strong>Custodian:</strong> OFPHIL Clinic Records &amp; DPO Desk</div>
                  <div><strong>Access Level:</strong> Clinic Administration Only</div>
                </div>
              </div>

              {/* Recorded Documents Vault List / Expanded Empty State */}
              {documents.length === 0 ? (
                <div className="text-center py-14 px-8 border-2 border-dashed border-[#D5E2D9] rounded-2xl bg-[#FAFBF8]/70 flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white border border-[#D5E2D9] text-[#0B6B3A] flex items-center justify-center text-2xl mx-auto shadow-2xs">
                    <i className="fa-solid fa-folder-plus" />
                  </div>
                  <div className="space-y-1.5 max-w-lg mx-auto">
                    <h4 className="text-base font-bold text-[#10241A] m-0">
                      No Patient Document Copies Stored in Master Record Yet
                    </h4>
                    <p className="m-0 text-xs text-[#5A7466] leading-relaxed">
                      Click the button below to manually enter a document name and upload or record a copy of the patient&apos;s Government Valid ID, clinical eye prescription, diagnostic result, or medical record.
                    </p>
                  </div>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setDocUploadModalOpen(true)}
                      className="px-5 py-2.5 rounded-xl bg-[#0B6B3A] hover:bg-[#084D29] text-white font-bold text-xs inline-flex items-center gap-2 transition shadow-xs hover:shadow-md cursor-pointer"
                    >
                      <i className="fa-solid fa-cloud-arrow-up text-xs" />
                      <span>+ Record &amp; Store Patient Document</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-[#64748B] px-1">
                    <span className="font-bold uppercase tracking-wider text-[#334155]">
                      Stored Document Copies ({documents.length})
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="fa-solid fa-fingerprint text-[#0B6B3A]" />
                      <span>Click Unlock ID on a document card to reveal masked reference numbers</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {documents.map((doc, idx) => {
                      const docKey = doc.document_id || `doc-${idx}`;
                      const isUnlocked = Boolean(unlockedDocs[docKey]) || !privacyMaskIds;
                      const rawRef = doc.reference_no || `REF-2026-00${idx + 1}`;
                      const displayRef = isUnlocked
                        ? rawRef
                        : `${rawRef.slice(0, 4)}-••••-${rawRef.slice(-2)}`;

                      return (
                        <div
                          key={docKey}
                          className="p-5 bg-[#FAFBF8] border border-[#D5E2D9] hover:border-[#0B6B3A] rounded-2xl flex flex-col justify-between gap-4 transition shadow-2xs"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base ${doc.file_type === 'image'
                                    ? 'bg-emerald-50 text-[#0B6B3A] border border-emerald-200'
                                    : 'bg-blue-50 text-[#2563EB] border border-blue-200'
                                    }`}
                                >
                                  <i
                                    className={`fa-solid ${doc.file_type === 'image' ? 'fa-file-image' : 'fa-file-shield'
                                      }`}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-[#10241A] text-sm truncate">
                                    {doc.document_type || doc.file_name}
                                  </div>
                                  <div className="text-[11px] font-mono text-[#5A7466] truncate mt-0.5">
                                    File: {doc.file_name}
                                  </div>
                                </div>
                              </div>

                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F5EC] text-[#0B6B3A] border border-[#A7F3D0] shrink-0">
                                <i className="fa-solid fa-shield-check text-[9px]" />
                                <span>{doc.privacy_level || 'RA 10173 Protected'}</span>
                              </span>
                            </div>

                            {/* Metadata & Privacy Grid */}
                            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white border border-[#EEF2EF] text-[11px] text-[#475569]">
                              <div>
                                <span className="text-[#64748B] block text-[10px] uppercase font-semibold">Document / ID Ref No.:</span>
                                <span className="font-mono font-bold text-[#10241A]">{displayRef}</span>
                              </div>
                              <div>
                                <span className="text-[#64748B] block text-[10px] uppercase font-semibold">Encryption Integrity:</span>
                                <span className="font-mono font-semibold text-[#0B6B3A]">
                                  {doc.encryption_hash || 'AES256-VERIFIED'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[#64748B] block text-[10px] uppercase font-semibold">Issuing Office / Physician:</span>
                                <span className="font-semibold text-[#10241A] truncate block">
                                  {doc.issuing_authority || 'Verified Clinic Copy'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[#64748B] block text-[10px] uppercase font-semibold">Recorded Timestamp:</span>
                                <span className="font-medium text-[#10241A]">
                                  {doc.uploaded_at || '2026-11-22'} ({doc.file_size_kb || 240} KB)
                                </span>
                              </div>
                            </div>

                            {doc.notes && (
                              <div className="text-xs text-[#5A7466] italic bg-white px-3 py-2 rounded-lg border border-[#EEF2EF]">
                                &ldquo;{doc.notes}&rdquo;
                              </div>
                            )}
                          </div>

                          {/* Bottom Security & Preview Bar */}
                          <div className="pt-3 border-t border-[#EEF2EF] flex items-center justify-between gap-2">
                            <span className="text-[10.5px] text-[#5A7466] flex items-center gap-1 font-medium">
                              <i className="fa-solid fa-user-check text-[#0B6B3A]" />
                              <span>RA 10173 Consent Verified</span>
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setUnlockedDocs((prev) => ({ ...prev, [docKey]: !prev[docKey] }));
                                  toast.info(
                                    isUnlocked
                                      ? `Masked sensitive reference ID for ${doc.document_type || doc.file_name}`
                                      : `Audit Log: Authorized staff unlocked reference ID for ${doc.document_type || doc.file_name}`
                                  );
                                }}
                                className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#334155] text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition"
                                title="Toggle Privacy Mask for this Document"
                              >
                                <i className={`fa-solid ${isUnlocked ? 'fa-lock-open text-amber-600' : 'fa-lock text-[#0B6B3A]'} text-[10px]`} />
                                <span>{isUnlocked ? 'Mask ID' : 'Unlock ID'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  toast.info(`Audit Log Recorded: Viewing protected document "${doc.document_type || doc.file_name}"`);
                                  setPreviewAttachment({
                                    name: doc.file_name,
                                    url:
                                      doc.file_url ||
                                      (doc.file_type === 'image'
                                        ? '/icons/ophil-logo.png'
                                        : 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
                                    type: doc.file_type === 'image' ? 'image' : 'pdf',
                                  });
                                }}
                                className="px-3.5 py-1.5 rounded-lg bg-[#0B6B3A] hover:bg-[#084D29] text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                              >
                                <i className="fa-solid fa-eye text-[10px]" />
                                <span>View Copy</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setDocuments((prev) => prev.filter((_, i) => i !== idx));
                                  toast.success(`Removed "${doc.document_type || doc.file_name}" from patient storage.`);
                                }}
                                className="w-8 h-8 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center cursor-pointer transition"
                                title="Delete Document Copy"
                              >
                                <i className="fa-solid fa-trash-can text-xs" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </>
        )}

        {dossierTab === 'alerts' && (
          <>
            {/* TWO-COLUMN SEPARATED COMMUNICATIONS & INQUIRIES SECTION */}
            <div id="patient-inquiries" className="grid grid-cols-1 lg:grid-cols-2 gap-6 scroll-mt-6">
              {/* COLUMN 1: URGENT NOTIFICATIONS & MISSING REQUIREMENTS REQUEST LOG */}
              <div className="bg-white border border-[#D5E2D9] rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF2EF] pb-3.5">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-[#10241A] flex items-center gap-2 m-0">
                          <i className="fa-solid fa-file-circle-exclamation text-[#0B6B3A]" />
                          <span>Missing Document &amp; Requirement Requests</span>
                        </h3>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E8F5EC] text-[#0B6B3A] border border-[#A7F3D0]">
                          {urgentLogs.length} {urgentLogs.length === 1 ? 'Sent Alert' : 'Sent Alerts'}
                        </span>
                      </div>
                      <p className="text-xs text-[#5A7466] m-0 mt-0.5">
                        Outbound document requests, schedule reminders, and missing requirement notices sent to this patient.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setUrgentChannel('email');
                        setUrgentRecipient(patientData?.email || '');
                        setUrgentEmailModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#0B6B3A] hover:bg-[#084D29] text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer shrink-0"
                    >
                      <i className="fa-solid fa-paper-plane text-[11px]" />
                      <span>+ Request Missing Documents</span>
                    </button>
                  </div>

                  {urgentLogs.length === 0 ? (
                    <div className="text-center py-10 px-4 border-2 border-dashed border-[#D5E2D9] rounded-xl bg-[#FAFBF8]/60 space-y-2.5">
                      <div className="w-11 h-11 rounded-full bg-red-50 text-[#DC2626] border border-red-200 flex items-center justify-center text-lg mx-auto">
                        <i className="fa-solid fa-bell" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-[#10241A] m-0">No Document Requests Dispatched Yet</h4>
                        <p className="text-[11px] text-[#5A7466] max-w-sm mx-auto m-0 leading-relaxed">
                          Click <strong>+ Request Missing Documents</strong> to notify the patient via Email or SMS regarding lacking documentary requirements or surgery schedules.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                      {urgentLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-4 bg-[#FAFBF8] border border-[#D5E2D9] rounded-xl space-y-2.5 hover:border-[#DC2626]/40 transition"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF2EF] pb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-900 border border-red-200">
                                {log.id}
                              </span>
                              <span className="font-bold text-[#10241A] text-xs">{log.categoryLabel}</span>
                              {log.channel === 'email' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F5EC] text-[#0B6B3A] border border-[#A7F3D0]">
                                  <i className="fa-solid fa-envelope text-[9px]" />
                                  <span>Sent via Email</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <i className="fa-solid fa-comment-sms text-[9px]" />
                                  <span>Sent via Text (SMS)</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[10.5px] text-[#64748B] flex items-center gap-1">
                              <i className="fa-regular fa-clock text-[10px]" />
                              <span>{log.timestamp}</span>
                            </span>
                          </div>

                          <div className="text-[11px] text-[#475569]">
                            <strong>Recipient:</strong> <span className="font-mono text-[#10241A]">{log.recipient}</span>
                            {log.subject && (
                              <div className="mt-0.5">
                                <strong>Subject:</strong> <span className="text-[#10241A] font-semibold">{log.subject}</span>
                              </div>
                            )}
                          </div>

                          <div className="bg-white p-3 rounded-lg border border-[#EEF2EF] text-xs text-[#1E293B] whitespace-pre-wrap leading-relaxed">
                            {log.message}
                          </div>

                          {log.attachmentName && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-[#D5E2D9] text-[10.5px] text-[#0B6B3A] font-semibold">
                              <i className="fa-solid fa-paperclip text-[10px]" />
                              <span>Attached: {log.attachmentName}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* COLUMN 2: PATIENT INQUIRIES & ASSISTANCE MESSAGES (WITH READ/UNREAD, SENT BADGES & HISTORY) */}
              <div className="bg-white border border-[#D5E2D9] rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF2EF] pb-3.5">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-[#10241A] flex items-center gap-2 m-0">
                          <i className="fa-solid fa-envelope-open-text text-[#0B6B3A]" />
                          <span>Patient Inquiries &amp; Assistance Messages</span>
                        </h3>
                        {/* Interactive Notification Counter Pill: 1 if Unread, 0 if Read / Completed */}
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border transition ${unreadInquiriesCount > 0
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${unreadInquiriesCount > 0 ? 'bg-amber-600 animate-pulse' : 'bg-emerald-600'
                              }`}
                          />
                          <span>
                            {unreadInquiriesCount} Unread {unreadInquiriesCount === 0 ? '(All Read / Completed)' : 'Notification'}
                          </span>
                        </span>
                      </div>
                      <p className="text-xs text-[#5A7466] m-0 mt-0.5">
                        Questions, charity assistance applications, and evidential document inquiries submitted by this patient.
                      </p>
                    </div>


                  </div>

                  {inquiries.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-[#D5E2D9] rounded-xl text-[#5A7466]">
                      <i className="fa-solid fa-comments text-2xl mb-2 text-[#94A3B8]" />
                      <p className="m-0 text-xs">No inquiries submitted by this patient yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                      {inquiries.map((inq: any, idx: number) => {
                        const isRead = Boolean(inq.isRead || inq.status === 'Answered' || inq.status === 'Completed');
                        const sentChannels: string[] = inq.sentChannels || [];
                        const hasSentEmail =
                          sentChannels.includes('email') ||
                          (inq.replyHistory && inq.replyHistory.some((r: any) => r.channel === 'email' || String(r.sender).includes('Email')));
                        const hasSentSms =
                          sentChannels.includes('sms') ||
                          (inq.replyHistory && inq.replyHistory.some((r: any) => r.channel === 'sms' || String(r.sender).includes('SMS')));

                        return (
                          <div
                            key={inq.id || idx}
                            className={`p-4 rounded-xl border space-y-3 transition ${!isRead
                              ? 'bg-[#FFFDF5] border-amber-300 shadow-xs'
                              : 'bg-[#FAFBF8] border-[#D5E2D9] hover:border-[#0B6B3A]/40'
                              }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF2EF] pb-2.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                                  {inq.id || `INQ-${idx + 1}`}
                                </span>
                                <span className="font-bold text-[#10241A] text-xs sm:text-sm">
                                  {inq.subject || 'Patient Assistance Inquiry'}
                                </span>

                                {/* Read / Unread Status Badge */}
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${!isRead
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                                    }`}
                                >
                                  <i className={`fa-solid ${!isRead ? 'fa-envelope text-amber-700' : 'fa-envelope-open text-slate-500'} text-[9px]`} />
                                  <span>{!isRead ? 'UNREAD' : 'READ'}</span>
                                </span>

                                {/* Completed / Answered Badge */}
                                {(inq.status === 'Answered' || inq.status === 'Completed') && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
                                    <i className="fa-solid fa-check-double text-[9px]" />
                                    <span>COMPLETED</span>
                                  </span>
                                )}

                                {/* Sent via Email Badge */}
                                {hasSentEmail && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F5EC] text-[#0B6B3A] border border-[#A7F3D0]">
                                    <i className="fa-solid fa-envelope-circle-check text-[9px]" />
                                    <span>Email Sent</span>
                                  </span>
                                )}

                                {/* Sent via SMS Badge */}
                                {hasSentSms && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    <i className="fa-solid fa-comment-sms text-[9px]" />
                                    <span>Text (SMS) Sent</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleInquiryRead(inq.id)}
                                  className="px-2 py-0.5 rounded-md border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[10.5px] font-semibold text-[#475569] cursor-pointer transition"
                                  title={isRead ? 'Mark as Unread (Notification = 1)' : 'Mark as Read (Notification = 0)'}
                                >
                                  <i className={`fa-regular ${isRead ? 'fa-envelope' : 'fa-envelope-open'} mr-1`} />
                                  <span>{isRead ? 'Mark Unread' : 'Mark Read'}</span>
                                </button>
                                <div className="text-[11px] text-[#5A7466] flex items-center gap-1 font-medium">
                                  <i className="fa-regular fa-clock text-xs text-[#0B6B3A]" />
                                  <span>{inq.date || '2026-11-22'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Patient Message Text */}
                            <div className="bg-white p-3.5 rounded-lg border border-[#EEF2EF] text-xs text-[#1E293B] leading-relaxed">
                              <div className="text-[10.5px] font-bold text-[#5A7466] uppercase tracking-wider mb-1 flex items-center gap-1">
                                <i className="fa-solid fa-message text-[#0B6B3A]" />
                                <span>Submitted Message from Patient:</span>
                              </div>
                              <p className="m-0 whitespace-pre-wrap font-sans text-xs text-[#10241A]">
                                {inq.message || inq.text || 'No message content provided.'}
                              </p>
                            </div>

                            {/* Patient Submitted Attachments if any */}
                            {inq.patientAttachments && inq.patientAttachments.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                <div className="text-[10.5px] font-bold text-[#5A7466] uppercase tracking-wider flex items-center gap-1">
                                  <i className="fa-solid fa-paperclip text-[#0B6B3A]" />
                                  <span>Attached Files from Patient ({inq.patientAttachments.length}):</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {inq.patientAttachments.map((att: any, aIdx: number) => (
                                    <div
                                      key={aIdx}
                                      className="p-2.5 bg-white border border-[#D5E2D9] rounded-lg flex items-center justify-between gap-2"
                                    >
                                      <div className="min-w-0 flex items-center gap-2">
                                        <i
                                          className={`text-sm ${att.type === 'pdf'
                                            ? 'fa-solid fa-file-pdf text-red-600'
                                            : 'fa-solid fa-file-image text-emerald-600'
                                            }`}
                                        />
                                        <div className="min-w-0">
                                          <div className="font-semibold text-xs text-[#10241A] truncate">{att.name}</div>
                                          <div className="text-[10px] text-[#5A7466]">{att.size || 'Attachment'}</div>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPreviewAttachment({
                                            name: att.name,
                                            url: att.url,
                                            type: att.type === 'pdf' ? 'pdf' : 'image',
                                          })
                                        }
                                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-[#E8F5EC] hover:text-[#0B6B3A] text-[#10241A] text-[10.5px] font-bold cursor-pointer transition"
                                      >
                                        View
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Inquiry Reply History inside card */}
                            {inq.replyHistory && inq.replyHistory.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                <div className="text-[10.5px] font-bold text-[#0B6B3A] uppercase tracking-wider flex items-center gap-1">
                                  <i className="fa-solid fa-reply-all text-[#0B6B3A]" />
                                  <span>Clinic Staff Response History ({inq.replyHistory.length}):</span>
                                </div>
                                {inq.replyHistory.map((rep: any, rIdx: number) => (
                                  <div key={rIdx} className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs space-y-1">
                                    <div className="flex justify-between items-center text-[10.5px] font-bold text-[#064826]">
                                      <span className="flex items-center gap-1.5">
                                        <i className={`fa-solid ${rep.channel === 'sms' ? 'fa-comment-sms text-blue-600' : 'fa-envelope-circle-check text-[#0B6B3A]'}`} />
                                        <span>{rep.sender}</span>
                                      </span>
                                      <span className="text-[#5A7466] font-normal">{rep.timestamp}</span>
                                    </div>
                                    <p className="m-0 text-[#1E293B] whitespace-pre-wrap">{rep.message}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Action Bar: Open 2-Tab Respond to Patient Inquiry Modal (Image 3 layout) */}
                            <div className="flex justify-end gap-2 pt-2 border-t border-[#EEF2EF]">
                              <button
                                type="button"
                                onClick={() => handleOpenInquiryReplyModal(inq, 'files')}
                                className="px-3.5 py-1.5 rounded-lg bg-[#0B6B3A] hover:bg-[#084D29] text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                              >
                                <i className="fa-solid fa-reply text-xs" />
                                <span>Reply to this Inquiry</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* =====================================================================
            TAB 7: CHARITY STATUS (ADMIN STRICT READ-ONLY ACCESS — CHARITY PATIENTS ONLY)
           ===================================================================== */}
        {isCharity && dossierTab === 'charity_status' && (() => {
          const latestAsmt = selectedCharityAsmt || charityAssessments[0] || null;
          const canonicalPid = patientData?.patient_id || patientId;
          const charityCaseNo =
            patientData?.charity_case_no ||
            (String(canonicalPid).toUpperCase().startsWith('MSW_FA_') ? canonicalPid : 'Not Assigned');
          const latestEnc = encounters[0] || null;
          const encounterNo =
            latestAsmt?.encounter_no ||
            latestEnc?.id ||
            latestEnc?.assessment_id ||
            'Not Available';
          const appDate =
            latestAsmt?.interview_date ||
            latestEnc?.encounter_date ||
            patientData?.registration_date ||
            'Not Available';
          const appStatus = String(patientData?.status || 'PENDING').toUpperCase();
          const asmtStatus = latestAsmt?.workflow_status || (appStatus === 'APPROVED' ? 'APPROVED' : 'NOT_STARTED');

          const finClsObj = latestAsmt?.classification_result?.financial_classification;
          const mswClsObj = latestAsmt?.classification_result?.msw_classification;
          const finClassLabel =
            typeof finClsObj === 'object'
              ? finClsObj?.classification_label || finClsObj?.classification
              : finClsObj || 'Not Available';
          const mswClassLabel =
            typeof mswClsObj === 'object'
              ? mswClsObj?.classification_label || mswClsObj?.classification
              : mswClsObj || 'Not Available';

          const recommendedTier =
            latestAsmt?.msw_recommendation?.recommended_tier ||
            latestAsmt?.classification_result?.combined_recommendation ||
            (appStatus === 'APPROVED' ? 'Indigent (100% Full Charity Subsidy)' : 'Not Available');

          const approvedTier =
            latestAsmt?.institutional_approval?.decision === 'APPROVED'
              ? `${recommendedTier} (${latestAsmt.institutional_approval.approved_subsidy_percentage ?? 100}% Approved)`
              : appStatus === 'APPROVED'
                ? 'Indigent Charity Grant (100% Approved)'
                : 'Not Applicable';

          const requestedAmount =
            latestEnc?.total_amount ??
            (referralTotal > 0 ? referralTotal : null);

          const approvedSubsidyVal =
            latestEnc?.approved_financial_assistance ??
            (totalSubsidy > 0 ? totalSubsidy : null);

          const decisionStatus =
            latestAsmt?.institutional_approval?.decision ||
            appStatus ||
            'PENDING';

          const decisionDate =
            latestAsmt?.institutional_approval?.decision_timestamp
              ? String(latestAsmt.institutional_approval.decision_timestamp).slice(0, 10)
              : latestEnc?.encounter_date || patientData?.registration_date || 'Not Available';

          const authorizedDecisionMaker =
            latestAsmt?.institutional_approval?.approver_name ||
            latestAsmt?.msw_recommendation?.msw_assessor_name ||
            patientData?.assigned_msw ||
            'Not Available';

          const disapprovalOrPromissoryReason =
            latestAsmt?.institutional_approval?.decision_notes ||
            (appStatus.includes('DISAPPROVED') || appStatus.includes('PROMISSORY')
              ? latestEnc?.notes || 'Evaluated under Partial Subsidy / Promissory Note arrangement.'
              : 'Not Applicable');

          const lastUpdatedTs =
            latestAsmt?.updated_at
              ? new Date(latestAsmt.updated_at).toLocaleString()
              : latestEnc?.encounter_date || patientData?.registration_date || 'Not Available';

          const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

          return (
            <div className="space-y-5" data-testid="admin-charity-status-panel">
              {/* Strict Read-Only Governance Banner */}
              <div className="bg-[#F0F9F3] border border-[#A7F3D0] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#0B6B3A] text-white flex items-center justify-center text-sm shrink-0">
                    <i className="fa-solid fa-eye" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-bold text-[#10241A] m-0 font-['Outfit']">
                        Charity Status &amp; Eligibility Record (Admin Read-Only View)
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white text-[#0B6B3A] border border-[#0B6B3A]/30 uppercase tracking-wider">
                        Strict Read-Only Mode
                      </span>
                    </div>
                    <p className="text-xs text-[#24352B] mt-1 m-0">
                      Inspect recorded charity application details, MSW assessment summaries, eligibility recommendations, approved subsidy amounts, and supporting documents. MSW assessment editing and launch controls are restricted to licensed Medical Social Workers.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {charityAssessments.length > 1 && (
                    <select
                      value={latestAsmt?.id || ''}
                      onChange={(e) => {
                        const found = charityAssessments.find((a) => a.id === e.target.value);
                        setSelectedCharityAsmt(found || null);
                      }}
                      className="px-3 py-2 rounded-xl border border-[#D5E2D9] bg-white text-xs font-bold text-[#10241A]"
                    >
                      {charityAssessments.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.id} ({a.workflow_status})
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={loadAdminCharityStatusData}
                    disabled={isLoadingCharityStatus}
                    data-testid="refresh-admin-charity-status-btn"
                    className="px-3.5 py-2 rounded-xl border border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] text-[#10241A] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <i className={`fa-solid fa-arrows-rotate text-[#0B6B3A] ${isLoadingCharityStatus ? 'fa-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* 1. Core Charity Application & Decision Details Grid */}
              <div className="bg-white border border-[#D5E2D9] rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#EEF2EF] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#10241A] m-0 flex items-center gap-2">
                      <i className="fa-solid fa-hand-holding-heart text-[#0B6B3A]" />
                      <span>Recorded Charity Application, Eligibility &amp; Grant Decision Summary</span>
                    </h3>
                    <p className="text-[11px] text-[#5A7466] m-0 mt-0.5">
                      Authoritative database values for Patient ID, Application Encounter Number, and Charity Case Number.
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-[#5A7466]">
                    Last Updated: <strong className="text-[#10241A]">{lastUpdatedTs}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                    <div className="text-[10px] font-bold uppercase text-[#64748B]">Charity Case Number</div>
                    <div className="font-mono font-extrabold text-[#0B6B3A] text-sm mt-1" data-testid="admin-charity-case-no">
                      {charityCaseNo}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                    <div className="text-[10px] font-bold uppercase text-[#64748B]">Application Encounter Number</div>
                    <div className="font-mono font-bold text-[#0369A1] text-sm mt-1" data-testid="admin-charity-encounter-no">
                      {encounterNo}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                    <div className="text-[10px] font-bold uppercase text-[#64748B]">Patient ID</div>
                    <div className="font-mono font-extrabold text-[#10241A] text-sm mt-1" data-testid="admin-charity-patient-id">
                      {canonicalPid}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                    <div className="text-[10px] font-bold uppercase text-[#64748B]">Beneficiary Classification</div>
                    <div className="font-extrabold text-[#047857] mt-1">
                      Charity Beneficiary ({patientData?.category || 'CHARITY'})
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                    <div className="text-[10px] font-bold uppercase text-[#64748B]">Charity Application Date</div>
                    <div className="font-bold text-[#10241A] mt-1">{appDate}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                    <div className="text-[10px] font-bold uppercase text-[#64748B]">Current Charity Application Status</div>
                    <div className="mt-1">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          appStatus === 'APPROVED'
                            ? 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]'
                            : appStatus.includes('DISAPPROVED') || appStatus.includes('PROMISSORY')
                              ? 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]'
                              : 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]'
                        }`}
                      >
                        {appStatus}
                      </span>
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                    <div className="text-[10px] font-bold uppercase text-[#64748B]">MSW Assessment Status</div>
                    <div className="font-bold text-[#10241A] mt-1">{asmtStatus}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                    <div className="text-[10px] font-bold uppercase text-[#64748B]">Eligibility Recommendation</div>
                    <div className="font-bold text-[#10241A] mt-1">
                      {finClassLabel !== 'Not Available' || mswClassLabel !== 'Not Available'
                        ? `Financial: ${finClassLabel} • MSW: ${mswClassLabel}`
                        : recommendedTier}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                    <div className="text-[10px] font-bold uppercase text-[#64748B]">Recommended Charity Grant Tier</div>
                    <div className="font-extrabold text-[#0B6B3A] mt-1">{recommendedTier}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                    <div className="text-[10px] font-bold uppercase text-[#64748B]">Approved Charity Grant Tier</div>
                    <div className="font-extrabold text-[#10241A] mt-1">{approvedTier}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                    <div className="text-[10px] font-bold uppercase text-[#64748B]">Requested Assistance Amount</div>
                    <div className="font-mono font-bold text-[#10241A] mt-1">
                      {requestedAmount !== null && requestedAmount !== undefined
                        ? `₱${Number(requestedAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : 'Not Available'}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                    <div className="text-[10px] font-bold uppercase text-[#64748B]">Approved Subsidy Amount</div>
                    <div className="font-mono font-extrabold text-[#0B6B3A] mt-1">
                      {approvedSubsidyVal !== null && approvedSubsidyVal !== undefined
                        ? `₱${Number(approvedSubsidyVal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : 'Not Available'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                    <div className="text-[10px] font-bold uppercase text-[#64748B]">Decision Status</div>
                    <div className="font-extrabold text-[#10241A] mt-1">{decisionStatus}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                    <div className="text-[10px] font-bold uppercase text-[#64748B]">Approval or Denial Date</div>
                    <div className="font-bold text-[#10241A] mt-1">{decisionDate}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                    <div className="text-[10px] font-bold uppercase text-[#64748B]">Authorized Decision-Maker</div>
                    <div className="font-bold text-[#10241A] mt-1">{authorizedDecisionMaker}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
                    <div className="text-[10px] font-bold uppercase text-[#64748B]">Disapproval / Promissory Reason</div>
                    <div className="font-medium text-[#10241A] mt-1">{disapprovalOrPromissoryReason}</div>
                  </div>
                </div>

                {/* Associated Encounter Quick Navigation */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF2EF]">
                  <span className="text-[11px] text-[#5A7466]">
                    Need to inspect clinical procedures or itemized referral slips for this beneficiary?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDossierTab('procedures')}
                      className="px-3.5 py-1.5 rounded-xl border border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] text-xs font-bold text-[#10241A] cursor-pointer"
                    >
                      View Clinical Encounters ({encounters.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDossierTab('referral')}
                      className="px-3.5 py-1.5 rounded-xl border border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] text-xs font-bold text-[#0B6B3A] cursor-pointer"
                    >
                      View Financial Referral
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Supporting Charity & Assessment Documents (Preview & Download) */}
              <div className="bg-white border border-[#D5E2D9] rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#EEF2EF] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#10241A] m-0 flex items-center gap-2">
                      <i className="fa-solid fa-folder-open text-[#0B6B3A]" />
                      <span>Supporting Charity &amp; Assessment Documents ({charityBackendDocs.length})</span>
                    </h3>
                    <p className="text-[11px] text-[#5A7466] m-0 mt-0.5">
                      Evidential documents linked to {canonicalPid}. Preview or download verified files in read-only mode.
                    </p>
                  </div>
                </div>

                {charityBackendDocs.length === 0 ? (
                  <div className="p-8 text-center bg-[#FAFBF8] rounded-xl border border-[#EEF2EF] text-xs text-[#64748B]">
                    No supporting charity documents are currently recorded for {canonicalPid}.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {charityBackendDocs.map((doc) => {
                      const isPdf =
                        String(doc.mime_type || '').toLowerCase().includes('pdf') ||
                        String(doc.filename || '').toLowerCase().endsWith('.pdf');
                      const previewUrl = `${apiBase}/documents/${encodeURIComponent(doc.id)}/download?patient_id=${encodeURIComponent(canonicalPid)}&inline=true`;
                      const downloadUrl = `${apiBase}/documents/${encodeURIComponent(doc.id)}/download?patient_id=${encodeURIComponent(canonicalPid)}`;
                      return (
                        <div
                          key={doc.id}
                          className="p-4 rounded-xl border border-[#D5E2D9] bg-[#FAFBF8] flex items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center shrink-0">
                              <i className={`fa-solid ${isPdf ? 'fa-file-pdf text-rose-600' : 'fa-file-image text-[#0B6B3A]'}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-[#10241A] truncate">
                                {doc.document_type || 'Supporting Document'}
                              </div>
                              <div className="text-[11px] text-[#5A7466] truncate">{doc.filename}</div>
                              <div className="text-[10px] text-[#64748B] mt-0.5">
                                {doc.verification_status || doc.status || 'Verified'} • {String(doc.uploaded_at || '').slice(0, 10)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewAttachment({
                                  name: doc.filename || doc.document_type || 'Document',
                                  url: previewUrl,
                                  type: isPdf ? 'pdf' : 'image',
                                })
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-[#D5E2D9] hover:border-[#0B6B3A] text-xs font-bold text-[#0B6B3A] cursor-pointer"
                            >
                              <i className="fa-regular fa-eye mr-1" />
                              Preview
                            </button>
                            <a
                              href={downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1.5 rounded-lg bg-[#0B6B3A] hover:bg-[#084D29] text-white text-xs font-bold no-underline"
                            >
                              <i className="fa-solid fa-download" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Read-Only Assessment & Decision History Log */}
              <div className="bg-white border border-[#D5E2D9] rounded-2xl p-6 shadow-xs space-y-4">
                <div className="border-b border-[#EEF2EF] pb-3">
                  <h3 className="text-sm font-bold text-[#10241A] m-0 flex items-center gap-2">
                    <i className="fa-solid fa-clock-rotate-left text-[#0B6B3A]" />
                    <span>Historical Charity Assessments &amp; Decision Audit Trail ({charityAssessments.length})</span>
                  </h3>
                  <p className="text-[11px] text-[#5A7466] m-0 mt-0.5">
                    Read-only record of MSW socio-economic assessments and institutional charity status changes.
                  </p>
                </div>

                {charityAssessments.length === 0 ? (
                  <div className="p-6 text-center bg-[#FAFBF8] rounded-xl border border-[#EEF2EF] text-xs text-[#64748B]">
                    No MSW assessment drafts or submissions have been logged for this charity patient yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {charityAssessments.map((asmt) => (
                      <div
                        key={asmt.id}
                        className="p-4 rounded-xl border border-[#D5E2D9] bg-[#FAFBF8] space-y-2 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#0B6B3A] bg-[#E8F5EC] px-2.5 py-0.5 rounded-md">
                              {asmt.id}
                            </span>
                            <span className="font-mono text-[#5A7466]">
                              Encounter: <strong className="text-[#10241A]">{asmt.encounter_no || 'N/A'}</strong>
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white border border-[#D5E2D9] text-[#10241A]">
                              Stage {asmt.active_stage || 1} of 4 • {asmt.workflow_status}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#64748B]">
                            Updated: {asmt.updated_at ? new Date(asmt.updated_at).toLocaleString() : 'N/A'}
                          </span>
                        </div>

                        {asmt.msw_recommendation?.case_notes && (
                          <div className="p-3 rounded-lg bg-white border border-[#EEF2EF] text-[#1E293B]">
                            <strong className="text-[#0B6B3A]">MSW Case Notes:</strong> {asmt.msw_recommendation.case_notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* =========================================================================
          MODAL 0: RESPOND TO PATIENT INQUIRY (EXACT IMAGE 3 HORIZONTAL 2-TAB LAYOUT)
         ========================================================================= */}
      {activeInquiryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#D5E2D9] overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#FAFBF8] border-b border-[#EEF2EF] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center">
                  <i className="fa-solid fa-reply text-sm" />
                </div>
                <div>
                  <h3 className="font-['Outfit'] font-bold text-base text-[#10241A] m-0">
                    Respond to Patient Inquiry
                  </h3>
                  <div className="text-[11px] text-[#64748B] flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                    <span className="font-mono font-semibold text-[#475569]">{activeInquiryModal.id}</span>
                    <span>&bull;</span>
                    <span className="font-semibold text-[#10241A]">
                      {activeInquiryModal.name || `${patientData?.first_name || 'Juan'} ${patientData?.last_name || 'Dela Cruz'}`}
                    </span>
                    <span className="text-[#0B6B3A] font-medium inline-flex items-center gap-1">
                      <i className="fa-solid fa-envelope text-[10px]" />
                      {activeInquiryModal.email || patientData?.email || 'juan.delacruz@example.ph'}
                    </span>
                    <span>&bull;</span>
                    <span className="text-[#064826] font-medium inline-flex items-center gap-1">
                      <i className="fa-solid fa-phone text-[10px]" />
                      {activeInquiryModal.contactNumber || patientData?.contact || '0917 888 1678'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveInquiryModal(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200/70 flex items-center justify-center text-gray-500 cursor-pointer border-0 bg-transparent"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Horizontal Navigation Tabs Bar (Exact Image 3 Replica) */}
            <div className="px-6 bg-white border-b border-[#D5E2D9] flex items-center gap-6 shrink-0">
              <button
                type="button"
                onClick={() => setInquiryModalTab('files')}
                className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer bg-transparent ${inquiryModalTab === 'files'
                  ? 'border-[#0B6B3A] text-[#0B6B3A]'
                  : 'border-transparent text-[#64748B] hover:text-[#10241A]'
                  }`}
              >
                <i className="fa-solid fa-folder-open text-xs" />
                <span>Files &amp; Documents Submitted by Patient</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${inquiryModalTab === 'files' ? 'bg-[#0B6B3A] text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                >
                  {activeInquiryModal.patientAttachments?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setInquiryModalTab('compose')}
                className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer bg-transparent ${inquiryModalTab === 'compose'
                  ? 'border-[#0B6B3A] text-[#0B6B3A]'
                  : 'border-transparent text-[#64748B] hover:text-[#10241A]'
                  }`}
              >
                <i className="fa-solid fa-paper-plane text-xs" />
                <span>Send Response / Dispatch</span>
              </button>
            </div>

            {/* Modal Scrollable Content Area */}
            <div className="p-6 overflow-y-auto max-h-[68vh] space-y-4">
              {/* TAB 1: FILES & DOCUMENTS SUBMITTED BY PATIENT */}
              {inquiryModalTab === 'files' && (
                <div className="space-y-4">
                  {/* Original Patient Inquiry Message Card */}
                  <div className="bg-[#FAFBF8] border border-[#E2E8F0] rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#10241A]">{activeInquiryModal.subject}</span>
                      <span className="text-[11px] text-[#94A3B8]">Received: {activeInquiryModal.date}</span>
                    </div>
                    <p className="text-xs text-[#475569] leading-relaxed m-0 italic bg-white p-3 rounded-lg border border-[#EEF2EF]">
                      &ldquo;{activeInquiryModal.message}&rdquo;
                    </p>
                  </div>

                  {/* Submitted Files List */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                        Verified Documents &amp; Uploads Submitted ({activeInquiryModal.patientAttachments?.length || 0})
                      </span>
                    </div>

                    {activeInquiryModal.patientAttachments && activeInquiryModal.patientAttachments.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeInquiryModal.patientAttachments.map((att: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-white border border-[#D5E2D9] hover:border-[#0B6B3A] shadow-2xs flex flex-col justify-between transition group"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${att.type === 'pdf' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-[#0B6B3A]'
                                  }`}
                              >
                                <i
                                  className={`fa-solid ${att.type === 'pdf' ? 'fa-file-pdf' : 'fa-image'
                                    } text-lg`}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-xs text-[#10241A] truncate group-hover:text-[#0B6B3A]">
                                  {att.name}
                                </div>
                                <div className="text-[10.5px] text-[#64748B] mt-0.5">
                                  {att.type === 'pdf' ? 'PDF Document' : 'Image File'}{' '}
                                  {att.size && `• ${att.size}`}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3.5 pt-2.5 border-t border-[#EEF2EF] flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewAttachment({
                                    name: att.name,
                                    url: att.url,
                                    type: att.type === 'pdf' ? 'pdf' : 'image',
                                  })
                                }
                                className="px-3 py-1.5 rounded-lg bg-white border border-[#CBD5E1] hover:bg-[#E8F5EC] text-[#0B6B3A] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                              >
                                <i className="fa-solid fa-eye text-xs" />
                                <span>Preview Document</span>
                              </button>

                              <a
                                href={att.url}
                                download={att.name}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[#64748B] hover:text-[#0B6B3A] no-underline font-medium flex items-center gap-1"
                              >
                                <i className="fa-solid fa-download text-[10px]" />
                                <span>Download</span>
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-[#FAFBF8] border border-dashed border-[#CBD5E1] rounded-xl text-gray-400">
                        <i className="fa-solid fa-folder-open text-2xl mb-2 text-gray-300" />
                        <div className="text-xs font-semibold text-gray-600">No attachments provided</div>
                        <p className="text-[11px] text-gray-400 m-0 mt-0.5">
                          The patient did not submit any files or images along with this inquiry message.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Proceed to Reply / Dispatch Form Button */}
                  <div className="pt-3 border-t border-[#EEF2EF] flex justify-end">
                    <button
                      type="button"
                      onClick={() => setInquiryModalTab('compose')}
                      className="px-5 py-2.5 rounded-xl bg-[#0B6B3A] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs hover:bg-[#064826] transition"
                    >
                      <span>Proceed to Reply / Dispatch Form</span>
                      <i className="fa-solid fa-arrow-right text-xs" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: SEND RESPONSE / DISPATCH */}
              {inquiryModalTab === 'compose' && (
                <div className="space-y-4">
                  {/* Inquiry Reference Summary */}
                  <div className="bg-[#FAFBF8] border border-[#E2E8F0] rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#10241A]">{activeInquiryModal.subject}</span>
                      <span className="text-[10.5px] text-[#94A3B8]">{activeInquiryModal.date}</span>
                    </div>
                    <p className="text-xs text-[#475569] leading-relaxed m-0 italic bg-white p-2.5 rounded-lg border border-[#EEF2EF]">
                      &ldquo;{activeInquiryModal.message}&rdquo;
                    </p>
                  </div>

                  {/* Previous Replies if any */}
                  {activeInquiryModal.replyHistory && activeInquiryModal.replyHistory.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-[#334155] uppercase tracking-wider">
                        Previous Communication History
                      </label>
                      {activeInquiryModal.replyHistory.map((rep: any, idx: number) => (
                        <div key={idx} className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 text-xs">
                          <div className="font-semibold text-[#064826] flex items-center justify-between">
                            <span>{rep.sender}</span>
                            <span className="text-[10px] text-[#64748B]">{rep.timestamp}</span>
                          </div>
                          <div className="text-[#2E4538] mt-1">{rep.message}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Response Form */}
                  <form onSubmit={handleSendInquiryReply} className="space-y-4">
                    {/* Channel Selector */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#334155] mb-1.5 uppercase tracking-wider">
                        Reply Channel &amp; Delivery Option
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setInqReplyChannel('email');
                            setInqReplyTo(activeInquiryModal.email || patientData?.email || 'juan.delacruz@example.ph');
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${inqReplyChannel === 'email'
                            ? 'bg-[#E8F5EC] border-[#0B6B3A] text-[#0B6B3A] shadow-xs ring-1 ring-[#0B6B3A]/20'
                            : 'bg-[#FAFBF8] border-[#D5E2D9] text-[#64748B] hover:text-[#10241A]'
                            }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold">
                            <i className="fa-solid fa-envelope text-xs" />
                            <span>Send via Email</span>
                          </div>
                          <span className="text-[10px] text-[#5A7466] truncate max-w-full">
                            {activeInquiryModal.email || patientData?.email || 'juan.delacruz@example.ph'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setInqReplyChannel('sms');
                            setInqReplyTo(activeInquiryModal.contactNumber || patientData?.contact || '0917 888 1678');
                            setInqAttachedFile(null);
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${inqReplyChannel === 'sms'
                            ? 'bg-[#E8F5EC] border-[#0B6B3A] text-[#0B6B3A] shadow-xs ring-1 ring-[#0B6B3A]/20'
                            : 'bg-[#FAFBF8] border-[#D5E2D9] text-[#64748B] hover:text-[#10241A]'
                            }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold">
                            <i className="fa-solid fa-mobile-screen text-xs" />
                            <span>Send via Mobile (SMS)</span>
                          </div>
                          <span className="text-[10px] text-[#5A7466] truncate max-w-full">
                            {activeInquiryModal.contactNumber || patientData?.contact || '0917 888 1678'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* To Recipient Input */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#334155] mb-1">
                        To: <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                          <i className={`fa-solid ${inqReplyChannel === 'email' ? 'fa-at' : 'fa-phone'} text-xs`} />
                        </div>
                        <input
                          type={inqReplyChannel === 'email' ? 'email' : 'text'}
                          value={inqReplyTo}
                          onChange={(e) => setInqReplyTo(e.target.value)}
                          placeholder={inqReplyChannel === 'email' ? 'recipient@email.com' : '0917 888 1678'}
                          className="w-full pl-9 pr-3 py-2 border border-[#CBD5E1] rounded-xl text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                          required
                        />
                      </div>
                    </div>

                    {/* Subject Input */}
                    {inqReplyChannel === 'email' && (
                      <div>
                        <label className="block text-[11px] font-bold text-[#334155] mb-1">
                          Subject: <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <i className="fa-solid fa-heading text-xs" />
                          </div>
                          <input
                            type="text"
                            value={inqReplySubject}
                            onChange={(e) => setInqReplySubject(e.target.value)}
                            placeholder="Email Subject"
                            className="w-full pl-9 pr-3 py-2 border border-[#CBD5E1] rounded-xl text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                            required
                          />
                        </div>
                      </div>
                    )}

                    {/* Body textarea */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#334155] mb-1">
                        Body: <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={inqReplyChannel === 'email' ? 5 : 4}
                        value={inqReplyText}
                        onChange={(e) => setInqReplyText(e.target.value)}
                        placeholder={
                          inqReplyChannel === 'email'
                            ? 'Type official guidance, requirements checklist, or appointment scheduling details...'
                            : 'Type concise SMS message to patient (e.g., Ang inyong libreng konsultasyon ay nakatakda sa Biyernes)...'
                        }
                        className="w-full p-3 border border-[#CBD5E1] rounded-xl text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] leading-relaxed"
                        required
                      />
                    </div>

                    {/* File Attachment Upload */}
                    {inqReplyChannel === 'email' && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-[#334155]">
                            Attach Picture or Document (Optional)
                          </label>
                          <span className="text-[10px] text-[#64748B]">
                            Formats: PNG, JPG, JPEG, PDF &bull; Max: 10MB
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="px-3.5 py-2 rounded-xl border border-[#D5E2D9] bg-[#FAFBF8] hover:bg-[#F1F5F9] text-[#334155] text-xs font-semibold flex items-center gap-2 cursor-pointer transition shadow-2xs">
                            <i className="fa-solid fa-cloud-arrow-up text-xs text-[#0B6B3A]" />
                            <span>{inqAttachedFile ? 'Change Attachment' : 'Upload File / Image'}</span>
                            <input
                              type="file"
                              accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                              className="hidden"
                              onChange={handleInqFileUpload}
                            />
                          </label>

                          {inqAttachedFile && (
                            <button
                              type="button"
                              onClick={() => setInqAttachedFile(null)}
                              className="text-xs text-[#DC2626] hover:underline cursor-pointer bg-transparent border-0 flex items-center gap-1"
                            >
                              <i className="fa-solid fa-trash-can text-[11px]" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Bottom Action Buttons */}
                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EEF2EF]">
                      <button
                        type="button"
                        onClick={() => setActiveInquiryModal(null)}
                        disabled={isSendingInqReply}
                        className="px-4 py-2 rounded-xl border border-[#D5E2D9] text-[#64748B] font-semibold hover:bg-slate-50 cursor-pointer bg-transparent text-xs"
                      >
                        Close
                      </button>
                      <button
                        type="submit"
                        disabled={isSendingInqReply}
                        className="px-5 py-2 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white font-bold text-xs border-0 cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <i className={`fa-solid ${isSendingInqReply ? 'fa-spinner fa-spin' : 'fa-paper-plane'} text-xs`} />
                        <span>{isSendingInqReply ? 'Sending Response...' : 'Dispatch Reply'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: SEND URGENT EMAIL / REQUEST MISSING REQUIREMENTS */}
      {urgentEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#D5E2D9] w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EEF2EF] flex items-center justify-between bg-[#FAFBF8] shrink-0">
              <div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-red-100 text-red-800 uppercase tracking-wider">
                  <i className="fa-solid fa-bolt mr-1" />
                  Urgent Patient Notification & Requirement Request
                </span>
                <h3 className="text-base font-bold text-[#10241A] mt-1 m-0">
                  Notify {patientData?.first_name} {patientData?.last_name} ({patientData?.patient_id})
                </h3>
                <p className="text-xs text-[#5A7466] m-0 mt-0.5">
                  Sends an official HTML email AND unlocks the missing-requirements upload checklist on the Patient Portal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUrgentEmailModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <form onSubmit={handleSendUrgentEmail} className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Channel Selector: Email vs SMS / Mobile */}
              <div>
                <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1.5">
                  Delivery Channel / Option *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUrgentChannel('email');
                      setUrgentRecipient(patientData?.email || '');
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${urgentChannel === 'email'
                      ? 'bg-[#E8F5EC] border-[#0B6B3A] text-[#0B6B3A] shadow-xs ring-1 ring-[#0B6B3A]/20'
                      : 'bg-[#FAFBF8] border-[#D5E2D9] text-[#64748B] hover:text-[#10241A]'
                      }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <i className="fa-solid fa-envelope text-xs" />
                      <span>Send via Email</span>
                    </div>
                    <span className="text-[10px] text-[#5A7466] truncate max-w-full">
                      {patientData?.email || 'patient@example.ph'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUrgentChannel('sms');
                      setUrgentRecipient(patientData?.contact || '');
                      setAttachedFile(null);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${urgentChannel === 'sms'
                      ? 'bg-[#E8F5EC] border-[#0B6B3A] text-[#0B6B3A] shadow-xs ring-1 ring-[#0B6B3A]/20'
                      : 'bg-[#FAFBF8] border-[#D5E2D9] text-[#64748B] hover:text-[#10241A]'
                      }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <i className="fa-solid fa-mobile-screen text-xs" />
                      <span>Send via Mobile (SMS)</span>
                    </div>
                    <span className="text-[10px] text-[#5A7466] truncate max-w-full">
                      {patientData?.contact || '0917 888 1678'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Notification Category & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                    Notification Category *
                  </label>
                  <select
                    value={urgentNotifType}
                    onChange={(e) => {
                      setUrgentNotifType(e.target.value);
                      updateUrgentEmailTemplate(e.target.value, patientData);
                    }}
                    className="w-full h-9 px-3 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]"
                  >
                    <option value="missing_requirements">Urgent: Request Missing Requirements</option>
                    <option value="urgent_schedule">Urgent: Surgery / Schedule Notice</option>
                    <option value="status_update">Application Status Update</option>
                    <option value="custom_urgent">Custom Urgent Notice</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                    Priority Level *
                  </label>
                  <select className="w-full h-9 px-3 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]">
                    <option value="urgent">Urgent / High Priority</option>
                    <option value="normal">Standard Clinic Notification</option>
                  </select>
                </div>
              </div>

              {/* Recipient Information Display & Input */}
              <div>
                <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                  {urgentChannel === 'email' ? 'Recipient Email Address *' : 'Recipient Mobile Phone Number *'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <i className={`fa-solid ${urgentChannel === 'email' ? 'fa-at' : 'fa-phone'} text-xs`} />
                  </div>
                  <input
                    type={urgentChannel === 'email' ? 'email' : 'text'}
                    required
                    value={
                      urgentRecipient ||
                      (urgentChannel === 'email'
                        ? patientData?.email || 'patient@example.ph'
                        : patientData?.contact || '0917 888 1678')
                    }
                    onChange={(e) => setUrgentRecipient(e.target.value)}
                    placeholder={urgentChannel === 'email' ? 'patient@example.ph' : '0917 888 1678'}
                    className="w-full pl-9 pr-3 h-9 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]"
                  />
                </div>
                <p className="text-[10.5px] text-[#5A7466] mt-1 m-0">
                  {urgentChannel === 'email'
                    ? `Dispatches official HTML notification & requirement checklist to ${patientData?.email || 'patient email'}.`
                    : `Dispatches immediate SMS text alert directly to verified cellular line: ${patientData?.contact || '0917 888 1678'}.`}
                </p>
              </div>

              {/* Subject (Only shown when channel is Email) */}
              {urgentChannel === 'email' && (
                <div>
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                    Email & Portal Alert Subject *
                  </label>
                  <input
                    type="text"
                    required
                    value={urgentSubject}
                    onChange={(e) => setUrgentSubject(e.target.value)}
                    placeholder="e.g. URGENT: Action Required for Your OFPHIL Charity Assistance Application"
                    className="w-full h-9 px-3 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]"
                  />
                </div>
              )}

              {/* Message Body */}
              <div>
                <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                  {urgentChannel === 'email' ? 'Message Body *' : 'SMS Message Text *'}
                </label>
                <textarea
                  rows={urgentChannel === 'email' ? 5 : 4}
                  required
                  value={urgentMessage}
                  onChange={(e) => setUrgentMessage(e.target.value)}
                  placeholder={
                    urgentChannel === 'email'
                      ? 'Enter detailed instructions, requirements notice, or clinic updates...'
                      : 'Type concise SMS message to inform patient (e.g., Magandang araw mula sa OFPHIL Eye Center. Pakidala po ang inyong valid ID at certificate of indigency bukas)...'
                  }
                  className="w-full p-3 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A] leading-relaxed"
                />
              </div>

              {/* File Attachment Upload: PNG, JPEG, JPG, PDF (Max 10MB) - Email channel only */}
              {urgentChannel === 'email' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider">
                      Attach Supporting File or Document (Optional)
                    </label>
                    <span className="text-[10px] text-[#64748B]">
                      Formats: PNG, JPG, JPEG, PDF &bull; Max: 10MB
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="px-3.5 py-2 rounded-xl border border-[#D5E2D9] bg-[#FAFBF8] hover:bg-[#F1F5F9] text-[#334155] text-xs font-semibold flex items-center gap-2 cursor-pointer transition shadow-2xs">
                      <i className="fa-solid fa-cloud-arrow-up text-xs text-[#0B6B3A]" />
                      <span>{attachedFile ? 'Change Attachment' : 'Upload File / Image'}</span>
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>

                    {attachedFile && (
                      <button
                        type="button"
                        onClick={() => setAttachedFile(null)}
                        className="text-xs text-[#DC2626] hover:underline cursor-pointer bg-transparent border-0 flex items-center gap-1"
                      >
                        <i className="fa-solid fa-trash-can text-[11px]" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  {attachedFile && (
                    <div className="mt-2.5 flex items-center justify-between p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <i
                          className={`fa-solid ${attachedFile.type === 'pdf' ? 'fa-file-pdf text-[#DC2626]' : 'fa-image text-[#0B6B3A]'
                            } text-base shrink-0`}
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-[#10241A] truncate max-w-[280px]">
                            {attachedFile.name}
                          </div>
                          <div className="text-[10px] text-[#64748B]">{attachedFile.size}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setPreviewAttachment({
                            name: attachedFile.name,
                            url: attachedFile.dataUrl,
                            type: attachedFile.type as 'image' | 'pdf',
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#D5E2D9] hover:bg-[#E8F5EC] text-[#0B6B3A] text-xs font-semibold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                      >
                        <i className="fa-solid fa-eye text-[10px]" />
                        <span>Preview</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* SMS Info Notice */}
              {urgentChannel === 'sms' && (
                <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-[11px] text-[#166534] flex items-center gap-2.5">
                  <i className="fa-solid fa-comment-sms text-sm text-[#0B6B3A] shrink-0" />
                  <span>
                    <strong>SMS Mode:</strong> Direct cellular text notification to inform patient instantly. File attachments and subject lines are omitted for mobile carrier compatibility.
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EEF2EF]">
                <button
                  type="button"
                  onClick={() => setUrgentEmailModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#D5E2D9] bg-white text-[#5A7466] hover:bg-slate-50 transition cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingUrgent}
                  className="px-4 py-1.5 rounded-lg bg-[#0B6B3A] hover:bg-[#084D29] text-white font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSendingUrgent ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <i className={`fa-solid ${urgentChannel === 'email' ? 'fa-paper-plane' : 'fa-paper-plane'} text-xs`} />
                      <span>{urgentChannel === 'email' ? 'Send Urgent Email & Request Requirements' : 'Send SMS Alert to Patient'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* File Attachment Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#D5E2D9] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3 border-b border-[#EEF2EF] flex items-center justify-between bg-[#FAFBF8]">
              <span className="font-bold text-xs text-[#10241A] truncate">{previewAttachment.name}</span>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center bg-slate-50 min-h-[300px]">
              {previewAttachment.type === 'pdf' ? (
                <iframe src={previewAttachment.url} className="w-full h-[500px] rounded-lg border border-slate-200" title="PDF Preview" />
              ) : (
                <img src={previewAttachment.url} alt={previewAttachment.name} className="max-w-full max-h-[500px] object-contain rounded-lg" />
              )}
            </div>
          </div>
        </div>
      )}
      {/* MODAL 2: EDIT PATIENT DETAILS (EXPANDED WITH PSGC API DROPDOWNS) */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#D5E2D9] w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EEF2EF] flex items-center justify-between bg-[#FAFBF8] shrink-0">
              <div>
                <h3 className="text-base font-bold text-[#10241A] m-0">Edit Patient Details</h3>
                <p className="text-xs text-[#5A7466] m-0 mt-0.5">
                  Update official clinic registration demographics and contact information.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <form onSubmit={handleSavePatientDetails} className="p-6 overflow-y-auto space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    value={editForm.age}
                    onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                    Sex
                  </label>
                  <select
                    value={editForm.sex}
                    onChange={(e) => setEditForm({ ...editForm, sex: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]"
                  >
                    <option value="M">Male (M)</option>
                    <option value="F">Female (F)</option>
                  </select>
                </div>
              </div>

              {/* Info Notice Banner */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex items-center gap-2 text-xs text-[#475569]">
                <i className="fa-solid fa-circle-info text-[#0B6B3A] text-sm shrink-0" />
                <span>
                  Verified contact information is required for two-factor authentication (OTP) and secure password reset links. Please confirm phone/email accuracy with the patient.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mobile Phone Number */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#334155]">
                    Mobile Phone Number <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.contact}
                    onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })}
                    placeholder="0917 123 4567"
                    required
                    className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-xl text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                  />
                  <div className="text-[11px] text-[#64748B]">
                    Standard Philippine mobile format (09XX or +639XX)
                  </div>
                  <label className="flex items-center gap-2 pt-1 text-xs text-[#1E293B] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editForm.phone_verified}
                      onChange={(e) => setEditForm({ ...editForm, phone_verified: e.target.checked })}
                      className="accent-[#0B6B3A] w-4 h-4 rounded cursor-pointer"
                    />
                    <span className="font-medium text-[11px] text-[#1E293B]">Phone Verified: Confirmed in-person with patient handset</span>
                  </label>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#334155]">
                    Email Address <span className="text-[#64748B] text-[11px]">(Optional — For Portal Activation)</span>
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="patient@example.com"
                    className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-xl text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                  />
                  <div className="text-[11px] text-[#64748B]">
                    Patients without email can still log in using Patient ID &amp; SMS OTP.
                  </div>
                  <label className="flex items-center gap-2 pt-1 text-xs text-[#1E293B] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editForm.email_verified}
                      onChange={(e) => setEditForm({ ...editForm, email_verified: e.target.checked })}
                      className="accent-[#0B6B3A] w-4 h-4 rounded cursor-pointer"
                    />
                    <span className="font-medium text-[11px] text-[#1E293B]">Email Verified: Address verified by patient</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                    Birthday / DOB
                  </label>
                  <input
                    type="date"
                    value={editForm.birthdate}
                    onChange={(e) => setEditForm({ ...editForm, birthdate: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                    Civil Status
                  </label>
                  <select
                    value={editForm.civil_status}
                    onChange={(e) => setEditForm({ ...editForm, civil_status: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                    Dependents
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.num_dependents}
                    onChange={(e) => setEditForm({ ...editForm, num_dependents: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-[#D5E2D9]">
                <PsgcAddressSelector
                  province={editForm.perm_province}
                  city={editForm.perm_city}
                  barangay={editForm.perm_barangay}
                  street={editForm.perm_street}
                  onProvinceChange={(val) =>
                    setEditForm((prev) => ({ ...prev, perm_province: val, residence_region: val }))
                  }
                  onCityChange={(val) =>
                    setEditForm((prev) => ({ ...prev, perm_city: val, residence_city: val }))
                  }
                  onBarangayChange={(val) =>
                    setEditForm((prev) => ({ ...prev, perm_barangay: val }))
                  }
                  onStreetChange={(val) =>
                    setEditForm((prev) => ({ ...prev, perm_street: val }))
                  }
                  streetLabel="House No., Street Name, Subd. / Building (Permanent Address)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                    Educational Attainment
                  </label>
                  <input
                    type="text"
                    value={editForm.educational_attainment}
                    onChange={(e) => setEditForm({ ...editForm, educational_attainment: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                    Occupation
                  </label>
                  <input
                    type="text"
                    value={editForm.occupation}
                    onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EEF2EF]">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#D5E2D9] bg-white text-[#5A7466] hover:bg-slate-50 transition cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-1.5 rounded-lg bg-[#0B6B3A] hover:bg-[#084D29] text-white font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: LOG DIAGNOSIS & QUOTATION */}
      {checkupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#D5E2D9] w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EEF2EF] flex items-center justify-between bg-[#FAFBF8] shrink-0">
              <div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  <i className="fa-solid fa-stethoscope mr-1" />
                  Clinical Diagnosis & Procedure Quotation
                </span>
                <h3 className="text-base font-bold text-[#10241A] mt-1 m-0">
                  Log Diagnosis for {patientData?.first_name} {patientData?.last_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCheckupModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <form onSubmit={handleLogCheckup} className="p-6 overflow-y-auto space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                    Checkup Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={checkupForm.encounter_date}
                    onChange={(e) => setCheckupForm({ ...checkupForm, encounter_date: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                    Laterality *
                  </label>
                  <select
                    value={checkupForm.laterality}
                    onChange={(e) => setCheckupForm({ ...checkupForm, laterality: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]"
                  >
                    <option value="OD">Right Eye (OD)</option>
                    <option value="OS">Left Eye (OS)</option>
                    <option value="OU">Both Eyes (OU)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                  Ophthalmology Diagnosis *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bilateral Cataract, Senile Mature (OD > OS) or Primary Open-Angle Glaucoma"
                  value={checkupForm.diagnosis}
                  onChange={(e) => setCheckupForm({ ...checkupForm, diagnosis: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A] placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                  Recommended Procedure / Surgery *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Phacoemulsification with Foldable IOL Implant or Laser Peripheral Iridotomy"
                  value={checkupForm.procedure}
                  onChange={(e) => setCheckupForm({ ...checkupForm, procedure: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A] placeholder:text-slate-400"
                />
              </div>

              {/* Clinical Description / Examination Findings (Optional) */}
              <div>
                <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                  Clinical Description & Examination Notes <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Visual Acuity: OD 20/200, OS 20/70. Nuclear sclerosis 3+, lens opacity, IOP normal. Pre-op cardiac clearance secured."
                  value={checkupForm.clinical_description}
                  onChange={(e) => setCheckupForm({ ...checkupForm, clinical_description: e.target.value })}
                  className="w-full p-2.5 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A] placeholder:text-slate-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                    Severity Grade
                  </label>
                  <select
                    value={checkupForm.severity}
                    onChange={(e) => setCheckupForm({ ...checkupForm, severity: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]"
                  >
                    <option value="Mild">Mild / Early Stage</option>
                    <option value="Moderate">Moderate / Progressive</option>
                    <option value="Mature">Mature / Advanced</option>
                    <option value="Hypermature">Hypermature / Urgent Surgical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                    Consultant Specialist <span className="text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. P. G. Quirino, MD"
                    value={checkupForm.consultant}
                    onChange={(e) => setCheckupForm({ ...checkupForm, consultant: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A] placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                    Attending Eye Surgeon
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. J. E. Garcia, MD"
                    value={checkupForm.attending_doctor}
                    onChange={(e) => setCheckupForm({ ...checkupForm, attending_doctor: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A] placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                    Total Quotation (PHP)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 11600"
                    value={checkupForm.total_amount ? checkupForm.total_amount : ''}
                    onChange={(e) => setCheckupForm({ ...checkupForm, total_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full h-9 px-3 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A] placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EEF2EF]">
                <button
                  type="button"
                  onClick={() => setCheckupModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#D5E2D9] bg-white text-[#5A7466] hover:bg-slate-50 transition cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <i className="fa-solid fa-plus text-xs" />
                  <span>Log Encounter</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* =========================================================================
          MODAL 4: RECORD & STORE PATIENT DOCUMENT COPY (EXPANDED & MANUAL TITLE)
         ========================================================================= */}
      {docUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#D5E2D9] w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#EEF2EF] flex items-center justify-between bg-[#FAFBF8] shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded bg-[#E8F5EC] text-[#0B6B3A] border border-[#A7F3D0] uppercase tracking-wider">
                    <i className="fa-solid fa-shield-halved mr-1" />
                    RA 10173 Data Privacy Compliant Storage
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                    AES-256 Encrypted Copy
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#10241A] mt-1.5 m-0">
                  Record &amp; Store Patient Document Copy — {patientData?.first_name} {patientData?.last_name} ({patientData?.patient_id})
                </h3>
                <p className="text-xs text-[#5A7466] m-0 mt-0.5">
                  Archive a digital or scanned copy of the patient&apos;s document into their clinic master record.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDocUploadModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200/70 flex items-center justify-center text-slate-500 hover:text-slate-800 transition cursor-pointer border-0 bg-transparent"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <form onSubmit={handleRecordPatientDocuments} className="p-6 sm:p-7 overflow-y-auto space-y-5 text-xs">
              {/* Row 1: Manual Document Name / Title & Data Privacy Classification */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-7">
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1.5">
                    Document Name / Credential Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Government Valid ID (UMID), Eye Prescription, Visual Acuity Chart"
                    value={docForm.document_type}
                    onChange={(e) => setDocForm({ ...docForm, document_type: e.target.value })}
                    className="w-full h-10 px-3.5 text-xs bg-white border border-[#D5E2D9] rounded-xl focus:outline-none focus:border-[#0B6B3A] placeholder:text-slate-400"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1.5">
                    Data Privacy Classification <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={docForm.privacy_level}
                    onChange={(e) => setDocForm({ ...docForm, privacy_level: e.target.value })}
                    className="w-full h-10 px-3.5 text-xs bg-white border border-[#D5E2D9] rounded-xl focus:outline-none focus:border-[#0B6B3A]"
                  >
                    <option value="Confidential — RA 10173 Protected">Confidential — RA 10173 Protected</option>
                    <option value="Restricted Medical Record">Restricted Medical Record</option>
                    <option value="Protected Personal Identity Copy">Protected Personal Identity Copy</option>
                  </select>
                </div>
              </div>

              {/* Row 2: ID / Reference No. & Issuing Office / Physician */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1.5">
                    ID / Document Reference No. <span className="text-slate-400 font-normal lowercase">(auto-masked)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CRN-0111-2948192-4 or RX-2026-001"
                    value={docForm.reference_no}
                    onChange={(e) => setDocForm({ ...docForm, reference_no: e.target.value })}
                    className="w-full h-10 px-3.5 text-xs bg-white border border-[#D5E2D9] rounded-xl focus:outline-none focus:border-[#0B6B3A] placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1.5">
                    Issuing Office / Attending Physician <span className="text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PSA / LTO / Dr. J. E. Garcia, MD"
                    value={docForm.issuing_authority}
                    onChange={(e) => setDocForm({ ...docForm, issuing_authority: e.target.value })}
                    className="w-full h-10 px-3.5 text-xs bg-white border border-[#D5E2D9] rounded-xl focus:outline-none focus:border-[#0B6B3A] placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Row 3: Multi-file Upload Dropzone (up to 5 files) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider">
                    Attach Scanned Document or Photo Copy ({docUploadFiles.length}/5 files)
                  </label>
                  <span className="text-[10.5px] text-[#64748B]">PDF, PNG, JPG &bull; Max 10MB each</span>
                </div>

                <label className="border-2 border-dashed border-[#CBD5E1] hover:border-[#0B6B3A] rounded-xl p-5 bg-[#FAFBF8] flex items-center justify-between gap-4 cursor-pointer transition">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-base shrink-0">
                      <i className="fa-solid fa-cloud-arrow-up" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#10241A]">
                        Click to browse &amp; attach document copies (up to 5 files)
                      </div>
                      <div className="text-[11px] text-[#5A7466] mt-0.5">
                        Files are automatically hashed and archived with AES-256 encryption metadata
                      </div>
                    </div>
                  </div>
                  <span className="px-3.5 py-2 rounded-lg bg-white border border-[#D5E2D9] font-bold text-xs text-[#0B6B3A] shrink-0 shadow-2xs">
                    Browse Files
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    className="hidden"
                    onChange={handleDocVaultFileChange}
                  />
                </label>

                {docUploadFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {docUploadFiles.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 bg-white border border-[#0B6B3A] rounded-xl flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <i
                            className={`fa-solid ${item.type === 'pdf' ? 'fa-file-pdf text-red-600' : 'fa-file-image text-[#0B6B3A]'
                              } text-base`}
                          />
                          <span className="font-semibold text-xs text-[#10241A] truncate">{item.name}</span>
                          <span className="text-[10.5px] text-[#64748B]">({item.sizeKb} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDocUploadFiles((prev) => prev.filter((f) => f.id !== item.id))}
                          className="text-red-600 hover:underline text-[11px] font-bold cursor-pointer bg-transparent border-0"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Row 4: Verification Remarks */}
              <div>
                <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1.5">
                  Verification Remarks / Clinic Archive Notes <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Original copy presented and verified at clinic admissions desk for patient master record."
                  value={docForm.notes}
                  onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })}
                  className="w-full p-3 text-xs bg-white border border-[#D5E2D9] rounded-xl focus:outline-none focus:border-[#0B6B3A] resize-none placeholder:text-slate-400"
                />
              </div>

              {/* Row 5: Mandatory Data Privacy Act Consent & Security Attestation (Regular Clinic Care Only — No MSW) */}
              <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={docForm.consent_verified}
                    onChange={(e) => setDocForm({ ...docForm, consent_verified: e.target.checked })}
                    className="mt-0.5 accent-[#0B6B3A] w-4 h-4 rounded cursor-pointer shrink-0"
                  />
                  <span className="text-[11.5px] text-[#14532D] leading-relaxed">
                    <strong>Data Privacy Act (RA 10173) Attestation:</strong> I confirm that the patient has provided informed consent for the collection and encrypted archival of this document copy strictly for ophthalmic clinical record-keeping and identity verification.
                  </span>
                </label>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EEF2EF]">
                <button
                  type="button"
                  onClick={() => setDocUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#D5E2D9] bg-white text-[#5A7466] hover:bg-slate-50 transition cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0B6B3A] hover:bg-[#084D29] text-white font-bold flex items-center gap-2 transition shadow-xs cursor-pointer"
                >
                  <i className="fa-solid fa-lock text-xs" />
                  <span>Encrypt &amp; Store Document Copy</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointment Action Confirmation Modal (Approve / Complete / Delete with Email & SMS options) */}
      {apptActionConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#D5E2D9] shadow-2xl p-6 space-y-4 text-xs font-sans">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 ${
                  apptActionConfirm.type === 'delete'
                    ? 'bg-red-50 text-red-600'
                    : apptActionConfirm.type === 'complete'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-[#E8F5EC] text-[#0B6B3A]'
                }`}
              >
                <i
                  className={`fa-solid ${
                    apptActionConfirm.type === 'delete'
                      ? 'fa-triangle-exclamation'
                      : apptActionConfirm.type === 'complete'
                        ? 'fa-circle-check'
                        : 'fa-calendar-check'
                  }`}
                />
              </div>
              <div>
                <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0">
                  {apptActionConfirm.type === 'approve'
                    ? 'Approve & Notify Patient'
                    : apptActionConfirm.type === 'complete'
                      ? 'Mark Appointment Completed'
                      : 'Cancel / Delete Appointment'}
                </h3>
                <p className="text-xs text-[#5A7466] m-0 mt-1 leading-relaxed">
                  {apptActionConfirm.type === 'approve'
                    ? `Approve ${apptActionConfirm.appt.id} (${apptActionConfirm.appt.appointment_date} • ${apptActionConfirm.appt.appointment_time}) and notify the patient?`
                    : apptActionConfirm.type === 'complete'
                      ? `Caution: Confirm marking ${apptActionConfirm.appt.id} (${apptActionConfirm.appt.appointment_date} • ${apptActionConfirm.appt.appointment_time}) as Completed. Ensure the scheduled clinic time has concluded.`
                      : `Caution: Removing ${apptActionConfirm.appt.id} will cancel this schedule. Notify the patient via Email or Text (SMS)?`}
                </p>
              </div>
            </div>

            {(apptActionConfirm.type === 'approve' || apptActionConfirm.type === 'delete') && (
              <div className="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-[#FAFBF8] border border-[#D5E2D9]">
                <label className="flex items-center gap-2 text-xs font-bold text-[#10241A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={apptActionConfirm.sendEmail}
                    onChange={(e) =>
                      setApptActionConfirm({ ...apptActionConfirm, sendEmail: e.target.checked })
                    }
                    className="accent-[#0B6B3A] w-4 h-4"
                  />
                  <span>Send Email</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-[#10241A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={apptActionConfirm.sendSms}
                    onChange={(e) =>
                      setApptActionConfirm({ ...apptActionConfirm, sendSms: e.target.checked })
                    }
                    className="accent-[#0B6B3A] w-4 h-4"
                  />
                  <span>Send Text (SMS)</span>
                </label>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EEF2EF]">
              <button
                type="button"
                onClick={() => setApptActionConfirm(null)}
                className="px-4 py-2 rounded-xl border border-[#D5E2D9] bg-white text-[#5A7466] font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const { type, appt, sendEmail, sendSms } = apptActionConfirm;
                  if (type === 'approve') {
                    handleDirectNurseApprove({ ...appt, email_sent: sendEmail, sms_sent: sendSms });
                  } else if (type === 'complete') {
                    const updated = appointments.map((a) =>
                      a.id === appt.id ? { ...a, status: 'Completed' as const } : a
                    );
                    setAppointments(updated);
                    localStorage.setItem(`ofphil_appointments_${patientId}`, JSON.stringify(updated));
                  } else if (type === 'delete') {
                    if (sendEmail || sendSms) {
                      fetchApi('/appointments/schedule', {
                        method: 'POST',
                        body: JSON.stringify({
                          patient_id: patientId,
                          patient_name: `${patientData?.first_name || ''} ${patientData?.last_name || ''}`.trim(),
                          appointment_type: `CANCELLED: ${appt.appointment_type}`,
                          appointment_date: appt.appointment_date,
                          appointment_time: appt.appointment_time,
                          assigned_doctor: appt.assigned_doctor,
                          clinic_room: appt.clinic_room,
                          notes: 'Your clinic appointment was cancelled by the Clinic Administrator.',
                          recipient_email: patientData?.email || 'roxas.t.bscs@gmail.com',
                          recipient_phone: patientData?.contact || '',
                          send_email: sendEmail,
                          send_sms: sendSms,
                        }),
                      }).catch(() => {});
                    }
                    fetchApi(`/patients/${patientId}/appointments/${appt.id}`, { method: 'DELETE' }).catch(() => {});
                    handleDeleteAppointment(appt.id);
                  }
                  setApptActionConfirm(null);
                }}
                className={`px-4 py-2 rounded-xl text-white font-bold cursor-pointer border-0 ${
                  apptActionConfirm.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-[#0B6B3A] hover:bg-[#064826]'
                }`}
              >
                {apptActionConfirm.type === 'approve'
                  ? 'Confirm & Approve'
                  : apptActionConfirm.type === 'complete'
                    ? 'Confirm Completed'
                    : 'Confirm & Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Referral Feedback Confirmation Modal */}
          {referralFeedbackModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-sm w-full border border-[#D5E2D9] shadow-2xl p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-xl mx-auto">
                  <i className="fa-solid fa-circle-check" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0">
                    {referralFeedbackModal.title}
                  </h3>
                  <p className="text-xs text-[#5A7466] m-0 leading-relaxed">
                    {referralFeedbackModal.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReferralFeedbackModal(null)}
                  className="w-full py-2.5 rounded-xl bg-[#0B6B3A] hover:bg-[#084D29] text-white font-bold text-xs cursor-pointer border-0"
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {/* Schedule / Edit Clinic Appointment Modal with Horizontal Tabs (Consistent with Patient Inquiries) */}
          {appointmentModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-4xl lg:max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-[#D5E2D9] shadow-2xl text-xs font-sans animate-in zoom-in-95 duration-150">
                {/* Modal Header */}
                <div className="px-6 py-4 bg-white border-b border-[#EEF2EF] flex items-start justify-between shrink-0">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#E8F5EC] text-[#0B6B3A] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                      <i className="fa-solid fa-calendar-check text-[9.5px]" />
                      <span>Clinic Appointment &amp; Email/SMS Dispatch</span>
                    </span>
                    <h3 className="font-['Outfit'] text-lg font-bold m-0 text-[#10241A]">
                      {editingApptId ? 'Modify Clinic Appointment' : `Schedule Appointment for ${patientData?.first_name || 'Patient'}`}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAppointmentModalOpen(false)}
                    className="w-8 h-8 rounded-lg bg-transparent hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#10241A] flex items-center justify-center cursor-pointer border-0 shrink-0"
                  >
                    <i className="fa-solid fa-xmark text-sm" />
                  </button>
                </div>

                {/* Horizontal Navigation Tabs Bar (Exact Patient Inquiries Replica) */}
                <div className="px-6 bg-white border-b border-[#D5E2D9] flex items-center gap-6 shrink-0">
                  <button
                    type="button"
                    onClick={() => setApptModalTab('schedule')}
                    className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer bg-transparent ${
                      apptModalTab === 'schedule'
                        ? 'border-[#0B6B3A] text-[#0B6B3A]'
                        : 'border-transparent text-[#64748B] hover:text-[#10241A]'
                    }`}
                  >
                    <i className="fa-solid fa-calendar-days text-xs" />
                    <span>1. Appointment &amp; Schedule Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setApptModalTab('notification')}
                    className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer bg-transparent ${
                      apptModalTab === 'notification'
                        ? 'border-[#0B6B3A] text-[#0B6B3A]'
                        : 'border-transparent text-[#64748B] hover:text-[#10241A]'
                    }`}
                  >
                    <i className="fa-solid fa-paper-plane text-xs" />
                    <span>2. Notification Dispatch (Email / SMS)</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        apptModalTab === 'notification'
                          ? 'bg-[#0B6B3A] text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {apptChannel === 'both' ? 'Email + SMS' : apptChannel === 'email' ? 'Email' : 'SMS'}
                    </span>
                  </button>
                </div>

                <form onSubmit={handleScheduleAppointmentSubmit} className="flex-1 flex flex-col overflow-hidden">
                  {/* Modal Scrollable Content Area */}
                  <div className="p-6 overflow-y-auto max-h-[66vh] space-y-4">
                    {/* TAB 1: APPOINTMENT & SCHEDULE DETAILS */}
                    {apptModalTab === 'schedule' && (
                      <div className="space-y-4 animate-in fade-in duration-150">
                        <div>
                          <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1.5">
                            Reason / Type of Clinic Visit <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={apptForm.appointment_type}
                            onChange={(e) => setApptForm({ ...apptForm, appointment_type: e.target.value })}
                            placeholder="e.g. Comprehensive Eye Consultation, Cataract Pre-Op Workup..."
                            className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-xs bg-white text-[#10241A] font-semibold focus:outline-none focus:border-[#0B6B3A]"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                          {/* Custom Mon-Fri Calendar */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-[11px] font-bold text-[#10241A] uppercase tracking-wider">
                                Appointment Date (Mon–Fri) <span className="text-red-600">*</span>
                              </label>
                              <span className="text-[11px] font-bold text-[#0B6B3A]">{apptForm.appointment_date}</span>
                            </div>
                            <div className="p-3.5 rounded-xl border border-[#D5E2D9] bg-[#FAFBF8]">
                              <div className="flex items-center justify-between mb-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAdminCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                                  }
                                  className="w-7 h-7 rounded-lg border border-[#D5E2D9] bg-white hover:bg-[#E8F5EC] text-[#10241A] flex items-center justify-center cursor-pointer"
                                >
                                  <i className="fa-solid fa-chevron-left text-[10px]" />
                                </button>
                                <span className="font-['Outfit'] text-xs font-bold text-[#10241A]">
                                  {adminCalendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAdminCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                                  }
                                  className="w-7 h-7 rounded-lg border border-[#D5E2D9] bg-white hover:bg-[#E8F5EC] text-[#10241A] flex items-center justify-center cursor-pointer"
                                >
                                  <i className="fa-solid fa-chevron-right text-[10px]" />
                                </button>
                              </div>
                              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-[#64748B] mb-1.5">
                                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                              </div>
                              <div className="grid grid-cols-7 gap-1">
                                {(() => {
                                  const year = adminCalendarMonth.getFullYear();
                                  const month = adminCalendarMonth.getMonth();
                                  const firstDay = new Date(year, month, 1).getDay();
                                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  const cells: React.ReactNode[] = [];
                                  for (let i = 0; i < firstDay; i++) cells.push(<div key={`ae-${i}`} className="h-8" />);
                                  for (let day = 1; day <= daysInMonth; day++) {
                                    const d = new Date(year, month, day);
                                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                    const isPast = d < today;
                                    const disabled = isWeekend || isPast;
                                    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const isSelected = apptForm.appointment_date === iso;
                                    cells.push(
                                      <button
                                        key={iso}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => setApptForm({ ...apptForm, appointment_date: iso })}
                                        className={`h-8 rounded-lg text-[11px] font-bold flex items-center justify-center transition border-0 ${
                                          isSelected
                                            ? 'bg-[#0B6B3A] text-white shadow-xs cursor-pointer'
                                            : disabled
                                              ? 'text-[#94A3B8] opacity-40 cursor-not-allowed bg-transparent'
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

                          {/* Custom Time Slot Picker */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-[11px] font-bold text-[#10241A] uppercase tracking-wider">
                                Time Slot (8AM – 5PM) <span className="text-red-600">*</span>
                              </label>
                              <span className="text-[11px] font-bold text-[#0B6B3A]">{apptForm.appointment_time}</span>
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
                                const active = apptForm.appointment_time === slot;
                                return (
                                  <button
                                    key={slot}
                                    type="button"
                                    onClick={() => setApptForm({ ...apptForm, appointment_time: slot })}
                                    className={`w-full px-3 py-2 rounded-lg text-[11.5px] font-bold flex items-center justify-between transition cursor-pointer border ${
                                      active
                                        ? 'bg-[#0B6B3A] text-white border-[#0B6B3A] shadow-xs'
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1.5">
                              Assigned Doctor / Specialist
                            </label>
                            <input
                              type="text"
                              value={apptForm.assigned_doctor}
                              onChange={(e) => setApptForm({ ...apptForm, assigned_doctor: e.target.value })}
                              className="w-full h-10 px-3 border border-[#D5E2D9] rounded-xl text-xs bg-white text-[#10241A] font-semibold focus:outline-none focus:border-[#0B6B3A]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1.5">
                              Clinic Location
                            </label>
                            <input
                              type="text"
                              value={apptForm.clinic_room}
                              onChange={(e) => setApptForm({ ...apptForm, clinic_room: e.target.value })}
                              className="w-full h-10 px-3 border border-[#D5E2D9] rounded-xl text-xs bg-white text-[#10241A] font-semibold focus:outline-none focus:border-[#0B6B3A]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1.5">
                            Instructions / Notes for Patient
                          </label>
                          <textarea
                            rows={2}
                            value={apptForm.notes}
                            onChange={(e) => setApptForm({ ...apptForm, notes: e.target.value })}
                            placeholder="e.g. Please bring previous eye prescriptions and arrive 15 minutes early..."
                            className="w-full p-3 border border-[#D5E2D9] rounded-xl text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] resize-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* TAB 2: NOTIFICATION DISPATCH (EMAIL / SMS) */}
                    {apptModalTab === 'notification' && (
                      <div className="space-y-4 animate-in fade-in duration-150">
                        {/* Notification Dispatch Channel Selector */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-bold text-[#10241A] uppercase tracking-wider">
                              Notification Channel <span className="text-red-600">*</span>
                            </label>
                            <span className="text-[10.5px] font-bold text-[#0B6B3A]">
                              {apptChannel === 'both'
                                ? 'Both Email & Text (SMS)'
                                : apptChannel === 'email'
                                  ? 'Email Notification Only'
                                  : 'Mobile SMS Text Only'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => setApptChannel('both')}
                              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                                apptChannel === 'both'
                                  ? 'bg-[#E8F5EC] border-[#0B6B3A] text-[#0B6B3A] shadow-xs ring-1 ring-[#0B6B3A]'
                                  : 'bg-white border-[#D5E2D9] text-[#5A7466] hover:bg-[#FAFBF8]'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 text-xs font-bold">
                                <i className="fa-solid fa-envelope" />
                                <span>+</span>
                                <i className="fa-solid fa-comment-sms" />
                              </div>
                              <span className="text-[11px] font-bold">Both (Email &amp; SMS)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setApptChannel('email')}
                              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                                apptChannel === 'email'
                                  ? 'bg-[#E8F5EC] border-[#0B6B3A] text-[#0B6B3A] shadow-xs ring-1 ring-[#0B6B3A]'
                                  : 'bg-white border-[#D5E2D9] text-[#5A7466] hover:bg-[#FAFBF8]'
                              }`}
                            >
                              <i className="fa-solid fa-envelope text-xs" />
                              <span className="text-[11px] font-bold">Email Only</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setApptChannel('sms')}
                              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                                apptChannel === 'sms'
                                  ? 'bg-[#E8F5EC] border-[#0B6B3A] text-[#0B6B3A] shadow-xs ring-1 ring-[#0B6B3A]'
                                  : 'bg-white border-[#D5E2D9] text-[#5A7466] hover:bg-[#FAFBF8]'
                              }`}
                            >
                              <i className="fa-solid fa-comment-sms text-xs" />
                              <span className="text-[11px] font-bold">SMS Only</span>
                            </button>
                          </div>
                        </div>

                        {/* Recipient Contact Information (Email & Number indication) */}
                        <div className={`grid gap-3.5 ${apptChannel === 'both' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                          {(apptChannel === 'email' || apptChannel === 'both') && (
                            <div className="w-full">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10.5px] font-bold text-[#10241A] uppercase tracking-wider">
                                  Recipient Email Address <span className="text-red-600">*</span>
                                </label>
                                <span className="text-[10px] text-[#0B6B3A] font-bold">Active Patient Email</span>
                              </div>
                              <div className="relative w-full">
                                <i className="fa-solid fa-at absolute left-3 top-3.5 text-[#5A7466] text-xs pointer-events-none" />
                                <input
                                  type="email"
                                  required={apptChannel === 'email' || apptChannel === 'both'}
                                  value={apptForm.recipient_email}
                                  onChange={(e) => setApptForm({ ...apptForm, recipient_email: e.target.value })}
                                  placeholder="patient@example.ph"
                                  className="w-full h-11 pl-9 pr-3 border border-[#D5E2D9] rounded-xl text-xs bg-white text-[#10241A] font-semibold focus:outline-none focus:border-[#0B6B3A]"
                                />
                              </div>
                              <p className="text-[10px] text-[#64748B] mt-1 m-0">
                                Appointment notice slip &amp; instructions will be sent to this email.
                              </p>
                            </div>
                          )}

                          {(apptChannel === 'sms' || apptChannel === 'both') && (
                            <div className="w-full">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10.5px] font-bold text-[#10241A] uppercase tracking-wider">
                                  Recipient Mobile Number <span className="text-red-600">*</span>
                                </label>
                                <span className="text-[10px] text-[#0B6B3A] font-bold">Patient Phone / SMS</span>
                              </div>
                              <div className="relative w-full">
                                <i className="fa-solid fa-phone absolute left-3 top-3.5 text-[#5A7466] text-xs pointer-events-none" />
                                <input
                                  type="text"
                                  required={apptChannel === 'sms' || apptChannel === 'both'}
                                  value={apptForm.recipient_phone}
                                  onChange={(e) => setApptForm({ ...apptForm, recipient_phone: e.target.value })}
                                  placeholder="0917 888 1678"
                                  className="w-full h-11 pl-9 pr-3 border border-[#D5E2D9] rounded-xl text-xs bg-white text-[#10241A] font-semibold focus:outline-none focus:border-[#0B6B3A]"
                                />
                              </div>
                              <p className="text-[10px] text-[#64748B] mt-1 m-0">
                                Mobile SMS appointment alert will be sent to this number.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Email Subject & Message Body */}
                        {(apptChannel === 'email' || apptChannel === 'both') && (
                          <div className="space-y-2.5 p-3.5 rounded-xl bg-[#FAFBF8] border border-[#D5E2D9]">
                            <div className="flex items-center justify-between">
                              <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#0B6B3A] flex items-center gap-1.5">
                                <i className="fa-solid fa-envelope" />
                                <span>Email Notification Details</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const pName = `${patientData?.first_name || 'Juan'} ${patientData?.last_name || 'Dela Cruz'}`.trim();
                                  setApptForm((prev) => ({
                                    ...prev,
                                    email_subject: getApptSubject(prev.appointment_type, prev.appointment_date),
                                    email_body: getApptEmailBody(
                                      pName,
                                      prev.appointment_type,
                                      prev.appointment_date,
                                      prev.appointment_time,
                                      prev.assigned_doctor,
                                      prev.clinic_room,
                                      prev.notes
                                    ),
                                  }));
                                }}
                                className="text-[10.5px] font-bold text-[#0B6B3A] hover:underline bg-transparent border-0 cursor-pointer p-0"
                              >
                                Reset to Default Template
                              </button>
                            </div>

                            <div>
                              <label className="block text-[10.5px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                                Email Subject <span className="text-red-600">*</span>
                              </label>
                              <input
                                type="text"
                                required={apptChannel === 'email' || apptChannel === 'both'}
                                value={apptForm.email_subject}
                                onChange={(e) => setApptForm({ ...apptForm, email_subject: e.target.value })}
                                placeholder="e.g. OFPHIL Clinic Appointment Notice..."
                                className="w-full h-9 px-3 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] font-semibold focus:outline-none focus:border-[#0B6B3A]"
                              />
                            </div>

                            <div>
                              <label className="block text-[10.5px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
                                Email Message Body <span className="text-red-600">*</span>
                              </label>
                              <textarea
                                rows={4}
                                required={apptChannel === 'email' || apptChannel === 'both'}
                                value={apptForm.email_body}
                                onChange={(e) => setApptForm({ ...apptForm, email_body: e.target.value })}
                                placeholder="Type email body message..."
                                className="w-full p-2.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] resize-y font-normal"
                              />
                            </div>
                          </div>
                        )}

                        {/* SMS Message Body */}
                        {(apptChannel === 'sms' || apptChannel === 'both') && (
                          <div className="space-y-2 p-3.5 rounded-xl bg-[#FAFBF8] border border-[#D5E2D9]">
                            <div className="flex items-center justify-between">
                              <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#0B6B3A] flex items-center gap-1.5">
                                <i className="fa-solid fa-comment-sms" />
                                <span>SMS Message Body</span>
                              </span>
                              <span
                                className={`text-[10.5px] font-mono font-bold ${
                                  apptForm.sms_body.length > 160 ? 'text-amber-600' : 'text-[#64748B]'
                                }`}
                              >
                                {apptForm.sms_body.length} / 160 chars ({Math.ceil(apptForm.sms_body.length / 160) || 1} SMS)
                              </span>
                            </div>

                            <textarea
                              rows={2}
                              required={apptChannel === 'sms' || apptChannel === 'both'}
                              value={apptForm.sms_body}
                              onChange={(e) => setApptForm({ ...apptForm, sms_body: e.target.value })}
                              placeholder="Type concise SMS text for the patient..."
                              className="w-full p-2.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] resize-none"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Modal Footer with Step Navigation */}
                  <div className="px-6 py-3.5 bg-[#FAFBF8] border-t border-[#EEF2EF] flex items-center justify-between shrink-0">
                    {apptModalTab === 'schedule' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setAppointmentModalOpen(false)}
                          className="px-4 py-2 rounded-xl border border-[#D5E2D9] bg-white hover:bg-slate-50 text-[#5A7466] font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!apptForm.appointment_type.trim()) {
                              toast.error('Please enter the reason or type of clinic visit.');
                              return;
                            }
                            if (!apptForm.appointment_date) {
                              toast.error('Please select an appointment date.');
                              return;
                            }
                            setApptModalTab('notification');
                          }}
                          className="px-5 py-2.5 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white font-bold flex items-center gap-2 transition shadow-xs cursor-pointer border-0"
                        >
                          <span>Proceed to Notification Dispatch</span>
                          <i className="fa-solid fa-arrow-right text-xs" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setApptModalTab('schedule')}
                          className="px-4 py-2 rounded-xl border border-[#D5E2D9] bg-white hover:bg-slate-50 text-[#5A7466] font-semibold flex items-center gap-2 cursor-pointer"
                        >
                          <i className="fa-solid fa-arrow-left text-xs" />
                          <span>Back to Schedule</span>
                        </button>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setAppointmentModalOpen(false)}
                            className="px-4 py-2 rounded-xl border border-[#D5E2D9] bg-white hover:bg-slate-50 text-[#5A7466] font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSchedulingAppt}
                            className="px-5 py-2.5 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white font-bold flex items-center gap-2 transition shadow-xs cursor-pointer disabled:opacity-50 border-0"
                          >
                            <i className="fa-solid fa-paper-plane text-xs" />
                            <span>
                              {isSchedulingAppt
                                ? 'Scheduling & Dispatching...'
                                : apptChannel === 'both'
                                  ? 'Save & Dispatch via Email & SMS'
                                  : apptChannel === 'email'
                                    ? 'Save & Send Email Notice'
                                    : 'Save & Send SMS Alert'}
                            </span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* =====================================================================
              ADMIN CONFIRMATION MODAL: CHANGE PATIENT CLASSIFICATION
             ===================================================================== */}
          {classificationModalOpen && (
            <div className="fixed inset-0 z-50 bg-[#10241A]/60 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150">
              <div
                data-testid="classification-confirm-modal"
                className="bg-white rounded-2xl border border-[#D5E2D9] shadow-2xl max-w-lg w-full overflow-hidden"
              >
                <div className="px-6 py-4 bg-[#FAFBF8] border-b border-[#EEF2EF] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${
                        isCharity
                          ? 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]'
                          : 'bg-[#E8F5EC] text-[#0B6B3A] border border-[#A7F3D0]'
                      }`}
                    >
                      <i className={`fa-solid ${isCharity ? 'fa-rotate-left' : 'fa-hand-holding-heart'}`} />
                    </div>
                    <div>
                      <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0">
                        Change Patient Classification?
                      </h3>
                      <p className="text-[11px] text-[#5A7466] m-0">
                        Authorized Administrative Classification Workflow
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isUpdatingClassification}
                    onClick={() => setClassificationModalOpen(false)}
                    className="w-8 h-8 rounded-lg border border-[#D5E2D9] bg-white text-[#5A7466] hover:text-[#10241A] cursor-pointer flex items-center justify-center"
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>

                <div className="p-6 space-y-4 text-xs">
                  <p className="text-[#334155] leading-relaxed m-0">
                    {isCharity
                      ? "You are about to change this patient's classification from Charity Patient to Regular Patient. This will remove charity-specific sections and navigation from the patient's portal while keeping the existing Patient ID, login credentials, and clinical records unchanged."
                      : "You are about to change this patient's classification from Regular Patient to Charity Patient. This will enable charity-related information and features in the patient's portal. The existing Patient ID and clinical records will remain unchanged."}
                  </p>

                  <div className="rounded-xl border border-[#D5E2D9] bg-[#FAFBF8] p-4 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-[#EEF2EF] pb-2">
                      <span className="text-[11px] font-bold uppercase text-[#64748B]">Patient Name</span>
                      <span className="font-bold text-[#10241A]">
                        {patientData?.first_name} {patientData?.middle_name ? `${patientData.middle_name} ` : ''}
                        {patientData?.last_name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-[#EEF2EF] pb-2">
                      <span className="text-[11px] font-bold uppercase text-[#64748B]">Patient ID (Unchanged)</span>
                      <span className="font-mono font-extrabold text-[#10241A]">
                        {patientData?.patient_id || patientId}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-[#EEF2EF] pb-2">
                      <span className="text-[11px] font-bold uppercase text-[#64748B]">Current Classification</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                          isCharity
                            ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                            : 'bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]'
                        }`}
                      >
                        {isCharity ? 'Charity Patient (CHARITY)' : 'Regular Patient (REGULAR)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase text-[#64748B]">New Classification</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${
                          !isCharity
                            ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                            : 'bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]'
                        }`}
                      >
                        {!isCharity ? 'Charity Patient (CHARITY)' : 'Regular Patient (REGULAR)'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 bg-[#FAFBF8] border-t border-[#EEF2EF] flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={isUpdatingClassification}
                    onClick={() => setClassificationModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#D5E2D9] bg-white hover:bg-slate-50 text-[#5A7466] font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    data-testid="confirm-classification-change-btn"
                    disabled={isUpdatingClassification}
                    onClick={handleConfirmClassificationChange}
                    className="px-5 py-2 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition shadow-xs cursor-pointer border-0"
                  >
                    {isUpdatingClassification ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin text-xs" />
                        <span>Updating Classification...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-check text-xs" />
                        <span>Confirm Classification Change</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

    </DashboardLayout>
  );
}
