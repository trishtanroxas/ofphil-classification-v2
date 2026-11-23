'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL, fetchApi } from '@/lib/api';

interface InquiryAttachment {
  id: string;
  inquiry_id: string;
  reply_id?: string | null;
  uploader_role: string;
  original_filename: string;
  content_type: string;
  file_type: 'image' | 'pdf';
  file_size: number;
  file_size_display: string;
  created_at: string;
}

interface InquiryReply {
  id: string;
  inquiry_id: string;
  admin_user_id: string;
  admin_name: string;
  channel: string;
  message: string;
  created_at: string;
  attachments?: InquiryAttachment[];
}

interface InquiryRecord {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_email: string;
  patient_contact: string;
  subject: string;
  message: string;
  status: 'NEW' | 'READ' | 'IN_PROGRESS' | 'ANSWERED' | 'CLOSED';
  admin_read: boolean;
  admin_read_at?: string | null;
  admin_read_by?: string | null;
  assigned_admin?: string | null;
  patient_has_unread_reply: boolean;
  created_at: string;
  updated_at: string;
  attachments: InquiryAttachment[];
  all_attachments_count: number;
  replies: InquiryReply[];
}

const STATUS_BADGE: Record<string, string> = {
  NEW: 'bg-red-50 text-red-700 border-red-200',
  READ: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-800 border-amber-200',
  ANSWERED: 'bg-emerald-50 text-[#0B6B3A] border-emerald-200',
  CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function AdminInquiriesPage() {
  const { user, role } = useAuth();
  const actorRole = role === 'nurse' || role === 'msw' ? role : 'admin';
  const actorId = user?.username || user?.id || 'admin_sys';
  const actorName = user?.name || 'OFPHIL Clinic Administration';

  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [readFilter, setReadFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [activeInquiry, setActiveInquiry] = useState<InquiryRecord | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyChannel, setReplyChannel] = useState<'portal' | 'email' | 'sms'>('portal');
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [previewAtt, setPreviewAtt] = useState<{
    name: string;
    url: string;
    type: 'image' | 'pdf';
  } | null>(null);

  const loadInquiries = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (readFilter !== 'all') params.set('read_filter', readFilter);

      const res = await fetchApi(`/inquiries/admin?${params.toString()}`, {
        headers: { 'x-user-role': actorRole, 'x-user-id': actorId },
      });
      setInquiries(Array.isArray(res?.items) ? res.items : []);
      setTotalCount(res?.total_count ?? 0);
      setUnreadCount(res?.unread_count ?? 0);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load patient inquiries.');
    } finally {
      setIsLoading(false);
    }
  }, [actorId, actorRole, page, readFilter, search, statusFilter]);

  useEffect(() => {
    loadInquiries();
  }, [loadInquiries]);

  const handleOpenInquiry = async (inq: InquiryRecord) => {
    setActiveInquiry(inq);
    setReplyText('');
    setReplyFile(null);
    setReplyChannel('portal');

    try {
      const res = await fetchApi(`/inquiries/${inq.id}?mark_read=true`, {
        headers: { 'x-user-role': actorRole, 'x-user-id': actorId },
      });
      if (res?.inquiry) {
        setActiveInquiry(res.inquiry);
        loadInquiries();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to open inquiry.');
    }
  };

  const handleAttachmentAction = async (inquiryId: string, att: InquiryAttachment, download: boolean) => {
    try {
      const url = `${API_BASE_URL}/inquiries/${encodeURIComponent(inquiryId)}/attachments/${encodeURIComponent(att.id)}?download=${download ? 'true' : 'false'}`;
      const resp = await fetch(url, {
        headers: { 'x-user-role': actorRole, 'x-user-id': actorId },
      });
      if (!resp.ok) throw new Error('Unable to retrieve attachment.');
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      if (download) {
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = att.original_filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(objUrl), 3000);
      } else {
        setPreviewAtt({
          name: att.original_filename,
          url: objUrl,
          type: att.file_type,
        });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load attachment.');
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInquiry || isSendingReply) return;
    if (!replyText.trim()) {
      toast.error('Please enter a reply message.');
      return;
    }

    setIsSendingReply(true);
    try {
      const formData = new FormData();
      formData.append('message', replyText.trim());
      formData.append('channel', replyChannel);
      formData.append('subject', `Re: ${activeInquiry.subject}`);
      formData.append('admin_name', `${actorName} (${actorId})`);
      if (replyFile) {
        formData.append('files', replyFile);
      }

      const res = await fetchApi(`/inquiries/${activeInquiry.id}/reply`, {
        method: 'POST',
        headers: { 'x-user-role': actorRole, 'x-user-id': actorId },
        body: formData,
      });

      if (res?.inquiry) {
        setActiveInquiry(res.inquiry);
      }
      setReplyText('');
      setReplyFile(null);
      toast.success(`Reply saved and inquiry marked as ANSWERED!`);
      loadInquiries();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send reply.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!activeInquiry || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      const res = await fetchApi(`/inquiries/${activeInquiry.id}/status`, {
        method: 'PATCH',
        headers: { 'x-user-role': actorRole, 'x-user-id': actorId },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res?.inquiry) {
        setActiveInquiry(res.inquiry);
      }
      toast.success(`Inquiry status updated to ${newStatus.replace('_', ' ')}.`);
      loadInquiries();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update inquiry status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <DashboardLayout
      title="Patient Inquiries & Clinical Correspondence"
      subtitle="Database-connected patient inquiry directory, attachment review, and two-way clinic replies"
    >
      <div className="w-full pb-12 space-y-5 text-xs font-sans">
        {/* Top Metrics & Filters */}
        <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-lg">
                <i className="fa-solid fa-inbox" />
              </div>
              <div>
                <h2 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0">
                  Patient Inquiry Directory
                </h2>
                <p className="text-[11.5px] text-[#5A7466] m-0">
                  {totalCount} total inquiries &bull;{' '}
                  <strong className={unreadCount > 0 ? 'text-red-600' : 'text-[#0B6B3A]'}>
                    {unreadCount} unread
                  </strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadInquiries}
              className="px-3.5 py-2 rounded-lg border border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] text-[#10241A] font-semibold cursor-pointer flex items-center gap-1.5"
            >
              <i className={`fa-solid fa-rotate-right ${isLoading ? 'fa-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2 relative">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by Inquiry ID, Patient ID, Patient Name, or Subject..."
                className="w-full h-10 pl-9 pr-3 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
              />
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[#8F9E96]" />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A]"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New / Unread</option>
              <option value="READ">Read</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ANSWERED">Answered</option>
              <option value="CLOSED">Closed</option>
            </select>

            <select
              value={readFilter}
              onChange={(e) => {
                setReadFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A]"
            >
              <option value="all">All Read States</option>
              <option value="unread">Unread by Admin</option>
              <option value="read">Read by Admin</option>
            </select>
          </div>
        </div>

        {/* Directory Table */}
        <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-[#5A7466]">
              <i className="fa-solid fa-circle-notch fa-spin text-[#0B6B3A] mr-2" />
              Loading inquiries...
            </div>
          ) : inquiries.length === 0 ? (
            <div className="p-12 text-center text-[#5A7466] space-y-2">
              <i className="fa-regular fa-folder-open text-2xl text-[#94A3B8] block" />
              <div className="font-bold text-[#10241A]">No Inquiries Found</div>
              <p className="m-0 text-[11px]">No patient inquiries match your current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAFBF8] border-b border-[#EEF2EF] text-[10.5px] uppercase text-[#5A7466]">
                    <th className="py-3 px-4">Inquiry ID</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Submitted</th>
                    <th className="py-3 px-4">Files</th>
                    <th className="py-3 px-4">Read</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Assigned</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2EF]">
                  {inquiries.map((inq) => (
                    <tr key={inq.id} className="hover:bg-[#FAFBF8] transition">
                      <td className="py-3 px-4 font-mono font-bold text-[#0B6B3A] whitespace-nowrap">
                        {inq.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#10241A]">{inq.patient_name}</div>
                        <div className="font-mono text-[10.5px] text-[#5A7466]">{inq.patient_id}</div>
                      </td>
                      <td className="py-3 px-4 max-w-[240px]">
                        <div className="font-semibold text-[#10241A] truncate">{inq.subject}</div>
                      </td>
                      <td className="py-3 px-4 text-[#64748B] whitespace-nowrap">
                        {new Date(inq.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F1F5F9] text-[#334155] font-semibold">
                          <i className="fa-solid fa-paperclip text-[10px]" />
                          {inq.all_attachments_count}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {inq.admin_read ? (
                          <span className="text-[#0B6B3A] font-semibold">
                            <i className="fa-solid fa-check-double mr-1" /> Read
                          </span>
                        ) : (
                          <span className="text-red-600 font-bold">
                            <i className="fa-solid fa-circle text-[7px] mr-1 align-middle" /> Unread
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                            STATUS_BADGE[inq.status] || STATUS_BADGE.NEW
                          }`}
                        >
                          {inq.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#5A7466]">
                        {inq.assigned_admin || 'Unassigned'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenInquiry(inq)}
                          className="px-3 py-1.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white font-semibold cursor-pointer border-0"
                        >
                          View Inquiry
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-[#EEF2EF] flex items-center justify-between text-xs text-[#5A7466]">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded border border-[#D5E2D9] bg-white disabled:opacity-50 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 rounded border border-[#D5E2D9] bg-white disabled:opacity-50 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inquiry Detail & Reply Modal */}
      {activeInquiry && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setActiveInquiry(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto border border-[#D5E2D9] shadow-2xl p-6 text-xs space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#EEF2EF] pb-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-[#0B6B3A] bg-[#E8F5EC] px-2 py-0.5 rounded">
                    {activeInquiry.id}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      STATUS_BADGE[activeInquiry.status] || STATUS_BADGE.NEW
                    }`}
                  >
                    {activeInquiry.status.replace('_', ' ')}
                  </span>
                  {activeInquiry.admin_read && activeInquiry.admin_read_at && (
                    <span className="text-[11px] text-[#5A7466]">
                      Read by {activeInquiry.admin_read_by} at{' '}
                      {new Date(activeInquiry.admin_read_at).toLocaleString()}
                    </span>
                  )}
                </div>
                <h3 className="font-['Outfit'] text-lg font-bold text-[#10241A] m-0">
                  {activeInquiry.subject}
                </h3>
                <div className="text-[11.5px] text-[#5A7466] mt-0.5">
                  Patient: <strong className="text-[#10241A]">{activeInquiry.patient_name}</strong> (
                  <span className="font-mono">{activeInquiry.patient_id}</span>) &bull;{' '}
                  {activeInquiry.patient_email || 'No email'} &bull;{' '}
                  {activeInquiry.patient_contact || 'No mobile'}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeInquiry.status !== 'IN_PROGRESS' && activeInquiry.status !== 'CLOSED' && (
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleUpdateStatus('IN_PROGRESS')}
                    className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-semibold cursor-pointer"
                  >
                    Mark In Progress
                  </button>
                )}
                {activeInquiry.status !== 'CLOSED' && (
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleUpdateStatus('CLOSED')}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                  >
                    Close Inquiry
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveInquiry(null)}
                  className="text-gray-400 hover:text-gray-700 bg-transparent border-0 cursor-pointer text-base p-1"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            </div>

            {/* Patient Message & Attachments */}
            <div className="p-4 rounded-xl bg-[#FAFBF8] border border-[#D5E2D9] space-y-3">
              <div className="flex justify-between text-[11px] text-[#5A7466] font-semibold">
                <span>Patient Message</span>
                <span>{new Date(activeInquiry.created_at).toLocaleString()}</span>
              </div>
              <p className="m-0 text-[#10241A] whitespace-pre-wrap leading-relaxed">
                {activeInquiry.message}
              </p>

              {activeInquiry.attachments && activeInquiry.attachments.length > 0 && (
                <div className="pt-3 border-t border-[#EEF2EF] space-y-2">
                  <div className="font-bold text-[#10241A]">
                    Patient Attachments ({activeInquiry.attachments.length})
                  </div>
                  <div className="space-y-1.5">
                    {activeInquiry.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="p-2.5 bg-white border border-[#D5E2D9] rounded-lg flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <i
                            className={`fa-solid ${
                              att.file_type === 'pdf' ? 'fa-file-pdf text-red-600' : 'fa-file-image text-[#0B6B3A]'
                            } text-sm`}
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-[#10241A] truncate">{att.original_filename}</div>
                            <div className="text-[10px] text-[#64748B]">
                              {att.content_type} &bull; {att.file_size_display}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAttachmentAction(activeInquiry.id, att, false)}
                            className="px-2.5 py-1 rounded bg-[#E8F5EC] text-[#0B6B3A] font-semibold border-0 cursor-pointer"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAttachmentAction(activeInquiry.id, att, true)}
                            className="px-2.5 py-1 rounded border border-[#D5E2D9] bg-white text-[#334155] font-semibold cursor-pointer"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Previous Replies */}
            {activeInquiry.replies && activeInquiry.replies.length > 0 && (
              <div className="space-y-2">
                <div className="font-bold text-[#5A7466] uppercase text-[10.5px]">
                  Conversation History ({activeInquiry.replies.length} Repl{activeInquiry.replies.length > 1 ? 'ies' : 'y'})
                </div>
                {activeInquiry.replies.map((rep) => (
                  <div key={rep.id} className="p-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold text-[#064826]">
                      <span>{rep.admin_name}</span>
                      <span className="font-normal text-[#0B6B3A]">
                        {new Date(rep.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="m-0 text-[#10241A] whitespace-pre-wrap">{rep.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Admin Reply Form */}
            <form onSubmit={handleSendReply} className="p-4 rounded-xl border border-[#D5E2D9] bg-white space-y-3">
              <div className="font-bold text-[#10241A]">Send Reply to Patient</div>
              <textarea
                rows={4}
                required
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your official clinic response..."
                className="w-full p-3 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={replyChannel}
                    onChange={(e) => setReplyChannel(e.target.value as 'portal' | 'email' | 'sms')}
                    className="h-9 px-2.5 border border-[#D5E2D9] rounded-lg text-xs bg-white"
                  >
                    <option value="portal">Patient Portal Only</option>
                    <option value="email">Portal + Email</option>
                    <option value="sms">Portal + SMS</option>
                  </select>

                  <label className="px-3 py-1.5 rounded-lg border border-[#D5E2D9] bg-[#FAFBF8] cursor-pointer font-semibold text-[#334155]">
                    <i className="fa-solid fa-paperclip mr-1 text-[#0B6B3A]" />
                    {replyFile ? replyFile.name : 'Attach File (Optional)'}
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => setReplyFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSendingReply}
                  className="px-5 py-2.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] disabled:opacity-65 text-white font-bold flex items-center gap-1.5 cursor-pointer border-0"
                >
                  {isSendingReply ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin" />
                      <span>Sending Reply...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane" />
                      <span>Send Reply</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {previewAtt && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70"
          onClick={() => {
            URL.revokeObjectURL(previewAtt.url);
            setPreviewAtt(null);
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-[#EEF2EF] flex items-center justify-between">
              <span className="font-bold text-xs text-[#10241A] truncate">{previewAtt.name}</span>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(previewAtt.url);
                  setPreviewAtt(null);
                }}
                className="text-gray-500 hover:text-gray-800 bg-transparent border-0 cursor-pointer text-sm"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto bg-[#F8FAFC] flex items-center justify-center">
              {previewAtt.type === 'pdf' ? (
                <iframe src={previewAtt.url} className="w-full h-[75vh] rounded border border-[#D5E2D9]" title={previewAtt.name} />
              ) : (
                <img src={previewAtt.url} alt={previewAtt.name} className="max-w-full max-h-[75vh] object-contain rounded" />
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
