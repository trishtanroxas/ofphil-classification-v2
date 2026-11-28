'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLoadingScreen } from '@/context/LoadingScreenContext';
import { useAuth } from '@/context/AuthContext';

export default function RootLandingPage() {
  const { showLoading } = useLoadingScreen();
  const { user, role, logout, isLoggingOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inquirySubject, setInquirySubject] = useState('Assistance Application Inquiry');
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastSuccess, setToastSuccess] = useState(true);
  const [toastClosing, setToastClosing] = useState(false);

  const triggerToast = (msg: string, isSuccess = true) => {
    setToastClosing(false);
    setToastSuccess(isSuccess);
    setToastMessage(msg);
  };

  const dismissToast = () => {
    setToastClosing(true);
    setTimeout(() => {
      setToastMessage(null);
      setToastClosing(false);
    }, 320);
  };

  React.useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      dismissToast();
    }, 5200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Multi-file Attachment State (Max 5 files, 10MB each)
  const MAX_FILES = 5;
  const MAX_SIZE_BYTES = 10 * 1024 * 1024;
  const [selectedFiles, setSelectedFiles] = useState<
    Array<{ id: string; file: File; previewSrc: string | null }>
  >([]);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const incoming = Array.from(fileList);
    const remainingSlots = MAX_FILES - selectedFiles.length;

    if (remainingSlots <= 0) {
      triggerToast(`Maximum limit of ${MAX_FILES} attachments reached. Remove a file to add another.`, false);
      e.target.value = '';
      return;
    }

    if (incoming.length > remainingSlots) {
      triggerToast(`You can only attach up to ${MAX_FILES} files total (${remainingSlots} slot(s) left).`, false);
    }

    const toProcess = incoming.slice(0, remainingSlots);

    toProcess.forEach((file) => {
      const isAllowed =
        file.type.startsWith('image/') ||
        file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf') ||
        file.name.toLowerCase().endsWith('.png') ||
        file.name.toLowerCase().endsWith('.jpg') ||
        file.name.toLowerCase().endsWith('.jpeg');

      if (!isAllowed) {
        triggerToast(`"${file.name}" is not a valid format. Only PNG, JPG, or PDF files are allowed.`, false);
        return;
      }

      if (file.size > MAX_SIZE_BYTES) {
        triggerToast(`"${file.name}" exceeds the 10MB maximum file size limit.`, false);
        return;
      }

      const id = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSelectedFiles((prev) => {
          if (prev.length >= MAX_FILES) return prev;
          return [...prev, { id, file, previewSrc: (ev.target?.result as string) || null }];
        });
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveSingleFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearFile = () => {
    setSelectedFiles([]);
    setPreviewSrc(null);
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const inqId = `INQ-2026-${Math.floor(100 + Math.random() * 900)}`;
    const senderName = inquiryName.trim() || 'Public Visitor';
    const senderEmail = inquiryEmail.trim() || 'roxas.t.bscs@gmail.com';
    const msgText = inquiryMessage.trim();

    const formattedAttachments = selectedFiles.map((item) => ({
      name: item.file.name,
      type: (item.file.type.includes('pdf') || item.file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image') as 'pdf' | 'image',
      url: item.previewSrc || '',
      dataUrl: item.previewSrc || '',
      size:
        item.file.size > 1024 * 1024
          ? `${(item.file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(item.file.size / 1024)} KB`,
    }));

    const newPublicInq = {
      id: inqId,
      source: 'public_landing' as const,
      name: senderName,
      email: senderEmail,
      contactNumber: '0917 800 2026',
      subject: inquirySubject,
      date: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: 'New' as const,
      isRead: false,
      message: msgText,
      patientAttachments: formattedAttachments,
      replyHistory: [],
    };

    try {
      const existing = JSON.parse(localStorage.getItem('ofphil_public_inquiries') || '[]');
      localStorage.setItem('ofphil_public_inquiries', JSON.stringify([newPublicInq, ...existing]));
      window.dispatchEvent(new Event('ofphil-inquiries-updated'));
    } catch (err) {}

    let emailDispatched = false;
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${apiBase}/inquiries/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiry_id: inqId,
          name: senderName,
          email: senderEmail,
          subject: inquirySubject,
          message: msgText,
          attachment_names: formattedAttachments.map((a) => a.name),
          attachments: formattedAttachments,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        emailDispatched = Boolean(data.email_sent);
      }
    } catch (err) {
      console.warn('Inquiry SMTP call failed:', err);
    }

    setSubmitting(false);
    triggerToast(
      emailDispatched
        ? `Maraming salamat! Inquiry ${inqId} (with viewable files) sent to ${senderEmail} & OFPHIL Clinic Desk.`
        : `Maraming salamat! Your inquiry (${inqId}) has been delivered to the OFPHIL Clinic Inquiries Desk.`,
      true
    );
    setInquiryName('');
    setInquiryEmail('');
    setInquiryMessage('');
    handleClearFile();
  };

  return (
    <div className="landing-page antialiased text-slate-800 flex flex-col min-h-screen">
      {/* 1. Slim Sticky Navigation Bar */}
      <nav className="landing-navbar">
        <div className="landing-container h-full flex items-center justify-between">
          {/* Brand Logo Left */}
          <Link href="/" className="flex items-center gap-3 no-underline landing-brand">
            <img
              src="/icons/ophil-logo.png"
              alt="OFPHIL Eye Logo"
              className="h-9 w-auto object-contain flex-shrink-0"
            />
            <div className="landing-brand-text">
              <div
                className="text-[15px] font-bold tracking-wider text-[#10241A] font-['Outfit'] leading-tight uppercase"
                style={{ letterSpacing: '0.04em' }}
              >
                OFPHIL
              </div>
              <div className="text-[11.5px] font-medium text-[#5A7466] tracking-normal mt-0.5 landing-brand-sub">
                Ophthalmological Foundation of the Philippines
              </div>
            </div>
          </Link>

          {/* Clean Editorial Nav Links (Desktop Anchor Navigation) */}
          <div className="landing-nav-menu">
            <a href="#home" className="nav-section-link active">Home</a>
            <a href="#services" className="nav-section-link">Services</a>
            <a href="#about" className="nav-section-link">About Us</a>
            <a href="#doctor" className="nav-section-link">Our Doctor</a>
            <a href="#contact" className="nav-section-link">Contact</a>
          </div>

          {/* Action Buttons (Desktop) */}
          <div className="landing-desktop-actions items-center gap-3 flex-shrink-0">
            {user ? (
              <>
                <Link
                  href={
                    role === 'admin' || role === 'nurse'
                      ? '/admin/patient-records'
                      : role === 'msw'
                      ? '/dashboard'
                      : '/portal?tab=dashboard'
                  }
                  onClick={() => showLoading('Navigating to your dashboard...')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-[#0B6B3A] hover:bg-[#064826] rounded-full transition shadow-sm whitespace-nowrap"
                >
                  <i className="fa-solid fa-table-columns text-xs" />
                  <span>
                    {role === 'admin' || role === 'nurse'
                      ? 'Admin Dashboard'
                      : role === 'msw'
                      ? 'Caseworker Dashboard'
                      : 'Patient Dashboard'}
                  </span>
                </Link>
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={() => {
                    logout('/');
                  }}
                  className="px-3 py-2 text-[13px] font-medium text-[#24352B] hover:text-[#DC2626] transition whitespace-nowrap bg-transparent border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                </button>
              </>
            ) : (
              <>

                <Link
                  href="/login-patient"
                  onClick={() => showLoading('Navigating to Patient Sign In...')}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold text-white bg-[#0B6B3A] hover:bg-[#064826] rounded-full transition shadow-sm whitespace-nowrap"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`landing-hamburger-btn ${mobileMenuOpen ? 'menu-open' : ''}`}
            aria-label="Toggle Navigation Menu"
          >
            <i className={`fa-solid ${mobileMenuOpen ? 'fa-chevron-up' : 'fa-bars-staggered'}`} />
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="landing-mobile-menu" style={{ display: 'block' }}>
            <div className="landing-mobile-menu-inner">
              <div className="landing-mobile-links">
                <a href="#home" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link nav-section-link active">
                  <i className="fa-solid fa-house"></i> Home
                </a>
                <a href="#services" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link nav-section-link">
                  <i className="fa-solid fa-eye"></i> Services
                </a>
                <a href="#about" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link nav-section-link">
                  <i className="fa-solid fa-building"></i> About Us
                </a>
                <a href="#doctor" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link nav-section-link">
                  <i className="fa-solid fa-user-doctor"></i> Our Doctor
                </a>
                <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link nav-section-link">
                  <i className="fa-solid fa-envelope"></i> Contact
                </a>
              </div>
              <div className="landing-mobile-actions">
                {user ? (
                  <>
                    <Link
                      href={
                        role === 'admin' || role === 'nurse'
                          ? '/admin/patient-records'
                          : role === 'msw'
                          ? '/dashboard'
                          : '/portal?tab=dashboard'
                      }
                      onClick={() => {
                        setMobileMenuOpen(false);
                        showLoading('Navigating to your dashboard...');
                      }}
                      className="mobile-action-primary"
                    >
                      <i className="fa-solid fa-table-columns" />
                      <span>
                        {role === 'admin' || role === 'nurse'
                          ? 'Admin Dashboard'
                          : role === 'msw'
                          ? 'Caseworker Dashboard'
                          : 'Patient Dashboard'}
                      </span>
                    </Link>
                    <button
                      type="button"
                      disabled={isLoggingOut}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        logout('/');
                      }}
                      className="mobile-action-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <i className={`fa-solid ${isLoggingOut ? 'fa-spinner fa-spin' : 'fa-arrow-right-from-bracket'}`} />
                      <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login-patient" onClick={() => setMobileMenuOpen(false)} className="mobile-action-primary">
                      <i className="fa-solid fa-lock"></i> Sign In to Portal
                    </Link>

                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1">
        {/* ======================================================== */}
        {/* 1. Hero Section (Hero Cover with Clinical Green Arc)    */}
        {/* ======================================================== */}
        <section id="home" className="hero-curve-container">
          <div className="hero-desktop-bg" aria-hidden="true" />
          <div className="landing-container w-full hero-content-relative">
            <div className="hero-split-grid">
              {/* Left Column: Human Clinical Headline */}
              <div className="hero-headline-col">
                <h1 className="hero-headline-title">
                  No one should lose their sight because they can&apos;t afford surgery.
                </h1>

                <p className="hero-headline-desc">
                  OFPHIL helps eligible patients access medical assistance (subsidy of the clinic procedure quotation) for cataract, retinal, and glaucoma surgery through structured assessments, verified procedure quotations, and review by authorized medical social workers.
                </p>

                <div className="hero-headline-actions">
                  <Link
                    href="/login-patient"
                    onClick={() => showLoading('Navigating to Patient Sign In...')}
                    className="hero-btn-primary"
                  >
                    Patient Sign In <i className="fa-solid fa-arrow-right" style={{ fontSize: '13px' }} />
                  </Link>

                </div>

                {/* Trust Badges */}
                <div className="hero-trust-badges">
                  <div className="hero-trust-item">
                    <i className="fa-solid fa-certificate" style={{ color: '#86EFAC' }} />
                    <span>DOH clinical protocol</span>
                  </div>
                  <div className="hero-trust-item">
                    <i className="fa-solid fa-user-shield" style={{ color: '#86EFAC' }} />
                    <span>Licensed social workers</span>
                  </div>
                  <div className="hero-trust-item">
                    <i className="fa-solid fa-file-shield" style={{ color: '#86EFAC' }} />
                    <span>Verified hospital quotations</span>
                  </div>
                </div>

                <a href="#pillars-highlights" className="hero-scroll-indicator" aria-label="Scroll down to clinical highlights">
                  <span>Learn more</span>
                  <i className="fa-solid fa-chevron-down" aria-hidden="true" />
                </a>
              </div>

              {/* Right Side Spacer for Patient Visual */}
              <div className="hidden lg:block hero-visual-spacer" />
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 2. Clinical Highlights (Standalone 3-Card Grid)          */}
        {/* ======================================================== */}
        <section
          id="pillars-highlights"
          className="hero-pillars-standalone-section"
          style={{ paddingTop: '56px', paddingBottom: '56px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #DCE5DF' }}
        >
          <div className="landing-container">
            <div className="hero-pillars-card">
              <div className="hero-pillar-item">
                <div className="hero-pillar-icon" style={{ backgroundColor: '#E8F5EC', color: '#0B6B3A' }}>
                  <i className="fa-solid fa-stethoscope" />
                </div>
                <div>
                  <div className="hero-pillar-title" style={{ color: '#24352B', fontWeight: 700 }}>Free Eye Surgeries</div>
                  <p className="hero-pillar-desc" style={{ color: '#66756B', lineHeight: 1.6 }}>
                    Eligible patients may receive surgical assistance for cataract, retinal, and glaucoma procedures through participating accredited surgical centers.
                  </p>
                </div>
              </div>

              <div className="hero-pillar-item">
                <div className="hero-pillar-icon" style={{ backgroundColor: '#E8F5EC', color: '#0B6B3A' }}>
                  <i className="fa-solid fa-clipboard-check" />
                </div>
                <div>
                  <div className="hero-pillar-title" style={{ color: '#24352B', fontWeight: 700 }}>Fast Case Review</div>
                  <p className="hero-pillar-desc" style={{ color: '#66756B', lineHeight: 1.6 }}>
                    Medical social workers review applications and hospital quotations using established assessment guidelines. Review timelines depend on application completeness and clinical urgency.
                  </p>
                </div>
              </div>

              <div className="hero-pillar-item">
                <div className="hero-pillar-icon" style={{ backgroundColor: '#E8F5EC', color: '#0B6B3A' }}>
                  <i className="fa-solid fa-user-doctor" />
                </div>
                <div>
                  <div className="hero-pillar-title" style={{ color: '#24352B', fontWeight: 700 }}>Accredited Surgeons</div>
                  <p className="hero-pillar-desc" style={{ color: '#66756B', lineHeight: 1.6 }}>
                    Qualified patients are referred through participating providers and appropriately credentialed ophthalmology professionals.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 3. Services Section ("How We Help" Bento Box)            */}
        {/* ======================================================== */}
        <section id="services" className="py-20 sm:py-24 bg-[#F5F8F6] border-none">
          <div className="landing-container">
            <div className="max-w-3xl mb-12 text-left">
              <div className="text-[13px] font-bold text-[#0B6B3A] uppercase tracking-wider mb-2">How we help</div>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#24352B] font-['Outfit'] tracking-tight">
                Surgical care supported through procedure quotation subsidy
              </h2>
              <p className="text-base sm:text-lg text-[#66756B] mt-3 leading-relaxed">
                We prioritize eligible patients who need essential ophthalmic surgery, using documented socio-economic assessments and verified clinic procedure quotations to guide medical assistance decisions.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Bento Card 1: Surgeries Covered */}
              <div
                className="lg:col-span-5 bg-white p-6 rounded-2xl border border-[#DCE5DF] shadow-sm flex flex-col justify-between hover:shadow-md transition"
                style={{ padding: '24px' }}
              >
                <div>
                  <div
                    className="w-13 h-13 rounded-2xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-2xl shadow-sm"
                    style={{ width: '52px', height: '52px', marginBottom: '20px' }}
                  >
                    <i className="fa-solid fa-eye" />
                  </div>
                  <h3
                    className="text-2xl font-bold text-[#24352B] font-['Outfit'] tracking-tight"
                    style={{ marginBottom: '8px' }}
                  >
                    Surgeries Covered
                  </h3>
                  <p className="text-sm text-[#66756B] leading-relaxed" style={{ marginBottom: 0 }}>
                    Timely surgical sponsorship preventing blindness across three core ophthalmic specialties:
                  </p>

                  <div className="surgery-list mt-4 space-y-3">
                    <div className="surgery-item flex items-start gap-2.5">
                      <span className="surgery-item__bullet mt-1.5 h-2 w-2 rounded-full bg-[#0B6B3A] shrink-0" />
                      <div className="text-xs sm:text-sm text-[#2E4538]">
                        <strong className="text-[#24352B]">Cataract Extraction:</strong> Phacoemulsification with intraocular lens (IOL) implantation for clear daily sight.
                      </div>
                    </div>
                    <div className="surgery-item flex items-start gap-2.5">
                      <span className="surgery-item__bullet mt-1.5 h-2 w-2 rounded-full bg-[#0B6B3A] shrink-0" />
                      <div className="text-xs sm:text-sm text-[#2E4538]">
                        <strong className="text-[#24352B]">Retinal Repair:</strong> Vitrectomy (PPV) and laser photocoagulation for diabetic tears and detachments.
                      </div>
                    </div>
                    <div className="surgery-item flex items-start gap-2.5">
                      <span className="surgery-item__bullet mt-1.5 h-2 w-2 rounded-full bg-[#0B6B3A] shrink-0" />
                      <div className="text-xs sm:text-sm text-[#2E4538]">
                        <strong className="text-[#24352B]">Glaucoma Surgery:</strong> Trabeculectomy and shunt implantations to relieve intraocular pressure and protect optic nerves.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="coverage-scope mt-6 pt-4 border-t border-[#DCE5DF]">
                  <span className="coverage-scope__title block text-xs font-bold text-[#0B6B3A] uppercase tracking-wider mb-1">
                    Coverage Scope
                  </span>
                  <p className="coverage-scope__description text-xs text-[#66756B] leading-relaxed m-0">
                    Covers operating room charges and surgeon fees for qualified indigent patients guided by standardized poverty thresholds.
                  </p>
                </div>
              </div>

              {/* Right Bento Column: 3 Smart Feature Cards */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                <div className="bg-white rounded-2xl p-7 sm:p-8 border border-[#DCE5DF] shadow-sm hover:shadow-md transition">
                  <div className="flex items-start gap-5">
                    <div className="w-12 h-12 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
                      <i className="fa-solid fa-hospital" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xl font-bold text-[#24352B] font-['Outfit']">Accredited Surgical Facilities</h4>
                        <span className="text-xs font-bold text-[#0B6B3A] px-3 py-1 rounded-full bg-[#E8F5EC]">Clinical Standards</span>
                      </div>
                      <p className="text-sm text-[#66756B] leading-relaxed mb-4">
                        Surgeries are conducted within recognized ambulatory surgical centers equipped with modern phacoemulsification units, sterile operating suites, and post-operative monitoring.
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="px-3.5 py-1.5 bg-[#F5F8F6] text-[#0B6B3A] border border-[#DCE5DF] rounded-full">DOH-Compliant Ambulatory Center</span>
                        <span className="px-3.5 py-1.5 bg-[#F5F8F6] text-[#24352B] border border-[#DCE5DF] rounded-full">Sterile Operating Theaters</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-7 sm:p-8 border border-[#DCE5DF] shadow-sm hover:shadow-md transition">
                  <div className="flex items-start gap-5">
                    <div className="w-12 h-12 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
                      <i className="fa-solid fa-hand-holding-medical" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xl font-bold text-[#24352B] font-['Outfit']">Transparent Surgical Quotation Review</h4>
                        <span className="text-xs font-bold text-[#0B6B3A] px-3 py-1 rounded-full bg-[#E8F5EC]">Quotation Subsidy</span>
                      </div>
                      <p className="text-sm text-[#66756B] leading-relaxed mb-4">
                        Medical assistance directly subsidizes the clinic procedure quotation for surgical expenses, reducing or covering approved clinic procedure charges for verified indigent families (no cash payouts are issued to patients).
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#66756B]">
                        <span className="inline-flex items-center gap-1.5"><i className="fa-solid fa-circle-check text-[#0B6B3A]" /> Operating room fee sponsorship</span>
                        <span className="inline-flex items-center gap-1.5"><i className="fa-solid fa-circle-check text-[#0B6B3A]" /> Essential intraocular lens (IOL)</span>
                        <span className="inline-flex items-center gap-1.5"><i className="fa-solid fa-circle-check text-[#0B6B3A]" /> Direct subsidy of procedure quotation</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-7 sm:p-8 border border-[#DCE5DF] shadow-sm hover:shadow-md transition flex flex-col justify-center flex-1">
                  <div className="flex items-start gap-5">
                    <div className="w-12 h-12 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
                      <i className="fa-solid fa-user-shield" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xl font-bold text-[#24352B] font-['Outfit']">Licensed Social Worker Final Sign-Off</h4>
                        <span className="text-xs font-bold text-[#0B6B3A] px-3 py-1 rounded-full bg-[#E8F5EC]">Professional Casework</span>
                      </div>
                      <p className="text-sm text-[#66756B] leading-relaxed m-0">
                        An authorized medical social worker reviews the assessment, verifies supporting documents, and makes or approves the assistance recommendation according to organizational policy.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 4. About Us Section                                      */}
        {/* ======================================================== */}
        <section id="about" className="page-section page-section-white">
          <div className="landing-container">
            <div className="max-w-3xl mb-12 text-left">
              <span className="section-eyebrow">OUR FOUNDATION</span>
              <h2 className="section-title">Identity, Mission &amp; Purpose</h2>
              <p className="section-subtitle">
                The Ophthalmological Foundation of the Philippines (OFPHIL) operates as a non-profit clinical charity network. Our purpose is to remove financial barriers that prevent underserved patients from undergoing sight-saving procedures.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="clinical-card flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-xl mb-5">
                    <i className="fa-solid fa-bullseye" />
                  </div>
                  <h3 className="text-xl font-bold text-[#24352B] font-['Outfit'] mb-3">Our Mission</h3>
                  <p className="text-sm text-[#66756B] leading-relaxed mb-4">
                    To provide equitable, transparent, and prompt charity assistance for sight-saving ophthalmic surgeries, bridging the financial divide for indigent patients through rigorous medical social casework and partnerships with accredited surgical centers.
                  </p>
                </div>
                <div className="pt-4 border-t border-[#DCE5DF] text-xs font-semibold text-[#0B6B3A] flex items-center gap-2">
                  <i className="fa-solid fa-arrow-right" /> Equitable surgical access
                </div>
              </div>

              <div className="clinical-card flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-xl mb-5">
                    <i className="fa-solid fa-microscope" />
                  </div>
                  <h3 className="text-xl font-bold text-[#24352B] font-['Outfit'] mb-3">Our Approach</h3>
                  <p className="text-sm text-[#66756B] leading-relaxed mb-4">
                    We integrate structured socio-demographic scoring with automated medical quotation auditing. This enables medical social workers to examine hospital line items, deduplicate PhilHealth benefits, and allocate subsidies based on verified need.
                  </p>
                </div>
                <div className="pt-4 border-t border-[#DCE5DF] text-xs font-semibold text-[#0B6B3A] flex items-center gap-2">
                  <i className="fa-solid fa-arrow-right" /> Evidence-driven evaluation
                </div>
              </div>

              <div className="clinical-card flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-xl mb-5">
                    <i className="fa-solid fa-shield-heart" />
                  </div>
                  <h3 className="text-xl font-bold text-[#24352B] font-['Outfit'] mb-3">Our Commitment</h3>
                  <p className="text-sm text-[#66756B] leading-relaxed mb-4">
                    We hold ourselves to the highest standards of fairness, patient privacy, and fiduciary integrity. Every medical assistance subsidy is applied directly toward the clinic procedure quotation for essential surgical consumables, intraocular lenses, and approved facility costs.
                  </p>
                </div>
                <div className="pt-4 border-t border-[#DCE5DF] text-xs font-semibold text-[#0B6B3A] flex items-center gap-2">
                  <i className="fa-solid fa-arrow-right" /> Fiduciary stewardship
                </div>
              </div>
            </div>
          </div>
        </section>

<section className="page-section page-section-alt">
  <div className="landing-container">
    <div className="max-w-3xl mb-12 text-left">
      <span className="section-eyebrow">PATIENT ASSISTANCE ARCHITECTURE</span>
      <h2 className="section-title">How We Support Patients & Families</h2>
      <p className="section-subtitle">
        Navigating surgical care and medical assistance can be overwhelming. OFPHIL streamlines every phase of the beneficiary journey through dedicated casework assistance and transparent digital tools.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      
      <div className="clinical-card p-6 sm:p-8 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-lg shrink-0">
              <i className="fa-solid fa-hospital-user"></i>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#24352B] font-['Outfit'] m-0">Accessible Intake & Case Filing</h3>
              <span className="text-xs text-[#0B6B3A] font-semibold block mt-0.5">Self-Service or On-Site Assistance</span>
            </div>
          </div>
          <p className="text-sm text-[#66756B] leading-relaxed mb-6">
            Patients and families can submit their initial information online via our Beneficiary Portal or visit our intake desk in person. We assist applicants who may have difficulty with technology or formal paperwork, ensuring that no eligible individual is excluded because of administrative hurdles.
          </p>
        </div>
        <ul className="space-y-2.5 text-xs text-[#24352B] pt-4 border-t border-[#DCE5DF]" style={{ marginTop: 'auto', paddingTop: '16px' }}>
          <li className="flex items-center gap-2"><i className="fa-solid fa-check text-[#0B6B3A]"></i> Multi-channel intake (online and on-site caseworker support)</li>
          <li className="flex items-center gap-2"><i className="fa-solid fa-check text-[#0B6B3A]"></i> Guidance on obtaining local Barangay and MSWD certificates</li>
          <li className="flex items-center gap-2"><i className="fa-solid fa-check text-[#0B6B3A]"></i> Clear visibility of pending requirements and approval timelines</li>
        </ul>
      </div>

      <div className="clinical-card p-6 sm:p-8 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-lg shrink-0">
              <i className="fa-solid fa-hand-holding-medical"></i>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#24352B] font-['Outfit'] m-0">Direct Procedure Quotation Subsidy</h3>
              <span className="text-xs text-[#0B6B3A] font-semibold block mt-0.5">Clinic Quotation Coverage Only (No Cash Payout)</span>
            </div>
          </div>
          <p className="text-sm text-[#66756B] leading-relaxed mb-6">
            Once an application is approved by our medical social work committee, OFPHIL applies a formal medical assistance subsidy directly to the clinic procedure quotation at the accredited surgical center rather than handing cash to patients, covering approved intraocular implants and surgical consumables.
          </p>
        </div>
        <ul className="space-y-2.5 text-xs text-[#24352B] pt-4 border-t border-[#DCE5DF]" style={{ marginTop: 'auto', paddingTop: '16px' }}>
          <li className="flex items-center gap-2"><i className="fa-solid fa-check text-[#0B6B3A]"></i> Coordination with PhilHealth billing sections to optimize benefits</li>
          <li className="flex items-center gap-2"><i className="fa-solid fa-check text-[#0B6B3A]"></i> Direct supplier settlements for authorized lenses and surgical packs</li>
          <li className="flex items-center gap-2"><i className="fa-solid fa-check text-[#0B6B3A]"></i> Post-operative follow-up coordination with attending surgeons</li>
        </ul>
      </div>

    </div>
  </div>
</section>

<section className="page-section page-section-white">
  <div className="doctor-page-container">
    <div className="doctor-two-column-grid items-start">
      
      <div className="doctor-content-card text-left">
        <div>
          <span className="section-eyebrow">GOVERNANCE & ETHICS</span>
          <h2 className="section-title">Clinical Accountability & Decision Standards</h2>
          <p className="section-subtitle mb-6">
            Assistance decisions at OFPHIL follow rigorous institutional governance to ensure fairness, clinical appropriateness, and compliance with healthcare laws.
          </p>
        </div>
        <div className="p-4 bg-[#E8F5EC] rounded-xl border border-[#DCE5DF] text-xs text-[#0B6B3A] leading-relaxed" style={{ marginTop: 'auto' }}>
          <i className="fa-solid fa-gavel mr-1.5 font-bold"></i>
          <strong>Human-in-the-Loop Governance:</strong> Our system helps review eligibility and check quotations, but final charity grants are always evaluated, approved, and signed by a licensed Medical Social Worker.
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        
        <div className="doctor-content-card" style={{ padding: '18px 20px' }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-base shrink-0 mt-0.5" style={{ width: '40px', height: '40px' }}>
              <i className="fa-solid fa-scale-balanced"></i>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-bold text-[#24352B] font-['Outfit'] mb-1.5">Standardized MSWD Eligibility Criteria</h4>
              <p className="text-xs sm:text-sm text-[#66756B] leading-relaxed m-0">
                Charity classifications align with standard DOH and MSWD socio-economic criteria, incorporating household income, per capita dependents, housing condition, and clinical urgency.
              </p>
            </div>
          </div>
        </div>

        <div className="doctor-content-card" style={{ padding: '18px 20px' }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-base shrink-0 mt-0.5" style={{ width: '40px', height: '40px' }}>
              <i className="fa-solid fa-user-lock"></i>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-bold text-[#24352B] font-['Outfit'] mb-1.5">Data Privacy & Patient Confidentiality</h4>
              <p className="text-xs sm:text-sm text-[#66756B] leading-relaxed m-0">
                We strictly observe Republic Act 10173 (Data Privacy Act of 2012). Beneficiary records, medical abstracts, and financial certificates are encrypted and accessible only to authorized caseworkers.
              </p>
            </div>
          </div>
        </div>

        <div className="doctor-content-card" style={{ padding: '18px 20px' }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-base shrink-0 mt-0.5" style={{ width: '40px', height: '40px' }}>
              <i className="fa-solid fa-magnifying-glass-chart"></i>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-bold text-[#24352B] font-['Outfit'] mb-1.5">Transparent Quotation Subsidy Auditing</h4>
              <p className="text-xs sm:text-sm text-[#66756B] leading-relaxed m-0">
                All procedure quotation subsidy records, quotation reviews, and case decisions maintain comprehensive secure activity records, ensuring verifiable audits by clinical and institutional stakeholders.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  </div>
</section>



        {/* ======================================================== */}
        {/* 5. Our Doctor Section                                    */}
        {/* ======================================================== */}
        <section id="doctor" className="page-section page-section-white">
          <div className="landing-container">
            <div className="max-w-3xl mb-12 text-left">
              <span className="section-eyebrow">OPHTHALMIC MEDICINE</span>
              <h2 className="section-title">The Role of Ophthalmologists in Vision Care</h2>
              <p className="section-subtitle">
                Ophthalmologists are medically trained physicians and eye surgeons who specialize in the comprehensive diagnosis, medical management, and microsurgical treatment of visual system disorders.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="clinical-card">
                <div className="w-12 h-12 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-xl mb-5">
                  <i className="fa-solid fa-stethoscope" />
                </div>
                <h3 className="text-xl font-bold text-[#24352B] font-['Outfit'] mb-2">Comprehensive Evaluation</h3>
                <p className="text-xs sm:text-sm text-[#66756B] leading-relaxed mb-4">
                  Conducting slit-lamp biomicroscopy, intraocular pressure measurement, gonioscopy, dilated fundus examinations, and optical coherence tomography (OCT) to accurately stage disease progression.
                </p>
                <span className="text-xs font-semibold text-[#0B6B3A] block border-t border-[#DCE5DF] pt-3">
                  Diagnostic Precision
                </span>
              </div>

              <div className="clinical-card">
                <div className="w-12 h-12 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-xl mb-5">
                  <i className="fa-solid fa-hand-holding-medical" />
                </div>
                <h3 className="text-xl font-bold text-[#24352B] font-['Outfit'] mb-2">Microsurgical Treatment</h3>
                <p className="text-xs sm:text-sm text-[#66756B] leading-relaxed mb-4">
                  Executing high-precision microsurgery under operating microscopes, utilizing advanced phacoemulsification units, vitreoretinal vitrectors, and specialized glaucoma filtration instruments.
                </p>
                <span className="text-xs font-semibold text-[#0B6B3A] block border-t border-[#DCE5DF] pt-3">
                  Surgical Expertise
                </span>
              </div>

              <div className="clinical-card">
                <div className="w-12 h-12 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-xl mb-5">
                  <i className="fa-solid fa-notes-medical" />
                </div>
                <h3 className="text-xl font-bold text-[#24352B] font-['Outfit'] mb-2">Post-Operative Recovery</h3>
                <p className="text-xs sm:text-sm text-[#66756B] leading-relaxed mb-4">
                  Monitoring visual rehabilitation, managing ocular inflammation, checking intraocular pressure stabilization, and preventing surgical complications through structured follow-up visits.
                </p>
                <span className="text-xs font-semibold text-[#0B6B3A] block border-t border-[#DCE5DF] pt-3">
                  Continuity of Care
                </span>
              </div>
            </div>
          </div>
        </section>

<section className="page-section page-section-alt">
  <div className="landing-container">
    <div className="max-w-3xl mb-12 text-left">
      <span className="section-eyebrow">CLINICAL SUB-SPECIALTIES</span>
      <h2 className="section-title">Supported Specialty Overview</h2>
      <p className="section-subtitle">
        OFPHIL works alongside licensed ophthalmologists and credentialed sub-specialists practicing across accredited eye centers. Below is an overview of the specialized care domains involved in our patient programs:
      </p>
    </div>

    <div className="space-y-6">
      
      {/* Sub-specialty 1 */}
      <div className="clinical-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-xs font-semibold text-[#0B6B3A] uppercase tracking-wider">Sub-Specialty Focus</span>
            <h3 className="text-xl font-bold text-[#24352B] font-['Outfit'] mt-0.5">Cataract & Refractive Surgery</h3>
          </div>
          <span className="px-3 py-1 bg-[#E8F5EC] text-[#0B6B3A] font-medium text-xs rounded-full">High-Volume Charity Coverage</span>
        </div>
        <p className="text-xs sm:text-sm text-[#66756B] leading-relaxed mb-4">
          Specialists in this field focus on removing clouded lenses through sutureless phacoemulsification ultrasound and implanting intraocular lenses (IOLs). Their work directly addresses the leading cause of reversible blindness in the country, enabling patients to regain functional independence and occupational capacity.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#F5F8F6] p-4 rounded-xl border border-[#DCE5DF]">
          <div><strong className="text-[#24352B]">Common Indications:</strong> Age-related, traumatic, or metabolic cataracts</div>
          <div><strong className="text-[#24352B]">Typical Interventions:</strong> Phacoemulsification, biometry calculation, IOL positioning</div>
          <div><strong className="text-[#24352B]">OFPHIL Support:</strong> Biometry assistance, IOL consumables, surgical pack subsidies</div>
        </div>
      </div>

      {/* Sub-specialty 2 */}
      <div className="clinical-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-xs font-semibold text-[#0B6B3A] uppercase tracking-wider">Sub-Specialty Focus</span>
            <h3 className="text-xl font-bold text-[#24352B] font-['Outfit'] mt-0.5">Vitreoretinal Diseases & Surgery</h3>
          </div>
          <span className="px-3 py-1 bg-[#E8F5EC] text-[#0B6B3A] font-medium text-xs rounded-full">Sight-Threatening Emergency & Chronic Care</span>
        </div>
        <p className="text-xs sm:text-sm text-[#66756B] leading-relaxed mb-4">
          Vitreoretinal specialists treat complex disorders of the posterior segment of the eye, including diabetic retinopathy, macular holes, and retinal tears. Vitrectomy procedures require advanced micro-surgical instrumentation, precision endolasers, and intraocular gas or silicone oil tamponades.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#F5F8F6] p-4 rounded-xl border border-[#DCE5DF]">
          <div><strong className="text-[#24352B]">Common Indications:</strong> Diabetic tractional tears, vitreous hemorrhage, retinal detachment</div>
          <div><strong className="text-[#24352B]">Typical Interventions:</strong> Pars plana vitrectomy (PPV), membrane peeling, endolaser</div>
          <div><strong className="text-[#24352B]">OFPHIL Support:</strong> Operating facility subsidies, micro-vitrectomy packs, gas/oil supplies</div>
        </div>
      </div>

      {/* Sub-specialty 3 */}
      <div className="clinical-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-xs font-semibold text-[#0B6B3A] uppercase tracking-wider">Sub-Specialty Focus</span>
            <h3 className="text-xl font-bold text-[#24352B] font-['Outfit'] mt-0.5">Glaucoma Medical & Surgical Management</h3>
          </div>
          <span className="px-3 py-1 bg-[#E8F5EC] text-[#0B6B3A] font-medium text-xs rounded-full">Pressure Regulation & Optic Nerve Preservation</span>
        </div>
        <p className="text-xs sm:text-sm text-[#66756B] leading-relaxed mb-4">
          Glaucoma specialists diagnose progressive neuropathy characterized by optic nerve cupping and visual field deficits. When medical drop therapy is insufficient or cost-prohibitive for indigent patients, surgical filtration (trabeculectomy) or shunt valves offer sustained pressure control to stop vision loss.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#F5F8F6] p-4 rounded-xl border border-[#DCE5DF]">
          <div><strong className="text-[#24352B]">Common Indications:</strong> Primary open-angle, angle-closure, and secondary refractory glaucoma</div>
          <div><strong className="text-[#24352B]">Typical Interventions:</strong> Trabeculectomy with antimetabolites, tube shunt implantation</div>
          <div><strong className="text-[#24352B]">OFPHIL Support:</strong> Drainage valve device subsidy, surgical consumables, tonometry triage</div>
        </div>
      </div>

    </div>
  </div>
</section>

<section className="page-section page-section-white">
  <div className="doctor-page-container">
    <div className="doctor-two-column-grid">
      
      {/* Clinical Care & Social Work Partnership */}
      <div className="doctor-content-card">
        <div>
          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-lg shrink-0" style={{ width: '40px', height: '40px' }}>
              <i className="fa-solid fa-handshake-angle"></i>
            </div>
            <div>
              <span className="section-eyebrow">CARE COLLABORATION</span>
              <h3 className="text-xl font-bold text-[#24352B] font-['Outfit'] m-0">Clinical Diagnosis & Social Assistance</h3>
            </div>
          </div>
          <p className="text-sm text-[#66756B] mb-5 leading-relaxed">
            Medical evaluation and medical assistance (procedure quotation subsidy) operate as complementary pillars at OFPHIL:
          </p>
          <div className="doctor-numbered-list">
            <div className="doctor-numbered-item">
              <strong>1. The Doctor Determines Clinical Necessity:</strong>
              <p>The ophthalmologist identifies the eye pathology, confirms surgical readiness, and formulates the treatment plan.</p>
            </div>
            <div className="doctor-numbered-item">
              <strong>2. The Social Worker Evaluates Socio-Economic Circumstances:</strong>
              <p>The medical social worker interviews the patient and family, evaluates statutory benefits, and determines the appropriate subsidy of the clinic procedure quotation.</p>
            </div>
            <div className="doctor-numbered-item">
              <strong>3. Integrated Case Resolution:</strong>
              <p>Patients undergo timely surgery without out-of-pocket financial distress, backed by verified documentation.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Consultation & Referral Information */}
      <div className="doctor-content-card">
        <div>
          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-lg shrink-0" style={{ width: '40px', height: '40px' }}>
              <i className="fa-solid fa-hospital"></i>
            </div>
            <div>
              <span className="section-eyebrow">ACCESS PATHWAY</span>
              <h3 className="text-xl font-bold text-[#24352B] font-['Outfit'] m-0">Consultations & Participating Providers</h3>
            </div>
          </div>
          <p className="text-sm text-[#66756B] mb-5 leading-relaxed">
            How patients can access participating clinical eye specialists:
          </p>
          <ul className="space-y-3.5 text-xs sm:text-sm text-[#24352B] mb-6 list-none p-0 m-0">
            <li className="flex items-start gap-3">
              <i className="fa-solid fa-circle-check text-[#0B6B3A] mt-1 shrink-0 text-sm"></i>
              <span className="leading-relaxed"><strong>Hospital Clinic Referrals:</strong> Patients examined at participating tertiary hospitals or rural health units can present their clinical abstract to OFPHIL for assistance consideration.</span>
            </li>
            <li className="flex items-start gap-3">
              <i className="fa-solid fa-circle-check text-[#0B6B3A] mt-1 shrink-0 text-sm"></i>
              <span className="leading-relaxed"><strong>Appointment Request Triage:</strong> Patients seeking an initial clinical screening can submit an appointment request through our clinic schedule desk.</span>
            </li>
            <li className="flex items-start gap-3">
              <i className="fa-solid fa-circle-check text-[#0B6B3A] mt-1 shrink-0 text-sm"></i>
              <span className="leading-relaxed"><strong>Accredited Facility Network:</strong> Surgical procedures are conducted exclusively at accredited operating rooms and ambulatory centers with proper sterilization and resuscitation standards.</span>
            </li>
          </ul>
        </div>
        <div className="pt-4 border-t border-[#DCE5DF] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ marginTop: 'auto', paddingTop: '16px' }}>
          <span className="text-xs text-[#66756B]">Have questions about a consultation or procedure?</span>
          <a href="#contact" className="px-5 py-2.5 rounded-lg bg-[#0B6B3A] hover:bg-[#084D2C] text-xs font-semibold text-white transition shrink-0">
            Send an Inquiry →
          </a>
        </div>
      </div>

    </div>
  </div>
</section>



        {/* ======================================================== */}
        {/* 6. Contact & Inquiry Section                             */}
        {/* ======================================================== */}
        <section id="contact" className="page-section page-section-alt">
          <div className="landing-container">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Inquiry Form */}
              <div
                className="lg:col-span-7 clinical-card text-left flex flex-col justify-between h-full"
                style={{ padding: '24px' }}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-lg shrink-0">
                      <i className="fa-solid fa-paper-plane" />
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 bg-[#E8F5EC] text-[#0B6B3A] rounded-full">Direct Clinic Desk</span>
                  </div>
                  <span className="section-eyebrow">SEND AN INQUIRY</span>
                  <h2 className="text-2xl font-bold font-['Outfit'] text-[#24352B] m-0">Public Inquiry Form</h2>
                  <p className="text-xs sm:text-sm text-[#66756B] mt-1 mb-5 leading-relaxed">
                    Have questions regarding surgery sponsorship, medical quotation verification, or indigency documentary requirements? Fill out this form and our medical social work desk will respond.
                  </p>
                </div>

                <form onSubmit={handleInquirySubmit} className="flex-1 flex flex-col justify-between">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-field-group">
                      <label className="block text-xs font-semibold text-[#24352B] mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={inquiryName}
                        onChange={(e) => setInquiryName(e.target.value)}
                        placeholder="Juan Dela Cruz"
                        required
                        className="w-full px-3 py-2 text-xs border rounded-lg focus:outline-[#0B6B3A]"
                      />
                    </div>
                    <div className="form-field-group">
                      <label className="block text-xs font-semibold text-[#24352B] mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={inquiryEmail}
                        onChange={(e) => setInquiryEmail(e.target.value)}
                        placeholder="juan@example.com"
                        required
                        className="w-full px-3 py-2 text-xs border rounded-lg focus:outline-[#0B6B3A]"
                      />
                    </div>
                  </div>

                  <div className="form-field-group mt-3">
                    <label className="block text-xs font-semibold text-[#24352B] mb-1">
                      Inquiry Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={inquirySubject}
                      onChange={(e) => setInquirySubject(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs border rounded-lg focus:outline-[#0B6B3A] bg-white"
                    >
                      <option value="Assistance Application Inquiry">Assistance Application Inquiry</option>
                      <option value="Required Documents Inquiry">Required Documents Inquiry</option>
                      <option value="Appointment Inquiry">Appointment Inquiry</option>
                      <option value="Application Status Inquiry">Application Status Inquiry</option>
                      <option value="General Inquiry">General Inquiry</option>
                    </select>
                  </div>

                  <div className="form-field-group mt-3">
                    <label className="block text-xs font-semibold text-[#24352B] mb-1">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      value={inquiryMessage}
                      onChange={(e) => setInquiryMessage(e.target.value)}
                      placeholder="Please describe your question or inquiry in detail..."
                      required
                      className="w-full px-3 py-2 text-xs border rounded-lg focus:outline-[#0B6B3A]"
                    />
                  </div>

                  {/* Multi-File Attachment Box (Up to 5 files, max 10MB each) */}
                  <div className="form-field-group mt-3" style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#24352B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fa-solid fa-paperclip" style={{ color: '#0B6B3A' }} />
                        <span>
                          Attach Photos or Documents{' '}
                          <span style={{ fontWeight: 400, color: '#66756B' }}>
                            (Optional &bull; {selectedFiles.length}/{MAX_FILES} files)
                          </span>
                        </span>
                      </label>
                      <span style={{ fontSize: '11px', color: '#88998E' }}>
                        PNG, JPG, PDF &bull; Max {MAX_FILES} files (10MB each)
                      </span>
                    </div>

                    <input
                      type="file"
                      id="inquiryAttachment"
                      accept="image/*,.pdf"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />

                    {/* Upload Dropzone Trigger (Visible while under MAX_FILES limit) */}
                    {selectedFiles.length < MAX_FILES ? (
                      <div
                        onClick={() => document.getElementById('inquiryAttachment')?.click()}
                        style={{
                          cursor: 'pointer',
                          border: '1.5px dashed #CBD7D0',
                          borderRadius: '10px',
                          padding: '14px 16px',
                          background: '#FAFCFA',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '8px',
                            background: '#E8F5EC',
                            color: '#0B6B3A',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            flexShrink: 0,
                          }}
                        >
                          <i className="fa-regular fa-images" />
                        </div>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#10241A' }}>
                            {selectedFiles.length === 0
                              ? 'Click to upload documents or photos (up to 5 files)'
                              : `Add more files (${MAX_FILES - selectedFiles.length} remaining)`}
                          </div>
                          <div style={{ fontSize: '11px', color: '#66756B' }}>
                            Reseta, clinical quotation, Barangay Indigency, o litrato ng katanungan
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: '#0B6B3A',
                            background: '#FFFFFF',
                            border: '1px solid #D5E2D9',
                            padding: '6px 12px',
                            borderRadius: '6px',
                          }}
                        >
                          Browse Files
                        </span>
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: '10px',
                          background: '#F0FDF4',
                          border: '1px solid #BBF7D0',
                          fontSize: '11.5px',
                          color: '#166534',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>
                          <i className="fa-solid fa-circle-check mr-1.5" />
                          Maximum of {MAX_FILES} attachments reached.
                        </span>
                        <button
                          type="button"
                          onClick={handleClearFile}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#DC2626',
                            fontWeight: 700,
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Clear All
                        </button>
                      </div>
                    )}

                    {/* Attached Files List */}
                    {selectedFiles.length > 0 && (
                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {selectedFiles.map((item) => {
                          const isPdfFile =
                            item.file.type === 'application/pdf' ||
                            item.file.name.toLowerCase().endsWith('.pdf') ||
                            (item.previewSrc && item.previewSrc.startsWith('data:application/pdf'));

                          return (
                            <div
                              key={item.id}
                              style={{
                                padding: '8px 12px',
                                background: '#FFFFFF',
                                border: '1.5px solid #0B6B3A',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                              }}
                            >
                              {!isPdfFile && item.previewSrc ? (
                                <img
                                  src={item.previewSrc}
                                  alt="Thumbnail"
                                  onClick={() => {
                                    setPreviewSrc(item.previewSrc);
                                    setImageModalOpen(true);
                                  }}
                                  title="Click to view full image"
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    objectFit: 'cover',
                                    borderRadius: '6px',
                                    border: '1px solid #DCE5DF',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                  }}
                                />
                              ) : (
                                <div
                                  onClick={() => {
                                    if (item.previewSrc) {
                                      setPreviewSrc(item.previewSrc);
                                      setImageModalOpen(true);
                                    }
                                  }}
                                  title="Click to preview PDF document"
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '8px',
                                    background: '#FEF2F2',
                                    border: '1px solid #FECACA',
                                    color: '#DC2626',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    flexShrink: 0,
                                    cursor: item.previewSrc ? 'pointer' : 'default',
                                  }}
                                >
                                  <i className="fa-solid fa-file-pdf" />
                                </div>
                              )}
                              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                <div
                                  style={{
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: '#10241A',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {item.file.name}
                                </div>
                                <div style={{ fontSize: '10.5px', color: '#66756B' }}>
                                  {item.file.size > 1024 * 1024
                                    ? `${(item.file.size / (1024 * 1024)).toFixed(2)} MB`
                                    : `${(item.file.size / 1024).toFixed(1)} KB`}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {item.previewSrc && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPreviewSrc(item.previewSrc);
                                      setImageModalOpen(true);
                                    }}
                                    style={{
                                      background: '#E8F5EC',
                                      color: '#0B6B3A',
                                      border: 'none',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      padding: '5px 9px',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    <i className="fa-regular fa-eye" /> View
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSingleFile(item.id)}
                                  style={{
                                    background: '#FEE2E2',
                                    color: '#DC2626',
                                    border: 'none',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '5px 9px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <i className="fa-solid fa-xmark" /> Remove
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="form-privacy-notice text-[11px] text-[#66756B] bg-[#FAFBF8] p-3 rounded-lg border border-[#DCE5DF] mt-2">
                    <i className="fa-solid fa-shield-halved text-[#0B6B3A] mr-1" />
                    <strong>Privacy Notice:</strong> Your information is used strictly to answer your inquiry and will not be shared with unauthorized parties.
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 rounded-lg bg-[#0B6B3A] hover:bg-[#084D2C] text-white font-semibold text-xs transition shadow-sm flex items-center justify-center gap-2"
                    >
                      {submitting ? 'Submitting message...' : 'Send Inquiry Message →'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Office Information */}
              <div className="lg:col-span-5 flex flex-col gap-4 text-left h-full justify-between">
                <div className="clinical-card contact-info-card flex-1 flex flex-col justify-between">
                  <div>
                    <div className="info-header flex items-center justify-between mb-2">
                      <div className="info-icon w-8 h-8 rounded-lg bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center">
                        <i className="fa-solid fa-location-dot" />
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-0.5 bg-[#F5F8F6] text-[#5A7466] rounded-md border border-[#DCE5DF]">Main Center</span>
                    </div>
                    <h3 className="font-bold text-[#10241A] text-sm mb-1">Clinic &amp; Office Address</h3>
                    <p className="text-xs text-[#66756B] leading-relaxed mb-4">
                      Ophthalmological Foundation of the Philippines<br />
                      Eye Center &amp; Ambulatory Surgical Wing<br />
                      Metro Manila, Philippines
                    </p>
                  </div>
                  <div className="info-footer text-[11px] text-[#5A7466] pt-2 border-t border-[#DCE5DF]">
                    <i className="fa-regular fa-clock mr-1" /> Monday – Friday: 8:00 AM – 4:00 PM
                  </div>
                </div>

                <div className="clinical-card contact-info-card flex-1 flex flex-col justify-between">
                  <div>
                    <div className="info-header flex items-center justify-between mb-2">
                      <div className="info-icon w-8 h-8 rounded-lg bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center">
                        <i className="fa-solid fa-phone" />
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-0.5 bg-[#E8F5EC] text-[#0B6B3A] rounded-md">Live Hotline</span>
                    </div>
                    <h3 className="font-bold text-[#10241A] text-sm mb-1">Telephone &amp; Mobile Hotline</h3>
                    <div className="contact-details-list text-xs space-y-1">
                      <div>Social Service Desk: <strong className="text-[#24352B]">(02) 8888-OPHI (6744)</strong></div>
                      <div>Direct Mobile / SMS: <strong className="text-[#24352B]">+63 917 800 2026</strong></div>
                      <div>PhilHealth / Quotations Desk: <span className="text-[#24352B]">Local 104</span></div>
                    </div>
                  </div>
                  <div className="info-footer text-[11px] text-[#0B6B3A] font-semibold pt-2 border-t border-[#DCE5DF]">
                    <i className="fa-solid fa-circle-check mr-1" /> Operating during clinic hours
                  </div>
                </div>

                <div className="clinical-card contact-info-card flex-1 flex flex-col justify-between">
                  <div>
                    <div className="info-header flex items-center justify-between mb-2">
                      <div className="info-icon w-8 h-8 rounded-lg bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center">
                        <i className="fa-solid fa-envelope" />
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-0.5 bg-[#F5F8F6] text-[#5A7466] rounded-md border border-[#DCE5DF]">Electronic Desk</span>
                    </div>
                    <h3 className="font-bold text-[#10241A] text-sm mb-1">Email Correspondence</h3>
                    <div className="contact-details-list text-xs space-y-1">
                      <div>Patient Assistance: <span className="text-[#0B6B3A] font-semibold">assistance@ofphil.org.ph</span></div>
                      <div>Clinical Caseworkers: <span className="text-[#0B6B3A] font-semibold">casework@ofphil.org.ph</span></div>
                      <div>General Secretariat: <span className="text-[#0B6B3A] font-semibold">contact@ofphil.org.ph</span></div>
                    </div>
                  </div>
                  <div className="info-footer text-[11px] text-[#5A7466] pt-2 border-t border-[#DCE5DF]">
                    <i className="fa-solid fa-bolt mr-1 text-[#0B6B3A]" /> Response typically within 24 to 48 business hours
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 7. Public Clinic Footer: Original Bento Grid */}
      <footer className="clinical-footer bg-[#10241A] text-white py-12 border-t border-[#064826]">
        <div className="landing-container">
          <div className="footer-bento-grid grid grid-cols-1 md:grid-cols-3 gap-8 text-xs">
            <div className="footer-bento-card">
              <div className="flex items-center gap-3 mb-3">
                <img src="/icons/ophil-logo.png" alt="OFPHIL Eye Logo" className="h-8 w-auto object-contain" />
                <div>
                  <div className="font-heading font-bold text-base text-white">OFPHIL</div>
                  <div className="text-[11px] text-emerald-100/70">Ophthalmological Foundation of the Philippines</div>
                </div>
              </div>
              <p className="text-emerald-100/80 leading-relaxed">
                Dedicated to eliminating avoidable blindness among indigent patients through accredited clinical social work, direct hospital vouchers, and subsidized eye surgery programs.
              </p>
            </div>

            <div className="footer-bento-card">
              <div className="font-heading font-bold text-sm text-white mb-3">Quick Navigation</div>
              <div className="flex flex-col space-y-2 text-emerald-100/80">
                <a href="#home" className="hover:text-white transition">Home Cover</a>
                <a href="#services" className="hover:text-white transition">Surgical Services &amp; Scope</a>
                <a href="#about" className="hover:text-white transition">Foundation Identity &amp; Mission</a>
                <a href="#doctor" className="hover:text-white transition">Ophthalmic Specialties</a>
                <a href="#contact" className="hover:text-white transition">Patient &amp; Public Inquiry</a>
              </div>
            </div>

            <div className="footer-bento-card">
              <div className="font-heading font-bold text-sm text-white mb-3">Portals &amp; Sign In</div>
              <div className="flex flex-col space-y-2 text-emerald-100/80">
                <Link href="/login-admin" className="hover:text-white transition">Clinic Staff &amp; Administrator Login</Link>
                <Link href="/admin/patient-records" className="text-[#86EFAC] font-semibold hover:underline">Admin Patient Records &rarr;</Link>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-emerald-900/80 text-center text-[11px] text-emerald-100/60">
            &copy; {new Date().getFullYear()} Ophthalmological Foundation of the Philippines (OFPHIL). Registered Non-Profit Clinical Network.
          </div>
        </div>
      </footer>

      {/* Lightbox / Document & Image Viewer Modal */}
      {imageModalOpen && previewSrc && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setImageModalOpen(false)}
        >
          <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setImageModalOpen(false)}
              style={{ position: 'absolute', top: '-14px', right: '-14px', background: '#FFFFFF', color: '#10241A', width: '34px', height: '34px', borderRadius: '50%', border: 'none', fontWeight: 700, fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
            >
              &times;
            </button>
            {previewSrc.startsWith('data:application/pdf') ? (
              <iframe
                src={previewSrc}
                title="PDF Document Preview"
                style={{ width: '85vw', maxWidth: '920px', height: '82vh', borderRadius: '10px', background: '#FFFFFF', border: 'none' }}
              />
            ) : (
              <img
                src={previewSrc}
                alt="Attachment Full View"
                style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: '8px', objectFit: 'contain' }}
              />
            )}
          </div>
        </div>
      )}

      {/* Floating Feedback Toast Notification with Slide-In and Slide-Out Animation */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-[10000] flex items-start gap-3 p-4 rounded-xl border bg-white text-[#24352B] shadow-2xl max-w-sm ${
            toastSuccess ? 'border-[#A7F3D0]' : 'border-red-200'
          } ${toastClosing ? 'animate-toast-slide-out' : 'animate-toast-slide-in'}`}
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 mt-0.5 ${
              toastSuccess ? 'bg-[#E8F5EC] text-[#0B6B3A]' : 'bg-red-50 text-red-600'
            }`}
          >
            <i className={`fa-solid ${toastSuccess ? 'fa-circle-check' : 'fa-circle-exclamation'}`} />
          </div>
          <div className="flex-1 text-xs">
            <div className="font-bold text-sm text-[#24352B] mb-0.5">
              {toastSuccess ? 'Notification' : 'Upload Notice'}
            </div>
            <div className="text-[#66756B] leading-relaxed">{toastMessage}</div>
          </div>
          <button
            type="button"
            onClick={dismissToast}
            className="text-[#66756B] hover:text-[#24352B] p-1 text-sm leading-none cursor-pointer bg-transparent border-0"
            aria-label="Close Notification"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
