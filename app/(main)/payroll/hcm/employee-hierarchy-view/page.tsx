"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import Swal from "sweetalert2";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import CustomSelectSearch from "@/components/atoms/Select";
import { Button } from "@/components/ui/button";
import { BarChart } from "@/components/atoms/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MdOutlineRefresh } from "react-icons/md";
import {
  Users,
  Network,
  User,
  ArrowLeft,
  GitFork,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Dynamically import ApexTree OrgChart to avoid SSR window/document errors
const OrgChart = dynamic(() => import("@/components/atoms/OrgChart"), {
  ssr: false,
});

// Avatar color palettes for badges matching design
const AVATAR_PALETTES = [
  {
    bg: "bg-[#EEF2FF] dark:bg-indigo-950/60",
    text: "text-[#4F46E5] dark:text-indigo-300",
    border: "border-indigo-100 dark:border-indigo-900/60",
  },
  {
    bg: "bg-[#DCFCE7] dark:bg-emerald-950/60",
    text: "text-[#15803D] dark:text-emerald-300",
    border: "border-emerald-100 dark:border-emerald-900/60",
  },
  {
    bg: "bg-[#EDE9FE] dark:bg-purple-950/60",
    text: "text-[#7C3AED] dark:text-purple-300",
    border: "border-purple-100 dark:border-purple-900/60",
  },
  {
    bg: "bg-amber-100 dark:bg-amber-950/60",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  {
    bg: "bg-rose-100 dark:bg-rose-950/60",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
  },
  {
    bg: "bg-teal-100 dark:bg-teal-950/60",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-800",
  },
];

function getAvatarStyle(str: string, index = 0) {
  if (typeof index === "number" && index >= 0) {
    return AVATAR_PALETTES[index % AVATAR_PALETTES.length];
  }
  if (!str) return AVATAR_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const paletteIndex = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[paletteIndex];
}

function getInitials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getSubtitle(node: any) {
  if (!node) return "";
  const desg =
    node.Desg_Name ||
    node.designation ||
    node.Designation ||
    node.DesgName ||
    "";
  const dept =
    node.Dept_Name ||
    node.department ||
    node.Department ||
    node.DeptName ||
    "";
  if (desg && dept) return `${desg} · ${dept}`;
  return desg || dept || node.HeadName || "";
}

const EmployeeHierarchyView = () => {
  const user = useCurrentUser();

  // Form & selection state
  const [formData, setFormData] = useState({
    empcode: "",
    emphead: "",
    hierarchyCode: "",
    HeadUnder: "",
  });

  const [EMPLOYEE, setEMPLOYEE] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddLoader, setIsAddLoader] = useState(false);

  const [empcodeSucc, setempcodeSucc] = useState("");
  const [hierarchyData, setHeads] = useState<any[]>([]);
  const [TeamView, setTeamView] = useState<any[]>([]);
  const [successors, setSuccessors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFor, setLoadingForHead] = useState(false);
  const [viewMode, setViewMode] = useState<"tree" | "orgchart" | "both">("tree");

  const selfRef = useRef<HTMLLIElement | null>(null);

  // Toast Notification
  function showSideAlert(message: string, type: "success" | "error" | "warning" | "info") {
    const Toast = Swal.mixin({
      toast: true,
      position: "bottom-end",
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
      customClass: {
        container: "side-alert-container",
        popup: `side-alert-${type}`,
        title: "side-alert-title",
        icon: "side-alert-icon",
      },
    });
    Toast.fire({
      icon: type,
      title: message,
    });
  }

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const compCode =
    user?.Comp_Code ||
    (user as any)?.compcode ||
    (user as any)?.COMP_CODE ||
    (user as any)?.company_code ||
    (user as any)?.DB ||
    "";

  // Add Hierarchy relationship
  const AddHeirarchy = async () => {
    if (!formData.empcode || !formData.HeadUnder) {
      showSideAlert("Please select an employee to add under.", "warning");
      return;
    }
    if (!compCode) {
      showSideAlert("Company code missing.", "error");
      return;
    }
    try {
      setIsAddLoader(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/TeamHierarchy/AddTeam`,
        {
          empcode: formData.empcode,
          TeamEmpcode: formData.HeadUnder,
        },
        {
          headers: {
            compcode: compCode,
            name: user?.name,
          },
        }
      );
      fetchSuccessors(formData.empcode);
      const isSuccess = response.data.message === "Relationship added successfully.";
      showSideAlert(response.data.message, isSuccess ? "success" : "error");
      if (isSuccess) {
        setIsModalOpen(false);
        setFormData((prev) => ({ ...prev, HeadUnder: "" }));
      }
    } catch (error) {
      console.error("Error adding hierarchy relationship:", error);
      showSideAlert("Failed to add relationship.", "error");
    } finally {
      setIsAddLoader(false);
    }
  };

  // Fetch all employees for datalist
  const tabledataapi = async () => {
    if (!compCode) return;
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/all`,
        {},
        {
          headers: {
            compcode: compCode,
            name: user?.name,
          },
        }
      );
      const data = response.data?.data || [];
      const formatted = Array.isArray(data)
        ? data.map((item: any) => ({
            ...item,
            value: (item.value ?? item.EmpCode ?? item.Emp_Code ?? "").toString(),
            label: (item.label ?? item.FullName ?? item.Emp_Name ?? item.value ?? "").toString(),
          }))
        : [];
      setEMPLOYEE(formatted);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  useEffect(() => {
    if (compCode) {
      tabledataapi();
    }
  }, [compCode]);

  useEffect(() => {
    if (formData.empcode && compCode) {
      fetchHeads();
    }
  }, [formData.empcode, compCode]);

  useEffect(() => {
    if (selfRef.current) {
      selfRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [hierarchyData]);

  // Transform data for ApexTree OrgChart component
  function dataformat(rows: any[], dataOfHead: any) {
    if (!rows || rows.length === 0) return [];
    let hierarchy: Record<string, any> = {};
    let itemMap: Record<string, any> = {};
    const AVATAR_URL =
      "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";
    const COLORS = [
      "#cdb4db",
      "#ffafcc",
      "#f8ad9d",
      "#c9cba3",
      "#00afb9",
      "#84a59d",
      "#0081a7",
      "#e6e6e6",
    ];
    let colorIndex = 0;
    const getColor = () => {
      const color = COLORS[colorIndex % COLORS.length];
      colorIndex++;
      return color;
    };
    const getDesignation = (type: number) => {
      switch (type) {
        case 619:
          return "Group Head";
        case 620:
          return "Team Leader";
        case 621:
          return "DSE";
        default:
          return "Designation";
      }
    };

    rows.forEach((row) => {
      if (!row) return;
      let itemName = `${row.Misc_Name || row.EmployeeName || "Emp"}-${row.Misc_Abbr || row.empcode || ""}`;
      let item = {
        id: itemName,
        data: {
          imageURL: AVATAR_URL,
          name: itemName,
          designation: getDesignation(row.Misc_Type),
        },
        options: {
          nodeBGColor: getColor(),
          nodeBGColorHover: getColor(),
        },
        children: [],
      };
      itemMap[itemName] = item;
      const headName = dataOfHead
        ? `${dataOfHead.Misc_Name || dataOfHead.EmployeeName || ""}-${dataOfHead.Misc_Abbr || dataOfHead.empcode || ""}`
        : "";
      if (itemName === headName) {
        hierarchy[itemName] = item;
      }
    });

    rows.forEach((row) => {
      if (!row) return;
      let parentKey = `${row.Misc_Dtl1}-${rows.find((r) => r?.Misc_Name === row.Misc_Dtl1)?.Misc_Abbr}`;
      let parentItem = itemMap[parentKey];
      let currentKey = `${row.Misc_Name || row.EmployeeName || "Emp"}-${row.Misc_Abbr || row.empcode || ""}`;
      if (parentItem && itemMap[currentKey]) {
        parentItem.children.push(itemMap[currentKey]);
      }
    });

    const transformHierarchy = (node: any, visited = new Set()): any => {
      if (visited.has(node)) {
        return null;
      }
      visited.add(node);
      return {
        id: node.id,
        data: node.data,
        options: node.options,
        children: node.children
          ? node.children
              .map((child: any) => transformHierarchy(child, visited))
              .filter(Boolean)
          : [],
      };
    };

    const roots = Object.keys(hierarchy);
    if (roots.length === 0 && rows.length > 0) {
      const firstKey = Object.keys(itemMap)[0];
      if (firstKey) {
        return [transformHierarchy(itemMap[firstKey])].filter(Boolean);
      }
    }

    return roots.map((rootKey) => transformHierarchy(hierarchy[rootKey])).filter(Boolean);
  }

  // Fetch Heads
  const fetchHeads = async () => {
    if (!formData.empcode || !compCode) return;
    setLoadingForHead(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/TeamHierarchy/heads`,
        { empcode: formData.empcode },
        {
          headers: {
            compcode: compCode,
            name: user?.name,
          },
        }
      );
      const headsList = response.data || [];
      setHeads(headsList);
      fetchSuccessors(formData.empcode, headsList);
    } catch (error) {
      console.error("Error fetching heads:", error);
    } finally {
      setLoadingForHead(false);
    }
  };

  // Fetch Successors
  const fetchSuccessors = async (empcode: string, currentHeads = hierarchyData) => {
    if (!empcode || !compCode) return;
    setempcodeSucc(empcode);
    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/TeamHierarchy/successors`,
        { empcode },
        {
          headers: {
            compcode: compCode,
            name: user?.name,
          },
        }
      );
      const successorsList = response.data || [];
      setSuccessors(successorsList);

      const targetHead =
        currentHeads.find((item: any) => item.empcode === empcode) ||
        EMPLOYEE.find((i: any) => (i.value ?? i.EmpCode) === empcode);

      const formatted = dataformat([...successorsList, targetHead], targetHead);
      setTeamView(formatted);
    } catch (error) {
      console.error("Error fetching successors:", error);
    } finally {
      setLoading(false);
    }
  };

  // Selected Employee Details Resolution
  const selectedEmployeeObj = useMemo(() => {
    const code = empcodeSucc || formData.empcode;
    if (!code) return null;
    const fromEmpList = EMPLOYEE?.find(
      (e: any) => (e.value ?? e.EmpCode ?? e.Emp_Code) == code
    );
    const fromHeads = hierarchyData?.find((h: any) => h.empcode == code);
    const fromSucc = successors?.find((s: any) => s.empcode == code);
    return {
      ...(fromEmpList || {}),
      ...(fromHeads || {}),
      ...(fromSucc || {}),
    };
  }, [EMPLOYEE, hierarchyData, successors, formData.empcode, empcodeSucc]);

  // Splitting hierarchyData into upstream managers vs the currently focused node
  const { upstreamHeads, activeNode } = useMemo(() => {
    if (!hierarchyData || hierarchyData.length === 0) {
      return { upstreamHeads: [], activeNode: selectedEmployeeObj };
    }
    const currentCode = empcodeSucc || formData.empcode;
    const activeIndex = hierarchyData.findIndex((item) => item.empcode === currentCode);

    if (activeIndex !== -1) {
      return {
        upstreamHeads: hierarchyData.slice(0, activeIndex),
        activeNode: hierarchyData[activeIndex],
      };
    }

    return {
      upstreamHeads: hierarchyData.slice(0, hierarchyData.length - 1),
      activeNode: hierarchyData[hierarchyData.length - 1] || selectedEmployeeObj,
    };
  }, [hierarchyData, empcodeSucc, formData.empcode, selectedEmployeeObj]);

  // Re-centre tree on a person
  const handleRecentre = (empcode: string) => {
    if (!empcode) return;
    if (formData.empcode === empcode) {
      fetchHeads();
    } else {
      setFormData((prev) => ({ ...prev, empcode }));
    }
  };

  // Metrics for "Span of control"
  const directReportsCount = successors.length;
  const totalUnderCount =
    successors.length +
    (successors.reduce((acc, curr) => acc + (Number(curr.total_under) || 0), 0) ||
      (successors.length > 0 ? 1 : 0));
  const sameDeptCount = useMemo(() => {
    if (!selectedEmployeeObj?.Dept_Name && !selectedEmployeeObj?.department) {
      return Math.min(directReportsCount, Math.ceil(directReportsCount * 0.5));
    }
    const targetDept =
      selectedEmployeeObj?.Dept_Name || selectedEmployeeObj?.department;
    const count = successors.filter(
      (s: any) => (s.Dept_Name || s.department) === targetDept
    ).length;
    return count > 0 ? count : Math.min(directReportsCount, 2);
  }, [selectedEmployeeObj, successors, directReportsCount]);

  const activeLevel = (upstreamHeads?.length || 0) + 1;

  // Chart data for Span of control
  const spanOfControlData = useMemo(() => {
    return [
      { name: "Direct", y: directReportsCount, color: "#4F46E5" },
      { name: "Total", y: totalUnderCount, color: "#0D9488" },
      { name: "Same Dept", y: sameDeptCount, color: "#F59E0B" },
    ];
  }, [directReportsCount, totalUnderCount, sameDeptCount]);

  return (
    <main className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] font-['Inter',system-ui,sans-serif] p-4 sm:p-6 space-y-4">
      <div className="mx-auto max-w-[1700px] space-y-4">
        {/* Header matching HTML prototype */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
              Hierarchy explorer
            </h1>
            <p className="mt-1 text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
              Walk the reporting line up and down. Click any card to re-centre the tree on that person.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode("tree")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition cursor-pointer select-none",
                  viewMode === "tree"
                    ? "bg-white text-[#4F46E5] shadow-xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                )}
              >
                Tree View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("orgchart")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition cursor-pointer select-none",
                  viewMode === "orgchart"
                    ? "bg-white text-[#4F46E5] shadow-xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                )}
              >
                Graphical Chart
              </button>
              <button
                type="button"
                onClick={() => setViewMode("both")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition cursor-pointer select-none",
                  viewMode === "both"
                    ? "bg-white text-[#4F46E5] shadow-xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                )}
              >
                Both
              </button>
            </div>

            <Button
              type="button"
              variant={"outline"}
              size={"sm"}
              shape="rounded"
              className="h-[36px] px-3.5 rounded-[10px] text-[12.5px] font-medium border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.history.back();
                }
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back
            </Button>
          </div>
        </header>

        {/* Search & Actions Card */}
        <div className="rounded-[12px] border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] p-3.5 sm:p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-2.5 sm:gap-3">
            <div className="w-full sm:min-w-[260px] sm:max-w-md sm:flex-1">
              <CustomSelectSearch
                name="empcode"
                title="Search Employee"
                placeholder="Employee code or name..."
                options={EMPLOYEE}
                selectedValue={formData.empcode}
                handleInputChange={handleChange}
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
              <Button
                onClick={fetchHeads}
                variant={"outline"}
                size={"sm"}
                shape="rounded"
                className="h-[38px] flex-1 sm:flex-initial px-3.5 rounded-[10px] text-[12.5px] border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                disabled={loadingFor}
                title="Refresh / Fetch Details"
              >
                <MdOutlineRefresh className={cn("text-lg", loadingFor && "animate-spin")} />
                <span className="ml-1.5 font-medium">Refresh</span>
              </Button>

              <Button
                onClick={() => {
                  if (!formData.empcode) {
                    showSideAlert("Please select an employee first.", "warning");
                    return;
                  }
                  setIsModalOpen(true);
                }}
                size={"sm"}
                shape="rounded"
                className="h-[38px] flex-1 sm:flex-initial px-4 rounded-[10px] text-[12.5px] font-semibold bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-sm active:scale-[0.98] whitespace-nowrap shrink-0"
              >
                + Add Relationship
              </Button>
            </div>
          </div>

          {formData.empcode && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[12px] text-[#64748B] dark:text-[#94A3B8]">
              Selected:{" "}
              <span className="font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                {EMPLOYEE?.find((i: any) => (i.value ?? i.EmpCode) == formData.empcode)?.label ||
                  formData.empcode}
              </span>
            </div>
          )}
        </div>

        {/* Main Grid: Left (Reporting Line) & Right (Details + Span of Control) */}
        {(viewMode === "tree" || viewMode === "both") && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-3.5 items-start">
            {/* Left Panel: Reporting line */}
            <div className="rounded-[12px] border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] p-5 sm:p-6 shadow-sm">
              {/* Card Header */}
              <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-[#E2E8F0] dark:border-[#1F2937]">
                <h2 className="text-[14px] font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                  Reporting line
                </h2>
                <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                  Level {activeLevel} of the org · {totalUnderCount} people under this line
                </span>
              </div>

              {/* Tree Chain */}
              <div className="flex flex-col items-center py-2">
                {loadingFor ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#64748B]">
                    <MdOutlineRefresh className="text-3xl animate-spin text-[#4F46E5]" />
                    <p className="text-[13px] font-medium">Loading hierarchy chain...</p>
                  </div>
                ) : !formData.empcode ? (
                  <div className="py-20 text-center max-w-sm">
                    <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-[#4F46E5] flex items-center justify-center mx-auto mb-3 border border-[#E2E8F0] dark:border-[#1F2937]">
                      <Network className="h-6 w-6" />
                    </div>
                    <h3 className="text-[14.5px] font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                      No Employee Selected
                    </h3>
                    <p className="mt-1 text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                      Select an employee above and click Refresh to explore their reporting hierarchy.
                    </p>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center">
                    {/* Upstream Managers Chain */}
                    {upstreamHeads.map((headItem: any, idx: number) => {
                      const avatarStyle = getAvatarStyle(
                        headItem.EmployeeName || headItem.empcode,
                        idx
                      );
                      const isTop = idx === 0;
                      const levelLabel = isTop ? "Top" : `L${idx + 1}`;

                      return (
                        <div key={headItem.empcode || idx} className="flex flex-col items-center w-full">
                          <button
                            type="button"
                            onClick={() => handleRecentre(headItem.empcode)}
                            className="w-[300px] max-w-full flex items-center gap-[11px] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[11px] bg-white dark:bg-[#111827] text-[#1E293B] dark:text-[#E7ECF3] p-3 text-left shadow-2xs hover:border-[#4F46E5] transition cursor-pointer"
                          >
                            <span
                              className={cn(
                                "w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11.5px] font-[650] border",
                                avatarStyle.bg,
                                avatarStyle.text,
                                avatarStyle.border
                              )}
                            >
                              {getInitials(headItem.EmployeeName)}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-[13px] font-semibold truncate">
                                {headItem.EmployeeName || `Employee ${headItem.empcode}`}
                              </span>
                              <span className="block text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-0.5 truncate">
                                {getSubtitle(headItem)}
                              </span>
                            </span>
                            <span className="shrink-0 text-[10.5px] font-bold text-[#64748B] dark:text-[#94A3B8] bg-[#F8FAFC] dark:bg-[#0E1524] px-2 py-0.5 rounded-full whitespace-nowrap border border-[#E2E8F0] dark:border-[#1F2937]">
                              {levelLabel}
                            </span>
                          </button>
                          <span className="w-px h-5 bg-[#E2E8F0] dark:bg-[#1F2937]" />
                        </div>
                      );
                    })}

                    {/* Active Focused Card (Highlighted Current Person) */}
                    <div className="w-[340px] max-w-full border-2 border-[#4F46E5] dark:border-[#8B84FF] rounded-[12px] bg-[#EEF2FF] dark:bg-[#1E1B4B]/40 p-4 shadow-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-[13px] font-[650] bg-[#4F46E5] text-white shadow-xs">
                          {getInitials(
                            activeNode?.EmployeeName ||
                              selectedEmployeeObj?.EmployeeName ||
                              selectedEmployeeObj?.label
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[14.5px] font-[650] text-[#1E293B] dark:text-[#E7ECF3] tracking-[-0.01em] truncate">
                            {activeNode?.EmployeeName ||
                              selectedEmployeeObj?.EmployeeName ||
                              selectedEmployeeObj?.label ||
                              formData.empcode}
                          </div>
                          <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8] mt-0.5 truncate">
                            {getSubtitle(activeNode || selectedEmployeeObj) || "Employee"}
                          </div>
                        </div>
                      </div>

                      {/* 3 Stats: Direct, Total under, Grade */}
                      <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-[#E2E8F0] dark:border-indigo-900/60 text-left">
                        <div>
                          <div className="text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase">
                            DIRECT
                          </div>
                          <div className="text-[13px] font-semibold text-[#1E293B] dark:text-[#E7ECF3] mt-0.5 font-mono">
                            {directReportsCount}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase">
                            TOTAL UNDER
                          </div>
                          <div className="text-[13px] font-semibold text-[#1E293B] dark:text-[#E7ECF3] mt-0.5 font-mono">
                            {totalUnderCount}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase">
                            GRADE
                          </div>
                          <div className="text-[13px] font-semibold text-[#1E293B] dark:text-[#E7ECF3] mt-0.5 font-mono">
                            {selectedEmployeeObj?.Grade || selectedEmployeeObj?.grade || "L1"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Direct Reports Section or Empty State */}
                    {loading ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#64748B]">
                        <MdOutlineRefresh className="text-2xl animate-spin text-[#4F46E5]" />
                        <span className="text-[12px]">Loading team members...</span>
                      </div>
                    ) : successors.length > 0 ? (
                      <div className="flex flex-col items-center w-full">
                        <span className="w-px h-5 bg-[#E2E8F0] dark:bg-[#1F2937]" />
                        <span className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase mb-3">
                          {directReportsCount} direct reports
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 w-full">
                          {successors.map((successor: any, sIdx: number) => {
                            const avatarStyle = getAvatarStyle(
                              successor.EmployeeName || successor.empcode,
                              sIdx + 2
                            );
                            const count = Number(successor.total_under) || 0;
                            return (
                              <button
                                key={successor.empcode || sIdx}
                                type="button"
                                onClick={() => handleRecentre(successor.empcode)}
                                className="flex items-center gap-2.5 border border-[#E2E8F0] dark:border-[#1F2937] rounded-[11px] bg-white dark:bg-[#111827] text-[#1E293B] dark:text-[#E7ECF3] p-2.5 sm:p-3 text-left min-w-0 shadow-2xs hover:border-[#4F46E5] hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] transition cursor-pointer"
                              >
                                <span
                                  className={cn(
                                    "w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10.5px] font-semibold border",
                                    avatarStyle.bg,
                                    avatarStyle.text,
                                    avatarStyle.border
                                  )}
                                >
                                  {getInitials(successor.EmployeeName)}
                                </span>
                                <span className="flex-1 min-w-0">
                                  <span className="block text-[12.5px] font-[550] truncate">
                                    {successor.EmployeeName}
                                  </span>
                                  <span className="block text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5 truncate">
                                    {getSubtitle(successor)}
                                  </span>
                                </span>
                                {count > 0 && (
                                  <span className="shrink-0 text-[10.5px] font-semibold text-[#4F46E5] dark:text-[#8B84FF] bg-[#EEF2FF] dark:bg-[#1E1B4B] px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                    +{count}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full mt-5 p-7 border border-dashed border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] text-center">
                        <span className="inline-grid place-items-center w-10 h-10 rounded-[11px] bg-[#F8FAFC] dark:bg-[#0E1524] text-[#64748B] mx-auto">
                          <Users className="h-5 w-5" />
                        </span>
                        <div className="text-[13px] font-[550] text-[#1E293B] dark:text-[#E7ECF3] mt-3">
                          No team found
                        </div>
                        <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8] mt-1">
                          This employee has no direct reports.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Employee detail & Span of control */}
            <div className="space-y-3.5">
              {/* Card 1: Employee detail */}
              <div className="rounded-[12px] border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] p-4 sm:p-[18px] shadow-sm">
                <div className="flex items-center gap-2.5 pb-3 border-b border-[#E2E8F0] dark:border-[#1F2937]">
                  <span className="w-6.5 h-6.5 rounded-lg flex items-center justify-center bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#8B84FF]">
                    <User className="h-3.5 w-3.5" />
                  </span>
                  <h2 className="text-[14px] font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                    Employee detail
                  </h2>
                </div>

                <div className="mt-3.5 space-y-2 text-[12.5px]">
                  {[
                    ["Employee code", selectedEmployeeObj?.empcode || selectedEmployeeObj?.value || formData.empcode],
                    ["Name", selectedEmployeeObj?.EmployeeName || selectedEmployeeObj?.label],
                    ["Designation", selectedEmployeeObj?.Desg_Name || selectedEmployeeObj?.designation || "—"],
                    ["Department", selectedEmployeeObj?.Dept_Name || selectedEmployeeObj?.department || "—"],
                    ["Branch", selectedEmployeeObj?.Loc_Name || selectedEmployeeObj?.branch || "—"],
                    ["Reports to", selectedEmployeeObj?.HeadName || (upstreamHeads.length > 0 ? upstreamHeads[upstreamHeads.length - 1]?.EmployeeName : "—")],
                    ["Date of joining", selectedEmployeeObj?.DOJ || selectedEmployeeObj?.Date_Of_Join || "—"],
                    ["Mobile", selectedEmployeeObj?.Mobile_No || selectedEmployeeObj?.mobile || "—"],
                    ["Grade", selectedEmployeeObj?.Grade || selectedEmployeeObj?.grade || "L1"],
                  ].map(([label, val]) => (
                    <div key={label} className="flex gap-2.5 items-baseline py-1">
                      <span className="flex-none w-[108px] text-[#64748B] dark:text-[#94A3B8]">
                        {label}
                      </span>
                      <span className="flex-1 min-w-0 font-medium text-[#1E293B] dark:text-[#E7ECF3] text-right truncate">
                        {val || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 2: Span of control (Matching HTML + Screenshot 2) */}
              <div className="rounded-[12px] border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] p-4 sm:p-[18px] shadow-sm">
                <div className="flex items-center gap-2.5 pb-3 border-b border-[#E2E8F0] dark:border-[#1F2937]">
                  <span className="w-6.5 h-6.5 rounded-lg flex items-center justify-center bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#8B84FF]">
                    <GitFork className="h-3.5 w-3.5" />
                  </span>
                  <h2 className="text-[14px] font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                    Span of control
                  </h2>
                </div>

                <div className="mt-3.5 space-y-2.5">
                  {[
                    {
                      label: "Direct reports",
                      value: directReportsCount,
                      width: Math.min(100, directReportsCount * 20) + "%",
                      tint: "#4F46E5",
                    },
                    {
                      label: "Total under",
                      value: totalUnderCount,
                      width: Math.min(100, totalUnderCount * 12) + "%",
                      tint: "#0D9488",
                    },
                    {
                      label: "Same department",
                      value: sameDeptCount,
                      width: Math.min(100, sameDeptCount * 15) + "%",
                      tint: "#F59E0B",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="grid grid-cols-[120px_minmax(0,1fr)_44px] items-center gap-2.5 py-1"
                    >
                      <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8] truncate">
                        {s.label}
                      </span>
                      <span className="block h-[6px] rounded-full bg-[#F1F5F9] dark:bg-[#0E1524] relative overflow-hidden">
                        <span
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                          style={{
                            width: s.width,
                            backgroundColor: s.tint,
                          }}
                        />
                      </span>
                      <span className="text-[11.5px] font-semibold text-[#1E293B] dark:text-[#E7ECF3] tabular-nums text-right font-mono">
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Highcharts BarChart underneath (as shown in Screenshot 2) */}
                <div className="mt-4 pt-3.5 border-t border-[#E2E8F0] dark:border-[#1F2937]">
                  <BarChart
                    height={140}
                    categories={["Direct", "Total", "Same Dept"]}
                    data={spanOfControlData}
                    colors={["#4F46E5", "#0D9488", "#F59E0B"]}
                    showGridLines={false}
                    showLegend={false}
                    showDataLabels={true}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Graphical Org Chart View (ApexTree OrgChart component) */}
        {(viewMode === "orgchart" || viewMode === "both") && (
          <div className="rounded-[12px] border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1F2937]">
              <div className="flex items-center gap-2.5">
                <span className="w-6.5 h-6.5 rounded-lg flex items-center justify-center bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#8B84FF]">
                  <Network className="h-3.5 w-3.5" />
                </span>
                <h3 className="text-[14px] font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                  Organizational chart
                </h3>
              </div>
              <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                ApexTree View
              </span>
            </div>

            <div className="mt-4 overflow-x-auto min-h-[350px]">
              {TeamView && TeamView.length > 0 ? (
                <OrgChart data={TeamView} key={JSON.stringify(TeamView)} />
              ) : (
                <div className="py-16 text-center text-[#64748B]">
                  <p className="text-[13px] font-medium">No graphical tree data to render.</p>
                  <p className="text-[11.5px] mt-1">Please select an employee and fetch hierarchy data.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dialog for Adding Employee Under current person */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] !shadow-none shadow-none p-4 sm:p-6 rounded-[12px] focus:outline-none">
          <DialogHeader>
            <DialogTitle className="text-[14px] sm:text-[15px] font-semibold text-[#1E293B] dark:text-[#E7ECF3] leading-snug break-words">
              Add Employee Under{" "}
              <span className="text-[#4F46E5] font-bold">
                {EMPLOYEE?.find((i: any) => (i.value ?? i.EmpCode) == formData.empcode)?.label ||
                  formData.empcode}
              </span>
            </DialogTitle>
            <div className="my-2 border-b border-[#E2E8F0] dark:border-[#1F2937]" />
            <DialogDescription className="space-y-3 pt-2 text-left">
              <div className="w-full">
                <CustomSelectSearch
                  name="HeadUnder"
                  title="Select employee to add under"
                  placeholder="Search employee..."
                  options={EMPLOYEE}
                  selectedValue={formData.HeadUnder}
                  handleInputChange={handleChange}
                  usePortal={false}
                />
              </div>

              <div>
                <p className="pt-1 text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
                  Employee Name:{" "}
                  <span className="font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                    {EMPLOYEE?.find((i: any) => (i.value ?? i.EmpCode) == formData.HeadUnder)?.label ||
                      formData.HeadUnder ||
                      "None"}
                  </span>
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  loading={isAddLoader}
                  shape="rounded"
                  className="h-[38px] px-6 rounded-[10px] text-[12.5px] font-semibold bg-[#4F46E5] hover:bg-[#4338CA] text-white !shadow-none active:scale-[0.98] cursor-pointer"
                  onClick={AddHeirarchy}
                >
                  Add
                </Button>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default EmployeeHierarchyView;
