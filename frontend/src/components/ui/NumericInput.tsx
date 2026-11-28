'use client';

import React, { forwardRef, useState } from 'react';

/**
 * Strict numeric input used for every numeric / monetary field in the app.
 *
 * - `mode="integer"`  → digits 0–9 only (Age, Contact Number, counts, settings).
 *                        Leading zeros are kept (Philippine mobile numbers start with 0).
 * - `mode="currency"` → digits plus one decimal point, capped at `maxDecimals` (default 2),
 *                        displayed with thousand-separator commas (12500.5 → "12,500.5").
 *
 * The parent always receives a clean string with no commas through `onValueChange`
 * (e.g. "12500.50"), so `Number(value)` keeps working for totals, scoring and API payloads.
 * Pre-filled values (numbers or strings, even ones already containing commas) are
 * sanitized and formatted on render.
 *
 * Letters (including e/E), signs and symbols are removed synchronously inside the change
 * event — typing and pasting are both covered — and the caret position is preserved.
 */

export type NumericInputMode = 'integer' | 'currency';

export function sanitizeNumeric(input: unknown, mode: NumericInputMode = 'currency', maxDecimals = 2): string {
  const s = input === null || input === undefined ? '' : String(input);
  if (mode === 'integer') return s.replace(/\D/g, '');

  let out = '';
  let seenDot = false;
  let decimals = 0;
  for (const ch of s) {
    if (ch >= '0' && ch <= '9') {
      if (seenDot) {
        if (decimals >= maxDecimals) continue;
        decimals += 1;
      }
      out += ch;
    } else if (ch === '.' && !seenDot && maxDecimals > 0) {
      seenDot = true;
      out += ch;
    }
  }
  out = out.replace(/^0+(?=\d)/, ''); // "007" → "7", keeps "0" and "0.5"
  if (out.startsWith('.')) out = `0${out}`;
  return out;
}

export function formatThousands(raw: string): string {
  if (!raw) return '';
  const [intPart, decPart] = raw.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return raw.includes('.') ? `${grouped}.${decPart ?? ''}` : grouped;
}

/** Parse a possibly comma-formatted amount into a number (NaN-safe → 0). */
export function parseAmount(value: unknown): number {
  const n = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

type NativeProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'inputMode' | 'min' | 'max' | 'maxLength'
>;

export interface NumericInputProps extends NativeProps {
  value: string | number | null | undefined;
  onValueChange: (raw: string) => void;
  mode?: NumericInputMode;
  /** Currency only: max digits after the decimal point. */
  maxDecimals?: number;
  /** Max number of digits (integer mode) or integer-part digits (currency mode). */
  maxDigits?: number;
  /** Values above `max` are clamped while typing. */
  max?: number;
  /** Values below `min` are raised to `min` on blur (not while typing). */
  min?: number;
  /** Comma grouping; defaults to true for currency, false for integer. */
  groupThousands?: boolean;
}

export const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(function NumericInput(
  {
    value,
    onValueChange,
    mode = 'currency',
    maxDecimals = 2,
    maxDigits,
    max,
    min,
    groupThousands,
    onBlur,
    ...rest
  },
  ref
) {
  const group = groupThousands ?? mode === 'currency';

  const clean = (input: unknown): string => {
    let raw = sanitizeNumeric(input, mode, maxDecimals);
    if (maxDigits !== undefined) {
      if (mode === 'integer') {
        raw = raw.slice(0, maxDigits);
      } else {
        const [i, d] = raw.split('.');
        raw = i.slice(0, maxDigits) + (raw.includes('.') ? `.${d ?? ''}` : '');
      }
    }
    if (max !== undefined && raw !== '' && Number(raw) > max) raw = String(max);
    return raw;
  };

  const display = (raw: string) => (group ? formatThousands(raw) : raw);

  // Last raw text typed by the user. Parents that keep a *number* in state turn "12." or
  // "12.50" into 12 / 12.5; while the parent's value still equals the draft numerically we
  // keep showing the draft so decimals (and an emptied field) can be typed naturally.
  const [draft, setDraft] = useState<string | null>(null);
  const fromParent = clean(value);
  const useDraft =
    draft !== null &&
    draft !== fromParent &&
    mode === 'currency' &&
    Number(draft || 0) === Number(fromParent || 0);
  const shown = display(useDraft ? (draft as string) : fromParent);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const typed = el.value;
    const caret = el.selectionStart ?? typed.length;

    const raw = clean(typed);
    const formatted = display(raw);

    // Number of significant characters (digits / dot) left of the caret after cleaning.
    const significantBefore = clean(typed.slice(0, caret)).length;
    let pos = 0;
    let seen = 0;
    while (pos < formatted.length && seen < significantBefore) {
      if (formatted[pos] !== ',') seen += 1;
      pos += 1;
    }

    // Rewrite synchronously so rejected characters never render, then restore the caret.
    el.value = formatted;
    try {
      el.setSelectionRange(pos, pos);
    } catch {
      /* some input states do not support selection */
    }
    setDraft(raw);
    onValueChange(raw);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setDraft(null);
    const raw = clean(value);
    if (raw.endsWith('.')) onValueChange(raw.slice(0, -1));
    else if (min !== undefined && raw !== '' && Number(raw) < min) onValueChange(String(min));
    onBlur?.(e);
  };

  return (
    <input
      {...rest}
      ref={ref}
      type="text"
      inputMode={mode === 'integer' ? 'numeric' : 'decimal'}
      autoComplete={rest.autoComplete ?? 'off'}
      value={shown}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
});

export default NumericInput;
