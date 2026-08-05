"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Building,
  MapPin,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Wallet,
  Fingerprint,
  Users,
  TrendingUp,
  CalendarDays,
} from "lucide-react";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import { fetchBranch } from "@/action/branch";
import { logoutAction } from "@/action/loginAction";
import ThemeToggle from "@/components/theme/ThemeToggle";
import ReleaseNotesDialog from "@/components/shared/ReleaseNotesDialog";

type Company = {
  Comp_Code: string | number;
  Comp_Name: string;
  branch: { label: string; value: string | number }[];
};

const STATS = [
  {
    label: "Payroll overview",
    value: "₹48,75,000",
    note: "July 2026 · finalised",
    icon: Wallet,
    fg: "#7DD3FC",
    tint: "rgba(41,171,226,.18)",
  },
  {
    label: "Total employees",
    value: "1,248",
    note: "across 23 branches",
    icon: Users,
    fg: "#FBBF24",
    tint: "rgba(245,158,11,.18)",
  },
  {
    label: "Leave requests",
    value: "23",
    note: "awaiting approval",
    icon: CalendarDays,
    fg: "#34D399",
    tint: "rgba(16,185,129,.18)",
  },
];

const PEOPLE: Array<{
  initials: string;
  name: string;
  status: string;
  fg: string;
  delay: string;
  dur: string;
}> = [
  { initials: "RS", name: "Rahul Sharma", status: "Present · 09:02", fg: "#34D399", delay: ".3s", dur: "7.5s" },
  { initials: "PK", name: "Priya Kulkarni", status: "On leave · CL", fg: "#FBBF24", delay: ".42s", dur: "6.8s" },
  { initials: "AV", name: "Amit Verma", status: "Present · 08:47", fg: "#34D399", delay: ".54s", dur: "7.2s" },
];

const FEATURES = [
  { icon: Wallet, label: "Payroll Automation" },
  { icon: Fingerprint, label: "Attendance Tracking" },
  { icon: Users, label: "Employee Management" },
  { icon: TrendingUp, label: "Performance Insights" },
  { icon: ShieldCheck, label: "Compliance Ready" },
];

