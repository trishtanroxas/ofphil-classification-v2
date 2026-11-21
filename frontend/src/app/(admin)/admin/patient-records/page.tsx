'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';

interface PatientRecordItem {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  age: number | null;
  sex: 'M' | 'F';
  residence_city: string;
  residence_region: string;
  contact: string;
  category: 'CHARITY' | 'NON-CHARITY';
  status: 'APPROVED' | 'FIRST-TIME';
}

const SAMPLE_MASTERLIST: PatientRecordItem[] = [
  {
    id: '1',
    patient_id: 'PID-TEST-ROUTE-01',
    first_name: 'JUAN',
    last_name: 'DELA CRUZ',
    age: null,
    sex: 'M',
    residence_city: 'Manila',
    residence_region: 'NCR City',
    contact: '09171112222',
    category: 'NON-CHARITY',
    status: 'FIRST-TIME',
  },
  {
    id: '2',
    patient_id: 'PAT-TEST-STAGE2-Q',
    first_name: 'EDUARDO R.',
    last_name: 'RAMOS',
    age: 62,
    sex: 'M',
    residence_city: 'Pasig City',
    residence_region: 'NCR City',
    contact: '0917 123 4567',
    category: 'CHARITY',
    status: 'APPROVED',
  },
  {
    id: '3',
    patient_id: 'PAT-TEST-001',
    first_name: 'JUAN D.',
    last_name: 'CRUZ',
    age: 58,
    sex: 'M',
    residence_city: 'Pasig City',
    residence_region: 'NCR City',
    contact: '0917 555 1234',
    category: 'CHARITY',
    status: 'APPROVED',
  },

  {
    id: '6',
    patient_id: 'H26-10-0038',
    first_name: 'TRISHTAN ALEXIS L.',
    last_name: 'ROXAS',
    age: null,
    sex: 'M',
    residence_city: 'Manila',
    residence_region: 'NCR City',
    contact: '09668353508',
    category: 'CHARITY',
    status: 'APPROVED',
  },
  {
    id: '7',
    patient_id: 'PAT-FEB-56',
    first_name: 'CORAZON',
    last_name: 'FEBRA',
    age: 56,
    sex: 'F',
    residence_city: 'Region III (Central Luzon)',
    residence_region: 'Provincial Region',
    contact: '9612472591',
    category: 'NON-CHARITY',
    status: 'FIRST-TIME',
  },
  {
    id: '8',
    patient_id: 'PAT-SOLOMON-70',
    first_name: 'ELMA',
    last_name: 'SOLOMON',
    age: 70,
    sex: 'F',
    residence_city: 'Caloocan City',
    residence_region: 'NCR City',
    contact: '0959558234',
    category: 'NON-CHARITY',
    status: 'FIRST-TIME',
  },
  {
    id: '9',
    patient_id: 'PAT-SICAT-60',
    first_name: 'FERDINAND',
    last_name: 'SICAT',
    age: 60,
    sex: 'M',
    residence_city: 'Marikina City',
    residence_region: 'NCR City',
    contact: '9614330675',
    category: 'NON-CHARITY',
    status: 'FIRST-TIME',
  },

];

