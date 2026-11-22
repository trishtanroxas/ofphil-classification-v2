'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLoadingScreen } from '@/context/LoadingScreenContext';
import { useAuth } from '@/context/AuthContext';
import { useAccessibility } from '@/context/AccessibilityContext';

interface PatientAppShellProps {
  children: React.ReactNode;
  activeTab?: 'dashboard' | 'applications' | 'appointments' | 'notifications' | 'profile' | 'settings';
  pageTitle?: string;
  pageSubtitle?: string;
}

export default function PatientAppShell({
  children,
  activeTab = 'dashboard',
  pageTitle = 'Patient Dashboard',
  pageSubtitle = 'Ophthalmological Foundation of the Philippines — Patient Master Registry & Clinical Directory',
}: PatientAppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [a11yDropdownOpen, setA11yDropdownOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const a11yRef = React.useRef<HTMLDivElement>(null);
  const profileRef = React.useRef<HTMLDivElement>(null);

  // Lock body scroll and handle Escape key for mobile sidebar drawer
  useEffect(() => {
    if (mobileSidebarOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setMobileSidebarOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [mobileSidebarOpen]);

  // Handle click-outside and Escape key for header dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (a11yRef.current && !a11yRef.current.contains(e.target as Node)) {
        setA11yDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setA11yDropdownOpen(false);
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
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

  const { showLoading, isProgressBarActive, startProgress } = useLoadingScreen();
  const { user, logout, isLoggingOut } = useAuth();

  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} · OFPHIL`;
    }
  }, [pageTitle]);

  const patient = {
    name: user?.name || 'Juan Dela Cruz',
    username: user?.username || 'M26-11-00001',
    patient_id: user?.id || 'M26-11-00001',
    sex: 'M',
    residence: 'City of Manila, Metro Manila (NCR)',
    contact: '0917 888 1678',
    email: 'juan.delacruz@example.ph',
  };

  // Sync live unread notifications count for Patient (Urgent clinic notices + Scheduled/Pending appointments + Clinic replies)
  useEffect(() => {
    const syncPatientNotifs = () => {
      try {
        const pid = 'M26-11-00001';
        const readIds: string[] = JSON.parse(localStorage.getItem(`ofphil_patient_read_notifs_${pid}`) || '[]');
        const readSet = new Set(Array.isArray(readIds) ? readIds : []);

        let unread = 0;

        // 1. Urgent alerts from Admin / MSW
        const urgentList = JSON.parse(localStorage.getItem(`ofphil_urgent_${pid}`) || '[]');
        if (Array.isArray(urgentList)) {
          urgentList.forEach((u: any, idx: number) => {
            const nid = `urgent-${u.id || idx}`;
            if (!u.isReadByPatient && !readSet.has(nid)) unread += 1;
          });
        }

        // 2. Appointments & Schedule updates
        const apptList = JSON.parse(localStorage.getItem(`ofphil_appointments_${pid}`) || '[]');
        if (Array.isArray(apptList)) {
          apptList.forEach((a: any, idx: number) => {
            const nid = `appt-${a.id || idx}-${a.status}`;
            if (!a.isReadByPatient && !readSet.has(nid)) unread += 1;
          });
        }

        // 3. Clinic replies on patient's submitted inquiries
        const inqList = JSON.parse(localStorage.getItem(`ofphil_inquiries_${pid}`) || '[]');
        if (Array.isArray(inqList)) {
          inqList.forEach((inq: any) => {
            if (inq && inq.source === 'patient_portal' && Array.isArray(inq.replyHistory)) {
              inq.replyHistory.forEach((rep: any, rIdx: number) => {
                const nid = `reply-${inq.id}-${rIdx}`;
                if (!readSet.has(nid)) unread += 1;
              });
            }
          });
        }

        // 4. Logged clinical encounters / diagnoses
        const encList = JSON.parse(localStorage.getItem(`ofphil_encounters_${pid}`) || '[]');
        if (Array.isArray(encList)) {
          encList.forEach((enc: any, idx: number) => {
            const nid = `enc-${enc.assessment_id || enc.id || idx}`;
            if (!readSet.has(nid)) unread += 1;
          });
        }

        setUnreadNotificationsCount(unread);
      } catch {
        setUnreadNotificationsCount(0);
      }
    };

    const deferred = () => setTimeout(syncPatientNotifs, 0);
    syncPatientNotifs();
    window.addEventListener('storage', deferred);
    window.addEventListener('ofphil-patient-notifs-updated', deferred);
    window.addEventListener('ofphil-appointments-updated', deferred);
    window.addEventListener('ofphil-encounters-updated', deferred);
    window.addEventListener('ofphil-inquiries-updated', deferred);
    const interval = setInterval(syncPatientNotifs, 1500);
    return () => {
      window.removeEventListener('storage', deferred);
      window.removeEventListener('ofphil-patient-notifs-updated', deferred);
      window.removeEventListener('ofphil-appointments-updated', deferred);
      window.removeEventListener('ofphil-encounters-updated', deferred);
      window.removeEventListener('ofphil-inquiries-updated', deferred);
      clearInterval(interval);
    };
  }, []);

  // Accessibility handled globally by AccessibilityContext

  return (
    <div
      className={`min-h-screen bg-[#FAFBF8] flex text-[#10241A] font-sans ${
        sidebarCollapsed ? 'sidebar-collapsed' : ''
      }`}
    >
      {/* Mobile Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-[#10241A]/45 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* 1. App Sidebar Component (Deep Green Clinic Studio Theme) */}
      <aside
        id="appSidebar"
        className={`app-sidebar fixed top-0 bottom-0 left-0 z-50 bg-[#064826] text-white flex flex-col transition-all duration-200 border-r border-[#D5E2D9]/15 shadow-sm ${
          sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'
        } ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Circular Arrow Extension Toggle Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="sidebar-circle-toggle hidden lg:flex"
          aria-label="Toggle Sidebar Extension"
          title="Expand / Collapse Sidebar"
          type="button"
        >
          <i
            className={`fa-solid fa-chevron-right text-[11px] transition-transform duration-200 ${
              sidebarCollapsed ? '' : 'rotate-180'
            }`}
          />
        </button>

        {/* Sidebar Header */}
        <div className="sidebar-header h-[72px] px-5 border-b border-[#D5E2D9]/15 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="sidebar-brand flex items-center gap-3 no-underline text-inherit"
            title="Exit to Public Homepage"
          >
            <img
              src="/icons/ophil-logo.png"
              alt="OFPHIL Eye Logo"
              width={34}
              height={34}
              style={{ width: '34px', height: '34px', objectFit: 'contain', flexShrink: 0, display: 'block' }}
              className="h-[34px] w-[34px] object-contain flex-shrink-0"
            />
            {!sidebarCollapsed && (
              <div className="sidebar-brand-text min-w-0">
                <div className="sidebar-title font-['Outfit'] text-base font-bold tracking-wider text-white leading-tight">
                  OFPHIL
                </div>
                <div className="sidebar-subtitle text-[11px] text-[#9DBFA9] font-medium whitespace-nowrap">
                  Ophthalmological Foundation
                </div>
              </div>
            )}
          </Link>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="sidebar-close-btn lg:hidden text-white/80 hover:text-white"
            aria-label="Close Sidebar"
          >
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav p-3 flex flex-col gap-1 flex-1 overflow-y-auto">
          {/* Section: PATIENT PORTAL */}
          {!sidebarCollapsed && (
            <div className="sidebar-section-title text-[10px] font-bold uppercase tracking-wider text-[#E6F1EA]/55 px-3 pt-3 pb-1.5">
              Patient Portal
            </div>
          )}

          <Link
            href="/portal?tab=dashboard"
            onClick={() => {
              setMobileSidebarOpen(false);
              startProgress();
            }}
            className={`nav-link flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13.5px] font-medium no-underline transition ${
              activeTab === 'dashboard'
                ? 'bg-[#0B6B3A] text-white shadow-xs'
                : 'text-[#E6F1EA]/80 hover:bg-white/10 hover:text-white'
            }`}
            title="Patient Dashboard"
            data-tooltip="Patient Dashboard"
          >
            <i className="fa-solid fa-hospital-user w-5 text-center text-[15px]" />
            {!sidebarCollapsed && <span className="nav-text">Patient Dashboard</span>}
          </Link>

          <Link
            href="/portal?tab=applications"
            onClick={() => {
              setMobileSidebarOpen(false);
              startProgress();
            }}
            className={`nav-link flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13.5px] font-medium no-underline transition ${
              activeTab === 'applications'
                ? 'bg-[#0B6B3A] text-white shadow-xs'
                : 'text-[#E6F1EA]/80 hover:bg-white/10 hover:text-white'
            }`}
            title="My Assistance Applications"
            data-tooltip="My Assistance Applications"
          >
            <i className="fa-solid fa-clipboard-list w-5 text-center text-[15px]" />
            {!sidebarCollapsed && <span className="nav-text">My Assistance Applications</span>}
          </Link>

          <Link
            href="/portal?tab=appointments"
            onClick={() => {
              setMobileSidebarOpen(false);
              startProgress();
            }}
            className={`nav-link flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13.5px] font-medium no-underline transition ${
              activeTab === 'appointments'
                ? 'bg-[#0B6B3A] text-white shadow-xs'
                : 'text-[#E6F1EA]/80 hover:bg-white/10 hover:text-white'
            }`}
            title="Appointment History"
            data-tooltip="Appointment History"
          >
            <i className="fa-solid fa-calendar-check w-5 text-center text-[15px]" />
            {!sidebarCollapsed && <span className="nav-text">Appointment History</span>}
          </Link>

          {/* Notifications Navigation Item with Live Unread Badge */}
          <Link
            href="/portal?tab=notifications"
            onClick={() => {
              setMobileSidebarOpen(false);
              startProgress();
            }}
            className={`nav-link flex items-center justify-between px-3.5 py-2.5 rounded-lg text-[13.5px] font-medium no-underline transition ${
              activeTab === 'notifications'
                ? 'bg-[#0B6B3A] text-white shadow-xs'
                : 'text-[#E6F1EA]/80 hover:bg-white/10 hover:text-white'
            }`}
            title="Notifications"
            data-tooltip="Notifications"
          >
            <div className="flex items-center gap-3 min-w-0">
              <i className="fa-solid fa-bell w-5 text-center text-[15px]" />
              {!sidebarCollapsed && <span className="nav-text truncate">Notifications</span>}
            </div>
            {!sidebarCollapsed && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold leading-none transition ${
                  unreadNotificationsCount > 0
                    ? 'bg-[#DC2626] text-white shadow-2xs animate-pulse'
                    : 'bg-white/15 text-[#D5E2D9]'
                }`}
                title={
                  unreadNotificationsCount > 0
                    ? `${unreadNotificationsCount} Unread Notification(s)`
                    : '0 Unread Notifications'
                }
              >
                {unreadNotificationsCount}
              </span>
            )}
          </Link>

          <Link
            href="/portal?tab=profile"
            onClick={() => {
              setMobileSidebarOpen(false);
              startProgress();
            }}
            className={`nav-link flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13.5px] font-medium no-underline transition ${
              activeTab === 'profile'
                ? 'bg-[#0B6B3A] text-white shadow-xs'
                : 'text-[#E6F1EA]/80 hover:bg-white/10 hover:text-white'
            }`}
            title="My Profile"
            data-tooltip="My Profile"
          >
            <i className="fa-solid fa-user-gear w-5 text-center text-[15px]" />
            {!sidebarCollapsed && <span className="nav-text">My Profile</span>}
          </Link>

          {/* Section: ACCOUNT & PREFERENCES */}
          {!sidebarCollapsed && (
            <div className="sidebar-section-title text-[10px] font-bold uppercase tracking-wider text-[#E6F1EA]/55 px-3 pt-4 pb-1.5">
              Account &amp; Preferences
            </div>
          )}

          <Link
            href="/portal?tab=settings"
            onClick={() => {
              setMobileSidebarOpen(false);
              startProgress();
            }}
            className={`nav-link flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13.5px] font-medium no-underline transition ${
              activeTab === 'settings'
                ? 'bg-[#0B6B3A] text-white shadow-xs'
                : 'text-[#E6F1EA]/80 hover:bg-white/10 hover:text-white'
            }`}
            title="Settings & Preferences"
            data-tooltip="Settings & Preferences"
          >
            <i className="fa-solid fa-gear w-5 text-center text-[15px]" />
            {!sidebarCollapsed && <span className="nav-text">Settings &amp; Preferences</span>}
          </Link>

          {/* Section: ACCOUNT */}
          {!sidebarCollapsed && (
            <div className="sidebar-section-title text-[10px] font-bold uppercase tracking-wider text-[#E6F1EA]/55 px-3 pt-4 pb-1.5">
              Account
            </div>
          )}

          <button
            type="button"
            disabled={isLoggingOut}
            onClick={() => {
              setMobileSidebarOpen(false);
              logout('/login-patient');
            }}
            className="nav-link w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13.5px] font-medium text-[#E6F1EA]/80 hover:bg-white/10 hover:text-white no-underline transition bg-transparent border-0 cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed"
            title="Sign Out"
            data-tooltip="Sign Out"
          >
            <i className={`fa-solid ${isLoggingOut ? 'fa-spinner fa-spin' : 'fa-arrow-right-from-bracket'} w-5 text-center text-[15px]`} />
            {!sidebarCollapsed && <span className="nav-text">{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>}
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer p-4 border-t border-[#D5E2D9]/15 text-xs">
          {!sidebarCollapsed ? (
            <div>
              <div className="font-semibold text-white">OFPHIL Foundation</div>
              <div className="text-[10px] text-[#9DBFA9] opacity-75 mt-0.5 leading-snug">
                © 2026 Ophthalmological Foundation of the Philippines. All rights reserved.
              </div>
            </div>
          ) : (
            <div className="text-center font-bold text-[10px] text-[#9DBFA9]">© OFPHIL</div>
          )}
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div
        className={`app-main flex-1 flex flex-col min-h-screen transition-all duration-200 ${
          sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'
        }`}
      >
        {/* App Topbar Header (Matching Admin & MSW Topbar Format!) */}
        <header className="app-topbar h-[72px] px-6 sm:px-8 bg-white border-b border-[#D5E2D9] flex items-center justify-between sticky top-0 z-30 shadow-xs relative">
          {isProgressBarActive && (
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#E6F1EA] overflow-hidden z-50">
              <div className="h-full bg-gradient-to-r from-[#0B6B3A] via-[#10B981] to-[#047857] shadow-sm animate-clinical-progress" />
            </div>
          )}

          <div className="topbar-left flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="topbar-toggle-btn lg:hidden p-2 text-[#24352B] hover:text-[#0B6B3A] text-lg"
              aria-label="Toggle Mobile Menu"
            >
              <i className="fa-solid fa-bars" />
            </button>
            <div className="topbar-title-wrap min-w-0">
              <h1 className="page-title text-[19px] sm:text-[21px] font-bold font-['Outfit'] text-[#10241A] tracking-tight truncate m-0">
                {pageTitle}
              </h1>
              <p className="page-subtitle text-xs text-[#5A7466] truncate m-0 mt-0.5">
                {pageSubtitle}
              </p>
            </div>
          </div>

          <div className="topbar-actions flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Universal Accessibility / Quick Display & Reading Aid Button */}
            <div ref={a11yRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setA11yDropdownOpen(!a11yDropdownOpen);
                  setProfileDropdownOpen(false);
                }}
                className={`w-9 h-9 rounded-full transition flex items-center justify-center text-sm cursor-pointer border border-[#D5E2D9] ${
                  a11yDropdownOpen
                    ? 'bg-[#0B6B3A] text-white shadow-xs'
                    : 'bg-white text-[#0B6B3A] hover:bg-[#E6F1EA]'
                }`}
                title="Display & Accessibility"
                aria-label="Accessibility options"
              >
                <i className="fa-solid fa-universal-access text-base" />
              </button>

              {a11yDropdownOpen && (
                <div className="absolute right-0 top-12 w-[calc(100vw-24px)] max-w-xs sm:w-80 bg-white rounded-2xl shadow-xl border border-[#D5E2D9] p-4 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
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
                          className={`py-2 rounded-xl font-bold text-xs border transition cursor-pointer ${
                            fontSize === size
                              ? 'bg-[#0B6B3A] text-white border-[#0B6B3A] shadow-xs'
                              : 'bg-[#F8FAFC] text-[#334155] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

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
                          className={`py-2 px-1 text-center rounded-xl font-bold text-[11px] border transition cursor-pointer ${
                            themeMode === mode
                              ? 'bg-[#0B6B3A] text-white border-[#0B6B3A] shadow-xs'
                              : 'bg-[#F8FAFC] text-[#334155] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

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
                          className={`py-2 px-1 text-center rounded-xl font-bold text-[11px] border transition cursor-pointer ${
                            fontFamily === fam
                              ? 'bg-[#0B6B3A] text-white border-[#0B6B3A] shadow-xs'
                              : 'bg-[#F8FAFC] text-[#334155] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                          }`}
                        >
                          {fam}
                        </button>
                      ))}
                    </div>
                  </div>

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
                          className={`py-2 rounded-xl font-bold text-[11.5px] border transition cursor-pointer ${
                            tableDensity === density
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

            {/* Interactive User Pill Profile Dropdown */}
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileDropdownOpen(!profileDropdownOpen);
                  setA11yDropdownOpen(false);
                }}
                className={`flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 rounded-full border text-xs transition cursor-pointer ${
                  profileDropdownOpen
                    ? 'bg-[#E8F5EC] border-[#0B6B3A] shadow-xs ring-2 ring-[#0B6B3A]/20'
                    : 'bg-[#FAFBF8] hover:bg-[#E8F5EC] border-[#D5E2D9]'
                }`}
                title="Patient Profile Menu"
              >
                <div className="w-6 h-6 rounded-full bg-[#064826] text-white flex items-center justify-center font-bold text-[11px] shrink-0 leading-none">
                  {patient.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-bold text-[#10241A] leading-tight">{patient.name}</div>
                  <div className="text-[10px] text-[#5A7466] leading-tight flex items-center gap-1">
                    <i className="fa-solid fa-hospital-user text-[9px] text-[#0B6B3A]" />
                    <span>Patient Beneficiary</span>
                  </div>
                </div>
                <i
                  className={`fa-solid fa-chevron-up text-[10px] text-gray-500 ml-0.5 sm:ml-1 transition-transform ${
                    profileDropdownOpen ? '' : 'rotate-180'
                  }`}
                />
              </button>

              {/* Profile Dropdown Menu Card */}
              {profileDropdownOpen && (
                <div className="absolute right-0 top-12 w-64 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-xl border border-[#D5E2D9] p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Profile Card Header */}
                  <div className="p-2 pb-3 mb-2 border-b border-[#EEF2EF] flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#E6F1EA] text-[#0B6B3A] flex items-center justify-center font-bold text-base border border-[#BBF7D0]">
                      {patient.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-[#10241A] text-[13px] truncate">
                        {patient.name}
                      </div>
                      <div className="text-[11px] text-[#64748B] truncate">
                        {patient.email}
                      </div>
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#E6F1EA] text-[#0B6B3A]">
                          Patient Beneficiary &bull; Active
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Menu Links */}
                  <div className="space-y-1">
                    <Link
                      href="/portal?tab=profile"
                      onClick={() => {
                        startProgress();
                        setProfileDropdownOpen(false);
                      }}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#1E293B] hover:bg-[#F8FAFC] transition no-underline"
                    >
                      <i className="fa-solid fa-address-card text-[#0B6B3A] text-sm w-4 text-center" />
                      <span>My Profile</span>
                    </Link>

                    <Link
                      href="/portal?tab=settings"
                      onClick={() => {
                        startProgress();
                        setProfileDropdownOpen(false);
                      }}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#1E293B] hover:bg-[#F8FAFC] transition no-underline"
                    >
                      <i className="fa-solid fa-sliders text-[#0B6B3A] text-sm w-4 text-center" />
                      <span>Account Settings</span>
                    </Link>

                    <Link
                      href="/portal?tab=notifications"
                      onClick={() => {
                        startProgress();
                        setProfileDropdownOpen(false);
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-[#1E293B] hover:bg-[#F8FAFC] transition no-underline"
                    >
                      <div className="flex items-center gap-3">
                        <i className="fa-solid fa-bell text-[#0B6B3A] text-sm w-4 text-center" />
                        <span>Notifications</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold transition ${
                          unreadNotificationsCount > 0
                            ? 'bg-[#DC2626] text-white animate-pulse'
                            : 'bg-[#E2E8F0] text-[#475569]'
                        }`}
                      >
                        {unreadNotificationsCount}
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
                        logout('/login-patient');
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

        {/* Dynamic Page Content */}
        <main className="content-container p-3.5 sm:p-6 lg:p-8 flex-1 w-full max-w-[1440px] mx-auto box-border">
          {children}
        </main>
      </div>
    </div>
  );
}
