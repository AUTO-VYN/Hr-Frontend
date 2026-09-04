
import React from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg">
      <Sidebar />
      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="custom-scrollbar min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
