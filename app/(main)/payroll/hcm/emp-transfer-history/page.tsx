"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import Swal from "sweetalert2";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import ServiceTablePagination from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

function EmpTransferHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useCurrentUser() as any;
  const compcode = searchParams.get("compcode") || user?.Comp_Code;

  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const showSideAlert = (message: any, type: any) => {
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
    Toast.fire({ icon: type, title: message });
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmployeeReferenceDetails/getEmpTransferHistory`,
        {},
        { headers: { compcode: compcode || user?.Comp_Code, name: user?.name } }
      );
      if (response.data.success) {
        setHistory(response.data.history || []);
      } else {
        showSideAlert(response.data.message || "Failed to load history", "error");
        setHistory([]);
      }
    } catch (error) {
      console.error("API Error:", error);
      showSideAlert("Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (compcode || user?.Comp_Code) {
      fetchHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compcode, user?.Comp_Code]);

  const handleBack = () => {
    router.back();
  };

  const renderChangeCell = (prev?: string | null, next?: string | null) => {
    const p = prev ? String(prev).trim() : "";
    const n = next ? String(next).trim() : "";

    if (p && n && p.toLowerCase() !== n.toLowerCase()) {
      return (
        <div className="flex flex-col py-0.5 leading-snug">
          <span className="line-through text-slate-400 dark:text-slate-500 text-[13px]">
            {p}
          </span>
          <span className="text-[#4338CA] dark:text-[#818CF8] font-medium text-[13px] flex items-center gap-1.5 mt-0.5">
            <span className="font-semibold text-xs leading-none">→</span>
            <span>{n}</span>
          </span>
        </div>
      );
    }

    return (
      <span className="text-slate-700 dark:text-slate-300 text-[13px]">
        {n || p || "—"}
      </span>
    );
  };

  const columns = useMemo(
    () => [
      {
        Header: "EMP CODE",
        accessor: "Emp_Code",
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-[13px]">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "DESIGNATION",
        id: "DESIGNATION",
        accessor: (row: any) => row.New_Designation || row.Prev_Designation || "",
        Cell: ({ row }: any) =>
          renderChangeCell(
            row.original.Prev_Designation,
            row.original.New_Designation
          ),
      },
      {
        Header: "LOCATION",
        id: "LOCATION",
        accessor: (row: any) => row.New_Location || row.Prev_Location || "",
        Cell: ({ row }: any) =>
          renderChangeCell(row.original.Prev_Location, row.original.New_Location),
      },
      {
        Header: "DEPARTMENT",
        id: "DEPARTMENT",
        accessor: (row: any) => row.New_Department || row.Prev_Department || "",
        Cell: ({ row }: any) =>
          renderChangeCell(
            row.original.Prev_Department,
            row.original.New_Department
          ),
      },
      {
        Header: "SECTION",
        id: "SECTION",
        accessor: (row: any) => row.New_Section || row.Prev_Section || "",
        Cell: ({ row }: any) =>
          renderChangeCell(row.original.Prev_Section, row.original.New_Section),
      },
      {
        Header: "CHANGED BY",
        id: "CHANGED_BY",
        accessor: "Changed_By",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 uppercase text-[13px] font-normal">
            {value || "—"}
          </span>
        ),
      },
    ],
    []
  );

  const columnsDownload = useMemo(
    () => [
      { Header: "Emp Code", accessor: "Emp_Code" },
      { Header: "Old Designation", accessor: "Prev_Designation" },
      { Header: "New Designation", accessor: "New_Designation" },
      { Header: "Old Location", accessor: "Prev_Location" },
      { Header: "New Location", accessor: "New_Location" },
      { Header: "Old Department", accessor: "Prev_Department" },
      { Header: "New Department", accessor: "New_Department" },
      { Header: "Old Section", accessor: "Prev_Section" },
      { Header: "New Section", accessor: "New_Section" },
      { Header: "Changed By", accessor: "Changed_By" },
      {
        Header: "Changed On",
        accessor: "Changed_On",
        Cell: ({ value }: any) =>
          value
            ? new Date(value).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            : "",
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#080D1A] p-4 sm:p-6 lg:p-8">
      <HashloaderComponent isLoading={loading} />

      {/* Breadcrumb Navigation */}
    

      {/* Header with Title and Back Button */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Transfer History
        </h1>
     
      </div>

      {/* Table Card using ServiceTablePagination */}
      <ServiceTablePagination
        columns={columns}
        data={history}
        title={
          history.length > 0
            ? `All transfer history • ${history.length}`
            : "All transfer history"
        }
        columnsDownload={columnsDownload}
        showTopSearch={true}
        searchPlaceholder="Search..."
        showExcelExport={true}
        initialPageSize={10}
        containerClassName="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0B1220] shadow-2xs overflow-hidden [&_.font-bold.text-base]:normal-case [&_.font-bold.text-base]:text-[15px] [&_.font-bold.text-base]:font-semibold [&_.font-bold.text-base]:text-slate-800 dark:[&_.font-bold.text-base]:text-slate-200"
      />
    </div>
  );
}

export default function EmpTransferHistory() {
  return (
    <Suspense fallback={<HashloaderComponent isLoading={true} />}>
      <EmpTransferHistoryContent />
    </Suspense>
  );
}
