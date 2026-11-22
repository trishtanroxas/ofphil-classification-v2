'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { toast } from 'sonner';

export default function MSWSettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'work' | 'notifications' | 'casework' | 'accessibility' | 'privacy'>('profile');

  // 01. My Profile State
  const [fullName, setFullName] = useState('Maria Santos (MSW)');
  const [email, setEmail] = useState('m.santos@ofphil.org');
  const [licenseNo, setLicenseNo] = useState('PRC-MSW-099182');
  const [contactNo, setContactNo] = useState('0917 888 1234');

  // 02. Account Security State
  const [twoFactorActive, setTwoFactorActive] = useState(true);

  // 03. Work Preferences State
  const [defaultLanding, setDefaultLanding] = useState('/dashboard');
  const [tableDensity, setTableDensity] = useState('comfortable');
  const [pageSize, setPageSize] = useState('10');

  // 04. Notifications State
  const [notifNewIntake, setNotifNewIntake] = useState(true);
  const [notifOcrParsed, setNotifOcrParsed] = useState(true);
  const [notifDailyFollowup, setNotifDailyFollowup] = useState(true);

  // 05. Casework Preferences State
  const [caseSorting, setCaseSorting] = useState('chronological');
  const [evidencePreview, setEvidencePreview] = useState('split');

  // 06. Accessibility & Appearance State
  const [themeMode, setThemeMode] = useState('light');
  const [fontScale, setFontScale] = useState('100');
  const [fontFamily, setFontFamily] = useState('default');
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Caseworker Profile details saved successfully!');
  };

  const handleSaveWorkPrefs = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Work preferences updated!');
  };

  const handleSaveNotifPrefs = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Notification preferences updated!');
  };

  const handleSaveCaseworkPrefs = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Casework preferences saved!');
  };

  const handleSaveAppearance = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Display & appearance preferences applied!');
  };

  return (
    <DashboardLayout
      title="Medical Social Worker (MSW) Settings"
      subtitle="Ophthalmological Foundation of the Philippines — AI-Assisted Patient Intake & Evaluation"
    >
      <div className="w-full pb-12">
        {/* Horizontal Role Settings Navigation Tabs matching screenshot */}
        <div className="bg-white border border-[#D5E2D9] rounded-2xl p-2 mb-6 shadow-xs overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-2 min-w-max">
            {/* Tab 1: My Profile */}
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border-0 ${
                activeTab === 'profile'
                  ? 'text-[#0B6B3A] border-b-2 border-[#0B6B3A] bg-[#E8F5EC]/60 font-bold'
                  : 'text-[#64748B] hover:text-[#10241A] hover:bg-[#F8FAFC]'
              }`}
            >
              <i className="fa-solid fa-user text-xs" />
              <span>01. My Profile</span>
            </button>

            {/* Tab 2: Account Security */}
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border-0 ${
                activeTab === 'security'
                  ? 'text-[#0B6B3A] border-b-2 border-[#0B6B3A] bg-[#E8F5EC]/60 font-bold'
                  : 'text-[#64748B] hover:text-[#10241A] hover:bg-[#F8FAFC]'
              }`}
            >
              <i className="fa-solid fa-shield-halved text-xs" />
              <span>02. Account Security</span>
            </button>

            {/* Tab 3: Work Preferences */}
            <button
              type="button"
              onClick={() => setActiveTab('work')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border-0 ${
                activeTab === 'work'
                  ? 'text-[#0B6B3A] border-b-2 border-[#0B6B3A] bg-[#E8F5EC]/60 font-bold'
                  : 'text-[#64748B] hover:text-[#10241A] hover:bg-[#F8FAFC]'
              }`}
            >
              <i className="fa-solid fa-table-cells text-xs" />
              <span>03. Work Preferences</span>
            </button>

            {/* Tab 4: Notifications */}
            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border-0 ${
                activeTab === 'notifications'
                  ? 'text-[#0B6B3A] border-b-2 border-[#0B6B3A] bg-[#E8F5EC]/60 font-bold'
                  : 'text-[#64748B] hover:text-[#10241A] hover:bg-[#F8FAFC]'
              }`}
            >
              <i className="fa-solid fa-bell text-xs" />
              <span>04. Notifications</span>
            </button>

            {/* Tab 5: Casework Preferences */}
            <button
              type="button"
              onClick={() => setActiveTab('casework')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border-0 ${
                activeTab === 'casework'
                  ? 'text-[#0B6B3A] border-b-2 border-[#0B6B3A] bg-[#E8F5EC]/60 font-bold'
                  : 'text-[#64748B] hover:text-[#10241A] hover:bg-[#F8FAFC]'
              }`}
            >
              <i className="fa-solid fa-clipboard-check text-xs" />
              <span>05. Casework Preferences</span>
            </button>

            {/* Tab 6: Accessibility & Appearance */}
            <button
              type="button"
              onClick={() => setActiveTab('accessibility')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border-0 ${
                activeTab === 'accessibility'
                  ? 'text-[#0B6B3A] border-b-2 border-[#0B6B3A] bg-[#E8F5EC]/60 font-bold'
                  : 'text-[#64748B] hover:text-[#10241A] hover:bg-[#F8FAFC]'
              }`}
            >
              <i className="fa-solid fa-universal-access text-xs" />
              <span>06. Accessibility &amp; Appearance</span>
            </button>

            {/* Tab 7: Privacy & Sessions */}
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border-0 ${
                activeTab === 'privacy'
                  ? 'text-[#0B6B3A] border-b-2 border-[#0B6B3A] bg-[#E8F5EC]/60 font-bold'
                  : 'text-[#64748B] hover:text-[#10241A] hover:bg-[#F8FAFC]'
              }`}
            >
              <i className="fa-solid fa-laptop-medical text-xs" />
              <span>07. Privacy &amp; Sessions</span>
            </button>
          </div>
        </div>

        {/* Tab 01: My Profile */}
        {activeTab === 'profile' && (
          <div className="bg-white border border-[#D5E2D9] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 text-base font-bold text-[#10241A] mb-1">
              <i className="fa-solid fa-user-doctor text-[#0B6B3A]" />
              <span>Caseworker Profile Details</span>
            </div>
            <p className="text-xs text-[#5A7466] mb-6">
              Manage your personal caseworker information, medical social service identification, and clinic contact.
            </p>

            <form onSubmit={handleSaveProfile}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-[#10241A] mb-1.5">Full Name &amp; Title</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] text-xs font-medium text-[#10241A] focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30 focus:border-[#0B6B3A] transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#10241A] mb-1.5">Caseworker Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] text-xs font-medium text-[#10241A] focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30 focus:border-[#0B6B3A] transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#10241A] mb-1.5">Social Service License / ID Number</label>
                  <input
                    type="text"
                    value={licenseNo}
                    onChange={(e) => setLicenseNo(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] text-xs font-medium text-[#10241A] focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30 focus:border-[#0B6B3A] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#10241A] mb-1.5">Direct Clinic Extension / Mobile</label>
                  <input
                    type="text"
                    value={contactNo}
                    onChange={(e) => setContactNo(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] text-xs font-medium text-[#10241A] focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30 focus:border-[#0B6B3A] transition"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#0B6B3A] hover:bg-[#09542E] text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer border-0"
                >
                  <i className="fa-solid fa-floppy-disk text-xs" />
                  <span>Save Profile Details</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 02: Account Security */}
        {activeTab === 'security' && (
          <div className="bg-white border border-[#D5E2D9] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 text-base font-bold text-[#10241A] mb-1">
              <i className="fa-solid fa-key text-[#0B6B3A]" />
              <span>Account Security &amp; Sign-In Protections</span>
            </div>
            <p className="text-xs text-[#5A7466] mb-6">
              Review authentication mechanisms, session encryption, and access controls guarding patient records.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div>
                <label className="block text-xs font-semibold text-[#10241A] mb-1.5">Authentication Provider</label>
                <input
                  type="text"
                  value="Supabase Primary Auth with Local Encrypted Session"
                  readOnly
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] bg-[#F8FAFC] text-xs font-medium text-[#64748B] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#10241A] mb-1.5">Two-Factor Authentication Status</label>
                <input
                  type="text"
                  value="Active • Email One-Time Passcode (OTP)"
                  readOnly
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] bg-[#F8FAFC] text-xs font-medium text-[#0B6B3A] cursor-not-allowed"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F4F9F5] border border-[#D5E2D9] flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#10241A]">Change Password</div>
                <div className="text-[11px] text-[#5A7466]">Ensure a strong password of at least 10 characters with numbers and symbols.</div>
              </div>
              <button
                type="button"
                onClick={() => toast.info('A password reset link has been dispatched to your email address.')}
                className="px-3.5 py-2 rounded-xl border border-[#0B6B3A] text-[#0B6B3A] hover:bg-[#0B6B3A] hover:text-white text-xs font-semibold transition"
              >
                Send Password Reset
              </button>
            </div>
          </div>
        )}

        {/* Tab 03: Work Preferences */}
        {activeTab === 'work' && (
          <div className="bg-white border border-[#D5E2D9] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 text-base font-bold text-[#10241A] mb-1">
              <i className="fa-solid fa-sliders text-[#0B6B3A]" />
              <span>Casework Workspace &amp; Table Density</span>
            </div>
            <p className="text-xs text-[#5A7466] mb-6">
              Configure your default landing queues, pagination limits, and intake masterlist densities.
            </p>

            <form onSubmit={handleSaveWorkPrefs}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-[#10241A] mb-1.5">Default Landing View</label>
                  <select
                    value={defaultLanding}
                    onChange={(e) => setDefaultLanding(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] text-xs font-medium text-[#10241A] focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30 focus:border-[#0B6B3A] bg-white transition"
                  >
                    <option value="/dashboard">Social Worker Dashboard (/dashboard)</option>
                    <option value="/assessment">Patient Assessment &amp; Intake (/assessment)</option>
                    <option value="/documents">Document Processing &amp; OCR (/documents)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#10241A] mb-1.5">Patient Table Display Density</label>
                  <select
                    value={tableDensity}
                    onChange={(e) => setTableDensity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] text-xs font-medium text-[#10241A] focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30 focus:border-[#0B6B3A] bg-white transition"
                  >
                    <option value="comfortable">Comfortable (Default 14px padding)</option>
                    <option value="compact">Compact (High density for large queues)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#10241A] mb-1.5">Records Pagination</label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] text-xs font-medium text-[#10241A] focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30 focus:border-[#0B6B3A] bg-white transition"
                  >
                    <option value="10">10 Patients per page</option>
                    <option value="15">15 Patients per page</option>
                    <option value="25">25 Patients per page</option>
                    <option value="50">50 Patients per page</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#0B6B3A] hover:bg-[#09542E] text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer border-0"
                >
                  <i className="fa-solid fa-floppy-disk text-xs" />
                  <span>Save Workspace Preferences</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 04: Notifications */}
        {activeTab === 'notifications' && (
          <div className="bg-white border border-[#D5E2D9] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 text-base font-bold text-[#10241A] mb-1">
              <i className="fa-solid fa-bell text-[#0B6B3A]" />
              <span>Casework Alerts &amp; Queue Updates</span>
            </div>
            <p className="text-xs text-[#5A7466] mb-6">
              Choose alerts for new intake submissions, OCR document completions, and scheduled consultations.
            </p>

            <form onSubmit={handleSaveNotifPrefs}>
              <div className="space-y-3.5 max-w-2xl mb-6">
                <label className="p-4 bg-[#F8FAFC] border border-[#D5E2D9] rounded-xl flex items-center justify-between cursor-pointer hover:bg-[#F1F5F9] transition">
                  <div>
                    <span className="text-xs font-semibold text-[#10241A] block">Notify when a patient submits a new Step 1 intake form</span>
                    <span className="text-[11px] text-[#64748B] block mt-0.5">Real-time alert when new clinical case summaries arrive in your queue.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifNewIntake}
                    onChange={(e) => setNotifNewIntake(e.target.checked)}
                    className="w-4 h-4 accent-[#0B6B3A] rounded cursor-pointer"
                  />
                </label>

                <label className="p-4 bg-[#F8FAFC] border border-[#D5E2D9] rounded-xl flex items-center justify-between cursor-pointer hover:bg-[#F1F5F9] transition">
                  <div>
                    <span className="text-xs font-semibold text-[#10241A] block">Notify when hospital quotations are successfully parsed via OCR</span>
                    <span className="text-[11px] text-[#64748B] block mt-0.5">Alerts when automated document text extraction is validated and ready for review.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifOcrParsed}
                    onChange={(e) => setNotifOcrParsed(e.target.checked)}
                    className="w-4 h-4 accent-[#0B6B3A] rounded cursor-pointer"
                  />
                </label>

                <label className="p-4 bg-[#F8FAFC] border border-[#D5E2D9] rounded-xl flex items-center justify-between cursor-pointer hover:bg-[#F1F5F9] transition">
                  <div>
                    <span className="text-xs font-semibold text-[#10241A] block">Daily reminder of pending follow-up consultations</span>
                    <span className="text-[11px] text-[#64748B] block mt-0.5">Morning summary of patients awaiting assessment decisions or interviews.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifDailyFollowup}
                    onChange={(e) => setNotifDailyFollowup(e.target.checked)}
                    className="w-4 h-4 accent-[#0B6B3A] rounded cursor-pointer"
                  />
                </label>
              </div>

              <div className="flex justify-start max-w-2xl">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#0B6B3A] hover:bg-[#09542E] text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer border-0"
                >
                  <i className="fa-solid fa-floppy-disk text-xs" />
                  <span>Save Notification Preferences</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 05: Casework Preferences */}
        {activeTab === 'casework' && (
          <div className="bg-white border border-[#D5E2D9] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 text-base font-bold text-[#10241A] mb-1">
              <i className="fa-solid fa-clipboard-list text-[#0B6B3A]" />
              <span>Assessment Review &amp; Display Defaults</span>
            </div>
            <p className="text-xs text-[#5A7466] mb-6">
              Configure sorting priorities, evidence document views, and evaluation layout defaults.
            </p>

            <form onSubmit={handleSaveCaseworkPrefs}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-[#10241A] mb-1.5">Default Case List Sorting</label>
                  <select
                    value={caseSorting}
                    onChange={(e) => setCaseSorting(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] text-xs font-medium text-[#10241A] focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30 focus:border-[#0B6B3A] bg-white transition"
                  >
                    <option value="chronological">Chronological (Most Recent Submissions First)</option>
                    <option value="urgency">High Urgency Priority First</option>
                    <option value="burden">Household Burden Score (Descending)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#10241A] mb-1.5">Socioeconomic Evidence Preview</label>
                  <select
                    value={evidencePreview}
                    onChange={(e) => setEvidencePreview(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] text-xs font-medium text-[#10241A] focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30 focus:border-[#0B6B3A] bg-white transition"
                  >
                    <option value="split">Split View (Show Document side-by-side with Form)</option>
                    <option value="modal">Full Screen Modal Preview</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-[#F4F9F5] rounded-xl border border-[#D5E2D9] text-xs text-[#2C4A3E] mb-6 flex items-start gap-3">
                <i className="fa-solid fa-shield-halved text-[#0B6B3A] mt-0.5" />
                <div>
                  <strong className="font-semibold text-[#10241A]">Casework Integrity Policy:</strong> Official eligibility decisions and guarantee letter endorsements must be performed inside the individual patient review workflow to preserve an immutable audit trail.
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#0B6B3A] hover:bg-[#09542E] text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer border-0"
                >
                  <i className="fa-solid fa-floppy-disk text-xs" />
                  <span>Save Casework Defaults</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 06: Accessibility & Appearance */}
        {activeTab === 'accessibility' && (
          <div className="bg-white border border-[#D5E2D9] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 text-base font-bold text-[#10241A] mb-1">
              <i className="fa-solid fa-eye text-[#0B6B3A]" />
              <span>Visual Theme &amp; Display Accessibility</span>
            </div>
            <p className="text-xs text-[#5A7466] mb-6">
              Adjust typography, high contrast modes, and date representations for comfortable clinical review.
            </p>

            <form onSubmit={handleSaveAppearance}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-[#10241A] mb-1.5">Theme &amp; Contrast Mode</label>
                  <select
                    value={themeMode}
                    onChange={(e) => setThemeMode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] text-xs font-medium text-[#10241A] focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30 focus:border-[#0B6B3A] bg-white transition"
                  >
                    <option value="light">Studio Clinical Light</option>
                    <option value="dark">Dim / Dark Mode</option>
                    <option value="high-contrast">High-Contrast Mode</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#10241A] mb-1.5">Font Size &amp; Scaling</label>
                  <select
                    value={fontScale}
                    onChange={(e) => setFontScale(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] text-xs font-medium text-[#10241A] focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30 focus:border-[#0B6B3A] bg-white transition"
                  >
                    <option value="100">Standard (100%)</option>
                    <option value="110">Comfortable (110%)</option>
                    <option value="120">Large Text (120%)</option>
                    <option value="130">Extra Large (130%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#10241A] mb-1.5">Font Family Style</label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] text-xs font-medium text-[#10241A] focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30 focus:border-[#0B6B3A] bg-white transition"
                  >
                    <option value="default">Default Clinical Sans</option>
                    <option value="serif">Readable Editorial Serif</option>
                    <option value="accessible-sans">Low-Vision / Wide Sans</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#10241A] mb-1.5">Date &amp; Time Format</label>
                  <select
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] text-xs font-medium text-[#10241A] focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30 focus:border-[#0B6B3A] bg-white transition"
                  >
                    <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-11-22)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 11/22/2026)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setThemeMode('light');
                    setFontScale('100');
                    setFontFamily('default');
                    setDateFormat('YYYY-MM-DD');
                    toast.info('Appearance reset to clinical defaults.');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-[#D5E2D9] text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] transition"
                >
                  <i className="fa-solid fa-rotate-left mr-2" />
                  Reset to Default Appearance
                </button>

                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#0B6B3A] hover:bg-[#09542E] text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer border-0"
                >
                  <i className="fa-solid fa-floppy-disk text-xs" />
                  <span>Save &amp; Apply Appearance</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 07: Privacy & Sessions */}
        {activeTab === 'privacy' && (
          <div className="bg-white border border-[#D5E2D9] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 text-base font-bold text-[#10241A] mb-1">
              <i className="fa-solid fa-laptop-medical text-[#0B6B3A]" />
              <span>Active Caseworker Devices &amp; Sessions</span>
            </div>
            <p className="text-xs text-[#5A7466] mb-6">
              Review current clinic workstation access and terminate concurrent sessions across devices.
            </p>

            <div className="p-4 bg-[#F8FAFC] border border-[#D5E2D9] rounded-xl mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-lg">
                    <i className="fa-solid fa-desktop" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[#10241A]">Current Browser Session</div>
                    <div className="text-[11px] text-[#64748B]">Clinic Workstation &bull; Authenticated Medical Social Worker</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#E8F5EC] text-[#0B6B3A]">
                  <i className="fa-solid fa-circle-check text-[10px]" />
                  Active Now
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => toast.success('Signed out other workstation sessions.')}
              className="px-4 py-2.5 rounded-xl border border-[#D5E2D9] text-xs font-semibold text-[#DC2626] hover:bg-[#FEF2F2] transition"
            >
              <i className="fa-solid fa-arrow-right-from-bracket mr-2" />
              Sign Out Other Workstations
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
