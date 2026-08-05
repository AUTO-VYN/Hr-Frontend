"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDebounce } from "use-debounce";
import axios from "axios";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Wallet,
  Fingerprint,
  Users,
  TrendingUp,
  ShieldCheck as ShieldIcon,
} from "lucide-react";
import { loginAction } from "@/action/loginAction";
import ThemeToggle from "@/components/theme/ThemeToggle";
import ReleaseNotesDialog from "@/components/shared/ReleaseNotesDialog";

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
  {
    initials: "RS",
    name: "Rahul Sharma",
    status: "Present · 09:02",
    fg: "#34D399",
    delay: ".3s",
    dur: "7.5s",
  },
  {
    initials: "PK",
    name: "Priya Kulkarni",
    status: "On leave · CL",
    fg: "#FBBF24",
    delay: ".42s",
    dur: "6.8s",
  },
  {
    initials: "AV",
    name: "Amit Verma",
    status: "Present · 08:47",
    fg: "#34D399",
    delay: ".54s",
    dur: "7.2s",
  },
];

const FEATURES = [
  { icon: Wallet, label: "Payroll Automation" },
  { icon: Fingerprint, label: "Attendance Tracking" },
  { icon: Users, label: "Employee Management" },
  { icon: TrendingUp, label: "Performance Insights" },
  { icon: ShieldIcon, label: "Compliance Ready" },
];

