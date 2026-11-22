'use client';
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { toast } from 'sonner';

export interface InquiryAttachment {
  name: string;
  type: 'image' | 'pdf';
  url: string;
  size?: string;
}

export interface InquiryItem {
  id: string;
  name: string;
  email: string;
  contactNumber?: string;
  subject: string;
  date: string;
  status: 'New' | 'Answered' | 'Pending Review';
  message: string;
  patientAttachments?: InquiryAttachment[];
  replyHistory?: Array<{ sender: string; timestamp: string; message: string }>;
}

const INITIAL_INQUIRIES: InquiryItem[] = [];

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<InquiryItem[]>(INITIAL_INQUIRIES);

  React.useEffect(() => {
    const loadDynamicInquiries = () => {
      try {
        const publicInqs = JSON.parse(localStorage.getItem('ofphil_public_inquiries') || '[]');
        const juanInqs = JSON.parse(localStorage.getItem('ofphil_inquiries_M26-11-00001') || '[]');
        const combined = [...publicInqs, ...juanInqs];
        const seen = new Set<string>();
        const deduped: InquiryItem[] = [];
        for (const item of combined) {
          if (item && item.id && !seen.has(item.id)) {
            seen.add(item.id);
            deduped.push(item);
          }
        }
        setInquiries(deduped);
      } catch (e) {}
    };
    loadDynamicInquiries();
    window.addEventListener('storage', loadDynamicInquiries);
    window.addEventListener('ofphil-inquiries-updated', loadDynamicInquiries);
    return () => {
      window.removeEventListener('storage', loadDynamicInquiries);
      window.removeEventListener('ofphil-inquiries-updated', loadDynamicInquiries);
    };
  }, []);
  const [activeInquiry, setActiveInquiry] = useState<InquiryItem | null>(null);
  
  // Horizontal Modal Tabs: 1 = Files & Documents, 2 = Send Response / Dispatch
  const [modalTab, setModalTab] = useState<'documents' | 'compose'>('documents');
  const [isMounted, setIsMounted] = useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);
  const [adminReadIds, setAdminReadIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = JSON.parse(localStorage.getItem('ofphil_admin_read_notifs') || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  const toggleAdminRead = (nid: string) => {
    setAdminReadIds((prev) => {
      const next = prev.includes(nid) ? prev.filter((id) => id !== nid) : [...prev, nid];
      try {
        localStorage.setItem('ofphil_admin_read_notifs', JSON.stringify(next));
        setTimeout(() => window.dispatchEvent(new Event('ofphil-inquiries-updated')), 0);
      } catch {}
      return next;
    });
  };
  
  const [replyText, setReplyText] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [replyChannel, setReplyChannel] = useState<'email' | 'sms'>('email');
  const [attachedFile, setAttachedFile] = useState<{ name: string; type: string; dataUrl: string; size: string } | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<{ name: string; url: string; type: 'image' | 'pdf' } | null>(null);
  const [isSendingReply, setIsSendingReply] = useState(false);

  const handleOpenReply = (inq: InquiryItem) => {
    setActiveInquiry(inq);
    // Mark as Read in state and localStorage (side effects outside state updater)
    const updated = inquiries.map((item) => (item.id === inq.id ? { ...item, isRead: true } : item));
    setInquiries(updated);
    try {
      const pubInqs = JSON.parse(localStorage.getItem('ofphil_public_inquiries') || '[]');
      if (pubInqs.some((p: any) => p.id === inq.id)) {
        localStorage.setItem(
          'ofphil_public_inquiries',
          JSON.stringify(pubInqs.map((p: any) => (p.id === inq.id ? { ...p, isRead: true } : p)))
        );
      }
      const juanInqs = JSON.parse(localStorage.getItem('ofphil_inquiries_M26-11-00001') || '[]');
      if (juanInqs.some((j: any) => j.id === inq.id)) {
        localStorage.setItem(
          'ofphil_inquiries_M26-11-00001',
          JSON.stringify(juanInqs.map((j: any) => (j.id === inq.id ? { ...j, isRead: true } : j)))
        );
      }
      setTimeout(() => window.dispatchEvent(new Event('ofphil-inquiries-updated')), 0);
    } catch (e) {}
    setModalTab('documents');
    setReplyText('');
    setReplyTo(inq.email);
    setReplySubject(`Re: ${inq.subject}`);
    setReplyChannel('email');
    setAttachedFile(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Allowed formats: PNG, JPEG, JPG, PDF
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
      toast.error(`File size exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller file.`);
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

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInquiry || !replyText.trim()) {
      toast.error('Please enter your reply message.');
      return;
    }

    setIsSendingReply(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
      await fetch(`${apiBase}/inquiries/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiry_id: activeInquiry.id,
          recipient_email: replyTo || activeInquiry.email,
          reply_body: replyText.trim(),
          channel: replyChannel,
          subject: replySubject || `Re: ${activeInquiry.subject}`,
          patient_name: activeInquiry.name,
          attachment: attachedFile ? { name: attachedFile.name, type: attachedFile.type, size: attachedFile.size, dataUrl: attachedFile.dataUrl } : null,
        }),
      });
    } catch (err) {}

    setTimeout(() => {
      const updatedReplyHistory = [
        ...(activeInquiry.replyHistory || []),
        {
          sender: 'Clinic Administrator (admin_sys)',
          timestamp: new Date().toLocaleString(),
          message: replyText.trim(),
        },
      ];

      const updated = inquiries.map((item) =>
        item.id === activeInquiry.id
          ? { ...item, status: 'Answered' as const, isRead: true, replyHistory: updatedReplyHistory }
          : item
      );
      setInquiries(updated);
      try {
        const pubInqs = JSON.parse(localStorage.getItem('ofphil_public_inquiries') || '[]');
        if (pubInqs.some((p: any) => p.id === activeInquiry.id)) {
          localStorage.setItem(
            'ofphil_public_inquiries',
            JSON.stringify(
              pubInqs.map((p: any) =>
                p.id === activeInquiry.id
                  ? { ...p, status: 'Answered', isRead: true, replyHistory: updatedReplyHistory }
                  : p
              )
            )
          );
        }
        const juanInqs = JSON.parse(localStorage.getItem('ofphil_inquiries_M26-11-00001') || '[]');
        if (juanInqs.some((j: any) => j.id === activeInquiry.id)) {
          localStorage.setItem(
            'ofphil_inquiries_M26-11-00001',
            JSON.stringify(
              juanInqs.map((j: any) =>
                j.id === activeInquiry.id
                  ? { ...j, status: 'Answered', isRead: true, replyHistory: updatedReplyHistory }
                  : j
              )
            )
          );
        }
        setTimeout(() => window.dispatchEvent(new Event('ofphil-inquiries-updated')), 0);
      } catch (e) {}

      toast.success(`Reply successfully dispatched to ${activeInquiry.name} (${replyTo})!`);
      setIsSendingReply(false);
      setActiveInquiry(null);
    }, 400);
  };

  return (
    <DashboardLayout
      title="Notifications & Patient Inquiries"
      subtitle="Ophthalmological Foundation of the Philippines — Patient Correspondence & Public Support"
    >
      <div className="space-y-6">
        {/* Header Card */}
        <div className="bg-white p-5 rounded-2xl border border-[#D5E2D9] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-lg font-bold">
              <i className="fa-solid fa-bell" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-[#10241A] font-['Outfit'] m-0">
                  Clinic Notifications &amp; Activity Feed
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F5EC] text-[#0B6B3A] border border-[#B4CEBE]">
                  {inquiries.filter((i) => i.status === 'New').length} New / {inquiries.length} Inquiries
                </span>
              </div>
              <p className="text-xs text-[#5A7466] m-0 mt-0.5">
                Unified admin notification center for clinic appointment requests, upcoming schedules, referrals, and patient inquiries.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                const allIds: string[] = inquiries.map((i) => `inq-${i.id}`);
                if (typeof window !== 'undefined') {
                  for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith('ofphil_appointments_')) {
                      try {
                        const list = JSON.parse(localStorage.getItem(k) || '[]');
                        if (Array.isArray(list)) list.forEach((a: any) => allIds.push(`apt-${a.id}`));
                      } catch {}
                    }
                  }
                }
                setAdminReadIds(allIds);
                try {
                  localStorage.setItem('ofphil_admin_read_notifs', JSON.stringify(allIds));
                  setTimeout(() => window.dispatchEvent(new Event('ofphil-inquiries-updated')), 0);
                } catch {}
              }}
              className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#FAFBF8] text-[#0B6B3A] font-bold text-xs cursor-pointer transition"
            >
              &#10003; Mark All as Read
            </button>
            <button
              type="button"
              onClick={() => {
                setAdminReadIds([]);
                try {
                  localStorage.setItem('ofphil_admin_read_notifs', '[]');
                  setTimeout(() => window.dispatchEvent(new Event('ofphil-inquiries-updated')), 0);
                } catch {}
              }}
              className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#FAFBF8] text-[#64748B] font-bold text-xs cursor-pointer transition"
            >
              Mark All Unread
            </button>
          </div>
        </div>

        {/* Unified Admin Notification Feed (Appointments, Inquiries, Referrals, Encounters) */}
        <div className="space-y-3">
          {(() => {
            const unifiedAdminNotifs: Array<{
              id: string;
              category: string;
              badgeColor: string;
              icon: string;
              title: string;
              message: string;
              timestamp: string;
              isUnread: boolean;
              inquiryObj?: any;
              href?: string;
              actionLabel?: string;
            }> = [];

            // 1. Inquiries
            inquiries.forEach((inq: any) => {
              const isUnread = !inq.isRead && inq.status !== 'Answered' && inq.status !== 'Completed';
              unifiedAdminNotifs.push({
                id: `inq-${inq.id}`,
                category: 'Patient / Public Inquiry',
                badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
                icon: 'fa-envelope-open-text text-blue-600',
                title: `${inq.subject || 'Clinic Inquiry'} (${inq.id}) — ${inq.name || inq.sender_name || 'Sender'}`,
                message: `${inq.message || ''} (${inq.email || ''} • ${inq.phone || ''})`,
                timestamp: inq.date || inq.createdAt || 'Recent',
                isUnread,
                inquiryObj: inq,
                actionLabel: 'Reply',
              });
            });

            // 2. Appointments & Pending Requests from localStorage (client-only after mount)
            if (isMounted) {
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('ofphil_appointments_')) {
                  try {
                    const list = JSON.parse(localStorage.getItem(k) || '[]');
                    if (Array.isArray(list)) {
                      list.forEach((a: any) => {
                        const isPending = a.status === 'Pending Nurse Approval';
                        unifiedAdminNotifs.push({
                          id: `apt-${a.id}`,
                          category: isPending ? 'Appointment Request (Needs Approval)' : 'Clinic Appointment',
                          badgeColor: isPending
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          icon: isPending ? 'fa-hourglass-half text-amber-600' : 'fa-calendar-check text-[#0B6B3A]',
                          title: `${a.appointment_type || 'Clinic Appointment'} (${a.id}) — ${a.patient_name || a.patient_id}`,
                          message: `Schedule: ${a.appointment_date} • ${a.appointment_time}${a.notes ? ` — Notes: ${a.notes}` : ''}`,
                          timestamp: a.created_at || a.appointment_date || 'Recent',
                          isUnread: isPending,
                          href: isPending ? `/admin/patient-records/${a.patient_id || 'M26-11-00001'}` : '/admin/appointments',
                          actionLabel: isPending ? 'Review & Approve' : 'View Schedule',
                        });
                      });
                    }
                  } catch {}
                }
              }
            }

            if (unifiedAdminNotifs.length === 0) {
              return (
                <div className="bg-white rounded-2xl border border-[#D5E2D9] p-12 text-center text-[#64748B] text-xs">
                  <i className="fa-regular fa-bell text-3xl text-[#94A3B8] mb-2 block" />
                  No clinic notifications or pending items yet.
                </div>
              );
            }

            unifiedAdminNotifs.sort((a, b) => {
              const ta = Date.parse(a.timestamp) || 0;
              const tb = Date.parse(b.timestamp) || 0;
              return tb - ta;
            });

            return unifiedAdminNotifs.map((n) => {
              const isMarkedRead = adminReadIds.includes(n.id);
              return (
              <div
                key={n.id}
                className={`p-5 rounded-2xl border transition shadow-xs flex flex-col gap-3 ${
                  !isMarkedRead ? 'bg-[#F0FDF4]/50 border-[#A7F3D0]' : 'bg-white border-[#E2E8F0]'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#D5E2D9] flex items-center justify-center text-base shrink-0 shadow-2xs">
                    <i className={`fa-solid ${n.icon}`} />
                  </div>
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${n.badgeColor}`}>
                        {n.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          !isMarkedRead ? 'bg-[#DC2626] text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {!isMarkedRead ? 'NEW' : 'READ'}
                      </span>
                      <span className="text-[11px] text-[#64748B]">
                        <i className="fa-regular fa-clock mr-1" />
                        {n.timestamp}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-[#10241A]">{n.title}</div>
                    <p className="text-xs text-[#334155] m-0 whitespace-pre-wrap leading-relaxed bg-white/90 p-3 rounded-xl border border-[#EEF2EF] w-full">
                      {n.message}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => toggleAdminRead(n.id)}
                    className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#FAFBF8] text-[#10241A] font-semibold text-[11px] cursor-pointer transition"
                  >
                    {isMarkedRead ? 'Mark Unread' : '✓ Mark Read'}
                  </button>
                  {n.inquiryObj ? (
                    <button
                      type="button"
                      onClick={() => handleOpenReply(n.inquiryObj)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white font-bold text-[11px] cursor-pointer transition border-0"
                    >
                      {n.actionLabel} &rarr;
                    </button>
                  ) : (
                    n.href && (
                      <a
                        href={n.href}
                        className="px-3.5 py-1.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white font-bold text-[11px] no-underline transition"
                      >
                        {n.actionLabel} &rarr;
                      </a>
                    )
                  )}
                </div>
              </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Expanded Interactive Modal with Horizontal Tabs & Scrollable Content */}
      {activeInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-[#D5E2D9] shadow-2xl flex flex-col max-h-[90vh] text-xs font-sans animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#EEF2EF] flex items-center justify-between shrink-0 bg-[#FAFBF8]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-sm font-bold shrink-0">
                  <i className="fa-solid fa-reply" />
                </div>
                <div>
                  <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0">
                    Respond to Patient Inquiry
                  </h3>
                  <div className="text-[11px] text-[#64748B] mt-0.5">
                    <span className="font-mono text-gray-500 font-semibold">{activeInquiry.id}</span>
                    <span className="mx-1.5 text-gray-300">&bull;</span>
                    <span className="font-semibold text-[#10241A]">{activeInquiry.name}</span>
                  </div>
                  <div className="text-[11px] text-[#0B6B3A] flex items-center gap-2 mt-0.5 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <i className="fa-solid fa-envelope text-[10px]" />
                      {activeInquiry.email}
                    </span>
                    {activeInquiry.contactNumber && (
                      <>
                        <span className="text-gray-300">&bull;</span>
                        <span className="inline-flex items-center gap-1">
                          <i className="fa-solid fa-phone text-[10px]" />
                          {activeInquiry.contactNumber}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveInquiry(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-[#64748B] flex items-center justify-center cursor-pointer border-0 bg-transparent text-sm"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* HORIZONTAL TABS (Tab 1: Files & Documents, Tab 2: Send Response / Dispatch) */}
            <div className="px-6 pt-2.5 border-b border-[#D5E2D9] bg-[#FAFBF8] flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setModalTab('documents')}
                className={`pb-2.5 px-3 font-semibold text-xs transition border-b-2 flex items-center gap-2 cursor-pointer ${
                  modalTab === 'documents'
                    ? 'border-[#0B6B3A] text-[#0B6B3A] font-bold'
                    : 'border-transparent text-[#64748B] hover:text-[#10241A]'
                }`}
              >
                <i className="fa-solid fa-folder-open text-xs" />
                <span>Files &amp; Documents Submitted by Patient</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    modalTab === 'documents'
                      ? 'bg-[#0B6B3A] text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {activeInquiry.patientAttachments?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('compose')}
                className={`pb-2.5 px-3 font-semibold text-xs transition border-b-2 flex items-center gap-2 cursor-pointer ${
                  modalTab === 'compose'
                    ? 'border-[#0B6B3A] text-[#0B6B3A] font-bold'
                    : 'border-transparent text-[#64748B] hover:text-[#10241A]'
                }`}
              >
                <i className="fa-solid fa-paper-plane text-xs" />
                <span>Send Response / Dispatch</span>
              </button>
            </div>

            {/* Modal Body Container with Smooth Scrollbar */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* TAB 1: FILES & DOCUMENTS SUBMITTED BY PATIENT */}
              {modalTab === 'documents' && (
                <div className="space-y-4">
                  {/* Inquiry Question & Message Reference */}
                  <div className="bg-[#FAFBF8] border border-[#E2E8F0] rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#10241A] text-xs">
                        {activeInquiry.subject}
                      </span>
                      <span className="text-[10px] text-[#94A3B8]">
                        Received: {activeInquiry.date}
                      </span>
                    </div>
                    <p className="text-xs text-[#475569] leading-relaxed m-0 italic bg-white p-3 rounded-lg border border-[#EEF2EF]">
                      &ldquo;{activeInquiry.message}&rdquo;
                    </p>
                  </div>

                  {/* Document List */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#334155] uppercase tracking-wider mb-2">
                      Verified Documents &amp; Uploads Submitted ({activeInquiry.patientAttachments?.length || 0})
                    </label>

                    {activeInquiry.patientAttachments && activeInquiry.patientAttachments.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeInquiry.patientAttachments.map((att, idx) => (
                          <div
                            key={idx}
                            className="bg-[#FAFBF8] border border-[#CBD5E1] rounded-xl p-3.5 flex flex-col justify-between hover:border-[#0B6B3A] transition shadow-2xs group"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                  att.type === 'pdf' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-[#0B6B3A]'
                                }`}
                              >
                                <i
                                  className={`fa-solid ${
                                    att.type === 'pdf' ? 'fa-file-pdf' : 'fa-image'
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
                                onClick={() => setPreviewAttachment(att)}
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

                  {/* Switch Tab shortcut */}
                  <div className="pt-3 border-t border-[#EEF2EF] flex justify-end">
                    <button
                      type="button"
                      onClick={() => setModalTab('compose')}
                      className="px-5 py-2 rounded-xl bg-[#0B6B3A] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs hover:bg-[#064826] transition"
                    >
                      <span>Proceed to Reply / Dispatch Form</span>
                      <i className="fa-solid fa-arrow-right text-xs" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: COMPOSE & SEND RESPONSE (With Scrollbar) */}
              {modalTab === 'compose' && (
                <div className="space-y-4">
                  {/* Inquiry Reference Summary */}
                  <div className="bg-[#FAFBF8] border border-[#E2E8F0] rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#10241A]">{activeInquiry.subject}</span>
                      <span className="text-[10.5px] text-[#94A3B8]">{activeInquiry.date}</span>
                    </div>
                    <p className="text-xs text-[#475569] leading-relaxed m-0 italic bg-white p-2.5 rounded-lg border border-[#EEF2EF]">
                      &ldquo;{activeInquiry.message}&rdquo;
                    </p>
                  </div>

                  {/* Past Replies if any */}
                  {activeInquiry.replyHistory && activeInquiry.replyHistory.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-[#334155] uppercase tracking-wider">
                        Previous Communication History
                      </label>
                      {activeInquiry.replyHistory.map((rep, idx) => (
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
                  <form onSubmit={handleSendReply} className="space-y-4">
                    {/* Channel Selector */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#334155] mb-1.5 uppercase tracking-wider">
                        Reply Channel &amp; Delivery Option
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyChannel('email');
                            setReplyTo(activeInquiry.email);
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                            replyChannel === 'email'
                              ? 'bg-[#E8F5EC] border-[#0B6B3A] text-[#0B6B3A] shadow-xs ring-1 ring-[#0B6B3A]/20'
                              : 'bg-[#FAFBF8] border-[#D5E2D9] text-[#64748B] hover:text-[#10241A]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold">
                            <i className="fa-solid fa-envelope text-xs" />
                            <span>Send via Email</span>
                          </div>
                          <span className="text-[10px] text-[#5A7466] truncate max-w-full">
                            {activeInquiry.email}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setReplyChannel('sms');
                            setReplyTo(activeInquiry.contactNumber || '');
                            setAttachedFile(null);
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                            replyChannel === 'sms'
                              ? 'bg-[#E8F5EC] border-[#0B6B3A] text-[#0B6B3A] shadow-xs ring-1 ring-[#0B6B3A]/20'
                              : 'bg-[#FAFBF8] border-[#D5E2D9] text-[#64748B] hover:text-[#10241A]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold">
                            <i className="fa-solid fa-mobile-screen text-xs" />
                            <span>Send via Mobile (SMS)</span>
                          </div>
                          <span className="text-[10px] text-[#5A7466] truncate max-w-full">
                            {activeInquiry.contactNumber || 'No mobile registered'}
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
                          <i className={`fa-solid ${replyChannel === 'email' ? 'fa-at' : 'fa-phone'} text-xs`} />
                        </div>
                        <input
                          type={replyChannel === 'email' ? 'email' : 'text'}
                          value={replyTo}
                          onChange={(e) => setReplyTo(e.target.value)}
                          placeholder={replyChannel === 'email' ? 'recipient@email.com' : '09123456789'}
                          className="w-full pl-9 pr-3 py-2 border border-[#CBD5E1] rounded-xl text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-1 focus:ring-[#0B6B3A]"
                          required
                        />
                      </div>
                    </div>

                    {/* Subject Input */}
                    {replyChannel === 'email' && (
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
                            value={replySubject}
                            onChange={(e) => setReplySubject(e.target.value)}
                            placeholder="Email Subject"
                            className="w-full pl-9 pr-3 py-2 border border-[#CBD5E1] rounded-xl text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-1 focus:ring-[#0B6B3A]"
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
                        rows={replyChannel === 'email' ? 5 : 4}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={
                          replyChannel === 'email'
                            ? 'Type official guidance, requirements checklist, or appointment scheduling details...'
                            : 'Type concise SMS message to patient (e.g., Ang inyong libreng konsultasyon ay nakatakda sa Biyernes)...'
                        }
                        className="w-full p-3 border border-[#CBD5E1] rounded-xl text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 leading-relaxed"
                        required
                      />
                    </div>

                    {/* File Attachment Upload: PNG, JPEG, JPG, PDF (Max 10MB) */}
                    {replyChannel === 'email' && (
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
                                className={`fa-solid ${
                                  attachedFile.type === 'pdf' ? 'fa-file-pdf text-[#DC2626]' : 'fa-image text-[#0B6B3A]'
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

                    {replyChannel === 'sms' && (
                      <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[11px] text-[#64748B] flex items-center gap-2">
                        <i className="fa-solid fa-info-circle text-[#0B6B3A] text-xs shrink-0" />
                        <span>SMS mode: Plain text message will be transmitted directly to {replyTo || 'mobile'} (attachments disabled for SMS).</span>
                      </div>
                    )}

                    {/* Bottom action buttons */}
                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EEF2EF]">
                      <button
                        type="button"
                        onClick={() => setActiveInquiry(null)}
                        disabled={isSendingReply}
                        className="px-4 py-2 rounded-xl border border-[#D5E2D9] text-[#64748B] font-semibold hover:bg-slate-50 cursor-pointer bg-transparent text-xs"
                      >
                        Close
                      </button>
                      <button
                        type="submit"
                        disabled={isSendingReply}
                        className="px-5 py-2 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white font-bold text-xs border-0 cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <i className={`fa-solid ${isSendingReply ? 'fa-spinner fa-spin' : 'fa-paper-plane'} text-xs`} />
                        <span>{isSendingReply ? 'Sending Response...' : 'Dispatch Reply'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen / Modal Viewer for Patient & Reply Attachments (PDF & Images) */}
      {previewAttachment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full h-[85vh] flex flex-col shadow-2xl border border-[#D5E2D9] overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Bar */}
            <div className="px-5 py-3.5 bg-[#FAFBF8] border-b border-[#EEF2EF] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#0B6B3A] flex items-center justify-center shrink-0">
                  <i
                    className={`fa-solid ${
                      previewAttachment.type === 'pdf' ? 'fa-file-pdf text-[#DC2626]' : 'fa-image text-[#0B6B3A]'
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-[#10241A] truncate m-0">
                    {previewAttachment.name}
                  </h4>
                  <div className="text-[10.5px] text-[#64748B]">
                    {previewAttachment.type === 'pdf' ? 'Portable Document Format (PDF)' : 'Image Preview'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewAttachment.url}
                  download={previewAttachment.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg border border-[#D5E2D9] hover:bg-white text-xs font-semibold text-[#1E293B] flex items-center gap-1.5 transition no-underline shadow-2xs"
                >
                  <i className="fa-solid fa-arrow-down-to-bracket text-xs text-[#0B6B3A]" />
                  <span>Open / Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer border-0 bg-transparent"
                >
                  <i className="fa-solid fa-xmark text-sm" />
                </button>
              </div>
            </div>

            {/* Document Viewer Body */}
            <div className="flex-1 bg-slate-100 p-4 overflow-auto flex items-center justify-center">
              {previewAttachment.type === 'image' ? (
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.name}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-md bg-white"
                />
              ) : (
                <iframe
                  src={previewAttachment.url}
                  title={previewAttachment.name}
                  className="w-full h-full rounded-lg border border-slate-300 bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
