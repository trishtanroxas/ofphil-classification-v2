'use client';
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { toast } from 'sonner';

export interface InquiryItem {
  id: string;
  name: string;
  email: string;
  subject: string;
  date: string;
  status: 'New' | 'Answered' | 'Pending Review';
  message: string;
  replyHistory?: Array<{ sender: string; timestamp: string; message: string }>;
}

const INITIAL_INQUIRIES: InquiryItem[] = [
  {
    id: 'INQ-2026-081',
    name: 'Roberto Valenzuela',
    email: 'r.valenzuela@gmail.com',
    subject: 'Financial Assistance for Cataract Surgery (Left Eye)',
    date: '2026-11-20 10:15 AM',
    status: 'New',
    message: 'Good day po. Magtatanong po sana ako kung anong mga requirements ang kailangan dalhin para sa indigency assessment?',
  },
  {
    id: 'INQ-2026-079',
    name: 'Lourdes Mendoza',
    email: 'lourdes.m@yahoo.com',
    subject: 'Schedule of Free Eye Clinic Screening',
    date: '2026-11-19 02:30 PM',
    status: 'Answered',
    message: 'Hello po, available po ba ang ophthalmologist ngayong darating na Biyernes para sa follow-up checkup?',
    replyHistory: [
      {
        sender: 'Clinic Administrator (admin_sys)',
        timestamp: '2026-11-19 04:15 PM',
        message: 'Magandang araw po Ginang Mendoza. Opo, may duty ophthalmologist po tuwing Biyernes mula 8:00 AM hanggang 3:00 PM. Maaari po kayong dumulog sa Admissions Desk.',
      },
    ],
  },
  {
    id: 'INQ-2026-072',
    name: 'Danilo Ramos',
    email: 'danilo_r@gmail.com',
    subject: 'Quotation Verification Follow-up',
    date: '2026-11-18 09:00 AM',
    status: 'Pending Review',
    message: 'Naisumite ko na po ang Barangay Indigency Certificate kaninang umaga. Maraming salamat po.',
  },
];

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<InquiryItem[]>(INITIAL_INQUIRIES);
  const [activeInquiry, setActiveInquiry] = useState<InquiryItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const handleOpenReply = (inq: InquiryItem) => {
    setActiveInquiry(inq);
    setReplyText('');
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInquiry || !replyText.trim()) {
      toast.error('Please enter your reply message.');
      return;
    }

    setIsSendingReply(true);
    setTimeout(() => {
      const updatedReplyHistory = [
        ...(activeInquiry.replyHistory || []),
        {
          sender: 'Clinic Administrator (admin_sys)',
          timestamp: new Date().toLocaleString(),
          message: replyText.trim(),
        },
      ];

      setInquiries((prev) =>
        prev.map((item) =>
          item.id === activeInquiry.id
            ? { ...item, status: 'Answered', replyHistory: updatedReplyHistory }
            : item
        )
      );

      toast.success(`Reply sent to ${activeInquiry.name} (${activeInquiry.email})!`);
      setIsSendingReply(false);
      setActiveInquiry(null);
    }, 600);
  };

  const unreadCount = inquiries.filter((inq) => inq.status === 'New').length;

  return (
    <DashboardLayout
      title="Patient & Public Inquiries Desk"
      subtitle="Ophthalmological Foundation of the Philippines — AI-Assisted Patient Intake & Evaluation"
    >
      <div className="w-full pb-12 space-y-4 text-xs font-sans">
        {/* Header Bar matching screenshot */}
        <div className="bg-white border border-[#D5E2D9] rounded-2xl px-5 py-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="font-['Outfit'] text-base font-bold text-[#10241A] flex items-center gap-2 m-0">
              <i className="fa-solid fa-envelope-open-text text-[#0B6B3A] text-sm" />
              <span>Patient &amp; Public Inquiries</span>
            </h2>
            <span className="text-[11px] text-[#0B6B3A] bg-[#E8F5EC] border border-[#A7F3D0] px-2.5 py-0.5 rounded-full font-bold">
              {unreadCount > 0 ? `${unreadCount} New / ` : ''}{inquiries.length} Received
            </span>
          </div>

          <div className="text-xs text-[#5A7466] flex items-center gap-1.5">
            <i className="fa-solid fa-hospital-user text-xs text-[#0B6B3A]" />
            <span>Inbox coordinated with Clinic Reception</span>
          </div>
        </div>

        {/* Inquiries Table matching screenshot */}
        <div className="bg-white border border-[#D5E2D9] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFBF8] text-[#5A7466] uppercase text-[10.5px] border-b border-[#EEF2EF] tracking-wider">
                <tr>
                  <th className="py-3.5 px-6 font-bold">Ref ID</th>
                  <th className="py-3.5 px-6 font-bold">Sender Name</th>
                  <th className="py-3.5 px-6 font-bold">Subject &amp; Message</th>
                  <th className="py-3.5 px-6 font-bold">Date Received</th>
                  <th className="py-3.5 px-6 font-bold">Status</th>
                  <th className="py-3.5 px-6 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2EF]">
                {inquiries.map((inq) => (
                  <tr key={inq.id} className="hover:bg-[#FAFBF8] transition">
                    <td className="py-4 px-6 font-mono font-bold text-[#10241A]">
                      {inq.id}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-[#10241A]">{inq.name}</div>
                      <div className="text-[11px] text-[#5A7466]">{inq.email}</div>
                    </td>
                    <td className="py-4 px-6 max-w-md">
                      <div className="font-semibold text-[#10241A] mb-0.5">{inq.subject}</div>
                      <div className="text-[11.5px] text-[#5A7466] truncate">{inq.message}</div>
                    </td>
                    <td className="py-4 px-6 text-[#5A7466] whitespace-nowrap">
                      {inq.date}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      {inq.status === 'New' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          New
                        </span>
                      )}
                      {inq.status === 'Answered' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Answered
                        </span>
                      )}
                      {inq.status === 'Pending Review' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Pending Review
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenReply(inq)}
                        className="px-3 py-1.5 rounded-lg border border-[#D5E2D9] hover:bg-[#FAFBF8] text-[#0B6B3A] font-semibold text-xs cursor-pointer transition shadow-2xs hover:border-[#0B6B3A]"
                      >
                        Reply &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Interactive Reply Modal */}
      {activeInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#D5E2D9] shadow-2xl p-6 text-xs font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#EEF2EF] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-sm font-bold">
                  <i className="fa-solid fa-reply" />
                </div>
                <div>
                  <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0">
                    Respond to Patient Inquiry
                  </h3>
                  <div className="text-[11px] text-[#64748B]">
                    {activeInquiry.id} &bull; {activeInquiry.name} ({activeInquiry.email})
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveInquiry(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-[#64748B] flex items-center justify-center cursor-pointer border-0 bg-transparent text-sm"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Inquiry Content Box */}
            <div className="bg-[#FAFBF8] border border-[#E2E8F0] rounded-xl p-3.5 mb-4 space-y-1.5">
              <div className="font-bold text-[#10241A] text-xs">
                {activeInquiry.subject}
              </div>
              <p className="text-xs text-[#475569] leading-relaxed m-0 italic">
                &ldquo;{activeInquiry.message}&rdquo;
              </p>
              <div className="text-[10.5px] text-[#94A3B8] pt-1">
                Received: {activeInquiry.date}
              </div>
            </div>

            {/* Past Replies if any */}
            {activeInquiry.replyHistory && activeInquiry.replyHistory.length > 0 && (
              <div className="mb-4 space-y-2">
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
              <div>
                <label className="block text-[11px] font-bold text-[#334155] mb-1.5">
                  Official Clinic Email Response <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type official guidance, requirements checklist, or appointment scheduling details..."
                  className="w-full p-3 border border-[#CBD5E1] rounded-xl text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 leading-relaxed"
                  required
                />
              </div>

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
        </div>
      )}
    </DashboardLayout>
  );
}
