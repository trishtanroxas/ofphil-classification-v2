'use client';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useLoadingScreen } from '@/context/LoadingScreenContext';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';

export interface PatientRecordItem {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  age: number | null;
  sex: 'M' | 'F';
  residence_city: string;
  residence_region: string;
  contact: string;
  category: 'CHARITY' | 'REGULAR';
  status: 'APPROVED' | 'FIRST-TIME' | 'PENDING' | 'DISAPPROVED/PROMISSORY' | string;
  email?: string;
  civil_status?: string;
  birthdate?: string;
  diagnosis?: string;
  assigned_msw?: string;
  registration_date?: string;
  has_account?: boolean;
}

export default function PatientRecordsPage(props: any) {
  const initialTab = props?.initialTab;
  const router = useRouter();
  const { role } = useAuth();
  const { startProgress } = useLoadingScreen();
  const searchParams = useSearchParams();
  const tabFromQuery = searchParams?.get('tab');

  const defaultTab = initialTab || (
    tabFromQuery === 'charity'
      ? 'charity'
      : tabFromQuery === 'regular' || tabFromQuery === 'non-charity'
        ? 'regular'
        : tabFromQuery === 'with-accounts' || tabFromQuery === 'accounts'
          ? 'with-accounts'
          : 'all'
  );

  const [patients, setPatients] = useState<PatientRecordItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'charity' | 'regular' | 'with-accounts'>(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [sexFilter, setSexFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [rowsPerPage, setRowsPerPage] = useState('10');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize tab if prop or URL query updates
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (tabFromQuery === 'charity') {
      setActiveTab('charity');
    } else if (tabFromQuery === 'regular' || tabFromQuery === 'non-charity') {
      setActiveTab('regular');
    } else if (tabFromQuery === 'with-accounts' || tabFromQuery === 'accounts') {
      setActiveTab('with-accounts');
    }
  }, [initialTab, tabFromQuery]);

  // Reset category filter and inapplicable status filters when switching to specific tabs
  useEffect(() => {
    if (activeTab === 'regular' || activeTab === 'charity') {
      setCategoryFilter('All');
    }
    if (activeTab === 'regular' && (statusFilter === 'DISAPPROVED/PROMISSORY' || statusFilter === 'PENDING')) {
      setStatusFilter('All');
    }
    if (activeTab === 'charity' && statusFilter === 'FIRST-TIME') {
      setStatusFilter('All');
    }
  }, [activeTab]);

  // Load patients from backend API
  useEffect(() => {
    async function loadPatients() {
      setIsLoading(true);
      try {
        const data = await fetchApi('/patients');
        if (Array.isArray(data)) {
          setPatients(data);
        }
      } catch (err: any) {
        console.warn('Failed to fetch patients from API, using clean state:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadPatients();
  }, []);

  // Filter logic
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      // Tab filter
      if (activeTab === 'charity' && p.category !== 'CHARITY') return false;
      if (activeTab === 'regular' && p.category !== 'REGULAR') return false;
      if (activeTab === 'with-accounts') {
        const hasAcct = p.has_account === true && p.category !== 'CHARITY';
        if (!hasAcct) return false;
      }

      // Dropdown filters
      if (sexFilter !== 'All' && p.sex !== sexFilter) return false;
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (statusFilter !== 'All' && p.status !== statusFilter) return false;

      // Search text
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesId = p.patient_id.toLowerCase().includes(query);
        const matchesName = `${p.first_name} ${p.last_name}`.toLowerCase().includes(query);
        const matchesCity = p.residence_city.toLowerCase().includes(query);
        return matchesId || matchesName || matchesCity;
      }
      return true;
    });
  }, [patients, activeTab, sexFilter, categoryFilter, statusFilter, searchQuery]);

  // Dynamic counts
  const totalCount = patients.length;
  const charityCount = patients.filter((p) => p.category === 'CHARITY').length;
  const regularCount = patients.filter((p) => p.category === 'REGULAR').length;
  const withAccountsCount = patients.filter((p) => p.has_account === true && p.category !== 'CHARITY').length;

  // CSV Export
  const handleExportCSV = () => {
    if (patients.length === 0) {
      toast.info('No patient records to export.');
      return;
    }
    const headers = ['Patient ID', 'First Name', 'Last Name', 'Age', 'Sex', 'City', 'Region', 'Contact', 'Category', 'Status'];
    const rows = patients.map((p) => [
      p.patient_id,
      p.first_name,
      p.last_name,
      p.age ?? '',
      p.sex,
      p.residence_city,
      p.residence_region,
      p.contact,
      p.category,
      p.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ofphil_patients_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Patient records exported to CSV');
  };

  // CSV / Excel File Import handler
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        toast.error('Imported file contains no data rows.');
        return;
      }

      const importedList: PatientRecordItem[] = [];
      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length >= 2) {
          const rawCat = cols[8]?.toUpperCase();
          const category: 'CHARITY' | 'REGULAR' = rawCat === 'REGULAR' || rawCat === 'NON-CHARITY' ? 'REGULAR' : 'CHARITY';
          importedList.push({
            id: `imported-${Date.now()}-${i}`,
            patient_id: cols[0] || `M26-11-${String(i).padStart(5, '0')}`,
            first_name: cols[1] || 'PATIENT',
            last_name: cols[2] || '',
            age: cols[3] && !isNaN(Number(cols[3])) ? Number(cols[3]) : null,
            sex: cols[4] === 'M' || cols[4] === 'Male' ? 'M' : 'F',
            residence_city: cols[5] || 'Metro Manila',
            residence_region: cols[6] || 'NCR City',
            contact: cols[7] || '0917 000 0000',
            category: category,
            status: cols[9]?.toUpperCase() === 'APPROVED' ? 'APPROVED' : 'FIRST-TIME',
          });
        }
      }

      if (importedList.length > 0) {
        setPatients((prev) => [...prev, ...importedList]);
        toast.success(`Successfully imported ${importedList.length} patient record(s)!`);
      } else {
        toast.error('Could not parse valid patient records from the file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getPageTitle = () => {
    if (activeTab === 'charity') return 'Charity Patient Records Directory';
    if (activeTab === 'regular') return 'Regular Patient Records Directory';
    if (activeTab === 'with-accounts') return 'Registered Patient Accounts Directory';
    return 'Patient Records Directory';
  };

  const getPageSubtitle = () => {
    if (activeTab === 'charity') {
      return 'Ophthalmological Foundation of the Philippines — Subsidized & Indigent Eye Surgery Beneficiaries';
    }
    if (activeTab === 'regular') {
      return 'Ophthalmological Foundation of the Philippines — Private & Direct Clinical Patients';
    }
    if (activeTab === 'with-accounts') {
      return 'Ophthalmological Foundation of the Philippines — Patients with Active Portal Accounts & Digital Records';
    }
    return 'Ophthalmological Foundation of the Philippines — Patient Master Registry & Clinical Directory';
  };

  return (
    <DashboardLayout title={getPageTitle()} subtitle={getPageSubtitle()}>
      <div className="space-y-4 text-xs font-sans">
        {/* Hidden File Input for CSV / Excel */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,.xls,.xlsx"
          className="hidden"
          onChange={handleImportFile}
        />

        {/* Compact Top Header Bar */}
        <div className="bg-white border border-[#D5E2D9] rounded-xl px-5 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="font-['Outfit'] text-base font-bold text-[#10241A] flex items-center gap-2 m-0">
              <i className="fa-solid fa-address-book text-[#0B6B3A] text-sm" />
              <span>
                {activeTab === 'charity'
                  ? 'Charity Patients Masterlist'
                  : activeTab === 'regular'
                    ? 'Regular Patients Masterlist'
                    : activeTab === 'with-accounts'
                      ? 'Patients with Active Portal Accounts'
                      : 'Registered Patient Database'}
              </span>
            </h2>
            <span className="text-[11px] text-[#5A7466] border-l border-[#D5E2D9] pl-3 hidden sm:inline">
              Authoritative Master Registry
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer ${activeTab === 'all'
                ? 'bg-[#E8F5EC] border-[#0B6B3A] text-[#0B6B3A]'
                : 'border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] text-[#10241A]'
                }`}
            >
              <i className="fa-solid fa-table-list text-xs" />
              <span>Masterlist</span>
            </button>

            {/* Directs to /admin/register-patient */}
            <Link
              href="/admin/register-patient"
              className="px-4 py-1.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white font-semibold flex items-center gap-1.5 transition shadow-2xs no-underline"
            >
              <i className="fa-solid fa-user-plus text-xs" />
              <span>Register Patient</span>
            </Link>

            {/* CSV Export Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 rounded-lg border border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] font-semibold text-[#10241A] flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              title="Export CSV"
            >
              <i className="fa-solid fa-file-csv text-xs" />
              <span>CSV</span>
            </button>

            {/* Import Button (CSV / Excel) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-lg border border-[#0B6B3A] bg-[#E8F5EC] hover:bg-[#D5E2D9] font-semibold text-[#0B6B3A] flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              title="Import CSV or Excel files"
            >
              <i className="fa-solid fa-file-import text-xs" />
              <span>Import</span>
            </button>
          </div>
        </div>

        {/* Compact Metrics Strip */}
        <div className="bg-white border border-[#D5E2D9] rounded-xl px-5 py-2.5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2 font-medium text-[#5A7466]">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              <span>
                Total: <strong className="text-[#10241A] font-bold">{totalCount}</strong>
              </span>
            </span>
            <span className="flex items-center gap-2 font-medium text-[#5A7466]">
              <span className="w-2 h-2 rounded-full bg-[#0B6B3A] inline-block" />
              <span>
                Charity: <strong className="text-[#10241A] font-bold">{charityCount}</strong>
              </span>
            </span>
            <span className="flex items-center gap-2 font-medium text-[#5A7466]">
              <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
              <span>
                Regular: <strong className="text-[#10241A] font-bold">{regularCount}</strong>
              </span>
            </span>
            <span className="flex items-center gap-2 font-medium text-[#5A7466]">
              <span className="w-2 h-2 rounded-full bg-[#2563EB] inline-block" />
              <span>
                With Accounts: <strong className="text-[#10241A] font-bold">{withAccountsCount}</strong>
              </span>
            </span>
          </div>

          <div className="text-[11.5px] text-[#5A7466]">
            Database Status: <strong className="text-[#0B6B3A] font-bold text-xs">Live Synchronized</strong>
          </div>
        </div>

        {/* Filter Tabs & Search Bar Container */}
        <div className="bg-white border border-[#D5E2D9] rounded-xl shadow-xs overflow-hidden">
          {/* Tabs Bar */}
          <div className="px-5 py-2.5 border-b border-[#EEF2EF] flex flex-wrap items-center justify-between gap-3 bg-[#FAFBF8]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  startProgress();
                  setActiveTab('all');
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition text-xs cursor-pointer border ${activeTab === 'all'
                  ? 'bg-[#E8F5EC] border-[#0B6B3A] text-[#0B6B3A] font-bold shadow-xs'
                  : 'border-transparent text-[#5A7466] hover:text-[#10241A] hover:bg-white'
                  }`}
              >
                <i className="fa-solid fa-users text-xs" />
                <span>All Patients</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'all' ? 'bg-[#0B6B3A] text-white' : 'bg-white border border-[#D5E2D9]'}`}>
                  {totalCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  startProgress();
                  setActiveTab('charity');
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition text-xs cursor-pointer border ${activeTab === 'charity'
                  ? 'bg-[#E8F5EC] border-[#0B6B3A] text-[#0B6B3A] font-bold shadow-xs'
                  : 'border-transparent text-[#5A7466] hover:text-[#10241A] hover:bg-white'
                  }`}
              >
                <i className="fa-solid fa-hand-holding-heart text-xs" />
                <span>Charity Patients</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'charity' ? 'bg-[#0B6B3A] text-white' : 'bg-white border border-[#D5E2D9]'}`}>
                  {charityCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  startProgress();
                  setActiveTab('regular');
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition text-xs cursor-pointer border ${activeTab === 'regular'
                  ? 'bg-[#E8F5EC] border-[#0B6B3A] text-[#0B6B3A] font-bold shadow-xs'
                  : 'border-transparent text-[#5A7466] hover:text-[#10241A] hover:bg-white'
                  }`}
              >
                <i className="fa-solid fa-user-shield text-xs" />
                <span>Regular Patients</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'regular' ? 'bg-[#0B6B3A] text-white' : 'bg-white border border-[#D5E2D9]'}`}>
                  {regularCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  startProgress();
                  setActiveTab('with-accounts');
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition text-xs cursor-pointer border ${activeTab === 'with-accounts'
                  ? 'bg-[#E8F5EC] border-[#0B6B3A] text-[#0B6B3A] font-bold shadow-xs'
                  : 'border-transparent text-[#5A7466] hover:text-[#10241A] hover:bg-white'
                  }`}
              >
                <i className="fa-solid fa-id-badge text-xs text-[#2563EB]" />
                <span>With Accounts</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'with-accounts' ? 'bg-[#0B6B3A] text-white' : 'bg-white border border-[#D5E2D9]'}`}>
                  {withAccountsCount}
                </span>
              </button>
            </div>

          {/* Quick Search */}
          <div className="relative min-w-[220px]">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input
              type="text"
              placeholder="Search patient, ID, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]"
            />
          </div>
        </div>

        {/* Masterlist Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#FAFBF8] text-[#5A7466] uppercase text-[10.5px] tracking-wider border-b border-[#EEF2EF]">
              <tr>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap"># Patient ID</th>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Patient Name</th>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Age</th>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">
                  Sex:{' '}
                  <select
                    value={sexFilter}
                    onChange={(e) => setSexFilter(e.target.value)}
                    className="ml-1 text-[10px] bg-transparent border-0 font-bold text-[#10241A] focus:outline-none cursor-pointer"
                  >
                    <option value="All">All ▼</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                </th>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Residence</th>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Contact</th>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">
                  {activeTab === 'charity' || activeTab === 'regular' ? (
                    <span>Category</span>
                  ) : (
                    <>
                      Category:{' '}
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="ml-1 text-[10.5px] bg-[#FAFBF8] border border-[#CBD5E1] rounded px-1.5 py-0.5 font-bold text-[#10241A] focus:outline-none focus:border-[#0B6B3A] cursor-pointer"
                      >
                        <option value="All">All ▼</option>
                        <option value="CHARITY">Charity</option>
                        <option value="REGULAR">Regular</option>
                      </select>
                    </>
                  )}
                </th>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">
                  Status:{' '}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="ml-1 text-[10px] bg-transparent border-0 font-bold text-[#10241A] focus:outline-none cursor-pointer"
                  >
                    <option value="All">All ▼</option>
                    <option value="APPROVED">Approved</option>
                    {activeTab !== 'regular' && (
                      <>
                        <option value="DISAPPROVED/PROMISSORY">Disapproved / Promissory</option>
                        <option value="PENDING">Pending</option>
                      </>
                    )}
                    {activeTab !== 'charity' && (
                      <option value="FIRST-TIME">First-Time</option>
                    )}
                  </select>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2EF]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#64748B]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <i className="fa-solid fa-circle-notch fa-spin text-lg text-[#0B6B3A]" />
                      <span className="font-semibold text-xs text-[#334155]">Loading patient records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#64748B]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-[#F1F5F9] text-[#94A3B8] flex items-center justify-center text-lg">
                        <i className="fa-solid fa-folder-open" />
                      </div>
                      <span className="font-semibold text-sm text-[#334155]">
                        {activeTab === 'charity'
                          ? 'No Charity Patient Records Found'
                          : activeTab === 'regular'
                            ? 'No Regular Patient Records Found'
                            : activeTab === 'with-accounts'
                              ? 'No Patients with Active Accounts Found'
                              : 'No Patient Records Found'}
                      </span>
                      <p className="text-xs text-[#94A3B8] max-w-sm m-0">
                        Click <strong>Register Patient</strong> to create an account or <strong>Import</strong> to upload a CSV/Excel sheet.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((p) => {
                  const initials = `${p.first_name.charAt(0)}${p.last_name.charAt(0)}`;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => {
                        startProgress();
                        router.push(`/admin/patient-records/${p.patient_id}`);
                      }}
                      className="hover:bg-[#EBF5EE] transition cursor-pointer group"
                      title={`Open Beneficiary Profile & Clinical Assistance Dossier for ${p.last_name}, ${p.first_name}`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#10241A] whitespace-nowrap">
                        <Link
                          href={`/admin/patient-records/${p.patient_id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            startProgress();
                          }}
                          className="px-2 py-0.5 rounded bg-[#FAFBF8] border border-[#D5E2D9] group-hover:border-[#0B6B3A] group-hover:bg-white text-[#0B6B3A] font-semibold transition inline-flex items-center gap-1.5 hover:underline"
                          title={`Open ${p.patient_id} Dossier`}
                        >
                          <span>{p.patient_id}</span>
                          <i className="fa-solid fa-arrow-up-right-from-square text-[9px] text-[#0B6B3A]" />
                        </Link>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#E6F1EA] text-[#0B6B3A] font-bold text-[10px] flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <Link
                            href={`/admin/patient-records/${p.patient_id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              startProgress();
                            }}
                            className="font-semibold text-[#10241A] group-hover:text-[#0B6B3A] transition hover:underline"
                            title={`Open full dossier for ${p.last_name}, ${p.first_name}`}
                          >
                            {p.last_name}, {p.first_name}
                          </Link>
                          {p.has_account === true && p.category !== 'CHARITY' && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200"
                              title="Active Patient Portal Account Provisioned"
                            >
                              <i className="fa-solid fa-id-badge text-[9px]" />
                              <span>Account</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#5A7466] whitespace-nowrap">
                        {p.age !== null ? p.age : '—'}
                      </td>
                      <td className="py-3 px-4 text-[#5A7466] whitespace-nowrap">
                        {p.sex}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-[#10241A]">{p.residence_city}</div>
                        <div className="text-[10px] text-[#5A7466]">{p.residence_region}</div>
                      </td>
                      <td className="py-3 px-4 text-[#5A7466] font-mono whitespace-nowrap">
                        {p.contact}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {p.category === 'CHARITY' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F5EC] text-[#0B6B3A] border border-[#A8DAC0]">
                            <i className="fa-solid fa-heart text-[8px]" />
                            <span>CHARITY</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAFBF8] text-[#475569] border border-[#D5E2D9]">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block" />
                            <span>REGULAR</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {p.status === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <i className="fa-solid fa-check text-[9px]" />
                            <span>APPROVED</span>
                          </span>
                        ) : p.status === 'DISAPPROVED/PROMISSORY' ||
                          p.status?.includes('PROMISSORY') ||
                          p.status?.includes('DISAPPROVED') ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <i className="fa-solid fa-file-signature text-[9px] text-rose-600" />
                            <span>DISAPPROVED / PROMISSORY</span>
                          </span>
                        ) : p.status === 'PENDING' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <i className="fa-solid fa-clock text-[9px] text-amber-600" />
                            <span>PENDING</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 inline-block" />
                            <span>{p.status || 'FIRST-TIME'}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Green Visual Divider Line */}
        <div className="h-1 bg-[#0B6B3A] w-full" />
      </div>
      </div>
    </DashboardLayout>
  );
}
