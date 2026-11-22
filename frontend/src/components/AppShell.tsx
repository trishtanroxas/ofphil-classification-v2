'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, UserRole } from '@/context/AuthContext';
import { useLoadingScreen } from '@/context/LoadingScreenContext';

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
  const { role, user, logout } = useAuth();
  const { showLoading } = useLoadingScreen();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [patientRecordsOpen, setPatientRecordsOpen] = useState(true);

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
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-[#D5E2D9] hover:bg-white/10 hover:text-white transition-all"
                title="My Assistance Applications"
              >
                <i className="fa-solid fa-clipboard-list text-sm shrink-0 w-4 text-center" />
                {!collapsed && <span className="truncate">My Applications</span>}
              </Link>

              <Link
                href="/portal?tab=profile"
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
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${pathname === '/admin/patient-records'
                        ? 'text-white font-semibold bg-white/15'
                        : 'text-[#B4CEBE] hover:text-white hover:bg-white/5'
                        }`}
                    >
                      <i className="fa-solid fa-users text-[10px] w-3 text-center" />
                      <span>All Patients</span>
                    </Link>
                    <Link
                      href="/admin/patient-records?tab=charity"
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${pathname === '/admin/patient-records/charity' || pathname === '/admin/patient-records?tab=charity'
                        ? 'text-white font-semibold bg-white/15'
                        : 'text-[#B4CEBE] hover:text-white hover:bg-white/5'
                        }`}
                    >
                      <i className="fa-solid fa-hand-holding-heart text-[10px] w-3 text-center text-[#86EFAC]" />
                      <span>Charity Patients</span>
                    </Link>
                    <Link
                      href="/admin/patient-records?tab=regular"
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${pathname === '/admin/patient-records/regular' || pathname === '/admin/patient-records?tab=regular'
                        ? 'text-white font-semibold bg-white/15'
                        : 'text-[#B4CEBE] hover:text-white hover:bg-white/5'
                        }`}
                    >
                      <i className="fa-solid fa-user-shield text-[10px] w-3 text-center" />
                      <span>Regular Patients</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Patient Inquiries */}
              <Link
                href="/admin/inquiries"
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${pathname.startsWith('/admin/inquiries')
                  ? 'bg-[#0B6B3A] text-white font-semibold shadow-xs'
                  : 'text-[#D5E2D9] hover:bg-white/10 hover:text-white'
                  }`}
                title="Patient Inquiries"
              >
                <i className="fa-solid fa-envelope-open-text text-sm shrink-0 w-4 text-center" />
                {!collapsed && <span className="truncate">Patient Inquiries</span>}
              </Link>

              {/* SECTION: SYSTEM & GOVERNANCE */}
              {!collapsed && (
                <div className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#7EA98F]">
                  SYSTEM &amp; GOVERNANCE
                </div>
              )}
              <Link
                href="/admin/settings"
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
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${pathname === '/dashboard'
                  ? 'bg-[#0B6B3A] text-white font-semibold shadow-xs'
                  : 'text-[#D5E2D9] hover:bg-white/10 hover:text-white'
                  }`}
                title="Dashboard"
              >
                <i className="fa-solid fa-chart-pie text-sm shrink-0 w-4 text-center" />
                {!collapsed && <span className="truncate">Dashboard</span>}
              </Link>

              {/* New Applicant / Assessment */}
              <Link
                href="/assessment"
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${pathname.startsWith('/assessment')
                  ? 'bg-[#0B6B3A] text-white font-semibold shadow-xs'
                  : 'text-[#D5E2D9] hover:bg-white/10 hover:text-white'
                  }`}
                title="New Applicant Intake"
              >
                <i className="fa-solid fa-user-plus text-sm shrink-0 w-4 text-center" />
                {!collapsed && <span className="truncate">New Applicant</span>}
              </Link>

              {/* Patient Records Directory (Group with sublinks) */}
              <div className="space-y-0.5">
                <button
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
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${pathname === '/patients'
                        ? 'text-white font-semibold bg-white/15'
                        : 'text-[#B4CEBE] hover:text-white hover:bg-white/5'
                        }`}
                    >
                      <i className="fa-solid fa-users text-[10px] w-3 text-center" />
                      <span>All Patients</span>
                    </Link>
                    <Link
                      href="/patients?tab=pending"
                      className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-[#B4CEBE] hover:text-white hover:bg-white/5 transition"
                    >
                      <i className="fa-solid fa-user-clock text-[10px] w-3 text-center text-[#86EFAC]" />
                      <span>Pending Approvals</span>
                    </Link>
                    <Link
                      href="/patients?tab=charity"
                      className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-[#B4CEBE] hover:text-white hover:bg-white/5 transition"
                    >
                      <i className="fa-solid fa-hand-holding-heart text-[10px] w-3 text-center" />
                      <span>Charity Patients</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Evidential Documents */}
              <Link
                href="/documents"
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${pathname.startsWith('/documents')
                  ? 'bg-[#0B6B3A] text-white font-semibold shadow-xs'
                  : 'text-[#D5E2D9] hover:bg-white/10 hover:text-white'
                  }`}
                title="Quotation Audit & Documents"
              >
                <i className="fa-solid fa-file-invoice text-sm shrink-0 w-4 text-center" />
                {!collapsed && <span className="truncate">Document Audit</span>}
              </Link>

              {/* SECTION: ACCOUNT (Caseworker) */}
              {!collapsed && (
                <div className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#7EA98F]">
                  Account
                </div>
              )}
              <Link
                href="/profile"
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
          <Link
            href={isCaseworker ? '/login-msw' : '/login-admin'}
            onClick={() => {
              showLoading('Signing out of session...');
              logout();
            }}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-[#D5E2D9] hover:bg-white/10 hover:text-white transition-all"
            title="Sign Out"
          >
            <i className="fa-solid fa-arrow-right-from-bracket text-sm shrink-0 w-4 text-center" />
            {!collapsed && <span className="truncate">Sign Out</span>}
          </Link>
        </div>

        {/* Footer */}
        {!collapsed && (
          <div className="p-4 border-t border-white/10 bg-[#04331B]/50 shrink-0">
            <div className="text-[11px] font-semibold text-white">OFPHIL Foundation</div>
            <div className="text-[9.5px] text-[#A3C7B3] mt-0.5">Clinical Decision Support v2.5</div>
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
  const { role, user, logout } = useAuth();
  const { showLoading } = useLoadingScreen();

  const isPatient = role === 'patient';
  const isAdmin = role === 'admin' || role === 'nurse';
  const isCaseworker = role === 'msw';

  // Dropdown states
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [a11yDropdownOpen, setA11yDropdownOpen] = useState(false);

  // Quick Display & Reading Aid states
  const [fontSize, setFontSize] = useState<'100%' | '110%' | '120%' | '130%'>('100%');
  const [themeMode, setThemeMode] = useState<'Light' | 'Dark' | 'High Contrast'>('Light');
  const [fontFamily, setFontFamily] = useState<'Clinical' | 'Serif' | 'Low-Vision'>('Clinical');
  const [tableDensity, setTableDensity] = useState<'Comfortable' | 'Compact'>('Comfortable');

  const defaultTitle = isPatient
    ? 'Patient Dashboard'
    : isAdmin
      ? 'Patient Records Directory'
      : 'Clinical Casework & Eligibility Dashboard';

  const defaultSubtitle =
    'Ophthalmological Foundation of the Philippines — AI-Assisted Patient Intake & Evaluation';

  // Apply display scaling effect
  const handleFontSizeChange = (size: '100%' | '110%' | '120%' | '130%') => {
    setFontSize(size);
    if (typeof document !== 'undefined') {
      document.documentElement.style.fontSize =
        size === '100%' ? '16px' : size === '110%' ? '17.6px' : size === '120%' ? '19.2px' : '20.8px';
    }
  };

  const handleResetDisplay = () => {
    handleFontSizeChange('100%');
    setThemeMode('Light');
    setFontFamily('Clinical');
    setTableDensity('Comfortable');
  };

  return (
    <header className="sticky top-0 z-30 h-[72px] bg-white border-b border-[#D5E2D9] px-6 flex items-center justify-between shadow-xs">
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
        {/* Universal Accessibility / Quick Display & Reading Aid Quick Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setA11yDropdownOpen(!a11yDropdownOpen);
              setProfileDropdownOpen(false);
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
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-[#D5E2D9] p-4 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
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
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileDropdownOpen(!profileDropdownOpen);
              setA11yDropdownOpen(false);
            }}
            className={`hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full border text-xs transition cursor-pointer ${profileDropdownOpen
              ? 'bg-[#E8F5EC] border-[#0B6B3A] shadow-xs ring-2 ring-[#0B6B3A]/20'
              : 'bg-[#FAFBF8] hover:bg-[#E8F5EC] border-[#D5E2D9]'
              }`}
            title="User Profile Menu"
          >
            <div className="w-6 h-6 rounded-full bg-[#064826] text-white flex items-center justify-center font-bold text-[11px] shrink-0 leading-none">
              <span className="flex items-center justify-center w-full h-full text-center">
                {isAdmin ? 'C' : isPatient ? 'P' : 'M'}
              </span>
            </div>
            <div className="text-left">
              <div className="font-bold text-[#10241A] leading-tight">
                {isAdmin ? 'Clinic Administrator' : isPatient ? 'Patient Beneficiary' : 'Maria Santos, RSW'}
              </div>
              <div className="text-[10px] text-[#5A7466] leading-tight flex items-center gap-1">
                <i className="fa-solid fa-user-shield text-[9px] text-[#0B6B3A]" />
                <span>{isAdmin ? 'Administrator' : isPatient ? 'Patient' : 'MSW Caseworker'}</span>
              </div>
            </div>
            <i
              className={`fa-solid fa-chevron-up text-[10px] text-gray-500 ml-1 transition-transform ${profileDropdownOpen ? '' : 'rotate-180'
                }`}
            />
          </button>

          {/* Profile Dropdown Menu Card (Matching User Screenshot) */}
          {profileDropdownOpen && (
            <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-xl border border-[#D5E2D9] p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Profile Card Header */}
              <div className="p-2 pb-3 mb-2 border-b border-[#EEF2EF] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E6F1EA] text-[#0B6B3A] flex items-center justify-center font-bold text-base border border-[#BBF7D0]">
                  {isAdmin ? 'C' : isPatient ? 'P' : 'M'}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-[#10241A] text-[13px] truncate">
                    {isAdmin ? 'Clinic Administrator' : isPatient ? 'Patient Beneficiary' : 'Maria Santos, RSW'}
                  </div>
                  <div className="text-[11px] text-[#64748B] truncate">
                    {isAdmin ? 'admin@ofphil.org' : isPatient ? 'patient@ofphil.org' : 'msw@ofphil.org'}
                  </div>
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#E6F1EA] text-[#0B6B3A]">
                      Admin &bull; Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu Links */}
              <div className="space-y-1">
                <Link
                  href={isAdmin ? '/admin/profile' : isPatient ? '/portal?tab=profile' : '/profile'}
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#1E293B] hover:bg-[#F8FAFC] transition no-underline"
                >
                  <i className="fa-solid fa-address-card text-[#0B6B3A] text-sm w-4 text-center" />
                  <span>My Profile</span>
                </Link>

                <Link
                  href={isAdmin ? '/admin/settings' : isCaseworker ? '/settings' : '/portal?tab=settings'}
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#1E293B] hover:bg-[#F8FAFC] transition no-underline"
                >
                  <i className="fa-solid fa-sliders text-[#0B6B3A] text-sm w-4 text-center" />
                  <span>Account Settings</span>
                </Link>

                <Link
                  href="/admin/inquiries"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-[#1E293B] hover:bg-[#F8FAFC] transition no-underline"
                >
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-bell text-[#0B6B3A] text-sm w-4 text-center" />
                    <span>Notifications</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DC2626] text-white">
                    3
                  </span>
                </Link>
              </div>

              {/* Sign Out Action */}
              <div className="mt-2 pt-2 border-t border-[#EEF2EF]">
                <button
                  type="button"
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    showLoading('Signing out of session...');
                    logout();
                    setTimeout(() => {
                      window.location.href = isCaseworker ? '/login-msw' : '/login-admin';
                    }, 250);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-[#DC2626] hover:bg-[#FEF2F2] transition bg-transparent border-0 cursor-pointer text-left"
                >
                  <i className="fa-solid fa-arrow-right-from-bracket text-[#DC2626] text-sm w-4 text-center" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
