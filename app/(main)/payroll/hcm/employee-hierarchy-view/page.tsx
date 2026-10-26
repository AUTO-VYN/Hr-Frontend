"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import Image from "next/image";
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
import { FaArrowRightLong } from "react-icons/fa6";
import {
  Users,
  Network,
  // IdCard,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Dynamically import ApexTree OrgChart to avoid SSR window/document errors
const OrgChart = dynamic(() => import("@/components/atoms/OrgChart"), {
  ssr: false,
});

// Avatar color palettes for badges matching user design
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
      { name: "Direct Reports", y: directReportsCount, color: "#6366f1" },
      { name: "Total Under", y: totalUnderCount, color: "#0d9488" },
      { name: "Same Dept", y: sameDeptCount, color: "#f59e0b" },
    ];
  }, [directReportsCount, totalUnderCount, sameDeptCount]);

  return (
    <div className="items-center grid grid-cols-12 p-3 sm:p-5">
      {/* Top Header matching original HTML */}
      <div className="col-span-12 rounded-t bg-white dark:bg-black px-6 py-2.5 border border-slate-200 dark:border-borderColor-dark shadow-xs">
        <div className="flex justify-between items-center">
          <h1 className="font-bold sm:text-sm md:text-base lg:text-lg text-slate-800 dark:text-[#37a9dd] flex items-center gap-x-3 uppercase">
            <Image
              src="/Payrollicon/Employee_Hierarchy_View.png"
              alt="Autovyn"
              width={25}
              height={25}
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            Hierarchy Explorer
          </h1>

          <div className="flex items-center space-x-3">
            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode("tree")}
                className={cn(
                  "px-3.5 py-1.5 rounded-md text-sm font-medium transition cursor-pointer",
                  viewMode === "tree"
                    ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                )}
              >
                Tree View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("orgchart")}
                className={cn(
                  "px-3.5 py-1.5 rounded-md text-sm font-medium transition cursor-pointer",
                  viewMode === "orgchart"
                    ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                )}
              >
                Graphical Chart
              </button>
              <button
                type="button"
                onClick={() => setViewMode("both")}
                className={cn(
                  "px-3.5 py-1.5 rounded-md text-sm font-medium transition cursor-pointer",
                  viewMode === "both"
                    ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                )}
              >
                Both
              </button>
            </div>

            <Button
              variant={"print"}
              size={"md"}
              className="text-sm font-medium h-10 px-5"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.history.back();
                }
              }}
            >
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Main Container Card matching original HTML */}
      <div className="col-span-12 mt-2 gap-3 rounded-b p-4 bg-white dark:bg-black border border-borderColor dark:border-borderColor-dark shadow">
        {/* Top Controls Bar */}
        <div className="mb-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[280px] max-w-md flex-1">
              <CustomSelectSearch
                name="empcode"
                title="Employee Code"
                placeholder="Select Employee..."
                options={EMPLOYEE}
                selectedValue={formData.empcode}
                handleInputChange={handleChange}
              />
            </div>
            <Button
              onClick={fetchHeads}
              variant={"save"}
              size={"md"}
              className="h-10 px-4 text-sm"
              disabled={loadingFor}
              title="Refresh / Fetch Details"
            >
              <MdOutlineRefresh className={cn("text-xl", loadingFor && "animate-spin")} />
            </Button>

            <Button
              onClick={() => {
                if (!formData.empcode) {
                  showSideAlert("Please select an employee first.", "warning");
                  return;
                }
                setIsModalOpen(true);
              }}
              variant={"save"}
              size={"md"}
              className="h-10 px-5 text-sm font-semibold"
            >
              + Add Relationship
            </Button>
          </div>
          <div>
            <p className="pt-2 capitalize text-sm text-gray-700 dark:text-gray-300 font-medium">
              Employee Name:-{" "}
              {EMPLOYEE?.find((i: any) => (i.value ?? i.EmpCode) == formData.empcode)?.label?.toLowerCase() ||
                formData.empcode ||
                "None"}
            </p>
          </div>
        </div>

        {/* Main Grid Content (Reporting Line + Details) */}
        {(viewMode === "tree" || viewMode === "both") && (
          <div className="grid grid-cols-12 gap-5 items-start">
            {/* Left Panel: Reporting Line (Main Tree Flow) */}
            <div className="col-span-12 lg:col-span-8 rounded-lg border border-borderColor dark:border-borderColor-dark bg-white dark:bg-black p-4 sm:p-5 shadow">
              {/* Header info */}
              <div className="flex items-center justify-between pb-4 border-b border-borderColor dark:border-borderColor-dark">
                <h2 className="text-base font-bold text-gray-900 dark:text-[#37a9dd] uppercase tracking-wide">
                  Reporting line
                </h2>
                <span className="text-xs font-medium text-gray-500">
                  Level {activeLevel} of the org · {totalUnderCount} people under this line
                </span>
              </div>

              {/* Tree Flow Body */}
              <div className="py-6 flex flex-col items-center">
                {loadingFor ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
                    <MdOutlineRefresh className="text-3xl animate-spin text-brand" />
                    <p className="text-sm font-medium">Loading hierarchy chain...</p>
                  </div>
                ) : !formData.empcode ? (
                  <div className="py-20 text-center max-w-sm">
                    <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-slate-900 text-brand flex items-center justify-center mx-auto mb-3 border border-borderColor dark:border-borderColor-dark">
                      <Network className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      No Employee Selected
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Select an employee above and click Refresh to explore their reporting hierarchy.
                    </p>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center">
                    {/* Upstream Heads (Manager chain above active person) */}
                    {upstreamHeads.map((headItem: any, idx: number) => {
                      const avatarStyle = getAvatarStyle(
                        headItem.EmployeeName || headItem.empcode,
                        idx
                      );
                      const isTop = idx === 0;
                      const levelLabel = isTop ? "Top" : `L${idx + 1}`;

                      return (
                        <React.Fragment key={headItem.empcode || idx}>
                          <div
                            onClick={() => handleRecentre(headItem.empcode)}
                            className="w-full max-w-md rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0B1220] p-3.5 shadow-2xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={cn(
                                  "h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border",
                                  avatarStyle.bg,
                                  avatarStyle.text,
                                  avatarStyle.border
                                )}
                              >
                                {getInitials(headItem.EmployeeName)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-brand transition-colors">
                                  {headItem.EmployeeName || `Employee ${headItem.empcode}`}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                  {getSubtitle(headItem)}
                                </p>
                              </div>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                              {levelLabel}
                            </span>
                          </div>

                          {/* Vertical Connector Line */}
                          <div className="w-[1.5px] h-6 bg-slate-200 dark:bg-slate-700" />
                        </React.Fragment>
                      );
                    })}

                    {/* Active / Currently Focused Employee Card (Click highlight - changes color on click) */}
                    <div className="w-full max-w-md rounded-2xl border-2 border-indigo-600 dark:border-indigo-500 bg-[#EEF2FF]/70 dark:bg-indigo-950/30 p-5 shadow-xs">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="h-11 w-11 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                          {getInitials(
                            activeNode?.EmployeeName ||
                              selectedEmployeeObj?.EmployeeName ||
                              selectedEmployeeObj?.label
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                            {activeNode?.EmployeeName ||
                              selectedEmployeeObj?.EmployeeName ||
                              selectedEmployeeObj?.label ||
                              formData.empcode}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">
                            {getSubtitle(activeNode || selectedEmployeeObj) ||
                              "Accounts Officer · Account"}
                          </p>
                        </div>
                      </div>

                      {/* Stats divider line */}
                      <div className="mt-4 pt-3.5 border-t border-slate-200/80 dark:border-indigo-900/50 grid grid-cols-3 gap-2 text-left">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                            DIRECT
                          </span>
                          <span className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
                            {directReportsCount}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                            TOTAL UNDER
                          </span>
                          <span className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
                            {totalUnderCount}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                            GRADE
                          </span>
                          <span className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
                            {selectedEmployeeObj?.Grade || selectedEmployeeObj?.grade || "L1"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Below Active Card: Direct Reports or Empty State */}
                    {loading ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                        <MdOutlineRefresh className="text-2xl animate-spin text-brand" />
                        <span className="text-xs">Loading team members...</span>
                      </div>
                    ) : successors.length > 0 ? (
                      <div className="w-full flex flex-col items-center">
                        {/* Connector Line & Reports Header Badge */}
                        <div className="flex flex-col items-center my-3 relative w-full">
                          <div className="w-[1.5px] h-8 bg-slate-200 dark:bg-slate-700" />
                          <span className="absolute top-1/2 -translate-y-1/2 bg-white dark:bg-[#0B1220] border border-slate-200/90 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3.5 py-1 rounded-full shadow-2xs">
                            {directReportsCount} Direct Reports
                          </span>
                        </div>

                        {/* Direct Reports Grid */}
                        <div className="w-full mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {successors.map((successor: any, sIdx: number) => {
                            const avatarStyle = getAvatarStyle(
                              successor.EmployeeName || successor.empcode,
                              sIdx + 2
                            );
                            return (
                              <div
                                key={successor.empcode || sIdx}
                                onClick={() => handleRecentre(successor.empcode)}
                                className="p-3 bg-white dark:bg-[#0B1220] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer transition flex items-center justify-between group"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={cn(
                                      "h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border",
                                      avatarStyle.bg,
                                      avatarStyle.text,
                                      avatarStyle.border
                                    )}
                                  >
                                    {getInitials(successor.EmployeeName)}
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-brand transition-colors">
                                      {successor.EmployeeName}
                                    </h4>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                      {getSubtitle(successor)}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      Level: {successor.hierarchy_level || 1}
                                    </div>
                                  </div>
                                </div>
                                {successor.total_under && Number(successor.total_under) > 0 ? (
                                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0 border border-slate-200 dark:border-slate-700">
                                    +{successor.total_under}
                                  </span>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full">
                        {/* Horizontal dashed divider matching screenshot */}
                        <div className="w-full my-6 border-t border-dashed border-slate-200 dark:border-slate-800" />
                        <div className="py-4 flex flex-col items-center justify-center text-center">
                          <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-2.5">
                            <Users className="h-5 w-5" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            No team found
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            This employee has no direct reports.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Employee detail & Span of control */}
            <div className="col-span-12 lg:col-span-4 space-y-5">
              {/* Card 1: Employee Detail */}
              <div className="rounded-lg border border-borderColor dark:border-borderColor-dark bg-white dark:bg-black p-4 sm:p-5 shadow">
                <div className="flex items-center gap-2.5 pb-3 border-b border-borderColor dark:border-borderColor-dark">
                  <div className="h-7 w-7 rounded bg-brand/10 dark:bg-brand/20 flex items-center justify-center text-brand">
                    {/* <IdCard className="h-4 w-4" /> */}
                  </div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-[#37a9dd] uppercase tracking-wide">
                    Employee detail
                  </h3>
                </div>

                <div className="mt-4 space-y-2.5 text-xs sm:text-sm">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600 dark:text-gray-400">Employee code</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-right font-mono">
                      {selectedEmployeeObj?.empcode ||
                        selectedEmployeeObj?.value ||
                        formData.empcode ||
                        "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-gray-100 dark:border-slate-800">
                    <span className="text-gray-600 dark:text-gray-400">Name</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 capitalize text-right">
                      {selectedEmployeeObj?.EmployeeName ||
                        selectedEmployeeObj?.label ||
                        "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-gray-100 dark:border-slate-800">
                    <span className="text-gray-600 dark:text-gray-400">Designation</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-right">
                      {selectedEmployeeObj?.Desg_Name ||
                        selectedEmployeeObj?.designation ||
                        "General Manager"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-gray-100 dark:border-slate-800">
                    <span className="text-gray-600 dark:text-gray-400">Department</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-right">
                      {selectedEmployeeObj?.Dept_Name ||
                        selectedEmployeeObj?.department ||
                        "Sales"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-gray-100 dark:border-slate-800">
                    <span className="text-gray-600 dark:text-gray-400">Branch</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-right">
                      {selectedEmployeeObj?.Loc_Name ||
                        selectedEmployeeObj?.branch ||
                        "Branch - 1"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-gray-100 dark:border-slate-800">
                    <span className="text-gray-600 dark:text-gray-400">Reports to</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-right">
                      {selectedEmployeeObj?.HeadName ||
                        (upstreamHeads.length > 0
                          ? upstreamHeads[upstreamHeads.length - 1]?.EmployeeName
                          : "None")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-gray-100 dark:border-slate-800">
                    <span className="text-gray-600 dark:text-gray-400">Date of joining</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-right">
                      {selectedEmployeeObj?.DOJ ||
                        selectedEmployeeObj?.Date_Of_Join ||
                        "08 Jul 2026"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-gray-100 dark:border-slate-800">
                    <span className="text-gray-600 dark:text-gray-400">Mobile</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-right font-mono">
                      {selectedEmployeeObj?.Mobile_No ||
                        selectedEmployeeObj?.mobile ||
                        "9887312896"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-gray-100 dark:border-slate-800">
                    <span className="text-gray-600 dark:text-gray-400">Grade</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-right">
                      {selectedEmployeeObj?.Grade || selectedEmployeeObj?.grade || "L1"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Span of Control */}
              <div className="rounded-lg border border-borderColor dark:border-borderColor-dark bg-white dark:bg-black p-4 sm:p-5 shadow">
                <div className="flex items-center gap-2.5 pb-3 border-b border-borderColor dark:border-borderColor-dark">
                  <div className="h-7 w-7 rounded bg-brand/10 dark:bg-brand/20 flex items-center justify-center text-brand">
                    <Network className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-[#37a9dd] uppercase tracking-wide">
                    Span of control
                  </h3>
                </div>

                {/* Progress bars */}
                <div className="mt-4 space-y-3.5">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      <span>Direct reports</span>
                      <span className="text-gray-900 dark:text-white font-bold">
                        {directReportsCount}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (directReportsCount / Math.max(totalUnderCount || 1, 6)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      <span>Total under</span>
                      <span className="text-gray-900 dark:text-white font-bold">
                        {totalUnderCount}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-600 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (totalUnderCount / Math.max(totalUnderCount || 1, 6)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      <span>Same department</span>
                      <span className="text-gray-900 dark:text-white font-bold">
                        {sameDeptCount}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (sameDeptCount / Math.max(totalUnderCount || 1, 6)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Integrated Highcharts BarChart from @/components/atoms/chart */}
                <div className="mt-4 pt-3 border-t border-borderColor dark:border-borderColor-dark">
                  <BarChart
                    height={140}
                    categories={["Direct", "Total", "Same Dept"]}
                    data={spanOfControlData}
                    colors={["#6366f1", "#0d9488", "#f59e0b"]}
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
          <div className="mt-4 rounded-lg border border-borderColor dark:border-borderColor-dark bg-white dark:bg-black p-4 shadow">
            <div className="flex items-center justify-between pb-3 border-b border-borderColor dark:border-borderColor-dark">
              <div className="flex items-center gap-2">
                <Network className="h-5 w-5 text-brand" />
                <h3 className="text-base font-bold text-gray-900 dark:text-[#37a9dd] uppercase">
                  Organizational Chart
                </h3>
              </div>
              <span className="text-xs text-gray-500">ApexTree View</span>
            </div>

            <div className="mt-4 overflow-x-auto min-h-[350px]">
              {TeamView && TeamView.length > 0 ? (
                <OrgChart data={TeamView} key={JSON.stringify(TeamView)} />
              ) : (
                <div className="py-16 text-center text-gray-400">
                  <p className="text-sm font-medium">No graphical tree data to render.</p>
                  <p className="text-xs mt-1">Please select an employee and fetch hierarchy data.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dialog for Adding Employee Under current person */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-full max-w-screen-md bg-white dark:bg-black border border-borderColor dark:border-borderColor-dark !shadow-none p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-[#37a9dd] uppercase">
              Add Employee Under{" "}
              {EMPLOYEE?.find((i: any) => (i.value ?? i.EmpCode) == formData.empcode)?.label?.toLowerCase() ||
                formData.empcode}
            </DialogTitle>
            <hr className="bg-body-color my-2 border-borderColor dark:border-borderColor-dark" />
            <DialogDescription className="space-y-3 pt-2">
              <CustomSelectSearch
                name="HeadUnder"
                title="Select employee to add under"
                placeholder="Search employee..."
                options={EMPLOYEE}
                selectedValue={formData.HeadUnder}
                handleInputChange={handleChange}
                usePortal={false}
              />

              <div>
                <p className="pt-2 capitalize text-sm text-gray-700 dark:text-gray-300 font-medium">
                  Employee Name:-{" "}
                  {EMPLOYEE?.find((i: any) => (i.value ?? i.EmpCode) == formData.HeadUnder)?.label?.toLowerCase() ||
                    formData.HeadUnder ||
                    "None"}
                </p>
              </div>

              <div className="pt-2">
                <Button
                  loading={isAddLoader}
                  variant={"save"}
                  size={"md"}
                  className="h-10 rounded px-6 text-sm font-semibold"
                  onClick={AddHeirarchy}
                >
                  Add
                </Button>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeHierarchyView;
