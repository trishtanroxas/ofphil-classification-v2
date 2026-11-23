'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';

export type ContactChangeType = 'email' | 'mobile';

export interface SecureContactChangeModalProps {
  isOpen: boolean;
  role: 'patient' | 'msw' | 'admin';
  userId?: string;
  contactType: ContactChangeType;
  currentValue: string;
  initialNewValue?: string;
  onClose: () => void;
  onVerified: (contactType: ContactChangeType, newValue: string) => void;
}

interface PendingContactStorage {
  change_id: string;
  contact_type: ContactChangeType;
  masked_new_destination: string;
  cooldown_until: number;
  expires_at: number;
}

export default function SecureContactChangeModal({
  isOpen,
  role,
  userId,
  contactType,
  currentValue,
  initialNewValue = '',
  onClose,
  onVerified,
}: SecureContactChangeModalProps) {
  const storageKey = `ofphil_pending_contact_change_${role}`;

  const [step, setStep] = useState<'caution' | 'verify'>('caution');
  const [newValue, setNewValue] = useState(initialNewValue);
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [changeId, setChangeId] = useState('');
  const [maskedDest, setMaskedDest] = useState('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(0);
  const [expiresIn, setExpiresIn] = useState(300);

  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Restore pending session on open/refresh if matching role
  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setCurrentPassword('');
    setNewValue(initialNewValue || '');

    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const saved: PendingContactStorage = JSON.parse(raw);
        if (
          saved.change_id &&
          saved.contact_type === contactType &&
          saved.expires_at > Date.now()
        ) {
          setChangeId(saved.change_id);
          setMaskedDest(saved.masked_new_destination);
          setCooldown(Math.max(0, Math.ceil((saved.cooldown_until - Date.now()) / 1000)));
          setExpiresIn(Math.max(0, Math.ceil((saved.expires_at - Date.now()) / 1000)));
          setStep('verify');
          return;
        }
      }
    } catch {
      // Ignore storage errors
    }

    setStep('caution');
    setChangeId('');
    setMaskedDest('');
    setDigits(['', '', '', '', '', '']);
  }, [isOpen, contactType, initialNewValue, storageKey]);

  useEffect(() => {
    if (!isOpen || step !== 'verify') return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
      setExpiresIn((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, step]);

  if (!isOpen) return null;

  const isEmail = contactType === 'email';
  const label = isEmail ? 'Email Address' : 'Mobile Number';

  const savePending = (data: {
    change_id: string;
    masked_new_destination: string;
    resend_cooldown_seconds?: number;
    expires_in_seconds?: number;
  }) => {
    const cd = data.resend_cooldown_seconds || 60;
    const exp = data.expires_in_seconds || 300;
    const payload: PendingContactStorage = {
      change_id: data.change_id,
      contact_type: contactType,
      masked_new_destination: data.masked_new_destination,
      cooldown_until: Date.now() + cd * 1000,
      expires_at: Date.now() + exp * 1000,
    };
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // Ignore
    }
    setCooldown(cd);
    setExpiresIn(exp);
  };

  const clearPending = () => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
  };

  const handleContinueToVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending) return;
    setErrorMsg(null);

    const trimmed = newValue.trim();
    if (!trimmed) {
      setErrorMsg(`Please enter a new ${label.toLowerCase()}.`);
      return;
    }
    if (!currentPassword) {
      setErrorMsg('Please enter your current password to authorize this contact change.');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetchApi('/auth/profile-contact/request-otp', {
        method: 'POST',
        headers: { 'x-user-role': role },
        body: JSON.stringify({
          role,
          user_id: userId,
          contact_type: contactType,
          new_value: trimmed,
          current_password: currentPassword,
        }),
      });

      setChangeId(res.change_id);
      setMaskedDest(res.masked_new_destination);
      setDigits(['', '', '', '', '', '']);
      savePending(res);
      setStep('verify');
      toast.info(res.message);
      setTimeout(() => digitRefs.current[0]?.focus(), 60);
    } catch (err: any) {
      setErrorMsg(
        err?.message || `Unable to send verification code to the new ${label.toLowerCase()}.`
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isSending || !changeId) return;
    setErrorMsg(null);
    setIsSending(true);
    try {
      const res = await fetchApi('/auth/profile-contact/resend-otp', {
        method: 'POST',
        headers: { 'x-user-role': role },
        body: JSON.stringify({ change_id: changeId }),
      });
      setMaskedDest(res.masked_new_destination);
      setDigits(['', '', '', '', '', '']);
      savePending(res);
      toast.success(res.message);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to resend verification code.');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying) return;
    const code = digits.join('');
    if (code.length < 6) {
      setErrorMsg('Please enter all 6 digits of the verification code.');
      return;
    }

    setErrorMsg(null);
    setIsVerifying(true);
    try {
      const res = await fetchApi('/auth/profile-contact/verify', {
        method: 'POST',
        headers: { 'x-user-role': role },
        body: JSON.stringify({
          change_id: changeId,
          otp_code: code,
        }),
      });

      clearPending();
      toast.success(res.message || `Verified ${label.toLowerCase()} updated!`);
      if (Array.isArray(res.notification_warnings) && res.notification_warnings.length > 0) {
        toast.warning(res.notification_warnings[0]);
      }
      onVerified(contactType, res.updated_value);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid or expired verification code.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancelChange = async () => {
    if (changeId && step === 'verify') {
      try {
        await fetchApi('/auth/profile-contact/cancel', {
          method: 'POST',
          headers: { 'x-user-role': role },
          body: JSON.stringify({ change_id: changeId }),
        });
      } catch {
        // Non-blocking
      }
    }
    clearPending();
    onClose();
  };

  const handleDigitChange = (idx: number, val: string) => {
    setErrorMsg(null);
    const clean = val.replace(/\D/g, '');
    if (clean.length > 1) {
      const updated = [...digits];
      for (let i = 0; i < 6; i++) {
        if (i >= idx && clean[i - idx]) {
          updated[i] = clean[i - idx];
        }
      }
      setDigits(updated);
      digitRefs.current[Math.min(5, idx + clean.length)]?.focus();
      return;
    }
    const updated = [...digits];
    updated[idx] = clean;
    setDigits(updated);
    if (clean && idx < 5) {
      digitRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      digitRefs.current[idx - 1]?.focus();
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={handleCancelChange}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full border border-[#D5E2D9] shadow-2xl p-6 text-xs font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'caution' ? (
          <form onSubmit={handleContinueToVerification} className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg border border-amber-200 shrink-0">
                <i className="fa-solid fa-triangle-exclamation" />
              </div>
              <div className="flex-1">
                <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0 leading-tight">
                  Confirm Contact Information Change
                </h3>
                <p className="text-[11.5px] text-[#5A7466] m-0 mt-1 leading-relaxed">
                  You&apos;re about to change the contact information associated with your OFPHIL account. This information is used for account security, password recovery, and verification codes.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancelChange}
                className="text-gray-400 hover:text-gray-600 p-1 border-0 bg-transparent cursor-pointer"
                aria-label="Close modal"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {errorMsg && (
              <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] p-2.5 rounded-xl flex items-start gap-2">
                <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-[#FAFBF8] border border-[#D5E2D9] space-y-1.5">
              <div className="text-[10.5px] font-bold uppercase text-[#5A7466]">
                Current Registered {label}
              </div>
              <div className="font-mono font-semibold text-[#10241A]">
                {currentValue || 'Not currently set'}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#10241A] mb-1">
                New {label} <span className="text-red-500">*</span>
              </label>
              <input
                type={isEmail ? 'email' : 'tel'}
                value={newValue}
                onChange={(e) => {
                  setNewValue(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder={isEmail ? 'e.g. name@gmail.com' : 'e.g. 0917 123 4567'}
                required
                className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#10241A] mb-1">
                Current Account Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Confirm your current password"
                  required
                  className="w-full h-10 px-3.5 pr-10 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F9E96] hover:text-[#10241A] bg-transparent border-0 cursor-pointer"
                >
                  <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
            </div>

            <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl text-[11.5px] text-[#92400E] leading-relaxed">
              <i className="fa-solid fa-shield-halved mr-1.5 text-[#D97706]" />
              To protect your account, we will send a verification code to your new contact information. Your existing contact information will remain active until the new information is successfully verified.
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#EEF2EF]">
              <button
                type="button"
                disabled={isSending}
                onClick={handleCancelChange}
                className="h-10 rounded-xl border border-[#CBD5E1] bg-white text-[#334155] font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="h-10 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] disabled:opacity-65 text-white font-semibold flex items-center justify-center gap-2 transition cursor-pointer border-0"
              >
                {isSending ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Continue to Verification</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#E8F5EC] text-[#0B6B3A] rounded-2xl inline-flex items-center justify-center text-xl border border-[#A7F3D0] mb-2">
                <i className={`fa-solid ${isEmail ? 'fa-envelope-circle-check' : 'fa-mobile-screen-button'}`} />
              </div>
              <h3 className="font-['Outfit'] text-lg font-bold text-[#10241A] m-0 mb-1">
                {isEmail ? 'Verify Your New Email Address' : 'Verify Your New Mobile Number'}
              </h3>
              <p className="text-xs text-[#5A7466] m-0 leading-relaxed">
                {isEmail
                  ? 'We sent a six-digit verification code to your new email address. Please check your inbox or spam folder.'
                  : 'We sent a six-digit verification code to your new mobile number. Please check your SMS messages.'}
              </p>
              <div className="mt-2 inline-block px-3 py-1 rounded-full bg-[#E8F5EC] border border-[#A7F3D0] font-mono font-bold text-[#0B6B3A]">
                {maskedDest}
              </div>
              <div className="text-[11px] text-[#64748B] mt-1.5">
                Code expires in <strong className="text-[#10241A]">{formatTimer(expiresIn)}</strong>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] p-2.5 rounded-xl flex items-start gap-2">
                <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex gap-2 justify-center">
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
                  disabled={isVerifying}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-10 h-12 text-center text-xl font-mono font-bold border border-[#CBD5E1] rounded-xl focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 bg-white text-[#10241A]"
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span>Didn&apos;t receive the code?</span>
              <button
                type="button"
                disabled={cooldown > 0 || isSending}
                onClick={handleResend}
                className="text-[#0B6B3A] font-semibold hover:underline bg-transparent border-0 cursor-pointer p-0 disabled:text-slate-400 disabled:no-underline"
              >
                {isSending
                  ? 'Resending...'
                  : cooldown > 0
                    ? `Resend Code (${cooldown}s)`
                    : 'Resend Code'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#EEF2EF]">
              <button
                type="button"
                disabled={isVerifying}
                onClick={handleCancelChange}
                className="h-11 rounded-xl border border-[#CBD5E1] bg-white text-[#334155] font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel Change
              </button>
              <button
                type="submit"
                disabled={isVerifying || digits.join('').length < 6}
                className="h-11 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] disabled:opacity-65 text-white font-semibold flex items-center justify-center gap-2 transition cursor-pointer border-0"
              >
                {isVerifying ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>{isEmail ? 'Verify Email' : 'Verify Mobile Number'}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
