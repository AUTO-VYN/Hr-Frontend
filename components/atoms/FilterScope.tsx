
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Check, Filter, Search, X } from "lucide-react";

const FilterScope = ({
  title = "Filter scope",
  categories = [],
  selected = {},
  onChange,
}) => {
  const [activeKey, setActiveKey] = useState(categories[0]?.key);
  const [searches, setSearches] = useState({});

  // Keep active category valid when categories are loaded asynchronously.
  useEffect(() => {
    if (!categories.length) {
      setActiveKey(undefined);
      return;
    }

    const exists = categories.some((c) => c.key === activeKey);

    if (!exists) {
      setActiveKey(categories[0].key);
    }
  }, [categories, activeKey]);

  const active =
    categories.find((c) => c.key === activeKey) || categories[0];

  const activeSelected =
    (active && selected[active.key]) || [];

  const search =
    (active && searches[active.key]) || "";

  const filteredOptions = useMemo(() => {
    if (!active) return [];

    const q = search.trim().toLowerCase();

    return (active.options || []).filter((option) =>
      String(option.label || "")
        .toLowerCase()
        .includes(q),
    );
  }, [active, search]);

  const totalSelected = categories.reduce(
    (sum, category) =>
      sum + (selected[category.key]?.length || 0),
    0,
  );

  const update = (key, values) => {
    onChange?.({
      ...selected,
      [key]: values,
    });
  };

  const toggle = (value) => {
    if (!active) return;

    const next = activeSelected.includes(value)
      ? activeSelected.filter((item) => item !== value)
      : [...activeSelected, value];

    update(active.key, next);
  };

  // Select all currently visible options.
  const selectAllVisible = () => {
    if (!active) return;

    const merged = new Set([
      ...activeSelected,
      ...filteredOptions.map((option) => option.value),
    ]);

    update(active.key, Array.from(merged));
  };

  // Clear only currently visible options.
  const clearVisible = () => {
    if (!active) return;

    const visible = new Set(
      filteredOptions.map((option) => option.value),
    );

    update(
      active.key,
      activeSelected.filter((value) => !visible.has(value)),
    );
  };

  const clearAll = () => {
    onChange?.({});
  };

  if (!active) return null;

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-3 sm:px-4 dark:border-slate-700">
        <div className="flex min-w-0 items-center gap-2">
          <Filter
            size={18}
            strokeWidth={1.8}
            className="shrink-0 text-indigo-600"
          />

          <h2 className="truncate text-sm font-semibold text-slate-900 sm:text-[15px] dark:text-slate-100">
            {title}
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-2.5 text-xs sm:gap-3">
          <span className="text-slate-500 dark:text-slate-400">
            {totalSelected} selected
          </span>

          <button
            type="button"
            onClick={clearAll}
            className="font-semibold text-indigo-600 transition hover:text-indigo-800 dark:text-indigo-400"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex min-w-0 flex-col lg:min-h-[420px] lg:flex-row">

        {/* Category navigation */}
        <nav className="flex w-full shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50/60 p-2 [scrollbar-width:thin] lg:w-[210px] lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:border-b-0 lg:border-r dark:border-slate-700 dark:bg-slate-900">

          {categories.map((category) => {
            const isActive = category.key === active.key;
            const count =
              selected[category.key]?.length || 0;

            return (
              <button
                key={category.key}
                type="button"
                onClick={() => setActiveKey(category.key)}
                className={`flex min-w-max shrink-0 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition sm:text-[13px] lg:w-full ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <span className="truncate">
                  {category.label}
                </span>

                <span
                  className={`shrink-0 text-[11px] font-medium ${
                    count > 0
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-slate-400"
                  }`}
                >
                  {count}/{category.options?.length || 0}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">

          {/* Category heading */}
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 sm:text-[15px] dark:text-slate-100">
                {active.label}
              </h3>

              <p className="mt-0.5 text-xs text-slate-400">
                {active.subtitle ||
                  `Select one or more ${active.label.toLowerCase()}`}
              </p>
            </div>

            <span className="shrink-0 rounded-md bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
              {activeSelected.length} selected
            </span>
          </div>

          {/* Search and actions */}
          <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">

            <div className="relative min-w-0 flex-1">
              <Search
                size={16}
                strokeWidth={1.8}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearches((previous) => ({
                    ...previous,
                    [active.key]: e.target.value,
                  }))
                }
                placeholder={`Search ${active.label.toLowerCase()}`}
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white sm:text-[13px] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
              <button
                type="button"
                onClick={selectAllVisible}
                className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-800 sm:text-[13px] dark:text-indigo-400"
              >
                Select all
              </button>

              <button
                type="button"
                onClick={clearVisible}
                className="text-xs font-medium text-slate-500 transition hover:text-slate-800 sm:text-[13px] dark:text-slate-400"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Options list */}
          <div className="mt-3 min-h-[220px] max-h-[380px] flex-1 overflow-y-auto rounded-lg border border-slate-200 p-2.5 sm:p-3 [scrollbar-color:#dce3ed_transparent] [scrollbar-width:thin] dark:border-slate-700">

            {filteredOptions.length > 0 ? (
              <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">

                {filteredOptions.map((item) => {
                  const checked =
                    activeSelected.includes(item.value);

                  return (
                    <label
                      key={item.value}
                      className={`flex min-w-0 cursor-pointer items-start gap-2 rounded-md px-2 py-2 transition ${
                        checked
                          ? "bg-indigo-50/70 dark:bg-indigo-500/10"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(item.value)}
                        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-indigo-600"
                      />

                      <span className="min-w-0 break-words text-xs leading-5 text-slate-600 sm:text-[13px] dark:text-slate-300">
                        {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-[200px] items-center justify-center px-3 text-center text-xs text-slate-400 sm:text-[13px]">
                No options found
              </div>
            )}
          </div>

          {/* Counts */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 sm:text-xs">
            <span>
              {activeSelected.length} selected
            </span>

            <span className="text-slate-400">
              {filteredOptions.length} available
            </span>
          </div>

          {/* Footer actions */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-700">

            <span className="text-[11px] text-slate-400 sm:text-xs">
              {filteredOptions.length} options available
            </span>

            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">

              <button
                type="button"
                onClick={clearVisible}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 sm:flex-none sm:px-3.5 sm:text-[13px] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <X size={14} strokeWidth={2} />
                Clear
              </button>

              <button
                type="button"
                onClick={selectAllVisible}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-700 sm:flex-none sm:px-3.5 sm:text-[13px]"
              >
                <Check size={14} strokeWidth={2.2} />
                Select all
              </button>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterScope;