const BranchCom = () => {
  const router = useRouter();
  const { data: session, update } = useSession();
  const user = useCurrentUser() as any;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [compCode, setCompCode] = useState<string>("");
  const [query, setQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<{ label: string; value: string | number } | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [err, setErr] = useState("");
  const loadedOnce = useRef(false);

  useEffect(() => {
    if (!user || loadedOnce.current) return;
    loadedOnce.current = true;
    loadCompanies();
  }, [user]);

  const loadCompanies = async () => {
    setIsFetching(true);
    try {
      const response = await fetchBranch(user);
      const data: Company[] = response?.data || [];
      setCompanies(data);
      if (data[0]) setCompCode(String(data[0].Comp_Code));
    } catch (err) {
      setErr("Couldn't load your branches. Please try again.");
    } finally {
      setIsFetching(false);
    }
  };

  const selectedCompany = companies.find((c) => String(c.Comp_Code) === String(compCode));
  const branches = selectedCompany?.branch || [];
  const filtered = branches.filter((b) =>
    `${b.value} ${b.label}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  const enter = async () => {
    if (!selectedBranch) {
      setErr("Select the branch you are working in — attendance and payroll screens open scoped to it.");
      return;
    }
    setIsNavigating(true);
    try {
      await update({
        ...session,
        user: {
          ...session?.user,
          branch: selectedBranch.value,
          branchName: selectedBranch.label,
        },
      });
      router.push(user?.shortcuts?.login || "/dashboard");
    } catch (err) {
      setIsNavigating(false);
    }
  };

  const inputWrap =
    "flex items-center gap-2.5 rounded-[10px] border border-line bg-field px-3 focus-within:border-brand";
  const inputEl =
    "flex-1 min-w-0 border-none bg-transparent text-fg fluid-text-sm py-[clamp(4px,1vh,10px)] outline-none placeholder:text-muted";
  const labelEl = "fluid-text-xs font-semibold uppercase tracking-wide text-muted";

  return (
    <div
      data-shell="1"
      // FIX: removed !overflow-hidden and max-h-[100vh] so zoom pe page scroll ho sake
      className="fluid-shell grid w-full bg-bg lg:grid-cols-[40%_60%] overflow-x-hidden"
    >
      {/* LEFT */}
      <section
        data-formside="1"
        className="fluid-panel flex h-full min-h-0 min-w-0 flex-col items-center justify-center fluid-gap-md"
        style={{
          background:
            "radial-gradient(700px 420px at 20% 0%, var(--brand-soft), transparent 62%), var(--bg)",
        }}
      >
        <div
          data-glass="1"
          className="fluid-p-md fluid-gap-sm animate-[risein_.4s_ease_both] flex min-h-0 w-full max-w-[390px] flex-col rounded-2xl border border-line bg-glass shadow-card backdrop-blur-xl"
        >
          <div className="flex flex-col items-center text-center">
            <img
              data-logo="1"
              src="/HR_Setu_Logo.png"
              alt="HR Setu"
              className="max-w-[82%] dark:hidden h-[150px] -mt-6"
            />
            <img
              data-logo="1"
              src="/HR_Setu_Logo_Dark.png"
              alt="HR Setu"
              className="max-w-[82%] dark:block hidden h-[150px] -mt-6"
            />
            <p className="fluid-text-xs font-medium text-muted -mt-6">
              HR &amp; Payroll Software Built for Auto Dealerships
            </p>
            <div className="mt-[clamp(4px,1vh,8px)] h-[2px] w-12 rounded-full bg-brand" />
          </div>

          <div className="h-px bg-line -mt-1.5" />

          <div>
            <h1 data-heading="1" className="fluid-text-xl font-semibold tracking-tight text-fg">
              {isFetching ? "Loading..." : selectedCompany?.Comp_Name || "Pick your branch"}
            </h1>
            <p data-subline="1" className="fluid-text-xs text-muted">
              Your company code decides which database opens, so check it before signing in.
            </p>
          </div>

          {err && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-[11px] border border-danger-border bg-danger-bg px-3.5 py-[clamp(6px,1.2vh,10px)]"
            >
              <div className="mt-0.5 fluid-text-xs text-danger-fg">{err}</div>
            </div>
          )}

          <div className="flex flex-col fluid-gap-sm">
            <label className="flex flex-col gap-1.5">
              <span className={labelEl}>Company name</span>
              <span className={inputWrap}>
                <Building className="h-4 w-4 shrink-0 text-muted" />
                <select
                  value={compCode}
                  onChange={(e) => {
                    setCompCode(e.target.value);
                    setSelectedBranch(null);
                    setQuery("");
                  }}
                  className={inputEl + " cursor-pointer appearance-none"}
                >
                  {companies.map((c) => (
                    <option key={c.Comp_Code} value={c.Comp_Code}>
                      {c.Comp_Name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelEl}>Branch location</span>
              <span className={inputWrap}>
                <MapPin className="h-4 w-4 shrink-0 text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search branch by name or code"
                  className={inputEl}
                />
              </span>
            </label>

            <div
              role="listbox"
              className="branch-scroll flex max-h-[clamp(100px,18vh,170px)] flex-col gap-1.5 overflow-y-auto rounded-[11px] border border-line bg-sub p-1.5"
            >
              {isFetching && (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                  <span className="text-xs font-medium">Loading branches...</span>
                </div>
              )}

              {!isFetching &&
                filtered.map((b, i) => {
                  const picked = selectedBranch?.value === b.value;
                  return (
                    <button
                      key={b.value}
                      onClick={() => {
                        setSelectedBranch(b);
                        setErr("");
                      }}
                      className="flex min-h-[clamp(30px,6vh,46px)] w-full items-center gap-2.5 rounded-[9px] border px-2.5 py-2 text-left hover:bg-hoverbg"
                      style={{
                        borderColor: picked ? "var(--brand)" : "var(--border)",
                        background: picked ? "var(--brand-soft)" : "var(--card)",
                      }}
                    >
                      <span
                        className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px] fluid-text-xs font-bold"
                        style={{
                          background: picked ? "var(--brand)" : "var(--hover)",
                          color: picked ? "#fff" : "var(--muted)",
                        }}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate fluid-text-sm font-semibold text-fg">
                          {b.label}
                        </span>
                      </span>
                      {picked && <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" />}
                    </button>
                  );
                })}

              {!isFetching && filtered.length === 0 && (
                <div className="py-6 text-center text-xs text-muted">
                  No branch matches that search.
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                onClick={() => logoutAction()}
                className="flex min-h-[clamp(32px,5vh,38px)] shrink-0 items-center gap-1.5 rounded-[11px] border border-line bg-card px-4 fluid-text-sm font-semibold text-fg hover:bg-hoverbg"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={enter}
                disabled={isNavigating}
                className="flex min-h-[clamp(32px,5vh,38px)] flex-1 items-center justify-center gap-2 rounded-[11px] bg-brand fluid-text-sm font-bold uppercase tracking-wide text-white hover:brightness-[1.07] disabled:cursor-wait disabled:opacity-70"
              >
                {isNavigating && (
                  <span className="h-[15px] w-[15px] animate-spin rounded-full border-2 border-white/35 border-t-white" />
                )}
                Enter <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 fluid-text-xs">
            <ReleaseNotesDialog />
          </div>

          <div className="border-t border-line pt-[clamp(8px,1.6vh,16px)] text-center fluid-text-xs text-muted">
            Secure. Reliable. Built for Dealerships.
          </div>
        </div>

        <div
          data-metarow="1"
          className="flex max-w-[420px] flex-wrap items-center justify-center gap-2.5 text-center fluid-text-xs text-muted"
        >
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> HRMS version 2.0
          </span>
          <ThemeToggle />
        </div>
      </section>

      {/* RIGHT — hero side */}
      <section
        data-hero="1"
        aria-label="Product highlights"
        className="fluid-panel fluid-p-lg relative flex flex-col justify-between fluid-gap-lg"
        style={{
          background:
            "radial-gradient(760px 460px at 78% 8%, #1F4A72, transparent 62%), linear-gradient(160deg,var(--navy),var(--navy-2) 52%,var(--navy-3))",
        }}
      >
       
        <div
          data-carsil="1"
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[12%] left-1/2 w-[min(760px,86%)] -translate-x-1/2 opacity-[.16] [filter:drop-shadow(0_0_10px_rgba(41,171,226,.5))]"
        >
          <svg
            viewBox="0 0 760 210"
            className="block h-auto w-full"
            fill="none"
            stroke="#9FD9F5"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <path d="M28 156h74M660 156h72M104 156a48 48 0 0 0 96 0M566 156a48 48 0 0 0 96 0M200 156h366" />
            <path d="M28 156c0-30 10-46 34-52l86-20 60-38c14-9 30-13 47-13h132c22 0 42 8 58 22l52 46 118 22c22 4 34 18 34 33v0" />
            <path d="M236 84l38-30h84v30zM384 84V54h96c14 0 26 5 36 14l20 16z" />
          </svg>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <span
            className="absolute left-0 top-[22%] h-[1.5px] w-[46%] [animation:streak_7s_linear_infinite]"
            style={{ background: "linear-gradient(90deg,transparent,var(--sky),transparent)" }}
          />
          <span
            className="absolute left-0 top-[48%] h-[1.5px] w-[38%] [animation:streak_9s_linear_infinite] [animation-delay:1.6s]"
            style={{ background: "linear-gradient(90deg,transparent,#7DD3FC,transparent)" }}
          />
          <span
            className="absolute left-0 top-[71%] h-[1.5px] w-[52%] opacity-50 [animation:streak_11s_linear_infinite] [animation-delay:3.1s]"
            style={{ background: "linear-gradient(90deg,transparent,var(--amber),transparent)" }}
          />
          <span
            className="absolute left-0 top-[88%] h-[1.5px] w-[30%] [animation:streak_8s_linear_infinite] [animation-delay:4.4s]"
            style={{ background: "linear-gradient(90deg,transparent,var(--sky),transparent)" }}
          />
        </div>

        <p
          data-herotag="1"
          className="relative m-0 max-w-[420px] self-end text-right fluid-text-lg font-semibold leading-[1.45] tracking-[-.01em]"
          style={{ color: "rgba(207,232,248,.86)" }}
        >
          Driving People. Powering Performance. Accelerating Growth.
        </p>

        <div
          data-herostack="1"
          className="relative flex min-h-0 flex-1 flex-col items-center justify-center fluid-gap-lg pb-[clamp(14px,3vh,26px)]"
        >
          {/* Gauge */}
          <div data-gauge="1" className="relative fluid-illustration-lg max-w-[74%]">
            <svg
              viewBox="0 0 240 150"
              role="img"
              aria-label="Performance speedometer"
              className="block h-auto w-full overflow-visible"
            >
              <path
                d="M16 132a104 104 0 0 1 208 0"
                fill="none"
                stroke="rgba(207,232,248,.16)"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M16 132a104 104 0 0 1 208 0"
                fill="none"
                stroke="url(#gaugeGrad2)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray="228 400"
              />
              <defs>
                <linearGradient id="gaugeGrad2" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#29ABE2" />
                  <stop offset="62%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#E11D48" />
                </linearGradient>
              </defs>

              <g stroke="rgba(207,232,248,.5)" strokeWidth="2" strokeLinecap="round">
                {[-120, -90, -60, -30, 0, 30, 60, 90, 120].map((deg, idx) => (
                  <line
                    key={idx}
                    x1="120"
                    y1="42"
                    x2="120"
                    y2={idx % 2 === 0 ? 30 : 32}
                    transform={`rotate(${deg} 120 132)`}
                  />
                ))}
              </g>

              <g
                style={{
                  transformOrigin: "120px 132px",
                  animation: "sweep 6s cubic-bezier(.45,.05,.35,1) infinite",
                }}
              >
                <line x1="120" y1="132" x2="120" y2="48" stroke="#F8FAFC" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="120" cy="52" r="4" fill="var(--sky)" />
              </g>

              <circle cx="120" cy="132" r="11" fill="#0C1C2D" stroke="rgba(207,232,248,.35)" strokeWidth="2" />
              <text x="120" y="112" textAnchor="middle" fill="#F8FAFC" fontSize="19" fontWeight="700" fontFamily="Inter,sans-serif">160</text>
              <text x="120" y="126" textAnchor="middle" fill="rgba(246, 247, 247, 0.55)" fontSize="10" fontWeight="600" letterSpacing="1.4" fontFamily="Inter,sans-serif">HR VELOCITY</text>
            </svg>

            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-1.5 left-1/2 -ml-10 h-20 w-20 rounded-full border [animation:pulsering_3.4s_ease-out_infinite]"
              style={{ borderColor: "rgba(41,171,226,.5)" }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-1.5 left-1/2 -ml-10 h-20 w-20 rounded-full border [animation:pulsering_3.4s_ease-out_infinite] [animation-delay:1.7s]"
              style={{ borderColor: "rgba(41,171,226,.35)" }}
            />
          </div>

          {/* Stats */}
          <div data-statgrid="1" className="relative grid w-full max-w-[620px] grid-cols-3 gap-3">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="relative rounded-[13px] border border-[rgba(207,232,248,.16)] p-[clamp(8px,1.6vh,12px)] backdrop-blur-md"
                style={{ background: "rgba(255,255,255,.07)" }}
              >
                <div className="flex items-center gap-1">
                  <span
                    className="grid h-[15px] w-[26px] shrink-0 place-items-center rounded-lg"
                    style={{ background: s.tint, color: s.fg }}
                  >
                    <s.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 fluid-text-xs font-semibold uppercase tracking-wide text-[rgba(207,232,248,.62)]">
                    {s.label}
                  </span>
                </div>
                <div className="mt-2 fluid-text-lg font-bold tracking-tight text-[#F8FAFC]">{s.value}</div>
                <div className="mt-0.5 fluid-text-xs text-[rgba(207,232,248,.5)]">{s.note}</div>
              </div>
            ))}
          </div>

          {/* People */}
          <div data-peoplegrid="1" className="relative grid w-full max-w-[620px] grid-cols-3 gap-3.5">
            {PEOPLE.map((p) => (
              <div
                key={p.name}
                data-cardfloat="1"
                className="flex items-center gap-2.5 rounded-xl border px-3 py-[clamp(7px,1.4vh,11px)] backdrop-blur-[12px]"
                style={{
                  background: "rgba(255,255,255,.05)",
                  borderColor: "rgba(207,232,248,.13)",
                  animation: `risein .5s ease both ${p.delay}, floaty ${p.dur} ease-in-out infinite ${p.delay}`,
                }}
              >
                <span
                  className="grid h-[30px] w-[30px] flex-none place-items-center rounded-full fluid-text-xs font-bold text-[#E7F3FB]"
                  style={{ background: "rgba(207,232,248,.14)" }}
                >
                  {p.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-[#F8FAFC]">{p.name}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[10.5px]" style={{ color: p.fg }}>
                    <span className="h-1.5 w-1.5 rounded-full [animation:blink_2.6s_ease-in-out_infinite]" style={{ background: p.fg }} />
                    {p.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Features row */}
        <div
          data-featurerow="1"
          className="relative flex items-start justify-between gap-3.5 border-t pt-[clamp(10px,2.2vh,20px)]"
          style={{ borderColor: "rgba(207,232,248,.14)" }}
        >
          {FEATURES.map((f) => (
            <div key={f.label} className="flex min-w-0 flex-1 flex-col items-center gap-[7px] text-center">
              <span
                className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px] border text-[var(--sky)]"
                style={{ background: "rgba(255,255,255,.07)", borderColor: "rgba(207,232,248,.16)" }}
              >
                <f.icon className="h-4 w-4" />
              </span>
              <span className="fluid-text-xs font-semibold leading-[1.35]" style={{ color: "rgba(207,232,248,.72)" }}>
                {f.label}
              </span>
            </div>
          ))}
        </div>
    
      </section>

      <style jsx global>{`
        @media (max-width: 900px) {
          [data-shell="1"] {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          [data-hero="1"] {
            display: none !important;
          }

          [data-carsil="1"] {
            display: none !important;
          }
        }

        @media (max-width: 760px) {
          [data-statgrid="1"],
          [data-peoplegrid="1"] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          [data-featurerow="1"] {
            flex-wrap: wrap !important;
            row-gap: 12px !important;
          }

          [data-featurerow="1"] > div {
            flex: 0 0 calc(33.333% - 10px) !important;
          }
        }

        @media (max-width: 640px) {
          [data-glass="1"] {
            padding: clamp(14px, 2.4vh, 22px) clamp(14px, 3vw, 18px) !important;
          }

          [data-heading="1"] {
            font-size: clamp(17px, 3vh, 22px) !important;
          }

          [data-cardfloat="1"] {
            animation: risein 0.5s ease both !important;
          }

          [data-statgrid="1"],
          [data-peoplegrid="1"] {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          [data-peoplegrid="1"] {
            display: none !important;
          }

          [data-featurerow="1"] > div {
            flex: 0 0 calc(50% - 8px) !important;
          }
        }
      `}</style>
    </div>
  );
};

export default BranchCom;