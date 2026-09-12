
import React from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-bg">
      <Sidebar />
      <div className="flex h-[100dvh] min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="custom-scrollbar min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 py-4 sm:py-5 pb-24 sm:pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}
