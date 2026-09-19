"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Download,
  Check,
  Minus,
} from "lucide-react";

import useExcelDownload from "@/app/hooks/excel-download";

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

  check?: boolean;
  onlyOnecheck?: boolean; // When true, only one row can be selected at a time
  selectValue?: string;
  setsellectedrowdata?: (data: any[]) => void;
  setSelectedRows?: (data: any[]) => void;
  selectedRows?: any[];

  height?: number | string;
  size?: string;
  headerClassName?: string;
  labelClassName?: string;

  onRowDoubleClick?: (row: any) => void;

  // server-side pagination (optional)
  serverMode?: boolean;
  serverPagination?: ServerPagination;
  onServerPageChange?: (page: number, showLoader?: boolean) => void; // 1-based
  onServerPageSizeChange?: (size: number) => void;

  showTopSearch?: boolean;
  showPageSizeInFooter?: boolean;
  initialPageSize?: number;

  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;

  showExcelExport?: boolean; // default true
  columnsDownload?: any; // ✅ DataTable jaisa (optional)
  onExportAll?: () => Promise<any[]> | any[];

  // Column Filters
  showColumnFilters?: boolean;
  columnFilters?: Record<string, string>;
  onColumnFilterChange?: (columnKey: string, value: string) => void;
  columnFiltersResetTrigger?: number;

  footerTextMode?: "showing" | "pageItems";
  containerClassName?: string;
}

const globalFilterFunction = (
  rows: any[],
  columnIds: string[],
  filterValue: string,
) => {
  const fv = String(filterValue || "").toLowerCase().trim();
  if (!fv) return rows;

  return rows.filter((row) => {
    const matchColumns = columnIds.some((id) => {
      const value = row.values[id];
      return String(value ?? "").toLowerCase().includes(fv);
    });
    if (matchColumns) return true;

    if (row.original && typeof row.original === "object") {
      return Object.values(row.original).some((val) =>
        String(val ?? "").toLowerCase().includes(fv)
      );
    }

    return false;
  });
};

