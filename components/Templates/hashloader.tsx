"use client";

import React from "react";

export default function HashloaderComponent({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/20">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
    </div>
  );
}
