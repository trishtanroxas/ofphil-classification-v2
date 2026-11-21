'use client';
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function CaseworkerProfilePage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.name || 'Maria Santos, RSW');
  const [email, setEmail] = useState('maria.santos@ofphil.org.ph');
  const [contact, setContact] = useState('0918 555 1234');
  const [department, setDepartment] = useState('Medical Social Services Department (MSWD)');
  const [licenseNo, setLicenseNo] = useState('PRC-RSW-004921');
  const [profileSaved, setProfileSaved] = useState(false);

  // Password fields
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passUpdated, setPassUpdated] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassUpdated(true);
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setTimeout(() => setPassUpdated(false), 3000);
  };

  return (
    <DashboardLayout
      title="Medical Social Worker Profile & Account"
      subtitle="Ophthalmological Foundation of the Philippines — AI-Assisted Patient Intake & Evaluation"
    >
      <div className="max-w-5xl mx-auto space-y-6 text-xs font-sans">
        {/* Breadcrumb Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
          <div className="flex items-center gap-2 text-xs text-[#5A7466]">
            <Link href="/dashboard" className="text-[#0B6B3A] font-semibold flex items-center gap-1 hover:underline">
              <i className="fa-solid fa-house text-xs" />
              <span>Dashboard</span>
            </Link>
            <span>•</span>
            <span className="text-[#10241A] font-medium">Caseworker Staff Profile</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="px-3.5 py-1.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white font-semibold flex items-center gap-1.5 transition shadow-2xs"
            >
              <i className="fa-solid fa-arrow-left text-xs" />
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </div>

        {/* 2-Column Profile Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Avatar & Quick Info Card */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-6 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-3xl font-extrabold font-['Outfit'] mb-3 border-2 border-[#A7F3D0] shadow-sm">
                M
              </div>
              <h2 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0">
                {fullName}
              </h2>
              <div className="font-mono text-xs text-[#5A7466] mb-3">
                @msw_lead
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F5EC] border border-[#A7F3D0] text-[#0B6B3A] font-bold text-xs mb-4">
                <i className="fa-solid fa-user-doctor text-xs" />
                <span>Licensed Social Worker (RSW)</span>
              </div>

              {/* Account Key Metrics */}
              <div className="w-full space-y-2.5 pt-4 border-t border-[#EEF2EF] text-left text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#5A7466] flex items-center gap-1">
                    <i className="fa-solid fa-circle-check text-[#0B6B3A]" />
                    <span>Account Status</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md font-bold text-[10.5px] bg-[#ECFDF5] text-[#0B6B3A]">
                    Active
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#5A7466] flex items-center gap-1">
                    <i className="fa-solid fa-id-card text-xs" />
                    <span>Staff ID</span>
                  </span>
                  <span className="font-mono font-bold text-[#10241A]">STF-MSW-0012</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#5A7466] flex items-center gap-1">
                    <i className="fa-solid fa-award text-xs text-[#0B6B3A]" />
                    <span>PRC License</span>
                  </span>
                  <span className="font-mono font-bold text-[#10241A]">{licenseNo}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#5A7466] flex items-center gap-1">
                    <i className="fa-solid fa-shield-halved text-xs text-[#0B6B3A]" />
                    <span>2FA OTP Auth</span>
                  </span>
                  <span className="font-semibold text-[#0B6B3A]">Enabled</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#5A7466] flex items-center gap-1">
                    <i className="fa-solid fa-clock-rotate-left text-xs" />
                    <span>Active Session</span>
                  </span>
                  <span className="font-medium text-[#10241A]">Today (Clinic Intake)</span>
                </div>
              </div>
            </div>

            {/* Accreditation Notice */}
            <div className="bg-[#FAFBF8] border border-[#E2E8F0] rounded-xl p-4 text-[11.5px] text-[#475569] leading-relaxed">
              <div className="font-bold text-[#0F172A] flex items-center gap-1.5 mb-1 text-xs">
                <i className="fa-solid fa-certificate text-[#0B6B3A]" />
                <span>DOH Clinical Social Work Accreditation</span>
              </div>
              Authorized to evaluate indigency classification, issue guarantee letters, and conduct hospital surgical quotation reviews.
            </div>
          </div>

          {/* Right Column: Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal & Contact Information */}
            <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-6">
              <div className="pb-3 border-b border-[#EEF2EF] mb-4">
                <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0">
                  Caseworker Personal &amp; Contact Details
                </h3>
                <p className="text-xs text-[#5A7466] mt-0.5 m-0">
                  Manage your caseworker registry credentials, official communications, and intake department assignment.
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-[#10241A] mb-1">
                      Full Legal Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#10241A] mb-1">
                      System Username
                    </label>
                    <input
                      type="text"
                      value="msw_lead"
                      readOnly
                      className="w-full h-10 px-3.5 border border-[#EEF2EF] rounded-lg text-xs bg-[#FAFBF8] text-[#5A7466] cursor-not-allowed font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-[#10241A] mb-1">
                      Official Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#10241A] mb-1">
                      Contact Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      required
                      className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-[#10241A] mb-1">
                      Assigned Department
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#10241A] mb-1">
                      PRC License Number
                    </label>
                    <input
                      type="text"
                      value={licenseNo}
                      onChange={(e) => setLicenseNo(e.target.value)}
                      className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  {profileSaved && (
                    <span className="text-xs text-[#0B6B3A] font-bold">
                      ✓ Caseworker profile updated successfully!
                    </span>
                  )}
                  <button
                    type="submit"
                    className="ml-auto px-5 py-2.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
                  >
                    <i className="fa-solid fa-floppy-disk text-xs" />
                    <span>Save Profile Changes</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Change Portal Password */}
            <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-6">
              <div className="pb-3 border-b border-[#EEF2EF] mb-4">
                <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0 flex items-center gap-2">
                  <i className="fa-solid fa-key text-[#0B6B3A]" />
                  <span>Change Staff Password</span>
                </h3>
                <p className="text-xs text-[#5A7466] mt-0.5 m-0">
                  Ensure strong credentials to protect sensitive patient socioeconomic records and clinical files.
                </p>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block font-semibold text-[#10241A] mb-1">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    placeholder="Enter current account password"
                    required
                    className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-[#10241A] mb-1">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#10241A] mb-1">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  {passUpdated && (
                    <span className="text-xs text-[#0B6B3A] font-bold">
                      ✓ Password updated successfully!
                    </span>
                  )}
                  <button
                    type="submit"
                    className="ml-auto px-5 py-2.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
                  >
                    <i className="fa-solid fa-shield-check text-xs" />
                    <span>Update Password</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
