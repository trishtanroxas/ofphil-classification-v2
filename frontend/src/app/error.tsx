'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected runtime error to console (or audit monitor)
    console.error('Unhandled Application Exception caught by error.tsx boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFBF8] px-4 py-12 text-center selection:bg-[#E8F5EC] selection:text-[#0B6B3A]">
      {/* Container Card */}
      <div className="max-w-lg w-full bg-white rounded-3xl border border-[#D5E2D9] shadow-xl p-8 sm:p-10 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
        {/* Emblem / Warning Icon */}
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-6 shadow-xs">
          <i className="fa-solid fa-triangle-exclamation text-2xl" />
        </div>

        {/* Brand Tagline */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F5EC] border border-[#C8E6D3] text-[#0B6B3A] text-xs font-semibold tracking-wide uppercase mb-3">
          <i className="fa-solid fa-shield-heart text-[11px]" />
          <span>OFPHIL Clinical Decision Support</span>
        </div>

        {/* Heading */}
        <h1 className="font-['Outfit'] text-2xl sm:text-3xl font-extrabold text-[#10241A] tracking-tight mb-2">
          Something Went Wrong
        </h1>

        <p className="text-sm text-[#5A7466] leading-relaxed mb-6 max-w-sm">
          An unexpected system issue occurred while processing this request. Patient data remains secure and protected.
        </p>

        {/* Technical Digest / Reference for Caseworkers & Admins */}
        {error.digest && (
          <div className="w-full bg-[#FAFBF8] border border-[#EEF2EF] rounded-xl px-3.5 py-2.5 mb-6 text-left flex items-center justify-between text-xs font-mono text-[#64748B]">
            <span className="text-[11px] font-sans font-medium text-[#475569]">Incident Digest:</span>
            <span className="font-semibold text-[#10241A]">{error.digest}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white text-xs font-bold border-none cursor-pointer flex items-center justify-center gap-2 transition shadow-md hover:shadow-lg active:scale-98"
          >
            <i className="fa-solid fa-rotate-right text-xs" />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white hover:bg-slate-50 border border-[#D5E2D9] text-[#1E293B] text-xs font-bold no-underline flex items-center justify-center gap-2 transition shadow-xs active:scale-98"
          >
            <i className="fa-solid fa-house text-xs text-[#5A7466]" />
            <span>Return to Home</span>
          </Link>
        </div>

        {/* Footer Support Info */}
        <div className="mt-8 pt-6 border-t border-[#EEF2EF] w-full text-[11px] text-[#94A3B8] flex items-center justify-center gap-1.5">
          <i className="fa-solid fa-headset text-[#0B6B3A]" />
          <span>Need assistance? Contact Clinic IT Support at</span>
          <a
            href="mailto:contact@ofphil.org.ph"
            className="text-[#0B6B3A] font-semibold hover:underline no-underline"
          >
            contact@ofphil.org.ph
          </a>
        </div>
      </div>
    </div>
  );
}
