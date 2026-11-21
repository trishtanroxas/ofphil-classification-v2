'use client';
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import Link from 'next/link';

interface ClinicalRecord {
  application_id: string;
  first_name: string;
  last_name: string;
  age: number;
  sex: string;
  diagnosis: string;
  monthly_income: number;
  ai_recommendation: string;
  burden_ratio: string;
  status: 'pending' | 'eligible' | 'approved' | 'rejected';
}

const SAMPLE_RECORDS: ClinicalRecord[] = [

  {
    application_id: 'APP-FA-9264EB46',
    first_name: 'Elena',
    last_name: 'Bautista',
    age: 58,
    sex: 'F',
    diagnosis: 'Cataract Immature Cortical',
    monthly_income: 8500,
    ai_recommendation: 'Partial Grant (Class B)',
    burden_ratio: '55.2%',
    status: 'eligible',
  },
  {
    application_id: 'APP-FA-1049AB12',
    first_name: 'Rodolfo',
    last_name: 'Santos',
    age: 67,
    sex: 'M',
    diagnosis: 'Proliferative Diabetic Retinopathy',
    monthly_income: 4500,
    ai_recommendation: 'Full Subsidy (Class A)',
    burden_ratio: '94.1%',
    status: 'approved',
  },
  {
    application_id: 'APP-FA-7721DD30',
    first_name: 'Teresita',
    last_name: 'Villanueva',
    age: 71,
    sex: 'F',
    diagnosis: 'Primary Open Angle Glaucoma',
    monthly_income: 9200,
    ai_recommendation: 'Partial Grant (Class B)',
    burden_ratio: '61.0%',
    status: 'pending',
  },
];

