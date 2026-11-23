'use client';
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { toast } from 'sonner';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';

export interface StaffUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: 'Administrator' | 'Medical Social Worker' | 'Intake Nurse' | 'Ophthalmologist';
  status: 'Active' | 'Suspended';
  department: string;
  contactNumber?: string;
  initialPassword?: string;
  licenseNo?: string;
  permissions: {
    canRegisterPatients: boolean;
    canEvaluateAssessments: boolean;
    canManageRoles: boolean;
    canAuditLogs: boolean;
    canExportReports: boolean;
  };
}

const INITIAL_STAFF_LIST: StaffUser[] = [
  {
    id: '1',
    name: 'Dr. Roberto Reyes',
    username: 'admin_sys',
    email: 'roxas.t.bscs@gmail.com',
    contactNumber: '0917 000 0001',
    role: 'Administrator',
    status: 'Active',
    department: 'Clinic Operations & Governance',
    permissions: {
      canRegisterPatients: true,
      canEvaluateAssessments: true,
      canManageRoles: true,
      canAuditLogs: true,
      canExportReports: true,
    },
  },
  {
    id: '2',
    name: 'Maria Santos, RSW',
    username: 'msw_lead',
    email: 'roxastal.cbpa@gmail.com',
    contactNumber: '0918 555 1234',
    role: 'Medical Social Worker',
    status: 'Active',
    department: 'Medical Social Services & Charity Admissions',
    licenseNo: 'RSW-0048291',
    permissions: {
      canRegisterPatients: true,
      canEvaluateAssessments: true,
      canManageRoles: false,
      canAuditLogs: false,
      canExportReports: true,
    },
  },
  {
    id: '3',
    name: 'Nurse Clara Garcia',
    username: 'nurse_desk',
    email: 'clara.garcia@ofphil.org.ph',
    contactNumber: '0917 000 0890',
    role: 'Intake Nurse',
    status: 'Active',
    department: 'Outpatient Triage & Vitals Station',
    permissions: {
      canRegisterPatients: true,
      canEvaluateAssessments: false,
      canManageRoles: false,
      canAuditLogs: false,
      canExportReports: false,
    },
  },
];

