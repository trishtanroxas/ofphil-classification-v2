'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { fetchApi } from '@/lib/api';
import { NumericInput } from '@/components/ui/NumericInput';

interface PasswordRecoveryFlowProps {
  role: 'patient' | 'msw' | 'admin';
}

const ROLE_CONFIG = {
  patient: {
    badgeIcon: 'fa-hospital-user',
    badgeText: 'Patient Beneficiary Portal',
    title: 'Reset Patient Password',
    subtitle:
      'Enter your Patient ID and birthday to verify your identity, then choose Email or SMS to receive your verification code.',
    loginPath: '/login-patient',
  },
  msw: {
    badgeIcon: 'fa-user-doctor',
    badgeText: 'Medical Social Services',
    title: 'Reset MSW Password',
    subtitle:
      'Verify your MSW username or institutional email and choose Email or SMS to receive your verification code.',
    loginPath: '/login-msw',
  },
  admin: {
    badgeIcon: 'fa-user-shield',
    badgeText: 'Clinic Administration & Nursing Staff',
    title: 'Reset Admin Password',
    subtitle:
      'Verify your Administrator username or institutional email and choose Email or SMS to receive your verification code.',
    loginPath: '/login-admin',
  },
};

export default function PasswordRecoveryFlow({ role }: PasswordRecoveryFlowProps) {
  const router = useRouter();
  const cfg = ROLE_CONFIG[role];

  const [identifier, setIdentifier] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [recoveryMethod, setRecoveryMethod] = useState<'email' | 'sms'>('email');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');

  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [dispatchInfo, setDispatchInfo] = useState<{
    recoveryId: string;
    deliveryMethod: 'email' | 'sms';
    maskedDestination: string;
    message: string;
  } | null>(null);

  const [otpInput, setOtpInput] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendRecoveryOtp = async () => {
    setErrorMsg(null);
    setIsSending(true);
    try {
      const data = await fetchApi('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          role,
          identifier: identifier.trim(),
          birthdate: role === 'patient' ? birthdate : undefined,
          recovery_method: recoveryMethod,
          email: recoveryMethod === 'email' ? email.trim() : undefined,
          mobile: recoveryMethod === 'sms' ? mobile.trim() : undefined,
        }),
      });
      setDispatchInfo({
        recoveryId: data.recovery_id,
        deliveryMethod: data.delivery_method,
        maskedDestination: data.masked_destination,
        message: data.message,
      });
      setCooldown(data.resend_cooldown_seconds || 60);
      setOtpInput('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to dispatch verification code. Please check your details and try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending) return;
    await sendRecoveryOtp();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchInfo || isVerifying) return;
    const cleanOtp = otpInput.replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setErrorMsg(null);
    setIsVerifying(true);
    try {
      const res = await fetchApi('/auth/verify-recovery-otp', {
        method: 'POST',
        body: JSON.stringify({
          recovery_id: dispatchInfo.recoveryId,
          otp: cleanOtp,
        }),
      });
      router.push(
        `/reset-password?role=${encodeURIComponent(res.role || role)}&recovery_id=${encodeURIComponent(
          res.recovery_id
        )}&token=${encodeURIComponent(res.reset_token)}`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Verification code is invalid or expired.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E6F1EA] text-[#0B6B3A] rounded-full text-[12.5px] font-semibold mb-3">
          <i className={`fa-solid ${cfg.badgeIcon} text-xs`} />
          <span>{cfg.badgeText}</span>
        </div>

        <h1 className="font-['Outfit'] text-[26px] font-bold text-[#10241A] m-0 mb-1.5 tracking-tight">
          {cfg.title}
        </h1>

        <p className="text-[13.5px] text-[#5A7466] m-0 leading-relaxed">{cfg.subtitle}</p>
      </div>

      {errorMsg && (
        <div className="mb-5 p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs flex items-start gap-2.5">
          <i className="fa-solid fa-circle-exclamation text-sm mt-0.5 shrink-0 text-[#DC2626]" />
          <span className="font-medium leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {dispatchInfo ? (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="p-5 bg-[#E8F5EC] border border-[#0B6B3A]/30 rounded-2xl text-center space-y-3">
            <div className="w-13 h-13 mx-auto rounded-full bg-[#0B6B3A] text-white flex items-center justify-center text-xl shadow-sm">
              <i
                className={`fa-solid ${
                  dispatchInfo.deliveryMethod === 'email' ? 'fa-envelope-circle-check' : 'fa-comment-sms'
                }`}
              />
            </div>

            <div>
              <h2 className="font-['Outfit'] text-lg font-bold text-[#064826] m-0">
                {dispatchInfo.deliveryMethod === 'email'
                  ? 'Verification Email Sent!'
                  : 'SMS Verification Code Sent!'}
              </h2>
              <p className="text-xs text-[#2E4538] mt-1.5 leading-relaxed mb-0">
                {dispatchInfo.message}
              </p>
              <div className="mt-2 inline-block px-3 py-1 rounded-full bg-white border border-[#D5E2D9] font-mono text-xs font-bold text-[#0B6B3A]">
                {dispatchInfo.maskedDestination}
              </div>
            </div>
          </div>

          <div className="saas-input-group">
            <label
              className="saas-input-label block text-[13.5px] font-medium text-[#24352B] mb-1.5"
              htmlFor="otp_code"
            >
              6-Digit Verification Code <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              id="otp_code"
              inputMode="numeric"
              maxLength={6}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit code"
              className="saas-input w-full h-12 px-4 border border-[#D5E2D9] rounded-xl text-center font-mono text-lg tracking-[0.35em] font-bold bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isVerifying || otpInput.length !== 6}
            className="saas-btn-primary w-full h-12 rounded-xl bg-[#0B6B3A] hover:bg-[#084D2C] disabled:opacity-60 text-white text-[15px] font-semibold border-none cursor-pointer flex items-center justify-center gap-2 transition shadow-md"
          >
            {isVerifying ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin text-sm" />
                <span>Verifying Code...</span>
              </>
            ) : (
              <>
                <span>Verify Code</span>
                <i className="fa-solid fa-arrow-right text-xs" />
              </>
            )}
          </button>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs">
            <button
              type="button"
              disabled={cooldown > 0 || isSending}
              onClick={sendRecoveryOtp}
              className="font-semibold text-[#0B6B3A] disabled:text-[#94A3B8] hover:underline bg-transparent border-0 cursor-pointer disabled:cursor-not-allowed p-0"
            >
              {isSending
                ? 'Resending...'
                : cooldown > 0
                  ? `Resend Code (${cooldown}s)`
                  : 'Resend Code'}
            </button>

            <button
              type="button"
              onClick={() => {
                setDispatchInfo(null);
                setErrorMsg(null);
                setOtpInput('');
              }}
              className="text-[#5A7466] hover:text-[#10241A] underline bg-transparent border-0 cursor-pointer p-0"
            >
              Change Recovery Method
            </button>
          </div>

          <div className="text-center pt-1 text-[13px]">
            <Link href={cfg.loginPath} className="text-[#0B6B3A] font-semibold hover:underline no-underline">
              &larr; Back to Sign In
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleRequestSubmit}>
          {/* Role-Specific Identity */}
          <div className="saas-input-group mb-5">
            <label
              className="saas-input-label block text-[13.5px] font-medium text-[#24352B] mb-1.5"
              htmlFor="recovery_identifier"
            >
              {role === 'patient' ? 'Patient ID' : 'Staff Username'}{' '}
              <span className="text-[#DC2626]">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                id="recovery_identifier"
                className={`saas-input w-full h-12 pl-10 pr-4 border border-[#D5E2D9] rounded-xl text-[14.5px] bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition ${
                  role === 'patient' ? 'uppercase' : ''
                }`}
                placeholder={
                  role === 'patient'
                    ? 'e.g. M26-11-00001'
                    : role === 'msw'
                      ? 'e.g. msw_lead'
                      : 'e.g. admin_sys'
                }
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
              <i className="fa-solid fa-id-card-clip absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9E96] text-[15px]" />
            </div>
          </div>

          {role === 'patient' && (
            <div className="saas-input-group mb-5">
              <label
                className="saas-input-label block text-[13.5px] font-medium text-[#24352B] mb-1.5"
                htmlFor="birthdate"
              >
                Date of Birth / Birthday <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  id="birthdate"
                  className="saas-input w-full h-12 pl-10 pr-4 border border-[#D5E2D9] rounded-xl text-[14.5px] bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  required
                />
                <i className="fa-regular fa-calendar-days absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9E96] text-[15px]" />
              </div>
              <div className="text-[11px] text-[#64748B] mt-1">
                Must match the birthday on your registered clinic medical record.
              </div>
            </div>
          )}

          {/* Recovery Method Selector (Both Email and SMS Enabled) */}
          <div className="saas-input-group mb-5">
            <label className="saas-input-label block text-[13.5px] font-medium text-[#24352B] mb-2">
              Choose Recovery Method <span className="text-[#DC2626]">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setRecoveryMethod('email');
                  setErrorMsg(null);
                }}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                  recoveryMethod === 'email'
                    ? 'border-[#0B6B3A] bg-[#E8F5EC] shadow-xs'
                    : 'border-[#D5E2D9] bg-white hover:bg-[#FAFBF8]'
                }`}
              >
                <input
                  type="radio"
                  name="recovery_method"
                  checked={recoveryMethod === 'email'}
                  onChange={() => setRecoveryMethod('email')}
                  className="accent-[#0B6B3A] mt-0.5"
                />
                <div>
                  <div className="text-[13px] font-bold text-[#10241A] flex items-center gap-1.5">
                    <i className="fa-regular fa-envelope text-xs text-[#0B6B3A]" />
                    <span>Email Address</span>
                  </div>
                  <div className="text-[11px] text-[#5A7466] mt-0.5">Send reset code to inbox</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRecoveryMethod('sms');
                  setErrorMsg(null);
                }}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                  recoveryMethod === 'sms'
                    ? 'border-[#0B6B3A] bg-[#E8F5EC] shadow-xs'
                    : 'border-[#D5E2D9] bg-white hover:bg-[#FAFBF8]'
                }`}
              >
                <input
                  type="radio"
                  name="recovery_method"
                  checked={recoveryMethod === 'sms'}
                  onChange={() => setRecoveryMethod('sms')}
                  className="accent-[#0B6B3A] mt-0.5"
                />
                <div>
                  <div className="text-[13px] font-bold text-[#10241A] flex items-center gap-1.5">
                    <i className="fa-solid fa-comment-sms text-xs text-[#0B6B3A]" />
                    <span>SMS / Mobile</span>
                  </div>
                  <div className="text-[11px] text-[#5A7466] mt-0.5">Send code via SMS OTP</div>
                </div>
              </button>
            </div>
          </div>

          {recoveryMethod === 'email' ? (
            <div className="saas-input-group mb-6">
              <label
                className="saas-input-label block text-[13.5px] font-medium text-[#24352B] mb-1.5"
                htmlFor="registered_email"
              >
                Registered Email Address <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="registered_email"
                  className="saas-input w-full h-12 pl-10 pr-4 border border-[#D5E2D9] rounded-xl text-[14.5px] bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                  placeholder="Enter your registered email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <i className="fa-solid fa-at absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9E96] text-[15px]" />
              </div>
              <div className="text-[11px] text-[#64748B] mt-1">
                Must match the registered email address linked to your account.
              </div>
            </div>
          ) : (
            <div className="saas-input-group mb-6">
              <label
                className="saas-input-label block text-[13.5px] font-medium text-[#24352B] mb-1.5"
                htmlFor="registered_mobile"
              >
                Registered Mobile Number <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <NumericInput
                  mode="integer"
                  maxDigits={11}
                  id="registered_mobile"
                  className="saas-input w-full h-12 pl-10 pr-4 border border-[#D5E2D9] rounded-xl text-[14.5px] bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                  placeholder="e.g. 09178881678"
                  value={mobile}
                  onValueChange={(v) => setMobile(v)}
                  required
                />
                <i className="fa-solid fa-mobile-screen absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9E96] text-[15px]" />
              </div>
              <div className="text-[11px] text-[#64748B] mt-1">
                Must match the registered mobile number on your account for SMS OTP delivery.
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSending}
            className="saas-btn-primary w-full h-12 rounded-xl bg-[#0B6B3A] hover:bg-[#084D2C] disabled:opacity-65 text-white text-[15px] font-semibold border-none cursor-pointer flex items-center justify-center gap-2 transition shadow-md disabled:cursor-not-allowed"
          >
            {isSending ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin text-sm" />
                <span>Sending Verification Code...</span>
              </>
            ) : (
              <>
                <span>Send Verification Code</span>
                <i className="fa-solid fa-shield-halved text-xs" />
              </>
            )}
          </button>

          <div className="mt-5 text-center text-[13px] text-[#5A7466]">
            Remember your password?{' '}
            <Link href={cfg.loginPath} className="text-[#0B6B3A] font-semibold hover:underline no-underline">
              Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
