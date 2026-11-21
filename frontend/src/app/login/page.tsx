'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Eye, Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('researcher@ofphil.org');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState('researcher');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#FAFBF8] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img
            src="/icons/ophil-logo.png"
            alt="OFPHIL Logo"
            className="h-16 w-auto object-contain"
          />
        </div>
        <h2 className="mt-4 text-center text-2xl font-heading font-bold text-[#10241A]">
          OFPHIL Clinical Decision Support
        </h2>
        <p className="mt-1 text-center text-xs text-[#5A7466]">
          Experimental Research Platform (Version 2.0)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-[#D5E2D9] sm:px-10">
          {submitted ? (
            <div className="space-y-4 text-center">
              <div className="inline-flex p-3 rounded-full bg-[#E6F1EA] text-[#0B6B3A]">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="font-heading font-semibold text-lg text-[#10241A]">
                Authenticated Successfully
              </h3>
              <p className="text-xs text-[#5A7466]">
                Signed in as <strong>{role}</strong> ({email})
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex items-center justify-center w-full px-4 py-2.5 rounded-lg bg-[#0B6B3A] text-white text-xs font-semibold hover:bg-[#064826] transition"
              >
                Enter Experimental Workspace <ArrowRight size={14} className="ml-1.5" />
              </Link>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-semibold text-[#10241A] mb-1">
                  Research Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['researcher', 'msw', 'admin'].map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setRole(r)}
                      className={`py-1.5 text-xs font-medium rounded-lg border capitalize transition ${
                        role === r
                          ? 'border-[#0B6B3A] bg-[#E6F1EA] text-[#0B6B3A] font-semibold'
                          : 'border-[#D5E2D9] text-[#5A7466] hover:bg-[#FAFBF8]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#10241A] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5A7466]">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="block w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#D5E2D9] focus:outline-none focus:border-[#0B6B3A] focus:ring-1 focus:ring-[#0B6B3A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#10241A] mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5A7466]">
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="block w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#D5E2D9] focus:outline-none focus:border-[#0B6B3A] focus:ring-1 focus:ring-[#0B6B3A]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center text-[#5A7466]">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-[#D5E2D9] text-[#0B6B3A] focus:ring-[#0B6B3A] mr-2"
                  />
                  Remember session
                </label>
                <span className="text-[#0B6B3A] hover:underline cursor-pointer">
                  Forgot password?
                </span>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-semibold text-white bg-[#0B6B3A] hover:bg-[#064826] focus:outline-none transition"
              >
                Sign In to OFPHIL V2
              </button>

              <div className="mt-4 pt-4 border-t border-[#D5E2D9] text-center">
                <Link
                  href="/"
                  className="text-xs text-[#5A7466] hover:text-[#0B6B3A] inline-flex items-center gap-1"
                >
                  Continue as Guest to Experimental Dashboard <ArrowRight size={12} />
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
