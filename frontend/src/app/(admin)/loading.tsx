import React from 'react';

export default function AuthenticatedLoading() {
  return (
    <div className="min-h-screen bg-[#FAFBF8] flex flex-col animate-pulse">
      {/* Topbar Skeleton */}
      <div className="h-[72px] bg-white border-b border-[#EEF2EF] px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg skeleton" />
          <div className="space-y-1.5">
            <div className="w-48 h-4 rounded skeleton" />
            <div className="w-72 h-3 rounded skeleton" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full skeleton" />
          <div className="w-36 h-8 rounded-full skeleton" />
          <div className="w-20 h-8 rounded-lg skeleton" />
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-7">
        {/* Banner Skeleton */}
        <div className="h-32 rounded-2xl skeleton w-full" />

        {/* 4 Cards Bento Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="h-28 rounded-2xl skeleton" />
          <div className="h-28 rounded-2xl skeleton" />
          <div className="h-28 rounded-2xl skeleton" />
          <div className="h-28 rounded-2xl skeleton" />
        </div>

        {/* 3 Action Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-56 rounded-2xl skeleton" />
          <div className="h-56 rounded-2xl skeleton" />
          <div className="h-56 rounded-2xl skeleton" />
        </div>

        {/* Table Skeleton */}
        <div className="h-80 rounded-2xl skeleton w-full" />
      </div>
    </div>
  );
}
