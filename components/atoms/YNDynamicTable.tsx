"use client";

import { Trash2, Plus } from "lucide-react";

export default function YNDynamicTable({
  columns,
  columnsShow,
  tableData,
  setTableData,
  constraints,
}: any) {
  const handleDelete = (idx: number) => {
    setTableData((prev: any[]) => prev.filter((_: any, i: number) => i !== idx));
  };

  const handleAdd = () => {
    const emptyRow: any = {};
    columns.forEach((k: string) => (emptyRow[k] = ""));
    setTableData((prev: any[]) => [...(prev || []), emptyRow]);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="w-full">
        <table className="w-full border-separate border-spacing-0">
          {/* HEAD */}
          <thead className="bg-slate-50">
            <tr>
              <th className="w-14 px-4 py-3 text-[11px] font-semibold tracking-widest text-slate-500 border-b border-slate-200">
                SR.
              </th>

              {columnsShow?.map((h: string, i: number) => (
                <th
                  key={h + i}
                  className="px-4 py-3 text-[11px] font-semibold tracking-widest text-slate-500 border-b border-slate-200"
                >
                  {h.toUpperCase()}
                </th>
              ))}

              <th className="w-24 px-4 py-3 text-[11px] font-semibold tracking-widest text-slate-500 border-b border-slate-200 text-center">
                ACTIONS
              </th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody>
            {(tableData || []).map((row: any, idx: number) => (
              <tr key={idx} className="bg-white">
                {/* SR */}
                <td className="px-4 py-4 text-sm text-slate-700 border-b border-slate-200">
                  {idx + 1}
                </td>

                {/* CELLS */}
                {columns?.map((colKey: string, cIdx: number) => (
                  <td
                    key={colKey + cIdx}
                    className="px-4 py-4 text-sm text-slate-700 border-b border-slate-200"
                  >
                    {/* Yahan aap apna input/select renderer laga sakte ho */}
                    <span className="block truncate">{row?.[colKey] || ""}</span>
                  </td>
                ))}

                {/* ACTION */}
                <td className="px-4 py-4 border-b border-slate-200 text-center">
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    className="inline-grid place-items-center h-8 w-8 rounded-md border border-slate-200 text-red-500 hover:bg-red-50"
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}

            {/* ADD ROW (like screenshot) */}
            <tr>
              <td colSpan={(columnsShow?.length || 0) + 2} className="px-4 py-4">
                <button
                  type="button"
                  onClick={handleAdd}
                  className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  <Plus size={16} />
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