export default function DashboardPage() {
  const [filterQuery, setFilterQuery] = useState('');

  const filteredRecords = SAMPLE_RECORDS.filter(
    (r) =>
      r.application_id.toLowerCase().includes(filterQuery.toLowerCase()) ||
      r.first_name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      r.last_name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      r.diagnosis.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <DashboardLayout
      title="Clinical Casework & Eligibility Dashboard"
      subtitle="Ophthalmological Foundation of the Philippines — AI-Assisted Patient Intake & Evaluation"
    >
      <div className="space-y-7">
        {/* 1. SaaS Welcome & Fast Filter Hero Bar */}
        <div className="bg-gradient-to-r from-[#064826] to-[#0B6B3A] rounded-2xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold mb-3 border border-white/15">
              <span className="w-2 h-2 rounded-full bg-[#86EFAC] animate-pulse" />
              Active Clinic Intake Day
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-['Outfit'] tracking-tight mb-2 text-white">
              Welcome back, Caseworker
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-xl leading-relaxed">
              You have <strong className="text-white">2 patient applications</strong> waiting for Step 1 socioeconomic screening today.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/patients?tab=pending"
              className="px-5 py-2.5 rounded-xl bg-white text-[#0B6B3A] font-semibold text-xs sm:text-sm hover:bg-emerald-50 transition shadow-sm flex items-center gap-2"
            >
              <i className="fa-solid fa-inbox text-xs" />
              <span>Review Queue (2)</span>
            </Link>
            <Link
              href="/documents"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs sm:text-sm border border-white/20 transition flex items-center gap-2"
            >
              <i className="fa-solid fa-file-invoice text-xs" />
              <span>Quotation Audit Desk</span>
            </Link>
          </div>
        </div>

        {/* 2. 4-Card SaaS KPI Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* KPI 1 */}
          <div className="bg-white rounded-2xl p-6 border border-[#EEF2EF] shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5A7466]">
                Total Applications
              </span>
              <div className="w-10 h-10 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-base">
                <i className="fa-solid fa-folder-open" />
              </div>
            </div>
            <div>
              <div className="font-['Outfit'] text-3xl sm:text-4xl font-bold text-[#10241A] tracking-tight leading-none mb-1">
                24
              </div>
              <p className="text-xs text-[#5A7466]">Active clinical dossier records</p>
            </div>
          </div>

          {/* KPI 2 */}
          <div className="bg-white rounded-2xl p-6 border border-[#EEF2EF] shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5A7466]">
                Eligible for Subsidy
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-base">
                <i className="fa-solid fa-check-double" />
              </div>
            </div>
            <div>
              <div className="font-['Outfit'] text-3xl sm:text-4xl font-bold text-[#0B6B3A] tracking-tight leading-none mb-1">
                19
              </div>
              <p className="text-xs text-[#5A7466]">Meets indigent surgery criteria</p>
            </div>
          </div>

          {/* KPI 3 */}
          <div className="bg-white rounded-2xl p-6 border border-[#EEF2EF] shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5A7466]">
                Approved Grants
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-base">
                <i className="fa-solid fa-certificate" />
              </div>
            </div>
            <div>
              <div className="font-['Outfit'] text-3xl sm:text-4xl font-bold text-[#10241A] tracking-tight leading-none mb-1">
                16
              </div>
              <p className="text-xs text-[#5A7466]">Signed guarantee letters</p>
            </div>
          </div>

          {/* KPI 4 */}
          <div className="bg-white rounded-2xl p-6 border border-[#EEF2EF] shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5A7466]">
                Discretion Rate
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-base">
                <i className="fa-solid fa-scale-balanced" />
              </div>
            </div>
            <div>
              <div className="font-['Outfit'] text-3xl sm:text-4xl font-bold text-[#10241A] tracking-tight leading-none mb-1">
                4.2%
              </div>
              <p className="text-xs text-[#5A7466]">Caseworker discretion adjustments</p>
            </div>
          </div>
        </div>

        {/* 3. Action Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Action Card 1: Socioeconomic Intake Queue */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#EEF2EF] shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-sm">
                    <i className="fa-solid fa-inbox" />
                  </div>
                  <h3 className="font-['Outfit'] text-[16px] font-bold text-[#10241A]">
                    Socioeconomic Intake Queue
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  2 Pending
                </span>
              </div>
              <p className="text-xs sm:text-[13px] text-[#5A7466] leading-relaxed mb-6">
                Evaluate household income, PhilHealth status, family size, and barangay indigency certificates before surgery scheduling.
              </p>
            </div>
            <Link
              href="/patients?tab=pending"
              className="w-full py-2.5 px-4 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xs"
            >
              <i className="fa-solid fa-clipboard-check text-xs" />
              <span>Review Queue Items</span>
            </Link>
          </div>

          {/* Action Card 2: Today's Clinical Consultations */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#EEF2EF] shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-sm">
                    <i className="fa-solid fa-calendar-day" />
                  </div>
                  <h3 className="font-['Outfit'] text-[16px] font-bold text-[#10241A]">
                    Today's Clinical Intake
                  </h3>
                </div>
                <span className="text-xs text-[#5A7466] font-medium">Clinic Schedule</span>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF] text-xs">
                  <div>
                    <strong className="text-[#10241A] font-semibold">09:00 AM</strong>
                    <span className="text-[#5A7466] ml-2">Elena Bautista • Cataract</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-emerald-50 text-emerald-700">
                    Interviewed
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF] text-xs">
                  <div>
                    <strong className="text-[#10241A] font-semibold">10:30 AM</strong>
                    <span className="text-[#5A7466] ml-2">Rodolfo Santos • Vitrectomy</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-amber-50 text-amber-700">
                    In Queue
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF] text-xs">
                  <div>
                    <strong className="text-[#10241A] font-semibold">02:00 PM</strong>
                    <span className="text-[#5A7466] ml-2">Teresita V. • Glaucoma</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-slate-100 text-slate-600">
                    Scheduled
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Card 3: Quotation Audit Desk */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#EEF2EF] shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-sm">
                    <i className="fa-solid fa-file-invoice" />
                  </div>
                  <h3 className="font-['Outfit'] text-[16px] font-bold text-[#10241A]">
                    Hospital Quotation Audit
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  OCR Verified
                </span>
              </div>
              <p className="text-xs sm:text-[13px] text-[#5A7466] leading-relaxed mb-6">
                Inspect hospital surgical quotation ledgers, extract doctor fees, and calculate exact subsidy grants without arithmetic mistakes.
              </p>
            </div>
            <Link
              href="/documents"
              className="w-full py-2.5 px-4 rounded-xl bg-[#E8F5EC] hover:bg-[#D5E6DC] text-[#0B6B3A] font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-magnifying-glass text-xs" />
              <span>Open Quotation Audit Desk</span>
            </Link>
          </div>
        </div>

        {/* 4. Table: Recent Clinical Dossiers */}
        <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#EEF2EF] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-['Outfit'] text-base sm:text-lg font-bold text-[#10241A]">
                Recent Clinical Dossiers
              </h3>
              <p className="text-xs text-[#5A7466]">
                Latest indigent patient applications submitted to the evaluation queue
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search patient, ID, diagnosis..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="px-3 py-1.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
              />
              <Link
                href="/patients"
                className="px-4 py-2 rounded-xl bg-[#FAFBF8] hover:bg-[#EEF2EF] text-xs font-semibold text-[#0B6B3A] border border-[#DCE5DF] transition flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>View Complete Masterlist</span>
                <i className="fa-solid fa-arrow-right text-[10px]" />
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-[#24352B]">
              <thead className="bg-[#FAFBF8] text-[#5A7466] text-xs uppercase tracking-wider border-b border-[#EEF2EF]">
                <tr>
                  <th className="py-3.5 px-6 font-semibold">Application ID</th>
                  <th className="py-3.5 px-6 font-semibold">Patient Name</th>
                  <th className="py-3.5 px-6 font-semibold">Age / Sex</th>
                  <th className="py-3.5 px-6 font-semibold">Diagnosis</th>
                  <th className="py-3.5 px-6 font-semibold">Monthly Income</th>
                  <th className="py-3.5 px-6 font-semibold">Recommendation</th>
                  <th className="py-3.5 px-6 font-semibold">Burden Ratio</th>
                  <th className="py-3.5 px-6 font-semibold">Status</th>
                  <th className="py-3.5 px-6 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2EF]">
                {filteredRecords.map((r) => (
                  <tr key={r.application_id} className="hover:bg-[#FAFBF8] transition">
                    <td className="py-4 px-6 font-mono font-bold text-[#10241A] whitespace-nowrap">
                      {r.application_id}
                    </td>
                    <td className="py-4 px-6 font-medium text-[#10241A] whitespace-nowrap">
                      {r.first_name} {r.last_name}
                    </td>
                    <td className="py-4 px-6 text-[#5A7466] whitespace-nowrap">
                      {r.age} / {r.sex}
                    </td>
                    <td className="py-4 px-6 text-[#10241A] whitespace-nowrap">
                      {r.diagnosis}
                    </td>
                    <td className="py-4 px-6 font-semibold text-[#10241A] whitespace-nowrap">
                      ₱{r.monthly_income.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#E8F5EC] text-[#0B6B3A]">
                        {r.ai_recommendation}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-semibold text-[#5A7466] whitespace-nowrap">
                      {r.burden_ratio}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      {r.status === 'pending' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Pending Review
                        </span>
                      )}
                      {r.status === 'eligible' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Eligible
                        </span>
                      )}
                      {r.status === 'approved' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Approved Grant
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <Link
                        href={`/patients?id=${r.application_id}`}
                        className="px-3 py-1.5 rounded-lg bg-[#FAFBF8] hover:bg-[#EEF2EF] text-[#0B6B3A] border border-[#DCE5DF] font-semibold text-xs transition inline-flex items-center gap-1"
                      >
                        <i className="fa-solid fa-eye text-[11px]" />
                        <span>View</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
