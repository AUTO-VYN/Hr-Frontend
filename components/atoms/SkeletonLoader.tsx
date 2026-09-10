import React from "react";

export default function SkeletonLoader() {
  return (
    <div className="w-full space-y-5 animate-pulse">
      {/* 1. Page Header Skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-6 w-44 rounded-md bg-hoverbg" />
          <div className="h-3.5 w-64 rounded-md bg-hoverbg" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-24 rounded-lg bg-hoverbg" />
          <div className="h-8 w-28 rounded-lg bg-brand/20" />
        </div>
      </div>

      {/* 2. Top Stats / Action Cards Skeleton */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex h-20 flex-col justify-between rounded-xl border border-line bg-card p-3.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-20 rounded bg-hoverbg" />
              <div className="h-5 w-5 rounded-full bg-hoverbg" />
            </div>
            <div className="h-5 w-24 rounded bg-hoverbg" />
          </div>
        ))}
      </div>

      {/* 3. Main Content Skeleton (Form / Table Container) */}
      <div className="rounded-xl border border-line bg-card p-5 shadow-sm space-y-4">
        {/* Toolbar Skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div className="h-8 w-56 rounded-lg bg-hoverbg" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-20 rounded-lg bg-hoverbg" />
            <div className="h-8 w-20 rounded-lg bg-hoverbg" />
            <div className="h-8 w-24 rounded-lg bg-hoverbg" />
          </div>
        </div>

        {/* Content Rows / Grid Placeholder */}
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5, 6, 7].map((row) => (
            <div
              key={row}
              className="flex items-center justify-between gap-4 border-b border-line/60 py-2.5 last:border-0"
            >
              <div className="h-4 w-1/4 rounded bg-hoverbg" />
              <div className="h-4 w-1/5 rounded bg-hoverbg" />
              <div className="h-4 w-1/6 rounded bg-hoverbg" />
              <div className="h-4 w-1/6 rounded bg-hoverbg" />
              <div className="h-4 w-12 rounded bg-hoverbg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { SkeletonLoader };