export default function PatientRecordsPage() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'charity' | 'non-charity'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sexFilter, setSexFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [rowsPerPage, setRowsPerPage] = useState('10');

  // Filter logic
  const filteredPatients = useMemo(() => {
    return SAMPLE_MASTERLIST.filter((p) => {
      // Tab filter
      if (activeTab === 'charity' && p.category !== 'CHARITY') return false;
      if (activeTab === 'non-charity' && p.category !== 'NON-CHARITY') return false;

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
  }, [activeTab, sexFilter, categoryFilter, statusFilter, searchQuery]);

  // Counts
  const totalCount = 99;
  const charityCount = 77;
  const nonCharityCount = 22;

  return (
    <DashboardLayout
      title="Patient Records Directory"
      subtitle="Ophthalmological Foundation of the Philippines — AI-Assisted Patient Intake & Evaluation"
    >
      <div className="space-y-4 text-xs font-sans">
        {/* Compact Top Header Bar */}
        <div className="bg-white border border-[#D5E2D9] rounded-xl px-5 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="font-['Outfit'] text-base font-bold text-[#10241A] flex items-center gap-2 m-0">
              <i className="fa-solid fa-address-book text-[#0B6B3A] text-sm" />
              <span>Patient Records Directory</span>
            </h2>
            <span className="text-[11px] text-[#5A7466] bg-[#FAFBF8] px-2.5 py-0.5 rounded-full border border-[#D5E2D9]">
              All Patients • Charity • Non-Charity
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg border border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] font-semibold text-[#10241A] flex items-center gap-1.5 transition shadow-2xs"
            >
              <i className="fa-solid fa-table-list text-[#0B6B3A] text-xs" />
              <span>Masterlist</span>
            </button>
            <Link
              href="/assessment"
              className="px-4 py-1.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white font-semibold flex items-center gap-1.5 transition shadow-2xs"
            >
              <i className="fa-solid fa-user-plus text-xs" />
              <span>Register Patient</span>
            </Link>
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg border border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] font-semibold text-[#10241A] flex items-center gap-1.5 transition shadow-2xs"
            >
              <i className="fa-solid fa-file-csv text-xs" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Compact Metrics Strip */}
        <div className="bg-white border border-[#D5E2D9] rounded-xl px-5 py-2.5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2 font-medium text-[#5A7466]">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              <span>Total: <strong className="text-[#10241A] font-bold">{totalCount}</strong></span>
            </span>
            <span className="flex items-center gap-2 font-medium text-[#5A7466]">
              <span className="w-2 h-2 rounded-full bg-[#0B6B3A] inline-block" />
              <span>Charity: <strong className="text-[#10241A] font-bold">{charityCount} (77.8%)</strong></span>
            </span>
            <span className="flex items-center gap-2 font-medium text-[#5A7466]">
              <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
              <span>Non-Charity: <strong className="text-[#10241A] font-bold">{nonCharityCount} (22.2%)</strong></span>
            </span>
          </div>

          <div className="text-[11.5px] text-[#5A7466]">
            Assistance Granted: <strong className="text-[#0B6B3A] font-bold text-xs">₱777,477.00</strong>
          </div>
        </div>

        {/* Filter Tabs & Search Bar Container */}
        <div className="bg-white border border-[#D5E2D9] rounded-xl shadow-xs overflow-hidden">
          {/* Tabs Bar */}
          <div className="px-5 py-2.5 border-b border-[#EEF2EF] flex flex-wrap items-center justify-between gap-3 bg-[#FAFBF8]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition text-xs ${
                  activeTab === 'all'
                    ? 'bg-[#E8F5EC] text-[#0B6B3A] font-bold'
                    : 'text-[#5A7466] hover:text-[#10241A]'
                }`}
              >
                <i className="fa-solid fa-users text-xs" />
                <span>All Patients</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white border border-[#D5E2D9]">
                  {totalCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('charity')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition text-xs ${
                  activeTab === 'charity'
                    ? 'bg-[#E8F5EC] text-[#0B6B3A] font-bold'
                    : 'text-[#5A7466] hover:text-[#10241A]'
                }`}
              >
                <i className="fa-solid fa-hand-holding-heart text-xs" />
                <span>Charity</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#E8F5EC] text-[#0B6B3A] font-bold">
                  {charityCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('non-charity')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition text-xs ${
                  activeTab === 'non-charity'
                    ? 'bg-[#E8F5EC] text-[#0B6B3A] font-bold'
                    : 'text-[#5A7466] hover:text-[#10241A]'
                }`}
              >
                <i className="fa-solid fa-user-shield text-xs" />
                <span>Non-Charity</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-[#5A7466]">
                  {nonCharityCount}
                </span>
              </button>
            </div>

            {/* Search and Pagination Header Controls */}
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" />
                <input
                  type="text"
                  placeholder="Search name, ID, diagnosis, d..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-56 h-8 pl-8 pr-3 text-xs border border-[#D5E2D9] rounded-lg bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                />
              </div>

              <div className="flex items-center border border-[#D5E2D9] rounded-lg overflow-hidden bg-white">
                <button type="button" className="px-2 py-1 hover:bg-[#FAFBF8] text-gray-600 border-r border-[#D5E2D9]">
                  <i className="fa-solid fa-chevron-left text-[10px]" />
                </button>
                <button type="button" className="px-2 py-1 hover:bg-[#FAFBF8] text-gray-600">
                  <i className="fa-solid fa-chevron-right text-[10px]" />
                </button>
              </div>

              <span className="text-[11px] text-[#5A7466] whitespace-nowrap">
                Showing 1-10 of 99 records
              </span>
            </div>
          </div>

          {/* Masterlist Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#FAFBF8] text-[#5A7466] uppercase text-[10.5px] tracking-wider border-b border-[#EEF2EF]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold whitespace-nowrap">
                    # Patient ID <i className="fa-solid fa-sort ml-1 text-gray-400 text-[9px]" />
                  </th>
                  <th className="py-2.5 px-4 font-semibold whitespace-nowrap">
                    Patient Name <i className="fa-solid fa-sort ml-1 text-gray-400 text-[9px]" />
                  </th>
                  <th className="py-2.5 px-4 font-semibold whitespace-nowrap">
                    Age <i className="fa-solid fa-sort ml-1 text-gray-400 text-[9px]" />
                  </th>
                  <th className="py-2.5 px-4 font-semibold whitespace-nowrap">
                    Sex: 
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
                  <th className="py-2.5 px-4 font-semibold whitespace-nowrap">
                    Residence: 
                    <span className="ml-1 text-[10px] font-bold text-[#10241A]">All ▼</span>
                  </th>
                  <th className="py-2.5 px-4 font-semibold whitespace-nowrap">
                    Contact
                  </th>
                  <th className="py-2.5 px-4 font-semibold whitespace-nowrap">
                    Category: 
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="ml-1 text-[10px] bg-transparent border-0 font-bold text-[#10241A] focus:outline-none cursor-pointer"
                    >
                      <option value="All">All ▼</option>
                      <option value="CHARITY">Charity</option>
                      <option value="NON-CHARITY">Non-Charity</option>
                    </select>
                  </th>
                  <th className="py-2.5 px-4 font-semibold whitespace-nowrap">
                    Status: 
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="ml-1 text-[10px] bg-transparent border-0 font-bold text-[#10241A] focus:outline-none cursor-pointer"
                    >
                      <option value="All">All ▼</option>
                      <option value="APPROVED">Approved</option>
                      <option value="FIRST-TIME">First-Time</option>
                    </select>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2EF]">
                {filteredPatients.map((p) => {
                  const initials = `${p.first_name.charAt(0)}${p.last_name.charAt(0)}`;
                  return (
                    <tr key={p.id} className="hover:bg-[#FAFBF8] transition">
                      {/* Patient ID */}
                      <td className="py-3 px-4 font-mono font-bold text-[#10241A] whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-[#FAFBF8] border border-[#EEF2EF]">
                          {p.patient_id}
                        </span>
                      </td>

                      {/* Patient Name with Avatar Initials */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#E6F1EA] text-[#0B6B3A] font-bold text-[10px] flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <span className="font-semibold text-[#10241A]">
                            {p.last_name}, {p.first_name}
                          </span>
                        </div>
                      </td>

                      {/* Age */}
                      <td className="py-3 px-4 text-[#5A7466] whitespace-nowrap">
                        {p.age !== null ? p.age : '—'}
                      </td>

                      {/* Sex */}
                      <td className="py-3 px-4 text-[#5A7466] whitespace-nowrap">
                        {p.sex}
                      </td>

                      {/* Residence */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-[#10241A]">{p.residence_city}</div>
                        <div className="text-[10px] text-[#5A7466]">{p.residence_region}</div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4 text-[#5A7466] font-mono whitespace-nowrap">
                        {p.contact}
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {p.category === 'CHARITY' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F5EC] text-[#0B6B3A]">
                            <i className="fa-solid fa-heart text-[8px]" />
                            <span>CHARITY</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAFBF8] text-[#475569] border border-[#D5E2D9]">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block" />
                            <span>NON-CHARITY</span>
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {p.status === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <i className="fa-solid fa-check text-[9px]" />
                            <span>APPROVED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 inline-block" />
                            <span>FIRST-TIME</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Green Visual Divider Line */}
          <div className="h-1 bg-[#0B6B3A] w-full" />

          {/* Bottom Pagination Bar */}
          <div className="px-5 py-3 border-t border-[#EEF2EF] flex flex-wrap items-center justify-between gap-3 text-xs bg-[#FAFBF8]">
            <div className="flex items-center gap-2 text-[#5A7466]">
              <span>Showing 1–10 of 99 records</span>
              <span className="text-gray-300">|</span>
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(e.target.value)}
                className="h-7 px-2 border border-[#D5E2D9] rounded bg-white text-xs font-semibold focus:outline-none"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button type="button" className="px-2 py-1 rounded border border-[#D5E2D9] bg-white text-[11px] text-gray-500 hover:bg-[#FAFBF8]">
                &laquo; First
              </button>
              <button type="button" className="px-2 py-1 rounded border border-[#D5E2D9] bg-white text-[11px] text-gray-500 hover:bg-[#FAFBF8]">
                &lsaquo; Prev
              </button>
              <button type="button" className="w-6 h-6 rounded bg-[#0B6B3A] text-white text-[11px] font-bold">
                1
              </button>
              <button type="button" className="w-6 h-6 rounded border border-[#D5E2D9] bg-white text-[11px] text-[#5A7466] hover:bg-[#FAFBF8]">
                2
              </button>
              <span className="px-1 text-gray-400">...</span>
              <button type="button" className="w-6 h-6 rounded border border-[#D5E2D9] bg-white text-[11px] text-[#5A7466] hover:bg-[#FAFBF8]">
                10
              </button>
              <button type="button" className="px-2 py-1 rounded border border-[#D5E2D9] bg-white text-[11px] text-[#5A7466] hover:bg-[#FAFBF8]">
                Next &rsaquo;
              </button>
              <button type="button" className="px-2 py-1 rounded border border-[#D5E2D9] bg-white text-[11px] text-[#5A7466] hover:bg-[#FAFBF8]">
                Last &raquo;
              </button>
              <span className="text-[11px] text-gray-400 ml-2">Go to:</span>
              <input
                type="text"
                placeholder="Page"
                className="w-12 h-6 px-1.5 border border-[#D5E2D9] rounded text-[11px] bg-white text-center focus:outline-none"
              />
              <button type="button" className="px-2 py-0.5 border border-[#D5E2D9] rounded bg-white text-[11px] font-semibold hover:bg-[#FAFBF8]">
                Go
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
