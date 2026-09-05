"use client";

import React, { useEffect, useMemo, useRef } from "react";
import {
  useTable,
  useGlobalFilter,
  usePagination,
  useSortBy,
} from "react-table";
import {
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ArrowDown,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================

export interface ServerPagination {
  currentPage: number; // 1-based
  pageSize: number;
  totalPages: number;
  totalRecords?: number;
}

interface Props {
  title?: string;
  columns: any;
  data: any[];

  height?: number | string;
  size?: string;
  headerClassName?: string;
  labelClassName?: string;

  // optional callback
  onRowDoubleClick?: (row: any) => void;

  // server-side pagination (optional)
  serverMode?: boolean;
  serverPagination?: ServerPagination;
  onServerPageChange?: (page: number) => void; // 1-based
  onServerPageSizeChange?: (size: number) => void;

  // optional header / search controls
  showTopSearch?: boolean;
  showPageSizeInFooter?: boolean;
}

// ============================================================
// HELPERS
// ============================================================

const globalFilterFunction = (rows: any[], columnIds: string[], filterValue: string) => {
  const fv = String(filterValue || "").toLowerCase();
  if (!fv) return rows;

  return rows.filter((row) =>
    columnIds.some((id) => {
      const value = row.values[id];
      return String(value ?? "").toLowerCase().includes(fv);
    })
  );
};

// ============================================================
// COMPONENT
// ============================================================

export default function ServiceTablePagination({
  title,
  columns,
  data = [],
  height = 560,
  size,
  headerClassName,
  labelClassName,
  onRowDoubleClick,

  serverMode = false,
  serverPagination,
  onServerPageChange,
  onServerPageSizeChange,
  showTopSearch = false,
  showPageSizeInFooter = false,
}: Props) {
  const tableRef = useRef<HTMLTableElement | null>(null);

  // react-table instance
  const tableInstance = useTable(
    {
      columns,
      data,
      globalFilter: globalFilterFunction,

      initialState: {
        pageSize: serverMode ? serverPagination?.pageSize || 50 : 50,
        pageIndex: serverMode
          ? Math.max(0, (serverPagination?.currentPage || 1) - 1)
          : 0,
      },

      // IMPORTANT for server mode
      manualPagination: serverMode,
      pageCount: serverMode ? serverPagination?.totalPages || 1 : undefined,
      autoResetPage: !serverMode,
    },
    useGlobalFilter,
    useSortBy,
    usePagination
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    rows: allRows,
    state,
    setGlobalFilter,

    // pagination (client mode)
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    pageOptions,
    gotoPage,
    setPageSize,
  } = tableInstance as any;

  const { globalFilter, pageIndex, pageSize } = state as any;

  // Sync react-table state when serverPagination updates
  useEffect(() => {
    if (!serverMode || !serverPagination) return;

    const targetIndex = Math.max(0, serverPagination.currentPage - 1);

    if (pageIndex !== targetIndex) gotoPage(targetIndex);
    if (pageSize !== serverPagination.pageSize) setPageSize(serverPagination.pageSize);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverMode, serverPagination?.currentPage, serverPagination?.pageSize]);

  const uiHeight = typeof height === "number" ? `${height}px` : height;

  // Pagination labels
  const currentPage = serverMode
    ? serverPagination?.currentPage || 1
    : pageIndex + 1;

  const totalPages = serverMode
    ? serverPagination?.totalPages || 1
    : pageOptions.length || 1;

  const totalRecordsCount = serverMode
    ? typeof serverPagination?.totalRecords === "number"
      ? serverPagination.totalRecords
      : allRows.length
    : allRows.length;

  const displayedCount = page.length;

  // Handlers
  const handlePrev = () => {
    if (serverMode) {
      const curr = serverPagination?.currentPage || 1;
      if (curr > 1) onServerPageChange?.(curr - 1);
    } else {
      if (canPreviousPage) previousPage();
    }
  };

  const handleNext = () => {
    if (serverMode) {
      const curr = serverPagination?.currentPage || 1;
      const tp = serverPagination?.totalPages || 1;
      if (curr < tp) onServerPageChange?.(curr + 1);
    } else {
      if (canNextPage) nextPage();
    }
  };

  const handlePageSizeChange = (next: number) => {
    if (serverMode) {
      onServerPageSizeChange?.(next);
      onServerPageChange?.(1);
    } else {
      setPageSize(next);
      gotoPage(0);
    }
  };

  return (
    <div className="w-full flex flex-col bg-white dark:bg-[#0B1220] rounded-2xl overflow-hidden">
      {/* Optional Top Search / Header */}
      {(title || showTopSearch) && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
          {title && (
            <div className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              {title}
            </div>
          )}

          {showTopSearch && (
            <div className="ml-auto">
              <input
                className="h-9 px-3 w-56 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                type="text"
                value={globalFilter || ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search..."
              />
            </div>
          )}
        </div>
      )}

      {/* Table Scrollable Container */}
      <div
        className="w-full overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700"
        style={{ maxHeight: uiHeight }}
      >
        <table
          {...getTableProps()}
          ref={tableRef}
          className="w-full text-left border-collapse"
        >
          {/* Header */}
          <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200/90 dark:bg-[#0B1220]/95 dark:border-slate-800">
            {headerGroups.map((headerGroup: any, headerGroupIdx: number) => (
              <tr
                key={headerGroupIdx}
                {...headerGroup.getHeaderGroupProps()}
              >
                {headerGroup.headers.map((column: any, colIdx: number) => (
                  <th
                    key={column.id}
                    {...column.getHeaderProps(column.getSortByToggleProps())}
                    className={`px-4 py-3.5 text-left text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider select-none whitespace-nowrap ${
                      headerClassName || ""
                    }`}
                  >
                    <div className="flex items-center gap-1.5 justify-between">
                      <div className="flex items-center gap-1.5">
                        {colIdx === 0 && (
                          <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        )}
                        <span>{String(column.render("Header")).toUpperCase()}</span>
                      </div>

                      <span className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-2 shrink-0">
                        {column.isSorted ? (
                          column.isSortedDesc ? (
                            <ChevronDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <ChevronUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          {/* Body */}
          <tbody
            {...getTableBodyProps()}
            className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-[#0B1220]"
          >
            {page.map((row: any) => {
              prepareRow(row);
              return (
                <tr
                  key={row.id}
                  {...row.getRowProps()}
                  className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                  onDoubleClick={() => onRowDoubleClick?.(row.original)}
                >
                  {row.cells.map((cell: any, cellIdx: number) => {
                    const isFirstCol = cellIdx === 0;
                    return (
                      <td
                        key={cell.column.id}
                        {...cell.getCellProps()}
                        className="px-4 py-3.5 whitespace-nowrap text-[13px] text-slate-600 dark:text-slate-300"
                      >
                        <div
                          className={
                            isFirstCol
                              ? "font-semibold text-slate-900 dark:text-slate-100"
                              : "font-normal text-slate-600 dark:text-slate-300"
                          }
                        >
                          {cell.render("Cell")}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Empty State */}
        {page.length === 0 && (
          <div className="w-full py-16 text-center text-sm font-medium text-slate-400 dark:text-slate-500">
            No employee records found
          </div>
        )}
      </div>

      {/* Footer / Pagination */}
      <div className="flex flex-wrap justify-between items-center px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0B1220] gap-3">
        {/* Showing text */}
        <div className="text-xs text-slate-500 dark:text-slate-400 font-normal">
          Showing {displayedCount} of {totalRecordsCount} rows
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 ml-auto">
          {showPageSizeInFooter && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Show:</span>
              <select
                className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:outline-none"
                value={serverMode ? serverPagination?.pageSize || pageSize : pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              >
                {[10, 20, 50, 100].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrev}
              disabled={
                serverMode
                  ? (serverPagination?.currentPage || 1) <= 1
                  : !canPreviousPage
              }
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Previous
            </button>

            <span className="text-xs text-slate-600 dark:text-slate-400 font-normal px-1">
              Page <strong className="font-semibold text-slate-900 dark:text-slate-100">{currentPage}</strong> of{" "}
              <strong className="font-semibold text-slate-900 dark:text-slate-100">{totalPages}</strong>
            </span>

            <button
              onClick={handleNext}
              disabled={
                serverMode
                  ? (serverPagination?.currentPage || 1) >= (serverPagination?.totalPages || 1)
                  : !canNextPage
              }
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}