'use client';
import React, { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { useAuth, UserRole } from '@/context/AuthContext';
import { useLoadingScreen } from '@/context/LoadingScreenContext';
import { fetchApi } from '@/lib/api';

type DeliveryMethod = 'email' | 'sms';

interface MethodOption {
  method: DeliveryMethod;
  available: boolean;
  masked_destination?: string | null;
  reason?: string | null;
}

interface Pending2FASession {
  session_id: string;
  role: UserRole;
  user_id: string;
  user_name: string;
  available_methods?: MethodOption[];
  has_verified_contact?: boolean;
  step?: 'select' | 'verify';
  delivery_method?: DeliveryMethod;
  masked_destination?: string;
  cooldown_until?: number;
}

function VerifyOtpContent() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role') as UserRole | null;
  const { role, login } = useAuth();
  const { showLoading } = useLoadingScreen();

  const [effectiveRole, setEffectiveRole] = useState<UserRole>(roleParam || role || 'patient');
  const [pendingSession, setPendingSession] = useState<Pending2FASession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const [step, setStep] = useState<'select' | 'verify'>('select');
  const [selectedMethod, setSelectedMethod] = useState<DeliveryMethod>('email');
  const [maskedDestination, setMaskedDestination] = useState<string>('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);

  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('ofphil_pending_2fa');
      if (!raw) {
        const target =
          roleParam === 'admin'
            ? '/login-admin'
            : roleParam === 'msw'
              ? '/login-msw'
              : '/login-patient';
        window.location.replace(target);
        return;
      }
      const data: Pending2FASession = JSON.parse(raw);
      if (!data.session_id) {
        window.location.replace('/login-patient');
        return;
      }

      setPendingSession(data);
      if (data.role) setEffectiveRole(data.role);

      const methods = data.available_methods || [];
      if (data.delivery_method) {
        setSelectedMethod(data.delivery_method);
      } else {
        const firstAvailable = methods.find((m) => m.available);
        if (firstAvailable) {
          setSelectedMethod(firstAvailable.method);
        }
      }

      if (data.step === 'verify' && data.delivery_method && data.masked_destination) {
        setStep('verify');
        setMaskedDestination(data.masked_destination);
      }

      if (data.cooldown_until && data.cooldown_until > Date.now()) {
        setCooldown(Math.ceil((data.cooldown_until - Date.now()) / 1000));
      }

      setIsHydrated(true);
    } catch {
      window.location.replace('/login-patient');
    }
  }, [roleParam]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const persistPendingState = (patch: Partial<Pending2FASession>) => {
    try {
      const raw = sessionStorage.getItem('ofphil_pending_2fa');
      const current = raw ? JSON.parse(raw) : pendingSession || {};
      const updated = { ...current, ...patch };
      sessionStorage.setItem('ofphil_pending_2fa', JSON.stringify(updated));
      setPendingSession(updated);
    } catch {
      // Ignore storage errors
    }
  };

  const methods = pendingSession?.available_methods || [];
  const emailOption = methods.find((m) => m.method === 'email');
  const smsOption = methods.find((m) => m.method === 'sms');
  const hasVerifiedContact =
    pendingSession?.has_verified_contact ?? methods.some((m) => m.available);

  const selectedOption = methods.find((m) => m.method === selectedMethod);
  const canSendSelected = Boolean(selectedOption?.available);

  const handleSendOtp = async (methodToSend: DeliveryMethod = selectedMethod) => {
    if (isSending || !pendingSession?.session_id) return;
    const option = methods.find((m) => m.method === methodToSend);
    if (!option?.available) {
      setErrorMessage(
        option?.reason || 'The selected delivery method is not available for this account.'
      );
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setIsSending(true);

    try {
      const res = await fetchApi('/auth/2fa/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          session_id: pendingSession.session_id,
          delivery_method: methodToSend,
        }),
      });

      const cooldownSec = res.resend_cooldown_seconds || 60;
      const cooldownUntil = Date.now() + cooldownSec * 1000;

      setSelectedMethod(res.delivery_method);
      setMaskedDestination(res.masked_destination);
      setStep('verify');
      setDigits(['', '', '', '', '', '']);
      setCooldown(cooldownSec);
      setStatusMessage(
        step === 'verify'
          ? `A new 6-digit security code has been sent to ${res.masked_destination}.`
          : null
      );

      persistPendingState({
        step: 'verify',
        delivery_method: res.delivery_method,
        masked_destination: res.masked_destination,
        cooldown_until: cooldownUntil,
      });

      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 50);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Unable to send security code at this time. Please try again.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    setErrorMessage(null);
    const clean = val.replace(/[^0-9]/g, '');
    if (clean.length > 1) {
      const pasted = clean.slice(0, 6).split('');
      const updated = [...digits];
      for (let i = 0; i < 6; i++) {
        if (i >= index && pasted[i - index]) {
          updated[i] = pasted[i - index];
        }
      }
      setDigits(updated);
      const nextFocus = Math.min(5, index + pasted.length);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    const updated = [...digits];
    updated[index] = clean;
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

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedText) return;
    e.preventDefault();
    setErrorMessage(null);
    const updated = ['', '', '', '', '', ''];
    for (let i = 0; i < pastedText.length; i++) {
      updated[i] = pastedText[i];
    }
    setDigits(updated);
    const focusIdx = Math.min(5, pastedText.length - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying) return;

    const enteredCode = digits.join('');
    if (!enteredCode || enteredCode.length < 6) {
      setErrorMessage('Please enter all 6 digits of your security code.');
      return;
    }

    if (!pendingSession?.session_id) {
      setErrorMessage('Two-Factor Authentication session expired. Please sign in again.');
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setIsVerifying(true);

    try {
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
        showLoading('Two-Factor Authentication verified. Opening portal...');
        window.location.replace(res.redirect_url);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Invalid or expired 6-digit security code. Please check and try again.'
      );
      setIsVerifying(false);
    }
  };

  const handleReturnToSignIn = () => {
    try {
      sessionStorage.removeItem('ofphil_pending_2fa');
      localStorage.removeItem('ofphil_current_role');
      sessionStorage.setItem('ofphil_logged_out', 'true');
    } catch {
      // Ignore
    }
    const target =
      effectiveRole === 'patient'
        ? '/login-patient'
        : effectiveRole === 'msw'
          ? '/login-msw'
          : '/login-admin';
    window.location.replace(target);
  };

  const recoveryPath =
    effectiveRole === 'patient'
      ? '/forgot-password/patient'
      : effectiveRole === 'msw'
        ? '/forgot-password/msw'
        : '/forgot-password/admin';

  if (!isHydrated) {
    return (
      <AuthLayout>
        <div className="py-12 text-center text-sm text-[#5A7466]">
          <i className="fa-solid fa-circle-notch fa-spin text-[#0B6B3A] mr-2" />
          Loading Two-Factor Authentication...
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      {errorMessage && (
        <div
          role="alert"
          className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl p-3.5 mb-5 flex items-start gap-2.5 text-xs text-[#991B1B] shadow-xs"
        >
          <div className="w-5 h-5 rounded-full bg-[#EF4444] text-white flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">
            !
          </div>
          <span className="font-medium leading-relaxed">{errorMessage}</span>
        </div>
      )}

      {statusMessage && !errorMessage && (
        <div
          role="status"
          className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-3.5 mb-5 flex items-start gap-2.5 text-xs text-[#065F46] shadow-xs"
        >
          <i className="fa-solid fa-circle-check text-[#0B6B3A] text-sm mt-0.5 shrink-0" />
          <span className="font-medium leading-relaxed">{statusMessage}</span>
        </div>
      )}

      <div className="text-center mb-5">
        <div className="w-13 h-13 bg-[#ECFDF5] text-[#0B6B3A] rounded-2xl inline-flex items-center justify-center text-2xl border border-[#A7F3D0] mb-3">
          <i className="fa-solid fa-shield-halved" />
        </div>
        <h1 className="font-['Outfit'] text-2xl font-bold text-[#10241A] m-0 mb-1.5 tracking-tight">
          Two-Factor Authentication
        </h1>

        {step === 'select' ? (
          <p className="text-[13.5px] text-[#5A7466] m-0 leading-relaxed">
            Choose where to receive your 6-digit security verification code.
          </p>
        ) : (
          <p className="text-[13.5px] text-[#5A7466] m-0 leading-relaxed">
            {selectedMethod === 'email'
              ? 'Enter the 6-digit one-time PIN sent to your verified email address.'
              : 'Enter the 6-digit one-time PIN sent to your verified mobile number.'}
            <br />
            <strong className="text-[#0B6B3A] text-[14.5px] tracking-wide inline-block mt-1">
              {maskedDestination}
            </strong>
          </p>
        )}
      </div>

      {step === 'select' ? (
        <div className="space-y-4">
          {!hasVerifiedContact ? (
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4 text-xs text-[#92400E] leading-relaxed">
              <div className="font-bold mb-1 flex items-center gap-1.5">
                <i className="fa-solid fa-triangle-exclamation text-[#D97706]" />
                <span>No Verified Contact Method Available</span>
              </div>
              <p className="m-0 mb-2">
                Your account does not currently have a verified email address or mobile number on file for Two-Factor Authentication.
              </p>
              <Link
                href={recoveryPath}
                className="text-[#0B6B3A] font-semibold hover:underline no-underline"
              >
                Use Account Recovery or Contact Clinic Administrator &rarr;
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* A. Email Verification */}
                <button
                  type="button"
                  disabled={!emailOption?.available || isSending}
                  onClick={() => {
                    setSelectedMethod('email');
                    setErrorMessage(null);
                  }}
                  aria-pressed={selectedMethod === 'email'}
                  className={`p-4 rounded-xl border text-left transition flex flex-col justify-between gap-2 min-h-[124px] ${
                    !emailOption?.available
                      ? 'border-[#E2E8F0] bg-[#F8FAFC] opacity-60 cursor-not-allowed'
                      : selectedMethod === 'email'
                        ? 'border-[#0B6B3A] bg-[#E8F5EC] ring-2 ring-[#0B6B3A]/15 cursor-pointer shadow-xs'
                        : 'border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] cursor-pointer'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 w-full">
                    <div className="w-9 h-9 rounded-lg bg-white border border-[#D5E2D9] text-[#0B6B3A] flex items-center justify-center shrink-0">
                      <i className="fa-regular fa-envelope text-base" />
                    </div>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        selectedMethod === 'email' && emailOption?.available
                          ? 'border-[#0B6B3A] bg-[#0B6B3A]'
                          : 'border-[#CBD5E1] bg-white'
                      }`}
                    >
                      {selectedMethod === 'email' && emailOption?.available && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                  </div>
                  <div>
                    <div className="text-[13.5px] font-bold text-[#10241A]">Email Address</div>
                    <div className="text-[12px] font-mono font-semibold text-[#0B6B3A] mt-0.5 break-all">
                      {emailOption?.available
                        ? emailOption.masked_destination
                        : 'Not verified on file'}
                    </div>
                    <div className="text-[11.5px] text-[#5A7466] mt-1 leading-snug">
                      Receive your security code through your registered email.
                    </div>
                  </div>
                </button>

                {/* B. SMS / Mobile Verification */}
                <button
                  type="button"
                  disabled={!smsOption?.available || isSending}
                  onClick={() => {
                    setSelectedMethod('sms');
                    setErrorMessage(null);
                  }}
                  aria-pressed={selectedMethod === 'sms'}
                  className={`p-4 rounded-xl border text-left transition flex flex-col justify-between gap-2 min-h-[124px] ${
                    !smsOption?.available
                      ? 'border-[#E2E8F0] bg-[#F8FAFC] opacity-60 cursor-not-allowed'
                      : selectedMethod === 'sms'
                        ? 'border-[#0B6B3A] bg-[#E8F5EC] ring-2 ring-[#0B6B3A]/15 cursor-pointer shadow-xs'
                        : 'border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] cursor-pointer'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 w-full">
                    <div className="w-9 h-9 rounded-lg bg-white border border-[#D5E2D9] text-[#0B6B3A] flex items-center justify-center shrink-0">
                      <i className="fa-solid fa-mobile-screen-button text-base" />
                    </div>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        selectedMethod === 'sms' && smsOption?.available
                          ? 'border-[#0B6B3A] bg-[#0B6B3A]'
                          : 'border-[#CBD5E1] bg-white'
                      }`}
                    >
                      {selectedMethod === 'sms' && smsOption?.available && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                  </div>
                  <div>
                    <div className="text-[13.5px] font-bold text-[#10241A]">SMS / Mobile</div>
                    <div className="text-[12px] font-mono font-semibold text-[#0B6B3A] mt-0.5">
                      {smsOption?.available
                        ? smsOption.masked_destination
                        : 'Not verified on file'}
                    </div>
                    <div className="text-[11.5px] text-[#5A7466] mt-1 leading-snug">
                      Receive your security code through your registered mobile number.
                    </div>
                  </div>
                </button>
              </div>

              <button
                type="button"
                disabled={!canSendSelected || isSending}
                onClick={() => handleSendOtp(selectedMethod)}
                className="saas-btn-primary w-full h-12 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] disabled:opacity-65 text-white text-[15px] font-semibold border-none cursor-pointer flex items-center justify-center gap-2.5 transition shadow-md disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin text-sm" />
                    <span>Sending Security Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send Security Code</span>
                    <i className="fa-solid fa-paper-plane text-xs" />
                  </>
                )}
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} id="verifyOtpForm">
            {/* 6 Digit Input Grid */}
            <div className="flex gap-2 sm:gap-2.5 justify-center mb-6">
              {digits.map((d, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  aria-label={`Security code digit ${idx + 1}`}
                  value={d}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={handlePaste}
                  disabled={isVerifying}
                  className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-mono font-bold border rounded-xl focus:outline-none focus:ring-2 bg-white text-[#10241A] transition ${
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
              disabled={isVerifying || isSending || digits.join('').length < 6}
              className="saas-btn-primary w-full h-12 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] disabled:opacity-65 text-white text-[15px] font-semibold border-none cursor-pointer flex items-center justify-center gap-2.5 transition shadow-md disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-sm" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Verify Code &amp; Complete Sign In</span>
                  <i className="fa-solid fa-arrow-right text-xs" />
                </>
              )}
            </button>
          </form>

          {/* Resend & Change Method */}
          <div className="flex flex-wrap justify-between items-center gap-2 mt-5 text-[12.5px] text-[#64748B]">
            <span>Didn&apos;t receive your code?</span>
            <button
              type="button"
              disabled={cooldown > 0 || isSending || isVerifying}
              onClick={() => handleSendOtp(selectedMethod)}
              className="text-[#0B6B3A] disabled:text-[#94A3B8] font-semibold hover:underline bg-transparent border-none cursor-pointer disabled:cursor-not-allowed p-0"
            >
              <i className={`fa-solid ${isSending ? 'fa-circle-notch fa-spin' : 'fa-rotate-right'} mr-1`} />
              {isSending
                ? 'Sending Security Code...'
                : cooldown > 0
                  ? `Resend Security Code (${cooldown}s)`
                  : 'Resend Security Code'}
            </button>
          </div>

          {methods.filter((m) => m.available).length > 1 && (
            <div className="mt-3 text-center">
              <button
                type="button"
                disabled={isSending || isVerifying}
                onClick={() => {
                  setStep('select');
                  setErrorMessage(null);
                  setStatusMessage(null);
                  persistPendingState({ step: 'select' });
                }}
                className="text-[12px] text-[#0B6B3A] font-medium hover:underline bg-transparent border-0 cursor-pointer p-0"
              >
                <i className="fa-solid fa-sliders mr-1" /> Choose a Different Delivery Method
              </button>
            </div>
          )}
        </>
      )}

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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading security check...
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
