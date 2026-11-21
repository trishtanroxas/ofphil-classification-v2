'use client';
import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { fetchApi } from '@/lib/api';
import { Settings, CheckCircle2, Shield, Server } from 'lucide-react';

export default function SettingsPage() {
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    fetchApi('/health')
      .then(setHealth)
      .catch(() => setHealth({ status: 'offline' }));
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-heading font-bold text-[#10241A]">
            12. System Settings &amp; Environment Architecture
          </h1>
          <p className="text-xs text-[#5A7466]">
            Validate frontend/backend integration status, decoupled Vercel deployment variables, and compute engine boundaries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Frontend Config */}
          <div className="bg-white p-6 rounded-xl border border-[#D5E2D9] shadow-sm space-y-4">
            <h2 className="text-sm font-heading font-semibold text-[#10241A] flex items-center gap-2">
              <Shield size={16} className="text-[#0B6B3A]" /> Vercel Frontend Configuration
            </h2>
            <div className="space-y-2">
              <div className="p-2.5 rounded bg-[#FAFBF8] border border-[#D5E2D9] flex justify-between">
                <span className="text-[#5A7466]">Framework</span>
                <span className="font-semibold text-[#10241A]">Next.js (App Router, React 19)</span>
              </div>
              <div className="p-2.5 rounded bg-[#FAFBF8] border border-[#D5E2D9] flex justify-between">
                <span className="text-[#5A7466]">Public API Base URL</span>
                <span className="font-mono text-[#0B6B3A]">NEXT_PUBLIC_API_BASE_URL</span>
              </div>
              <div className="p-2.5 rounded bg-[#FAFBF8] border border-[#D5E2D9] flex justify-between">
                <span className="text-[#5A7466]">Design System</span>
                <span className="font-semibold text-[#10241A]">OFPHIL Primary Palette (Strict #0B6B3A)</span>
              </div>
              <div className="p-2.5 rounded bg-[#FAFBF8] border border-[#D5E2D9] flex justify-between">
                <span className="text-[#5A7466]">Hosting Target</span>
                <span className="font-semibold text-[#10241A]">Vercel Edge &amp; Static CDN</span>
              </div>
            </div>
          </div>

          {/* Backend Config */}
          <div className="bg-white p-6 rounded-xl border border-[#D5E2D9] shadow-sm space-y-4">
            <h2 className="text-sm font-heading font-semibold text-[#10241A] flex items-center gap-2">
              <Server size={16} className="text-[#0B6B3A]" /> FastAPI Compute Backend
            </h2>
            <div className="space-y-2">
              <div className="p-2.5 rounded bg-[#FAFBF8] border border-[#D5E2D9] flex justify-between">
                <span className="text-[#5A7466]">Service Status</span>
                <span className="font-semibold capitalize text-emerald-700">
                  {health ? health.status : 'Checking...'}
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#FAFBF8] border border-[#D5E2D9] flex justify-between">
                <span className="text-[#5A7466]">API Version</span>
                <span className="font-mono text-[#10241A]">{health?.version || '2.0.0'}</span>
              </div>
              <div className="p-2.5 rounded bg-[#FAFBF8] border border-[#D5E2D9] flex justify-between">
                <span className="text-[#5A7466]">Interactive Docs</span>
                <a
                  href="http://localhost:8000/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0B6B3A] underline font-mono"
                >
                  /docs (Swagger UI)
                </a>
              </div>
              <div className="p-2.5 rounded bg-[#FAFBF8] border border-[#D5E2D9] flex justify-between">
                <span className="text-[#5A7466]">Heavy Inference Isolation</span>
                <span className="font-semibold text-[#10241A]">Active (No training on Vercel)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
