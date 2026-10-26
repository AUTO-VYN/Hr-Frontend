"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import Eselect from "@/components/atoms/Eselect";
import Einput from "@/components/atoms/Einput";
import HashloaderComponent from "@/components/Templates/hashloader";
import { MoreHorizontal } from "lucide-react";

type Option = {
  value: any;
  label: string;
};

export default function EmployeeSalaryReview() {
  const [tabledata, setTabledata] = useState<any[]>([]);
  const [options, setOptions] = useState<any[] | null>(null);
  const [isClicked, setIsClicked] = useState(false);
  const [dates, setDates] = useState({
    EmpCode: "",
  });

  const user = useCurrentUser() as any;

  // Format options for Eselect: Displays clean code like "1972153" matching the design
  const empOptions: Option[] = useMemo(() => {
    if (!Array.isArray(options)) return [];
    return options
      .map((emp: any) => {
        const code = String(emp.value ?? emp.EMPCODE ?? emp.EmpCode ?? emp.code ?? emp.label ?? "").trim();
        return { 
          value: code,
          label: code,
        };
      })
      .filter((x: Option) => Boolean(x.value));
  }, [options]);

  // Fetch employees list
  useEffect(() => {
    const fetchEmployees = async () => {
      if (options && options.length > 0) return;
      setIsClicked(true);
      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/users/findAllEmployee`,
          {
            branch: user?.branch,
          },
          {
            headers: {
              compcode: user?.Comp_Code,
              name: user?.name,
            },
          }
        );
        setOptions(response.data.data || []);
      } catch (e) {
        console.error("Error fetching employees:", e);
      } finally {
        setIsClicked(false);
      }
    };

    if (user?.Comp_Code) {
      fetchEmployees();
    }
  }, [user?.Comp_Code, user?.branch]);

  // Fetch Salary Revision Report
  const OutServiceView = async () => {
    if (!dates.EmpCode) {
      return;
    }
    setIsClicked(true);
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmpMaster/SalaryStrReport`,
        {
          EmpCode: dates.EmpCode,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      const rawResult = result.data?.Result || result.data?.data || [];
      const sortedData = (Array.isArray(rawResult) ? rawResult : []).sort(
        (a: any, b: any) =>
          new Date(a.Effective_date).getTime() - new Date(b.Effective_date).getTime()
      );
      setTabledata(sortedData);
    } catch (error) {
      console.error("Error occurred while making the request:", error);
      setTabledata([]);
    } finally {
      setIsClicked(false);
    }
  };

  const handleInputChange = (name: string, value: any) => {
    setDates((prev) => ({ ...prev, [name]: value }));
  };

  const toTitleCase = (str: string) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Compute Employee info display string: "Deepti Rahul Labdi Manager - HR"
  const employeeDisplay = useMemo(() => {
    if (tabledata && tabledata.length > 0) {
      const first = tabledata[0];
      const name = toTitleCase(String(first.EMPLOYEENAME || "").trim());
      const desg = toTitleCase(String(first.EMPLOYEEDESIGNATION || "").trim());
      const rawDept = String(first.DEPARTMENT || "").trim();
      const dept = rawDept.length <= 4 ? rawDept.toUpperCase() : toTitleCase(rawDept);
      const rolePart = desg && dept ? `${desg} - ${dept}` : desg || dept;
      return [name, rolePart].filter(Boolean).join(" ");
    }
    if (dates.EmpCode && Array.isArray(options)) {
      const matched = options.find(
        (e: any) => String(e.value ?? e.EMPCODE ?? e.EmpCode ?? "") === String(dates.EmpCode)
      );
      if (matched) {
        return toTitleCase(String(matched.label ?? matched.EMPNAME ?? matched.FullName ?? "").trim());
      }
    }
    return "—";
  }, [tabledata, dates.EmpCode, options]);

  // Helper to format currency numbers with Indian commas
  const formatAmount = (val: any) => {
    if (val === null || val === undefined || val === "") return "0";
    const num = Number(val);
    return isNaN(num) ? String(val) : num.toLocaleString("en-IN");
  };

  return (
    <div className="w-full min-h-[calc(100vh-64px)] p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-5 max-w-[1440px] mx-auto">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TITLE                                                                      */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Employee Salary Review
        </h1>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TOP SEARCH CARD: FIND EMPLOYEE + SHOW + EMPLOYEE INFO                       */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] p-4 sm:p-6 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-end">
          {/* Find employee dropdown + Show button */}
          <div className="lg:col-span-5 flex items-end gap-2.5 sm:gap-3">
            <div className="flex-1 min-w-0">
              <Eselect
                title="Find employee"
                name="EmpCode"
                option={empOptions}
                initialValue={dates.EmpCode}
                handleInputChange={handleInputChange}
                placeholder="Select employee code"
                className="!h-11 sm:!h-12 !rounded-xl text-md font-medium"
                labelClassName="text-sm font-semibold"
              />
            </div>
            <button
              type="button"
              onClick={OutServiceView}
              className="h-11 sm:h-12 min-w-[80px] sm:min-w-[85px] px-5 sm:px-6 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] active:scale-[0.98] text-white text-sm font-semibold shadow-xs transition-all flex items-center justify-center shrink-0 cursor-pointer"
            >
              Show
            </button>
          </div>

          {/* Read-only Employee info field */}
          <div className="lg:col-span-7">
            <Einput
              title="Employee"
              type="text"
              name="employeeDetails"
              value={employeeDisplay}
              placeholder="—"
              readOnly={true}
              handleInputChange={() => {}}
              className="!h-11 sm:!h-12 !rounded-xl text-md font-medium text-slate-800 dark:text-slate-100 !bg-slate-50/70 dark:!bg-slate-900/40 cursor-default"
              labelClassName="text-sm font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Total rows counter */}
      <div className="text-sm sm:text-md font-medium text-slate-600 dark:text-slate-400 my-3 sm:my-4">
        Total rows:{" "}
        <span className="font-bold text-slate-900 dark:text-white ml-0.5">
          {tabledata.length}
        </span>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* CONTENT: EMPTY STATE OR REVISION CARDS                                     */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {tabledata.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 py-16 sm:py-24 flex items-center justify-center text-center bg-transparent">
          <p className="text-sm sm:text-[15px] text-slate-400 dark:text-slate-500 font-normal">
            Select an employee and click Show to see salary revisions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
          {tabledata.map((item: any, index: number) => {
            const isLast = index === tabledata.length - 1;
            const fromDate = item.Effective_date
              ? new Date(item.Effective_date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "";
            const toDate = !isLast && tabledata[index + 1]?.Effective_date
              ? new Date(tabledata[index + 1].Effective_date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "Ongoing";

            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0B1220] p-4 sm:p-5 lg:p-6 shadow-xs transition-all hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Date range + More Icon */}
                  <div className="flex items-center justify-between gap-2 mb-3 sm:mb-3.5">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
                      <span className="text-[13.5px] sm:text-[15px] font-bold text-slate-900 dark:text-white truncate">
                        {fromDate} <span className="text-slate-400 font-normal mx-0.5 sm:mx-1">→</span> {toDate}
                      </span>
                      {isLast && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] sm:text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
                          Ongoing
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer shrink-0"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Gross Salary Banner */}
                  <div className="rounded-xl bg-[#EEF2FF] dark:bg-[#1E1B4B]/40 border border-indigo-100/60 dark:border-indigo-900/40 p-3.5 sm:p-4.5 flex items-center justify-between gap-2 my-3.5 sm:my-4">
                    <span className="text-xs sm:text-[13px] font-semibold text-[#4338CA] dark:text-[#818CF8] shrink-0">
                      Gross salary
                    </span>
                    <span className="text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight shrink-0">
                      ₹{formatAmount(item.Gross_Salary)}
                    </span>
                  </div>

                  {/* Details Grid (4-Column Layout: Label1 | Value1 | Label2 | Value2) */}
                  <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-y-2.5 sm:gap-y-3 text-[11.5px] sm:text-[13px] my-3.5 sm:my-4">
                    {/* Row 1 */}
                    <span className="text-slate-500 dark:text-slate-400 font-normal whitespace-nowrap">
                      Emp code
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono text-right pr-3 sm:pr-5 shrink-0">
                      {item.Emp_Code || dates.EmpCode || "—"}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-normal whitespace-nowrap pl-1 sm:pl-2">
                      Basic
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono text-right shrink-0">
                      {formatAmount(item.Basic)}
                    </span>

                    {/* Row 2 */}
                    <span className="text-slate-500 dark:text-slate-400 font-normal whitespace-nowrap">
                      HRA
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono text-right pr-3 sm:pr-5 shrink-0">
                      {formatAmount(item.HRA)}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-normal whitespace-nowrap pl-1 sm:pl-2">
                      Conveyance
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono text-right shrink-0">
                      {formatAmount(item.Conveyance)}
                    </span>

                    {/* Row 3 */}
                    <span className="text-slate-500 dark:text-slate-400 font-normal whitespace-nowrap">
                      Washing allowance
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono text-right pr-3 sm:pr-5 shrink-0">
                      {formatAmount(item.Washing)}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-normal whitespace-nowrap pl-1 sm:pl-2">
                      Medical
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono text-right shrink-0">
                      {formatAmount(item.Medical)}
                    </span>

                    {/* Row 4 */}
                    <span className="text-slate-500 dark:text-slate-400 font-normal whitespace-nowrap">
                      Other
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono text-right pr-3 sm:pr-5 shrink-0">
                      {formatAmount(item.Other)}
                    </span>
                    <span />
                    <span />
                  </div>
                </div>

                {/* Footer: Modified by ADMIN + Date + Time */}
                <div className="mt-3.5 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs sm:text-[13px] text-slate-400">
                  <div className="truncate">
                    Modified by{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase">
                      {item.MODIFIED_USER || "ADMIN"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 font-medium text-right">
                    <span>
                      {item.MOD_DATE
                        ? item.MOD_DATE.includes("-")
                          ? item.MOD_DATE.split("-").reverse().join("-")
                          : item.MOD_DATE
                        : ""}
                    </span>
                    <span>{item.MOD_TIME || "—"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hashloader for loading states */}
      <HashloaderComponent isLoading={isClicked} />
    </div>
  );
}
