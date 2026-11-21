'use client';
import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';

interface StaffUser {
  id: string;
  name: string;
  username: string;
  role: 'Administrator' | 'Medical Social Worker' | 'Intake Nurse' | 'Ophthalmologist';
  status: 'Active' | 'Suspended';
}

const STAFF_LIST: StaffUser[] = [
  { id: '1', name: 'Dr. Roberto Reyes', username: 'admin_sys', role: 'Administrator', status: 'Active' },
  { id: '2', name: 'Maria Santos, RSW', username: 'msw_lead', role: 'Medical Social Worker', status: 'Active' },
  { id: '3', name: 'Nurse Clara Garcia', username: 'nurse_desk', role: 'Intake Nurse', status: 'Active' },
  { id: '4', name: 'Dr. Jaime Bautista', username: 'doc_retina', role: 'Ophthalmologist', status: 'Active' },
];

export default function AdminRoleManagementPage() {
  return (
    <DashboardLayout
      title="Staff Roles & Access Governance"
      subtitle="Ophthalmological Foundation of the Philippines — AI-Assisted Patient Intake & Evaluation"
    >
      <div className="space-y-4 text-xs font-sans">
        <div className="bg-white border border-[#D5E2D9] rounded-xl px-5 py-3 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="font-['Outfit'] text-base font-bold text-[#10241A] flex items-center gap-2 m-0">
              <i className="fa-solid fa-user-shield text-[#0B6B3A] text-sm" />
              <span>Staff Roles &amp; Permissions</span>
            </h2>
            <span className="text-[11px] text-[#0B6B3A] bg-[#E8F5EC] px-2.5 py-0.5 rounded-full font-bold">
              4 Active Staff Accounts
            </span>
          </div>

          <button
            type="button"
            className="px-4 py-1.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white font-semibold flex items-center gap-1.5 transition"
          >
            <i className="fa-solid fa-user-plus text-xs" />
            <span>Add Staff User</span>
          </button>
        </div>

        <div className="bg-white border border-[#D5E2D9] rounded-xl shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFBF8] text-[#5A7466] uppercase text-[10.5px] border-b border-[#EEF2EF]">
              <tr>
                <th className="py-3 px-5 font-semibold">Staff Name</th>
                <th className="py-3 px-5 font-semibold">Username</th>
                <th className="py-3 px-5 font-semibold">System Role</th>
                <th className="py-3 px-5 font-semibold">Account Status</th>
                <th className="py-3 px-5 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2EF]">
              {STAFF_LIST.map((staff) => (
                <tr key={staff.id} className="hover:bg-[#FAFBF8] transition">
                  <td className="py-3.5 px-5 font-semibold text-[#10241A]">
                    {staff.name}
                  </td>
                  <td className="py-3.5 px-5 font-mono text-[#5A7466]">
                    @{staff.username}
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#E8F5EC] text-[#0B6B3A]">
                      {staff.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-center">
                    <button
                      type="button"
                      className="px-3 py-1 rounded-lg border border-[#D5E2D9] hover:bg-[#FAFBF8] text-[#10241A] font-semibold text-xs"
                    >
                      Edit Access
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
