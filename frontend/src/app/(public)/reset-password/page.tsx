'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import AuthLayout from '@/components/AuthLayout';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Passwords do not match. Please verify both entries.');
      return;
    }
    setSubmitted(true);
  };

  return (
    <AuthLayout>
      <div className="mb-6">
        <h1 className="font-['Outfit'] text-[26px] font-bold text-[#10241A] m-0 mb-1.5 tracking-tight">
          Set Up Your Password
        </h1>
        <p className="text-[13.5px] text-[#5A7466] m-0 leading-relaxed">
          Establish a secure permanent password for your OFPHIL Patient Portal account.
        </p>
      </div>

      {submitted ? (
        <div className="p-6 bg-[#E6F1EA] text-[#0B6B3A] border border-[#B8E0C8] rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-white text-[#0B6B3A] flex items-center justify-center mx-auto text-xl shadow-xs">
            <i className="fa-solid fa-check" />
          </div>
          <div className="font-bold text-base text-[#064826]">Password Updated Successfully</div>
          <p className="text-[13px] text-[#2E4538] leading-relaxed">
            Your new permanent password has been saved. You can now sign in to your OFPHIL account.
          </p>
          <div className="pt-2">
            <Link
              href="/login-patient"
              className="inline-flex items-center justify-center px-6 py-2.5 bg-[#0B6B3A] hover:bg-[#064826] text-white rounded-xl text-xs font-semibold transition no-underline shadow-sm"
            >
              Sign In Now &rarr;
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} id="resetPasswordForm">
          {/* Verification Code / Token */}
          <div className="saas-input-group mb-5">
            <label className="saas-input-label block text-[13.5px] font-medium text-[#24352B] mb-1.5" htmlFor="code">
              Verification Code / Token <span className="text-[#DC2626]">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                id="code"
                name="token"
                className="saas-input w-full h-12 pl-4 pr-4 border border-[#D5E2D9] rounded-xl text-[14.5px] bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                placeholder="Paste activation token or verification code"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            </div>
          </div>

          {/* New Password */}
          <div className="saas-input-group mb-5">
            <label className="saas-input-label block text-[13.5px] font-medium text-[#24352B] mb-1.5" htmlFor="password">
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
                <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="saas-input-group mb-6">
            <label className="saas-input-label block text-[13.5px] font-medium text-[#24352B] mb-1.5" htmlFor="confirm_password">
              Confirm New Password <span className="text-[#DC2626]">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirm_password"
                name="confirm_password"
                className="saas-input w-full h-12 pl-4 pr-10 border border-[#D5E2D9] rounded-xl text-[14.5px] bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                placeholder="Re-type new password"
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
                <i className={`fa-regular ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="saas-btn-primary w-full h-12 rounded-xl bg-[#0B6B3A] hover:bg-[#084D2C] text-white text-[15px] font-semibold border-none cursor-pointer flex items-center justify-center gap-2.5 transition shadow-md"
          >
            <span>Activate Account &amp; Save Password</span>
            <i className="fa-solid fa-check text-xs" />
          </button>
        </form>
      )}

      <div className="mt-6 text-center text-[13.5px] text-[#5A7466]">
        Return to login?{' '}
        <Link href="/login-patient" className="text-[#0B6B3A] font-semibold hover:underline no-underline">
          Back to Sign In
        </Link>
      </div>
    </AuthLayout>
  );
}
