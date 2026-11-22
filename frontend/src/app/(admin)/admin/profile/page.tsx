'use client';
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';
import PsgcAddressSelector from '@/components/PsgcAddressSelector';
import { toast } from 'sonner';

export default function AdminProfilePage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.name || 'Dr. Roberto Reyes');
  const [email, setEmail] = useState('admin.reyes@ofphil.org.ph');
  const [contact, setContact] = useState('0917 888 1001');
  const [department, setDepartment] = useState('Clinic Operations & Governance');
  const [birthdate, setBirthdate] = useState('1975-08-20');
  const [sex, setSex] = useState('Male (M)');
  const [civilStatus, setCivilStatus] = useState('Married');
  const [province, setProvince] = useState('Metro Manila (NCR)');
  const [city, setCity] = useState('City of Manila');
  const [barangay, setBarangay] = useState('Barangay 659');
  const [street, setStreet] = useState('OFPHIL Medical Center Wing, Taft Avenue');
  const [education, setEducation] = useState('Doctor of Medicine (MD) • Diplomate in Ophthalmology');
  const [occupation, setOccupation] = useState('Medical Director & Clinic Administrator');
  const [profileSaved, setProfileSaved] = useState(false);

  // Password fields
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passUpdated, setPassUpdated] = useState(false);

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPass(pwd);
    setConfirmPass(pwd);
    toast.success('Generated secure administrator password');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaved(true);
    toast.success('Administrator profile details saved!');
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (newPass !== confirmPass) {
      toast.error('New password and confirmation do not match.');
      return;
    }
    setPassUpdated(true);
    toast.success('Administrator security password updated!');
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setTimeout(() => setPassUpdated(false), 3000);
  };

  return (
    <DashboardLayout
      title="Administrator Profile & Account"
      subtitle="Ophthalmological Foundation of the Philippines — Patient Master Registry & Clinical Directory"
    >
      <div className="w-full pb-12 space-y-6 text-xs font-sans">
        {/* Breadcrumb Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
          <div className="flex items-center gap-2 text-xs text-[#5A7466]">
            <Link href="/admin/patient-records" className="text-[#0B6B3A] font-semibold flex items-center gap-1 hover:underline">
              <i className="fa-solid fa-house text-xs" />
              <span>Admin Console</span>
            </Link>
            <span>•</span>
            <span className="text-[#10241A] font-medium">Administrator Account Profile</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/settings"
              className="px-3.5 py-1.5 rounded-lg border border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] font-semibold text-[#10241A] flex items-center gap-1.5 transition shadow-2xs"
            >
              <i className="fa-solid fa-sliders text-xs text-[#0B6B3A]" />
              <span>System Settings</span>
            </Link>
            <Link
              href="/admin/patient-records"
              className="px-3.5 py-1.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white font-semibold flex items-center gap-1.5 transition shadow-2xs"
            >
              <i className="fa-solid fa-arrow-left text-xs" />
              <span>Back to Records</span>
            </Link>
          </div>
        </div>

        {/* 2-Column Profile Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Avatar & Quick Info Card */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-6 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-3xl font-extrabold font-['Outfit'] mb-3 border-2 border-[#A7F3D0] shadow-sm">
                R
              </div>
              <h2 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0">
                {fullName}
              </h2>
              <div className="font-mono text-xs text-[#5A7466] mb-3">
                @admin_sys
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F5EC] border border-[#A7F3D0] text-[#0B6B3A] font-bold text-xs mb-4">
                <i className="fa-solid fa-user-shield text-xs" />
                <span>Clinic Administrator</span>
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
                    <i className="fa-solid fa-user-shield text-xs text-[#0B6B3A]" />
                    <span>User Role</span>
                  </span>
                  <span className="font-bold text-[#0B6B3A]">Clinic Administrator</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#5A7466] flex items-center gap-1">
                    <i className="fa-solid fa-id-card text-xs" />
                    <span>User ID</span>
                  </span>
                  <span className="font-mono font-bold text-[#10241A]">STF-ADM-0001</span>
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
                    <i className="fa-solid fa-cake-candles text-xs text-[#0B6B3A]" />
                    <span>Birthday</span>
                  </span>
                  <span className="font-medium text-[#10241A]">{birthdate}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#5A7466] flex items-center gap-1">
                    <i className="fa-solid fa-location-dot text-xs text-[#0B6B3A]" />
                    <span>City / Province</span>
                  </span>
                  <span className="font-medium text-[#10241A] text-right">{city}, {province}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#5A7466] flex items-center gap-1">
                    <i className="fa-solid fa-clock-rotate-left text-xs" />
                    <span>Last Login</span>
                  </span>
                  <span className="font-medium text-[#10241A]">Today (Active)</span>
                </div>
              </div>
            </div>

            {/* Governance Card */}
            <div className="bg-[#FAFBF8] border border-[#E2E8F0] rounded-xl p-4 text-[11.5px] text-[#475569] leading-relaxed">
              <div className="font-bold text-[#0F172A] flex items-center gap-1.5 mb-1 text-xs">
                <i className="fa-solid fa-user-lock text-[#0B6B3A]" />
                <span>Clinical Access Governance</span>
              </div>
              Your administrator credentials are authenticated under OFPHIL Executive Medical Directorship protocols. System governance rules apply.
            </div>
          </div>

          {/* Right Column: Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal & Contact Information */}
            <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-6">
              <div className="pb-3 border-b border-[#EEF2EF] mb-4">
                <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0">
                  Personal &amp; Contact Details
                </h3>
                <p className="text-xs text-[#5A7466] mt-0.5 m-0">
                  Manage your official staff email, mobile contact, and clinic department registry.
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
                      value="admin_sys"
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
                      Mobile Number (For 2FA Alerts) <span className="text-red-500">*</span>
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
                      User Role / Designation
                    </label>
                    <input
                      type="text"
                      value="Clinic Administrator (System & Registry Governance)"
                      readOnly
                      className="w-full h-10 px-3.5 border border-[#EEF2EF] rounded-lg text-xs bg-[#FAFBF8] text-[#0B6B3A] font-bold cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#10241A] mb-1">
                      Assigned Clinic Department
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                    />
                  </div>
                </div>

                {/* Birthday, Sex, Civil Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold text-[#10241A] mb-1">
                      Birthday / Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={birthdate}
                      onChange={(e) => setBirthdate(e.target.value)}
                      required
                      className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#10241A] mb-1">
                      Sex <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={sex}
                      onChange={(e) => setSex(e.target.value)}
                      className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                    >
                      <option value="Male (M)">Male (M)</option>
                      <option value="Female (F)">Female (F)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#10241A] mb-1">
                      Civil Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={civilStatus}
                      onChange={(e) => setCivilStatus(e.target.value)}
                      className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                    >
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Separated">Separated</option>
                    </select>
                  </div>
                </div>

                {/* PSGC Province, City, Barangay & Street Address */}
                <div className="p-4 rounded-xl bg-[#FAFBF8] border border-[#D5E2D9] space-y-2">
                  <div className="font-bold text-xs text-[#0B6B3A] flex items-center gap-1.5 mb-1">
                    <i className="fa-solid fa-map-location-dot" />
                    <span>Official Residence &amp; Address (PSGC Verified)</span>
                  </div>
                  <PsgcAddressSelector
                    province={province}
                    city={city}
                    barangay={barangay}
                    street={street}
                    onProvinceChange={setProvince}
                    onCityChange={setCity}
                    onBarangayChange={setBarangay}
                    onStreetChange={setStreet}
                    streetLabel="House No., Street Name, Subd. / Building Address"
                  />
                </div>

                {/* Educational Attainment & Occupation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-[#10241A] mb-1">
                      Educational Attainment / Medical Degree
                    </label>
                    <input
                      type="text"
                      value={education}
                      onChange={(e) => setEducation(e.target.value)}
                      className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#10241A] mb-1">
                      Occupation / Clinical Title
                    </label>
                    <input
                      type="text"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  {profileSaved && (
                    <span className="text-xs text-[#0B6B3A] font-bold">
                      ✓ Administrator details saved successfully!
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

            {/* Change Administrator Password */}
            <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-6">
              <div className="pb-3 border-b border-[#EEF2EF] mb-4">
                <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0 flex items-center gap-2">
                  <i className="fa-solid fa-key text-[#0B6B3A]" />
                  <span>Change Administrator Password</span>
                </h3>
                <p className="text-xs text-[#5A7466] mt-0.5 m-0">
                  Update your authentication password to maintain high security clearance.
                </p>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block font-semibold text-[#10241A] mb-1">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      placeholder="Enter current password"
                      required
                      className="w-full h-11 pl-3.5 pr-10 border border-[#D5E2D9] rounded-xl text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F9E96] hover:text-[#10241A] bg-transparent border-0 cursor-pointer"
                    >
                      <i className={`fa-regular ${showCurrentPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  <div>
                    <label className="block font-semibold text-[#10241A] mb-1">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                        className="w-full h-11 pl-3.5 pr-10 border border-[#D5E2D9] rounded-xl text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F9E96] hover:text-[#10241A] bg-transparent border-0 cursor-pointer"
                      >
                        <i className={`fa-regular ${showNewPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                      </button>
                    </div>
                    <PasswordStrengthMeter password={newPass} showChecks={true} />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#10241A] mb-1">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPass ? 'text' : 'password'}
                        value={confirmPass}
                        onChange={(e) => setConfirmPass(e.target.value)}
                        placeholder="Repeat new password"
                        required
                        className="w-full h-11 pl-3.5 pr-10 border border-[#D5E2D9] rounded-xl text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F9E96] hover:text-[#10241A] bg-transparent border-0 cursor-pointer"
                      >
                        <i className={`fa-regular ${showConfirmPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                      </button>
                    </div>
                    {confirmPass.length > 0 && (
                      <div className={`mt-1.5 text-[11px] font-semibold flex items-center gap-1.5 ${newPass === confirmPass ? 'text-[#0B6B3A]' : 'text-[#DC2626]'}`}>
                        <i className={`fa-solid ${newPass === confirmPass ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
                        <span>{newPass === confirmPass ? 'Passwords match' : 'Passwords do not match'}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#334155] transition cursor-pointer"
                  >
                    <i className="fa-solid fa-key text-xs text-[#0B6B3A]" />
                    <span>Generate Secure Password</span>
                  </button>
                  {passUpdated && (
                    <span className="text-xs text-[#0B6B3A] font-bold">
                      ✓ Security password updated successfully!
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
