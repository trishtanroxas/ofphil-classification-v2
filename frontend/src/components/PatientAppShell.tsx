'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLoadingScreen } from '@/context/LoadingScreenContext';

interface PatientAppShellProps {
  children: React.ReactNode;
  activeTab?: 'dashboard' | 'applications' | 'profile' | 'settings';
  pageTitle?: string;
  pageSubtitle?: string;
}

export default function PatientAppShell({
  children,
  activeTab = 'dashboard',
  pageTitle = 'Patient Dashboard',
  pageSubtitle = 'Ophthalmological Foundation of the Philippines — AI-Assisted Patient Intake & Evaluation',
}: PatientAppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { showLoading } = useLoadingScreen();

  // Beneficiary mock identity matching reference
  const patient = {
    name: 'Tarcila Magpantay',
    username: 'MSW_FA_0125-01',
    patient_id: 'PAT-PORTAL-99033A68',
    sex: 'F',
    residence: 'Block 4 Lot 12',
    contact: '0918 123 4567',
    email: 'tarcila.m@gmail.com',
  };

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
            href="/portal?tab=profile"
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

          <Link
            href="/login-patient"
            onClick={() => showLoading('Signing out of beneficiary session...')}
            className="nav-link flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13.5px] font-medium text-[#E6F1EA]/80 hover:bg-white/10 hover:text-white no-underline transition"
            title="Sign Out"
            data-tooltip="Sign Out"
          >
            <i className="fa-solid fa-arrow-right-from-bracket w-5 text-center text-[15px]" />
            {!sidebarCollapsed && <span className="nav-text">Sign Out</span>}
          </Link>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer p-4 border-t border-[#D5E2D9]/15 text-xs">
          {!sidebarCollapsed ? (
            <div>
              <div className="font-semibold text-white">OFPHIL Foundation</div>
              <div className="text-[10px] text-[#9DBFA9] opacity-75 mt-0.5">
                Clinical Decision Support v2.5
              </div>
            </div>
          ) : (
            <div className="text-center font-bold text-xs text-[#9DBFA9]">v2.5</div>
          )}
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div
        className={`app-main flex-1 flex flex-col min-h-screen transition-all duration-200 ${
          sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'
        }`}
      >
        {/* App Topbar Header */}
        <header className="app-topbar h-[72px] px-6 sm:px-8 bg-white border-b border-[#D5E2D9] flex items-center justify-between sticky top-0 z-30 shadow-xs">
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

          <div className="topbar-actions flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
            {/* Accessibility Quick Icon */}
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-[#F4F7F4] hover:bg-[#E6F1EA] text-[#0B6B3A] flex items-center justify-center border border-[#D5E2D9] transition"
              title="Quick Display & Accessibility"
              aria-label="Display & Accessibility Preferences"
            >
              <i className="fa-solid fa-universal-access text-sm" />
            </button>

            {/* Notification Bell */}
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-[#F4F7F4] hover:bg-[#E6F1EA] text-[#5A7466] hover:text-[#0B6B3A] flex items-center justify-center border border-[#D5E2D9] transition relative"
              title="Notifications"
              aria-label="Urgent Notifications"
            >
              <i className="fa-regular fa-bell text-sm" />
              <span className="w-2 h-2 rounded-full bg-[#0B6B3A] absolute top-2 right-2 border-2 border-white" />
            </button>

            {/* Patient Portal Badge */}
            <div className="portal-badge hidden md:flex items-center gap-2 text-xs text-[#24352B] bg-[#F4F7F4] px-3.5 py-1.5 rounded-full font-semibold border border-[#D5E2D9]">
              <i className="fa-solid fa-hospital-user text-[#2563EB]" />
              <span>
                Patient Portal (Beneficiary):{' '}
                <span className="font-bold text-[#10241A]">{patient.name}</span>
              </span>
            </div>

            {/* Logout Button */}
            <Link
              href="/login-patient"
              onClick={() => showLoading('Signing out of beneficiary session...')}
              className="px-3.5 py-1.5 rounded-lg border border-[#D5E2D9] hover:bg-slate-50 text-xs font-semibold text-[#24352B] flex items-center gap-1.5 transition no-underline shadow-xs"
            >
              <i className="fa-solid fa-arrow-right-from-bracket text-[11px]" />
              <span>Logout</span>
            </Link>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="content-container p-6 sm:p-8 flex-1 w-full box-border">
          {children}
        </main>
      </div>
    </div>
  );
}