export default function LoginPage() {
  const {
    handleSubmit,
    register,
    setValue,
    watch,
    trigger,
    clearErrors,
    formState: { errors },
  } = useForm({
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errormsg, setErrorMsg] = useState<string | null>(null);
  const [yearOptions, setYearOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [showErrors, setShowErrors] = useState(false);

  const [redBorder, setRedBorder] = useState<Record<string, boolean>>({});

  const compCode = watch("comp_code");
  const yearVal = watch("year");
  const usernameVal = watch("username");
  const passwordVal = watch("password");
  const [debouncedCompCode] = useDebounce(compCode, 500);

  useEffect(() => {
    if (Object.keys(errors).length === 0) return;
    const timer = setTimeout(() => {
      clearErrors();
    }, 2000);
    return () => clearTimeout(timer);
  }, [errors, clearErrors]);

  useEffect(() => {
    if (debouncedCompCode && debouncedCompCode.length >= 2) {
      fetchYear(debouncedCompCode);
    }
  }, [debouncedCompCode]);

  useEffect(() => {
    if (compCode && compCode.trim() !== "") {
      setRedBorder((prev) => ({ ...prev, comp_code: false }));
    }
  }, [compCode]);

  useEffect(() => {
    if (yearVal && yearVal.trim() !== "") {
      setRedBorder((prev) => ({ ...prev, year: false }));
    }
  }, [yearVal]);

  useEffect(() => {
    if (usernameVal && usernameVal.trim() !== "") {
      setRedBorder((prev) => ({ ...prev, username: false }));
    }
  }, [usernameVal]);

  useEffect(() => {
    if (passwordVal && passwordVal.trim() !== "") {
      setRedBorder((prev) => ({ ...prev, password: false }));
    }
  }, [passwordVal]);

  const fetchYear = async (code: string) => {
    setYearOptions([]);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/users/getyear`,
        code,
        { headers: { compcode: code } }
      );
      if (response.status === 200) {
        const list = (response.data?.year || []).map((item: any) => ({
          value: item.year,
          label: `FINANCIAL YEAR 20${item.year} - ${parseInt(item.year, 10) + 1}`,
        }));
        setYearOptions(list);
        if (list[0]) setValue("year", list[0].value);
      }
    } catch (err) {
      setYearOptions([]);
    }
  };

  const markEmptyPreviousFields = (currentField: string) => {
    const fieldOrder = ["comp_code", "year", "username", "password"];
    const currentIndex = fieldOrder.indexOf(currentField);
    const newRedBorder: Record<string, boolean> = {};

    for (let i = 0; i < currentIndex; i++) {
      const field = fieldOrder[i];
      const val = watch(field);
      if (!val || (typeof val === "string" && val.trim() === "")) {
        newRedBorder[field] = true;
      }
    }

    if (Object.keys(newRedBorder).length > 0) {
      setRedBorder((prev) => ({ ...prev, ...newRedBorder }));
    }
  };

  const onSubmit = async (data: any) => {
    setRedBorder({});
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await loginAction(data);
      if (res?.error) setErrorMsg(res.error);
    } catch (err) {
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const onInvalid = () => {
    setShowErrors(true);

    const fieldOrder = ["comp_code", "username", "password"];
    const newRedBorder: Record<string, boolean> = {};
    fieldOrder.forEach((field) => {
      const val = watch(field);
      if (!val || (typeof val === "string" && val.trim() === "")) {
        newRedBorder[field] = true;
      }
    });
    setRedBorder((prev) => ({ ...prev, ...newRedBorder }));

    setTimeout(() => {
      setShowErrors(false);
      clearErrors();
    }, 2000);
  };

  const inputWrapBase =
    "flex items-center gap-2.5 rounded-[10px] border bg-field px-3 transition-colors duration-200";
  const inputEl =
    "flex-1 min-w-0 border-none bg-transparent text-fg fluid-text-sm py-[clamp(4px,1vh,10px)] outline-none placeholder:text-muted";
  const labelEl = "fluid-text-xs font-semibold uppercase tracking-wide text-muted";

  const getInputWrap = (fieldName: string) => {
    const isRed = redBorder[fieldName];
    return `${inputWrapBase} ${
      isRed
        ? "border-red-500 focus-within:border-red-500"
        : "border-line focus-within:border-brand"
    }`;
  };

  return (
    <div
      data-shell="1"
      // FIX: removed !overflow-hidden and max-h-[100vh] so zoom pe page scroll ho sake
      className="fluid-shell grid w-full grid-cols-[40%_60%] bg-bg overflow-x-hidden"
    >
      {/* LEFT — form side */}
      <section
        data-formside="1"
        className="fluid-panel flex h-full min-h-0 min-w-0 flex-col items-center justify-center fluid-gap-lg"
        style={{
          background:
            "radial-gradient(700px 420px at 20% 0%, var(--brand-soft), transparent 62%), var(--bg)",
        }}
      >
        <div
          data-glass="1"
          className="fluid-p-md fluid-gap-sm flex min-h-0 w-full max-w-[390px] flex-col rounded-2xl border border-line bg-glass shadow-card backdrop-blur-xl"
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
            <h1 className="-mt-2 fluid-text-2xl font-semibold tracking-tight text-fg">
              Welcome Back to HR Setu
            </h1>
            <p className="mt-0 fluid-text-xs text-muted">
              Your company code decides which database opens, so check it before
              signing in.
            </p>
          </div>

          {errormsg && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-[11px] border border-danger-border bg-danger-bg px-3.5 py-[clamp(6px,1.2vh,10px)]"
            >
              <div className="mt-0.5 fluid-text-xs text-danger-fg">
                {errormsg}
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit, onInvalid)}
            className="flex flex-col fluid-gap-sm"
          >
            <label htmlFor="companyCode" className="flex flex-col gap-1">
              <span className={labelEl}>Company code</span>
              <span className={getInputWrap("comp_code")}>
                <Building2 className="h-4 w-4 shrink-0 text-muted" />
                <input
                  id="companyCode"
                  placeholder="Company code"
                  className={inputEl}
                  autoComplete="organization"
                  {...register("comp_code", { required: true })}
                />
              </span>
            </label>

            <label htmlFor="financialYear" className="flex flex-col gap-1">
              <span className={labelEl}>Financial year</span>
              <span className={getInputWrap("year")}>
                <CalendarDays className="h-4 w-4 shrink-0 text-muted" />
                <select
                  id="financialYear"
                  className={inputEl + " cursor-pointer appearance-none"}
                  {...register("year")}
                  onFocus={() => {
                    markEmptyPreviousFields("year");
                    trigger("comp_code");
                  }}
                >
                  {yearOptions.length === 0 && <option value=""></option>}
                  {yearOptions.map((y) => (
                    <option key={y.value} value={y.value}>
                      {y.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
              </span>
            </label>

            <label htmlFor="username" className="flex flex-col gap-1">
              <span className={labelEl}>Username</span>
              <span className={getInputWrap("username")}>
                <User className="h-4 w-4 shrink-0 text-muted" />
                <input
                  id="username"
                  placeholder="Username"
                  className={inputEl}
                  autoComplete="username"
                  {...register("username", { required: true })}
                  onFocus={() => markEmptyPreviousFields("username")}
                />
              </span>
            </label>

            <label htmlFor="password" className="flex flex-col gap-1">
              <span className={labelEl}>Password</span>
              <span className={getInputWrap("password") + " pr-1.5"}>
                <Lock className="h-4 w-4 shrink-0 text-muted" />
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  className={inputEl}
                  {...register("password", { required: true })}
                  onFocus={() => markEmptyPreviousFields("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg text-muted hover:bg-hoverbg hover:text-fg"
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-1 flex min-h-[clamp(32px,5vh,38px)] w-full items-center justify-center gap-2 rounded-[11px] bg-brand fluid-text-sm font-bold uppercase tracking-wide text-white shadow-[0_12px_26px_-14px_rgba(79,70,229,.9)] hover:brightness-[1.07] disabled:cursor-wait disabled:opacity-70"
            >
              {isLoading && (
                <span className="h-[15px] w-[15px] animate-spin rounded-full border-2 border-white/35 border-t-white" />
              )}
              Login <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="flex items-center justify-center gap-2 fluid-text-xs">
            <ReleaseNotesDialog />
          </div>

          <div className="border-t border-line pt-[clamp(8px,1.6vh,16px)] text-center fluid-text-xs text-muted">
            Secure. Reliable. Built for Dealerships.
          </div>
        </div>

        <div className="flex max-w-[420px] flex-wrap items-center justify-center gap-2.5 text-center fluid-text-xs text-muted">
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
        {/* ... hero content unchanged ... */}
        {/* NOTE: keeping your existing hero JSX as-is */}
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

        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <span
            className="absolute left-0 top-[22%] h-[1.5px] w-[46%] [animation:streak_7s_linear_infinite]"
            style={{
              background: "linear-gradient(90deg,transparent,var(--sky),transparent)",
            }}
          />
          <span
            className="absolute left-0 top-[48%] h-[1.5px] w-[38%] [animation:streak_9s_linear_infinite] [animation-delay:1.6s]"
            style={{
              background: "linear-gradient(90deg,transparent,#7DD3FC,transparent)",
            }}
          />
          <span
            className="absolute left-0 top-[71%] h-[1.5px] w-[52%] opacity-50 [animation:streak_11s_linear_infinite] [animation-delay:3.1s]"
            style={{
              background: "linear-gradient(90deg,transparent,var(--amber),transparent)",
            }}
          />
          <span
            className="absolute left-0 top-[88%] h-[1.5px] w-[30%] [animation:streak_8s_linear_infinite] [animation-delay:4.4s]"
            style={{
              background: "linear-gradient(90deg,transparent,var(--sky),transparent)",
            }}
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
                stroke="url(#gaugeGrad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray="228 400"
              />
              <defs>
                <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
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
                <line
                  x1="120"
                  y1="132"
                  x2="120"
                  y2="48"
                  stroke="#F8FAFC"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <circle cx="120" cy="52" r="4" fill="var(--sky)" />
              </g>

              <circle
                cx="120"
                cy="132"
                r="11"
                fill="#0C1C2D"
                stroke="rgba(207,232,248,.35)"
                strokeWidth="2"
              />
              <text
                x="120"
                y="112"
                textAnchor="middle"
                fill="#F8FAFC"
                fontSize="19"
                fontWeight="700"
                fontFamily="Inter,sans-serif"
              >
                60
              </text>
              <text
                x="120"
                y="126"
                textAnchor="middle"
                fill="rgba(246, 247, 247, 0.55)"
                fontSize="10"
                fontWeight="600"
                letterSpacing="1.4"
                fontFamily="Inter,sans-serif"
              >
                HR VELOCITY
              </text>
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
                <div className="mt-2 fluid-text-lg font-bold tracking-tight text-[#F8FAFC]">
                  {s.value}
                </div>
                <div className="mt-0.5 fluid-text-xs text-[rgba(207,232,248,.5)]">
                  {s.note}
                </div>
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
                  <span className="block truncate text-xs font-semibold text-[#F8FAFC]">
                    {p.name}
                  </span>

                  <span className="mt-0.5 flex items-center gap-1.5 text-[10.5px]" style={{ color: p.fg }}>
                    <span
                      className="h-1.5 w-1.5 rounded-full [animation:blink_2.6s_ease-in-out_infinite]"
                      style={{ background: p.fg }}
                    />
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
                style={{
                  background: "rgba(255,255,255,.07)",
                  borderColor: "rgba(207,232,248,.16)",
                }}
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
        /* Make browser autofill respect theme (helps in Chromium) */
        html {
          color-scheme: light;
        }
        html.dark {
          color-scheme: dark;
        }

        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        textarea:-webkit-autofill,
        textarea:-webkit-autofill:hover,
        textarea:-webkit-autofill:focus,
        select:-webkit-autofill,
        select:-webkit-autofill:hover,
        select:-webkit-autofill:focus {
          -webkit-text-fill-color: var(--fg) !important;
          caret-color: var(--fg) !important;
          -webkit-box-shadow: 0 0 0px 1000px var(--field, var(--bg)) inset !important;
          box-shadow: 0 0 0px 1000px var(--field, var(--bg)) inset !important;
          transition: background-color 9999s ease-in-out 0s !important;
        }

        input:-webkit-autofill::first-line,
        textarea:-webkit-autofill::first-line {
          font-family: inherit !important;
          font-size: inherit !important;
          font-weight: inherit !important;
        }

        input:-moz-autofill,
        textarea:-moz-autofill,
        select:-moz-autofill {
          box-shadow: 0 0 0px 1000px var(--field, var(--bg)) inset !important;
          -moz-text-fill-color: var(--fg) !important;
          caret-color: var(--fg) !important;
        }

        @media (max-width: 1280px) {
          [data-hero="1"] {
            padding: clamp(20px, 3.5vh, 36px) 32px !important;
          }
          [data-formside="1"] {
            padding: clamp(20px, 3.5vh, 36px) 30px !important;
          }
          [data-featurerow="1"] {
            gap: 10px !important;
          }
        }

        @media (max-width: 1024px) {
          [data-shell="1"] {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          [data-hero="1"] {
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
}