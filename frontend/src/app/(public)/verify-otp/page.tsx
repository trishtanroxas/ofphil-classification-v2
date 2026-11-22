'use client';
import React, { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { useAuth, UserRole } from '@/context/AuthContext';
import { useLoadingScreen } from '@/context/LoadingScreenContext';
import { fetchApi } from '@/lib/api';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role') as UserRole | null;
  const { role, login } = useAuth();
  const { showLoading } = useLoadingScreen();
  // Derive effective role prioritizing explicit query param over context or storage
  const [effectiveRole, setEffectiveRole] = useState<UserRole>(roleParam || role || 'patient');
  const [pendingSession, setPendingSession] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('ofphil_pending_2fa');
      if (!raw) {
        // No authenticated credentials step -> redirect to login immediately
        const target =
          roleParam === 'admin'
            ? '/login-admin'
            : roleParam === 'msw'
              ? '/login-msw'
              : '/login-patient';
        window.location.replace(target);
        return;
      }
      const data = JSON.parse(raw);
      setPendingSession(data);
      if (data.role) setEffectiveRole(data.role as UserRole);
      if (data.contact_display) setContactDisplay(data.contact_display);
    } catch (e) {
      window.location.replace('/login-patient');
    }
  }, [roleParam]);

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [demoCode] = useState('123456');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [contactDisplay, setContactDisplay] = useState('0917 *** *678');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Fetch privacy masking policy to respect "Mask patient mobile contact numbers"
  useEffect(() => {
    async function checkContactMasking() {
      try {
        const priv = await fetchApi('/admin/settings/privacy', {
          headers: { 'x-user-role': 'admin', 'x-user-id': 'admin_sys' },
        });
        if (priv && priv.masking_rules) {
          const isMasked = priv.masking_rules.mask_contact_numbers ?? true;
          setContactDisplay(isMasked ? '0917 *** *678' : '0917 888 1678');
        }
      } catch (e) {
        // Fallback to default
        setContactDisplay('0917 *** *678');
      }
    }
    checkContactMasking();
  }, []);

  const handleDigitChange = (index: number, val: string) => {
    setErrorMessage(null);
    const clean = val.replace(/[^0-9]/g, '');
    const updated = [...digits];
    updated[index] = clean ? clean[clean.length - 1] : '';
    setDigits(updated);

    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleAutoFill = () => {
    setErrorMessage(null);
    const arr = demoCode.split('');
    setDigits(arr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = digits.join('');

    // Strict Validation: Must be 6 digits and must match the security code
    if (!enteredCode || enteredCode.length < 6) {
      setErrorMessage('Missing verification details. Please enter all 6 digits.');
      return;
    }

    if (!pendingSession || !pendingSession.session_id) {
      setErrorMessage('Two-Factor Authentication session expired. Please sign in again.');
      return;
    }

    try {
      showLoading('Verifying Two-Factor Authentication security code...');
      const res = await fetchApi('/auth/verify-2fa', {
        method: 'POST',
        body: JSON.stringify({
          session_id: pendingSession.session_id,
          otp_code: enteredCode,
          role: effectiveRole,
        }),
      });

      if (res && res.status === 'authenticated') {
        sessionStorage.removeItem('ofphil_pending_2fa');
        sessionStorage.removeItem('ofphil_logged_out');
        login(res.role || effectiveRole, res.user_name);
        window.location.replace(res.redirect_url);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid 6-digit security code. Please check and try again.');
    }
  };

  const handleReturnToSignIn = () => {
    try {
      sessionStorage.removeItem('ofphil_pending_2fa');
      localStorage.removeItem('ofphil_current_role');
      sessionStorage.setItem('ofphil_logged_out', 'true');
    } catch (e) {}
    const target =
      effectiveRole === 'patient'
        ? '/login-patient'
        : effectiveRole === 'msw'
          ? '/login-msw'
          : '/login-admin';
    window.location.replace(target);
  };

  return (
    <AuthLayout>
      {/* Top Error Alert Banner matching user screenshot */}
      {errorMessage && (
        <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl p-3.5 mb-5 flex items-center gap-2.5 text-xs text-[#991B1B] shadow-xs">
          <div className="w-5 h-5 rounded-full bg-[#EF4444] text-white flex items-center justify-center shrink-0 font-bold text-[10px]">
            !
          </div>
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      <div className="text-center mb-5">
        <div className="w-13 h-13 bg-[#ECFDF5] text-[#0B6B3A] rounded-2xl inline-flex items-center justify-center text-2xl border border-[#A7F3D0] mb-3">
          <i className="fa-solid fa-shield-halved" />
        </div>
        <h1 className="font-['Outfit'] text-2xl font-bold text-[#10241A] m-0 mb-1.5 tracking-tight">
          Two-Factor Authentication
        </h1>
        <p className="text-[13.5px] text-[#5A7466] m-0 leading-relaxed">
          Please enter the 6-digit one-time PIN sent to your verified contact method:<br />
          <strong className="text-[#0B6B3A] text-[14.5px] tracking-wide">{contactDisplay}</strong>
        </p>
      </div>

      {/* Simulation / Demo Code Display Banner */}
      <div
        onClick={handleAutoFill}
        title="Click to auto-fill code"
        className="bg-[#F0FDF4] border border-dashed border-[#86EFAC] text-[#166534] p-3 rounded-xl mb-5 flex items-center justify-between cursor-pointer hover:bg-[#DCFCE7] transition text-xs"
      >
        <span>
          <i className="fa-solid fa-wand-magic-sparkles mr-1.5 text-[#0B6B3A]" />
          Security Code: <strong>{demoCode}</strong>
        </span>
        <span className="font-bold underline text-[11.5px]">Auto-Fill &rarr;</span>
      </div>

      <form onSubmit={handleSubmit} id="verifyOtpForm">
        {/* 6 Digit Input Grid */}
        <div className="flex gap-2.5 justify-center mb-6">
          {digits.map((d, idx) => (
            <input
              key={idx}
              ref={(el) => { inputRefs.current[idx] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-2xl font-mono font-bold border rounded-xl focus:outline-none focus:ring-2 bg-white text-[#10241A] transition ${
                errorMessage && !d
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                  : 'border-[#CBD5E1] focus:border-[#0B6B3A] focus:ring-[#0B6B3A]/15'
              }`}
            />
          ))}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="saas-btn-primary w-full h-12 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white text-[15px] font-semibold border-none cursor-pointer flex items-center justify-center gap-2.5 transition shadow-md"
        >
          <span>Verify Code &amp; Complete Sign In</span>
          <i className="fa-solid fa-arrow-right text-xs" />
        </button>
      </form>

      {/* Footer links */}
      <div className="flex justify-between items-center mt-5 text-[12.5px] text-[#64748B]">
        <span>Didn&apos;t receive your code?</span>
        <button
          type="button"
          onClick={handleAutoFill}
          className="text-[#0B6B3A] font-semibold hover:underline bg-transparent border-none cursor-pointer p-0"
        >
          <i className="fa-solid fa-rotate-right mr-1" /> Resend Security Code
        </button>
      </div>

      <div className="mt-5 text-center text-[12.5px]">
        <button
          type="button"
          onClick={handleReturnToSignIn}
          className="text-[#64748B] hover:text-[#10241A] bg-transparent border-0 cursor-pointer p-0 text-[12.5px]"
        >
          <i className="fa-solid fa-arrow-left mr-1" /> Return to Sign In
        </button>
      </div>
    </AuthLayout>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading security check...</div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}
