'use client';
import React, { useState, useEffect, useTransition } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';
import { CautionModal } from '@/components/CautionModal';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';
import { useNavigationBlocker } from '@/context/NavigationBlockerContext';
import { useLoadingScreen } from '@/context/LoadingScreenContext';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('org_profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dirtyTabs, setDirtyTabs] = useState<Record<string, boolean>>({});
  const { isDirty, setIsDirty, confirmNavigation } = useNavigationBlocker();
  const { startProgress } = useLoadingScreen();

  // Tab switch confirmation modal state
  const [pendingTabChange, setPendingTabChange] = useState<string | null>(null);
  const [unsavedTabModalOpen, setUnsavedTabModalOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Tab 1: Organization Profile State
  // ---------------------------------------------------------------------------
  const [legalName, setLegalName] = useState('OFPHIL Eye Center Manila');
  const [operatingDesk, setOperatingDesk] = useState('Medical Social Service & Eye Surgery Admissions Wing');
  const [clinicAddress, setClinicAddress] = useState('Metro Manila Eye Center, Manila, Philippines');
  const [hotlineContact, setHotlineContact] = useState('(02) 8888-OPHI (6744) / Local 104');
  const [inquiriesEmail, setInquiriesEmail] = useState('contact@ofphil.org.ph');
  const [operatingHours, setOperatingHours] = useState('Monday to Friday: 8:00 AM – 4:00 PM');

  // ---------------------------------------------------------------------------
  // Tab 2: Security Policies State
  // ---------------------------------------------------------------------------
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [maxLifetimeHours, setMaxLifetimeHours] = useState('12');
  const [enforce2FA, setEnforce2FA] = useState(true);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState('5');
  const [lockoutMinutes, setLockoutMinutes] = useState('15');
  const [ipWhitelist, setIpWhitelist] = useState('192.168.1.0/24, 10.0.0.0/8');
  const [minPasswordLength, setMinPasswordLength] = useState('8');
  const [requireSpecialChars, setRequireSpecialChars] = useState(true);
  const [reauthSensitive, setReauthSensitive] = useState(true);

  // Live Technical Infrastructure & Cryptography Status
  const [infraStatus, setInfraStatus] = useState<any>(null);

  // ---------------------------------------------------------------------------
  // Tab 3: Privacy & Data Access State
  // ---------------------------------------------------------------------------
  const [dataRetentionYears, setDataRetentionYears] = useState('7');
  const [docRetentionYears, setDocRetentionYears] = useState('5');
  const [auditLogRetentionYears, setAuditLogRetentionYears] = useState('10');
  const [dpoContact, setDpoContact] = useState('dpo@ofphil.org.ph');
  const [auditLogging, setAuditLogging] = useState(true);
  const [maskNames, setMaskNames] = useState(true);
  const [maskContacts, setMaskContacts] = useState(true);
  const [maskAddresses, setMaskAddresses] = useState(true);
  const [deidentifyResearch, setDeidentifyResearch] = useState(true);

  // ---------------------------------------------------------------------------
  // Tab 4: Appointments & Queue State
  // ---------------------------------------------------------------------------
  const [maxDailyIntake, setMaxDailyIntake] = useState('60');
  const [slotDurationMinutes, setSlotDurationMinutes] = useState('20');
  const [allowWalkIns, setAllowWalkIns] = useState(true);
  const [operatingStartTime, setOperatingStartTime] = useState('08:00');
  const [operatingEndTime, setOperatingEndTime] = useState('16:00');
  const [cancellationCutoffHours, setCancellationCutoffHours] = useState('24');
  const [reminderLeadHours, setReminderLeadHours] = useState('24');

  // ---------------------------------------------------------------------------
  // Tab 5: Notifications State
  // ---------------------------------------------------------------------------
  const [emailAlertsActive, setEmailAlertsActive] = useState(true);
  const [smsGatewayActive, setSmsGatewayActive] = useState(false);
  const [adminDailyDigest, setAdminDailyDigest] = useState(true);
  const [notifyApptConfirm, setNotifyApptConfirm] = useState(true);
  const [notifyQueueUpdate, setNotifyQueueUpdate] = useState(true);
  const [notifySecurityAlert, setNotifySecurityAlert] = useState(true);
  const [notifyPasswordChange, setNotifyPasswordChange] = useState(true);
  const [testEmailRecipient, setTestEmailRecipient] = useState('admin@ofphil.org.ph');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // ---------------------------------------------------------------------------
  // Tab 6: Audit Logs State
  // ---------------------------------------------------------------------------
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');
  const [auditStatusFilter, setAuditStatusFilter] = useState('ALL');
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // ---------------------------------------------------------------------------
  // Tab 7: Personal Account & Display State
  // ---------------------------------------------------------------------------
  const [staffUsername, setStaffUsername] = useState('admin_sys');
  const [staffFullName, setStaffFullName] = useState('Dr. Roberto Reyes');
  const [staffEmail, setStaffEmail] = useState('admin@ofphil.org.ph');
  const [staffRole, setStaffRole] = useState('Clinic Administrator (Super-Admin Authority)');
  const [staffDepartment, setStaffDepartment] = useState('Clinic Operations & Governance');
  const [themePreference, setThemePreference] = useState('light');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleGenerateAdminPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
    setConfirmPassword(pwd);
    toast.success('Generated secure administrator password');
  };
  const [clearAuditModalOpen, setClearAuditModalOpen] = useState(false);
  const [isClearingLogs, setIsClearingLogs] = useState(false);

  // Caution Modal State for Disabling Controls/Policies
  const [cautionModalOpen, setCautionModalOpen] = useState(false);
  const [pendingDisableAction, setPendingDisableAction] = useState<{
    settingName: string;
    description?: string;
    warningDetails?: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  const requestToggleOff = (
    settingName: string,
    description: string,
    warningDetails: string,
    onConfirm: () => void,
    confirmLabel?: string
  ) => {
    setPendingDisableAction({
      settingName,
      description,
      warningDetails,
      confirmLabel,
      onConfirm,
    });
    setCautionModalOpen(true);
  };

  // Sync global navigation blocker when dirtyTabs changes
  useEffect(() => {
    const hasDirty = Object.values(dirtyTabs).some(Boolean);
    setIsDirty(hasDirty);
  }, [dirtyTabs, setIsDirty]);

  // Mark active tab dirty
  const markDirty = (tab: string) => {
    setDirtyTabs((prev) => ({ ...prev, [tab]: true }));
  };

  const markClean = (tab: string) => {
    setDirtyTabs((prev) => ({ ...prev, [tab]: false }));
  };

  // Safe Tab Navigation with In-App Modal Dialog
  const handleTabChange = (newTab: string) => {
    if (newTab === activeTab) return;
    startProgress();
    if (dirtyTabs[activeTab]) {
      setPendingTabChange(newTab);
      setUnsavedTabModalOpen(true);
      return;
    }
    setActiveTab(newTab);
  };

  const confirmTabSwitch = () => {
    if (pendingTabChange) {
      // Discard current active tab dirty status
      setDirtyTabs((prev) => ({ ...prev, [activeTab]: false }));
      setActiveTab(pendingTabChange);
      setPendingTabChange(null);
    }
    setUnsavedTabModalOpen(false);
  };

  const cancelTabSwitch = () => {
    setPendingTabChange(null);
    setUnsavedTabModalOpen(false);
  };

  // Clean up dirty state on unmount
  useEffect(() => {
    return () => {
      setIsDirty(false);
    };
  }, [setIsDirty]);

  // Initial Data Fetching from FastAPI Backend
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function loadAllSettings() {
      setIsLoading(true);
      try {
        const headers = { 'x-user-role': 'admin', 'x-user-id': 'admin_sys' };

        // 1. Organization Profile
        try {
          const org = await fetchApi('/admin/settings/organization', { headers });
          if (org) {
            setLegalName(org.legal_name || '');
            setOperatingDesk(org.operating_desk || '');
            setClinicAddress(org.clinic_address || '');
            setHotlineContact(org.hotline_contact || '');
            setInquiriesEmail(org.inquiries_email || '');
            setOperatingHours(org.operating_hours || '');
          }
        } catch (e) {
          console.warn('Failed loading organization settings:', e);
        }

        // 2. Security Policies
        try {
          const sec = await fetchApi('/admin/settings/security', { headers });
          if (sec) {
            setSessionTimeout(String(sec.session_policies?.session_timeout_minutes || 30));
            setMaxLifetimeHours(String(sec.session_policies?.max_session_lifetime_hours || 12));
            setEnforce2FA(sec.auth_policies?.enforce_2fa ?? true);
            setMaxLoginAttempts(String(sec.auth_policies?.max_login_attempts || 5));
            setLockoutMinutes(String(sec.auth_policies?.lockout_duration_minutes || 15));
            setIpWhitelist(sec.session_policies?.ip_whitelist || '');
            setMinPasswordLength(String(sec.auth_policies?.min_password_length || 8));
            setRequireSpecialChars(sec.auth_policies?.require_special_chars ?? true);
            setReauthSensitive(sec.auth_policies?.reauth_for_sensitive_actions ?? true);
          }
        } catch (e) {
          console.warn('Failed loading security settings:', e);
        }

        // 2b. Technical Infrastructure Status
        try {
          const infra = await fetchApi('/admin/settings/security/infrastructure-status', { headers });
          setInfraStatus(infra);
        } catch (e) {
          console.warn('Failed loading infrastructure status:', e);
        }

        // 3. Privacy & Data Access
        try {
          const priv = await fetchApi('/admin/settings/privacy', { headers });
          if (priv) {
            setDataRetentionYears(String(priv.data_retention_years || 7));
            setDocRetentionYears(String(priv.retention_policies?.supporting_documents_years || 5));
            setAuditLogRetentionYears(String(priv.retention_policies?.audit_logs_years || 10));
            setDpoContact(priv.dpo_email || '');
            setAuditLogging(priv.audit_logging_enabled ?? true);
            setMaskNames(priv.masking_rules?.mask_names_for_non_clinical ?? true);
            setMaskContacts(priv.masking_rules?.mask_contact_numbers ?? true);
            setMaskAddresses(priv.masking_rules?.mask_addresses ?? true);
            setDeidentifyResearch(priv.deidentify_research_exports ?? true);
          }
        } catch (e) {
          console.warn('Failed loading privacy settings:', e);
        }

        // 4. Appointments & Queue
        try {
          const q = await fetchApi('/admin/settings/queue', { headers });
          if (q) {
            setMaxDailyIntake(String(q.max_daily_intake || 60));
            setSlotDurationMinutes(String(q.slot_duration_minutes || 20));
            setAllowWalkIns(q.allow_walk_ins ?? true);
            setOperatingStartTime(q.operating_start_time || '08:00');
            setOperatingEndTime(q.operating_end_time || '16:00');
            setCancellationCutoffHours(String(q.cancellation_cutoff_hours || 24));
            setReminderLeadHours(String(q.appointment_reminder_lead_hours || 24));
          }
        } catch (e) {
          console.warn('Failed loading queue settings:', e);
        }

        // 5. Notifications
        try {
          const notif = await fetchApi('/admin/settings/notifications', { headers });
          if (notif) {
            setEmailAlertsActive(notif.email_alerts_active ?? true);
            setSmsGatewayActive(notif.sms_gateway_active ?? false);
            setAdminDailyDigest(notif.admin_daily_digest ?? true);
            setNotifyApptConfirm(notif.notify_on_appointment_confirmed ?? true);
            setNotifyQueueUpdate(notif.notify_on_queue_update ?? true);
            setNotifySecurityAlert(notif.notify_on_security_alert ?? true);
            setNotifyPasswordChange(notif.notify_on_password_change ?? true);
          }
        } catch (e) {
          console.warn('Failed loading notification settings:', e);
        }

        // 7. Personal Account
        try {
          const acc = await fetchApi('/admin/settings/account', { headers });
          if (acc) {
            setStaffUsername(acc.username || 'admin_sys');
            setStaffFullName(acc.full_name || 'Dr. Roberto Reyes');
            setStaffEmail(acc.email || 'admin@ofphil.org.ph');
            setStaffRole(acc.role || 'Clinic Administrator (Super-Admin Authority)');
            setStaffDepartment(acc.department || 'Clinic Operations & Governance');
            setThemePreference(acc.theme_preference || 'light');
            setTestEmailRecipient(acc.email || 'admin@ofphil.org.ph');
          }
        } catch (e) {
          console.warn('Failed loading personal account profile:', e);
        }
      } catch (err: any) {
        toast.error(`Error loading settings: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    loadAllSettings();
  }, []);

  // Fetch Audit Logs when tab or filters change
  const fetchAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const headers = { 'x-user-role': 'admin', 'x-user-id': 'admin_sys' };
      const queryParams = new URLSearchParams({
        page: String(auditPage),
        page_size: '10',
        search: auditSearch,
        action: auditActionFilter,
        status_filter: auditStatusFilter,
      });

      const res = await fetchApi(`/admin/settings/audit-logs?${queryParams.toString()}`, { headers });
      if (res && res.items) {
        setAuditLogs(res.items);
        setAuditTotal(res.total_count);
      }
    } catch (e: any) {
      toast.error(`Failed to load audit logs: ${e.message}`);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, auditPage, auditActionFilter, auditStatusFilter]);

  // Clear Audit Logs Action
  const handleConfirmClearAuditLogs = async () => {
    setIsClearingLogs(true);
    try {
      const headers = { 'x-user-role': 'admin', 'x-user-id': 'admin_sys' };
      const res = await fetchApi('/admin/settings/audit-logs', {
        method: 'DELETE',
        headers,
      });

      if (res?.success) {
        toast.success('Administrative security audit logs cleared successfully!');
        setClearAuditModalOpen(false);
        fetchAuditLogs();
      }
    } catch (e: any) {
      toast.error(`Failed to clear audit logs: ${e.message}`);
    } finally {
      setIsClearingLogs(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Save Handlers
  // ---------------------------------------------------------------------------
  const handleSaveOrgProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        legal_name: legalName,
        operating_desk: operatingDesk,
        clinic_address: clinicAddress,
        hotline_contact: hotlineContact,
        inquiries_email: inquiriesEmail,
        operating_hours: operatingHours,
      };

      const res = await fetchApi('/admin/settings/organization', {
        method: 'PUT',
        headers: { 'x-user-role': 'admin', 'x-user-id': 'admin_sys' },
        body: JSON.stringify(payload),
      });

      if (res?.success) {
        toast.success('Organization & Clinic Profile updated successfully!');
        markClean('org_profile');
      }
    } catch (err: any) {
      toast.error(`Failed to update profile: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        auth_policies: {
          min_password_length: parseInt(minPasswordLength, 10) || 8,
          require_uppercase: true,
          require_lowercase: true,
          require_numbers: true,
          require_special_chars: requireSpecialChars,
          max_login_attempts: parseInt(maxLoginAttempts, 10) || 5,
          lockout_duration_minutes: parseInt(lockoutMinutes, 10) || 15,
          enforce_2fa: enforce2FA,
          reauth_for_sensitive_actions: reauthSensitive,
        },
        session_policies: {
          session_timeout_minutes: parseInt(sessionTimeout, 10) || 30,
          max_session_lifetime_hours: parseInt(maxLifetimeHours, 10) || 12,
          concurrent_sessions_allowed: false,
          ip_whitelist: ipWhitelist,
        },
        access_policies: {
          least_privilege_enforced: true,
          admin_access_level: 'Full System Administration',
          msw_access_level: 'Patient Intake, Evaluation, and Classification',
          researcher_access_level: 'Synthetic De-identified Records Only',
          nurse_access_level: 'Triage Desk and Queue Management',
          restricted_phi_roles: ['researcher', 'auditor'],
        },
      };

      const res = await fetchApi('/admin/settings/security', {
        method: 'PUT',
        headers: { 'x-user-role': 'admin', 'x-user-id': 'admin_sys' },
        body: JSON.stringify(payload),
      });

      if (res?.success) {
        toast.success('Security policies updated successfully and enforced!');
        markClean('security');
      }
    } catch (err: any) {
      toast.error(`Failed to save security policies: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrivacy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        dpo_email: dpoContact,
        data_retention_years: parseInt(dataRetentionYears, 10) || 7,
        audit_logging_enabled: auditLogging,
        retention_policies: {
          clinical_records_years: parseInt(dataRetentionYears, 10) || 7,
          supporting_documents_years: parseInt(docRetentionYears, 10) || 5,
          audit_logs_years: parseInt(auditLogRetentionYears, 10) || 10,
          research_datasets_years: 5,
          archival_procedure_notes: 'Encrypted cold storage with immutable retention locks.',
        },
        masking_rules: {
          mask_names_for_non_clinical: maskNames,
          mask_contact_numbers: maskContacts,
          mask_addresses: maskAddresses,
          require_justification_for_unmask: true,
        },
        authorized_roles_phi: ['admin', 'msw', 'nurse'],
        deidentify_research_exports: deidentifyResearch,
      };

      const res = await fetchApi('/admin/settings/privacy', {
        method: 'PUT',
        headers: { 'x-user-role': 'admin', 'x-user-id': 'admin_sys' },
        body: JSON.stringify(payload),
      });

      if (res?.success) {
        toast.success('Privacy & Data Access governance policies saved!');
        markClean('privacy');
      }
    } catch (err: any) {
      toast.error(`Failed to save privacy settings: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        max_daily_intake: parseInt(maxDailyIntake, 10) || 60,
        slot_duration_minutes: parseInt(slotDurationMinutes, 10) || 20,
        allow_walk_ins: allowWalkIns,
        operating_start_time: operatingStartTime,
        operating_end_time: operatingEndTime,
        cancellation_cutoff_hours: parseInt(cancellationCutoffHours, 10) || 24,
        appointment_reminder_lead_hours: parseInt(reminderLeadHours, 10) || 24,
      };

      const res = await fetchApi('/admin/settings/queue', {
        method: 'PUT',
        headers: { 'x-user-role': 'admin', 'x-user-id': 'admin_sys' },
        body: JSON.stringify(payload),
      });

      if (res?.success) {
        toast.success('Appointment & Queue parameters saved to database!');
        markClean('queue');
      }
    } catch (err: any) {
      toast.error(`Failed to save queue parameters: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        email_alerts_active: emailAlertsActive,
        sms_gateway_active: smsGatewayActive,
        admin_daily_digest: adminDailyDigest,
        notify_on_appointment_confirmed: notifyApptConfirm,
        notify_on_queue_update: notifyQueueUpdate,
        notify_on_security_alert: notifySecurityAlert,
        notify_on_password_change: notifyPasswordChange,
        brevo_configured: true,
        sms_provider_status: 'Not Configured (Requires Cellular Gateway)',
      };

      const res = await fetchApi('/admin/settings/notifications', {
        method: 'PUT',
        headers: { 'x-user-role': 'admin', 'x-user-id': 'admin_sys' },
        body: JSON.stringify(payload),
      });

      if (res?.success) {
        toast.success('Notification channels & automated alerts saved!');
        markClean('notifications');
      }
    } catch (err: any) {
      toast.error(`Failed to save notification settings: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailRecipient) {
      toast.error('Please enter a recipient email for testing.');
      return;
    }
    setIsSendingTest(true);
    try {
      const res = await fetchApi('/admin/settings/notifications/test-email', {
        method: 'POST',
        headers: { 'x-user-role': 'admin', 'x-user-id': 'admin_sys' },
        body: JSON.stringify({ recipient_email: testEmailRecipient }),
      });
      if (res?.success) {
        toast.success(`Verification email sent to ${testEmailRecipient} via Brevo SMTP!`);
      }
    } catch (err: any) {
      toast.error(`Test email dispatch failed: ${err.message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSavePersonalAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        full_name: staffFullName,
        email: staffEmail,
        department: staffDepartment,
        theme_preference: themePreference,
        notify_email: true,
      };

      const res = await fetchApi('/admin/settings/account/profile', {
        method: 'PUT',
        headers: { 'x-user-id': 'admin_sys' },
        body: JSON.stringify(payload),
      });

      if (res?.success) {
        toast.success('Personal display preferences & profile saved!');
        markClean('account');
      }
    } catch (err: any) {
      toast.error(`Failed to update profile: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please provide current password and new password confirmation.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetchApi('/admin/settings/account/change-password', {
        method: 'POST',
        headers: { 'x-user-id': 'admin_sys' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      if (res?.success) {
        toast.success('Password changed successfully and Argon2id hash updated!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      toast.error(`Password change rejected: ${err.message}`);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <DashboardLayout
      title="Clinic Administration Settings"
      subtitle="Institutional Governance · Operational Policies, Security, and System Infrastructure"
    >
      <div className="w-full pb-12">
        {/* Navigation Tabs Bar matching user screenshot */}
        <div className="bg-white border border-[#D5E2D9] rounded-2xl p-2 mb-6 shadow-xs overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-2 min-w-max">
            {/* Tab 1: Organization Profile */}
            <button
              type="button"
              onClick={() => handleTabChange('org_profile')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border-0 ${
                activeTab === 'org_profile'
                  ? 'text-[#0B6B3A] border-b-2 border-[#0B6B3A] bg-[#E8F5EC]/60 font-bold'
                  : 'text-[#64748B] hover:text-[#10241A] hover:bg-[#F8FAFC]'
              }`}
            >
              <i className="fa-regular fa-hospital text-xs" />
              <span>01. Organization Profile</span>
              {dirtyTabs['org_profile'] && <span className="w-2 h-2 rounded-full bg-amber-500 ml-1" title="Unsaved changes" />}
            </button>

            {/* Tab 2: Security Policies */}
            <button
              type="button"
              onClick={() => handleTabChange('security')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border-0 ${
                activeTab === 'security'
                  ? 'text-[#0B6B3A] border-b-2 border-[#0B6B3A] bg-[#E8F5EC]/60 font-bold'
                  : 'text-[#64748B] hover:text-[#10241A] hover:bg-[#F8FAFC]'
              }`}
            >
              <i className="fa-solid fa-lock text-xs" />
              <span>02. Security Policies</span>
              {dirtyTabs['security'] && <span className="w-2 h-2 rounded-full bg-amber-500 ml-1" title="Unsaved changes" />}
            </button>

            {/* Tab 3: Privacy & Data Access */}
            <button
              type="button"
              onClick={() => handleTabChange('privacy')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border-0 ${
                activeTab === 'privacy'
                  ? 'text-[#0B6B3A] border-b-2 border-[#0B6B3A] bg-[#E8F5EC]/60 font-bold'
                  : 'text-[#64748B] hover:text-[#10241A] hover:bg-[#F8FAFC]'
              }`}
            >
              <i className="fa-solid fa-shield-halved text-xs" />
              <span>03. Privacy &amp; Data Access</span>
              {dirtyTabs['privacy'] && <span className="w-2 h-2 rounded-full bg-amber-500 ml-1" title="Unsaved changes" />}
            </button>

            {/* Tab 4: Appointments & Queue */}
            <button
              type="button"
              onClick={() => handleTabChange('queue')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border-0 ${
                activeTab === 'queue'
                  ? 'text-[#0B6B3A] border-b-2 border-[#0B6B3A] bg-[#E8F5EC]/60 font-bold'
                  : 'text-[#64748B] hover:text-[#10241A] hover:bg-[#F8FAFC]'
              }`}
            >
              <i className="fa-regular fa-calendar-check text-xs" />
              <span>04. Appointments &amp; Queue</span>
              {dirtyTabs['queue'] && <span className="w-2 h-2 rounded-full bg-amber-500 ml-1" title="Unsaved changes" />}
            </button>

            {/* Tab 5: Notifications */}
            <button
              type="button"
              onClick={() => handleTabChange('notifications')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border-0 ${
                activeTab === 'notifications'
                  ? 'text-[#0B6B3A] border-b-2 border-[#0B6B3A] bg-[#E8F5EC]/60 font-bold'
                  : 'text-[#64748B] hover:text-[#10241A] hover:bg-[#F8FAFC]'
              }`}
            >
              <i className="fa-solid fa-bell text-xs" />
              <span>05. Notifications</span>
              {dirtyTabs['notifications'] && <span className="w-2 h-2 rounded-full bg-amber-500 ml-1" title="Unsaved changes" />}
            </button>

            {/* Tab 6: Audit Logs */}
            <button
              type="button"
              onClick={() => handleTabChange('audit')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border-0 ${
                activeTab === 'audit'
                  ? 'text-[#0B6B3A] border-b-2 border-[#0B6B3A] bg-[#E8F5EC]/60 font-bold'
                  : 'text-[#64748B] hover:text-[#10241A] hover:bg-[#F8FAFC]'
              }`}
            >
              <i className="fa-solid fa-clock-rotate-left text-xs" />
              <span>06. Audit Logs</span>
            </button>

            {/* Tab 7: Personal Account & Display */}
            <button
              type="button"
              onClick={() => handleTabChange('account')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border-0 ${
                activeTab === 'account'
                  ? 'text-[#0B6B3A] border-b-2 border-[#0B6B3A] bg-[#E8F5EC]/60 font-bold'
                  : 'text-[#64748B] hover:text-[#10241A] hover:bg-[#F8FAFC]'
              }`}
            >
              <i className="fa-solid fa-user-gear text-xs" />
              <span>07. Personal Account &amp; Display</span>
              {dirtyTabs['account'] && <span className="w-2 h-2 rounded-full bg-amber-500 ml-1" title="Unsaved changes" />}
            </button>
          </div>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="bg-white rounded-2xl border border-[#D5E2D9] p-8 text-center text-[#5A7466] text-xs">
            <i className="fa-solid fa-circle-notch fa-spin text-base text-[#0B6B3A] mb-2 block" />
            Loading clinical administration settings from persistent backend...
          </div>
        )}

        {!isLoading && (
          <>
            {/* ========================================================
                TAB 1: 01. Organization Profile (Matching User Screenshot)
               ======================================================== */}
            {activeTab === 'org_profile' && (
              <div className="bg-white rounded-2xl border border-[#D5E2D9] p-6 sm:p-8 shadow-xs">
                {/* Header */}
                <div className="mb-6">
                  <h2 className="font-['Outfit'] text-lg font-bold text-[#10241A] flex items-center gap-2 m-0 mb-1.5">
                    <i className="fa-solid fa-hospital text-[#0B6B3A] text-base" />
                    <span>Organization &amp; Clinic Profile</span>
                  </h2>
                  <p className="text-xs text-[#5A7466] m-0 leading-relaxed">
                    Manage foundational clinic details, official legal name, address, contact channels, and operating hours.
                  </p>
                </div>

                <form onSubmit={handleSaveOrgProfile} className="space-y-6">
                  {/* Row 1: Legal Name & Operating Desk */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-medium text-[#334155] mb-2">
                        Foundation / Clinic Legal Name
                      </label>
                      <input
                        type="text"
                        required
                        value={legalName}
                        onChange={(e) => {
                          setLegalName(e.target.value);
                          markDirty('org_profile');
                        }}
                        className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#334155] mb-2">
                        Operating Clinic Desk
                      </label>
                      <input
                        type="text"
                        required
                        value={operatingDesk}
                        onChange={(e) => {
                          setOperatingDesk(e.target.value);
                          markDirty('org_profile');
                        }}
                        className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                      />
                    </div>
                  </div>

                  {/* Row 2: Clinic Center Address & Official Hotline Contact */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-medium text-[#334155] mb-2">
                        Clinic Center Address
                      </label>
                      <input
                        type="text"
                        required
                        value={clinicAddress}
                        onChange={(e) => {
                          setClinicAddress(e.target.value);
                          markDirty('org_profile');
                        }}
                        className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#334155] mb-2">
                        Official Hotline Contact
                      </label>
                      <input
                        type="text"
                        required
                        value={hotlineContact}
                        onChange={(e) => {
                          setHotlineContact(e.target.value);
                          markDirty('org_profile');
                        }}
                        className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                      />
                    </div>
                  </div>

                  {/* Row 3: Official Inquiries Email & Weekly Operating Hours */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-medium text-[#334155] mb-2">
                        Official Inquiries Email
                      </label>
                      <input
                        type="email"
                        required
                        value={inquiriesEmail}
                        onChange={(e) => {
                          setInquiriesEmail(e.target.value);
                          markDirty('org_profile');
                        }}
                        className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#334155] mb-2">
                        Weekly Operating Hours
                      </label>
                      <input
                        type="text"
                        required
                        value={operatingHours}
                        onChange={(e) => {
                          setOperatingHours(e.target.value);
                          markDirty('org_profile');
                        }}
                        className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                      />
                    </div>
                  </div>

                  {/* Action Button matching user screenshot (Bottom Right Green Button) */}
                  <div className="flex items-center justify-between pt-4 border-t border-[#EEF2EF]">
                    <div className="text-[11px] text-[#64748B]">
                      {dirtyTabs['org_profile'] ? 'Unsaved edits detected' : 'All parameters synchronized with database'}
                    </div>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-3 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white text-xs font-bold border-none cursor-pointer flex items-center gap-2 transition shadow-md disabled:opacity-50"
                    >
                      <i className={`fa-solid ${isSaving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'} text-xs`} />
                      <span>{isSaving ? 'Saving Changes...' : 'Save Organization Profile'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ========================================================
                TAB 2: 02. Security Policies
               ======================================================== */}
            {activeTab === 'security' && (
              <div className="bg-white rounded-2xl border border-[#D5E2D9] p-6 sm:p-8 shadow-xs space-y-8">
                <div>
                  <h2 className="font-['Outfit'] text-lg font-bold text-[#10241A] flex items-center gap-2 m-0 mb-1.5">
                    <i className="fa-solid fa-lock text-[#0B6B3A] text-base" />
                    <span>Authentication &amp; Access Security Policies</span>
                  </h2>
                  <p className="text-xs text-[#5A7466] m-0">
                    Configure workstation session time-outs, two-factor authentication, failed login lockouts, and IP subnet boundaries.
                  </p>
                </div>

                <form onSubmit={handleSaveSecurity} className="space-y-6">
                  {/* Category A: Authentication & Lockout */}
                  <div>
                    <h3 className="text-xs font-bold text-[#10241A] uppercase tracking-wider mb-4 border-b border-[#EEF2EF] pb-2 flex items-center gap-2">
                      <i className="fa-solid fa-key text-[#0B6B3A]" />
                      <span>A. Authentication &amp; Lockout Thresholds</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-xs font-medium text-[#334155] mb-2">
                          Min Password Length
                        </label>
                        <input
                          type="number"
                          min="8"
                          max="32"
                          value={minPasswordLength}
                          onChange={(e) => {
                            setMinPasswordLength(e.target.value);
                            markDirty('security');
                          }}
                          className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#334155] mb-2">
                          Max Failed Login Attempts
                        </label>
                        <input
                          type="number"
                          min="3"
                          max="10"
                          value={maxLoginAttempts}
                          onChange={(e) => {
                            setMaxLoginAttempts(e.target.value);
                            markDirty('security');
                          }}
                          className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#334155] mb-2">
                          Lockout Duration (Minutes)
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="120"
                          value={lockoutMinutes}
                          onChange={(e) => {
                            setLockoutMinutes(e.target.value);
                            markDirty('security');
                          }}
                          className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category B: Session Security */}
                  <div>
                    <h3 className="text-xs font-bold text-[#10241A] uppercase tracking-wider mb-4 border-b border-[#EEF2EF] pb-2 flex items-center gap-2">
                      <i className="fa-solid fa-clock text-[#0B6B3A]" />
                      <span>B. Session Inactivity &amp; Workstation Boundaries</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-[#334155] mb-2">
                          Inactivity Session Timeout (Minutes)
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="480"
                          value={sessionTimeout}
                          onChange={(e) => {
                            setSessionTimeout(e.target.value);
                            markDirty('security');
                          }}
                          className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#334155] mb-2">
                          Max Total Session Lifetime (Hours)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="72"
                          value={maxLifetimeHours}
                          onChange={(e) => {
                            setMaxLifetimeHours(e.target.value);
                            markDirty('security');
                          }}
                          className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#334155] mb-2">
                        Hospital Workstation Subnet Whitelist (CIDR notation)
                      </label>
                      <input
                        type="text"
                        value={ipWhitelist}
                        onChange={(e) => {
                          setIpWhitelist(e.target.value);
                          markDirty('security');
                        }}
                        className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm font-mono bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="space-y-3">
                    <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                      <label className="flex items-center gap-3 cursor-pointer text-xs font-semibold text-[#1E293B]">
                        <input
                          type="checkbox"
                          checked={enforce2FA}
                          onChange={(e) => {
                            if (!e.target.checked) {
                              requestToggleOff(
                                'Mandatory Two-Factor OTP Verification',
                                'Turning off two-factor authentication leaves administrative and clinical accounts protected by single-factor passwords only.',
                                'Accounts will no longer require a 6-digit one-time PIN upon login, increasing vulnerability to credential compromise.',
                                () => {
                                  setEnforce2FA(false);
                                  markDirty('security');
                                }
                              );
                            } else {
                              setEnforce2FA(true);
                              markDirty('security');
                            }
                          }}
                          className="accent-[#0B6B3A] w-4 h-4 rounded"
                        />
                        <span>Mandatory Two-Factor OTP Verification for all Administrative &amp; MSW Accounts</span>
                      </label>
                    </div>

                    <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                      <label className="flex items-center gap-3 cursor-pointer text-xs font-semibold text-[#1E293B]">
                        <input
                          type="checkbox"
                          checked={reauthSensitive}
                          onChange={(e) => {
                            if (!e.target.checked) {
                              requestToggleOff(
                                'Require Password Re-authentication',
                                'Turning off re-authentication permits immediate bulk patient dataset downloads without verifying the active user identity.',
                                'Any unmonitored or unattended terminal session could export confidential patient master records without providing a password.',
                                () => {
                                  setReauthSensitive(false);
                                  markDirty('security');
                                }
                              );
                            } else {
                              setReauthSensitive(true);
                              markDirty('security');
                            }
                          }}
                          className="accent-[#0B6B3A] w-4 h-4 rounded"
                        />
                        <span>Require Password Re-authentication prior to Exporting Patient Datasets</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-[#EEF2EF]">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-3 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white text-xs font-bold border-none cursor-pointer flex items-center gap-2 transition shadow-md disabled:opacity-50"
                    >
                      <i className="fa-solid fa-shield-halved text-xs" />
                      <span>{isSaving ? 'Enforcing Policies...' : 'Save Security Policies'}</span>
                    </button>
                  </div>
                </form>

                {/* Category D: Verified Encryption and Infrastructure Status */}
                <div className="mt-8 pt-6 border-t border-[#D5E2D9]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-['Outfit'] text-sm font-bold text-[#10241A] m-0 flex items-center gap-2">
                        <i className="fa-solid fa-server text-[#0B6B3A]" />
                        <span>Verifiable Technical Security &amp; Encryption Status</span>
                      </h3>
                      <p className="text-[11px] text-[#5A7466] m-0">
                        Real-time status verified directly against backend services and infrastructure.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                      Backend Confirmed
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {infraStatus &&
                      Object.entries(infraStatus).map(([k, item]: [string, any]) => (
                        <div key={k} className="p-4 bg-[#FAFBF8] border border-[#E2E8F0] rounded-xl">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-[#1E293B]">{item.name}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                item.verified
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#64748B] m-0">{item.details}</p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                TAB 3: 03. Privacy & Data Access
               ======================================================== */}
            {activeTab === 'privacy' && (
              <div className="bg-white rounded-2xl border border-[#D5E2D9] p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h2 className="font-['Outfit'] text-lg font-bold text-[#10241A] flex items-center gap-2 m-0 mb-1.5">
                    <i className="fa-solid fa-shield-halved text-[#0B6B3A] text-base" />
                    <span>Patient Privacy &amp; Data Protection Governance</span>
                  </h2>
                  <p className="text-xs text-[#5A7466] m-0">
                    Philippine Data Privacy Act (RA 10173) compliance, clinical retention schedules, and automated PII masking.
                  </p>
                </div>

                <form onSubmit={handleSavePrivacy} className="space-y-6">
                  {/* Category A: Retention Periods */}
                  <div>
                    <h3 className="text-xs font-bold text-[#10241A] uppercase tracking-wider mb-4 border-b border-[#EEF2EF] pb-2 flex items-center gap-2">
                      <i className="fa-solid fa-box-archive text-[#0B6B3A]" />
                      <span>Data Retention Schedules</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-xs font-medium text-[#334155] mb-2">
                          Clinical Master Records (Years)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={dataRetentionYears}
                          onChange={(e) => {
                            setDataRetentionYears(e.target.value);
                            markDirty('privacy');
                          }}
                          className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#334155] mb-2">
                          Supporting Documents (Years)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={docRetentionYears}
                          onChange={(e) => {
                            setDocRetentionYears(e.target.value);
                            markDirty('privacy');
                          }}
                          className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#334155] mb-2">
                          Audit Trail Retention (Years)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={auditLogRetentionYears}
                          onChange={(e) => {
                            setAuditLogRetentionYears(e.target.value);
                            markDirty('privacy');
                          }}
                          className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* DPO Email */}
                  <div>
                    <label className="block text-xs font-medium text-[#334155] mb-2">
                      Data Protection Officer (DPO) Contact Email
                    </label>
                    <input
                      type="email"
                      required
                      value={dpoContact}
                      onChange={(e) => {
                        setDpoContact(e.target.value);
                        markDirty('privacy');
                      }}
                      className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                    />
                  </div>

                  {/* PII Masking Policies */}
                  <div>
                    <h3 className="text-xs font-bold text-[#10241A] uppercase tracking-wider mb-4 border-b border-[#EEF2EF] pb-2 flex items-center gap-2">
                      <i className="fa-solid fa-user-secret text-[#0B6B3A]" />
                      <span>Automated Identity Masking &amp; Least Privilege</span>
                    </h3>
                    <div className="space-y-3">
                      <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                        <label className="flex items-center gap-3 cursor-pointer text-xs font-semibold text-[#1E293B]">
                          <input
                            type="checkbox"
                            checked={maskNames}
                            onChange={(e) => {
                              if (!e.target.checked) {
                                requestToggleOff(
                                  'Enforce Patient Name Masking',
                                  'Turning off patient name masking will display full, unmasked legal names to all staff accounts.',
                                  'Non-clinical administrative personnel and research assistants will see identifiable full names, increasing exposure of confidential patient identity.',
                                  () => {
                                    setMaskNames(false);
                                    markDirty('privacy');
                                  }
                                );
                              } else {
                                setMaskNames(true);
                                markDirty('privacy');
                              }
                            }}
                            className="accent-[#0B6B3A] w-4 h-4 rounded"
                          />
                          <span>Enforce Name Masking (J*** D***) for non-clinical staff and researchers</span>
                        </label>
                      </div>

                      <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                        <label className="flex items-center gap-3 cursor-pointer text-xs font-semibold text-[#1E293B]">
                          <input
                            type="checkbox"
                            checked={maskContacts}
                            onChange={(e) => {
                              if (!e.target.checked) {
                                requestToggleOff(
                                  'Mask Patient Mobile Contact Numbers',
                                  'Disabling mobile number masking exposes real contact numbers across patient records and authentication flows (such as 2FA).',
                                  'Phone numbers will be rendered in full plaintext (e.g., 0917 888 1678) rather than obscured digits (0917 *** *678).',
                                  () => {
                                    setMaskContacts(false);
                                    markDirty('privacy');
                                  }
                                );
                              } else {
                                setMaskContacts(true);
                                markDirty('privacy');
                              }
                            }}
                            className="accent-[#0B6B3A] w-4 h-4 rounded"
                          />
                          <span>Mask patient mobile contact numbers (0912***789)</span>
                        </label>
                      </div>

                      <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                        <label className="flex items-center gap-3 cursor-pointer text-xs font-semibold text-[#1E293B]">
                          <input
                            type="checkbox"
                            checked={deidentifyResearch}
                            onChange={(e) => {
                              if (!e.target.checked) {
                                requestToggleOff(
                                  'Automatic De-identification on Research CSV Exports',
                                  'Disabling de-identification will allow raw CSV dataset downloads containing direct patient identifiers.',
                                  'Clinical research exports might include full names, phone numbers, and identifying demographic attributes without k-anonymity safeguards.',
                                  () => {
                                    setDeidentifyResearch(false);
                                    markDirty('privacy');
                                  }
                                );
                              } else {
                                setDeidentifyResearch(true);
                                markDirty('privacy');
                              }
                            }}
                            className="accent-[#0B6B3A] w-4 h-4 rounded"
                          />
                          <span>Automatic De-identification &amp; Differential Privacy on Research CSV Exports</span>
                        </label>
                      </div>

                      <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                        <label className="flex items-center gap-3 cursor-pointer text-xs font-semibold text-[#1E293B]">
                          <input
                            type="checkbox"
                            checked={auditLogging}
                            onChange={(e) => {
                              if (!e.target.checked) {
                                requestToggleOff(
                                  'Enable Immutable Cryptographic Audit Trails',
                                  'Disabling cryptographic audit trails halts logging of patient master record modifications and administrative overrides.',
                                  'System updates, privilege changes, and patient data views will no longer produce cryptographic audit log entries, preventing forensic traceability.',
                                  () => {
                                    setAuditLogging(false);
                                    markDirty('privacy');
                                  }
                                );
                              } else {
                                setAuditLogging(true);
                                markDirty('privacy');
                              }
                            }}
                            className="accent-[#0B6B3A] w-4 h-4 rounded"
                          />
                          <span>Enable Immutable Cryptographic Audit Trails for all Patient Master Record modifications</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-[#EEF2EF]">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-3 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white text-xs font-bold border-none cursor-pointer flex items-center gap-2 transition shadow-md disabled:opacity-50"
                    >
                      <i className="fa-solid fa-floppy-disk text-xs" />
                      <span>{isSaving ? 'Saving...' : 'Save Privacy Policies'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ========================================================
                TAB 4: 04. Appointments & Queue
               ======================================================== */}
            {activeTab === 'queue' && (
              <div className="bg-white rounded-2xl border border-[#D5E2D9] p-6 sm:p-8 shadow-xs">
                <div className="mb-6">
                  <h2 className="font-['Outfit'] text-lg font-bold text-[#10241A] flex items-center gap-2 m-0 mb-1.5">
                    <i className="fa-regular fa-calendar-check text-[#0B6B3A] text-base" />
                    <span>Clinic Desk Queue &amp; Patient Intake Capacity</span>
                  </h2>
                  <p className="text-xs text-[#5A7466] m-0">
                    Set maximum intake slots per day, clinical assessment duration, operating windows, and walk-in allowances.
                  </p>
                </div>

                <form onSubmit={handleSaveQueue} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-medium text-[#334155] mb-2">
                        Max Daily Patient Intake Capacity
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="500"
                        value={maxDailyIntake}
                        onChange={(e) => {
                          setMaxDailyIntake(e.target.value);
                          markDirty('queue');
                        }}
                        className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#334155] mb-2">
                        Assessment Slot Duration (Minutes)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="120"
                        value={slotDurationMinutes}
                        onChange={(e) => {
                          setSlotDurationMinutes(e.target.value);
                          markDirty('queue');
                        }}
                        className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-medium text-[#334155] mb-2">
                        Queue Operating Window
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={operatingStartTime}
                          onChange={(e) => {
                            setOperatingStartTime(e.target.value);
                            markDirty('queue');
                          }}
                          className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                        />
                        <span className="text-xs text-[#64748B]">to</span>
                        <input
                          type="time"
                          value={operatingEndTime}
                          onChange={(e) => {
                            setOperatingEndTime(e.target.value);
                            markDirty('queue');
                          }}
                          className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#334155] mb-2">
                        Cancellation Cutoff Window (Hours prior)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="72"
                        value={cancellationCutoffHours}
                        onChange={(e) => {
                          setCancellationCutoffHours(e.target.value);
                          markDirty('queue');
                        }}
                        className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                    <label className="flex items-center gap-3 cursor-pointer text-xs font-semibold text-[#1E293B]">
                      <input
                        type="checkbox"
                        checked={allowWalkIns}
                        onChange={(e) => {
                          if (!e.target.checked) {
                            requestToggleOff(
                              'Permit Unscheduled Walk-In Patients',
                              'Disabling walk-ins restricts queue triage exclusively to patients with pre-scheduled appointments.',
                              'Emergency or walk-in ophthalmic cases will not be admitted through automatic queue triage without administrative override.',
                              () => {
                                setAllowWalkIns(false);
                                markDirty('queue');
                              },
                              'Yes, Disable Walk-Ins'
                            );
                          } else {
                            setAllowWalkIns(true);
                            markDirty('queue');
                          }
                        }}
                        className="accent-[#0B6B3A] w-4 h-4 rounded"
                      />
                      <span>Permit Unscheduled Walk-In Patients for Priority Ophthalmic Triage</span>
                    </label>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-[#EEF2EF]">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-3 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white text-xs font-bold border-none cursor-pointer flex items-center gap-2 transition shadow-md disabled:opacity-50"
                    >
                      <i className="fa-solid fa-floppy-disk text-xs" />
                      <span>{isSaving ? 'Saving...' : 'Save Queue Parameters'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ========================================================
                TAB 5: 05. Notifications
               ======================================================== */}
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-2xl border border-[#D5E2D9] p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h2 className="font-['Outfit'] text-lg font-bold text-[#10241A] flex items-center gap-2 m-0 mb-1.5">
                    <i className="fa-solid fa-bell text-[#0B6B3A] text-base" />
                    <span>Automated Notification Gateways (Brevo SMTP &amp; SMS)</span>
                  </h2>
                  <p className="text-xs text-[#5A7466] m-0">
                    Configure patient OTP delivery, email dispatch alerts, live provider testing, and daily caseworker summaries.
                  </p>
                </div>

                <form onSubmit={handleSaveNotifications} className="space-y-4">
                  <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-[#1E293B] flex items-center gap-2">
                        <span>Brevo SMTP Email Relay</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                          Configured &amp; Active
                        </span>
                      </div>
                      <div className="text-[11px] text-[#64748B]">
                        Active via smtp-relay.brevo.com:587 with TLS encryption for password resets, OTP, and intake welcome emails.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={emailAlertsActive}
                      onChange={(e) => {
                        if (!e.target.checked) {
                          requestToggleOff(
                            'Brevo SMTP Email Relay Gateway',
                            'Disabling the SMTP email gateway stops automated email delivery across the entire clinic system.',
                            'Password reset links, security alerts, and patient intake welcome notifications will fail to dispatch via email.',
                            () => {
                              setEmailAlertsActive(false);
                              markDirty('notifications');
                            },
                            'Yes, Disable Email Relay'
                          );
                        } else {
                          setEmailAlertsActive(true);
                          markDirty('notifications');
                        }
                      }}
                      className="accent-[#0B6B3A] w-5 h-5 rounded"
                    />
                  </div>

                  <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-[#1E293B] flex items-center gap-2">
                        <span>Patient SMS Mobile Gateway</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                          Unconfigured (Requires API Key)
                        </span>
                      </div>
                      <div className="text-[11px] text-[#64748B]">
                        Send appointment confirmation &amp; 6-digit OTP codes via Semaphore or GSM gateway.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={smsGatewayActive}
                      onChange={(e) => {
                        setSmsGatewayActive(e.target.checked);
                        markDirty('notifications');
                      }}
                      className="accent-[#0B6B3A] w-5 h-5 rounded"
                    />
                  </div>

                  <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-[#1E293B]">Daily Clinical Administration Digest</div>
                      <div className="text-[11px] text-[#64748B]">
                        Automated end-of-day summary of admissions and approved subsidies emailed to administrators.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={adminDailyDigest}
                      onChange={(e) => {
                        if (!e.target.checked) {
                          requestToggleOff(
                            'Daily Clinical Administration Digest',
                            'Disabling the daily summary will stop automated end-of-day clinic admissions and subsidy digests from being sent.',
                            'Administrators will not receive the automated 5:00 PM operational overview email.',
                            () => {
                              setAdminDailyDigest(false);
                              markDirty('notifications');
                            },
                            'Yes, Disable Daily Digest'
                          );
                        } else {
                          setAdminDailyDigest(true);
                          markDirty('notifications');
                        }
                      }}
                      className="accent-[#0B6B3A] w-5 h-5 rounded"
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-[#EEF2EF]">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-3 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white text-xs font-bold border-none cursor-pointer flex items-center gap-2 transition shadow-md disabled:opacity-50"
                    >
                      <i className="fa-solid fa-floppy-disk text-xs" />
                      <span>{isSaving ? 'Saving...' : 'Save Notification Settings'}</span>
                    </button>
                  </div>
                </form>

                {/* Live Test Dispatch */}
                <div className="mt-8 pt-6 border-t border-[#D5E2D9]">
                  <h3 className="font-['Outfit'] text-sm font-bold text-[#10241A] m-0 mb-1 flex items-center gap-2">
                    <i className="fa-solid fa-paper-plane text-[#0B6B3A]" />
                    <span>Live Brevo SMTP Gateway Test Dispatch</span>
                  </h3>
                  <p className="text-[11px] text-[#5A7466] mb-4">
                    Send a verified test email to validate your outbound mail relay connection.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      value={testEmailRecipient}
                      onChange={(e) => setTestEmailRecipient(e.target.value)}
                      placeholder="Recipient email address"
                      className="flex-1 h-11 px-4 border border-[#CBD5E1] rounded-xl text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                    />
                    <button
                      type="button"
                      onClick={handleSendTestEmail}
                      disabled={isSendingTest}
                      className="px-5 py-2.5 rounded-xl bg-[#FAFBF8] border border-[#CBD5E1] hover:border-[#0B6B3A] text-[#10241A] hover:text-[#0B6B3A] text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <i className={`fa-solid ${isSendingTest ? 'fa-spinner fa-spin' : 'fa-envelope-circle-check'} text-xs`} />
                      <span>{isSendingTest ? 'Sending Test...' : 'Dispatch Test Email'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                TAB 6: 06. Audit Logs
               ======================================================== */}
            {activeTab === 'audit' && (
              <div className="bg-white rounded-2xl border border-[#D5E2D9] p-6 sm:p-8 shadow-xs">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-['Outfit'] text-lg font-bold text-[#10241A] flex items-center gap-2 m-0 mb-1.5">
                      <i className="fa-solid fa-clock-rotate-left text-[#0B6B3A] text-base" />
                      <span>Administrative Security &amp; Activity Logs</span>
                    </h2>
                    <p className="text-xs text-[#5A7466] m-0">
                      Comprehensive audit trail of staff authentications, policy adjustments, and patient record modifications.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#E6F1EA] text-[#0B6B3A] font-bold text-xs">
                      PostgreSQL Synchronized
                    </span>
                    <button
                      type="button"
                      onClick={fetchAuditLogs}
                      className="px-3 py-1 bg-[#FAFBF8] border border-[#D5E2D9] rounded-lg text-xs font-medium text-[#334155] hover:bg-[#F1F5F9] cursor-pointer flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-arrows-rotate" />
                      <span>Refresh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setClearAuditModalOpen(true)}
                      className="px-3 py-1 bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] hover:bg-[#FEE2E2] rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition"
                      title="Clear and reset audit log history"
                    >
                      <i className="fa-solid fa-trash-can text-xs" />
                      <span>Clear Logs</span>
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchAuditLogs()}
                    placeholder="Search by Actor or ID..."
                    className="h-10 px-3 border border-[#CBD5E1] rounded-xl text-xs bg-white text-[#10241A]"
                  />
                  <select
                    value={auditActionFilter}
                    onChange={(e) => setAuditActionFilter(e.target.value)}
                    className="h-10 px-3 border border-[#CBD5E1] rounded-xl text-xs bg-white text-[#10241A]"
                  >
                    <option value="ALL">All Actions</option>
                    <option value="UPDATE">Updates &amp; Modifications</option>
                    <option value="SECURITY">Security Policy Actions</option>
                    <option value="PASSWORD">Password Events</option>
                    <option value="AUTH">Authentications</option>
                  </select>
                  <select
                    value={auditStatusFilter}
                    onChange={(e) => setAuditStatusFilter(e.target.value)}
                    className="h-10 px-3 border border-[#CBD5E1] rounded-xl text-xs bg-white text-[#10241A]"
                  >
                    <option value="ALL">All Outcomes</option>
                    <option value="SUCCESS">SUCCESS</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#FAFBF8] text-[#5A7466] uppercase text-[10px] tracking-wider border-b border-[#EEF2EF]">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Timestamp (UTC)</th>
                        <th className="py-2.5 px-3 font-semibold">Actor / Role</th>
                        <th className="py-2.5 px-3 font-semibold">Action Event</th>
                        <th className="py-2.5 px-3 font-semibold">Resource</th>
                        <th className="py-2.5 px-3 font-semibold">IP Address</th>
                        <th className="py-2.5 px-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEF2EF]">
                      {isLoadingLogs ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#64748B]">
                            <i className="fa-solid fa-circle-notch fa-spin text-base text-[#0B6B3A] mr-2" />
                            Loading audit records...
                          </td>
                        </tr>
                      ) : auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#64748B]">
                            No audit records found matching query criteria.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-[#FAFBF8]">
                            <td className="py-3 px-3 font-mono text-[#64748B]">
                              {log.timestamp_utc ? new Date(log.timestamp_utc).toLocaleString() : 'N/A'}
                            </td>
                            <td className="py-3 px-3 font-semibold text-[#10241A]">
                              <div>{log.actor_id}</div>
                              <div className="text-[10px] font-normal text-[#64748B] uppercase">{log.role}</div>
                            </td>
                            <td className="py-3 px-3 text-[#334155] font-medium">{log.action}</td>
                            <td className="py-3 px-3 text-[#64748B] font-mono text-[11px]">{log.resource}</td>
                            <td className="py-3 px-3 font-mono text-[#64748B]">{log.ip_address || '127.0.0.1'}</td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  log.status === 'SUCCESS' || log.status === 'AUTHENTICATED'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-red-50 text-red-700'
                                }`}
                              >
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between pt-4 border-t border-[#EEF2EF] mt-4">
                  <div className="text-[11px] text-[#64748B]">Total Logged Events: {auditTotal}</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={auditPage <= 1}
                      onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 bg-white border border-[#CBD5E1] rounded-lg text-xs disabled:opacity-50 cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="px-2 py-1 text-xs text-[#334155]">Page {auditPage}</span>
                    <button
                      type="button"
                      disabled={auditLogs.length < 10}
                      onClick={() => setAuditPage((p) => p + 1)}
                      className="px-3 py-1 bg-white border border-[#CBD5E1] rounded-lg text-xs disabled:opacity-50 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                TAB 7: 07. Personal Account & Display
               ======================================================== */}
            {activeTab === 'account' && (
              <div className="bg-white rounded-2xl border border-[#D5E2D9] p-6 sm:p-8 shadow-xs space-y-8">
                <div>
                  <h2 className="font-['Outfit'] text-lg font-bold text-[#10241A] flex items-center gap-2 m-0 mb-1.5">
                    <i className="fa-solid fa-user-gear text-[#0B6B3A] text-base" />
                    <span>Personal Administrator Account &amp; Display Preferences</span>
                  </h2>
                  <p className="text-xs text-[#5A7466] m-0">
                    Manage your staff username, institutional credentials, password update, and workstation preferences.
                  </p>
                </div>

                {/* Profile Form */}
                <form onSubmit={handleSavePersonalAccount} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-medium text-[#334155] mb-2">Staff Username</label>
                      <input
                        type="text"
                        disabled
                        value={staffUsername}
                        className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-[#F8FAFC] text-[#64748B]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#334155] mb-2">Assigned Clinic Role</label>
                      <input
                        type="text"
                        disabled
                        value={staffRole}
                        className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-[#F8FAFC] text-[#0B6B3A] font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-medium text-[#334155] mb-2">Full Legal Name</label>
                      <input
                        type="text"
                        required
                        value={staffFullName}
                        onChange={(e) => {
                          setStaffFullName(e.target.value);
                          markDirty('account');
                        }}
                        className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#334155] mb-2">Official Email Address</label>
                      <input
                        type="email"
                        required
                        value={staffEmail}
                        onChange={(e) => {
                          setStaffEmail(e.target.value);
                          markDirty('account');
                        }}
                        className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-[#EEF2EF]">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-3 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white text-xs font-bold border-none cursor-pointer flex items-center gap-2 transition shadow-md disabled:opacity-50"
                    >
                      <i className="fa-solid fa-check text-xs" />
                      <span>{isSaving ? 'Saving...' : 'Save Profile Preferences'}</span>
                    </button>
                  </div>
                </form>

                {/* Password Change Form */}
                <div className="pt-6 border-t border-[#D5E2D9]">
                  <h3 className="font-['Outfit'] text-sm font-bold text-[#10241A] m-0 mb-1 flex items-center gap-2">
                    <i className="fa-solid fa-lock text-[#0B6B3A]" />
                    <span>Change Administrator Credentials</span>
                  </h3>
                  <p className="text-[11px] text-[#5A7466] mb-4">
                    Requires verification of your current password before updating your Argon2id hash.
                  </p>

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <div>
                        <label className="block text-xs font-medium text-[#334155] mb-2">Current Password *</label>
                        <div className="relative">
                          <input
                            type={showCurrentPass ? 'text' : 'password'}
                            required
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Current password"
                            className="w-full h-11 pl-4 pr-10 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
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

                      <div>
                        <label className="block text-xs font-medium text-[#334155] mb-2">New Password *</label>
                        <div className="relative">
                          <input
                            type={showNewPass ? 'text' : 'password'}
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            className="w-full h-11 pl-4 pr-10 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPass(!showNewPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F9E96] hover:text-[#10241A] bg-transparent border-0 cursor-pointer"
                          >
                            <i className={`fa-regular ${showNewPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                          </button>
                        </div>
                        <PasswordStrengthMeter password={newPassword} showChecks={true} />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#334155] mb-2">Confirm New Password *</label>
                        <div className="relative">
                          <input
                            type={showConfirmPass ? 'text' : 'password'}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat new password"
                            className="w-full h-11 pl-4 pr-10 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPass(!showConfirmPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F9E96] hover:text-[#10241A] bg-transparent border-0 cursor-pointer"
                          >
                            <i className={`fa-regular ${showConfirmPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                          </button>
                        </div>
                        {confirmPassword.length > 0 && (
                          <div className={`mt-1.5 text-[11px] font-semibold flex items-center gap-1.5 ${newPassword === confirmPassword ? 'text-[#0B6B3A]' : 'text-[#DC2626]'}`}>
                            <i className={`fa-solid ${newPassword === confirmPassword ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
                            <span>{newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleGenerateAdminPassword}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#334155] transition cursor-pointer"
                      >
                        <i className="fa-solid fa-key text-xs text-[#0B6B3A]" />
                        <span>Generate Secure Password</span>
                      </button>

                      <button
                        type="submit"
                        disabled={isChangingPassword}
                        className="px-5 py-2.5 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50 border-0 shadow-xs"
                      >
                        <i className={`fa-solid ${isChangingPassword ? 'fa-spinner fa-spin' : 'fa-shield-check'} text-xs`} />
                        <span>{isChangingPassword ? 'Verifying & Hashing...' : 'Update Password'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
        {/* Custom Confirmation Modal for Clearing Audit Logs */}
        {clearAuditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full border border-[#D5E2D9] shadow-2xl p-6 text-xs font-sans animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3.5 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] flex items-center justify-center text-base shrink-0">
                  <i className="fa-solid fa-triangle-exclamation" />
                </div>
                <div>
                  <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0 mb-1">
                    Clear Administrative Audit Logs?
                  </h3>
                  <p className="text-xs text-[#5A7466] m-0 leading-relaxed">
                    Are you sure you want to clear all administrative security audit logs? This action will reset the log history and record a new baseline clearance entry.
                  </p>
                </div>
              </div>

              <div className="bg-[#FAFBF8] border border-[#EEF2EF] rounded-xl p-3 mb-5 text-[11.5px] text-[#475569] flex items-center gap-2">
                <i className="fa-solid fa-circle-info text-[#0B6B3A] shrink-0" />
                <span>Only authorized clinic administrators can initiate an audit history reset.</span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#EEF2EF]">
                <button
                  type="button"
                  onClick={() => setClearAuditModalOpen(false)}
                  disabled={isClearingLogs}
                  className="px-4 py-2 rounded-xl border border-[#D5E2D9] hover:bg-slate-50 text-[#64748B] font-semibold text-xs cursor-pointer transition bg-transparent disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearAuditLogs}
                  disabled={isClearingLogs}
                  className="px-5 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs border-0 cursor-pointer shadow-sm flex items-center gap-2 transition disabled:opacity-50"
                >
                  <i className={`fa-solid ${isClearingLogs ? 'fa-spinner fa-spin' : 'fa-trash-can'} text-xs`} />
                  <span>{isClearingLogs ? 'Clearing Logs...' : 'Yes, Clear All Logs'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Confirmation Modal for Unsaved Tab Changes */}
        {unsavedTabModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-md w-full border border-[#D5E2D9] shadow-2xl p-6 text-xs font-sans animate-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3.5 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] text-[#D97706] flex items-center justify-center text-lg shrink-0">
                  <i className="fa-solid fa-triangle-exclamation" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0 mb-1">
                    Unsaved Tab Changes
                  </h3>
                  <p className="text-xs text-[#5A7466] m-0 leading-relaxed">
                    You have unsaved changes in this tab. Switching tabs now will discard your recent adjustments.
                  </p>
                </div>
              </div>

              <div className="bg-[#FAFBF8] border border-[#EEF2EF] rounded-xl p-3 mb-5 text-[11.5px] text-[#475569] flex items-center gap-2">
                <i className="fa-solid fa-circle-info text-[#0B6B3A] shrink-0" />
                <span>Save your settings before switching if you wish to keep them.</span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#EEF2EF]">
                <button
                  type="button"
                  onClick={cancelTabSwitch}
                  className="px-4 py-2 rounded-xl border border-[#D5E2D9] hover:bg-slate-50 text-[#64748B] font-semibold text-xs cursor-pointer transition bg-transparent"
                >
                  Stay in Current Tab
                </button>
                <button
                  type="button"
                  onClick={confirmTabSwitch}
                  className="px-5 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs border-0 cursor-pointer shadow-sm flex items-center gap-2 transition"
                >
                  <i className="fa-solid fa-arrow-right-from-bracket text-xs" />
                  <span>Discard &amp; Switch Tab</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Caution Modal for Disabling Controls / Security Policies */}
        <CautionModal
          isOpen={cautionModalOpen}
          settingName={pendingDisableAction?.settingName || 'Institutional Control'}
          description={pendingDisableAction?.description}
          warningDetails={pendingDisableAction?.warningDetails}
          confirmLabel={pendingDisableAction?.confirmLabel || 'Yes, Turn Off Protection'}
          onConfirm={() => {
            if (pendingDisableAction) {
              pendingDisableAction.onConfirm();
            }
            setCautionModalOpen(false);
            setPendingDisableAction(null);
          }}
          onCancel={() => {
            setCautionModalOpen(false);
            setPendingDisableAction(null);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
