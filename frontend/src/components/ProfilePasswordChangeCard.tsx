'use client';

import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';
import { fetchApi } from '@/lib/api';

export interface ProfilePasswordChangeCardProps {
  role: 'patient' | 'msw' | 'admin';
  userId?: string;
  defaultEmail?: string;
  defaultMobile?: string;
  title?: string;
  subtitle?: string;
  onSuccess?: () => void;
}

export default function ProfilePasswordChangeCard({
  role,
  userId,
  defaultEmail,
  defaultMobile,
  title = 'Change My Portal Password',
  subtitle = 'Maintain strong credentials to protect sensitive ophthalmology patient records, consultation schedules, and clinical logs.',
  onSuccess,
}: ProfilePasswordChangeCardProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'sms'>('email');
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);

  // OTP Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [maskedDestination, setMaskedDestination] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleGeneratePassword = () => {
    const chars = 'abcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '@';
    for (let i = 0; i < 9; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
    setConfirmPassword(pwd);
    toast.success('Generated secure password');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error('Please enter your existing account password.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    setIsRequestingOtp(true);
    try {
      const res = await fetchApi('/auth/profile-password/request-otp', {
        method: 'POST',
        body: JSON.stringify({
          role,
          user_id: userId,
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
          method: deliveryMethod,
        }),
      });

      if (res && res.status === 'otp_sent') {
        setSessionId(res.session_id);
        setMaskedDestination(res.masked_destination);
        setSecurityCode(res.security_code || '');
        setDigits(['', '', '', '', '', '']);
        setModalError(null);
        setResendCooldown(60);
        setIsModalOpen(true);
        toast.info(res.message || `Verification code sent via ${deliveryMethod.toUpperCase()}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify current password or dispatch OTP.');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    setModalError(null);
    const clean = val.replace(/[^0-9]/g, '');
    const updated = [...digits];
    updated[index] = clean ? clean[clean.length - 1] : '';
    setDigits(updated);

    if (clean && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  };

  const handleAutoFill = () => {
    if (securityCode && securityCode.length === 6) {
      setDigits(securityCode.split(''));
      setModalError(null);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isRequestingOtp) return;
    setIsRequestingOtp(true);
    try {
      const res = await fetchApi('/auth/profile-password/request-otp', {
        method: 'POST',
        body: JSON.stringify({
          role,
          user_id: userId,
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
          method: deliveryMethod,
        }),
      });
      if (res && res.status === 'otp_sent') {
        setSessionId(res.session_id);
        setSecurityCode(res.security_code || '');
        setResendCooldown(60);
        toast.success(`New security code dispatched to ${res.masked_destination}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend security code.');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < 6) {
      setModalError('Please enter all 6 digits.');
      return;
    }

    setIsVerifying(true);
    setModalError(null);
    try {
      const res = await fetchApi('/auth/profile-password/confirm', {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId,
          otp_code: code,
        }),
      });

      if (res && res.success) {
        toast.success('Account password updated & Argon2id hashed successfully!');
        setIsModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setModalError(err.message || 'Invalid or expired 6-digit security code.');
    } finally {
      setIsVerifying(false);
    }
  };

  const emailDisplay = defaultEmail || (role === 'patient' ? 'tan1925alex@gmail.com' : role === 'msw' ? 'maria.santos@ofphil.org.ph' : 'admin.updated@ofphil.org.ph');
  const mobileDisplay = defaultMobile || (role === 'patient' ? '0917 888 1678' : role === 'msw' ? '0918 555 1234' : '0917 888 1678');

  return (
    <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-6">
      {/* Header */}
      <div className="mb-4">
        <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] mb-1 flex items-center gap-2">
          <i className="fa-solid fa-key text-[#0B6B3A]" />
          <span>{title}</span>
        </h3>
        <p className="text-xs text-[#5A7466] m-0">{subtitle}</p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
        {/* Current Password */}
        <div>
          <label className="block font-semibold text-[#10241A] mb-1">
            Current Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showCurrentPass ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your existing account password"
              required
              className="w-full h-10 px-3.5 pr-10 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPass(!showCurrentPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F9E96] hover:text-[#10241A] bg-transparent border-0 cursor-pointer text-xs"
              aria-label="Toggle password visibility"
            >
              <i className={`fa-regular ${showCurrentPass ? 'fa-eye-slash' : 'fa-eye'}`} />
            </button>
          </div>
        </div>

        {/* New Password & Confirm Password */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <div>
            <label className="block font-semibold text-[#10241A] mb-1">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPass ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                className="w-full h-10 px-3.5 pr-10 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F9E96] hover:text-[#10241A] bg-transparent border-0 cursor-pointer text-xs"
                aria-label="Toggle password visibility"
              >
                <i className={`fa-regular ${showNewPass ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
            <PasswordStrengthMeter password={newPassword} showChecks={true} />
          </div>

          <div>
            <label className="block font-semibold text-[#10241A] mb-1">
              Confirm New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                className="w-full h-10 px-3.5 pr-10 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F9E96] hover:text-[#10241A] bg-transparent border-0 cursor-pointer text-xs"
                aria-label="Toggle password visibility"
              >
                <i className={`fa-regular ${showConfirmPass ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
            {confirmPassword.length > 0 && (
              <div
                className={`mt-1.5 text-[11px] font-semibold flex items-center gap-1.5 ${
                  newPassword === confirmPassword ? 'text-[#0B6B3A]' : 'text-[#DC2626]'
                }`}
              >
                <i
                  className={`fa-solid ${
                    newPassword === confirmPassword ? 'fa-circle-check' : 'fa-circle-xmark'
                  }`}
                />
                <span>
                  {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Verification Method Picker (Email vs Mobile Number) */}
        <div className="pt-2">
          <label className="block font-semibold text-[#10241A] mb-1.5">
            Security OTP Delivery Option <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                deliveryMethod === 'email'
                  ? 'border-[#0B6B3A] bg-[#E8F5EC]/50 ring-1 ring-[#0B6B3A]'
                  : 'border-[#CBD5E1] bg-white hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name={`otp_method_${role}`}
                value="email"
                checked={deliveryMethod === 'email'}
                onChange={() => setDeliveryMethod('email')}
                className="accent-[#0B6B3A] mt-0.5"
              />
              <div>
                <div className="font-semibold text-xs text-[#10241A] flex items-center gap-1.5">
                  <i className="fa-solid fa-envelope text-[#0B6B3A]" />
                  <span>Email Address</span>
                </div>
                <div className="text-[11px] text-[#5A7466] mt-0.5">
                  Send OTP to: <strong className="text-[#10241A]">{emailDisplay}</strong>
                </div>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                deliveryMethod === 'sms'
                  ? 'border-[#0B6B3A] bg-[#E8F5EC]/50 ring-1 ring-[#0B6B3A]'
                  : 'border-[#CBD5E1] bg-white hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name={`otp_method_${role}`}
                value="sms"
                checked={deliveryMethod === 'sms'}
                onChange={() => setDeliveryMethod('sms')}
                className="accent-[#0B6B3A] mt-0.5"
              />
              <div>
                <div className="font-semibold text-xs text-[#10241A] flex items-center gap-1.5">
                  <i className="fa-solid fa-mobile-screen text-[#0B6B3A]" />
                  <span>SMS / Mobile</span>
                </div>
                <div className="text-[11px] text-[#5A7466] mt-0.5">
                  Send OTP via SMS: <strong className="text-[#10241A]">{mobileDisplay}</strong>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-3 border-t border-[#EEF2EF] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleGeneratePassword}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#334155] transition cursor-pointer"
          >
            <i className="fa-solid fa-key text-xs text-[#0B6B3A]" />
            <span>Generate Secure Password</span>
          </button>

          <button
            type="submit"
            disabled={isRequestingOtp}
            className="ml-auto px-5 py-2.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] disabled:opacity-65 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer border-0 disabled:cursor-not-allowed"
          >
            {isRequestingOtp ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                <span>Requesting OTP...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-shield-halved text-[11px]" />
                <span>Verify OTP &amp; Update Password</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Interactive OTP Verification Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#D5E2D9] animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-[#E8F5EC] text-[#0B6B3A] rounded-2xl inline-flex items-center justify-center text-xl border border-[#A7F3D0] mb-2">
                <i className="fa-solid fa-shield-halved" />
              </div>
              <h4 className="font-['Outfit'] text-lg font-bold text-[#10241A] m-0 mb-1">
                Authorize Password Change
              </h4>
              <p className="text-xs text-[#5A7466] m-0 leading-relaxed">
                Enter the 6-digit one-time PIN sent to your registered{' '}
                <strong className="text-[#0B6B3A]">{deliveryMethod === 'email' ? 'Email' : 'Mobile'}</strong>:
                <br />
                <span className="font-semibold text-[#10241A]">{maskedDestination}</span>
              </p>
            </div>

            {/* Auto-fill banner for fast demo/testing */}
            {securityCode && (
              <div
                onClick={handleAutoFill}
                title="Click to auto-fill security code"
                className="bg-[#F0FDF4] border border-dashed border-[#86EFAC] text-[#166534] p-2.5 rounded-xl mb-4 flex items-center justify-between cursor-pointer hover:bg-[#DCFCE7] transition text-xs"
              >
                <span>
                  <i className="fa-solid fa-wand-magic-sparkles mr-1.5 text-[#0B6B3A]" />
                  Code: <strong>{securityCode}</strong>
                </span>
                <span className="font-bold underline text-[11px]">Auto-Fill &rarr;</span>
              </div>
            )}

            {modalError && (
              <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs p-2.5 rounded-xl mb-4 flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmOtp} className="space-y-4">
              {/* 6 Digit Input Grid */}
              <div className="flex gap-2 justify-center mb-2">
                {digits.map((d, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      digitRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-10 h-12 text-center text-xl font-mono font-bold border border-[#CBD5E1] rounded-xl focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 bg-white text-[#10241A]"
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-[#64748B] pt-1">
                <span>Didn&apos;t receive it?</span>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || isRequestingOtp}
                  onClick={handleResendOtp}
                  className="text-[#0B6B3A] font-semibold hover:underline bg-transparent border-0 cursor-pointer p-0 disabled:text-slate-400 disabled:no-underline"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Security Code'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full h-11 rounded-xl border border-[#CBD5E1] text-[#334155] font-semibold text-xs hover:bg-slate-50 transition bg-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full h-11 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] disabled:opacity-65 text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer border-0 shadow-sm"
                >
                  {isVerifying ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Confirm Change</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