export default function ServiceTablePagination({
  title,
  columns,
  data = [],
  check = false,
  onlyOnecheck = false,
  selectValue = "Tran_id",
  setsellectedrowdata,
  setSelectedRows,
  selectedRows,
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
  initialPageSize,

  searchValue,
  onSearchChange,
  searchPlaceholder = "Search by name or code...",

  showExcelExport = true,
  columnsDownload,
  onExportAll,

  showColumnFilters,
  columnFilters,
  onColumnFilterChange,
  columnFiltersResetTrigger,
  footerTextMode = "showing",
  containerClassName = "",
}: Props) {
  const tableRef = useRef<HTMLTableElement | null>(null);
  const scrollWrapRef = useRef<HTMLDivElement | null>(null);

  const { handleExcelDownload, isLoading: isExcelLoading } = useExcelDownload();

  // Column Filter State
  const [internalColumnFilters, setInternalColumnFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    if (columnFiltersResetTrigger !== undefined) {
      setInternalColumnFilters({});
    }
  }, [columnFiltersResetTrigger]);

  const activeColumnFilters = useMemo(() => {
    return columnFilters !== undefined ? columnFilters : internalColumnFilters;
  }, [columnFilters, internalColumnFilters]);

  const handleColumnFilterChange = (key: string, val: string) => {
    if (columnFilters === undefined) {
      setInternalColumnFilters((prev) => ({
        ...prev,
        [key]: val,
      }));
    }
    onColumnFilterChange?.(key, val);
  };

  const hasColumnFilters = useMemo(() => {
    if (showColumnFilters !== undefined) return showColumnFilters;
    return (columns || []).some(
      (col: any) =>
        col &&
        (col.filterPlaceholder ||
          col.placeholder ||
          col.filterable === true ||
          col.showFilter === true)
    );
  }, [showColumnFilters, columns]);

  const getColumnPlaceholder = (column: any) => {
    if (column.filterPlaceholder) return column.filterPlaceholder;
    if (column.placeholder && typeof column.placeholder === "string") return column.placeholder;
    const headerTitle =
      typeof column.Header === "string"
        ? column.Header
        : typeof column.id === "string"
        ? column.id
        : typeof column.accessor === "string"
        ? column.accessor
        : "";
    if (headerTitle && headerTitle !== "_selection") {
      return `All ${headerTitle.toLowerCase()}`;
    }
    return "All";
  };

  // Selection state
  const [internalSelected, setInternalSelected] = useState<any[]>([]);

  useEffect(() => {
    setInternalSelected([]);
    setsellectedrowdata?.([]);
  }, [data, check]);

  // ✅ "All" lazy mode (serverMode): data scroll pe page-by-page append hoga
  const [allMode, setAllMode] = useState(false);
  const [allModeData, setAllModeData] = useState<any[]>([]);
  const loadedPagesRef = useRef<Set<number>>(new Set());
  const maxLoadedPageRef = useRef<number>(0);
  const isFetchingMoreRef = useRef(false);

  const uiHeight = typeof height === "number" ? `${height}px` : height;

  const currentPage = serverMode
    ? serverPagination?.currentPage || 1
    : 1;

  const totalPages = serverMode
    ? serverPagination?.totalPages || 1
    : 1;

  // Filter client data if column filters are active
  const filteredDataByColumns = useMemo(() => {
    if (serverMode) return data;
    const activeEntries = Object.entries(activeColumnFilters).filter(
      ([_, v]) => v && String(v).trim() !== ""
    );
    if (activeEntries.length === 0) return data;

    return (data || []).filter((row: any) => {
      return activeEntries.every(([key, filterVal]) => {
        const query = String(filterVal).toLowerCase().trim();
        const rawVal = row[key] !== undefined ? row[key] : row.original?.[key];
        if (rawVal === undefined || rawVal === null) return false;
        return String(rawVal).toLowerCase().includes(query);
      });
    });
  }, [data, activeColumnFilters, serverMode]);

  // ✅ data source for table
  const tableData = useMemo(() => {
    if (serverMode && allMode) return allModeData;
    return filteredDataByColumns;
  }, [serverMode, allMode, allModeData, filteredDataByColumns]);

  const currentSelected = selectedRows !== undefined ? selectedRows : internalSelected;

  const handleSelectAll = (isChecked: boolean) => {
    if (onlyOnecheck) return; // Single selection mode has no select all
    if (isChecked) {
      const allSelected = tableData.map((row) => ({
        id: row[selectValue] || row.id,
        rowData: row,
        ...row,
      }));
      setInternalSelected(allSelected);
      setsellectedrowdata?.(allSelected);
      setSelectedRows?.(allSelected);
    } else {
      setInternalSelected([]);
      setsellectedrowdata?.([]);
      setSelectedRows?.([]);
    }
  };

  const handleSelectRow = (rowObj: any, isChecked: boolean) => {
    const rowId = rowObj[selectValue] || rowObj.id;
    let nextSelected: any[] = [];
    if (isChecked) {
      if (onlyOnecheck) {
        nextSelected = [{ id: rowId, rowData: rowObj, ...rowObj }];
      } else {
        nextSelected = [...currentSelected, { id: rowId, rowData: rowObj, ...rowObj }];
      }
    } else {
      nextSelected = currentSelected.filter((item: any) => item.id !== rowId && item[selectValue] !== rowId);
    }
    setInternalSelected(nextSelected);
    setsellectedrowdata?.(nextSelected);
    setSelectedRows?.(nextSelected);
  };

  const isAllSelected = useMemo(() => {
    if (!check || onlyOnecheck || tableData.length === 0) return false;
    return currentSelected.length === tableData.length;
  }, [check, onlyOnecheck, currentSelected.length, tableData.length]);

  const isIndeterminate = useMemo(() => {
    if (!check || onlyOnecheck || tableData.length === 0) return false;
    return currentSelected.length > 0 && currentSelected.length < tableData.length;
  }, [check, onlyOnecheck, currentSelected.length, tableData.length]);

  const tableColumns = useMemo(() => {
    if (!check) return columns;

    const checkboxColumn = {
      id: "_selection",
      disableSortBy: true,
      Header: () => {
        if (onlyOnecheck) {
          return <div className="w-[18px] h-[18px]" />;
        }
        return (
          <div
            className="flex items-center justify-center cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleSelectAll(!isAllSelected);
            }}
          >
            <div
              role="checkbox"
              aria-checked={isAllSelected ? "true" : isIndeterminate ? "mixed" : "false"}
              className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center transition-all select-none ${isAllSelected
                  ? "bg-[#4338CA] border border-[#4338CA] text-white shadow-2xs"
                  : isIndeterminate
                    ? "bg-white dark:bg-slate-900 border-[1.5px] border-slate-300 dark:border-slate-600"
                    : "bg-white dark:bg-slate-900 border-[1.5px] border-slate-300 dark:border-slate-600 hover:border-[#4338CA]"
                }`}
            >
              {isAllSelected ? (
                <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
              ) : isIndeterminate ? (
                <div className="w-2.5 h-[2px] bg-[#4338CA] rounded-full" />
              ) : null}
            </div>
          </div>
        );
      },
      Cell: ({ row }: any) => {
        const rowId = row.original[selectValue] || row.original.id;
        const isChecked = currentSelected.some((item: any) => item.id === rowId || item[selectValue] === rowId);

        return (
          <div
            className="flex items-center justify-center cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleSelectRow(row.original, !isChecked);
            }}
          >
            <div
              role="checkbox"
              aria-checked={isChecked}
              className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center transition-all select-none ${isChecked
                  ? "bg-[#4338CA] border border-[#4338CA] text-white shadow-2xs"
                  : "bg-white dark:bg-slate-900 border-[1.5px] border-slate-300 dark:border-slate-600 hover:border-[#4338CA]"
                }`}
            >
              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
            </div>
          </div>
        );
      },
    };

    return [checkboxColumn, ...columns];
  }, [check, onlyOnecheck, columns, isAllSelected, isIndeterminate, currentSelected, tableData, selectValue]);

  const defaultClientPageSize = initialPageSize || 10;

  const clientCalculatedPageCount = useMemo(() => {
    if (serverMode) return serverPagination?.totalPages || 1;
    const total = tableData?.length || data?.length || 0;
    const size = initialPageSize || 10;
    return Math.max(1, Math.ceil(total / size));
  }, [serverMode, serverPagination?.totalPages, tableData?.length, data?.length, initialPageSize]);

  const tableInstance = useTable(
    {
      columns: tableColumns,
      data: tableData,
      globalFilter: globalFilterFunction,

      initialState: {
        pageSize: serverMode ? serverPagination?.pageSize || initialPageSize || 50 : defaultClientPageSize,
        pageIndex: serverMode
          ? Math.max(0, (serverPagination?.currentPage || 1) - 1)
          : 0,
      },

      manualPagination: serverMode,
      pageCount: serverMode ? serverPagination?.totalPages || 1 : clientCalculatedPageCount,
      autoResetPage: false,
      autoResetExpanded: false,
      autoResetGroupBy: false,
      autoResetSelectedRows: false,
      autoResetSortBy: false,
      autoResetFilters: false,
      autoResetRowState: false,
    },
    useGlobalFilter,
    useSortBy,
    usePagination,
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

    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    pageOptions,
    gotoPage,
    setPageSize,
  } = tableInstance as any;

  const { globalFilter, pageIndex, pageSize } = state as any;

  // Sync client initialPageSize if provided
  useEffect(() => {
    if (!serverMode && initialPageSize && pageSize !== initialPageSize) {
      setPageSize(initialPageSize);
    }
  }, [initialPageSize, serverMode, pageSize, setPageSize]);

  // ✅ sync react-table internal page with serverPagination (as before)
  useEffect(() => {
    if (!serverMode || !serverPagination) return;

    const targetIndex = Math.max(0, serverPagination.currentPage - 1);

    if (pageIndex !== targetIndex) gotoPage(targetIndex);
    if (pageSize !== serverPagination.pageSize) setPageSize(serverPagination.pageSize);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverMode, serverPagination?.currentPage, serverPagination?.pageSize]);

  // ✅ when server returns data while AllMode is ON -> append
  useEffect(() => {
    if (!serverMode || !allMode) return;

    const cp = serverPagination?.currentPage || 1;

    // page 1 aaya => fresh start (filters, tab change or search)
    if (cp === 1) {
      setAllModeData(Array.isArray(data) ? [...data] : []);
      loadedPagesRef.current = new Set([1]);
      maxLoadedPageRef.current = 1;
      isFetchingMoreRef.current = false;
      return;
    }

    // agar already loaded page hai to ignore
    if (loadedPagesRef.current.has(cp)) {
      isFetchingMoreRef.current = false;
      return;
    }

    setAllModeData((prev) => {
      const next = Array.isArray(data) ? data : [];
      return prev.concat(next);
    });

    loadedPagesRef.current.add(cp);
    maxLoadedPageRef.current = Math.max(maxLoadedPageRef.current, cp);
    isFetchingMoreRef.current = false;
  }, [serverMode, allMode, data, serverPagination?.currentPage]);

  const totalRecordsCount = serverMode
    ? typeof serverPagination?.totalRecords === "number"
      ? serverPagination.totalRecords
      : allRows.length
    : allRows.length;

  // ✅ rendering rows: normal mode => page, allMode(server) => allRows (loaded so far)
  const rowsToRender = serverMode && allMode ? allRows : page;

  const displayedCount = rowsToRender.length;

  const clientCanPrev = pageIndex > 0;
  const clientCanNext = pageIndex + 1 < (pageOptions.length || clientCalculatedPageCount);

  const handlePrev = () => {
    if (serverMode) {
      const curr = serverPagination?.currentPage || 1;
      if (curr > 1) onServerPageChange?.(curr - 1, true);
    } else {
      if (clientCanPrev) {
        gotoPage(pageIndex - 1);
      } else if (canPreviousPage) {
        previousPage();
      }
    }
  };

  const handleNext = () => {
    if (serverMode) {
      const curr = serverPagination?.currentPage || 1;
      const tp = serverPagination?.totalPages || 1;
      if (curr < tp) onServerPageChange?.(curr + 1, true);
    } else {
      if (clientCanNext) {
        gotoPage(pageIndex + 1);
      } else if (canNextPage) {
        nextPage();
      }
    }
  };

  // ✅ Show entries handler (with All)
  const handlePageSizeChange = (next: number) => {
    // ✅ -1 means "All"
    if (next === -1) {
      if (serverMode) {
        // ✅ AllMode ON (lazy load). Do NOT request huge pageSize.
        setAllMode(true);
        setAllModeData(Array.isArray(data) ? [...data] : []);
        loadedPagesRef.current = new Set([currentPage || 1]);
        maxLoadedPageRef.current = currentPage || 1;
        isFetchingMoreRef.current = false;

        // start from page 1 if not already
        if (currentPage !== 1) {
          onServerPageChange?.(1, false);
        }
      } else {
        const total = allRows.length || data.length || 0;
        setPageSize(total || 1);
        gotoPage(0);
      }
      return;
    }

    // ✅ switching back to normal sizes
    if (serverMode && allMode) {
      setAllMode(false);
      setAllModeData([]);
      loadedPagesRef.current = new Set();
      maxLoadedPageRef.current = 0;
      isFetchingMoreRef.current = false;
    }

    if (serverMode) {
      onServerPageSizeChange?.(next);
      onServerPageChange?.(1, true);
    } else {
      setPageSize(next);
      gotoPage(0);
    }
  };

  // ✅ Lazy loading on scroll when AllMode ON (serverMode)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!serverMode || !allMode) return;
    if (!onServerPageChange) return;

    const el = e.currentTarget;

    // near bottom
    const threshold = 160;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;

    if (!nearBottom) return;

    if (isFetchingMoreRef.current) return;

    const nextPageNum = (maxLoadedPageRef.current || 1) + 1;
    const tp = serverPagination?.totalPages || 1;

    if (nextPageNum > tp) return;

    isFetchingMoreRef.current = true;
    onServerPageChange(nextPageNum, false);
  };

  const handleExport = async () => {
    // ✅ Sirf All mode me hone par sara data export hoga
    if (allMode && onExportAll) {
      try {
        const fullData = await onExportAll();
        if (fullData && Array.isArray(fullData) && fullData.length > 0) {
          handleExcelDownload(columnsDownload || columns, fullData);
          return;
        }
      } catch (err) {
        console.error("Export all data failed, fallback to table data:", err);
      }
    }

    // ✅ Normal page size (10, 20, 50, 100) me sirf table me dikh rhi rows hi export hongi
    const exportData = rowsToRender.map((r: any) => r.original);
    handleExcelDownload(columnsDownload || columns, exportData);
  };

  // ✅ dropdown me "All" select dikhane ke liye
  const pageSizeSelectValue = serverMode && allMode
    ? -1
    : serverMode
      ? serverPagination?.pageSize || pageSize
      : pageSize;

  const currentPageLabel = serverMode ? (serverPagination?.currentPage || 1) : pageIndex + 1;
  const totalPagesLabel = serverMode ? (serverPagination?.totalPages || 1) : (pageOptions.length || clientCalculatedPageCount || 1);

  return (
    <div
      className={`w-full flex flex-col bg-white dark:bg-[#0B1220] ${
        containerClassName
          ? containerClassName
          : "rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs"
      }`}
    >
      {(title || showTopSearch || searchValue !== undefined || onSearchChange || showExcelExport) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 gap-2.5 bg-slate-50/50 dark:bg-slate-900/50">
          {title ? (
            <div className="font-bold text-base text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              {title}
            </div>
          ) : (
            <div />
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            {(showTopSearch || searchValue !== undefined || onSearchChange) && (
              <div className="relative w-full sm:w-72 md:w-80">
                <input
                  type="text"
                  placeholder={searchPlaceholder || "Search by name or code..."}
                  value={searchValue !== undefined ? searchValue : (globalFilter || "")}
                  onChange={(e) => {
                    if (onSearchChange) {
                      onSearchChange(e.target.value);
                    } else {
                      setGlobalFilter(e.target.value);
                    }
                  }}
                  className="w-full h-10 pl-10 pr-3.5 text-[14px] font-medium border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4338CA] dark:focus:ring-[#6366F1] shadow-2xs"
                />
                <svg
                  className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            )}

            {showExcelExport ? (
              <button
                type="button"
                onClick={handleExport}
                disabled={isExcelLoading}
                className="h-9 px-3.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold
                           hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed
                           dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800
                           inline-flex items-center gap-2 shrink-0 shadow-2xs"
              >
                <Download className="h-4 w-4" />
                {isExcelLoading ? "Exporting..." : "Export to Excel"}
              </button>
            ) : null}
          </div>
        </div>
      )}

      <div
        ref={scrollWrapRef}
        onScroll={handleScroll}
        className="w-full overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700"
        style={{ maxHeight: uiHeight }}
      >
        <table
          {...getTableProps()}
          ref={tableRef}
          className="w-full text-left border-collapse"
        >
          <thead className="sticky top-0 z-10 bg-[#FAFBFD] dark:bg-[#0B1220] border-b border-slate-200 dark:border-slate-800">
            {headerGroups.map((headerGroup: any, headerGroupIdx: number) => (
              <React.Fragment key={headerGroupIdx}>
                <tr {...headerGroup.getHeaderGroupProps()}>
                  {headerGroup.headers.map((column: any, colIdx: number) => {
                    const isSelectionCol = column.id === "_selection";
                    const isEmpNameCol = column.id === "NewEmpName" || column.id === "EMPLOYEENAME";

                    return (
                      <th
                        key={column.id}
                        {...column.getHeaderProps(
                          isSelectionCol ? {} : column.getSortByToggleProps()
                        )}
                        className={`px-4 py-3.5 text-left text-[12px] font-bold uppercase tracking-wider select-none whitespace-nowrap ${isSelectionCol
                            ? "w-12 text-center !px-3"
                            : isEmpNameCol
                              ? "text-[#4F46E5] dark:text-indigo-400"
                              : "text-slate-500 dark:text-slate-400"
                          } ${headerClassName || ""}`}
                      >
                        {isSelectionCol ? (
                          <div className="flex items-center justify-center">
                            {column.render("Header")}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 justify-between">
                            <div className="flex items-center gap-1.5">
                              <span>{column.render("Header")}</span>
                            </div>

                            <span className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-2 shrink-0">
                              {column.isSorted ? (
                                column.isSortedDesc ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                ) : (
                                  <ChevronUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                )
                              ) : isEmpNameCol ? (
                                <ChevronUp className="w-3.5 h-3.5 text-[#4F46E5] dark:text-indigo-400 stroke-[2.5]" />
                              ) : (
                                <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </span>
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>

                {/* Column Filters Row */}
                {hasColumnFilters && (
                  <tr className="bg-white dark:bg-[#0B1220] border-b border-slate-200 dark:border-slate-800">
                    {headerGroup.headers.map((column: any) => {
                      const isSelectionCol = column.id === "_selection";
                      const filterKey =
                        column.accessor && typeof column.accessor === "string"
                          ? column.accessor
                          : column.id;

                      const isFilterDisabled =
                        isSelectionCol ||
                        column.disableFilter === true ||
                        column.filterable === false;

                      const shouldShowInput =
                        !isFilterDisabled &&
                        Boolean(
                          column.filterPlaceholder ||
                            column.placeholder ||
                            column.filterable === true ||
                            column.showFilter === true ||
                            (showColumnFilters && typeof column.Header !== "function")
                        );

                      const placeholder = getColumnPlaceholder(column);
                      const currentVal = activeColumnFilters[filterKey] ?? "";

                      return (
                        <th
                          key={`${column.id}_filter`}
                          className={`px-3 py-1.5 font-normal ${
                            isSelectionCol ? "w-12 text-center !px-3" : ""
                          }`}
                        >
                          {shouldShowInput ? (
                            <div
                              className="w-full font-normal normal-case"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <input
                                type="text"
                                value={currentVal}
                                placeholder={placeholder}
                                onChange={(e) =>
                                  handleColumnFilterChange(filterKey, e.target.value)
                                }
                                className="w-full h-8 px-2.5 text-xs sm:text-[13px] font-normal border border-slate-200 dark:border-slate-700/80 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 placeholder:normal-case placeholder:font-normal focus:outline-none focus:ring-1.5 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-2xs"
                              />
                            </div>
                          ) : null}
                        </th>
                      );
                    })}
                  </tr>
                )}
              </React.Fragment>
            ))}
          </thead>

          <tbody
            {...getTableBodyProps()}
            className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-[#0B1220]"
          >
            {rowsToRender.map((row: any) => {
              prepareRow(row);
              const rowId = row.original[selectValue] || row.original.id;
              const isRowSelected = check && internalSelected.some((item) => item.id === rowId);

              return (
                <tr
                  key={row.id}
                  {...row.getRowProps()}
                  className={`transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-800/80 ${isRowSelected
                      ? "bg-[#EEF2FF] dark:bg-indigo-950/40 hover:bg-[#E0E7FF] dark:hover:bg-indigo-950/60"
                      : "hover:bg-slate-50/70 dark:hover:bg-white/[0.04]"
                    }`}
                  onDoubleClick={() => onRowDoubleClick?.(row.original)}
                >
                  {row.cells.map((cell: any, cellIdx: number) => {
                    const isSelectionCol = cell.column.id === "_selection";

                    return (
                      <td
                        key={cell.column.id}
                        {...cell.getCellProps()}
                        className={`whitespace-nowrap text-[14px] text-slate-800 dark:text-slate-200 ${isSelectionCol ? "w-12 !px-3 text-center" : "px-4 py-3.5"
                          }`}
                      >
                        <div className={`font-normal text-slate-800 dark:text-slate-200 text-[14px] ${isSelectionCol ? "flex items-center justify-center" : ""
                          }`}>
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

        {rowsToRender.length === 0 && (
          <div className="w-full py-16 text-center text-2xl font-medium text-slate-400 dark:text-slate-500">
            No records found
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0B1220] gap-3">
        <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal whitespace-nowrap">
          {footerTextMode === "pageItems"
            ? `Page ${currentPageLabel} of ${totalPagesLabel} (${displayedCount} items)`
            : `Showing ${displayedCount} of ${totalRecordsCount} rows`}
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto">
          {showPageSizeInFooter && (
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">
              <span>Show</span>
              <select
                value={pageSizeSelectValue}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="h-8.5 px-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs sm:text-sm font-semibold focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 shadow-2xs cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={-1}>All</option>
              </select>
              <span>entries</span>
            </div>
          )}

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 whitespace-nowrap ml-auto sm:ml-0">
            <button
              type="button"
              onClick={handlePrev}
              disabled={
                serverMode
                  ? (serverPagination?.currentPage || 1) <= 1
                  : !clientCanPrev
              }
              className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
            >
              Previous
            </button>

            {footerTextMode !== "pageItems" && (
              <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal px-1 whitespace-nowrap">
                Page{" "}
                <strong className="font-semibold text-slate-900 dark:text-slate-100">
                  {currentPageLabel}
                </strong>{" "}
                of{" "}
                <strong className="font-semibold text-slate-900 dark:text-slate-100">
                  {totalPagesLabel}
                </strong>
              </span>
            )}

            <button
              type="button"
              onClick={handleNext}
              disabled={
                serverMode
                  ? (serverPagination?.currentPage || 1) >=
                  (serverPagination?.totalPages || 1)
                  : !clientCanNext
              }
              className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}