'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FAFBF8] flex flex-col items-center justify-center p-4 font-sans text-center">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#D5E2D9] shadow-2xl p-8 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-5">
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-[#10241A] mb-2">
            Critical System Error
          </h2>
          <p className="text-xs text-[#5A7466] mb-6">
            A critical error occurred while loading the application core. Please reload the interface or contact system support.
          </p>

          <button
            type="button"
            onClick={() => reset()}
            className="w-full py-2.5 px-5 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white text-xs font-bold border-none cursor-pointer transition shadow-md"
          >
            Reload Interface
          </button>
        </div>
      </body>
    </html>
  );
}
