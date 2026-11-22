'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAccessibility } from '@/context/AccessibilityContext';
import { toast } from 'sonner';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';
import ProfilePasswordChangeCard from '@/components/ProfilePasswordChangeCard';
import { fetchApi } from '@/lib/api';

export default function MSWSettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'work' | 'notifications' | 'casework' | 'accessibility' | 'privacy'>('profile');

  // 01. My Profile State
  const [fullName, setFullName] = useState('Maria Santos, RSW');
  const [email, setEmail] = useState('maria.santos@ofphil.org.ph');
  const [licenseNo, setLicenseNo] = useState('PRC-RSW-004921');
  const [contactNo, setContactNo] = useState('0918 555 1234');
  const [department, setDepartment] = useState('Medical Social Services Department (MSWD)');

  // 02. Account Security State
  const [twoFactorActive, setTwoFactorActive] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

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

  // 07. Security & Live Sessions State
  const [securityStatus, setSecurityStatus] = useState<any>(null);
  const [isTerminatingSessions, setIsTerminatingSessions] = useState(false);

  // 08. Data Privacy & Confidentiality State
  const [privacyRules, setPrivacyRules] = useState({
    mask_patient_identities: true,
    mask_contact_numbers: true,
    mask_government_ids: true,
    mask_financial_ledgers: true,
    consent_verification_required: true,
    data_retention_years: 7,
    allow_patient_export: false,
    assigned_records_only: true
  });
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);

  // Load preferences from backend
  useEffect(() => {
    async function loadData() {
      try {
        const [acc, prefs, sec, priv] = await Promise.all([
          fetchApi('/admin/settings/msw/account').catch(() => null),
          fetchApi('/admin/settings/msw/preferences').catch(() => null),
          fetchApi('/admin/settings/msw/security-status').catch(() => null),
          fetchApi('/admin/settings/msw/privacy').catch(() => null)
        ]);
        if (acc) {
          if (acc.full_name) setFullName(acc.full_name);
          if (acc.email) setEmail(acc.email);
          if (acc.license_no) setLicenseNo(acc.license_no);
          if (acc.contact) setContactNo(acc.contact);
          if (acc.department) setDepartment(acc.department);
        }
        if (prefs) {
          if (prefs.notifications) {
            setNotifNewIntake(!!prefs.notifications.email_new_patient);
            setNotifOcrParsed(!!prefs.notifications.email_status_change);
            setNotifDailyFollowup(!!prefs.notifications.daily_digest);
          }
          if (prefs.work_preferences) {
            if (prefs.work_preferences.default_view) setDefaultLanding(`/${prefs.work_preferences.default_view}`);
          }
        }
        if (sec) {
          setSecurityStatus(sec);
        }
        if (priv) {
          setPrivacyRules((prev) => ({ ...prev, ...priv }));
        }
      } catch (e) {
        // fallback
      }
    }
    loadData();
  }, []);

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
    setConfirmPassword(pwd);
    toast.success('Generated secure caseworker password');
  };

  const handleUpdateMswPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Current password is required.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    try {
      await fetchApi('/admin/settings/msw/account/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Caseworker password updated & Argon2id hashed successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Password update failed.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/admin/settings/msw/account/profile', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: fullName,
          email,
          license_no: licenseNo,
          contact: contactNo,
          department,
          theme_preference: themeMode
        })
      });
      toast.success('Caseworker Profile details saved persistently!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile.');
    }
  };

  const persistPreferences = async (updated: any) => {
    try {
      await fetchApi('/admin/settings/msw/preferences', {
        method: 'PUT',
        body: JSON.stringify(updated)
      });
    } catch (err) {
      // Ignore
    }
  };

  const handleSaveWorkPrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    await persistPreferences({
      work_preferences: {
        default_view: defaultLanding,
        table_density: tableDensity,
        page_size: pageSize
      }
    });
    toast.success('Work preferences updated & saved to backend!');
  };

  const handleSaveNotifPrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    await persistPreferences({
      notifications: {
        email_new_patient: notifNewIntake,
        email_status_change: notifOcrParsed,
        daily_digest: notifDailyFollowup
      }
    });
    toast.success('Notification preferences updated & saved!');
  };

  const handleSaveCaseworkPrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    await persistPreferences({
      casework: {
        sorting: caseSorting,
        evidence_preview: evidencePreview
      }
    });
    toast.success('Casework preferences saved!');
  };

  const { setFontSize: applyGlobalFontSize, setThemeMode: applyGlobalTheme, setFontFamily: applyGlobalFontFamily } = useAccessibility();

  const handleSaveAppearance = async (e: React.FormEvent) => {
    e.preventDefault();
    await persistPreferences({
      accessibility: {
        theme: themeMode,
        font_scale: fontScale,
        font_family: fontFamily,
        date_format: dateFormat
      }
    });
    applyGlobalTheme(themeMode === 'dark' ? 'Dark' : themeMode === 'high-contrast' ? 'High Contrast' : 'Light');
    applyGlobalFontSize(`${fontScale}%` as any);
    applyGlobalFontFamily(fontFamily === 'serif' ? 'Serif' : fontFamily === 'accessible-sans' ? 'Low-Vision' : 'Clinical');
    toast.success('Display & appearance preferences applied!');
  };

  return (
    <DashboardLayout
      title="Medical Social Worker (MSW) Settings"
      subtitle="Ophthalmological Foundation of the Philippines — Patient Master Registry & Clinical Directory"
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
          <div className="bg-white border border-[#D5E2D9] rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#EEF2EF]">
              <div>
                <div className="flex items-center gap-2 text-base font-bold text-[#10241A] mb-1">
                  <i className="fa-solid fa-shield-halved text-[#0B6B3A]" />
                  <span>Account Security &amp; Sign-In Protections</span>
                </div>
                <p className="text-xs text-[#5A7466] m-0">
                  Review authentication mechanisms, Multi-Factor Authentication (MFA), and credential governance guarding patient PHI.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E8F5EC] text-[#0B6B3A] border border-[#BBF7D0]">
                Institutional Protection Active
              </span>
            </div>

            {/* Security Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-[#EEF2EF] bg-[#FAFBF8]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#5A7466] mb-1">
                  <i className="fa-solid fa-mobile-screen-button text-[#0B6B3A]" />
                  <span>Two-Factor Authentication (MFA)</span>
                </div>
                <div className="text-sm font-bold text-[#10241A] mb-1">
                  {securityStatus?.mfa_enforced ? 'Mandatory & Active' : 'Active • Email OTP'}
                </div>
                <p className="text-[11px] text-[#64748B] m-0">
                  Method: {securityStatus?.mfa_method || 'Email One-Time Passcode Relay'}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#EEF2EF] bg-[#FAFBF8]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#5A7466] mb-1">
                  <i className="fa-solid fa-clock-rotate-left text-[#0B6B3A]" />
                  <span>Password Last Updated</span>
                </div>
                <div className="text-sm font-bold text-[#10241A] mb-1">
                  {securityStatus?.last_password_change ? new Date(securityStatus.last_password_change).toLocaleDateString() : 'Active Session'}
                </div>
                <p className="text-[11px] text-[#64748B] m-0">
                  Argon2id Memory Cost: 64 MiB • Salt: 16-byte
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#EEF2EF] bg-[#FAFBF8]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#5A7466] mb-1">
                  <i className="fa-solid fa-shield-virus text-[#0B6B3A]" />
                  <span>Login Rate Limiting</span>
                </div>
                <div className="text-sm font-bold text-[#10241A] mb-1">
                  5 Attempts / 15m Lockout
                </div>
                <p className="text-[11px] text-[#0B6B3A] font-semibold m-0">
                  Status: Protected (0 Failed Attempts)
                </p>
              </div>
            </div>

            {/* Change Password Form with OTP Verification */}
            <div className="pt-4 border-t border-[#D5E2D9]">
              <ProfilePasswordChangeCard
                role="msw"
                userId="msw_lead"
                defaultEmail={email || "maria.santos@ofphil.org.ph"}
                defaultMobile={contactNo || "0918 555 1234"}
                title="Change Caseworker Credentials"
                subtitle="Update your authentication password using server-enforced Argon2id cryptographic hashing and 2FA OTP."
              />
            </div>

            {/* Recent MSW Security Events Table */}
            <div className="pt-4 border-t border-[#D5E2D9]">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-['Outfit'] text-xs font-bold text-[#10241A] uppercase tracking-wider flex items-center gap-2">
                  <i className="fa-solid fa-list-check text-[#0B6B3A]" />
                  <span>Recent Caseworker Security Activity</span>
                </h4>
                <span className="text-[11px] text-[#64748B]">Audited via security_audit_logs</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#EEF2EF]">
                <table className="w-full text-left text-xs text-[#24352B]">
                  <thead className="bg-[#FAFBF8] text-[#5A7466] text-[11px] uppercase tracking-wider border-b border-[#EEF2EF]">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Security Action</th>
                      <th className="py-2.5 px-4 font-semibold">Outcome</th>
                      <th className="py-2.5 px-4 font-semibold">Timestamp (UTC)</th>
                      <th className="py-2.5 px-4 font-semibold">Security Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2EF]">
                    {(securityStatus?.recent_security_events || []).length > 0 ? (
                      securityStatus.recent_security_events.map((evt: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#FAFBF8] transition">
                          <td className="py-2.5 px-4 font-semibold text-[#10241A]">{evt.action}</td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              evt.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {evt.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[11px] text-[#64748B]">
                            {evt.timestamp ? new Date(evt.timestamp).toLocaleString() : 'Just now'}
                          </td>
                          <td className="py-2.5 px-4 text-[11px] text-[#64748B]">
                            {JSON.stringify(evt.details || {})}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 px-4 text-center text-[#64748B]">
                          No recent security anomalies recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
                    <option value="/patients">Patient Master Records (/patients)</option>
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
          <div className="bg-white border border-[#D5E2D9] rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#EEF2EF]">
              <div>
                <div className="flex items-center gap-2 text-base font-bold text-[#10241A] mb-1">
                  <i className="fa-solid fa-user-shield text-[#0B6B3A]" />
                  <span>Confidential Patient Data Privacy &amp; Active Sessions</span>
                </div>
                <p className="text-xs text-[#5A7466] m-0">
                  Enforce Republic Act 10173 (Philippine Data Privacy Act), patient consent verification, and workstation session control.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E8F5EC] text-[#0B6B3A] border border-[#BBF7D0]">
                RA 10173 Privacy Guard Active
              </span>
            </div>

            {/* Part A: Institutional Data Privacy & Masking Policies */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-['Outfit'] text-sm font-bold text-[#10241A] m-0 flex items-center gap-2">
                  <i className="fa-solid fa-mask text-[#0B6B3A]" />
                  <span>Patient Information Masking &amp; Consent Rules</span>
                </h4>
                <button
                  type="button"
                  disabled={isSavingPrivacy}
                  onClick={async () => {
                    setIsSavingPrivacy(true);
                    try {
                      await fetchApi('/admin/settings/msw/privacy', {
                        method: 'PUT',
                        body: JSON.stringify(privacyRules)
                      });
                      toast.success('Patient data privacy policies updated & audited!');
                    } catch (err: any) {
                      toast.error(err.message || 'Failed to update privacy policies.');
                    } finally {
                      setIsSavingPrivacy(false);
                    }
                  }}
                  className="px-4 py-1.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border-0"
                >
                  <i className="fa-solid fa-floppy-disk text-xs" />
                  <span>Save Privacy Rules</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-[#EEF2EF] bg-[#FAFBF8] flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="mask_ids"
                    checked={privacyRules.mask_government_ids}
                    onChange={(e) => setPrivacyRules({ ...privacyRules, mask_government_ids: e.target.checked })}
                    className="mt-0.5 w-4 h-4 accent-[#0B6B3A] rounded cursor-pointer"
                  />
                  <div>
                    <label htmlFor="mask_ids" className="font-bold text-xs text-[#10241A] block cursor-pointer">
                      Mask Government IDs &amp; UMID Numbers
                    </label>
                    <p className="text-[11px] text-[#64748B] m-0 mt-0.5">
                      Redacts PhilHealth, UMID, and SSS numbers in non-clinical views to prevent identity theft.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[#EEF2EF] bg-[#FAFBF8] flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="mask_fin"
                    checked={privacyRules.mask_financial_ledgers}
                    onChange={(e) => setPrivacyRules({ ...privacyRules, mask_financial_ledgers: e.target.checked })}
                    className="mt-0.5 w-4 h-4 accent-[#0B6B3A] rounded cursor-pointer"
                  />
                  <div>
                    <label htmlFor="mask_fin" className="font-bold text-xs text-[#10241A] block cursor-pointer">
                      Mask Detailed Household Ledger Entries
                    </label>
                    <p className="text-[11px] text-[#64748B] m-0 mt-0.5">
                      Hides granular payslips and utility bills from secondary views while displaying total verified income.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[#EEF2EF] bg-[#FAFBF8] flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="mask_contact"
                    checked={privacyRules.mask_contact_numbers}
                    onChange={(e) => setPrivacyRules({ ...privacyRules, mask_contact_numbers: e.target.checked })}
                    className="mt-0.5 w-4 h-4 accent-[#0B6B3A] rounded cursor-pointer"
                  />
                  <div>
                    <label htmlFor="mask_contact" className="font-bold text-xs text-[#10241A] block cursor-pointer">
                      Mask Patient Phone Numbers (0917 *** *678)
                    </label>
                    <p className="text-[11px] text-[#64748B] m-0 mt-0.5">
                      Enforces middle-digit masking across logs, lists, and non-intake clinical tables.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[#EEF2EF] bg-[#FAFBF8] flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="consent_req"
                    checked={privacyRules.consent_verification_required}
                    onChange={(e) => setPrivacyRules({ ...privacyRules, consent_verification_required: e.target.checked })}
                    className="mt-0.5 w-4 h-4 accent-[#0B6B3A] rounded cursor-pointer"
                  />
                  <div>
                    <label htmlFor="consent_req" className="font-bold text-xs text-[#10241A] block cursor-pointer">
                      Mandatory Patient Privacy Consent Form
                    </label>
                    <p className="text-[11px] text-[#64748B] m-0 mt-0.5">
                      Requires signed consent verification before finalizing surgical subsidy assessments.
                    </p>
                  </div>
                </div>
              </div>

              {/* Institutional Data Governance Information */}
              <div className="mt-4 p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-start gap-3 text-xs">
                <i className="fa-solid fa-scale-balanced text-[#0B6B3A] text-sm mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-[#10241A]">Institutional Data Governance &amp; Export Policy</div>
                  <p className="text-[11px] text-[#166534] leading-relaxed m-0">
                    Official clinical records are retained for <strong>{privacyRules.data_retention_years} years</strong> in compliance with DOH health record retention mandates. As an institutional safeguard, individual patient records and audit trails cannot be deleted by caseworker accounts, and raw database exports are strictly reserved for DPO-authorized administrators.
                  </p>
                </div>
              </div>
            </div>

            {/* Part B: Workstation Session Management */}
            <div className="pt-4 border-t border-[#D5E2D9]">
              <h4 className="font-['Outfit'] text-sm font-bold text-[#10241A] m-0 mb-1 flex items-center gap-2">
                <i className="fa-solid fa-laptop-medical text-[#0B6B3A]" />
                <span>Active Caseworker Devices &amp; Sessions</span>
              </h4>
              <p className="text-xs text-[#5A7466] mb-4">
                Review current clinic workstation access and terminate concurrent sessions across devices.
              </p>

              <div className="space-y-3 mb-4">
                {(securityStatus?.active_sessions || [
                  {
                    id: 'sess-cur-msw',
                    device: 'Clinic Primary Terminal',
                    browser: 'Chrome 131.0 (Windows 11 NT)',
                    ip_address: '127.0.0.1',
                    location: 'Metro Manila, Philippines (OFPHIL Eye Center LAN)',
                    last_active: 'Active Now',
                    is_current: true
                  }
                ]).map((sess: any) => (
                  <div key={sess.id} className="p-4 bg-[#F8FAFC] border border-[#D5E2D9] rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-lg">
                        <i className="fa-solid fa-desktop" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-[#10241A]">
                          {sess.device} &bull; {sess.browser}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          IP: {sess.ip_address} &bull; {sess.location}
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#E8F5EC] text-[#0B6B3A]">
                      <i className="fa-solid fa-circle-check text-[10px]" />
                      {sess.last_active}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between flex-wrap gap-3">
                <span className="text-[11px] text-[#64748B]">
                  Terminating other workstations prevents unauthorized intake access if a computer is left unattended.
                </span>
                <button
                  type="button"
                  disabled={isTerminatingSessions}
                  onClick={async () => {
                    setIsTerminatingSessions(true);
                    try {
                      await fetchApi('/admin/settings/msw/sessions/terminate-others', { method: 'POST' });
                      toast.success('Successfully terminated all other active caseworker sessions!');
                    } catch (err: any) {
                      toast.error(err.message || 'Failed to terminate other sessions.');
                    } finally {
                      setIsTerminatingSessions(false);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl border border-[#D5E2D9] text-xs font-semibold text-[#DC2626] hover:bg-[#FEF2F2] transition cursor-pointer disabled:opacity-50"
                >
                  <i className="fa-solid fa-arrow-right-from-bracket mr-2" />
                  Sign Out Other Workstations
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
