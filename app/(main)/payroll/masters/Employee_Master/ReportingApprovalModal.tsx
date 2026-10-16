"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import Eselect from "@/components/atoms/Eselect";
import { useCurrentUser } from "@/app/hooks/use-current-user";

const APPROVER_FIELDS = [
  { key: "approver1_A", label: "A" },
  { key: "approver1_B", label: "B" },
  { key: "approver2_A", label: "A" },
  { key: "approver2_B", label: "B" },
  { key: "approver3_A", label: "A" },
  { key: "approver3_B", label: "B" },
];

const emptyRow = {
  UTD: 0,
  approver1_A: null,
  approver1_B: null,
  approver2_A: null,
  approver2_B: null,
  approver3_A: null,
  approver3_B: null,
};

function showSideAlert(message: string, type: "success" | "error" | "warning" | "info" | "question") {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true,
  });
  Toast.fire({ icon: type, title: message });
}

const formatModuleName = (m: string) => {
  if (!m) return "";
  const lower = m.toLowerCase().replace(/[-_]/g, "");
  if (lower === "attendance") return "Attendance";
  if (lower === "mispunch") return "Mispunch";
  if (lower === "leave") return "Leave";
  if (lower === "compoff") return "Comp-off";
  return m.charAt(0).toUpperCase() + m.slice(1);
};

let cachedEmployees: { value: string; label: string }[] | null = null;
let cachedModules: string[] | null = null;
let masterPrefetchPromise: Promise<{ employees: any[]; modules: string[] }> | null = null;

const fetchMasterData = (user: any) => {
  if (cachedEmployees && cachedModules) {
    return Promise.resolve({ employees: cachedEmployees, modules: cachedModules });
  }

  if (masterPrefetchPromise) {
    return masterPrefetchPromise;
  }

  const headers = { compcode: user?.Comp_Code, name: user?.name };
  masterPrefetchPromise = Promise.all([
    axios.post(
      `${process.env.NEXT_PUBLIC_URL}/users/findAllEmployee`,
      { branch: user?.branch },
      { headers }
    ),
    axios.post(
      `${process.env.NEXT_PUBLIC_URL}/employee/getApprovalKeywords`,
      {},
      { headers }
    ),
  ])
    .then(([empRes, kwRes]) => {
      const empList = (empRes.data?.data || []).map((emp: any) => {
        const code = String(emp.EMPCODE || emp.empcode || emp.value || "").trim();
        const name = String(emp.EMPNAME || emp.name || emp.EMPFIRSTNAME || "").trim();
        const label = String(emp.label || (code && name ? `${code} | ${name}` : code || name)).trim();
        return {
          value: code || label,
          label: label,
        };
      });
      cachedEmployees = empList;

      const rawModules: string[] = Array.isArray(kwRes.data?.modules)
        ? kwRes.data.modules
        : Array.isArray(kwRes.data)
        ? kwRes.data
        : [];
      const defaultModules = ["Attendance", "Mispunch", "Leave", "Comp-off"];
      const moduleList = rawModules.length > 0 ? rawModules : defaultModules;
      cachedModules = moduleList;

      return { employees: empList, modules: moduleList };
    })
    .catch((err) => {
      masterPrefetchPromise = null;
      throw err;
    });

  return masterPrefetchPromise;
};

