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

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { role, user, logout } = useAuth();
  const { showLoading } = useLoadingScreen();
  const [collapsed, setCollapsed] = useState(false);
  const [patientRecordsOpen, setPatientRecordsOpen] = useState(true);

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
        className={`fixed top-0 bottom-0 left-0 z-50 bg-[#064826] text-[#D5E2D9] flex flex-col transition-all duration-300 ease-in-out md:translate-x-0 ${
          collapsed ? 'w-[72px]' : 'w-[250px]'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{
          boxShadow: '4px 0 24px rgba(6, 72, 38, 0.15)',
        }}
      >
        {/* Circular Collapse Toggle Button (Desktop) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center absolute -right-3.5 top-6 w-7 h-7 rounded-full bg-white text-[#064826] border border-[#D5E2D9] shadow-md hover:bg-[#E6F1EA] transition z-50 cursor-pointer"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label="Toggle Sidebar Extension"
        >
          <i
            className={`fa-solid fa-chevron-right text-[11px] transition-transform duration-300 ${
              collapsed ? '' : 'rotate-180'
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
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  pathname === '/portal'
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
                href="/assessment"
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  pathname.startsWith('/assessment')
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    pathname.startsWith('/admin/patient-records')
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
                      className={`fa-solid fa-chevron-down text-[10px] transition-transform p-1 hover:text-white ${
                        patientRecordsOpen ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </Link>

                {patientRecordsOpen && !collapsed && (
                  <div className="pl-6 pr-1 py-1 space-y-0.5 border-l border-white/15 ml-4 mt-1">
                    <Link
                      href="/admin/patient-records"
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${
                        pathname === '/admin/patient-records'
                          ? 'text-white font-semibold bg-white/15'
                          : 'text-[#B4CEBE] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <i className="fa-solid fa-users text-[10px] w-3 text-center" />
                      <span>All Patients</span>
                    </Link>
                    <Link
                      href="/admin/patient-records?tab=charity"
                      className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-[#B4CEBE] hover:text-white hover:bg-white/5 transition"
                    >
                      <i className="fa-solid fa-hand-holding-heart text-[10px] w-3 text-center" />
                      <span>Charity Patients</span>
                    </Link>
                    <Link
                      href="/admin/patient-records?tab=non-charity"
                      className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-[#B4CEBE] hover:text-white hover:bg-white/5 transition"
                    >
                      <i className="fa-solid fa-user-shield text-[10px] w-3 text-center" />
                      <span>Non-Charity Patients</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Patient Inquiries */}
              <Link
                href="/admin/inquiries"
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  pathname.startsWith('/admin/inquiries')
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
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  pathname === '/admin/settings'
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
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  pathname === '/admin/role-management'
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
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  pathname === '/admin/profile'
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
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  pathname === '/dashboard'
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
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  pathname.startsWith('/assessment')
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    pathname.startsWith('/patients')
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
                      className={`fa-solid fa-chevron-down text-[10px] transition-transform ${
                        patientRecordsOpen ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </button>

                {patientRecordsOpen && !collapsed && (
                  <div className="pl-6 pr-1 py-1 space-y-0.5 border-l border-white/15 ml-4 mt-1">
                    <Link
                      href="/patients"
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${
                        pathname === '/patients'
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
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  pathname.startsWith('/documents')
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
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  pathname === '/profile'
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

  const defaultTitle = isPatient
    ? 'Patient Dashboard'
    : isAdmin
    ? 'Patient Records Directory'
    : 'Clinical Casework & Eligibility Dashboard';

  const defaultSubtitle =
    'Ophthalmological Foundation of the Philippines — AI-Assisted Patient Intake & Evaluation';

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
        {/* Universal Accessibility quick button */}
        <button
          type="button"
          className="w-9 h-9 rounded-full bg-[#E6F1EA] text-[#0B6B3A] hover:bg-[#D5E2D9] transition flex items-center justify-center text-sm"
          title="Display & Accessibility"
          aria-label="Accessibility options"
        >
          <i className="fa-solid fa-universal-access" />
        </button>

        {/* Notification Bell */}
        <button
          type="button"
          className="w-9 h-9 rounded-full bg-[#FAFBF8] hover:bg-[#E6F1EA] text-[#5A7466] hover:text-[#0B6B3A] flex items-center justify-center border border-[#D5E2D9] transition relative"
          title="Notifications"
          aria-label="Notifications"
        >
          <i className="fa-regular fa-bell text-sm" />
          <span className="w-2 h-2 rounded-full bg-[#0B6B3A] absolute top-2 right-2 border-2 border-white" />
        </button>

        {/* Admin pill dropdown indicator matching screenshot */}
        {isAdmin ? (
          <Link
            href="/admin/profile"
            className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#FAFBF8] hover:bg-[#E8F5EC] border border-[#D5E2D9] text-xs transition cursor-pointer"
            title="View Administrator Profile"
          >
            <div className="w-6 h-6 rounded-full bg-[#064826] text-white flex items-center justify-center font-bold text-[11px]">
              C
            </div>
            <div className="text-left">
              <div className="font-bold text-[#10241A] leading-tight">Clinic Administrator</div>
              <div className="text-[10px] text-[#5A7466] leading-tight">Administrator</div>
            </div>
            <i className="fa-solid fa-chevron-down text-[10px] text-gray-400 ml-1" />
          </Link>
        ) : isPatient ? (
          <Link
            href="/portal?tab=profile"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E6F1EA] hover:bg-[#D5E2D9] text-[#0B6B3A] text-xs font-semibold border border-[#D5E2D9] transition cursor-pointer"
            title="View Beneficiary Profile"
          >
            <i className="fa-solid fa-hospital-user text-[11px]" />
            <span>Patient Beneficiary</span>
          </Link>
        ) : (
          <Link
            href="/profile"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E6F1EA] hover:bg-[#D5E2D9] text-[#0B6B3A] text-xs font-semibold border border-[#D5E2D9] transition cursor-pointer"
            title="View Caseworker Profile"
          >
            <i className="fa-solid fa-user-doctor text-[11px]" />
            <span>Medical Social Work (MSW)</span>
          </Link>
        )}

        {/* Logout */}
        <Link
          href={isCaseworker ? '/login-msw' : '/login-admin'}
          onClick={() => {
            showLoading('Signing out of session...');
            logout();
          }}
          className="px-3.5 py-1.5 rounded-lg border border-[#D5E2D9] text-xs font-semibold text-[#10241A] hover:bg-[#FAFBF8] transition flex items-center gap-1.5 shadow-2xs"
        >
          <i className="fa-solid fa-arrow-right-from-bracket text-xs text-[#5A7466]" />
          <span className="hidden sm:inline">Logout</span>
        </Link>
      </div>
    </header>
  );
}
