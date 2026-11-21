'use strict';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Database,
  FileText,
  ScanText,
  Cpu,
  Binary,
  Award,
  Stamp,
  ShieldAlert,
  GitBranch,
  Search,
  Settings,
  ChevronRight,
  Menu,
  X,
  Eye,
  Sliders,
  CheckCircle2,
  FileCode2,
  Activity
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard & Metrics', href: '/', icon: BarChart3 },
    { label: '1. Synthetic Datasets', href: '/datasets', icon: Database },
    { label: '2. Document Generator', href: '/document-generation', icon: FileText },
    { label: '3. PaddleOCR Engine', href: '/ocr', icon: ScanText },
    { label: '4. Transformer OCR (TrOCR)', href: '/transformers', icon: Cpu },
    { label: '5. Semantic Embeddings', href: '/embeddings', icon: Binary },
    { label: '6. Semantic Assessment', href: '/semantic-scoring', icon: Award },
    { label: '7. Stamp & Signature YOLO', href: '/detection', icon: Stamp },
    { label: '8. Manipulation Screening', href: '/document-analysis', icon: ShieldAlert },
    { label: '9. CatBoost Classifier', href: '/classification', icon: GitBranch },
    { label: '10. SHAP Explainability', href: '/explainability', icon: Search },
    { label: '11. Experiment Benchmarks', href: '/experiments', icon: Activity },
    { label: '12. System & Environment', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-[#D5E2D9] flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[#D5E2D9]">
          <Link href="/" className="flex items-center gap-3 text-decoration-none">
            <img
              src="/icons/ophil-logo.png"
              alt="OFPHIL Eye Logo"
              className="h-9 w-auto object-contain"
            />
            <div>
              <div className="font-heading font-bold text-[#10241A] text-base tracking-wide flex items-center gap-1.5">
                OFPHIL <span className="text-[10px] bg-[#E6F1EA] text-[#0B6B3A] px-1.5 py-0.5 rounded font-mono font-semibold">V2</span>
              </div>
              <div className="text-[11px] text-[#5A7466] font-medium leading-tight">
                Experimental AI Suite
              </div>
            </div>
          </Link>

          <button
            onClick={onToggle}
            className="md:hidden p-1.5 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#5A7466]">
            Research & Experiments
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#E6F1EA] text-[#0B6B3A] font-semibold border-l-4 border-[#0B6B3A]'
                    : 'text-[#2E4538] hover:bg-[#FAFBF8] hover:text-[#0B6B3A]'
                }`}
              >
                <Icon size={17} className={isActive ? 'text-[#0B6B3A]' : 'text-[#5A7466]'} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#D5E2D9] bg-[#FAFBF8]">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <div className="text-xs font-semibold text-[#10241A]">Local Compute Mode</div>
          </div>
          <div className="text-[10px] text-[#5A7466] mt-0.5">FastAPI Python Backend Linked</div>
        </div>
      </aside>
    </>
  );
}

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-[#D5E2D9] px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
          aria-label="Toggle Navigation"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-lg font-heading font-semibold text-[#10241A] leading-tight">
            OFPHIL AI Research Experimental Platform
          </h1>
          <p className="text-xs text-[#5A7466]">
            Decision Support System — Synthetic Multimodal AI Architecture
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F1EA] text-[#0B6B3A] text-xs font-medium border border-[#D5E2D9]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0B6B3A]"></span>
          Vercel Frontend Ready
        </span>

        <Link
          href="/login"
          className="px-3.5 py-1.5 rounded-lg border border-[#D5E2D9] text-xs font-semibold text-[#10241A] hover:bg-[#FAFBF8] transition"
        >
          Auth Demo
        </Link>
      </div>
    </header>
  );
}
