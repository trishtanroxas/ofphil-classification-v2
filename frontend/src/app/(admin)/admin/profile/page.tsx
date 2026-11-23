'use client';
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';
import ProfilePasswordChangeCard from '@/components/ProfilePasswordChangeCard';
import SecureContactChangeModal, { ContactChangeType } from '@/components/SecureContactChangeModal';
import PsgcAddressSelector from '@/components/PsgcAddressSelector';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';

export default function AdminProfilePage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.name || 'Dr. Roberto Reyes');
  const [email, setEmail] = useState('trishtanroxas@gmail.com');
  const [contact, setContact] = useState('0917 000 0001');
  const [contactModalType, setContactModalType] = useState<ContactChangeType | null>(null);
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

  useEffect(() => {
    async function loadAdminProfile() {
      try {
        const data = await fetchApi('/admin/settings/account');
        if (data) {
          if (data.full_name) setFullName(data.full_name);
          if (data.email) setEmail(data.email);
          if (data.contact) setContact(data.contact);
          if (data.department) setDepartment(data.department);
        }
      } catch {
        // Keep defaults
      }
    }
    loadAdminProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/admin/settings/account/profile', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: fullName,
          email,
          department,
          theme_preference: 'light',
          notify_email: true,
        }),
      });
      setProfileSaved(true);
      toast.success('Administrator profile details saved!');
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save administrator profile.');
    }
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-[#10241A]">
                        Official Email Address <span className="text-red-500">*</span>
                      </label>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#0B6B3A] text-[10px] font-bold">
                        <i className="fa-solid fa-circle-check" /> Verified
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        readOnly
                        className="flex-1 h-10 px-3.5 border border-[#EEF2EF] rounded-lg text-xs bg-[#FAFBF8] text-[#10241A] cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={() => setContactModalType('email')}
                        className="px-3 h-10 rounded-lg border border-[#0B6B3A] text-[#0B6B3A] hover:bg-[#E8F5EC] font-semibold text-xs transition cursor-pointer bg-white shrink-0"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-[#10241A]">
                        Mobile Number (For 2FA Alerts) <span className="text-red-500">*</span>
                      </label>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#0B6B3A] text-[10px] font-bold">
                        <i className="fa-solid fa-circle-check" /> Verified
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={contact}
                        readOnly
                        className="flex-1 h-10 px-3.5 border border-[#EEF2EF] rounded-lg text-xs bg-[#FAFBF8] text-[#10241A] cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={() => setContactModalType('mobile')}
                        className="px-3 h-10 rounded-lg border border-[#0B6B3A] text-[#0B6B3A] hover:bg-[#E8F5EC] font-semibold text-xs transition cursor-pointer bg-white shrink-0"
                      >
                        Change
                      </button>
                    </div>
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
            {/* Change Administrator Password Card */}
            <ProfilePasswordChangeCard
              role="admin"
              userId="admin_sys"
              defaultEmail={email}
              defaultMobile={contact}
              title="Change Administrator Password"
              subtitle="Update your authentication password to maintain high security clearance."
            />
          </div>
        </div>
      </div>

      <SecureContactChangeModal
        isOpen={contactModalType !== null}
        role="admin"
        userId="admin_sys"
        contactType={contactModalType || 'email'}
        currentValue={contactModalType === 'mobile' ? contact : email}
        onClose={() => setContactModalType(null)}
        onVerified={(type, newVal) => {
          if (type === 'email') setEmail(newVal);
          else setContact(newVal);
        }}
      />
    </DashboardLayout>
  );
}
