"use client";

/**
 * Employee Document Approval Grid
 * -----------------------------------------------------------------------
 * Rebuilt using ApproverGridTemplate to provide standard modern UI:
 *   - Header Banner with page info, Approval Matrix modal, and Back button
 *   - Interactive Metric Stat Cards (Pending, Approved, Rejected, All)
 *   - Standard Filter Bar (Date range, Branch, Status, Show, Reset)
 *   - ServiceTablePagination (ReactTable) with selection & column sorting
 *   - Fixed Bottom Action Footer with Remarks, Reject, and Approve buttons
 *
 * All original APIs (/ars/DocApproverView, /ars/DocApproveBy2, /ars/DocRejectBy2),
 * file viewer links, document type formatters, and approver columns are preserved.
 */

import React, { useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { ExternalLink } from "lucide-react";

import ApproverGridTemplate from "@/components/Templates/ApproverGridTemplate";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import { cn } from "@/lib/utils";

export default function DocumentApprovalPage() {
  const user = useCurrentUser();

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  const formatDocType = (type: any) => {
    if (!type) return "—";
    const map: Record<string, string> = {
      adhar: "Aadhaar Card",
      pan: "PAN Card",
      salaryslip: "Salary Slip",
      profileimage: "Profile Image",
      faceimage: "Face Embedding Image",
      otherdocument: "Other Document",
      others: "Other Document",
    };
    return map[String(type).toLowerCase()] || String(type).toUpperCase();
  };

  const formatDate = (dateString: any) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getFileUrl = (docPath: any) => {
    if (!docPath) return "";
    const str = String(docPath).trim();
    if (str.startsWith("http://") || str.startsWith("https://")) {
      return str;
    }
    const cleanPath = str.startsWith("/") ? str.substring(1) : str;
    const fileBaseUrl =
      process.env.Next_Public_File || "https://erp.autovyn.com/backend";
    return `${fileBaseUrl}/fetch?filePath=${cleanPath}`;
  };

  const renderApproverCell = (name: any, stat: any) => {
    if (!name || name === "-") return <span className="text-center block text-slate-400">—</span>;
    const isApproved = stat == 1;
    const isRejected = stat == 0;
    return (
      <div
        className={cn(
          "px-2.5 py-1 rounded-md text-center text-xs font-bold shadow-2xs border whitespace-nowrap",
          isApproved
            ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
            : isRejected
            ? "border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20"
            : "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20"
        )}
      >
        {name}
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Columns Definition
  // -----------------------------------------------------------------------

  const columns = useMemo(
    () => [
      {
        Header: "SR.NO",
        accessor: "sr_no",
        Cell: ({ row }: any) => (
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {row.index + 1}
          </span>
        ),
      },
      {
        Header: "EMP CODE",
        accessor: "Emp_Code",
        Cell: ({ value }: any) => value || "—",
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: "Emp_Name",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "DESIGNATION",
        accessor: "Designation",
        Cell: ({ value }: any) => value || "—",
      },
      {
        Header: "LOCATION",
        accessor: "Location_Name",
        Cell: ({ value }: any) => value || "—",
      },
      {
        Header: "DOCUMENT TYPE",
        accessor: "Doc_Type",
        Cell: ({ value }: any) => (
          <span className="font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800 text-xs inline-block whitespace-nowrap">
            {formatDocType(value)}
          </span>
        ),
      },
      {
        Header: "DOCUMENT NAME",
        accessor: "Doc_Name",
        Cell: ({ value }: any) => value || "—",
      },
      {
        Header: "UPLOADED DATE",
        accessor: "CREATED_AT",
        Cell: ({ value }: any) => formatDate(value),
      },
      {
        Header: "UPLOADED BY",
        accessor: "Created_By_Name",
        Cell: ({ value }: any) => value || "—",
      },
      {
        Header: "VIEW DOCUMENT",
        accessor: "Doc_Path",
        Cell: ({ row }: any) => {
          const docPath = row.original?.Doc_Path
            ? String(row.original.Doc_Path).trim()
            : "";
          if (!docPath) return <span className="text-center block text-slate-400">—</span>;
          const fileUrl = getFileUrl(docPath);
          const isPdf =
            docPath.toLowerCase().endsWith(".pdf") ||
            docPath.toLowerCase().includes(".pdf");
          return (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#4F46E5] hover:text-[#4338CA] dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline cursor-pointer text-xs inline-flex items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{isPdf ? "View PDF" : "View Image"}</span>
            </a>
          );
        },
      },
      {
        Header: "APPROVER 1",
        accessor: "apr1_name",
        Cell: ({ row }: any) =>
          renderApproverCell(row.original.apr1_name, row.original.Appr_1_Stat),
      },
      {
        Header: "APPR 1 REMARK",
        accessor: "Appr_1_Rem",
        Cell: ({ value }: any) => value || "—",
      },
      {
        Header: "APPROVER 2",
        accessor: "apr2_name",
        Cell: ({ row }: any) =>
          renderApproverCell(row.original.apr2_name, row.original.Appr_2_Stat),
      },
      {
        Header: "APPR 2 REMARK",
        accessor: "Appr_2_Rem",
        Cell: ({ value }: any) => value || "—",
      },
      {
        Header: "APPROVER 3",
        accessor: "apr3_name",
        Cell: ({ row }: any) =>
          renderApproverCell(row.original.apr3_name, row.original.Appr_3_Stat),
      },
      {
        Header: "APPR 3 REMARK",
        accessor: "Appr_3_Rem",
        Cell: ({ value }: any) => value || "—",
      },
      {
        Header: "FINAL STATUS",
        accessor: "FIN_APPR",
        Cell: ({ row }: any) => {
          const status =
            row.original.Overall_Status ||
            (row.original.Fin_Appr == 1
              ? "APPROVED"
              : row.original.Fin_Appr == 0
              ? "REJECTED"
              : "PENDING");
          const isApproved = status === "APPROVED" || row.original.Fin_Appr == 1;
          const isRejected = status === "REJECTED" || row.original.Fin_Appr == 0;

          return (
            <span
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-bold inline-block border whitespace-nowrap",
                isApproved
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                  : isRejected
                  ? "border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30"
                  : "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30"
              )}
            >
              {status}
            </span>
          );
        },
      },
    ],
    []
  );

  // -----------------------------------------------------------------------
  // Row Data Mapping (converts status to template standard: 1=Pending, 2=Approved, 3=Rejected)
  // -----------------------------------------------------------------------

  const mapRowData = (row: any, i: number) => {
    let status = 1; // Default: Pending (1)
    if (row.Fin_Appr == 1 || (row.status_khud_ka == 1 && row.Fin_Appr == null)) {
      status = 2; // Approved (2)
    } else if (
      (row.Fin_Appr == 0 && row.Fin_Appr !== 1) ||
      (row.status_khud_ka == 0 && row.Fin_Appr == null)
    ) {
      status = 3; // Rejected (3)
    } else {
      status = 1; // Pending (1)
    }

    return {
      ...row,
      srno: i + 1,
      status,
      UTD: row.UTD ?? row.Utd ?? row.tran_id ?? row.Tran_id ?? i + 1,
    };
  };

  // -----------------------------------------------------------------------
  // Build Fetch Payload for POST /ars/DocApproverView
  // -----------------------------------------------------------------------

  const buildFetchParams = (dates: any, currentUser: any) => {
    return {
      Appr_Code: currentUser?.EMPCODE,
      DateFrom: dates.DATE_FROM,
      DateTo: dates.DATE_TO,
      branch: dates.branch || currentUser?.branch || "",
    };
  };

  // -----------------------------------------------------------------------
  // Approve Action (calls /ars/DocApproveBy2)
  // -----------------------------------------------------------------------

  const handleApproveRows = async (
    selectedRows: any[],
    remarkText: string
  ): Promise<boolean> => {
    const tranIds = selectedRows.map((r: any) => {
      const row = r.rowData || r;
      return row.UTD ?? row.Utd ?? row.tran_id ?? row.id;
    });

    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/DocApproveBy2`,
        {
          tran_id: tranIds,
          Appr_Code: user?.EMPCODE,
          Remark: remarkText || "",
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      if (result.data?.Status || result.data?.status) {
        await Swal.fire({
          icon: "success",
          title: "Approved",
          text: "Document(s) Approved Successfully",
          confirmButtonColor: "#4F46E5",
        });
        return true;
      } else {
        await Swal.fire({
          icon: "error",
          title: "Approval Failed",
          text: result.data?.Message || "Failed to approve document(s).",
          confirmButtonColor: "#E11D48",
        });
        return false;
      }
    } catch (err: any) {
      console.error("Approval error:", err);
      await Swal.fire({
        icon: "error",
        title: "Approval Error",
        text: err?.response?.data?.Message || "Error approving documents",
        confirmButtonColor: "#E11D48",
      });
      return false;
    }
  };

  // -----------------------------------------------------------------------
  // Reject Action (calls /ars/DocRejectBy2)
  // -----------------------------------------------------------------------

  const handleRejectRows = async (
    selectedRows: any[],
    remarkText: string
  ): Promise<boolean> => {
    const tranIds = selectedRows.map((r: any) => {
      const row = r.rowData || r;
      return row.UTD ?? row.Utd ?? row.tran_id ?? row.id;
    });

    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/DocRejectBy2`,
        {
          tran_id: tranIds,
          Appr_Code: user?.EMPCODE,
          Remark: remarkText || "",
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      if (result.data?.Status || result.data?.status) {
        await Swal.fire({
          icon: "success",
          title: "Rejected",
          text: "Document(s) Rejected Successfully",
          confirmButtonColor: "#4F46E5",
        });
        return true;
      } else {
        await Swal.fire({
          icon: "error",
          title: "Rejection Failed",
          text: result.data?.Message || "Failed to reject document(s).",
          confirmButtonColor: "#E11D48",
        });
        return false;
      }
    } catch (err: any) {
      console.error("Rejection error:", err);
      await Swal.fire({
        icon: "error",
        title: "Rejection Error",
        text: err?.response?.data?.Message || "Error rejecting documents",
        confirmButtonColor: "#E11D48",
      });
      return false;
    }
  };

  // Double click handler to view document
  const handleRowDoubleClick = (row: any) => {
    const docPath = row?.Doc_Path ? String(row.Doc_Path).trim() : "";
    if (docPath) {
      window.open(getFileUrl(docPath), "_blank");
    }
  };

  return (
    <ApproverGridTemplate
      pageTitle="Employee Document Approval Grid"
      pageSubtitle="Review, verify, and approve employee uploaded documents."
      tableTitle="Uploaded Documents"
      approveButtonText="Approve"
      columns={columns}
      selectKey="UTD"
      fetchApiUrl={`${process.env.NEXT_PUBLIC_URL}/ars/DocApproverView`}
      fetchMethod="POST"
      buildFetchParams={buildFetchParams}
      mapRowData={mapRowData}
      moduleName="EMP_DOC_CHANGE"
      onApproveRows={handleApproveRows}
      onRejectRows={handleRejectRows}
      onRowDoubleClick={handleRowDoubleClick}
    />
  );
}
