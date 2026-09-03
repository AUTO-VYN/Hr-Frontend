"use client";

import React from "react";
import { Trash2, Plus } from "lucide-react";

export default function YNDynamicTable({
  columns,
  columnsShow,
  tableData,
  setTableData,
  constraints = {},
}: any) {
  const safeData: any[] = Array.isArray(tableData) ? tableData : [];

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
      return arr.filter((_: any, i: number) => i !== idx);
    });
  };

  const handleAdd = () => {
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
        <table className="w-full border-separate border-spacing-0">
          {/* HEAD */}
          <thead className="bg-slate-50 dark:bg-[#0F1A2D]">
            <tr>
              <th className="w-14 px-4 py-3 text-[12px] font-semibold tracking-widest text-slate-500 border-b border-slate-200 dark:text-slate-400 dark:border-slate-800">
                SR.
              </th>

              {columnsShow?.map((h: string, i: number) => (
                <th
                  key={h + i}
                  className="px-4 py-3 text-[12px] font-semibold tracking-widest text-slate-500 border-b border-slate-200 dark:text-slate-400 dark:border-slate-800"
                >
                  {String(h).toUpperCase()}
                </th>
              ))}

              <th className="w-24 px-4 py-3 text-[12px] font-semibold tracking-widest text-slate-500 border-b border-slate-200 text-center dark:text-slate-400 dark:border-slate-800">
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

                {/* CELLS (visible fields with border/background) */}
                {columns?.map((colKey: string, cIdx: number) => (
                  <td
                    key={colKey + cIdx}
                    className="px-4 py-4 text-[15px] text-slate-700 border-b border-slate-200 dark:text-slate-200 dark:border-slate-800"
                  >
                    <input
                      value={row?.[colKey] ?? ""}
                      onChange={(e) => handleChange(idx, colKey, e.target.value)}
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
                ))}

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
                  Add nominee
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}