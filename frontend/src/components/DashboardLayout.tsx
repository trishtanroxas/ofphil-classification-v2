'use client';
import React, { useState } from 'react';
import { Sidebar, Header } from './AppShell';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function DashboardLayout({
  children,
  title = 'Clinical Casework & Eligibility Dashboard',
  subtitle = 'Ophthalmological Foundation of the Philippines — AI-Assisted Patient Intake & Evaluation',
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAFBF8] flex">
      {/* Deep Green App Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content Area */}
      <div className="flex-1 md:ml-[250px] flex flex-col min-w-0 min-h-screen transition-all duration-300">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
          subtitle={subtitle}
        />
        <main className="flex-1 p-5 sm:p-7 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
