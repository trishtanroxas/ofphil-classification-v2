'use client';
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import Link from 'next/link';

interface InquiryItem {
  id: string;
  name: string;
  email: string;
  subject: string;
  date: string;
  status: 'New' | 'Answered' | 'Pending Review';
  message: string;
}

const SAMPLE_INQUIRIES: InquiryItem[] = [
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
  const [inquiries] = useState<InquiryItem[]>(SAMPLE_INQUIRIES);

  return (
    <DashboardLayout
      title="Patient & Public Inquiries Desk"
      subtitle="Ophthalmological Foundation of the Philippines — AI-Assisted Patient Intake & Evaluation"
    >
      <div className="space-y-4 text-xs font-sans">
        {/* Header Bar */}
        <div className="bg-white border border-[#D5E2D9] rounded-xl px-5 py-3 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="font-['Outfit'] text-base font-bold text-[#10241A] flex items-center gap-2 m-0">
              <i className="fa-solid fa-envelope-open-text text-[#0B6B3A] text-sm" />
              <span>Patient &amp; Public Inquiries</span>
            </h2>
            <span className="text-[11px] text-[#0B6B3A] bg-[#E8F5EC] px-2.5 py-0.5 rounded-full font-bold">
              3 Received
            </span>
          </div>

          <div className="text-xs text-[#5A7466]">
            Inbox coordinated with Clinic Reception
          </div>
        </div>

        {/* Inquiries Table */}
        <div className="bg-white border border-[#D5E2D9] rounded-xl shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFBF8] text-[#5A7466] uppercase text-[10.5px] border-b border-[#EEF2EF]">
              <tr>
                <th className="py-3 px-5 font-semibold">Ref ID</th>
                <th className="py-3 px-5 font-semibold">Sender Name</th>
                <th className="py-3 px-5 font-semibold">Subject &amp; Message</th>
                <th className="py-3 px-5 font-semibold">Date Received</th>
                <th className="py-3 px-5 font-semibold">Status</th>
                <th className="py-3 px-5 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2EF]">
              {inquiries.map((inq) => (
                <tr key={inq.id} className="hover:bg-[#FAFBF8] transition">
                  <td className="py-3.5 px-5 font-mono font-bold text-[#10241A]">
                    {inq.id}
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="font-semibold text-[#10241A]">{inq.name}</div>
                    <div className="text-[11px] text-[#5A7466]">{inq.email}</div>
                  </td>
                  <td className="py-3.5 px-5 max-w-md">
                    <div className="font-semibold text-[#10241A]">{inq.subject}</div>
                    <div className="text-[11.5px] text-[#5A7466] truncate">{inq.message}</div>
                  </td>
                  <td className="py-3.5 px-5 text-[#5A7466] whitespace-nowrap">
                    {inq.date}
                  </td>
                  <td className="py-3.5 px-5 whitespace-nowrap">
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
                  <td className="py-3.5 px-5 text-center whitespace-nowrap">
                    <button
                      type="button"
                      className="px-3 py-1 rounded-lg border border-[#D5E2D9] hover:bg-[#FAFBF8] text-[#0B6B3A] font-semibold text-xs"
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
    </DashboardLayout>
  );
}
