"use client";

import React, { useEffect, useRef } from "react";
import { Search } from "lucide-react";

const FilterCard = ({
  title,
  options = [],
  selected = [],
  onChange,
  search = "",
  onSearch,
  onAll,
}) => {
  const selectAllRef = useRef(null);

  const filteredOptions = options.filter((item) =>
    String(item.label || "")
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  const allSelected = options.length > 0 && selected.length === options.length;
  const partiallySelected =
    selected.length > 0 && selected.length < options.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = partiallySelected;
    }
  }, [partiallySelected]);

  return (
    <div className="flex h-[240px] min-w-0 flex-col overflow-hidden rounded-xl border border-[#dce5f1] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900">
      {/* Header */}
      <div className="flex h-[39px] shrink-0 items-center justify-between border-b border-[#dce5f1] px-3 dark:border-slate-700">
        <label className="flex min-w-0 cursor-pointer items-center gap-2">
          <input
            ref={selectAllRef}
            type="checkbox"
            checked={allSelected}
            onChange={onAll}
            className="h-[15px] w-[15px] shrink-0 cursor-pointer rounded border-slate-300 accent-blue-600"
          />
          <span className="truncate text-[12px] font-semibold text-[#152b4b] dark:text-slate-100">
            {title}
          </span>
        </label>

        <button
          type="button"
          onClick={onAll}
          className="shrink-0 text-[11px] font-medium text-[#64748b] transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
        >
          All
        </button>
      </div>

      
      {/* Search */}
      <div className="shrink-0 border-b border-[#e8edf5] px-2.5 py-[9px] dark:border-slate-700">
        <div className="relative">
          <Search
            size={15}
            strokeWidth={1.8}
            className="pointer-events-none absolute left-[13px] top-1/2 z-10 -translate-y-1/2 text-slate-500 dark:text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search"
            style={{ paddingLeft: "33px" }}
            className="h-[33px] w-full rounded-md border border-[#d6e1f0] bg-white pr-3 text-[11px] leading-none text-[#152b4b] outline-none transition placeholder:text-[#94a3b8] focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Options */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5 [scrollbar-color:#dce3ed_transparent] [scrollbar-width:thin]">
        {filteredOptions.length > 0 ? (
          filteredOptions.map((item) => (
            <label
              key={item.value}
              className="flex min-h-[28px] cursor-pointer items-center gap-2 rounded-md px-2 py-1 transition hover:bg-[#f1f5f9] dark:hover:bg-slate-800"
            >
              <input
                type="checkbox"
                checked={selected.includes(item.value)}
                onChange={() => onChange(item.value)}
                className="h-[14px] w-[14px] shrink-0 cursor-pointer rounded border-slate-300 accent-blue-600"
              />
              <span className="min-w-0 break-words text-[11px] font-medium text-[#183153] dark:text-slate-300">
                {item.label}
              </span>
            </label>
          ))
        ) : (
          <div className="py-5 text-center text-[11px] text-slate-400">
            No options found
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterCard;
