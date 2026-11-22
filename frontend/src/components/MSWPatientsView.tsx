'use client';
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';

export interface PatientRecordItem {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  age: number | null;
  sex: 'M' | 'F' | string;
  residence_city: string;
  residence_region: string;
  contact: string;
  category: 'CHARITY' | 'REGULAR' | string;
  status: 'APPROVED' | 'DISAPPROVED/PROMISSORY' | 'PENDING' | string;
  email?: string;
  civil_status?: string;
  birthdate?: string;
  diagnosis?: string;
  assigned_msw?: string;
  registration_date?: string;
  has_account?: boolean;
  encounters?: any[];
}

export interface ReferralRecordItem {
  id: string;
  patient_id: string;
  patient_name: string;
  diagnosis: string;
  procedure: string;
  particulars?: { description: string; amount: number }[];
  total: number;
  attending_doctor?: string;
  doctor_signature_title?: string;
  referring_individual?: string;
  referring_signature_title?: string;
  status: string;
  created_at?: string;
  contact?: string;
}

export function MSWPatientsContent({ initialTab }: { initialTab?: 'charity' | 'referrals' | 'pending' | 'promissory' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromQuery = searchParams?.get('tab');

  const [patients, setPatients] = useState<PatientRecordItem[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecordItem[]>([]);
  const [selectedReferral, setSelectedReferral] = useState<ReferralRecordItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'charity' | 'referrals' | 'pending' | 'promissory'>(
    initialTab || (tabFromQuery as any) || 'charity'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [sexFilter, setSexFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [rowsPerPage, setRowsPerPage] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);
  const [assessmentsByPatient, setAssessmentsByPatient] = useState<Record<string, any>>({});

  // Synchronize tab from URL query or initialTab
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (tabFromQuery === 'referrals') {
      setActiveTab('referrals');
    } else if (tabFromQuery === 'pending') {
      setActiveTab('pending');
    } else if (tabFromQuery === 'promissory' || tabFromQuery === 'disapproved') {
      setActiveTab('promissory');
    } else {
      setActiveTab('charity');
    }
  }, [tabFromQuery, initialTab]);

  const fetchPatientsAndReferrals = async () => {
    setIsLoading(true);
    try {
      const [patientsData, referralsData, assessmentsData] = await Promise.all([
        fetchApi('/patients').catch(() => []),
        fetchApi('/referrals').catch(() => ({ referrals: [] })),
        fetchApi('/assessments', { headers: { 'x-user-role': 'msw', 'x-user-id': 'msw_lead' } }).catch(() => []),
      ]);

      if (Array.isArray(assessmentsData)) {
        const map: Record<string, any> = {};
        for (const a of assessmentsData) {
          if (a?.patient_id && !map[a.patient_id]) {
            map[a.patient_id] = a;
          }
        }
        setAssessmentsByPatient(map);
      }

      if (Array.isArray(patientsData)) {
        // MSW ONLY HANDLES CHARITY PATIENTS (Exclude regular clinic patients from charity list)
        const charityOnly = patientsData.filter((p: any) => p.category === 'CHARITY');
        setPatients(charityOnly);
      }

      let refList: ReferralRecordItem[] = Array.isArray(referralsData?.referrals)
        ? referralsData.referrals
        : [];

      // Check localStorage for any newly filed clinical referral slips
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('ofphil_referrals');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              const ids = new Set(refList.map((r) => r.id));
              parsed.forEach((item: any) => {
                if (!ids.has(item.id)) refList.unshift(item);
              });
            }
          } catch { }
        }

        const juanRef = localStorage.getItem('ofphil_referral_M26-11-00001') || localStorage.getItem('ofphil_referral_P26-11-00001');
        if (juanRef) {
          try {
            const jParsed = JSON.parse(juanRef);
            if (jParsed && !refList.some((r) => r.patient_id === 'M26-11-00001' || r.patient_id === 'P26-11-00001')) {
              refList.unshift({
                id: jParsed.id || 'OFPHIL-FA-2026-0001',
                patient_id: 'M26-11-00001',
                patient_name: 'Juan Santos Dela Cruz',
                contact: '0917 888 1678',
                diagnosis: jParsed.diagnosis || 'Bilateral Cataract, Senile Mature (OD > OS)',
                procedure: jParsed.procedure || 'Phacoemulsification with Foldable IOL Implant (OD)',
                particulars: jParsed.particulars || [
                  { description: 'Operating Room & Surgical Microscope Fee', amount: 4500 },
                  { description: 'Foldable Acrylic Intraocular Lens (IOL) Pack', amount: 3500 },
                  { description: 'Ophthalmic Viscosurgical Device (OVD) & Consumables', amount: 1800 },
                  { description: 'Post-Operative Med Pack (Moxifloxacin + Prednisolone)', amount: 1800 },
                ],
                total: Number(jParsed.total) || 11600,
                attending_doctor: jParsed.attending_doctor || 'Dr. J. E. Garcia, MD',
                doctor_signature_title: jParsed.doctor_signature_title || 'Attending Eye Surgeon • License No. 0089421',
                referring_individual: jParsed.referring_individual || 'Dr. Roberto Reyes, MD, DPBO',
                referring_signature_title: jParsed.referring_signature_title || 'Clinic Medical Administrator & Ophthalmologist',
                status: jParsed.status || 'ENDORSED FOR FINANCIAL ASSISTANCE',
                created_at: jParsed.created_at || '2026-11-22T08:30:00Z',
              });
            }
          } catch { }
        }
      }

      if (refList.length === 0) {
        refList = [
          {
            id: 'OFPHIL-FA-2026-0001',
            patient_id: 'M26-11-00001',
            patient_name: 'Juan Santos Dela Cruz',
            contact: '0917 888 1678',
            diagnosis: 'Bilateral Cataract, Senile Mature (OD > OS)',
            procedure: 'Phacoemulsification with Foldable IOL Implant (OD)',
            particulars: [
              { description: 'Operating Room & Surgical Microscope Fee', amount: 4500 },
              { description: 'Foldable Acrylic Intraocular Lens (IOL) Pack', amount: 3500 },
              { description: 'Ophthalmic Viscosurgical Device (OVD) & Consumables', amount: 1800 },
              { description: 'Post-Operative Med Pack (Moxifloxacin + Prednisolone)', amount: 1800 },
            ],
            total: 11600,
            attending_doctor: 'Dr. J. E. Garcia, MD',
            doctor_signature_title: 'Attending Eye Surgeon • License No. 0089421',
            referring_individual: 'Dr. Roberto Reyes, MD, DPBO',
            referring_signature_title: 'Clinic Medical Administrator & Ophthalmologist',
            status: 'ENDORSED FOR FINANCIAL ASSISTANCE',
            created_at: '2026-11-22T08:30:00Z',
          },
        ];
      }

      setReferrals(refList);
    } catch (err: any) {
      toast.error('Failed to load registered patients and referral records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientsAndReferrals();
  }, []);

  // Filter Charity Patients
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      if (activeTab === 'pending') {
        if (p.status !== 'PENDING') return false;
      } else if (activeTab === 'promissory') {
        const isPromissory =
          p.status === 'DISAPPROVED/PROMISSORY' ||
          p.status?.includes('PROMISSORY') ||
          p.status?.includes('DISAPPROVED');
        if (!isPromissory) return false;
      }

      if (sexFilter !== 'All' && p.sex !== sexFilter) return false;
      if (statusFilter !== 'All' && p.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
        const pid = (p.patient_id || '').toLowerCase();
        const diag = (p.diagnosis || '').toLowerCase();
        const city = (p.residence_city || '').toLowerCase();
        if (!fullName.includes(q) && !pid.includes(q) && !diag.includes(q) && !city.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [patients, activeTab, sexFilter, statusFilter, searchQuery]);

  // Filter Referrals
  const filteredReferrals = useMemo(() => {
    return referrals.filter((r) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const pid = (r.patient_id || '').toLowerCase();
      const name = (r.patient_name || '').toLowerCase();
      const diag = (r.diagnosis || '').toLowerCase();
      const proc = (r.procedure || '').toLowerCase();
      const refId = (r.id || '').toLowerCase();
      return pid.includes(q) || name.includes(q) || diag.includes(q) || proc.includes(q) || refId.includes(q);
    });
  }, [referrals, searchQuery]);

  // Pagination
  const pageSize = parseInt(rowsPerPage, 10);
  const currentItemsCount = activeTab === 'referrals' ? filteredReferrals.length : filteredPatients.length;
  const totalPages = Math.ceil(currentItemsCount / pageSize) || 1;

  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const paginatedReferrals = filteredReferrals.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // -------------------------------------------------------------
  // IN-PAGE REFERRAL DETAILS VIEW (NOT MODAL)
  // -------------------------------------------------------------
  if (selectedReferral) {
    return (
      <DashboardLayout
        title={`Referral ${selectedReferral.id} · Clinical Dossier`}
        subtitle="Ophthalmological Foundation of the Philippines — Official Clinical Referral for Financial Assistance"
      >
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Top Bar with Back Navigation & Direct Assess Action */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EEF2EF] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setSelectedReferral(null)}
              className="px-4 py-2.5 rounded-xl border border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] text-xs font-bold text-[#10241A] transition flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <i className="fa-solid fa-arrow-left text-[#0B6B3A] text-xs" />
              <span>Back to Referrals Directory</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl border border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] text-xs font-semibold text-[#5A7466] transition flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <i className="fa-solid fa-print text-xs" />
                <span>Print Referral Slip</span>
              </button>
              <Link
                href={`/assessment?patient_id=${selectedReferral.patient_id}`}
                className="px-5 py-2.5 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white text-xs font-bold transition flex items-center gap-2 shadow-xs"
              >
                <i className="fa-solid fa-stethoscope text-xs" />
                <span>Start Social Welfare Assessment</span>
              </Link>
            </div>
          </div>

          {/* Official Referral Slip Dossier Card */}
          <div className="bg-white rounded-2xl border border-[#D5E2D9] shadow-sm p-6 sm:p-8 space-y-6">
            {/* Slip Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#EEF2EF]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-xl shrink-0">
                  <i className="fa-solid fa-file-invoice-dollar" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-[#E8F5EC] text-[#0B6B3A] text-[11px] font-bold uppercase tracking-wider mb-1">
                    <span>Clinical Financial Assistance Referral</span>
                    <span>&bull;</span>
                    <span className="font-mono">{selectedReferral.id}</span>
                  </div>
                  <h2 className="font-['Outfit'] text-2xl font-bold text-[#10241A]">
                    Official Clinical Referral Slip &amp; Endorsement
                  </h2>
                  <p className="text-xs text-[#5A7466] mt-0.5">
                    Endorsed by attending ophthalmic surgeon to Medical Social Work for hospital fee assistance &amp; subsidy evaluation.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-900 border border-amber-300 uppercase tracking-wider inline-flex items-center gap-1.5 self-start">
                <i className="fa-solid fa-handshake-angle text-[10px]" />
                <span>{selectedReferral.status}</span>
              </span>
            </div>

            {/* Patient & Clinical Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF]">
              <div>
                <span className="text-[10.5px] uppercase font-bold text-[#5A7466] block">Referred Patient</span>
                <span className="font-bold text-base text-[#10241A] block mt-0.5">{selectedReferral.patient_name}</span>
                <div className="text-xs text-[#64748B] font-mono mt-1 flex items-center gap-2">
                  <span className="bg-white px-2 py-0.5 rounded border border-[#E2E8F0] font-bold text-[#10241A]">
                    {selectedReferral.patient_id}
                  </span>
                  {selectedReferral.contact && <span>&bull; {selectedReferral.contact}</span>}
                </div>
              </div>

              <div>
                <span className="text-[10.5px] uppercase font-bold text-[#5A7466] block">Referring Clinic Desk</span>
                <span className="font-semibold text-xs text-[#10241A] block mt-0.5">
                  {selectedReferral.referring_individual || 'Clinic Medical Desk'}
                </span>
                <span className="text-[11px] text-[#64748B] block">
                  {selectedReferral.referring_signature_title || 'Clinic Medical Administrator'}
                </span>
              </div>

              <div className="pt-2 border-t border-[#EEF2EF]">
                <span className="text-[10.5px] uppercase font-bold text-[#5A7466] block">Clinical Ophthalmology Diagnosis</span>
                <span className="font-semibold text-sm text-[#10241A] block mt-0.5">{selectedReferral.diagnosis}</span>
              </div>

              <div className="pt-2 border-t border-[#EEF2EF]">
                <span className="text-[10.5px] uppercase font-bold text-[#5A7466] block">Endorsed Procedure / Surgery</span>
                <span className="font-bold text-sm text-[#0B6B3A] block mt-0.5">{selectedReferral.procedure}</span>
                <span className="text-[11px] text-[#64748B] block mt-0.5">
                  Attending Surgeon: {selectedReferral.attending_doctor || 'Attending Ophthalmologist'}
                </span>
              </div>
            </div>

            {/* Itemized Quotation & Particulars Breakdown */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold text-[#10241A] uppercase tracking-wider flex items-center gap-2">
                  <i className="fa-solid fa-list-check text-[#0B6B3A]" />
                  <span>Itemized Hospital &amp; Surgical Fee Breakdown</span>
                </h4>
                <span className="text-[11px] text-[#5A7466]">Approved Clinical Quotation</span>
              </div>

              <div className="border border-[#EEF2EF] rounded-xl overflow-hidden bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-[#FAFBF8] border-b border-[#EEF2EF] text-[#5A7466]">
                    <tr>
                      <th className="py-2.5 px-4 text-left font-bold uppercase text-[10px]">Item Particulars / Description</th>
                      <th className="py-2.5 px-4 text-right font-bold uppercase text-[10px] w-36">Quotation Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2EF]">
                    {(selectedReferral.particulars || []).map((p, idx) => (
                      <tr key={idx} className="hover:bg-[#FAFBF8]">
                        <td className="py-2.5 px-4 text-[#10241A] font-medium">{p.description}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-[#10241A]">
                          ₱{Number(p.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[#E8F5EC]/40 font-bold">
                      <td className="py-3 px-4 text-[#0B6B3A] uppercase tracking-wider text-[11px]">
                        Total Financial Assistance / Subsidy Requested
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-base font-bold text-[#0B6B3A]">
                        ₱{Number(selectedReferral.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Medical Staff Signatures Block (Matching Admin Referral Form Format) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#EEF2EF]">
              <div className="p-4 rounded-xl border border-[#EEF2EF] bg-white space-y-3">
                <div className="text-[10.5px] uppercase font-bold text-[#5A7466]">Attending Doctor :</div>
                <div className="h-9 px-3 border border-[#E2E8F0] rounded-lg bg-[#FAFBF8] flex items-center text-xs font-semibold text-[#10241A]">
                  {selectedReferral.attending_doctor || 'Dr. J. E. Garcia, MD'}
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-[10.5px] uppercase font-bold text-[#5A7466]">Signature:</span>
                  <div className="h-8 px-3 border border-[#E2E8F0] rounded-lg bg-[#FAFBF8] flex items-center text-xs italic font-medium text-[#0B6B3A]">
                    {(selectedReferral as any).doctor_signature || selectedReferral.attending_doctor || 'Dr. J. E. Garcia, MD'}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[#EEF2EF] bg-white space-y-3">
                <div className="text-[10.5px] uppercase font-bold text-[#5A7466]">Referring Individual :</div>
                <div className="h-9 px-3 border border-[#E2E8F0] rounded-lg bg-[#FAFBF8] flex items-center text-xs font-semibold text-[#10241A]">
                  {selectedReferral.referring_individual || 'Dr. Roberto Reyes, MD, DPBO'}
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-[10.5px] uppercase font-bold text-[#5A7466]">Signature:</span>
                  <div className="h-8 px-3 border border-[#E2E8F0] rounded-lg bg-[#FAFBF8] flex items-center text-xs italic font-medium text-[#0B6B3A]">
                    {(selectedReferral as any).referring_signature || selectedReferral.referring_individual || 'Dr. Roberto Reyes, MD, DPBO'}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Proceed CTA */}
            <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[#EEF2EF]">
              <button
                type="button"
                onClick={() => setSelectedReferral(null)}
                className="px-4 py-2.5 rounded-xl border border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] text-xs font-semibold text-[#10241A] transition"
              >
                &larr; Return to Table
              </button>

              <Link
                href={`/assessment?patient_id=${selectedReferral.patient_id}`}
                className="px-6 py-3 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
              >
                <i className="fa-solid fa-stethoscope text-sm" />
                <span>Launch Socioeconomic Intake &amp; Case Study for {selectedReferral.patient_name}</span>
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // -------------------------------------------------------------
  // DIRECTORY VIEW (TABLE OF CHARITY PATIENTS / REFERRALS)
  // -------------------------------------------------------------
  return (
    <DashboardLayout
      title={activeTab === 'referrals' ? 'Referrals for Financial Assistance' : 'Charity Patient Records'}
      subtitle="Ophthalmological Foundation of the Philippines — Clinical Social Services & Charity Directory"
    >
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#EEF2EF] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F5EC] text-[#0B6B3A]">
                Clinical Social Services Directory
              </span>
              <span className="text-xs text-[#64748B]">&bull; Charity Grantees &amp; Financial Assistance Referrals</span>
            </div>
            <h2 className="font-['Outfit'] text-2xl font-bold text-[#10241A]">
              {activeTab === 'referrals'
                ? 'Referrals for Financial Assistance'
                : 'Charity Patient Master Records'}
            </h2>
            <p className="text-xs sm:text-sm text-[#5A7466] mt-0.5">
              {activeTab === 'referrals'
                ? 'Review clinic patients officially endorsed by attending eye surgeons for charity classification and hospital fee assistance.'
                : 'Review registered indigent beneficiaries, launch clinical assessments, and manage social welfare subsidies.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchPatientsAndReferrals}
              className="px-4 py-2.5 rounded-xl border border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] text-xs font-semibold text-[#10241A] transition flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <i className="fa-solid fa-arrows-rotate text-xs text-[#0B6B3A]" />
              <span>Refresh</span>
            </button>

            <Link
              href="/admin/register-patient"
              className="px-4 py-2.5 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
              title="Register new indigent charity beneficiary with dynamic sequential case numbering"
            >
              <i className="fa-solid fa-user-plus text-xs" />
              <span>New Charity Case</span>
            </Link>
          </div>
        </div>

        {/* Directory Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[#EEF2EF] pb-2 overflow-x-auto">
          {[
            {
              id: 'charity',
              label: 'Charity Patients',
              icon: 'fa-hand-holding-heart',
              count: patients.length,
            },
            {
              id: 'referrals',
              label: 'Financial Assistance Referrals',
              icon: 'fa-file-invoice-dollar',
              count: referrals.length,
              badgeColor: 'bg-emerald-100 text-[#0B6B3A] border border-emerald-300 font-extrabold',
            },
            {
              id: 'pending',
              label: 'Pending',
              icon: 'fa-clock',
              count: patients.filter((p) => p.status === 'PENDING').length,
            },
            {
              id: 'promissory',
              label: 'Disapproved / Promissory',
              icon: 'fa-file-signature',
              count: patients.filter(
                (p) =>
                  p.status === 'DISAPPROVED/PROMISSORY' ||
                  p.status?.includes('PROMISSORY') ||
                  p.status?.includes('DISAPPROVED')
              ).length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#0B6B3A] text-white shadow-xs'
                  : 'bg-white text-[#5A7466] hover:bg-[#F8FAFC] border border-[#EEF2EF]'
              }`}
            >
              <i className={`fa-solid ${tab.icon} text-xs ${activeTab === tab.id ? 'text-white' : ''}`} />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === tab.id
                    ? 'bg-white/25 text-white'
                    : tab.badgeColor || 'bg-[#EEF2EF] text-[#334155]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl p-4 border border-[#EEF2EF] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input
              type="text"
              placeholder={
                activeTab === 'referrals'
                  ? 'Search by Referral #, Patient Name, Diagnosis, or Procedure...'
                  : 'Search by Charity Case No. (MSW_FA_1126-XX), Name, Diagnosis, or City...'
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#0B6B3A] focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-3">
            {activeTab !== 'referrals' && (
              <>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#0B6B3A]"
                >
                  <option value="All">Status: All</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="DISAPPROVED/PROMISSORY">DISAPPROVED/PROMISSORY</option>
                  <option value="PENDING">PENDING</option>
                </select>

                <select
                  value={sexFilter}
                  onChange={(e) => {
                    setSexFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#0B6B3A]"
                >
                  <option value="All">Sex: All</option>
                  <option value="M">Male (M)</option>
                  <option value="F">Female (F)</option>
                </select>
              </>
            )}

            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#0B6B3A]"
            >
              <option value="10">10 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
            </select>
          </div>
        </div>

        {/* Directory Tables */}
        <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-20 text-center">
              <i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#0B6B3A] mb-3" />
              <p className="text-xs font-semibold text-[#64748B]">Loading records...</p>
            </div>
          ) : activeTab === 'referrals' ? (
            /* TAB: FINANCIAL ASSISTANCE REFERRALS (LESSENED COLUMNS, 1 BUTTON AT END, CLICKABLE) */
            filteredReferrals.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-[#0B6B3A] border border-emerald-200 flex items-center justify-center mx-auto mb-3 text-2xl">
                  <i className="fa-solid fa-file-invoice" />
                </div>
                <h4 className="text-base font-bold text-[#10241A] mb-1">No Clinical Referrals Found</h4>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto mb-4">
                  There are currently no patients officially endorsed for financial assistance matching your search.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] text-xs font-bold hover:bg-[#D5E6DC] transition cursor-pointer"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm text-[#24352B]">
                  <thead className="bg-[#FAFBF8] text-[#5A7466] text-xs uppercase tracking-wider border-b border-[#EEF2EF]">
                    <tr>
                      <th className="py-3.5 px-6 font-semibold">Referral Slip #</th>
                      <th className="py-3.5 px-6 font-semibold">Referred Patient</th>
                      <th className="py-3.5 px-6 font-semibold">Diagnosis &amp; Procedure</th>
                      <th className="py-3.5 px-6 font-semibold">Quotation / Fee</th>
                      <th className="py-3.5 px-6 font-semibold">Status</th>
                      <th className="py-3.5 px-6 font-semibold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2EF]">
                    {paginatedReferrals.map((ref) => (
                      <tr
                        key={ref.id}
                        className="hover:bg-[#FAFBF8] transition cursor-pointer group"
                        onClick={() => setSelectedReferral(ref)}
                      >
                        <td className="py-4 px-6 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReferral(ref);
                            }}
                            className="font-mono font-bold text-[#0B6B3A] px-2.5 py-1 rounded-md bg-[#E8F5EC] border border-[#A7F3D0] text-[11px] inline-flex items-center gap-1.5 hover:bg-[#D5E6DC] transition cursor-pointer"
                          >
                            <i className="fa-solid fa-file-invoice text-[10px] text-emerald-700" />
                            <span className="underline decoration-dotted">{ref.id}</span>
                          </button>
                        </td>
                        <td className="py-4 px-6 font-medium text-[#10241A] whitespace-nowrap">
                          <div className="font-bold text-[#10241A] group-hover:text-[#0B6B3A] transition">
                            {ref.patient_name}
                          </div>
                          <div className="text-[11px] text-[#64748B] flex items-center gap-1.5 font-mono">
                            <span>{ref.patient_id}</span>
                            {ref.contact && <span>&bull; {ref.contact}</span>}
                          </div>
                        </td>
                        <td className="py-4 px-6 max-w-sm">
                          <div className="font-semibold text-xs text-[#10241A] truncate">{ref.diagnosis}</div>
                          <div className="text-[11px] text-[#0B6B3A] font-medium truncate mt-0.5">{ref.procedure}</div>
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap font-mono font-bold text-[#0B6B3A]">
                          ₱{Number(ref.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-300 uppercase tracking-wider inline-flex items-center gap-1">
                            <i className="fa-solid fa-handshake-angle text-[9.5px]" />
                            <span>{ref.status || 'ENDORSED TO MSW'}</span>
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedReferral(ref)}
                            className="px-3.5 py-1.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white font-semibold text-xs transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            title="View Referral Details Inside Page"
                          >
                            <i className="fa-solid fa-file-invoice text-xs" />
                            <span>View Details</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* TAB: CHARITY PATIENTS MASTERLIST */
            filteredPatients.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center mx-auto mb-3 text-2xl">
                  <i className="fa-solid fa-folder-open" />
                </div>
                <h4 className="text-base font-bold text-[#10241A] mb-1">No Charity Patients Found</h4>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto mb-4">
                  No charity patient records match your current filter parameters or tab selection.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSexFilter('All');
                    setStatusFilter('All');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] text-xs font-bold hover:bg-[#D5E6DC] transition cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm text-[#24352B]">
                  <thead className="bg-[#FAFBF8] text-[#5A7466] text-xs uppercase tracking-wider border-b border-[#EEF2EF]">
                    <tr>
                      <th className="py-3.5 px-6 font-semibold">{activeTab === 'charity' ? 'Charity No. (MSW)' : 'Patient ID'}</th>
                      <th className="py-3.5 px-6 font-semibold">Patient Name</th>
                      <th className="py-3.5 px-6 font-semibold">Age / Sex</th>
                      <th className="py-3.5 px-6 font-semibold">Residence</th>
                      <th className="py-3.5 px-6 font-semibold">Diagnosis</th>
                      <th className="py-3.5 px-6 font-semibold">Status</th>
                      <th className="py-3.5 px-6 font-semibold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2EF]">
                    {paginatedPatients.map((p) => (
                      <tr key={p.id || p.patient_id} className="hover:bg-[#FAFBF8] transition">
                        <td className="py-4 px-6 font-mono font-bold text-[#10241A] whitespace-nowrap">
                          {p.patient_id}
                        </td>
                        <td className="py-4 px-6 font-medium text-[#10241A] whitespace-nowrap">
                          <div className="font-bold text-[#10241A]">
                            {p.first_name} {p.last_name}
                          </div>
                          <div className="text-[11px] text-[#64748B]">{p.contact || 'No phone recorded'}</div>
                        </td>
                        <td className="py-4 px-6 text-[#5A7466] whitespace-nowrap">
                          {p.age ?? '—'} yrs &bull; {p.sex}
                        </td>
                        <td className="py-4 px-6 text-[#10241A] whitespace-nowrap">
                          <div className="text-xs font-medium">{p.residence_city || 'Metro Manila'}</div>
                          <div className="text-[10.5px] text-[#64748B]">{p.residence_region || 'NCR'}</div>
                        </td>
                        <td className="py-4 px-6 text-[#10241A] max-w-xs truncate">
                          {p.diagnosis || 'Cataract / Refractive Error'}
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider inline-flex items-center gap-1 ${
                              p.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : p.status === 'DISAPPROVED/PROMISSORY' ||
                                  p.status?.includes('PROMISSORY') ||
                                  p.status?.includes('DISAPPROVED')
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {p.status === 'APPROVED' && <i className="fa-solid fa-circle-check text-[9px] text-emerald-600" />}
                            {(p.status === 'DISAPPROVED/PROMISSORY' ||
                              p.status?.includes('PROMISSORY') ||
                              p.status?.includes('DISAPPROVED')) && (
                              <i className="fa-solid fa-file-signature text-[9px] text-rose-600" />
                            )}
                            {p.status === 'PENDING' && <i className="fa-solid fa-clock text-[9px] text-amber-600" />}
                            <span>{p.status || 'PENDING'}</span>
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center whitespace-nowrap">
                          {(() => {
                            const asmt = assessmentsByPatient[p.patient_id];
                            const ws = asmt?.workflow_status;
                            const isDraft = ws === 'DRAFT' || ws === 'ASSESSMENT_IN_PROGRESS' || ws === 'RETURNED_FOR_REVISION';
                            const isReview = ws === 'PENDING_DOCUMENT_REVIEW' || ws === 'PENDING_MSW_REVIEW' || ws === 'PENDING_APPROVAL';
                            const isDone = ws === 'APPROVED' || ws === 'REJECTED';
                            const label = isDraft
                              ? 'Continue Assessment'
                              : isReview
                                ? 'View / Review'
                                : isDone
                                  ? 'View Assessment'
                                  : 'Assess';
                            const href = asmt?.id
                              ? `/assessment?patient_id=${encodeURIComponent(p.patient_id)}&assessment_id=${encodeURIComponent(asmt.id)}`
                              : `/assessment?patient_id=${encodeURIComponent(p.patient_id)}`;
                            return (
                              <Link
                                href={href}
                                className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                                  isDone || isReview
                                    ? 'bg-white border border-[#0B6B3A] text-[#0B6B3A] hover:bg-[#E8F5EC]'
                                    : 'bg-[#0B6B3A] hover:bg-[#064826] text-white'
                                }`}
                                title={label}
                              >
                                <i className={`fa-solid ${isDone || isReview ? 'fa-eye' : isDraft ? 'fa-pen-to-square' : 'fa-stethoscope'} text-[10px]`} />
                                <span>{label}</span>
                              </Link>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Pagination Footer */}
          <div className="px-6 py-4 bg-[#FAFBF8] border-t border-[#EEF2EF] flex items-center justify-between text-xs text-[#5A7466]">
            <div>
              Showing {currentItemsCount > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, currentItemsCount)} of {currentItemsCount} records
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-[#D5E2D9] bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FAFBF8] transition"
              >
                Previous
              </button>
              <span className="font-semibold text-[#10241A]">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-[#D5E2D9] bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FAFBF8] transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default MSWPatientsContent;
