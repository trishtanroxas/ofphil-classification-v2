'use client';
import React from 'react';

export interface PasswordStrengthResult {
  score: number; // 0 to 4
  label: 'Too Short' | 'Weak' | 'Medium' | 'Strong' | '';
  color: string;
  bgColor: string;
  borderColor: string;
  checks: {
    length: boolean;
    hasNumber: boolean;
    hasLetter: boolean;
    hasSpecialOrUpper: boolean;
  };
}

export function evaluatePasswordStrength(pwd: string): PasswordStrengthResult {
  if (!pwd) {
    return {
      score: 0,
      label: '',
      color: '#94A3B8',
      bgColor: 'bg-slate-200',
      borderColor: 'border-slate-200',
      checks: { length: false, hasNumber: false, hasLetter: false, hasSpecialOrUpper: false },
    };
  }

  const length = pwd.length >= 6;
  const longEnough = pwd.length >= 8;
  const hasNumber = /[0-9]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasUpper = /[A-Z]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
  const hasLetter = hasLower || hasUpper;
  const hasSpecialOrUpper = hasUpper || hasSpecial;

  if (pwd.length < 6) {
    return {
      score: 1,
      label: 'Too Short',
      color: '#DC2626',
      bgColor: 'bg-red-500',
      borderColor: 'border-red-500',
      checks: { length, hasNumber, hasLetter, hasSpecialOrUpper },
    };
  }

  // Calculate points
  let points = 0;
  if (longEnough) points += 1;
  if (hasNumber) points += 1;
  if (hasLetter) points += 1;
  if (hasSpecialOrUpper) points += 1;

  if (points <= 2) {
    return {
      score: 2,
      label: 'Weak',
      color: '#EA580C', // Orange
      bgColor: 'bg-orange-500',
      borderColor: 'border-orange-500',
      checks: { length, hasNumber, hasLetter, hasSpecialOrUpper },
    };
  } else if (points === 3) {
    return {
      score: 3,
      label: 'Medium',
      color: '#D97706', // Amber/Yellow
      bgColor: 'bg-amber-500',
      borderColor: 'border-amber-500',
      checks: { length, hasNumber, hasLetter, hasSpecialOrUpper },
    };
  } else {
    return {
      score: 4,
      label: 'Strong',
      color: '#0B6B3A', // OFPHIL Deep Green
      bgColor: 'bg-[#0B6B3A]',
      borderColor: 'border-[#0B6B3A]',
      checks: { length, hasNumber, hasLetter, hasSpecialOrUpper },
    };
  }
}

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
  showChecks?: boolean;
}

export default function PasswordStrengthMeter({ password, className = '', showChecks = false }: PasswordStrengthMeterProps) {
  const strength = evaluatePasswordStrength(password);

  if (!password) {
    return null;
  }

  return (
    <div className={`mt-2 space-y-1.5 ${className}`}>
      {/* 4-segment progress bars */}
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4].map((barIndex) => {
          const isActive = strength.score >= barIndex;
          let segmentColor = 'bg-slate-200';
          if (isActive) {
            if (strength.label === 'Too Short' || strength.label === 'Weak') {
              segmentColor = barIndex <= 2 ? (strength.label === 'Too Short' ? 'bg-red-500' : 'bg-orange-500') : 'bg-slate-200';
            } else if (strength.label === 'Medium') {
              segmentColor = barIndex <= 3 ? 'bg-amber-500' : 'bg-slate-200';
            } else if (strength.label === 'Strong') {
              segmentColor = 'bg-[#0B6B3A]';
            }
          }
          return (
            <div
              key={barIndex}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${segmentColor}`}
            />
          );
        })}
      </div>

      {/* Label and Hint */}
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 font-semibold">
          <span className="text-[#5A7466]">Security:</span>
          <span
            className="font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded"
            style={{
              color: strength.color,
              backgroundColor: `${strength.color}15`,
            }}
          >
            {strength.label}
          </span>
        </div>
        <span className="text-[#64748B] text-[10.5px]">
          {strength.label === 'Strong' && '✓ Excellent password security'}
          {strength.label === 'Medium' && 'Add uppercase or symbol for Strong'}
          {strength.label === 'Weak' && 'Add letters, numbers & min 8 chars'}
          {strength.label === 'Too Short' && 'Min 6 characters required'}
        </span>
      </div>

      {showChecks && (
        <div className="grid grid-cols-2 gap-1 pt-1 text-[10px] text-[#64748B]">
          <div className={`flex items-center gap-1 ${strength.checks.length ? 'text-[#0B6B3A] font-semibold' : ''}`}>
            <i className={`fa-solid ${strength.checks.length ? 'fa-check text-emerald-600' : 'fa-circle-dot text-slate-300'}`} />
            <span>6+ characters</span>
          </div>
          <div className={`flex items-center gap-1 ${strength.checks.hasLetter ? 'text-[#0B6B3A] font-semibold' : ''}`}>
            <i className={`fa-solid ${strength.checks.hasLetter ? 'fa-check text-emerald-600' : 'fa-circle-dot text-slate-300'}`} />
            <span>Contains letters</span>
          </div>
          <div className={`flex items-center gap-1 ${strength.checks.hasNumber ? 'text-[#0B6B3A] font-semibold' : ''}`}>
            <i className={`fa-solid ${strength.checks.hasNumber ? 'fa-check text-emerald-600' : 'fa-circle-dot text-slate-300'}`} />
            <span>Contains numbers</span>
          </div>
          <div className={`flex items-center gap-1 ${strength.checks.hasSpecialOrUpper ? 'text-[#0B6B3A] font-semibold' : ''}`}>
            <i className={`fa-solid ${strength.checks.hasSpecialOrUpper ? 'fa-check text-emerald-600' : 'fa-circle-dot text-slate-300'}`} />
            <span>Uppercase or symbol</span>
          </div>
        </div>
      )}
    </div>
  );
}
