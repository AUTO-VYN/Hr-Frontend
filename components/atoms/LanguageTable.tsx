"use client";

import React from "react";
import Swal from "sweetalert2";
import { Languages, Plus, Trash2 } from "lucide-react";

export interface LanguageRow {
  Emp_Language: string;
  Emp_Language_Understand: string;
  Emp_Language_Speak: string;
  Emp_Language_Read: string;
  Emp_Language_Write: string;
  UTD?: number;
  [key: string]: any;
}

interface LanguageTableProps {
  tableData: LanguageRow[];
  setTableData: React.Dispatch<React.SetStateAction<LanguageRow[]>> | ((data: any[]) => void);
  title?: string;
  subtitle?: string;
  disabled?: boolean;
  showAddButton?: boolean;
  className?: string;
}

export default function LanguageTable({
  tableData = [],
  setTableData,
  title = "Language proficiency",
  subtitle = "Tap a cell to toggle yes / no",
  disabled = false,
  showAddButton = true,
  className = "",
}: LanguageTableProps) {
  // Toggle cell value: "Y" -> "N" -> "" -> "Y"
  const handleToggle = (index: number, key: string) => {
    if (disabled) return;

    const copy = [...tableData];
    const current = copy[index]?.[key];
    let nextVal = "Y";

    if (current === "Y") nextVal = "N";
    else if (current === "N") nextVal = "";
    else nextVal = "Y";

    copy[index] = { ...copy[index], [key]: nextVal };
    setTableData(copy);
  };

  // Add a new language row
  const handleAddLanguage = async () => {
    if (disabled) return;

    const { value: langName } = await Swal.fire({
      title: "Add Language",
      input: "text",
      inputLabel: "Language Name",
      inputPlaceholder: "e.g. FRENCH, GERMAN, PUNJABI",
      showCancelButton: true,
      confirmButtonText: "Add",
      confirmButtonColor: "#4F46E5",
      cancelButtonColor: "#64748B",
      inputValidator: (val) => {
        if (!val || !val.trim()) {
          return "Please enter a valid language name";
        }
        const exists = tableData.some(
          (item) => item.Emp_Language.trim().toUpperCase() === val.trim().toUpperCase()
        );
        if (exists) {
          return "This language is already added";
        }
        return null;
      },
    });

    if (langName && langName.trim()) {
      const newRow: LanguageRow = {
        Emp_Language: langName.trim().toUpperCase(),
        Emp_Language_Understand: "Y",
        Emp_Language_Speak: "Y",
        Emp_Language_Read: "Y",
        Emp_Language_Write: "Y",
        UTD: 1,
      };
      setTableData([...tableData, newRow]);
    }
  };

  // Delete language row
  const handleDeleteLanguage = (index: number) => {
    if (disabled) return;
    const filtered = tableData.filter((_, idx) => idx !== index);
    setTableData(filtered);
  };

  const columns: { key: keyof LanguageRow; label: string }[] = [
    { key: "Emp_Language_Understand", label: "UNDERSTAND" },
    { key: "Emp_Language_Speak", label: "SPEAK" },
    { key: "Emp_Language_Read", label: "READ" },
    { key: "Emp_Language_Write", label: "WRITE" },
  ];

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Languages className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-medium">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {showAddButton && !disabled && (
          <button
            type="button"
            onClick={handleAddLanguage}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800 dark:hover:bg-slate-800 transition cursor-pointer shadow-2xs self-start sm:self-center"
          >
            <Plus className="h-4 w-4" />
            <span>Add language</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm sm:text-base">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-xs sm:text-sm">
              <th className="py-3.5 px-4">LANGUAGE</th>
              {columns.map((col) => (
                <th key={String(col.key)} className="py-3.5 px-4 text-center">
                  {col.label}
                </th>
              ))}
              <th className="py-3.5 px-4 text-right">ACTION</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
            {tableData.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-sm font-medium text-slate-400 dark:text-slate-500"
                >
                  No languages added yet.
                </td>
              </tr>
            ) : (
              tableData.map((item, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                >
                  {/* Language Name */}
                  <td className="py-4 px-4 font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                    {item.Emp_Language}
                  </td>

                  {/* Toggle Cells */}
                  {columns.map((col) => {
                    const val = item[col.key];
                    const isYes = val === "Y";
                    const isNo = val === "N";

                    return (
                      <td key={String(col.key)} className="py-3 px-4 text-center">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => handleToggle(idx, String(col.key))}
                          className={`inline-flex items-center justify-center min-w-[76px] px-3.5 py-2 rounded-xl text-sm font-bold border transition ${
                            disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                          } ${
                            isYes
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                              : isNo
                              ? "border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                              : "border-slate-200 bg-white text-slate-400 dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {isYes ? "Yes" : isNo ? "No" : "—"}
                        </button>
                      </td>
                    );
                  })}

                  {/* Delete Action */}
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleDeleteLanguage(idx)}
                      className={`h-9 w-9 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center justify-center transition ${
                        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
                      }`}
                      title="Delete language"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
