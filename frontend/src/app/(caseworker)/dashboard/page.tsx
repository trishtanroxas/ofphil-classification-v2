'use client';
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import Link from 'next/link';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';

interface DashboardStats {
  total_assigned: number;
  pending_assessments: number;
  completed_assessments: number;
  charity_patients: number;
  approval_rate: string;
  active_msw: string;
}

interface PatientRecord {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  age: number;
  sex: string;
  diagnosis: string;
  category: string;
  status: string;
  residence_city: string;
  residence_region: string;
  contact: string;
  encounters?: any[];
}

export default function CaseworkerDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    total_assigned: 1,
    pending_assessments: 0,
    completed_assessments: 1,
    charity_patients: 1,
    approval_rate: '100%',
    active_msw: 'Maria Santos, RSW'
  });
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsData, patientsData] = await Promise.all([
        fetchApi('/msw/dashboard-stats').catch(() => null),
        fetchApi('/patients').catch(() => [])
      ]);

      if (statsData) {
        setStats(statsData);
      }
      if (Array.isArray(patientsData)) {
        // MSW Caseworker Dashboard only reflects Charity Beneficiaries (regular private patients excluded)
        const charityOnly = patientsData.filter((p: any) => p.category === 'CHARITY');
        setPatients(charityOnly);
      }
    } catch (e) {
      toast.error('Unable to synchronize live dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const filteredRecords = patients.filter((r) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    const fullName = `${r.first_name} ${r.last_name}`.toLowerCase();
    const pid = (r.patient_id || '').toLowerCase();
    const diag = (r.diagnosis || '').toLowerCase();
    return fullName.includes(q) || pid.includes(q) || diag.includes(q);
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 1. Header Section */}
        <div className="bg-white rounded-2xl p-6 border border-[#EEF2EF] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F5EC] text-[#0B6B3A]">
                Medical Social Services Desk
              </span>
              <span className="text-xs text-[#64748B]">• Active Caseworker: {stats.active_msw}</span>
            </div>
            <h2 className="font-['Outfit'] text-2xl font-bold text-[#10241A]">
              Caseworker Clinical Dashboard
            </h2>
            <p className="text-xs sm:text-sm text-[#5A7466] mt-0.5">
              Real-time patient eligibility assessment, charity subsidy verification, and surgical intake.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadDashboardData}
              className="px-4 py-2.5 rounded-xl border border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] text-xs font-semibold text-[#10241A] transition flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <i className="fa-solid fa-arrows-rotate text-xs text-[#0B6B3A]" />
              <span>Refresh</span>
            </button>
            <Link
              href="/patients"
              className="px-5 py-2.5 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white text-xs font-bold transition flex items-center gap-2 shadow-xs"
            >
              <i className="fa-solid fa-address-book text-xs" />
              <span>Open Master Records</span>
            </Link>
          </div>
        </div>

        {/* 2. Statistical KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* KPI 1 */}
          <div className="bg-white rounded-2xl p-6 border border-[#EEF2EF] shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5A7466]">
                Total Assigned
              </span>
              <div className="w-10 h-10 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-base">
                <i className="fa-solid fa-users" />
              </div>
            </div>
            <div>
              <div className="font-['Outfit'] text-3xl sm:text-4xl font-bold text-[#10241A] tracking-tight leading-none mb-1">
                {stats.total_assigned}
              </div>
              <p className="text-xs text-[#5A7466]">Database patient dossiers</p>
            </div>
          </div>

          {/* KPI 2 */}
          <div className="bg-white rounded-2xl p-6 border border-[#EEF2EF] shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5A7466]">
                Charity Grantees
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-base">
                <i className="fa-solid fa-hand-holding-heart" />
              </div>
            </div>
            <div>
              <div className="font-['Outfit'] text-3xl sm:text-4xl font-bold text-[#0B6B3A] tracking-tight leading-none mb-1">
                {stats.charity_patients}
              </div>
              <p className="text-xs text-[#5A7466]">Subsidized indigent cases</p>
            </div>
          </div>

          {/* KPI 3 */}
          <div className="bg-white rounded-2xl p-6 border border-[#EEF2EF] shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5A7466]">
                Completed Encounters
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-base">
                <i className="fa-solid fa-certificate" />
              </div>
            </div>
            <div>
              <div className="font-['Outfit'] text-3xl sm:text-4xl font-bold text-[#10241A] tracking-tight leading-none mb-1">
                {stats.completed_assessments}
              </div>
              <p className="text-xs text-[#5A7466]">Evaluated clinical encounters</p>
            </div>
          </div>

          {/* KPI 4 */}
          <div className="bg-white rounded-2xl p-6 border border-[#EEF2EF] shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5A7466]">
                Approval Rate
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-base">
                <i className="fa-solid fa-chart-line" />
              </div>
            </div>
            <div>
              <div className="font-['Outfit'] text-3xl sm:text-4xl font-bold text-[#10241A] tracking-tight leading-none mb-1">
                {stats.approval_rate}
              </div>
              <p className="text-xs text-[#5A7466]">Eligible charity grants</p>
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
                  {stats.pending_assessments} Pending
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
                    Charity Beneficiary Registry
                  </h3>
                </div>
                <span className="text-xs text-[#5A7466] font-medium">Active Charity Records</span>
              </div>
              <div className="space-y-2.5">
                {patients.slice(0, 3).map((p) => (
                  <Link
                    key={p.patient_id}
                    href={`/patients/${encodeURIComponent(p.patient_id)}?tab=profile`}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#FAFBF8] hover:bg-[#E8F5EC]/60 border border-[#EEF2EF] text-xs transition no-underline"
                  >
                    <div>
                      <strong className="text-[#10241A] font-semibold">{p.patient_id}</strong>
                      <span className="text-[#5A7466] ml-2">{p.first_name} {p.last_name}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-emerald-50 text-emerald-700">
                      CHARITY
                    </span>
                  </Link>
                ))}
                {patients.length === 0 && (
                  <div className="p-3 text-center text-xs text-[#64748B]">No registered charity records yet.</div>
                )}
              </div>
            </div>
            <Link
              href="/patients"
              className="w-full mt-4 py-2 px-4 rounded-xl border border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] text-[#10241A] font-semibold text-xs transition flex items-center justify-center gap-2"
            >
              <span>View Charity Patients ({patients.length})</span>
            </Link>
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
                    Evidential Document Audit
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Documents Verified
                </span>
              </div>
              <p className="text-xs sm:text-[13px] text-[#5A7466] leading-relaxed mb-6">
                Inspect hospital surgical quotation ledgers, government valid IDs, and certificate seals to prevent fraudulent charity claims.
              </p>
            </div>
            <Link
              href="/documents"
              className="w-full py-2.5 px-4 rounded-xl bg-[#E8F5EC] hover:bg-[#D5E6DC] text-[#0B6B3A] font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-magnifying-glass text-xs" />
              <span>Open Document Audit Desk</span>
            </Link>
          </div>
        </div>

        {/* 4. Table: Recent Clinical Dossiers */}
        <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#EEF2EF] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-['Outfit'] text-base sm:text-lg font-bold text-[#10241A]">
                Recent Charity Dossiers &amp; Intake Records
              </h3>
              <p className="text-xs text-[#5A7466]">
                Registered indigent beneficiaries eligible for ophthalmic surgery subsidy evaluation
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
            {isLoading ? (
              <div className="py-16 text-center">
                <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#0B6B3A] mb-2" />
                <p className="text-xs text-[#64748B]">Loading dossiers...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#64748B]">
                No clinical records found in the database.
              </div>
            ) : (
              <table className="w-full text-left text-xs sm:text-sm text-[#24352B]">
                <thead className="bg-[#FAFBF8] text-[#5A7466] text-xs uppercase tracking-wider border-b border-[#EEF2EF]">
                  <tr>
                    <th className="py-3.5 px-6 font-semibold">Charity Case No.</th>
                    <th className="py-3.5 px-6 font-semibold">Patient Name</th>
                    <th className="py-3.5 px-6 font-semibold">Age / Sex</th>
                    <th className="py-3.5 px-6 font-semibold">Diagnosis</th>
                    <th className="py-3.5 px-6 font-semibold">Category</th>
                    <th className="py-3.5 px-6 font-semibold">Status</th>
                    <th className="py-3.5 px-6 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2EF]">
                  {filteredRecords.map((r) => (
                    <tr key={r.patient_id} className="hover:bg-[#FAFBF8] transition">
                      <td className="py-4 px-6 font-mono font-bold text-[#10241A] whitespace-nowrap">
                        {r.patient_id}
                      </td>
                      <td className="py-4 px-6 font-medium text-[#10241A] whitespace-nowrap">
                        {r.first_name} {r.last_name}
                      </td>
                      <td className="py-4 px-6 text-[#5A7466] whitespace-nowrap">
                        {r.age ?? '—'} / {r.sex}
                      </td>
                      <td className="py-4 px-6 text-[#10241A] whitespace-nowrap">
                        {r.diagnosis || 'Cataract'}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          r.category === 'CHARITY' ? 'bg-[#E8F5EC] text-[#0B6B3A]' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {r.category === 'CHARITY' ? 'Charity Grant' : 'Regular'}
                        </span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider inline-flex items-center gap-1 ${
                            r.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : r.status === 'DISAPPROVED/PROMISSORY' ||
                                r.status?.includes('PROMISSORY') ||
                                r.status?.includes('DISAPPROVED')
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {r.status === 'APPROVED' && <i className="fa-solid fa-circle-check text-[9px] text-emerald-600" />}
                          {(r.status === 'DISAPPROVED/PROMISSORY' ||
                            r.status?.includes('PROMISSORY') ||
                            r.status?.includes('DISAPPROVED')) && (
                            <i className="fa-solid fa-file-signature text-[9px] text-rose-600" />
                          )}
                          {r.status === 'PENDING' && <i className="fa-solid fa-clock text-[9px] text-amber-600" />}
                          <span>{r.status || 'PENDING'}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <Link
                          href={`/patients/${encodeURIComponent(r.patient_id)}`}
                          className="px-3.5 py-1.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white font-semibold text-xs transition inline-flex items-center gap-1.5 shadow-2xs"
                        >
                          <i className="fa-solid fa-folder-open text-[10px]" />
                          <span>View Details</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
