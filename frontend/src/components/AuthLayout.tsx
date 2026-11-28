'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const quotes = [
  {
    category: "Ophthalmic Social Services",
    title: "No one should lose their sight because they can't afford surgery.",
    subtitle: "OFPHIL helps medical social workers evaluate medical assistance (subsidy of the clinic procedure quotation) for indigent cataract, retina, and glaucoma patients with fair, consistent guidelines."
  },
  {
    category: "Clinical Decision Support",
    title: "Empowering social workers with fast, objective evaluation.",
    subtitle: "Faster document checking and structured socio-economic assessment help speed up procedure quotation subsidy approvals within 24 to 48 hours."
  },
  {
    category: "Charity Care & Dignity",
    title: "Restoring vision, uplifting Filipino families.",
    subtitle: "Over thousands of subsidized eye surgeries performed by board-certified volunteer surgeons and dedicated caseworkers."
  },
  {
    category: "Hospital Transparency",
    title: "Accurate quotation audit with zero hidden discrepancies.",
    subtitle: "Cross-referencing PhilHealth first-tier coverage with clinic surgical quotations ensures transparent medical assistance through direct subsidy of the procedure quotation."
  }
];

export default function AuthLayout({ children }: AuthLayoutProps) {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  // Lock browser history when logged out so pressing Back button never returns to a protected dashboard
  useEffect(() => {
    try {
      const isLoggedOut =
        sessionStorage.getItem('ofphil_logged_out') === 'true' ||
        !localStorage.getItem('ofphil_current_role');

      if (isLoggedOut && window.location.pathname.startsWith('/login')) {
        window.history.pushState(null, '', window.location.href);
        const handlePopState = () => {
          window.history.pushState(null, '', window.location.href);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
        setAnimating(false);
      }, 450);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const currentQuote = quotes[currentQuoteIndex];

  return (
    <div className="saas-fullscreen-auth min-h-screen w-full flex flex-col lg:flex-row bg-white text-[#10241A] font-sans">
      {/* Left Half: Full-Page Form Area (50% on desktop) */}
      <div className="saas-form-side flex-1 min-h-screen bg-white flex flex-col justify-between items-center p-6 sm:p-12 lg:p-12 box-border">
        {/* Top Brand Header */}
        <div className="flex items-center justify-between w-full max-w-[560px] mb-8">
          <Link href="/" className="flex items-center gap-2.5 no-underline shrink-0">
            <img
              src="/icons/ophil-logo.png"
              alt="OFPHIL Eye Logo"
              width={36}
              height={36}
              style={{ width: '36px', height: '36px', objectFit: 'contain', flexShrink: 0, display: 'block' }}
              className="h-9 w-9 object-contain shrink-0"
            />
            <div>
              <div className="font-['Outfit'] text-base font-bold text-[#10241A] leading-tight uppercase tracking-wider">
                OFPHIL
              </div>
              <div className="text-[11px] text-[#5A7466] mt-0.5">
                Ophthalmological Foundation
              </div>
            </div>
          </Link>
          <Link
            href="/"
            className="text-[13px] text-[#5A7466] hover:text-[#0B6B3A] no-underline font-medium flex items-center gap-1.5 transition"
          >
            <i className="fa-solid fa-arrow-left text-xs" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Main Form Container */}
        <div className="saas-form-container w-full max-w-[560px] my-auto">
          {children}
        </div>

        {/* Bottom Centered Copyright */}
        <div className="text-xs text-[#8F9E96] text-center w-full max-w-[560px] mx-auto pt-6">
          &copy; 2026 Ophthalmological Foundation of the Philippines. All rights reserved.
        </div>
      </div>

      {/* Right Half: Full Height Ophthalmology Clinic Hero with Changing Quotes */}
      <div
        className="saas-visual-side hidden lg:flex flex-1 min-h-screen relative items-end p-16 box-border bg-[#0B6B3A]"
        style={{
          backgroundImage: "url('/background/auth-clinic.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Dark Emerald Gradient Overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(8, 77, 44, 0.25) 0%, rgba(6, 72, 38, 0.85) 100%)',
          }}
        />

        <div className="saas-visual-overlay relative z-10 text-white max-w-[520px]">
          {/* Tag Pill */}
          <div className="inline-flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-wider text-[#86EFAC] mb-3 bg-white/12 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#86EFAC]" />
            <span>{currentQuote.category}</span>
          </div>

          {/* Changing Quote Content */}
          <div className="min-h-[140px] relative overflow-hidden">
            <div
              className={`transition-all duration-500 ease-out ${
                animating ? 'opacity-0 -translate-x-8' : 'opacity-100 translate-x-0'
              }`}
            >
              <h2 className="font-['Outfit'] text-[32px] font-bold leading-tight mb-3 text-white">
                {currentQuote.title}
              </h2>
              <p className="text-[15px] text-[#E8F5EC] leading-relaxed m-0 opacity-95">
                {currentQuote.subtitle}
              </p>
            </div>
          </div>

          {/* Dot Indicators */}
          <div className="flex gap-1.5 mt-5">
            {quotes.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentQuoteIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-1 rounded-full transition-all duration-300 ${
                  idx === currentQuoteIndex ? 'w-9 bg-[#86EFAC]' : 'w-6 bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
