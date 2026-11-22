'use client';
import React, { useState, useEffect } from 'react';
import { Sidebar, Header } from './AppShell';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function DashboardLayout({
  children,
  title = 'Clinical Casework & Eligibility Dashboard',
  subtitle = 'Ophthalmological Foundation of the Philippines — Patient Master Registry & Clinical Directory',
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (title) {
      const cleanTitle = title.split('·')[0].trim();
      document.title = `${cleanTitle} · OFPHIL`;
    }
  }, [title]);

  return (
    <div className="min-h-screen bg-[#FAFBF8] flex">
      {/* Deep Green App Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isCollapsed={sidebarCollapsed}
        onCollapseToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area: dynamically expands when sidebar is collapsed */}
      <div
        className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[250px]'
        }`}
      >
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
          subtitle={subtitle}
        />
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 w-full max-w-[1440px] mx-auto box-border">
          {children}
        </main>
      </div>
    </div>
  );
}