export default function AdminRoleManagementPage() {
  const [staffList, setStaffList] = useState<StaffUser[]>(INITIAL_STAFF_LIST);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New staff form state
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<StaffUser['role']>('Intake Nurse');
  const [newDepartment, setNewDepartment] = useState('Patient Admissions');
  const [newLicenseNo, setNewLicenseNo] = useState('');
  const [newContactNumber, setNewContactNumber] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleGenerateStaffPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
    setConfirmPassword(pwd);
    toast.success('Generated secure staff temporary password');
  };

  // Handle Edit Access Modal opening
  const handleOpenEdit = (staff: StaffUser) => {
    setEditingStaff({ ...staff, permissions: { ...staff.permissions } });
  };

  // Save changes to existing staff
  const handleSaveStaffChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    setStaffList((prev) =>
      prev.map((s) => (s.id === editingStaff.id ? editingStaff : s))
    );
    toast.success(`Access permissions updated for ${editingStaff.name}`);
    setEditingStaff(null);
  };

  // Add new staff account
  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUsername.trim() || !newEmail.trim()) {
      toast.error('Please fill in required fields (Name, Username, Email).');
      return;
    }
    if (newPassword && newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    const newStaff: StaffUser = {
      id: `${Date.now()}`,
      name: newName.trim(),
      username: newUsername.trim().replace(/^@/, ''),
      email: newEmail.trim(),
      role: newRole,
      status: 'Active',
      department: newDepartment,
      contactNumber: newContactNumber.trim() || undefined,
      initialPassword: newPassword || undefined,
      licenseNo: newLicenseNo.trim() || undefined,
      permissions: {
        canRegisterPatients: newRole === 'Administrator' || newRole === 'Intake Nurse' || newRole === 'Medical Social Worker',
        canEvaluateAssessments: newRole === 'Administrator' || newRole === 'Medical Social Worker' || newRole === 'Ophthalmologist',
        canManageRoles: newRole === 'Administrator',
        canAuditLogs: newRole === 'Administrator',
        canExportReports: true,
      },
    };

    setStaffList((prev) => [...prev, newStaff]);
    toast.success(`Staff user ${newStaff.name} (@${newStaff.username}) successfully added!`);
    setIsAddModalOpen(false);

    // Reset inputs
    setNewName('');
    setNewUsername('');
    setNewEmail('');
    setNewRole('Intake Nurse');
    setNewDepartment('Patient Admissions');
    setNewLicenseNo('');
    setNewContactNumber('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // Toggle user active/suspended status
  const handleToggleStatus = (staffId: string) => {
    setStaffList((prev) =>
      prev.map((s) => {
        if (s.id === staffId) {
          const nextStatus = s.status === 'Active' ? 'Suspended' : 'Active';
          toast.info(`${s.name} status updated to ${nextStatus}`);
          return { ...s, status: nextStatus };
        }
        return s;
      })
    );
  };

  return (
    <DashboardLayout
      title="Staff Roles & Access Governance"
      subtitle="Ophthalmological Foundation of the Philippines — Patient Intake & Evaluation"
    >
      <div className="w-full pb-12 space-y-5 text-xs font-sans">
        {/* Top Control Bar matching screenshot */}
        <div className="bg-white border border-[#D5E2D9] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-sm border border-[#A7F3D0]">
              <i className="fa-solid fa-user-shield" />
            </div>
            <div>
              <h2 className="font-['Outfit'] text-base font-bold text-[#10241A] flex items-center gap-2.5 m-0">
                <span>Staff Roles &amp; Permissions</span>
                <span className="text-[11px] text-[#0B6B3A] bg-[#E8F5EC] border border-[#A7F3D0] px-2.5 py-0.5 rounded-full font-bold">
                  {staffList.filter((s) => s.status === 'Active').length} Active Staff Accounts
                </span>
              </h2>
              <p className="text-[11.5px] text-[#5A7466] m-0 mt-0.5">
                Role-based access governance for medical caseworkers, triage nurses, and foundation administration.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white font-semibold flex items-center gap-2 transition cursor-pointer shadow-xs border-0 text-xs"
          >
            <i className="fa-solid fa-user-plus text-xs" />
            <span>Add Staff User</span>
          </button>
        </div>

        {/* Staff Table matching screenshot */}
        <div className="bg-white border border-[#D5E2D9] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFBF8] text-[#5A7466] uppercase text-[10.5px] border-b border-[#EEF2EF] tracking-wider">
                <tr>
                  <th className="py-3.5 px-6 font-bold">Staff Name</th>
                  <th className="py-3.5 px-6 font-bold">Username</th>
                  <th className="py-3.5 px-6 font-bold">System Role</th>
                  <th className="py-3.5 px-6 font-bold">Account Status</th>
                  <th className="py-3.5 px-6 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2EF]">
                {staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-[#FAFBF8] transition">
                    {/* Staff Name & Email */}
                    <td className="py-4 px-6 font-semibold text-[#10241A]">
                      <div className="font-bold text-[13px] text-[#10241A]">{staff.name}</div>
                      <div className="text-[11px] text-[#64748B] font-normal flex items-center gap-2 flex-wrap">
                        <span>{staff.email}</span>
                        {staff.contactNumber && (
                          <span className="text-[#0B6B3A] font-mono font-medium flex items-center gap-1">
                            <i className="fa-solid fa-phone text-[9px]" />
                            <span>{staff.contactNumber}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Username */}
                    <td className="py-4 px-6 font-mono text-[#5A7466] text-xs">
                      @{staff.username}
                    </td>

                    {/* System Role */}
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold bg-[#E8F5EC] text-[#0B6B3A] border border-[#A7F3D0]/60">
                        <i
                          className={`fa-solid text-[10px] ${
                            staff.role === 'Administrator'
                              ? 'fa-shield-halved'
                              : staff.role === 'Medical Social Worker'
                              ? 'fa-user-doctor'
                              : staff.role === 'Intake Nurse'
                              ? 'fa-user-nurse'
                              : 'fa-eye'
                          }`}
                        />
                        <span>{staff.role}</span>
                      </span>
                    </td>

                    {/* Status Toggle Badge */}
                    <td className="py-4 px-6">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(staff.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border transition cursor-pointer ${
                          staff.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                        }`}
                        title="Click to toggle status"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            staff.status === 'Active' ? 'bg-emerald-600' : 'bg-red-600'
                          }`}
                        />
                        <span>{staff.status}</span>
                      </button>
                    </td>

                    {/* Action Button */}
                    <td className="py-4 px-6 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(staff)}
                        className="px-3.5 py-1.5 rounded-lg border border-[#D5E2D9] hover:bg-[#FAFBF8] text-[#10241A] font-semibold text-xs transition cursor-pointer hover:border-[#0B6B3A] shadow-2xs"
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
      </div>

      {/* ========================================================
          EDIT ACCESS MODAL
         ======================================================== */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#D5E2D9] shadow-2xl p-6 text-xs font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#EEF2EF] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-sm font-bold">
                  <i className="fa-solid fa-user-gear" />
                </div>
                <div>
                  <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0">
                    Edit Staff Access &amp; Permissions
                  </h3>
                  <div className="text-[11px] text-[#64748B]">
                    {editingStaff.name} (@{editingStaff.username})
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-[#64748B] flex items-center justify-center cursor-pointer border-0 bg-transparent text-sm"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleSaveStaffChanges} className="space-y-4">
              {/* Full Name & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#334155] mb-1">
                    Staff Name
                  </label>
                  <input
                    type="text"
                    value={editingStaff.name}
                    onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                    className="w-full h-9 px-3 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#334155] mb-1">
                    System Role
                  </label>
                  <select
                    value={editingStaff.role}
                    onChange={(e) =>
                      setEditingStaff({ ...editingStaff, role: e.target.value as StaffUser['role'] })
                    }
                    className="w-full h-9 px-2.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Medical Social Worker">Medical Social Worker</option>
                    <option value="Intake Nurse">Intake Nurse</option>
                    <option value="Ophthalmologist">Ophthalmologist</option>
                  </select>
                </div>
              </div>

              {/* Email & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#334155] mb-1">
                    Institutional Email
                  </label>
                  <input
                    type="email"
                    value={editingStaff.email}
                    onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                    className="w-full h-9 px-3 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#334155] mb-1">
                    Account Status
                  </label>
                  <select
                    value={editingStaff.status}
                    onChange={(e) =>
                      setEditingStaff({ ...editingStaff, status: e.target.value as StaffUser['status'] })
                    }
                    className="w-full h-9 px-2.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                  >
                    <option value="Active">Active (Granted Access)</option>
                    <option value="Suspended">Suspended (Access Revoked)</option>
                  </select>
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-[11px] font-bold text-[#334155] mb-1">
                  Assigned Clinic Department
                </label>
                <input
                  type="text"
                  value={editingStaff.department}
                  onChange={(e) => setEditingStaff({ ...editingStaff, department: e.target.value })}
                  className="w-full h-9 px-3 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                />
              </div>

              {/* Granular Permission Toggles */}
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-[#334155] mb-2 uppercase tracking-wider">
                  Assigned Operational Permissions
                </label>
                <div className="bg-[#FAFBF8] border border-[#E2E8F0] rounded-xl p-3 space-y-2.5">
                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="text-[#10241A] font-medium">Can Register New Patients &amp; Masterlist</span>
                    <input
                      type="checkbox"
                      checked={editingStaff.permissions.canRegisterPatients}
                      onChange={(e) =>
                        setEditingStaff({
                          ...editingStaff,
                          permissions: { ...editingStaff.permissions, canRegisterPatients: e.target.checked },
                        })
                      }
                      className="accent-[#0B6B3A] w-4 h-4 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="text-[#10241A] font-medium">Can Score MSW Clinical Assessments &amp; Grant Tiers</span>
                    <input
                      type="checkbox"
                      checked={editingStaff.permissions.canEvaluateAssessments}
                      onChange={(e) =>
                        setEditingStaff({
                          ...editingStaff,
                          permissions: { ...editingStaff.permissions, canEvaluateAssessments: e.target.checked },
                        })
                      }
                      className="accent-[#0B6B3A] w-4 h-4 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="text-[#10241A] font-medium">Can Manage Staff Roles &amp; Security Governance</span>
                    <input
                      type="checkbox"
                      checked={editingStaff.permissions.canManageRoles}
                      onChange={(e) =>
                        setEditingStaff({
                          ...editingStaff,
                          permissions: { ...editingStaff.permissions, canManageRoles: e.target.checked },
                        })
                      }
                      className="accent-[#0B6B3A] w-4 h-4 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="text-[#10241A] font-medium">Can View Audit Logs &amp; Session History</span>
                    <input
                      type="checkbox"
                      checked={editingStaff.permissions.canAuditLogs}
                      onChange={(e) =>
                        setEditingStaff({
                          ...editingStaff,
                          permissions: { ...editingStaff.permissions, canAuditLogs: e.target.checked },
                        })
                      }
                      className="accent-[#0B6B3A] w-4 h-4 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="text-[#10241A] font-medium">Can Export Patient Masterlist &amp; Analytics Reports</span>
                    <input
                      type="checkbox"
                      checked={editingStaff.permissions.canExportReports}
                      onChange={(e) =>
                        setEditingStaff({
                          ...editingStaff,
                          permissions: { ...editingStaff.permissions, canExportReports: e.target.checked },
                        })
                      }
                      className="accent-[#0B6B3A] w-4 h-4 rounded"
                    />
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#EEF2EF]">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 rounded-lg border border-[#D5E2D9] text-[#64748B] font-semibold hover:bg-slate-50 cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white font-bold cursor-pointer border-0 shadow-xs flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-floppy-disk text-xs" />
                  <span>Save Permissions</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          ADD STAFF USER MODAL
         ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#D5E2D9] shadow-2xl p-6 text-xs font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#EEF2EF] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-sm font-bold">
                  <i className="fa-solid fa-user-plus" />
                </div>
                <div>
                  <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0">
                    Add Authorized Staff User
                  </h3>
                  <div className="text-[11px] text-[#64748B]">
                    Provision clinical access for triage nurses, caseworkers, or doctors
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-[#64748B] flex items-center justify-center cursor-pointer border-0 bg-transparent text-sm"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              {/* Full Name & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#334155] mb-1">
                    Staff Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Nurse Elena Cruz"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full h-9 px-3 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#334155] mb-1">
                    Staff Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. nurse_elena"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full h-9 px-3 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                    required
                  />
                </div>
              </div>

              {/* Email & System Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#334155] mb-1">
                    Institutional Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="elena.cruz@ofphil.org.ph"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full h-9 px-3 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#334155] mb-1">
                    Assigned Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as StaffUser['role'])}
                    className="w-full h-9 px-2.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                  >
                    <option value="Intake Nurse">Intake Nurse</option>
                    <option value="Medical Social Worker">Medical Social Worker</option>
                    <option value="Ophthalmologist">Ophthalmologist</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                </div>
              </div>

              {/* Department & License */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#334155] mb-1">
                    Clinic Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Triage & Admissions"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full h-9 px-3 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#334155] mb-1">
                    PRC License No. (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PRC-RN-012938"
                    value={newLicenseNo}
                    onChange={(e) => setNewLicenseNo(e.target.value)}
                    className="w-full h-9 px-3 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                  />
                </div>
              </div>

              {/* Mobile Phone Number */}
              <div>
                <label className="block text-[11px] font-bold text-[#334155] mb-1">
                  Mobile Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-phone text-xs" />
                  </div>
                  <input
                    type="tel"
                    placeholder="0917 888 1678"
                    value={newContactNumber}
                    onChange={(e) => setNewContactNumber(e.target.value)}
                    className="w-full pl-9 pr-3 h-9 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                    required
                  />
                </div>
              </div>

              {/* Staff Password & Password Strength Meter */}
              <div className="p-3 bg-[#FAFBF8] border border-[#D5E2D9] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#10241A] flex items-center gap-1.5">
                    <i className="fa-solid fa-key text-[#0B6B3A]" />
                    <span>Account Credentials & Password Security</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerateStaffPassword}
                    className="text-[10.5px] font-semibold text-[#0B6B3A] hover:underline cursor-pointer bg-transparent border-0 flex items-center gap-1"
                  >
                    <i className="fa-solid fa-wand-magic-sparkles text-[9px]" />
                    <span>Auto-Generate Password</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10.5px] font-bold text-[#334155] mb-1">
                      Staff Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full h-9 pl-3 pr-8 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8F9E96] hover:text-[#10241A] text-xs bg-transparent border-none cursor-pointer"
                      >
                        <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-[#334155] mb-1">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Repeat password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full h-9 pl-3 pr-8 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8F9E96] hover:text-[#10241A] text-xs bg-transparent border-none cursor-pointer"
                      >
                        <i className={`fa-regular ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Strength Meter */}
                <PasswordStrengthMeter password={newPassword} showChecks={true} />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#EEF2EF]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#D5E2D9] text-[#64748B] font-semibold hover:bg-slate-50 cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white font-bold cursor-pointer border-0 shadow-xs flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-user-check text-xs" />
                  <span>Create Staff Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
