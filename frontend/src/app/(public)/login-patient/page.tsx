'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useLoadingScreen } from '@/context/LoadingScreenContext';

export default function LoginPatientPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { showLoading } = useLoadingScreen();

  const [patientId, setPatientId] = useState('M26-11-00001');
  const [birthdate, setBirthdate] = useState('1978-05-15');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showLoading('Authenticating patient credentials and preparing security code verification...');
    login('patient');
    setTimeout(() => {
      window.location.replace('/verify-otp?role=patient');
    }, 200);
  };

  return (
    <AuthLayout>
      {/* Role Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E6F1EA] text-[#0B6B3A] rounded-full text-[12.5px] font-semibold mb-3">
          <i className="fa-solid fa-hospital-user text-xs" />
          <span>Patient Beneficiary Portal</span>
        </div>

        <h1 className="font-['Outfit'] text-[26px] font-bold text-[#10241A] m-0 mb-1.5 tracking-tight">
          Patient Portal Sign In
        </h1>

        <p className="text-[13.5px] text-[#5A7466] m-0 leading-relaxed">
          Sign in with your assigned Patient ID, birthdate, and password to view your charity assistance status and documents.
        </p>
      </div>

      <form onSubmit={handleSubmit} id="patientLoginForm">
        {/* 1. Patient ID Input */}
        <div className="saas-input-group mb-5">
          <label className="saas-input-label block text-[13.5px] font-medium text-[#24352B] mb-1.5" htmlFor="patient_id">
            Patient ID <span className="text-[#DC2626]">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              id="patient_id"
              name="patient_id"
              className="saas-input w-full h-12 pl-10 pr-4 border border-[#D5E2D9] rounded-xl text-[14.5px] bg-white text-[#10241A] uppercase focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
              placeholder="e.g. M26-10-0001"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              required
            />
            <i className="fa-solid fa-id-card-clip absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9E96] text-[15px]" />
          </div>
          <div className="text-[11px] text-[#64748B] mt-1">
            Provided on your official clinic intake confirmation slip.
          </div>
        </div>

        {/* 2. Date of Birth Input */}
        <div className="saas-input-group mb-5">
          <label className="saas-input-label block text-[13.5px] font-medium text-[#24352B] mb-1.5" htmlFor="birthdate">
            Date of Birth <span className="text-[#DC2626]">*</span>
          </label>
          <div className="relative">
            <input
              type="date"
              id="birthdate"
              name="birthdate"
              className="saas-input w-full h-12 pl-10 pr-4 border border-[#D5E2D9] rounded-xl text-[14.5px] bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              required
            />
            <i className="fa-regular fa-calendar-days absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9E96] text-[15px]" />
          </div>
        </div>

        {/* 3. Password Input */}
        <div className="saas-input-group mb-5">
          <div className="flex justify-between items-center mb-1.5">
            <label className="saas-input-label block text-[13.5px] font-medium text-[#24352B] m-0" htmlFor="password">
              Password <span className="text-[#DC2626]">*</span>
            </label>
            <Link
              href="/forgot-password/patient"
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

        {/* Sign In Button */}
        <button
          type="submit"
          className="saas-btn-primary w-full h-12 rounded-xl bg-[#0B6B3A] hover:bg-[#084D2C] text-white text-[15px] font-semibold border-none cursor-pointer flex items-center justify-center gap-2.5 transition shadow-md"
        >
          <span>Continue to Verification</span>
          <i className="fa-solid fa-arrow-right text-xs" />
        </button>
      </form>

      {/* Patient Notice */}
      <div className="mt-6 p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[12.5px] text-[#64748B] text-center leading-relaxed">
        <i className="fa-solid fa-user-nurse text-[#0B6B3A] mr-1" />
        <strong>Need a Patient Account?</strong> New patient accounts are issued exclusively by authorized clinic nurses or intake staff during hospital check-in.
        <div className="mt-1">
          <Link href="/#contact" className="text-[#0B6B3A] font-semibold hover:underline no-underline">
            Contact Clinic Desk &rarr;
          </Link>
        </div>
      </div>

      <div className="mt-5 text-center text-[12px] text-[#8F9E96] flex items-center justify-center gap-3">
        <span>Are you hospital staff?</span>
        <Link href="/login-msw" className="text-[#0B6B3A] font-semibold hover:underline">
          MSW Login
        </Link>
        <span>&bull;</span>
        <Link href="/login-admin" className="text-[#0B6B3A] font-semibold hover:underline">
          Admin Login
        </Link>
      </div>
    </AuthLayout>
  );
}
