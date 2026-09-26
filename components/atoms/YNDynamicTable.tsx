"use client";

import React, { useEffect } from "react";
import { Trash2, Plus } from "lucide-react";
import Swal from "sweetalert2";

export default function YNDynamicTable({
  columns,
  columnsShow,
  tableData,
  setTableData,
  constraints = {},
  addLabel = "Add nominee", // ✅ dynamic label (default same as before)
}: any) {
  const safeData: any[] = Array.isArray(tableData) ? tableData : [];

  function showSideAlert(message: string, type: any) {
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
    });

    Toast.fire({
      icon: type,
      title: message,
    });
  }

  // ✅ Default me kam se kam 1 row honi chahiye
  useEffect(() => {
    if (!tableData || tableData.length === 0) {
      const emptyRow: any = {};
      (columns || []).forEach((k: string) => (emptyRow[k] = ""));
      setTableData([emptyRow]);
    }
  }, [tableData, columns, setTableData]);

  const applyConstraints = (colKey: string, value: any) => {
    const rule = constraints?.[colKey];
    if (!rule) return value ?? "";

    let v = value ?? "";

    // NUMBER constraint
    if (rule.type === "NUMBER") {
      // keep only digits (same spirit as your DynamicTable NUMBER check)
      v = String(v).replace(/[^\d]/g, "");
    } else {
      v = String(v);
    }

    // max length
    if (rule.max !== undefined && v.length > rule.max) {
      v = v.substring(0, rule.max);
    }

    return v;
  };

  const handleChange = (rowIndex: number, colKey: string, value: any) => {
    const nextVal = applyConstraints(colKey, value);

    setTableData((prev: any[]) => {
      const arr = Array.isArray(prev) ? [...prev] : [];
      const row = { ...(arr[rowIndex] || {}) };
      row[colKey] = nextVal;
      arr[rowIndex] = row;
      return arr;
    });
  };

  const handleDelete = (idx: number) => {
    setTableData((prev: any[]) => {
      const arr = Array.isArray(prev) ? prev : [];
      const filtered = arr.filter((_: any, i: number) => i !== idx);
      // Agar saari rows delete ho jayein to 1 empty row bachi rahe
      if (filtered.length === 0) {
        const emptyRow: any = {};
        (columns || []).forEach((k: string) => (emptyRow[k] = ""));
        return [emptyRow];
      }
      return filtered;
    });
  };

  const handleAdd = () => {
    const safeArr = Array.isArray(tableData) ? tableData : [];
    const langCol = columns?.[0] || "Emp_Language";

    // ✅ Jab tak language na likhi ho, nayi row add nahi hogi
    const hasEmptyLanguage = safeArr.some(
      (r: any) => !r[langCol] || r[langCol].toString().trim() === ""
    );

    if (hasEmptyLanguage) {
      showSideAlert(
        `Please enter ${columnsShow?.[0] || "Language"} before adding a new row.`,
        "warning"
      );
      return;
    }

    const emptyRow: any = {};
    (columns || []).forEach((k: string) => (emptyRow[k] = ""));

    setTableData((prev: any[]) => {
      const arr = Array.isArray(prev) ? prev : [];
      return [...arr, emptyRow];
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-[#0B1220]">
      <div className="w-full overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 min-w-max">
          {/* HEAD */}
          <thead className="bg-slate-50 dark:bg-[#0F1A2D]">
            <tr>
              <th className="w-14 px-4 py-3 text-[12px] font-semibold tracking-widest text-slate-500 border-b border-slate-200 dark:text-slate-400 dark:border-slate-800 whitespace-nowrap">
                SR.
              </th>

              {columnsShow?.map((h: string, i: number) => (
                <th
                  key={h + i}
                  className="px-4 py-3 text-[12px] font-semibold tracking-widest text-slate-500 border-b border-slate-200 dark:text-slate-400 dark:border-slate-800 whitespace-nowrap"
                >
                  {String(h).toUpperCase()}
                </th>
              ))}

              <th className="w-24 px-4 py-3 text-[12px] font-semibold tracking-widest text-slate-500 border-b border-slate-200 text-center dark:text-slate-400 dark:border-slate-800 whitespace-nowrap">
                ACTIONS
              </th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody>
            {safeData.map((row: any, idx: number) => (
              <tr key={idx} className="bg-white dark:bg-[#0B1220]">
                {/* SR */}
                <td className="px-4 py-4 text-[15px] font-medium text-slate-700 border-b border-slate-200 dark:text-slate-200 dark:border-slate-800">
                  {idx + 1}
                </td>

                {/* CELLS */}
                {columns?.map((colKey: string, cIdx: number) => {
                  const minW = constraints?.[colKey]?.minWidth || "140px";
                  return (
                    <td
                      key={colKey + cIdx}
                      style={{ minWidth: minW }}
                      className="px-4 py-4 text-[15px] text-slate-700 border-b border-slate-200 dark:text-slate-200 dark:border-slate-800"
                    >
                      <input
                        value={row?.[colKey] ?? ""}
                        onChange={(e) => handleChange(idx, colKey, e.target.value)}
                        placeholder={
                          constraints?.[colKey]?.placeholder ||
                          columnsShow?.[cIdx] ||
                          ""
                        }
                        style={{ minWidth: minW }}
                        className={[
                          "w-full rounded-lg px-3 py-2",
                          "border border-slate-200 bg-white",
                          "text-[15px] text-slate-800",
                          "placeholder:text-slate-400",
                          "focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400",
                          "dark:border-slate-700 dark:bg-[#0F1A2D] dark:text-slate-100",
                          "dark:placeholder:text-slate-500 dark:focus:ring-indigo-400/25 dark:focus:border-indigo-400",
                        ].join(" ")}
                      />
                    </td>
                  );
                })}

                {/* ACTION */}
                <td className="px-4 py-4 border-b border-slate-200 text-center dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    className={[
                      "inline-grid place-items-center h-9 w-9 rounded-lg border",
                      "border-slate-200 text-red-500 hover:bg-red-50",
                      "dark:border-slate-800 dark:hover:bg-red-500/10",
                    ].join(" ")}
                    aria-label="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}

            {/* ADD ROW */}
            <tr className="bg-white dark:bg-[#0B1220]">
              <td
                colSpan={(columnsShow?.length || 0) + 2}
                className="px-4 py-5 border-b border-slate-200 dark:border-slate-800"
              >
                <button
                  type="button"
                  onClick={handleAdd}
                  className="inline-flex items-center gap-2 text-[15px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  <Plus size={18} />
                  {addLabel}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}