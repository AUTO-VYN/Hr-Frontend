"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { ChevronRight, ChevronsLeft, ChevronsRight, GitBranch } from "lucide-react";
import { PAYROLL_MODULES } from "@/constant/modules";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import { logoutAction } from "@/action/loginAction";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { KeyRound, LogOut } from "lucide-react";
import Swal from "sweetalert2";

export const RAIL_WIDTH = 68;
export const EXPANDED_WIDTH = 258;

function GroupIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as any)[name] || Icons.Folder;
  return <Cmp className={className} />;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCurrentUser() as any;
  const [userState, setUserState] = useState(user);
  const [pinned, setPinned] = useState(false); // persistent expand
  const [hovering, setHovering] = useState(false);
  const [isMultiLocation, setIsMultiLocation] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const expanded = pinned || hovering;
  const initials = (user?.name || "U")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    setUserState(user);
    if (user?.branch && String(user.branch).includes(",")) {
      setIsMultiLocation(true);
    }
  }, [user]);

  const checkAndWarnMultiLocation = () => {
    const isMulti =
      isMultiLocation ||
      (userState?.branch ? String(userState.branch).includes(",") : false);

    if (isMulti) {
      Swal.fire({
        icon: "warning",
        title: "Warning",
        text: "You can't fill employee in multilocation. Please choose single branch.",
        confirmButtonText: "OK",
        confirmButtonColor: "#4338CA",
      }).then((result) => {
        if (result.isConfirmed) {
          router.push("/dashboard");
        }
      });
      return true;
    }
    return false;
  };

  const handleItemClick = (
    e: React.MouseEvent,
    item: { name: string; slug: string }
  ) => {
    const isEmployeeMaster =
      item.slug === "Employee_Master" ||
      item.slug === "employee-master-with-basic-info" ||
      item.slug === "employee-master-mini";

    if (isEmployeeMaster) {
      const isMulti =
        isMultiLocation ||
        (userState?.branch ? String(userState.branch).includes(",") : false);

      if (isMulti) {
        e.preventDefault();
        checkAndWarnMultiLocation();
      }
    }
  };


  return (
    <>
      {/* spacer so page content doesn't sit under the fixed rail */}
      <div style={{ width: RAIL_WIDTH }} className="shrink-0" />

      {/* backdrop on mobile when sidebar is expanded */}
      {expanded && (
        <div
          onClick={() => {
            setPinned(false);
            setHovering(false);
          }}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] sm:hidden"
        />
      )}

      <aside
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        style={{ width: expanded ? EXPANDED_WIDTH : RAIL_WIDTH }}
        className="fixed left-0 top-0 z-40 flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden border-r border-line bg-card transition-[width] duration-150 ease-out shadow-md sm:shadow-none"
      >
        {/* brand */}
        <div
          className={
            "shrink-0 flex items-center gap-2.5 px-3 py-4 " +
            (expanded ? "flex-row" : "flex-col")
          }
        >
          <button
            onClick={() => router.push("/dashboard")}
            className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg bg-brand text-[13px] font-bold text-white"
          >
            HS
          </button>
          {expanded && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-semibold leading-tight text-fg">
                HR Setu
              </div>
              <div className="text-[11px] text-muted">Payroll &amp; HRMS</div>
            </div>
          )}
          <button
            onClick={() => setPinned((p) => !p)}
            title="Collapse / expand"
            className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg border border-line text-muted hover:bg-hoverbg hover:text-fg"
          >
            {pinned ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
          </button>
        </div>

        {/* modules */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 pb-20 overscroll-contain touch-pan-y light-scroll custom-scrollbar">
          {PAYROLL_MODULES.map((group) => {
            const isOpen = openGroup === group.slug;
            const holdsActive = pathname?.includes(`/payroll/${group.slug}/`);
            return (
              <div key={group.slug} className="flex flex-col">
                <button
                  onClick={() => setOpenGroup(isOpen ? null : group.slug)}
                  title={group.name}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-hoverbg"
                  style={{
                    background: isOpen || holdsActive ? "var(--brand-soft)" : "transparent",
                    color: isOpen || holdsActive ? "var(--brand)" : "var(--fg)",
                    fontWeight: isOpen || holdsActive ? 600 : 500,
                  }}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center">
                    <GroupIcon name={group.icon} className="h-6 w-6" />
                  </span>
                  {expanded && (
                    <>
                      <span className="min-w-0 flex-1 truncate">{group.name}</span>
                      <ChevronRight
                        className="h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-150"
                        style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
                      />
                    </>
                  )}
                </button>

                {isOpen && expanded && (
                  <div className="ml-[19px] mt-0.5 mb-2 flex flex-col gap-0.5 border-l border-line pl-[19px]">
                    {group.items.map((item) => {
                      const href = `/payroll/${group.slug}/${item.slug}`;
                      const isActive = pathname === href;
                      return (
                        <Link
                          key={item.slug}
                          href={href}
                          onClick={(e) => handleItemClick(e, item)}
                          className="truncate rounded-md px-2 py-1.5 text-[12.5px] hover:bg-hoverbg hover:text-fg"
                          style={{
                            background: isActive ? "var(--brand-soft)" : "transparent",
                            color: isActive ? "var(--brand)" : "var(--muted)",
                            fontWeight: isActive ? 600 : 400,
                          }}
                        >
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* footer: branch + profile */}
        <div className="shrink-0 flex flex-col gap-1.5 border-t border-line bg-card px-2.5 py-3">
          <button
            type="button"
            onClick={() => setIsMultiLocation((prev) => !prev)}
            className="flex w-full items-center gap-2.5 rounded-lg border border-line px-2.5 py-2 text-left text-[12.5px] font-medium text-fg hover:bg-hoverbg"
          >
            <GitBranch className="h-6 w-6 shrink-0 text-muted" />

            {expanded && (
              <span className="min-w-0 flex-1 truncate">
                {isMultiLocation
                  ? "MultiLocation"
                  : userState?.branchName?.slice(0, 20) || "Branch"}
              </span>
            )}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left hover:bg-hoverbg">
                <span className="grid h-7.5 w-7.5 shrink-0 place-items-center rounded-full border border-line bg-brand-soft text-[11.5px] font-semibold text-brand">
                  {initials}
                </span>

                {expanded && (
                  <span className="flex min-w-0 flex-1 items-center">
                    <span className="truncate text-[12.5px] font-semibold text-fg">
                      {user?.name}
                    </span>

                    <LogOut className="ml-auto h-4.5 w-4.5" />
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent side="top" align="start">
              <Link href="/change">
                <DropdownMenuItem>
                  <KeyRound className="h-4 w-4" />
                  Change Password
                </DropdownMenuItem>
              </Link>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => logoutAction()}>
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
