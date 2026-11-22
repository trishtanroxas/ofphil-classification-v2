'use client';
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';
import ProfilePasswordChangeCard from '@/components/ProfilePasswordChangeCard';
import PsgcAddressSelector from '@/components/PsgcAddressSelector';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';

export default function CaseworkerProfilePage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.name || 'Maria Santos, RSW');
  const [email, setEmail] = useState('maria.santos@ofphil.org.ph');
  const [contact, setContact] = useState('0918 555 1234');
  const [department, setDepartment] = useState('Medical Social Services Department (MSWD)');
  const [licenseNo, setLicenseNo] = useState('PRC-RSW-004921');
  const [birthdate, setBirthdate] = useState('1988-03-14');
  const [sex, setSex] = useState('Female (F)');
  const [civilStatus, setCivilStatus] = useState('Married');
  const [province, setProvince] = useState('Metro Manila (NCR)');
  const [city, setCity] = useState('Quezon City');
  const [barangay, setBarangay] = useState('Diliman');
  const [street, setStreet] = useState('Blk 8 Lot 15, Teachers Village East');
  const [education, setEducation] = useState('Bachelor of Science in Social Work (BSSW) • Registered Social Worker');
  const [occupation, setOccupation] = useState('Lead Medical Social Worker (MSWD)');
  const [profileSaved, setProfileSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Password fields
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passUpdated, setPassUpdated] = useState(false);

  // Load persistent profile from backend on mount
  useEffect(() => {
    async function loadMswProfile() {
      try {
        const data = await fetchApi('/admin/settings/msw/account');
        if (data) {
          if (data.full_name) setFullName(data.full_name);
          if (data.email) setEmail(data.email);
          if (data.contact) setContact(data.contact);
          if (data.department) setDepartment(data.department);
          if (data.license_no) setLicenseNo(data.license_no);
          if (data.birthdate) setBirthdate(data.birthdate);
          if (data.sex) setSex(data.sex);
          if (data.civil_status) setCivilStatus(data.civil_status);
          if (data.province) setProvince(data.province);
          if (data.city) setCity(data.city);
          if (data.barangay) setBarangay(data.barangay);
          if (data.street) setStreet(data.street);
          if (data.education) setEducation(data.education);
          if (data.occupation) setOccupation(data.occupation);
        }
      } catch (e) {
        // Fallback to local defaults if unconfigured
      }
    }
    loadMswProfile();
  }, []);

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPass(pwd);
    setConfirmPass(pwd);
    toast.success('Generated secure staff password');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await fetchApi('/admin/settings/msw/account/profile', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: fullName,
          email,
          contact,
          department,
          license_no: licenseNo,
          birthdate,
          sex,
          civil_status: civilStatus,
          province,
          city,
          barangay,
          street,
          education,
          occupation,
          theme_preference: 'light',
          notify_email: true
        })
      });
      setProfileSaved(true);
      toast.success('Caseworker profile updated and saved to persistent database!');
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to persist caseworker profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPass) {
      toast.error('Please enter your current password to verify identity.');
      return;
    }
    if (newPass.length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }
    if (newPass !== confirmPass) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    try {
      await fetchApi('/admin/settings/msw/account/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPass,
          new_password: newPass,
          confirm_password: confirmPass
        })
      });
      setPassUpdated(true);
      toast.success('MSW Caseworker password updated & Argon2id hashed successfully!');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setTimeout(() => setPassUpdated(false), 3000);
    } catch (err: any) {
      toast.error(err.message || 'Password update failed. Verify current password.');
    }
  };

  return (
    <DashboardLayout
      title="Medical Social Worker Profile & Account"
      subtitle="Ophthalmological Foundation of the Philippines — Patient Master Registry & Clinical Directory"
    >
      <div className="w-full pb-12 space-y-6 text-xs font-sans">
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
                    <i className="fa-solid fa-user-doctor text-xs text-[#0B6B3A]" />
                    <span>User Role</span>
                  </span>
                  <span className="font-bold text-[#0B6B3A]">MSW Caseworker</span>
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

                <div>
                  <label className="block font-semibold text-[#10241A] mb-1">
                    User Role / Designation
                  </label>
                  <input
                    type="text"
                    value="MSW Caseworker — Licensed Social Worker (RSW)"
                    readOnly
                    className="w-full h-10 px-3.5 border border-[#EEF2EF] rounded-lg text-xs bg-[#FAFBF8] text-[#0B6B3A] font-bold cursor-not-allowed"
                  />
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
                      <option value="Female (F)">Female (F)</option>
                      <option value="Male (M)">Male (M)</option>
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
                      Educational Attainment / Social Work Degree
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
                      Occupation / Clinical Designation
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
            {/* Change Staff Password Card */}
            <ProfilePasswordChangeCard
              role="msw"
              userId="msw_lead"
              defaultEmail="maria.santos@ofphil.org.ph"
              defaultMobile="0918 555 1234"
              title="Change Staff Password"
              subtitle="Ensure strong credentials to protect sensitive patient socioeconomic records and clinical files."
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
