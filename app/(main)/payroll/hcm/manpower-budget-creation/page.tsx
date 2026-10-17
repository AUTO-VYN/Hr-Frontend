"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import axios from "axios";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useToast } from "@/app/hooks/useToast";
import Toast from "@/components/ui/Toast";
import {
  Layers,
  Users,
  Wallet,
  ListChecks,
  Search,
  Save,
  Info,
} from "lucide-react";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import ServiceTablePagination from "@/components/Templates/reacttable";
import Card, { StatCard } from "@/components/Templates/card";
import HashloaderComponent from "@/components/Templates/hashloader";

const cardClass =
  "bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)]";

export default function ManpowerBudgetCreationPage() {
  const user = useCurrentUser();
  const { toast, hideToast } = useToast();

  const [selectedOption, setSelectedOption] = useState<"branch" | "department">("branch");
  const [tableData, setTableData] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch initial predata
  const BudgetPredata = async () => {
    setIsLoading(true);
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/BudgetPredata`,
        {
          multi_loc: user?.branch,
          username: user?.name,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
            token: user?.email,
          },
        }
      );
      const bData = result.data?.branches || [];
      const dData = result.data?.Department || [];
      setBranches(bData);
      setDepartments(dData);
      setTableData(selectedOption === "branch" ? bData : dData);
    } catch (err) {
      console.error("Error fetching budget predata:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.Comp_Code) {
      BudgetPredata();
    }
  }, [user?.Comp_Code, user?.branch]);

  // Handle Branch / Department switcher
  const handleOptionChange = (option: "branch" | "department") => {
    setSelectedOption(option);
    setSearchQuery("");
    if (option === "branch") {
      setTableData(branches);
    } else {
      setTableData(departments);
    }
  };

  // Update row handler
  const updateRowByName = (name: string, field: string, value: any) => {
    const updateList = (list: any[]) =>
      list.map((item) =>
        item.name === name ? { ...item, [field]: value } : item
      );

    setTableData((prev) => updateList(prev));
    if (selectedOption === "branch") {
      setBranches((prev) => updateList(prev));
    } else {
      setDepartments((prev) => updateList(prev));
    }
  };

  const updateRowRef = useRef(updateRowByName);
  updateRowRef.current = updateRowByName;

  // Clear all budget inputs in current view
  const handleClearAll = () => {
    const cleared = (list: any[]) =>
      list.map((item) => ({ ...item, positions: "", salary: "" }));
    if (selectedOption === "branch") {
      setBranches((prev) => cleared(prev));
      setTableData((prev) => cleared(prev));
    } else {
      setDepartments((prev) => cleared(prev));
      setTableData((prev) => cleared(prev));
    }
  };

  // Validation
  const hasValidRow = (dataArray: any[], keyFields: string[]) => {
    return dataArray.some((item) =>
      keyFields.some((field) => {
        const value = item[field];
        return (
          value !== null &&
          value !== undefined &&
          String(value).trim() !== "" &&
          Number(value) !== 0
        );
      })
    );
  };

  // Save budget handler
  const handleSave = async () => {
    const branchesData = branches.map((item) => ({
      ...item,
      Created_by: user?.id,
    }));

    const departmentsData = departments.map((item) => ({
      ...item,
      Created_by: user?.id,
    }));

    const branchKeyFields = ["positions", "salary"];
    const departmentKeyFields = ["salary", "positions"];

    const isBranchValid = hasValidRow(branchesData, branchKeyFields);
    const isDepartmentValid = hasValidRow(departmentsData, departmentKeyFields);

    if (!isBranchValid && !isDepartmentValid) {
      toast({
        title: "Please enter data in at least one row of branches or departments",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/savemanpowerbudget`,
        {
          branches: branchesData,
          departments: departmentsData,
          username: user?.name,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
            token: user?.email,
          },
        }
      );
      toast({
        title: "Data Saved Successfully",
        variant: "default",
      });
      const updatedBranches = result.data?.branches || [];
      const updatedDepartments = result.data?.Department || [];
      setBranches(updatedBranches);
      setDepartments(updatedDepartments);
      setTableData(
        selectedOption === "branch" ? updatedBranches : updatedDepartments
      );
    } catch (err) {
      console.error("Error saving budget:", err);
      toast({
        title: "Error saving manpower budget",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Dynamic calculations for Active View
  const activeList = selectedOption === "branch" ? branches : departments;
  const totalUnits = activeList.length;

  const budgetedUnits = useMemo(() => {
    return activeList.filter((item) => {
      const p = Number(item.positions);
      const s = Number(item.salary);
      return (p && p > 0) || (s && s > 0);
    }).length;
  }, [activeList]);

  const totalPositions = useMemo(() => {
    return activeList.reduce(
      (acc, item) => acc + (Number(item.positions) || 0),
      0
    );
  }, [activeList]);

  const totalSalary = useMemo(() => {
    return activeList.reduce(
      (acc, item) => acc + (Number(item.salary) || 0),
      0
    );
  }, [activeList]);

  const formattedSalaryBudget = useMemo(() => {
    if (!totalSalary || totalSalary === 0) return "₹0";
    if (totalSalary >= 10000000) {
      return `₹${(totalSalary / 10000000).toFixed(2)} Cr`;
    }
    if (totalSalary >= 100000) {
      return `₹${(totalSalary / 100000).toFixed(2)} L`;
    }
    return `₹${totalSalary.toLocaleString("en-IN")}`;
  }, [totalSalary]);

  const rowsToComplete = Math.max(0, totalUnits - budgetedUnits);

  const completedUnits = useMemo(() => {
    return activeList.filter((item) => {
      const p = Number(item.positions);
      const s = Number(item.salary);
      return p > 0 && s > 0;
    }).length;
  }, [activeList]);

  const incompleteRows = useMemo(() => {
    return activeList.filter((item) => {
      const p = Number(item.positions);
      const s = Number(item.salary);
      const hasP = p && p > 0;
      const hasS = s && s > 0;
      return (hasP && !hasS) || (!hasP && hasS);
    }).length;
  }, [activeList]);

  const averageCostPerHead = useMemo(() => {
    if (!totalPositions || totalPositions === 0 || !totalSalary || totalSalary === 0) {
      return 0;
    }
    return Math.round(totalSalary / totalPositions);
  }, [totalSalary, totalPositions]);

  // Filter rows by search
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return tableData;
    const q = searchQuery.toLowerCase().trim();
    return tableData.filter((row: any) =>
      String(row.name || "").toLowerCase().includes(q)
    );
  }, [tableData, searchQuery]);

  // Columns definition for ServiceTablePagination
  const columns = useMemo(
    () => [
      {
        Header: selectedOption === "branch" ? "BRANCH" : "DEPARTMENT",
        accessor: "name",
        Cell: ({ row }: any) => {
          const p = Number(row.original.positions);
          const s = Number(row.original.salary);
          const hasP = p && p > 0;
          const hasS = s && s > 0;
          const isHalf = (hasP && !hasS) || (!hasP && hasS);
          const isFilled = hasP || hasS;

          return (
            <div className="flex items-center gap-[12px] pl-1">
              <span
                className={`w-[8px] h-[8px] rounded-full shrink-0 ${
                  isHalf
                    ? "bg-[#F59E0B]"
                    : isFilled
                    ? "bg-[#10B981]"
                    : "bg-[#CBD5E1] dark:bg-[#334155]"
                }`}
              />
              <span className="font-[550] text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] truncate">
                {row.original.name || "—"}
              </span>
            </div>
          );
        },
      },
      {
        Header: "NO. OF POSITIONS",
        accessor: "positions",
        Cell: ({ row }: any) => {
          const p = Number(row.original.positions);
          const s = Number(row.original.salary);
          const hasP = p && p > 0;
          const hasS = s && s > 0;
          const isHalf = (hasP && !hasS) || (!hasP && hasS);

          return (
            <div className="w-full max-w-[200px]">
              <Einput
                title=""
                labelClassName="hidden"
                type="text"
                name={`positions-${row.original.name}`}
                value={row.original.positions ?? ""}
                placeholder="Enter positions"
                handleInputChange={(_name, val) =>
                  updateRowRef.current(
                    row.original.name,
                    "positions",
                    val.replace(/[^0-9]/g, "")
                  )
                }
                className={`!h-[33px] !rounded-[8px] !bg-transparent dark:!bg-transparent !text-[#1E293B] dark:!text-[#E7ECF3] !text-[12.5px] !px-[9px] !py-[8px] tabular-nums focus-visible:!border-[#4F46E5] dark:focus-visible:!border-[#8B84FF] focus-visible:!bg-white dark:focus-visible:!bg-[#0E1524] focus-visible:!ring-0 hover:!bg-[#F8FAFC] dark:hover:!bg-[#0E1524] !shadow-none transition-colors ${
                  isHalf && !hasP
                    ? "!border-[#F59E0B]"
                    : "!border-[#E2E8F0] dark:!border-[#1F2937]"
                }`}
              />
            </div>
          );
        },
      },
      {
        Header: "SALARY BUDGET",
        accessor: "salary",
        Cell: ({ row }: any) => {
          const p = Number(row.original.positions);
          const s = Number(row.original.salary);
          const hasP = p && p > 0;
          const hasS = s && s > 0;
          const isHalf = (hasP && !hasS) || (!hasP && hasS);

          return (
            <div className="w-full max-w-[240px]">
              <Einput
                title=""
                labelClassName="hidden"
                type="text"
                name={`salary-${row.original.name}`}
                value={row.original.salary ?? ""}
                placeholder="Enter salary budget"
                handleInputChange={(_name, val) =>
                  updateRowRef.current(
                    row.original.name,
                    "salary",
                    val.replace(/[^0-9]/g, "")
                  )
                }
                className={`!h-[33px] !rounded-[8px] !bg-transparent dark:!bg-transparent !text-[#1E293B] dark:!text-[#E7ECF3] !text-[12.5px] !px-[9px] !py-[8px] tabular-nums focus-visible:!border-[#4F46E5] dark:focus-visible:!border-[#8B84FF] focus-visible:!bg-white dark:focus-visible:!bg-[#0E1524] focus-visible:!ring-0 hover:!bg-[#F8FAFC] dark:hover:!bg-[#0E1524] !shadow-none transition-colors ${
                  isHalf && !hasS
                    ? "!border-[#F59E0B]"
                    : "!border-[#E2E8F0] dark:!border-[#1F2937]"
                }`}
              />
            </div>
          );
        },
      },
      {
        Header: "COST PER HEAD",
        id: "cost_per_head",
        Cell: ({ row }: any) => {
          const p = Number(row.original.positions);
          const s = Number(row.original.salary);
          if (!p || !s || p <= 0 || s <= 0) {
            return (
              <span className="text-[#64748B] dark:text-[#94A3B8] font-normal select-none px-2">
                —
              </span>
            );
          }
          const cost = Math.round(s / p);
          return (
            <span className="text-[#1E293B] dark:text-[#E7ECF3] text-[12px] tabular-nums whitespace-nowrap px-2 font-[500]">
              ₹{cost.toLocaleString("en-IN")} / head
            </span>
          );
        },
      },
    ],
    [selectedOption]
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] font-['Inter',system-ui,sans-serif] p-4 sm:p-6 lg:p-[22px_24px_90px_24px] space-y-[14px]">
      <HashloaderComponent isLoading={isLoading} />

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & SWITCHER */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-[18px]">
        <div>
          <h1 className="text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3] m-0">
            Manpower budget creation
          </h1>
          <p className="mt-[5px] mb-0 text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
            Set approved positions and salary budget per unit. Rows already filled are marked; the totals update as you type.
          </p>
        </div>

        {/* Segmented Pill Toggle (Branch wise / Department wise) */}
        <div className="inline-flex items-center gap-[3px] rounded-[10px] border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0E1524] p-[3px] shrink-0">
          <button
            type="button"
            onClick={() => handleOptionChange("branch")}
            className={`px-[13px] py-[7px] rounded-[8px] text-[12px] font-[600] transition-colors cursor-pointer border-none ${
              selectedOption === "branch"
                ? "bg-[#4F46E5] text-white shadow-xs"
                : "bg-transparent text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#E7ECF3]"
            }`}
          >
            Branch wise
          </button>
          <button
            type="button"
            onClick={() => handleOptionChange("department")}
            className={`px-[13px] py-[7px] rounded-[8px] text-[12px] font-[600] transition-colors cursor-pointer border-none ${
              selectedOption === "department"
                ? "bg-[#4F46E5] text-white shadow-xs"
                : "bg-transparent text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#E7ECF3]"
            }`}
          >
            Department wise
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. STAT CARDS ROW (Using StatCard from card.tsx) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[14px] mb-[14px]">
        {/* Stat 1: UNITS */}
        <StatCard
          title="UNITS"
          count={
            (
              <div className="flex flex-col text-left">
                <span className="text-[22px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums leading-tight">
                  {totalUnits}
                </span>
                <span className="text-[11.5px] font-normal text-[#64748B] dark:text-[#94A3B8] mt-[3px] tracking-normal leading-normal">
                  {budgetedUnits} budgeted
                </span>
              </div>
            ) as any
          }
          icon={<Layers className="w-4 h-4 text-[#4F46E5]" />}
          className="!h-auto !min-h-0 !p-[14px_16px] !rounded-[12px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] !shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:!shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] !cursor-default !select-auto hover:!shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] active:!scale-100 flex flex-col justify-start"
          iconClassName="!w-[24px] !h-[24px] !rounded-[7px] !border-0 !bg-[#4F46E5]/12 flex items-center justify-center shrink-0"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          countClassName="!text-[22px] !font-[650] !tracking-[-0.02em] !mt-[9px] !text-[#1E293B] dark:!text-[#E7ECF3]"
        />

        {/* Stat 2: BUDGETED POSITIONS */}
        <StatCard
          title="BUDGETED POSITIONS"
          count={
            (
              <div className="flex flex-col text-left">
                <span className="text-[22px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums leading-tight">
                  {totalPositions.toLocaleString("en-IN")}
                </span>
                <span className="text-[11.5px] font-normal text-[#64748B] dark:text-[#94A3B8] mt-[3px] tracking-normal leading-normal">
                  across all units
                </span>
              </div>
            ) as any
          }
          icon={<Users className="w-4 h-4 text-[#0D9488]" />}
          className="!h-auto !min-h-0 !p-[14px_16px] !rounded-[12px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] !shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:!shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] !cursor-default !select-auto hover:!shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] active:!scale-100 flex flex-col justify-start"
          iconClassName="!w-[24px] !h-[24px] !rounded-[7px] !border-0 !bg-[#0D9488]/12 flex items-center justify-center shrink-0"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          countClassName="!text-[22px] !font-[650] !tracking-[-0.02em] !mt-[9px] !text-[#1E293B] dark:!text-[#E7ECF3]"
        />

        {/* Stat 3: SALARY BUDGET */}
        <StatCard
          title="SALARY BUDGET"
          count={
            (
              <div className="flex flex-col text-left">
                <span className="text-[22px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums leading-tight">
                  {formattedSalaryBudget}
                </span>
                <span className="text-[11.5px] font-normal text-[#64748B] dark:text-[#94A3B8] mt-[3px] tracking-normal leading-normal">
                  annual, all units
                </span>
              </div>
            ) as any
          }
          icon={<Wallet className="w-4 h-4 text-[#F59E0B]" />}
          className="!h-auto !min-h-0 !p-[14px_16px] !rounded-[12px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] !shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:!shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] !cursor-default !select-auto hover:!shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] active:!scale-100 flex flex-col justify-start"
          iconClassName="!w-[24px] !h-[24px] !rounded-[7px] !border-0 !bg-[#F59E0B]/12 flex items-center justify-center shrink-0"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          countClassName="!text-[22px] !font-[650] !tracking-[-0.02em] !mt-[9px] !text-[#1E293B] dark:!text-[#E7ECF3]"
        />

        {/* Stat 4: ROWS COMPLETED */}
        <StatCard
          title="ROWS COMPLETED"
          count={
            (
              <div className="flex flex-col text-left">
                <span className="text-[22px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums leading-tight">
                  {completedUnits}
                </span>
                <span className="text-[11.5px] font-normal text-[#64748B] dark:text-[#94A3B8] mt-[3px] tracking-normal leading-normal">
                  {incompleteRows > 0 ? `${incompleteRows} part-filled` : "no half-filled rows"}
                </span>
              </div>
            ) as any
          }
          icon={
            <ListChecks
              className={`w-4 h-4 ${
                incompleteRows > 0 ? "text-[#E11D48]" : "text-[#10B981]"
              }`}
            />
          }
          className="!h-auto !min-h-0 !p-[14px_16px] !rounded-[12px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] !shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:!shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] !cursor-default !select-auto hover:!shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] active:!scale-100 flex flex-col justify-start"
          iconClassName={`!w-[24px] !h-[24px] !rounded-[7px] !border-0 flex items-center justify-center shrink-0 ${
            incompleteRows > 0 ? "!bg-[#E11D48]/12" : "!bg-[#10B981]/12"
          }`}
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          countClassName="!text-[22px] !font-[650] !tracking-[-0.02em] !mt-[9px] !text-[#1E293B] dark:!text-[#E7ECF3]"
        />
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3. TABLE CARD */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className={`${cardClass} overflow-hidden`}>
        {/* Table Card Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-[18px] py-[13px] border-b border-[#E2E8F0] dark:border-[#1F2937]">
          <div className="flex items-center gap-[10px]">
            <h2 className="text-[14px] font-[600] text-[#1E293B] dark:text-[#E7ECF3] m-0">
              {selectedOption === "branch" ? "Branch wise budget" : "Department wise budget"}
            </h2>
            <span className="text-[11.5px] font-normal text-[#64748B] dark:text-[#94A3B8] tabular-nums">
              {budgetedUnits} of {totalUnits} filled
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Filter rows search input */}
            <div className="flex items-center gap-[9px] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[9px] bg-[#F8FAFC] dark:bg-[#0E1524] px-[10px] py-[6px] w-[220px]">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Filter rows…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-0 border-none outline-none bg-transparent text-[#1E293B] dark:text-[#E7ECF3] text-[12px] placeholder:text-[#64748B] placeholder:opacity-65 p-0"
              />
            </div>
          </div>
        </div>

        {/* ReactTable with Einput inside cells */}
        <ServiceTablePagination
          columns={columns}
          data={filteredRows}
          initialPageSize={100}
          height="560px"
          showTopSearch={false}
          showExcelExport={false}
          showColumnFilters={false}
          containerClassName="!border-0 !rounded-none shadow-none [&>div:last-child]:hidden [&_table]:w-full [&_table]:border-collapse [&_th]:!bg-[#F8FAFC] dark:[&_th]:!bg-[#0E1524] [&_th]:!border-b [&_th]:!border-[#E2E8F0] dark:[&_th]:!border-[#1F2937] [&_th]:!py-[10px] [&_th]:!px-[12px] [&_th]:!text-[10.5px] [&_th]:!font-[700] [&_th]:!tracking-[0.05em] [&_th]:!uppercase [&_th]:!text-[#64748B] dark:[&_th]:!text-[#94A3B8] [&_td]:!py-[6px] [&_td]:!px-[8px] [&_td]:!border-b [&_td]:!border-[#E2E8F0] dark:[&_td]:!border-[#1F2937]"
        />

        {/* Bottom Note & Average Cost Summary inside card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-[18px] py-[12px] border-t border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0E1524] text-[12px] text-[#64748B] dark:text-[#94A3B8]">
          <div className="flex items-center gap-[7px]">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Salary budget is the annual cost for that unit, in rupees.</span>
          </div>
          <div className="tabular-nums">
            Average cost per head{" "}
            <span className="text-[#1E293B] dark:text-[#E7ECF3] font-[600]">
              {averageCostPerHead ? `₹${averageCostPerHead.toLocaleString("en-IN")}` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 4. PAGE FOOTER BAR */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 sm:left-[var(--sidebar-width,68px)] right-0 z-40 bg-white dark:bg-[#111827] border-t border-[#E2E8F0] dark:border-[#1F2937] px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3.5 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] transition-[left] duration-150 ease-in-out">
        <span className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
          FY 2026-27 · {selectedOption === "branch" ? "branch wise" : "department wise"} · {budgetedUnits} of {totalUnits} units budgeted
        </span>
        <div className="flex items-center gap-2.5">
          <AButton
            type="button"
            variant="outline"
            onClick={handleClearAll}
            className="!h-auto !py-[8px] !px-[14px] !rounded-[10px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] !text-[#64748B] dark:!text-[#94A3B8] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] hover:!text-[#1E293B] dark:hover:!text-[#E7ECF3] !text-[12.5px] !font-[550] transition-colors"
          >
            Clear all
          </AButton>
          <AButton
            type="button"
            variant="primary"
            onClick={handleSave}
            loading={isSaving}
            icon={<Save className="w-4 h-4 text-white" />}
            className={`!h-auto !py-[8px] !px-[17px] !rounded-[10px] !border-transparent text-white !text-[12.5px] !font-[600] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] transition-all ${
              budgetedUnits > 0
                ? "!bg-[#4F46E5] hover:!bg-[#4338CA] dark:!bg-[#4F46E5] dark:hover:!bg-[#4338CA] cursor-pointer"
                : "!bg-[#64748B] dark:!bg-[#475569] opacity-80 cursor-not-allowed"
            }`}
          >
            Save budget
          </AButton>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
      />
    </div>
  );
}