export default function ReportingApprovalModal({
  open,
  onClose,
  empcode,
}: {
  open: boolean;
  onClose: () => void;
  empcode?: string;
}) {
  const user = useCurrentUser();
  const [employees, setEmployees] = useState<{ value: string; label: string }[]>(() => cachedEmployees || []);
  const [modules, setModules] = useState<string[]>(() => cachedModules || ["Attendance", "Mispunch", "Leave", "Comp-off"]);
  const [rows, setRows] = useState<Record<string, any>>({});
  const [baseData, setBaseData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const headers = { compcode: user?.Comp_Code, name: user?.name };

  // Background pre-fetch as soon as user is loaded on the page
  useEffect(() => {
    if (user?.Comp_Code) {
      fetchMasterData(user)
        .then(({ employees, modules }) => {
          setEmployees(employees);
          setModules(modules);
        })
        .catch((e) => console.error("Prefetch error:", e));
    }
  }, [user?.Comp_Code, user?.branch]);

  useEffect(() => {
    if (open && empcode) loadAll();
  }, [open, empcode]);

  const loadAll = async () => {
    try {
      setLoading(true);

      const [masterData, matrixRes] = await Promise.all([
        fetchMasterData(user),
        axios.post(
          `${process.env.NEXT_PUBLIC_URL}/users/approvalmatrixfindone`,
          { empcode },
          { headers }
        ),
      ]);

      setEmployees(masterData.employees);
      setModules(masterData.modules);

      const existing = matrixRes.data?.approval_data || matrixRes.data?.data || [];
      setBaseData(matrixRes.data?.data || {});

      const newRows: Record<string, any> = {};
      masterData.modules.forEach((m) => {
        const found = Array.isArray(existing)
          ? existing.find(
              (x: any) => x.module_code?.toLowerCase() === m.toLowerCase()
            )
          : null;
        newRows[m] = found ? { ...emptyRow, ...found } : { ...emptyRow };
      });
      setRows(newRows);
    } catch (e) {
      console.error(e);
      showSideAlert("Failed to load the data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (module: string, name: string, value: any) => {
    setRows((prev) => ({
      ...prev,
      [module]: { ...(prev[module] || emptyRow), [name]: value || null },
    }));
  };

  const handleSave = async () => {
    // Duplicate validation (User Rights wali hi)
    for (const m of modules) {
      const r = rows[m] || {};
      const all = APPROVER_FIELDS.map((f) => r[f.key]).filter(
        (v) => v !== null && v !== "" && v !== undefined
      );
      const dup = all.filter((item, i) => all.indexOf(item) !== i);
      if (dup.length > 0) {
        showSideAlert(`${formatModuleName(m)}: Duplicate approver not allowed: ${dup[0]}`, "warning");
        return;
      }
    }

    try {
      setLoading(true);
      let saved = 0;

      for (const m of modules) {
        const r = rows[m] || {};
        const hasApprover = APPROVER_FIELDS.some((f) => r[f.key]);
        // Jisme kuch bhara hi nahi aur pehle se bhi nahi tha, usko skip karo
        if (!hasApprover && !r.UTD) continue;

        await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/users/approvalmatrix`,
          {
            ...baseData,
            ...r,
            empcode,
            module_code: m,
            Created_by: user?.id,
          },
          { headers }
        );
        saved++;
      }

      showSideAlert(
        saved ? "Approval saved successfully." : "Nothing was found to save.",
        saved ? "success" : "warning"
      );
      if (saved) loadAll();
      onClose();
    } catch (e) {
      console.error(e);
      showSideAlert("Failed to save Approvals. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#0B1220] w-[96vw] sm:w-[94vw] max-w-[1200px] max-h-[92vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800 pr-1">
          <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Reporting approval
            </h2>
            {empcode ? (
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {empcode}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-5 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl bg-[#4F46E5] hover:bg-[#4338ca] text-white shadow-sm transition disabled:opacity-50"
            >
              {loading ? "Please wait..." : "Save"}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="mt-3 sm:mt-4 overflow-x-auto light-scroll pb-1">
          <table className="w-full border-separate border-spacing-x-2 sm:border-spacing-x-2.5 border-spacing-y-2.5 min-w-[900px] sm:min-w-[960px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-white dark:bg-[#0B1220] w-24 sm:w-28 text-left shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.5)]"></th>
                <th
                  colSpan={2}
                  className="text-center font-semibold text-xs sm:text-base text-slate-800 dark:text-slate-200 pb-1.5 border-b border-slate-200 dark:border-slate-700"
                >
                  Approver 1
                </th>
                <th
                  colSpan={2}
                  className="text-center font-semibold text-xs sm:text-base text-slate-800 dark:text-slate-200 pb-1.5 border-b border-slate-200 dark:border-slate-700"
                >
                  Approver 2
                </th>
                <th
                  colSpan={2}
                  className="text-center font-semibold text-xs sm:text-base text-slate-800 dark:text-slate-200 pb-1.5 border-b border-slate-200 dark:border-slate-700"
                >
                  Approver 3
                </th>
              </tr>
              <tr>
                <th className="sticky left-0 z-20 bg-white dark:bg-[#0B1220] text-left font-semibold text-xs sm:text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500 pt-1 pr-2 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.5)]">
                  MODULE
                </th>
                <th className="text-center font-semibold text-xs sm:text-sm text-slate-400 dark:text-slate-500 pt-1">
                  A
                </th>
                <th className="text-center font-semibold text-xs sm:text-sm text-slate-400 dark:text-slate-500 pt-1">
                  B
                </th>
                <th className="text-center font-semibold text-xs sm:text-sm text-slate-400 dark:text-slate-500 pt-1">
                  A
                </th>
                <th className="text-center font-semibold text-xs sm:text-sm text-slate-400 dark:text-slate-500 pt-1">
                  B
                </th>
                <th className="text-center font-semibold text-xs sm:text-sm text-slate-400 dark:text-slate-500 pt-1">
                  A
                </th>
                <th className="text-center font-semibold text-xs sm:text-sm text-slate-400 dark:text-slate-500 pt-1">
                  B
                </th>
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => (
                <tr key={m}>
                  <td className="sticky left-0 z-10 bg-white dark:bg-[#0B1220] font-semibold text-xs sm:text-base text-slate-900 dark:text-slate-100 whitespace-nowrap pr-2 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.5)]">
                    {formatModuleName(m)}
                  </td>
                  {APPROVER_FIELDS.map((f) => (
                    <td key={f.key} className="min-w-[130px] sm:min-w-[145px]">
                      <Eselect
                        name={`${m}_${f.key}`}
                        option={employees}
                        initialValue={rows[m]?.[f.key] || ""}
                        handleInputChange={(_, val) => handleChange(m, f.key, val)}
                        placeholder=""
                        className="h-10 rounded-xl font-medium"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
