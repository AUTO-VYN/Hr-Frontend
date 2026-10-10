"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import axios from "axios";
import {
  Users,
  Layers,
  Hourglass,
  AlertTriangle,
  Download,
  Printer,
  Loader2,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useDateRange } from "@/app/hooks/use-date-range";
import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import Printout from "@/components/atoms/Printout";
import Card from "@/components/Templates/card";
import DataTable from "@/components/Templates/reacttable";

type ReportType =
  | "EMPLOYEE_WISE"
  | "CATEGORY_WISE"
  | "ASSET_AGEING"
  | "NOT_RETURNED";

// Helper functions for date formatting and calculations
function formatDateDisplay(dStr?: string) {
  if (!dStr || dStr === "—" || dStr === "null") return "—";
  try {
    const d = new Date(dStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    }
  } catch { }
  return String(dStr);
}

function calculateAgeString(dateStr?: string) {
  if (!dateStr || dateStr === "—" || dateStr === "null") return "—";
  try {
    const issueDate = new Date(dateStr);
    if (isNaN(issueDate.getTime())) return "—";
    const now = new Date();
    let years = now.getFullYear() - issueDate.getFullYear();
    let months = now.getMonth() - issueDate.getMonth();
    let days = now.getDate() - issueDate.getDate();

    if (days < 0) {
      months--;
      days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    if (years > 0) return `${years} yr${years > 1 ? "s" : ""} ${months} mo`;
    if (months > 0) return `${months} mo`;
    return `${Math.max(days, 0)} days`;
  } catch {
    return "—";
  }
}

function calculateDaysOverdue(dateStr?: string) {
  if (!dateStr || dateStr === "—" || dateStr === "null") return 0;
  try {
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) return 0;
    const diff = Math.floor((new Date().getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(diff, 0);
  } catch {
    return 0;
  }
}

export default function EmployeeAssetReportsPage() {
  const user = useCurrentUser() as any;
  const { DATE_FROM, DATE_TO } = useDateRange();
  const printRef = useRef<HTMLDivElement | null>(null);

  function getDefaultDate(monthsBack = 0) {
    const today = new Date();
    today.setMonth(today.getMonth() - monthsBack);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Filter States
  const [dates, setDates] = useState({
    DATE_FROM: DATE_FROM || getDefaultDate(1),
    DATE_TO: DATE_TO || getDefaultDate(0),
  });

  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [activeReport, setActiveReport] = useState<ReportType>("EMPLOYEE_WISE");

  // Options from APIs
  const [branchOptions, setBranchOptions] = useState<{ value: string; label: string }[]>([
    { value: "ALL", label: "All branches" },
  ]);
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([
    { value: "ALL", label: "All categories" },
  ]);

  // Raw API Data
  const [rawApiRecords, setRawApiRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // ── 1. Fetch Masters (Branch/Locations & IT Categories) from API ────────────
  useEffect(() => {
    if (!user?.Comp_Code) return;

    const fetchMasters = async () => {
      try {
        const [mastersRes, itRes] = await Promise.all([
          axios
            .post(
              `${process.env.NEXT_PUBLIC_URL}/hrmsreport/findMasters`,
              { multiloc: user?.branch },
              {
                headers: {
                  compcode: user?.Comp_Code,
                  name: user?.name,
                },
              }
            )
            .catch(() => null),
          axios
            .post(
              `${process.env.NEXT_PUBLIC_URL}/employee/getItCategoryOptions`,
              {},
              {
                headers: {
                  compcode: user?.Comp_Code,
                },
              }
            )
            .catch(() => null),
        ]);

        // Branch options
        const locList =
          mastersRes?.data?.data?.Location?.[0] ||
          mastersRes?.data?.data?.Location ||
          [];
        if (Array.isArray(locList) && locList.length > 0) {
          const mappedBranches = locList.map((loc: any) => ({
            value: String(loc.Loc_Code || loc.value || loc),
            label: String(loc.Loc_Desc || loc.label || loc),
          }));
          setBranchOptions([{ value: "ALL", label: "All branches" }, ...mappedBranches]);
        }

        // Category options
        const itList = itRes?.data?.data || [];
        if (Array.isArray(itList) && itList.length > 0) {
          const mappedCategories = itList.map((cat: any) => ({
            value: String(cat.value || cat.label || cat),
            label: String(cat.label || cat.value || cat),
          }));
          setCategoryOptions([{ value: "ALL", label: "All categories" }, ...mappedCategories]);
        }
      } catch (err) {
        console.error("Error fetching report masters:", err);
      }
    };

    fetchMasters();
  }, [user?.Comp_Code, user?.branch, user?.name]);

  // ── 2. Fetch Live Asset Report Data from API ───────────────────────────────
  const fetchReportData = useCallback(async () => {
    if (!user?.Comp_Code) return;

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/template/AssetEmpReport`,
        {
          dateFrom: dates.DATE_FROM,
          dateto: dates.DATE_TO,
          branch: selectedBranch === "ALL" ? "" : selectedBranch,
          category: selectedCategory === "ALL" ? "" : selectedCategory,
          flag: "1"
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      const records =
        response.data?.data?.records ||
        response.data?.data?.AssetDetails ||
        response.data?.data ||
        [];

      if (Array.isArray(records)) {
        setRawApiRecords(records);
      } else {
        setRawApiRecords([]);
      }
    } catch (err) {
      console.error("Error fetching asset report data:", err);
      setRawApiRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.Comp_Code, user?.name, dates.DATE_FROM, dates.DATE_TO, selectedBranch, selectedCategory]);

  useEffect(() => {
    if (user?.Comp_Code) {
      fetchReportData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.Comp_Code]);

  const handleDateChange = (name: string, value: any) => {
    setDates((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleExport = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_URL}/template/AssetEmpReport?dateFrom=${dates.DATE_FROM}&dateto=${dates.DATE_TO}&compcode=${user?.Comp_Code}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const formatShortDate = (dStr?: string) => {
    if (!dStr) return "";
    try {
      const d = new Date(dStr);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      }
    } catch { }
    return dStr;
  };

  // ── 3. Dynamically Generate 4 Reports from API Records ────────────────────

  // 1. Employee wise asset report
  const employeeWiseData = useMemo(() => {
    if (!rawApiRecords.length) return [];

    const empMap = new Map<string, any>();

    rawApiRecords.forEach((item: any) => {
      const empCode = item.Emp_Code || item.EMP_CODE || "—";
      const empName = item.EMP_NAME || "—";
      const department = item.DEVISION || item.Department || "—";
      const price = Number(item.Asset_Price || item.Price || item.price || item.Value || 0);
      const isReturned = Boolean(item.Revoke_Date && item.Revoke_Date !== "null");
      const isLost = Boolean(item.Lost_Date && item.Lost_Date !== "null");
      const issueDate = item.Issue_Date;

      if (!empMap.has(empCode)) {
        empMap.set(empCode, {
          Emp_Code: empCode,
          EMP_NAME: empName,
          DEVISION: department,
          assetsHeld: 0,
          totalValueNum: 0,
          oldestIssueDate: issueDate || null,
          hasOverdue: false,
          hasActive: false,
        });
      }

      const empEntry = empMap.get(empCode);
      if (!isReturned && !isLost) {
        empEntry.assetsHeld += 1;
        empEntry.hasActive = true;
      }
      empEntry.totalValueNum += price;

      if (issueDate) {
        if (!empEntry.oldestIssueDate || new Date(issueDate) < new Date(empEntry.oldestIssueDate)) {
          empEntry.oldestIssueDate = issueDate;
        }
      }

      if (item.LASTWOR_NEWDATE && !isReturned) {
        empEntry.hasOverdue = true;
      }
    });

    return Array.from(empMap.values()).map((emp) => {
      let status = "Returned";
      if (emp.hasOverdue) status = "Overdue";
      else if (emp.hasActive || emp.assetsHeld > 0) status = "In use";

      return {
        Emp_Code: emp.Emp_Code,
        EMP_NAME: emp.EMP_NAME,
        DEVISION: emp.DEVISION,
        assetsHeld: emp.assetsHeld,
        totalValue: `₹ ${emp.totalValueNum.toLocaleString("en-IN")}`,
        oldestIssue: emp.oldestIssueDate ? formatDateDisplay(emp.oldestIssueDate) : "—",
        status,
      };
    });
  }, [rawApiRecords]);

  // 2. Category wise stock report
  const categoryWiseData = useMemo(() => {
    if (!rawApiRecords.length) return [];

    const catMap = new Map<string, any>();

    rawApiRecords.forEach((item: any) => {
      const category = item.Asset_category || item.It_category || "General";
      const isReturned = Boolean(item.Revoke_Date && item.Revoke_Date !== "null");
      const isLost = Boolean(item.Lost_Date && item.Lost_Date !== "null");
      const price = Number(item.Asset_Price || item.Price || item.price || item.Value || 0);

      if (!catMap.has(category)) {
        catMap.set(category, {
          Asset_category: category,
          totalAssets: 0,
          issued: 0,
          inStore: 0,
          underRepair: 0,
          totalValueNum: 0,
        });
      }

      const catEntry = catMap.get(category);
      catEntry.totalAssets += 1;
      catEntry.totalValueNum += price;

      if (!isReturned && !isLost && item.Emp_Code) {
        catEntry.issued += 1;
      } else if (isReturned) {
        catEntry.inStore += 1;
      } else if (item.status === "Under Repair" || item.Status === "Under Repair") {
        catEntry.underRepair += 1;
      } else {
        catEntry.inStore += 1;
      }
    });

    return Array.from(catMap.values()).map((c) => ({
      Asset_category: c.Asset_category,
      totalAssets: c.totalAssets,
      issued: c.issued,
      inStore: c.inStore,
      underRepair: c.underRepair,
      value: `₹ ${c.totalValueNum.toLocaleString("en-IN")}`,
    }));
  }, [rawApiRecords]);

  // 3. Asset ageing report
  const assetAgeingData = useMemo(() => {
    if (!rawApiRecords.length) return [];

    return rawApiRecords.map((item: any) => {
      const isReturned = Boolean(item.Revoke_Date && item.Revoke_Date !== "null");
      const isLost = Boolean(item.Lost_Date && item.Lost_Date !== "null");
      const isConsumable = item.Asset_Type === "Consumable" || item.assetType === "Consumable";
      const issueDate = item.Issue_Date;

      let status = "In use";
      if (isReturned) status = "Returned";
      else if (isLost) status = "Lost";
      else if (isConsumable) status = "Consumed";
      else if (item.LASTWOR_NEWDATE) status = "Overdue";

      return {
        Aset_Code: item.Aset_Code || "—",
        Aset_Name: item.Aset_Name || "Asset",
        Asset_category: item.Asset_category || item.It_category || "General",
        EMP_NAME: item.EMP_NAME || item.Emp_Code || "Store",
        age: calculateAgeString(issueDate),
        status,
      };
    });
  }, [rawApiRecords]);

  // 4. Not returned report
  const notReturnedData = useMemo(() => {
    if (!rawApiRecords.length) return [];

    return rawApiRecords
      .filter((item: any) => {
        const isReturned = Boolean(item.Revoke_Date && item.Revoke_Date !== "null");
        const isLost = Boolean(item.Lost_Date && item.Lost_Date !== "null");
        const hasLeftDate = Boolean(item.LASTWOR_NEWDATE && item.LASTWOR_NEWDATE !== "null");
        return (!isReturned && hasLeftDate) || isLost;
      })
      .map((item: any) => {
        const isLost = Boolean(item.Lost_Date && item.Lost_Date !== "null");
        const lastWorkDate = item.LASTWOR_NEWDATE;
        const issueDate = item.Issue_Date;

        return {
          Emp_Code: item.Emp_Code || item.EMP_CODE || "—",
          EMP_NAME: item.EMP_NAME || "—",
          Aset_Name: item.Aset_Name || "Asset",
          issuedOn: formatDateDisplay(issueDate),
          lastWorkDate: formatDateDisplay(lastWorkDate),
          daysOverdue: calculateDaysOverdue(lastWorkDate),
          status: isLost ? "Lost" : "Overdue",
        };
      });
  }, [rawApiRecords]);

  // ── Column Definitions ────────────────────────────────────────────────────
  const employeeWiseColumns = useMemo(
    () => [
      {
        Header: "EMP CODE",
        accessor: "Emp_Code",
        width: 140,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[15px]">
            {value}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: "EMP_NAME",
        width: 200,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-[15px]">
            {value}
          </span>
        ),
      },
      {
        Header: "DEPARTMENT",
        accessor: "DEVISION",
        width: 160,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[15px]">
            {value}
          </span>
        ),
      },
      {
        Header: "ASSETS HELD",
        accessor: "assetsHeld",
        width: 130,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-[15px]">
            {value}
          </span>
        ),
      },
      {
        Header: "TOTAL VALUE",
        accessor: "totalValue",
        width: 150,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-[15px]">
            {value}
          </span>
        ),
      },
      {
        Header: "OLDEST ISSUE",
        accessor: "oldestIssue",
        width: 150,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[15px]">
            {value}
          </span>
        ),
      },
      {
        Header: "STATUS",
        accessor: "status",
        width: 140,
        Cell: ({ value }: any) => {
          if (value === "In use") {
            return (
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[13.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/40">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                In use
              </span>
            );
          }
          if (value === "Returned") {
            return (
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[13.5px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Returned
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[13.5px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800/40">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Overdue
            </span>
          );
        },
      },
    ],
    []
  );

  const categoryWiseColumns = useMemo(
    () => [
      {
        Header: "CATEGORY",
        accessor: "Asset_category",
        width: 200,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-[15px]">
            {value}
          </span>
        ),
      },
      {
        Header: "TOTAL ASSETS",
        accessor: "totalAssets",
        width: 140,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-[15px]">
            {value}
          </span>
        ),
      },
      {
        Header: "ISSUED",
        accessor: "issued",
        width: 130,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[15px]">
            {value}
          </span>
        ),
      },
      {
        Header: "IN STORE",
        accessor: "inStore",
        width: 130,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[15px]">
            {value}
          </span>
        ),
      },
      {
        Header: "UNDER REPAIR",
        accessor: "underRepair",
        width: 140,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[15px]">
            {value}
          </span>
        ),
      },
      {
        Header: "VALUE",
        accessor: "value",
        width: 160,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-[15px]">
            {value}
          </span>
        ),
      },
    ],
    []
  );

  const assetAgeingColumns = useMemo(
    () => [
      {
        Header: "ASSET CODE",
        accessor: "Aset_Code",
        width: 160,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[15px]">
            {value}
          </span>
        ),
      },
      {
        Header: "ASSET NAME",
        accessor: "Aset_Name",
        width: 220,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-[15px]">
            {value}
          </span>
        ),
      },
      {
        Header: "CATEGORY",
        accessor: "Asset_category",
        width: 150,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[15px]">
            {value}
          </span>
        ),
      },
      {
        Header: "HOLDER",
        accessor: "EMP_NAME",
        width: 150,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[15px]">
            {value}
          </span>
        ),
      },
      {
        Header: "AGE",
        accessor: "age",
        width: 140,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[15px]">
            {value}
          </span>
        ),
      },
      {
        Header: "STATUS",
        accessor: "status",
        width: 140,
        Cell: ({ value }: any) => {
          if (value === "In use") {
            return (
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[13.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/40">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                In use
              </span>
            );
          }
          if (value === "Returned") {
            return (
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[13.5px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Returned
              </span>
            );
          }
          if (value === "Consumed") {
            return (
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[13.5px] font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-950/60 dark:text-yellow-400 dark:border-yellow-800/40">
                <span className="w-2 h-2 rounded-full bg-yellow-600" />
                Consumed
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[13.5px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800/40">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Overdue
            </span>
          );
        },
      },
    ],
    []
  );

  const notReturnedColumns = useMemo(
    () => [
      {
        Header: "EMP CODE",
        accessor: "Emp_Code",
        width: 150,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[15px]">
            {value}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: "EMP_NAME",
        width: 200,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-[15px]">
            {value}
          </span>
        ),
      },
      {
        Header: "ASSET",
        accessor: "Aset_Name",
        width: 220,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[15px]">
            {value}
          </span>
        ),
      },
      {
        Header: "ISSUED ON",
        accessor: "issuedOn",
        width: 140,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[15px]">
            {value}
          </span>
        ),
      },
      {
        Header: "LAST WORK DATE",
        accessor: "lastWorkDate",
        width: 150,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[15px]">
            {value}
          </span>
        ),
      },
      {
        Header: "DAYS OVERDUE",
        accessor: "daysOverdue",
        width: 140,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-[15px]">
            {value}
          </span>
        ),
      },
      {
        Header: "STATUS",
        accessor: "status",
        width: 140,
        Cell: ({ value }: any) => {
          if (value === "Lost") {
            return (
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[13.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800/40">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Lost
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[13.5px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800/40">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Overdue
            </span>
          );
        },
      },
    ],
    []
  );

  // Active Report Meta
  const activeReportMeta = useMemo(() => {
    switch (activeReport) {
      case "EMPLOYEE_WISE":
        return {
          title: "Employee wise asset report",
          subtitle: `${employeeWiseData.length} rows · ${formatShortDate(dates.DATE_FROM)} – ${formatShortDate(dates.DATE_TO)}`,
          columns: employeeWiseColumns,
          data: employeeWiseData,
          footerNote:
            "Employee-wise holding, valued at purchase cost. Overdue = asset not returned after the last working date.",
        };
      case "CATEGORY_WISE":
        return {
          title: "Category wise stock report",
          subtitle: `${categoryWiseData.length} rows · ${formatShortDate(dates.DATE_FROM)} – ${formatShortDate(dates.DATE_TO)}`,
          columns: categoryWiseColumns,
          data: categoryWiseData,
          footerNote: "Category-wise stock position as on the end date of the selected range.",
        };
      case "ASSET_AGEING":
        return {
          title: "Asset ageing report",
          subtitle: `${assetAgeingData.length} rows · ${formatShortDate(dates.DATE_FROM)} – ${formatShortDate(dates.DATE_TO)}`,
          columns: assetAgeingColumns,
          data: assetAgeingData,
          footerNote: "Assets older than 4 years are due for replacement as per the IT policy.",
        };
      case "NOT_RETURNED":
        return {
          title: "Not returned report",
          subtitle: `${notReturnedData.length} rows · ${formatShortDate(dates.DATE_FROM)} – ${formatShortDate(dates.DATE_TO)}`,
          columns: notReturnedColumns,
          data: notReturnedData,
          footerNote: "Recovery of these assets should be settled before the full and final payout.",
        };
    }
  }, [
    activeReport,
    dates,
    employeeWiseData,
    employeeWiseColumns,
    categoryWiseData,
    categoryWiseColumns,
    assetAgeingData,
    assetAgeingColumns,
    notReturnedData,
    notReturnedColumns,
  ]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] pb-24 font-sans antialiased">
      <main className="px-4 sm:px-8 pt-6 max-w-[1700px] mx-auto space-y-6">
        {/* ── 1. PAGE HEADER ────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Asset reports
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium mt-1">
            Pick a period, choose a report, and export. Everything below reflects the selected date range.
          </p>
        </div>

        {/* ── 2. FILTER BAR ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-5 sm:p-6 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-5 items-end">
            <div className="lg:col-span-2">
              <Einput
                title="DATE FROM"
                type="date"
                name="DATE_FROM"
                value={dates.DATE_FROM}
                handleInputChange={handleDateChange}
              />
            </div>

            <div className="lg:col-span-2">
              <Einput
                title="DATE TO"
                type="date"
                name="DATE_TO"
                value={dates.DATE_TO}
                handleInputChange={handleDateChange}
              />
            </div>

            <div className="lg:col-span-3">
              <Eselect
                title="BRANCH"
                name="branch"
                option={branchOptions}
                initialValue={selectedBranch}
                handleInputChange={(_, val) => setSelectedBranch(val)}
                placeholder="All branches"
              />
            </div>

            <div className="lg:col-span-3">
              <Eselect
                title="CATEGORY"
                name="category"
                option={categoryOptions}
                initialValue={selectedCategory}
                handleInputChange={(_, val) => setSelectedCategory(val)}
                placeholder="All categories"
              />
            </div>

            <div className="lg:col-span-2 flex items-end">
              <AButton
                type="button"
                variant="primary"
                size="sm"
                fullWidth
                icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                onClick={fetchReportData}
                className="!bg-[#4338CA] hover:!bg-[#3730A3] text-white font-semibold !rounded-xl !h-10 text-lg shadow-sm"
              >
                Show
              </AButton>
            </div>
          </div>
        </div>

        {/* ── 3. FOUR REPORT SELECTION CARDS ───────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Employee wise asset */}
          <div
            onClick={() => setActiveReport("EMPLOYEE_WISE")}
            className={`p-5 sm:p-6 rounded-2xl cursor-pointer select-none transition-all flex flex-col justify-between min-h-[145px] ${activeReport === "EMPLOYEE_WISE"
                ? "border-2 border-[#4F46E5] bg-white dark:bg-[#111827] shadow-sm ring-1 ring-[#4F46E5]/20"
                : "border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
              }`}
          >
            <div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] dark:bg-indigo-950/80 text-[#4F46E5] dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[15px] sm:text-base text-slate-900 dark:text-slate-100 truncate">
                  Employee wise asset
                </h3>
              </div>
              <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 font-medium mt-2 leading-relaxed">
                What each employee is holding right now, with value.
              </p>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {employeeWiseData.length}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                employees
              </span>
            </div>
          </div>

          {/* Card 2: Category wise stock */}
          <div
            onClick={() => setActiveReport("CATEGORY_WISE")}
            className={`p-5 sm:p-6 rounded-2xl cursor-pointer select-none transition-all flex flex-col justify-between min-h-[145px] ${activeReport === "CATEGORY_WISE"
                ? "border-2 border-[#4F46E5] bg-white dark:bg-[#111827] shadow-sm ring-1 ring-[#4F46E5]/20"
                : "border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
              }`}
          >
            <div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] dark:bg-emerald-950/80 text-[#059669] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[15px] sm:text-base text-slate-900 dark:text-slate-100 truncate">
                  Category wise stock
                </h3>
              </div>
              <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 font-medium mt-2 leading-relaxed">
                Issued, in store and under repair, by asset category.
              </p>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {categoryWiseData.length}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                categories
              </span>
            </div>
          </div>

          {/* Card 3: Asset ageing */}
          <div
            onClick={() => setActiveReport("ASSET_AGEING")}
            className={`p-5 sm:p-6 rounded-2xl cursor-pointer select-none transition-all flex flex-col justify-between min-h-[145px] ${activeReport === "ASSET_AGEING"
                ? "border-2 border-[#4F46E5] bg-white dark:bg-[#111827] shadow-sm ring-1 ring-[#4F46E5]/20"
                : "border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
              }`}
          >
            <div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] dark:bg-amber-950/80 text-[#D97706] dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Hourglass className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[15px] sm:text-base text-slate-900 dark:text-slate-100 truncate">
                  Asset ageing
                </h3>
              </div>
              <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 font-medium mt-2 leading-relaxed">
                How old each asset is, oldest first — drives replacement.
              </p>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {assetAgeingData.length}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                assets
              </span>
            </div>
          </div>

          {/* Card 4: Not returned (with rose accent) */}
          <div
            onClick={() => setActiveReport("NOT_RETURNED")}
            className={`p-5 sm:p-6 rounded-2xl cursor-pointer select-none transition-all flex flex-col justify-between min-h-[145px] relative overflow-hidden ${activeReport === "NOT_RETURNED"
                ? "border-2 border-[#4F46E5] bg-white dark:bg-[#111827] shadow-sm ring-1 ring-[#4F46E5]/20"
                : "border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
              }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
            <div>
              <div className="flex items-center gap-3 pt-1">
                <div className="w-9 h-9 rounded-xl bg-[#FFE4E6] dark:bg-rose-950/80 text-[#E11D48] dark:text-rose-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[15px] sm:text-base text-slate-900 dark:text-slate-100 truncate">
                  Not returned
                </h3>
              </div>
              <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 font-medium mt-2 leading-relaxed">
                Assets still out after the employee&apos;s last working date.
              </p>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {notReturnedData.length}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                open cases
              </span>
            </div>
          </div>
        </div>

        {/* ── 4. REPORT DATA TABLE SECTION ──────────────────────────────── */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl shadow-2xs overflow-hidden">
          {/* Table Header Bar */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111827]">
            <div className="flex items-baseline gap-2 min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                {activeReportMeta.title}
              </h2>
              <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {activeReportMeta.subtitle}
              </span>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <AButton
                type="button"
                variant="outline"
                size="sm"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={handleExport}
                className="border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold shadow-2xs whitespace-nowrap"
              >
                Export
              </AButton>

              <AButton
                type="button"
                variant="outline"
                size="sm"
                icon={<Printer className="w-3.5 h-3.5" />}
                onClick={handlePrint}
                className="border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold shadow-2xs whitespace-nowrap"
              >
                Print
              </AButton>
            </div>
          </div>

          {/* Table Content */}
          <div className="p-3 sm:p-4">
            <DataTable
              columns={activeReportMeta.columns}
              data={activeReportMeta.data}
              showTopSearch={false}
              showExcelExport={false}
              initialPageSize={10}
            />
          </div>

          {/* Footer Notice / Remark */}
          <div className="px-5 sm:px-6 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
            <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 font-medium">
              {activeReportMeta.footerNote}
            </p>
          </div>
        </div>

        {/* Hidden Printout Component for print engine integration */}
        <div className="hidden">
          <Printout ref={printRef} />
          <Card />
        </div>
      </main>
    </div>
  );
}
