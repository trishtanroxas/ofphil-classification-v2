'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/context/AuthContext';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useLoadingScreen } from '@/context/LoadingScreenContext';
import { useNavigationBlocker } from '@/context/NavigationBlockerContext';
import { getApiUrl } from '@/lib/api';

export interface MSWNotificationItem {
  id: string;
  recipient_user_id: string;
  recipient_role: string;
  notification_type: string;
  event_type?: string;
  title: string;
  message: string;
  related_patient_id?: string | null;
  related_encounter_id?: string | null;
  related_assessment_id?: string | null;
  target_destination: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed?: boolean;
  onCollapseToggle?: () => void;
}

export function Sidebar({
  isOpen,
  onToggle,
  isCollapsed: externalCollapsed,
  onCollapseToggle: externalOnCollapseToggle,
}: SidebarProps) {
  const pathname = usePathname();
  const { role, user, logout, isLoggingOut } = useAuth();
  const { showLoading, startProgress } = useLoadingScreen();
  const { confirmNavigation, handleLinkClick } = useNavigationBlocker();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [patientRecordsOpen, setPatientRecordsOpen] = useState(true);
  const [unreadInquiriesCount, setUnreadInquiriesCount] = useState(0);
  const [mswUnreadCount, setMswUnreadCount] = useState(0);
  const [upcomingApptsCount, setUpcomingApptsCount] = useState(0);

  React.useEffect(() => {
    if (role !== 'msw') return;
    const mswUserId = (user as any)?.username || user?.id || 'msw_lead';
    let cancelled = false;

    const fetchMswUnread = async () => {
      try {
        const res = await fetch(getApiUrl('/inquiries/notifications/list'), {
          headers: {
            'x-user-role': 'msw',
            'x-user-id': String(mswUserId),
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data.unread_count === 'number') {
          setMswUnreadCount(data.unread_count);
        }
      } catch {}
    };

    fetchMswUnread();
    const onMswNotifUpdate = () => {
      fetchMswUnread();
    };
    window.addEventListener('ofphil-msw-notifications-updated', onMswNotifUpdate);
    const interval = setInterval(fetchMswUnread, 8000);
    return () => {
      cancelled = true;
      window.removeEventListener('ofphil-msw-notifications-updated', onMswNotifUpdate);
      clearInterval(interval);
    };
  }, [role, user, pathname]);

  React.useEffect(() => {
    const syncInquiriesCount = () => {
      try {
        // Check global public inquiries + Juan Dela Cruz's inquiries + pending appointments against ofphil_admin_read_notifs
        const readList: string[] = JSON.parse(localStorage.getItem('ofphil_admin_read_notifs') || '[]');
        const readSet = new Set(Array.isArray(readList) ? readList : []);

        const globalInqs = JSON.parse(localStorage.getItem('ofphil_public_inquiries') || '[]');
        const allInqs = [...globalInqs];
        const seen = new Set<string>();
        let unread = 0;
        for (const item of allInqs) {
          if (!item || !item.id || seen.has(item.id)) continue;
          seen.add(item.id);
          const status = String(item.status || '').toLowerCase();
          if (status === 'read' || status === 'answered' || status === 'completed' || status === 'resolved') {
            continue;
          }
          if (!readSet.has(`inq-${item.id}`)) {
            unread += 1;
          }
        }

        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('ofphil_appointments_')) {
            try {
              const list = JSON.parse(localStorage.getItem(k) || '[]');
              if (Array.isArray(list)) {
                list.forEach((a: any) => {
                  if (a && a.id && a.status === 'Pending Nurse Approval' && !readSet.has(`apt-${a.id}`)) {
                    unread += 1;
                  }
                });
              }
            } catch {}
          }
        }
        setUnreadInquiriesCount(unread);

        // Count all upcoming scheduled appointments across patients
        let apptCount = 0;
        const seenAppts = new Set<string>();
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('ofphil_appointments_')) {
            const list = JSON.parse(localStorage.getItem(k) || '[]');
            if (Array.isArray(list)) {
              for (const a of list) {
                if (a && a.id && !seenAppts.has(a.id) && (a.status === 'Scheduled' || a.status === 'Pending Nurse Approval')) {
                  seenAppts.add(a.id);
                  apptCount += 1;
                }
              }
            }
          }
        }
        setUpcomingApptsCount(apptCount);
      } catch (e) {
        setUnreadInquiriesCount(0);
        setUpcomingApptsCount(0);
      }
    };

    const deferredSync = () => {
      setTimeout(syncInquiriesCount, 0);
    };
    syncInquiriesCount();
    window.addEventListener('storage', deferredSync);
    window.addEventListener('ofphil-inquiries-updated', deferredSync);
    window.addEventListener('ofphil-appointments-updated', deferredSync);
    const interval = setInterval(syncInquiriesCount, 1500);
    return () => {
      window.removeEventListener('storage', deferredSync);
      window.removeEventListener('ofphil-inquiries-updated', deferredSync);
      window.removeEventListener('ofphil-appointments-updated', deferredSync);
      clearInterval(interval);
    };
  }, [pathname]);

  // Lock body scroll and listen for Escape key on mobile when sidebar is open
  React.useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onToggle();
      };
      window.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onToggle]);

  // Helper for safe link navigation when unsaved changes exist
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (isOpen && typeof window !== 'undefined' && window.innerWidth < 768) {
      onToggle();
    }
    startProgress();
    const allowed = handleLinkClick(e, href);
    if (!allowed) {
      return;
    }
  };

  // Controlled or uncontrolled collapse state
  const isControlled = externalCollapsed !== undefined;
  const collapsed = isControlled ? externalCollapsed : internalCollapsed;
  const toggleCollapse = () => {
    if (externalOnCollapseToggle) {
      externalOnCollapseToggle();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  // Determine active view mode
  const isPatient = role === 'patient';
  const isAdmin = role === 'admin' || role === 'nurse';
  const isCaseworker = role === 'msw';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs"
          onClick={onToggle}
        />
      )}

      {/* Main Sidebar matching original app-sidebar style */}
      <aside
        id="appSidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 bg-[#064826] text-[#D5E2D9] flex flex-col transition-all duration-300 ease-in-out md:translate-x-0 ${collapsed ? 'w-[72px]' : 'w-[250px]'
          } ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{
          boxShadow: '4px 0 24px rgba(6, 72, 38, 0.15)',
        }}
      >
        {/* Circular Collapse Toggle Button (Desktop) */}
        <button
          onClick={toggleCollapse}
          className="hidden md:flex items-center justify-center absolute -right-3.5 top-6 w-7 h-7 rounded-full bg-white text-[#064826] border border-[#D5E2D9] shadow-md hover:bg-[#E6F1EA] transition z-50 cursor-pointer"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label="Toggle Sidebar Extension"
        >
          <i
            className={`fa-solid fa-chevron-right text-[11px] transition-transform duration-300 ${collapsed ? '' : 'rotate-180'
              }`}
          />
        </button>

        {/* Brand Header */}
        <div className="h-[72px] flex items-center justify-between px-5 border-b border-white/10 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-3 text-white no-underline overflow-hidden"
            title="Exit to Public Homepage"
          >
            <img
              src="/icons/ophil-logo.png"
              alt="OFPHIL Eye Logo"
              width={32}
              height={32}
              style={{ width: '32px', height: '32px', objectFit: 'contain', flexShrink: 0, display: 'block' }}
              className="h-8 w-8 object-contain shrink-0"
            />
            {!collapsed && (
              <div className="overflow-hidden whitespace-nowrap">
                <div className="font-['Outfit'] font-bold text-white text-[15px] tracking-wide leading-tight">
                  OFPHIL
                </div>
                <div className="text-[10px] text-[#A3C7B3] font-medium leading-tight truncate">
                  Ophthalmological Foundation
                </div>
              </div>
            )}
          </Link>

          <button
            onClick={onToggle}
            className="md:hidden p-1.5 text-white/70 hover:text-white rounded-lg"
          >
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {/* ========================================================
              ROLE 1: PATIENT PORTAL
             ======================================================== */}
          {isPatient && (
            <>
              {!collapsed && (
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#7EA98F]">
                  Patient Portal
                </div>
              )}
              <Link
                href="/portal?tab=dashboard"
                onClick={(e) => handleNavClick(e, '/portal?tab=dashboard')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${pathname === '/portal'
                  ? 'bg-[#0B6B3A] text-white font-semibold shadow-xs'
                  : 'text-[#D5E2D9] hover:bg-white/10 hover:text-white'
                  }`}
                title="Patient Dashboard"
              >
                <i className="fa-solid fa-hospital-user text-sm shrink-0 w-4 text-center" />
                {!collapsed && <span className="truncate">Patient Dashboard</span>}
              </Link>

              <Link
                href="/portal?tab=applications"
                onClick={(e) => handleNavClick(e, '/portal?tab=applications')}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-[#D5E2D9] hover:bg-white/10 hover:text-white transition-all"
                title="My Assistance Applications"
              >
                <i className="fa-solid fa-clipboard-list text-sm shrink-0 w-4 text-center" />
                {!collapsed && <span className="truncate">My Applications</span>}
              </Link>

              <Link
                href="/portal?tab=profile"
                onClick={(e) => handleNavClick(e, '/portal?tab=profile')}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-[#D5E2D9] hover:bg-white/10 hover:text-white transition-all"
                title="My Profile"
              >
                <i className="fa-solid fa-user-gear text-sm shrink-0 w-4 text-center" />
                {!collapsed && <span className="truncate">My Profile</span>}
              </Link>

              {!collapsed && (
                <div className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#7EA98F]">
                  Account &amp; Preferences
                </div>
              )}
              <Link
                href="/portal?tab=settings"
                onClick={(e) => handleNavClick(e, '/portal?tab=settings')}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-[#D5E2D9] hover:bg-white/10 hover:text-white transition-all"
                title="Settings & Preferences"
              >
                <i className="fa-solid fa-gear text-sm shrink-0 w-4 text-center" />
                {!collapsed && <span className="truncate">Settings &amp; Preferences</span>}
              </Link>
            </>
          )}

          {/* ========================================================
              ROLE 2: ADMIN PANEL (Matching Uploaded Screenshot)
             ======================================================== */}
          {isAdmin && (
            <>
              {!collapsed && (
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#7EA98F]">
                  ADMIN PANEL
                </div>
              )}

              {/* Register Patient */}
              <Link
                href="/admin/register-patient"
                onClick={(e) => handleNavClick(e, '/admin/register-patient')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${pathname.startsWith('/admin/register-patient')
                  ? 'bg-[#0B6B3A] text-white font-semibold shadow-xs'
                  : 'text-[#D5E2D9] hover:bg-white/10 hover:text-white'
                  }`}
                title="Register Patient"
              >
                <i className="fa-solid fa-user-plus text-sm shrink-0 w-4 text-center" />
                {!collapsed && <span className="truncate">Register Patient</span>}
              </Link>

              {/* Patient Records Directory (Highlighted Active) */}
              <div className="space-y-0.5">
                <Link
                  href="/admin/patient-records"
                  onClick={(e) => handleNavClick(e, '/admin/patient-records')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${pathname.startsWith('/admin/patient-records')
                    ? 'bg-[#0B6B3A] text-white font-semibold shadow-xs'
                    : 'text-[#D5E2D9] hover:bg-white/10 hover:text-white'
                    }`}
                  title="Patient Records"
                >
                  <div className="flex items-center gap-3 truncate">
                    <i className="fa-solid fa-address-book text-sm shrink-0 w-4 text-center" />
                    {!collapsed && <span className="truncate">Patient Records</span>}
                  </div>
                  {!collapsed && (
                    <i
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPatientRecordsOpen(!patientRecordsOpen);
                      }}
                      className={`fa-solid fa-chevron-down text-[10px] transition-transform p-1 hover:text-white ${patientRecordsOpen ? 'rotate-180' : ''
                        }`}
                    />
                  )}
                </Link>

                {patientRecordsOpen && !collapsed && (
                  <div className="pl-6 pr-1 py-1 space-y-0.5 border-l border-white/15 ml-4 mt-1">
                    <Link
                      href="/admin/patient-records"
                      onClick={(e) => handleNavClick(e, '/admin/patient-records')}
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${
                        pathname === '/admin/patient-records'
                          ? 'text-white font-semibold bg-white/20 shadow-xs'
                          : 'text-[#B4CEBE] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <i className="fa-solid fa-users text-[10px] w-3 text-center" />
                      <span>All Patients</span>
                    </Link>
                    {role !== 'nurse' && (
                      <Link
                        href="/admin/patient-records/charity"
                        onClick={(e) => handleNavClick(e, '/admin/patient-records/charity')}
                        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${
                          pathname === '/admin/patient-records/charity'
                            ? 'text-white font-semibold bg-white/20 shadow-xs ring-1 ring-white/25'
                            : 'text-[#B4CEBE] hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <i className="fa-solid fa-hand-holding-heart text-[10px] w-3 text-center text-[#86EFAC]" />
                        <span>Charity Patients</span>
                      </Link>
                    )}
                    <Link
                      href="/admin/patient-records/regular"
                      onClick={(e) => handleNavClick(e, '/admin/patient-records/regular')}
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${
                        pathname === '/admin/patient-records/regular'
                          ? 'text-white font-semibold bg-white/20 shadow-xs ring-1 ring-white/25'
                          : 'text-[#B4CEBE] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <i className="fa-solid fa-user-shield text-[10px] w-3 text-center" />
                      <span>Regular Patients</span>
                    </Link>
                    <Link
                      href="/admin/patient-records/with-accounts"
                      onClick={(e) => handleNavClick(e, '/admin/patient-records/with-accounts')}
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${
                        pathname === '/admin/patient-records/with-accounts'
                          ? 'text-white font-semibold bg-white/20 shadow-xs ring-1 ring-white/25'
                          : 'text-[#B4CEBE] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <i className="fa-solid fa-id-badge text-[10px] w-3 text-center text-[#93C5FD]" />
                      <span>Patients with Accounts</span>
                    </Link>
                  </div>
                )}
              </div>



              {/* Upcoming Appointments (With Live Scheduled Count Badge) */}
              <Link
                href="/admin/appointments"
                onClick={(e) => handleNavClick(e, '/admin/appointments')}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  pathname.startsWith('/admin/appointments')
                    ? 'bg-[#0B6B3A] text-white font-semibold shadow-xs'
                    : 'text-[#D5E2D9] hover:bg-white/10 hover:text-white'
                }`}
                title="Upcoming Appointments"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <i className="fa-solid fa-calendar-check text-sm shrink-0 w-4 text-center" />
                  {!collapsed && <span className="truncate">Upcoming Appointments</span>}
                </div>
                {!collapsed && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold leading-none transition ${
                      upcomingApptsCount > 0
                        ? 'bg-[#10B981] text-white shadow-2xs'
                        : 'bg-white/15 text-[#D5E2D9]'
                    }`}
                    title={
                      upcomingApptsCount > 0
                        ? `${upcomingApptsCount} Upcoming Patient Appointment(s)`
                        : '0 Upcoming Appointments'
                    }
                  >
                    {upcomingApptsCount}
                  </span>
                )}
              </Link>

              {/* Patient Inquiries (With Live Unread Notification Badge) */}
              <Link
                href="/admin/inquiries"
                onClick={(e) => handleNavClick(e, '/admin/inquiries')}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  pathname.startsWith('/admin/inquiries')
                    ? 'bg-[#0B6B3A] text-white font-semibold shadow-xs'
                    : 'text-[#D5E2D9] hover:bg-white/10 hover:text-white'
                }`}
                title="Notifications"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <i className="fa-solid fa-bell text-sm shrink-0 w-4 text-center" />
                  {!collapsed && <span className="truncate">Notifications</span>}
                </div>
                {!collapsed && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold leading-none transition ${
                      unreadInquiriesCount > 0
                        ? 'bg-[#DC2626] text-white shadow-2xs animate-pulse'
                        : 'bg-white/15 text-[#D5E2D9]'
                    }`}
                    title={
                      unreadInquiriesCount > 0
                        ? `${unreadInquiriesCount} Unread Notification(s)`
                        : '0 Unread Notifications'
                    }
                  >
                    {unreadInquiriesCount}
                  </span>
                )}
              </Link>

              {/* SECTION: SYSTEM & GOVERNANCE */}
              {!collapsed && (
                <div className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#7EA98F]">
                  SYSTEM &amp; GOVERNANCE
                </div>
              )}
              <Link
                href="/admin/settings"
                onClick={(e) => handleNavClick(e, '/admin/settings')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${pathname === '/admin/settings'
                  ? 'bg-[#0B6B3A] text-white font-semibold shadow-xs'
                  : 'text-[#D5E2D9] hover:bg-white/10 hover:text-white'
                  }`}
                title="Settings"
              >
                <i className="fa-solid fa-gear text-sm shrink-0 w-4 text-center" />
                {!collapsed && <span className="truncate">Settings</span>}
              </Link>

              <Link
                href="/admin/role-management"
                onClick={(e) => handleNavClick(e, '/admin/role-management')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${pathname === '/admin/role-management'
                  ? 'bg-[#0B6B3A] text-white font-semibold shadow-xs'
                  : 'text-[#D5E2D9] hover:bg-white/10 hover:text-white'
                  }`}
                title="Role Management"
              >
                <i className="fa-solid fa-user-shield text-sm shrink-0 w-4 text-center" />
                {!collapsed && <span className="truncate">Role Management</span>}
              </Link>

              {/* SECTION: ACCOUNT (Admin) */}
              {!collapsed && (
                <div className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#7EA98F]">
                  ACCOUNT
                </div>
              )}
              <Link
                href="/admin/profile"
                onClick={(e) => handleNavClick(e, '/admin/profile')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${pathname === '/admin/profile'
                  ? 'bg-[#0B6B3A] text-white font-semibold shadow-xs'
                  : 'text-[#D5E2D9] hover:bg-white/10 hover:text-white'
                  }`}
                title="My Profile"
              >
                <i className="fa-solid fa-id-badge text-sm shrink-0 w-4 text-center" />
                {!collapsed && <span className="truncate">My Profile</span>}
              </Link>
            </>
          )}

          {/* ========================================================
              ROLE 3: CASEWORKER (MSW) PANEL
             ======================================================== */}
          {isCaseworker && (
            <>
              {!collapsed && (
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#7EA98F]">
                  Social Worker Panel
                </div>
              )}

              {/* Clinical Dashboard */}
              <Link
                href="/dashboard"
                onClick={(e) => handleNavClick(e, '/dashboard')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${pathname === '/dashboard'
                  ? 'bg-[#0B6B3A] text-white font-semibold shadow-xs'
                  : 'text-[#D5E2D9] hover:bg-white/10 hover:text-white'
                  }`}
                title="Dashboard"
              >
                <i className="fa-solid fa-chart-pie text-sm shrink-0 w-4 text-center" />
                {!collapsed && <span className="truncate">Dashboard</span>}
              </Link>

              {/* Patient Records Directory (Group with sublinks) */}
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => setPatientRecordsOpen(!patientRecordsOpen)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${pathname.startsWith('/patients')
                    ? 'bg-[#0B6B3A] text-white font-semibold shadow-xs'
                    : 'text-[#D5E2D9] hover:bg-white/10 hover:text-white'
                    }`}
                  title="Patient Records"
                >
                  <div className="flex items-center gap-3 truncate">
                    <i className="fa-solid fa-address-book text-sm shrink-0 w-4 text-center" />
                    {!collapsed && <span className="truncate">Patient Records</span>}
                  </div>
                  {!collapsed && (
                    <i
                      className={`fa-solid fa-chevron-down text-[10px] transition-transform ${patientRecordsOpen ? 'rotate-180' : ''
                        }`}
                    />
                  )}
                </button>

                {patientRecordsOpen && !collapsed && (
                  <div className="pl-6 pr-1 py-1 space-y-0.5 border-l border-white/15 ml-4 mt-1">
                    <Link
                      href="/patients"
                      onClick={(e) => handleNavClick(e, '/patients')}
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${pathname === '/patients'
                        ? 'text-white font-semibold bg-white/15'
                        : 'text-[#B4CEBE] hover:text-white hover:bg-white/5'
                        }`}
                    >
                      <i className="fa-solid fa-hand-holding-heart text-[10px] w-3 text-center text-white" />
                      <span>Charity Patients</span>
                    </Link>
                    <Link
                      href="/patients/referrals"
                      onClick={(e) => handleNavClick(e, '/patients/referrals')}
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${pathname === '/patients/referrals'
                        ? 'text-white font-semibold bg-white/15'
                        : 'text-[#B4CEBE] hover:text-white hover:bg-white/5'
                        }`}
                    >
                      <i className="fa-solid fa-file-invoice-dollar text-[10px] w-3 text-center text-white" />
                      <span>Financial Assistance Referrals</span>
                    </Link>
                    <Link
                      href="/patients?tab=pending"
                      onClick={(e) => handleNavClick(e, '/patients?tab=pending')}
                      className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-[#B4CEBE] hover:text-white hover:bg-white/5 transition"
                    >
                      <i className="fa-solid fa-user-clock text-[10px] w-3 text-center text-white" />
                      <span>Pending Approvals</span>
                    </Link>
                    <Link
                      href="/patients?tab=promissory"
                      onClick={(e) => handleNavClick(e, '/patients?tab=promissory')}
                      className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-[#B4CEBE] hover:text-white hover:bg-white/5 transition"
                    >
                      <i className="fa-solid fa-file-signature text-[10px] w-3 text-center text-white" />
                      <span>Disapproved / Promissory</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Evidential Documents */}
              <Link
                href="/documents"
                onClick={(e) => handleNavClick(e, '/documents')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${pathname.startsWith('/documents')
                  ? 'bg-[#0B6B3A] text-white font-semibold shadow-xs'
                  : 'text-[#D5E2D9] hover:bg-white/10 hover:text-white'
                  }`}
                title="Quotation Audit & Documents"
              >
                <i className="fa-solid fa-file-invoice text-sm shrink-0 w-4 text-center" />
                {!collapsed && <span className="truncate">Document Audit</span>}
              </Link>

              {/* Caseworker Notifications Feed */}
              <Link
                href="/notifications"
                onClick={(e) => handleNavClick(e, '/notifications')}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${pathname.startsWith('/notifications')
                  ? 'bg-[#0B6B3A] text-white font-semibold shadow-xs'
                  : 'text-[#D5E2D9] hover:bg-white/10 hover:text-white'
                  }`}
                title="Notifications"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <i className="fa-solid fa-bell text-sm shrink-0 w-4 text-center" />
                  {!collapsed && <span className="truncate">Notifications</span>}
                </div>
                {!collapsed && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold leading-none transition ${
                      mswUnreadCount > 0
                        ? 'bg-[#DC2626] text-white shadow-2xs animate-pulse'
                        : 'bg-white/15 text-[#D5E2D9]'
                    }`}
                  >
                    {mswUnreadCount}
                  </span>
                )}
              </Link>

              {/* SECTION: ACCOUNT (Caseworker) */}
              {!collapsed && (
                <div className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#7EA98F]">
                  Account
                </div>
              )}
              <Link
                href="/profile"
                onClick={(e) => handleNavClick(e, '/profile')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${pathname === '/profile'
                  ? 'bg-[#0B6B3A] text-white font-semibold shadow-xs'
                  : 'text-[#D5E2D9] hover:bg-white/10 hover:text-white'
                  }`}
                title="My Profile"
              >
                <i className="fa-solid fa-id-badge text-sm shrink-0 w-4 text-center" />
                {!collapsed && <span className="truncate">My Profile</span>}
              </Link>

              <Link
                href="/settings"
                onClick={(e) => handleNavClick(e, '/settings')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${pathname === '/settings'
                  ? 'bg-[#0B6B3A] text-white font-semibold shadow-xs'
                  : 'text-[#D5E2D9] hover:bg-white/10 hover:text-white'
                  }`}
                title="MSW Settings"
              >
                <i className="fa-solid fa-gear text-sm shrink-0 w-4 text-center" />
                {!collapsed && <span className="truncate">Settings</span>}
              </Link>
            </>
          )}

          {/* ========================================================
              COMMON SIGN OUT (All Roles)
             ======================================================== */}
          {!isAdmin && !collapsed && (
            <div className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#7EA98F]">
              Account
            </div>
          )}
          <button
            type="button"
            disabled={isLoggingOut}
            onClick={() => {
              const target = isCaseworker ? '/login-msw' : isPatient ? '/login-patient' : '/login-admin';
              logout(target);
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-[#D5E2D9] hover:bg-white/10 hover:text-white transition-all bg-transparent border-0 cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed"
            title="Sign Out"
          >
            <i className={`fa-solid ${isLoggingOut ? 'fa-spinner fa-spin' : 'fa-arrow-right-from-bracket'} text-sm shrink-0 w-4 text-center`} />
            {!collapsed && <span className="truncate">{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>}
          </button>
        </div>

        {/* Footer */}
        {!collapsed && (
          <div className="p-4 border-t border-white/10 bg-[#04331B]/50 shrink-0">
            <div className="text-[11px] font-semibold text-white">OFPHIL Foundation</div>
            <div className="text-[9.5px] text-[#A3C7B3] mt-0.5 leading-snug">
              © 2026 Ophthalmological Foundation of the Philippines. All rights reserved.
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

export function Header({
  onMenuClick,
  title,
  subtitle,
}: {
  onMenuClick: () => void;
  title?: string;
  subtitle?: string;
}) {
  const { role, user, logout, isLoggingOut } = useAuth();
  const router = useRouter();
  const { showLoading, isProgressBarActive, startProgress } = useLoadingScreen();
  const { handleLinkClick } = useNavigationBlocker();

  const isPatient = role === 'patient';
  const isAdmin = role === 'admin' || role === 'nurse';
  const isCaseworker = role === 'msw';

  // Dropdown states
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [a11yDropdownOpen, setA11yDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [unreadInquiriesCount, setUnreadInquiriesCount] = useState(0);
  const [mswNotifications, setMswNotifications] = useState<MSWNotificationItem[]>([]);
  const [mswUnreadCount, setMswUnreadCount] = useState(0);
  const [mswNotifLoading, setMswNotifLoading] = useState(false);
  const [upcomingApptsCount, setUpcomingApptsCount] = useState(0);

  const a11yRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const mswUserId = (user as any)?.username || user?.id || 'msw_lead';

  const fetchMswNotifications = React.useCallback(async () => {
    if (!isCaseworker) return;
    try {
      const res = await fetch(getApiUrl('/inquiries/notifications/list'), {
        headers: {
          'x-user-role': 'msw',
          'x-user-id': String(mswUserId),
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      setMswNotifications(Array.isArray(data.items) ? data.items : []);
      setMswUnreadCount(typeof data.unread_count === 'number' ? data.unread_count : 0);
    } catch {}
  }, [isCaseworker, mswUserId]);

  React.useEffect(() => {
    if (!isCaseworker) return;
    fetchMswNotifications();
    const onNotifSync = () => {
      fetchMswNotifications();
    };
    window.addEventListener('ofphil-msw-notifications-updated', onNotifSync);
    const interval = setInterval(fetchMswNotifications, 8000);
    return () => {
      window.removeEventListener('ofphil-msw-notifications-updated', onNotifSync);
      clearInterval(interval);
    };
  }, [isCaseworker, fetchMswNotifications]);

  const handleMarkMswNotificationRead = async (notifId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    try {
      await fetch(getApiUrl(`/inquiries/notifications/${encodeURIComponent(notifId)}/read`), {
        method: 'POST',
        headers: {
          'x-user-role': 'msw',
          'x-user-id': String(mswUserId),
        },
      });
      setMswNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      setMswUnreadCount((prev) => Math.max(0, prev - 1));
      window.dispatchEvent(new Event('ofphil-msw-notifications-updated'));
    } catch {}
  };

  const handleMarkAllMswNotificationsRead = async () => {
    if (mswUnreadCount === 0) return;
    setMswNotifLoading(true);
    try {
      await fetch(getApiUrl('/inquiries/notifications/mark-all-read'), {
        method: 'POST',
        headers: {
          'x-user-role': 'msw',
          'x-user-id': String(mswUserId),
        },
      });
      setMswNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: n.read_at || new Date().toISOString() }))
      );
      setMswUnreadCount(0);
      window.dispatchEvent(new Event('ofphil-msw-notifications-updated'));
    } catch {} finally {
      setMswNotifLoading(false);
    }
  };

  const handleClickMswNotification = async (item: MSWNotificationItem) => {
    if (!item.is_read) {
      await handleMarkMswNotificationRead(item.id);
    }
    setNotifDropdownOpen(false);
    startProgress();
    router.push(item.target_destination || '/patients');
  };

  // Close dropdowns on click outside or Escape key
  useEffect(() => {
    const handleOutsideAndEscape = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key === 'Escape') {
        setA11yDropdownOpen(false);
        setProfileDropdownOpen(false);
        setNotifDropdownOpen(false);
        return;
      }
      if (e instanceof MouseEvent) {
        if (a11yRef.current && !a11yRef.current.contains(e.target as Node)) {
          setA11yDropdownOpen(false);
        }
        if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
          setProfileDropdownOpen(false);
        }
        if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
          setNotifDropdownOpen(false);
        }
      }
    };

    window.addEventListener('mousedown', handleOutsideAndEscape);
    window.addEventListener('keydown', handleOutsideAndEscape);
    return () => {
      window.removeEventListener('mousedown', handleOutsideAndEscape);
      window.removeEventListener('keydown', handleOutsideAndEscape);
    };
  }, []);

  React.useEffect(() => {
    const syncHeaderNotifications = () => {
      try {
        const readList: string[] = JSON.parse(localStorage.getItem('ofphil_admin_read_notifs') || '[]');
        const readSet = new Set(Array.isArray(readList) ? readList : []);

        const globalInqs = JSON.parse(localStorage.getItem('ofphil_public_inquiries') || '[]');
        const allInqs = [...globalInqs];
        const seen = new Set<string>();
        let unread = 0;
        for (const item of allInqs) {
          if (!item || !item.id || seen.has(item.id)) continue;
          seen.add(item.id);
          const status = String(item.status || '').toLowerCase();
          if (status === 'read' || status === 'answered' || status === 'completed' || status === 'resolved') {
            continue;
          }
          if (!readSet.has(`inq-${item.id}`)) {
            unread += 1;
          }
        }

        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('ofphil_appointments_')) {
            try {
              const list = JSON.parse(localStorage.getItem(k) || '[]');
              if (Array.isArray(list)) {
                list.forEach((a: any) => {
                  if (a && a.id && a.status === 'Pending Nurse Approval' && !readSet.has(`apt-${a.id}`)) {
                    unread += 1;
                  }
                });
              }
            } catch {}
          }
        }
        setUnreadInquiriesCount(unread);

        // Count all upcoming scheduled appointments across patients
        let apptCount = 0;
        const seenAppts = new Set<string>();
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('ofphil_appointments_')) {
            const list = JSON.parse(localStorage.getItem(k) || '[]');
            if (Array.isArray(list)) {
              for (const a of list) {
                if (a && a.id && !seenAppts.has(a.id) && (a.status === 'Scheduled' || a.status === 'Pending Nurse Approval')) {
                  seenAppts.add(a.id);
                  apptCount += 1;
                }
              }
            }
          }
        }
        setUpcomingApptsCount(apptCount);
      } catch (e) {
        setUnreadInquiriesCount(0);
        setUpcomingApptsCount(0);
      }
    };

    const deferredHeaderSync = () => {
      setTimeout(syncHeaderNotifications, 0);
    };
    syncHeaderNotifications();
    window.addEventListener('storage', deferredHeaderSync);
    window.addEventListener('ofphil-inquiries-updated', deferredHeaderSync);
    const interval = setInterval(syncHeaderNotifications, 1500);
    return () => {
      window.removeEventListener('storage', deferredHeaderSync);
      window.removeEventListener('ofphil-inquiries-updated', deferredHeaderSync);
      clearInterval(interval);
    };
  }, []);

  // Quick Display & Reading Aid global accessibility state
  const {
    fontSize,
    themeMode,
    fontFamily,
    tableDensity,
    setFontSize: handleFontSizeChange,
    setThemeMode,
    setFontFamily,
    setTableDensity,
    resetAccessibility: handleResetDisplay,
  } = useAccessibility();

  const defaultTitle = isPatient
    ? 'Patient Dashboard'
    : isAdmin
      ? 'Patient Records Directory'
      : 'Clinical Casework & Eligibility Dashboard';

  const defaultSubtitle =
    'Ophthalmological Foundation of the Philippines — Patient Master Registry & Clinical Directory';

  return (
    <header className="sticky top-0 z-30 h-[72px] bg-white border-b border-[#D5E2D9] px-3.5 sm:px-6 flex items-center justify-between shadow-xs relative">
      {/* Sleek Clinical Progress Loading Bar Attached Underneath Header */}
      {isProgressBarActive && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#E6F1EA] overflow-hidden z-50">
          <div className="h-full bg-gradient-to-r from-[#0B6B3A] via-[#10B981] to-[#047857] shadow-sm animate-clinical-progress" />
        </div>
      )}

      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
          aria-label="Toggle Menu"
        >
          <i className="fa-solid fa-bars text-base" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-['Outfit'] font-bold text-[#10241A] leading-tight truncate">
            {title || defaultTitle}
          </h1>
          <p className="text-xs text-[#5A7466] leading-tight truncate hidden sm:block">
            {subtitle || defaultSubtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Topbar Notification Bell Icon & Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              if (isCaseworker) {
                setNotifDropdownOpen(!notifDropdownOpen);
                setA11yDropdownOpen(false);
                setProfileDropdownOpen(false);
                if (!notifDropdownOpen) fetchMswNotifications();
              } else {
                startProgress();
                router.push('/admin/inquiries');
              }
            }}
            className={`relative w-9 h-9 rounded-full transition flex items-center justify-center text-sm cursor-pointer border border-[#D5E2D9] ${
              notifDropdownOpen
                ? 'bg-[#0B6B3A] text-white shadow-xs'
                : 'bg-white text-[#0B6B3A] hover:bg-[#E6F1EA]'
            }`}
            title="Notifications"
            aria-label="Notifications"
          >
            <i className="fa-solid fa-bell text-sm" />
            {(isCaseworker ? mswUnreadCount : unreadInquiriesCount) > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-white leading-none shadow-2xs">
                {isCaseworker ? mswUnreadCount : unreadInquiriesCount}
              </span>
            )}
          </button>

          {isCaseworker && notifDropdownOpen && (
            <div className="absolute right-0 top-12 w-[calc(100vw-24px)] max-w-sm sm:w-96 bg-white rounded-2xl shadow-xl border border-[#D5E2D9] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-3 bg-[#F8FBF9] border-b border-[#D5E2D9] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-bell text-[#0B6B3A] text-sm" />
                  <span className="font-bold text-[#10241A] text-xs sm:text-[13px]">MSW Casework Notifications</span>
                  {mswUnreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#DC2626] text-white">
                      {mswUnreadCount} Unread
                    </span>
                  )}
                </div>
                {mswUnreadCount > 0 && (
                  <button
                    type="button"
                    disabled={mswNotifLoading}
                    onClick={handleMarkAllMswNotificationsRead}
                    className="text-[11px] font-bold text-[#0B6B3A] hover:underline bg-transparent border-0 cursor-pointer p-0 disabled:opacity-50"
                  >
                    Mark All as Read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[#EEF2EF]">
                {mswNotifications.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center mx-auto mb-2">
                      <i className="fa-regular fa-bell-slash text-base" />
                    </div>
                    <div className="text-xs font-bold text-[#1E293B]">No MSW notifications yet</div>
                    <div className="text-[11px] text-[#64748B] mt-0.5">
                      New patient assignments, assessments, referrals, and inquiry alerts will appear here.
                    </div>
                  </div>
                ) : (
                  mswNotifications.slice(0, 8).map((item) => {
                    const iconClass =
                      item.notification_type === 'CHARITY_APPROVED'
                        ? 'fa-circle-check text-[#0B6B3A] bg-[#E8F5EC]'
                        : item.notification_type === 'CHARITY_DENIED_OR_PROMISSORY'
                          ? 'fa-file-signature text-[#D97706] bg-[#FEF3C7]'
                          : item.notification_type === 'REFERRAL_UPDATED'
                            ? 'fa-file-invoice-dollar text-[#0284C7] bg-[#E0F2FE]'
                            : item.notification_type === 'DOCUMENT_UPLOADED'
                              ? 'fa-file-shield text-[#7C3AED] bg-[#F3E8FF]'
                              : item.notification_type === 'PATIENT_INQUIRY'
                                ? 'fa-envelope-open-text text-[#DC2626] bg-[#FEE2E2]'
                                : 'fa-clipboard-user text-[#0B6B3A] bg-[#E8F5EC]';
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleClickMswNotification(item)}
                        className={`p-3.5 transition cursor-pointer flex items-start gap-3 ${
                          item.is_read ? 'bg-white hover:bg-[#F8FAFC]' : 'bg-[#F0F9F3] hover:bg-[#E6F4EB]'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${iconClass.split(' ').slice(1).join(' ')}`}>
                          <i className={`fa-solid ${iconClass.split(' ')[0]} text-xs ${iconClass.split(' ')[1]}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className={`text-xs leading-snug ${item.is_read ? 'font-semibold text-[#1E293B]' : 'font-extrabold text-[#10241A]'}`}>
                              {item.title}
                            </div>
                            {!item.is_read && (
                              <span className="w-2 h-2 rounded-full bg-[#0B6B3A] shrink-0 mt-1" title="Unread" />
                            )}
                          </div>
                          <p className="text-[11px] text-[#475569] mt-0.5 line-clamp-2 leading-relaxed">
                            {item.message}
                          </p>
                          <div className="flex items-center justify-between gap-2 mt-1.5">
                            <span className="text-[10px] font-medium text-[#64748B]">
                              {item.related_patient_id && (
                                <span className="font-mono font-bold text-[#0B6B3A] mr-1.5">
                                  {item.related_patient_id}
                                </span>
                              )}
                              {new Date(item.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            {!item.is_read && (
                              <button
                                type="button"
                                onClick={(e) => handleMarkMswNotificationRead(item.id, e)}
                                className="text-[10px] font-bold text-[#0B6B3A] hover:underline bg-transparent border-0 cursor-pointer p-0"
                              >
                                Mark as read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-2.5 bg-[#F8FBF9] border-t border-[#D5E2D9] text-center">
                <Link
                  href="/notifications"
                  onClick={(e) => {
                    startProgress();
                    const allowed = handleLinkClick(e, '/notifications');
                    if (allowed) setNotifDropdownOpen(false);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl text-xs font-bold text-[#0B6B3A] hover:bg-[#E8F5EC] transition no-underline"
                >
                  <span>View All Notifications</span>
                  <i className="fa-solid fa-arrow-right text-[10px]" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Universal Accessibility / Quick Display & Reading Aid Quick Button */}
        <div className="relative" ref={a11yRef}>
          <button
            type="button"
            onClick={() => {
              setA11yDropdownOpen(!a11yDropdownOpen);
              setProfileDropdownOpen(false);
              setNotifDropdownOpen(false);
            }}
            className={`w-9 h-9 rounded-full transition flex items-center justify-center text-sm cursor-pointer border border-[#D5E2D9] ${a11yDropdownOpen
              ? 'bg-[#0B6B3A] text-white shadow-xs'
              : 'bg-white text-[#0B6B3A] hover:bg-[#E6F1EA]'
              }`}
            title="Display & Accessibility"
            aria-label="Accessibility options"
          >
            <i className="fa-solid fa-universal-access text-base" />
          </button>

          {/* Quick Display & Reading Aid Dropdown Menu (Matching User Screenshot) */}
          {a11yDropdownOpen && (
            <div className="absolute right-0 top-12 w-[calc(100vw-24px)] max-w-xs sm:w-80 bg-white rounded-2xl shadow-xl border border-[#D5E2D9] p-4 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#EEF2EF] mb-3.5">
                <div className="flex items-center gap-2 font-bold text-[#10241A] text-[13px]">
                  <i className="fa-regular fa-eye text-[#0B6B3A] text-sm" />
                  <span>Quick Display &amp; Reading Aid</span>
                </div>
                <button
                  type="button"
                  onClick={handleResetDisplay}
                  className="text-[11.5px] font-semibold text-[#0B6B3A] hover:underline bg-transparent border-0 cursor-pointer p-0"
                >
                  Reset
                </button>
              </div>

              {/* 1. Font Size & Scaling */}
              <div className="mb-4">
                <label className="block text-[11px] font-bold text-[#334155] mb-2">
                  Font Size &amp; Scaling
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['100%', '110%', '120%', '130%'] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleFontSizeChange(size)}
                      className={`py-2 rounded-xl font-bold text-xs border transition cursor-pointer ${fontSize === size
                        ? 'bg-[#0B6B3A] text-white border-[#0B6B3A] shadow-xs'
                        : 'bg-[#F8FAFC] text-[#334155] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                        }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Theme & Contrast Mode */}
              <div className="mb-4">
                <label className="block text-[11px] font-bold text-[#334155] mb-2">
                  Theme &amp; Contrast Mode
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Light', 'Dark', 'High Contrast'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setThemeMode(mode)}
                      className={`py-2 px-1 text-center rounded-xl font-bold text-[11px] border transition cursor-pointer ${themeMode === mode
                        ? 'bg-[#0B6B3A] text-white border-[#0B6B3A] shadow-xs'
                        : 'bg-[#F8FAFC] text-[#334155] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                        }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Font Family Style */}
              <div className="mb-4">
                <label className="block text-[11px] font-bold text-[#334155] mb-2">
                  Font Family Style
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Clinical', 'Serif', 'Low-Vision'] as const).map((fam) => (
                    <button
                      key={fam}
                      type="button"
                      onClick={() => setFontFamily(fam)}
                      className={`py-2 px-1 text-center rounded-xl font-bold text-[11px] border transition cursor-pointer ${fontFamily === fam
                        ? 'bg-[#0B6B3A] text-white border-[#0B6B3A] shadow-xs'
                        : 'bg-[#F8FAFC] text-[#334155] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                        }`}
                    >
                      {fam}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Table Row Density */}
              <div>
                <label className="block text-[11px] font-bold text-[#334155] mb-2">
                  Table Row Density
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['Comfortable', 'Compact'] as const).map((density) => (
                    <button
                      key={density}
                      type="button"
                      onClick={() => setTableDensity(density)}
                      className={`py-2 rounded-xl font-bold text-[11.5px] border transition cursor-pointer ${tableDensity === density
                        ? 'bg-[#0B6B3A] text-white border-[#0B6B3A] shadow-xs'
                        : 'bg-[#F8FAFC] text-[#334155] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                        }`}
                    >
                      {density}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Interactive User Pill Profile Dropdown (Matching User Screenshot) */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => {
              setProfileDropdownOpen(!profileDropdownOpen);
              setA11yDropdownOpen(false);
              setNotifDropdownOpen(false);
            }}
            className={`flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border text-xs transition cursor-pointer ${profileDropdownOpen
              ? 'bg-[#E8F5EC] border-[#0B6B3A] shadow-xs ring-2 ring-[#0B6B3A]/20'
              : 'bg-[#FAFBF8] hover:bg-[#E8F5EC] border-[#D5E2D9]'
              }`}
            title="User Profile Menu"
            aria-label="User Profile"
          >
            <div className="w-6 h-6 rounded-full bg-[#064826] text-white flex items-center justify-center font-bold text-[11px] shrink-0 leading-none">
              <span className="flex items-center justify-center w-full h-full text-center">
                {(user?.name || (isAdmin ? 'Roberto Reyes' : isPatient ? 'Juan Dela Cruz' : 'Maria Santos'))
                  .replace(/^Dr\.\s*/i, '')
                  .charAt(0)
                  .toUpperCase()}
              </span>
            </div>
            <div className="text-left hidden sm:block">
              <div className="font-bold text-[#10241A] leading-tight">
                {user?.name || (isAdmin ? 'Dr. Roberto Reyes' : isPatient ? 'Juan Dela Cruz' : 'Maria Santos, RSW')}
              </div>
              <div className="text-[10px] text-[#5A7466] leading-tight flex items-center gap-1">
                <i className="fa-solid fa-user-shield text-[9px] text-[#0B6B3A]" />
                <span>
                  {role === 'nurse'
                    ? 'Clinic Nurse'
                    : isAdmin
                      ? 'Clinic Administrator'
                      : isPatient
                        ? 'Patient Beneficiary'
                        : 'MSW Caseworker'}
                </span>
              </div>
            </div>
            <i
              className={`fa-solid fa-chevron-up text-[10px] text-gray-500 ml-0.5 sm:ml-1 hidden sm:block transition-transform ${profileDropdownOpen ? '' : 'rotate-180'
                }`}
            />
          </button>

          {/* Profile Dropdown Menu Card (Matching User Screenshot) */}
          {profileDropdownOpen && (
            <div className="absolute right-0 top-12 w-64 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-xl border border-[#D5E2D9] p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Profile Card Header */}
              <div className="p-2 pb-3 mb-2 border-b border-[#EEF2EF] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E6F1EA] text-[#0B6B3A] flex items-center justify-center font-bold text-base border border-[#BBF7D0]">
                  {(user?.name || (isAdmin ? 'Roberto Reyes' : isPatient ? 'Juan Dela Cruz' : 'Maria Santos'))
                    .replace(/^Dr\.\s*/i, '')
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-[#10241A] text-[13px] truncate">
                    {user?.name || (isAdmin ? 'Dr. Roberto Reyes' : isPatient ? 'Juan Dela Cruz' : 'Maria Santos, RSW')}
                  </div>
                  <div className="text-[11px] text-[#64748B] truncate">
                    {isAdmin ? 'roxas.t.bscs@gmail.com' : isPatient ? 'tan1925alex@gmail.com' : 'roxastal.cbpa@gmail.com'}
                  </div>
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#E6F1EA] text-[#0B6B3A]">
                      {role === 'nurse'
                        ? 'Clinic Nurse'
                        : isAdmin
                          ? 'Clinic Administrator'
                          : isPatient
                            ? 'Patient Beneficiary'
                            : 'MSW Caseworker'}{' '}
                      &bull; Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu Links */}
              <div className="space-y-1">
                <Link
                  href={isAdmin ? '/admin/profile' : isPatient ? '/portal?tab=profile' : '/profile'}
                  onClick={(e) => {
                    startProgress();
                    const target = isAdmin ? '/admin/profile' : isPatient ? '/portal?tab=profile' : '/profile';
                    const allowed = handleLinkClick(e, target);
                    if (allowed) setProfileDropdownOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#1E293B] hover:bg-[#F8FAFC] transition no-underline"
                >
                  <i className="fa-solid fa-address-card text-[#0B6B3A] text-sm w-4 text-center" />
                  <span>My Profile</span>
                </Link>

                <Link
                  href={isAdmin ? '/admin/settings' : isCaseworker ? '/settings' : '/portal?tab=settings'}
                  onClick={(e) => {
                    startProgress();
                    const target = isAdmin ? '/admin/settings' : isCaseworker ? '/settings' : '/portal?tab=settings';
                    const allowed = handleLinkClick(e, target);
                    if (allowed) setProfileDropdownOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#1E293B] hover:bg-[#F8FAFC] transition no-underline"
                >
                  <i className="fa-solid fa-sliders text-[#0B6B3A] text-sm w-4 text-center" />
                  <span>Account Settings</span>
                </Link>

                <Link
                  href={isCaseworker ? '/notifications' : '/admin/inquiries'}
                  onClick={(e) => {
                    startProgress();
                    const targetHref = isCaseworker ? '/notifications' : '/admin/inquiries';
                    const allowed = handleLinkClick(e, targetHref);
                    if (allowed) setProfileDropdownOpen(false);
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-[#1E293B] hover:bg-[#F8FAFC] transition no-underline"
                >
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-bell text-[#0B6B3A] text-sm w-4 text-center" />
                    <span>Notifications</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold transition ${
                      (isCaseworker ? mswUnreadCount : unreadInquiriesCount) > 0
                        ? 'bg-[#DC2626] text-white animate-pulse'
                        : 'bg-[#E2E8F0] text-[#475569]'
                    }`}
                  >
                    {isCaseworker ? mswUnreadCount : unreadInquiriesCount}
                  </span>
                </Link>
              </div>

              {/* Sign Out Action */}
              <div className="mt-2 pt-2 border-t border-[#EEF2EF]">
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    const target = isCaseworker ? '/login-msw' : isPatient ? '/login-patient' : '/login-admin';
                    logout(target);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-[#DC2626] hover:bg-[#FEF2F2] transition bg-transparent border-0 cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className={`fa-solid ${isLoggingOut ? 'fa-spinner fa-spin' : 'fa-arrow-right-from-bracket'} text-[#DC2626] text-sm w-4 text-center`} />
                  <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
