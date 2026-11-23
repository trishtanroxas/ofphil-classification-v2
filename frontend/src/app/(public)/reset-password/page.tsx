'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';
import { fetchApi } from '@/lib/api';

function ResetPasswordFormContent() {
  const searchParams = useSearchParams();
  const roleParam = (searchParams.get('role') || 'patient') as 'patient' | 'msw' | 'admin';
  const recoveryIdParam = searchParams.get('recovery_id') || '';
  const tokenParam = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loginPath, setLoginPath] = useState(
    roleParam === 'admin' ? '/login-admin' : roleParam === 'msw' ? '/login-msw' : '/login-patient'
  );

  const roleTitle =
    roleParam === 'admin'
      ? 'Administrator Account'
      : roleParam === 'msw'
        ? 'MSW Caseworker Account'
        : 'Patient Portal Account';

  const forgotHref = `/forgot-password/${roleParam}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setErrorMsg(null);

    if (!recoveryIdParam || !tokenParam) {
      setErrorMsg('Missing or unverified recovery authorization. Please verify your OTP first.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify both entries.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetchApi('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          recovery_id: recoveryIdParam,
          reset_token: tokenParam,
          new_password: password,
          confirm_password: confirmPassword,
        }),
      });
      if (res?.login_path) setLoginPath(res.login_path);
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update password. Your reset session may have expired.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F1EA] text-[#0B6B3A] text-xs font-semibold mb-2.5">
          <i className="fa-solid fa-shield-halved text-[11px]" />
          <span>{roleTitle} Security</span>
        </div>
        <h1 className="font-['Outfit'] text-[26px] font-bold text-[#10241A] m-0 mb-1.5 tracking-tight">
          Create New Password
        </h1>
        <p className="text-[13.5px] text-[#5A7466] m-0 leading-relaxed">
          Establish a strong password for your OFPHIL {roleTitle.toLowerCase()}.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-5 p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs flex items-start gap-2.5">
          <i className="fa-solid fa-circle-exclamation text-sm mt-0.5 shrink-0 text-[#DC2626]" />
          <span className="font-medium leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {!recoveryIdParam || !tokenParam ? (
        <div className="p-6 bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl text-center space-y-3">
          <div className="font-bold text-sm text-[#92400E]">OTP Verification Required</div>
          <p className="text-xs text-[#92400E] leading-relaxed m-0">
            Please complete identity and OTP verification before setting a new password.
          </p>
          <div className="pt-2">
            <Link
              href={forgotHref}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-[#0B6B3A] hover:bg-[#064826] text-white rounded-xl text-xs font-semibold transition no-underline"
            >
              Go to Password Recovery &rarr;
            </Link>
          </div>
        </div>
      ) : submitted ? (
        <div className="p-6 bg-[#E6F1EA] text-[#0B6B3A] border border-[#B8E0C8] rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-white text-[#0B6B3A] flex items-center justify-center mx-auto text-xl shadow-xs">
            <i className="fa-solid fa-check" />
          </div>
          <div className="font-bold text-base text-[#064826]">Password Updated Successfully</div>
          <p className="text-[13px] text-[#2E4538] leading-relaxed">
            Your new password has been securely hashed and saved. You can now sign in to your OFPHIL {roleTitle.toLowerCase()}.
          </p>
          <div className="pt-2">
            <Link
              href={loginPath}
              className="inline-flex items-center justify-center px-6 py-2.5 bg-[#0B6B3A] hover:bg-[#064826] text-white rounded-xl text-xs font-semibold transition no-underline shadow-sm"
            >
              Sign In Now &rarr;
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} id="resetPasswordForm">
          <div className="saas-input-group mb-5">
            <label
              className="saas-input-label block text-[13.5px] font-medium text-[#24352B] mb-1.5"
              htmlFor="password"
            >
              New Password <span className="text-[#DC2626]">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                className="saas-input w-full h-12 pl-4 pr-10 border border-[#D5E2D9] rounded-xl text-[14.5px] bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none text-[#8F9E96] hover:text-[#10241A] cursor-pointer text-sm"
                aria-label="Toggle password visibility"
              >
                <i className={showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'} />
              </button>
            </div>
            <PasswordStrengthMeter password={password} showChecks={true} />
          </div>

          <div className="saas-input-group mb-6">
            <label
              className="saas-input-label block text-[13.5px] font-medium text-[#24352B] mb-1.5"
              htmlFor="confirm_password"
            >
              Confirm New Password <span className="text-[#DC2626]">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirm_password"
                name="confirm_password"
                className="saas-input w-full h-12 pl-4 pr-10 border border-[#D5E2D9] rounded-xl text-[14.5px] bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none text-[#8F9E96] hover:text-[#10241A] cursor-pointer text-sm"
                aria-label="Toggle confirm password visibility"
              >
                <i className={showConfirmPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="saas-btn-primary w-full h-12 rounded-xl bg-[#0B6B3A] hover:bg-[#084D2C] disabled:opacity-65 text-white text-[15px] font-semibold border-none cursor-pointer flex items-center justify-center gap-2 transition shadow-md disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin text-sm" />
                <span>Saving New Password...</span>
              </>
            ) : (
              <>
                <span>Save New Password</span>
                <i className="fa-solid fa-check text-xs" />
              </>
            )}
          </button>

          <div className="mt-5 text-center text-[13px] text-[#5A7466]">
            <Link href={loginPath} className="text-[#0B6B3A] font-semibold hover:underline no-underline">
              &larr; Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAFBF8] text-xs font-semibold text-[#5A7466]">
          Loading password reset...
        </div>
      }
    >
      <ResetPasswordFormContent />
    </Suspense>
  );
}
