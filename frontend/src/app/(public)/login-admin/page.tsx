'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useLoadingScreen } from '@/context/LoadingScreenContext';

export default function LoginAdminPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { showLoading } = useLoadingScreen();

  const [username, setUsername] = useState('admin_sys');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showLoading('Authenticating administrative credentials and preparing security code verification...');
    login('admin');
    setTimeout(() => {
      window.location.href = '/verify-otp?role=admin';
    }, 200);
  };

  return (
    <AuthLayout>
      {/* Role Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E6F1EA] text-[#0B6B3A] rounded-full text-[12.5px] font-semibold mb-3">
          <i className="fa-solid fa-user-shield text-xs" />
          <span>Clinic Administration &amp; Nursing Staff</span>
        </div>

        <h1 className="font-['Outfit'] text-[26px] font-bold text-[#10241A] m-0 mb-1.5 tracking-tight">
          Staff &amp; Admin Sign In
        </h1>

        <p className="text-[13.5px] text-[#5A7466] m-0 leading-relaxed">
          Sign in with your staff username and credentials to access clinic master registries, patient intake, and administrative governance.
        </p>
      </div>

      <form onSubmit={handleSubmit} id="adminLoginForm">
        {/* Username Input */}
        <div className="saas-input-group mb-5">
          <label className="saas-input-label block text-[13.5px] font-medium text-[#24352B] mb-1.5" htmlFor="username">
            Admin / Nurse Username <span className="text-[#DC2626]">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              id="username"
              name="username"
              className="saas-input w-full h-12 pl-10 pr-4 border border-[#D5E2D9] rounded-xl text-[14.5px] bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
              placeholder="e.g. admin_sys"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <i className="fa-regular fa-user absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9E96] text-[15px]" />
          </div>
        </div>

        {/* Password Input */}
        <div className="saas-input-group mb-5">
          <div className="flex justify-between items-center mb-1.5">
            <label className="saas-input-label block text-[13.5px] font-medium text-[#24352B] m-0" htmlFor="password">
              Password <span className="text-[#DC2626]">*</span>
            </label>
            <Link
              href="/forgot-password/admin"
              className="text-[12.5px] text-[#0B6B3A] hover:underline font-semibold no-underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              className="saas-input w-full h-12 pl-10 pr-10 border border-[#D5E2D9] rounded-xl text-[14.5px] bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
              placeholder="Enter your account password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <i className="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9E96] text-[14px]" />
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

        {/* Remember me */}
        <div className="flex items-center justify-between mb-5 text-[13px]">
          <label className="flex items-center gap-2 cursor-pointer text-[#334A3E]">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="accent-[#0B6B3A] w-4 h-4 rounded"
            />
            <span>Remember me on this workstation</span>
          </label>
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          className="saas-btn-primary w-full h-12 rounded-xl bg-[#0B6B3A] hover:bg-[#084D2C] text-white text-[15px] font-semibold border-none cursor-pointer flex items-center justify-center gap-2.5 transition shadow-md"
        >
          <span>Sign In to Admin Portal</span>
          <i className="fa-solid fa-arrow-right text-xs" />
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-[#EEF2EF] text-center text-[12px] text-[#8F9E96] flex items-center justify-center gap-3">
        <Link href="/login-patient" className="text-[#0B6B3A] font-semibold hover:underline">
          Patient Portal
        </Link>
        <span>&bull;</span>
        <Link href="/login-msw" className="text-[#0B6B3A] font-semibold hover:underline">
          MSW Caseworker Login
        </Link>
      </div>
    </AuthLayout>
  );
}
