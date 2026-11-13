"use client";

import React, { useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";

import ApproverGridTemplate from "@/components/Templates/ApproverGridTemplate";
import { useCurrentUser } from "@/app/hooks/use-current-user";

export default function WeeklyOffApproverGridPage() {
  const user = useCurrentUser();

  const dayNames = useMemo(
    () => [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    []
  );

  const getDayName = (value: any) => {
    if (value == null || value === "") return "—";
    const num = Number(value);
    if (!isNaN(num) && num >= 0 && num <= 6) return dayNames[num];
    return String(value);
  };

  const formatDMY = (dateStr: any) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Columns definition matching legacy code & modern prototype
  const columns = useMemo(
    () => [
      {
        Header: "SR",
        accessor: "Tran_id",
        align: "center",
        Cell: ({ row, value }: any) => value || row.original.srno || "—",
      },
      {
        Header: "STATUS",
        accessor: "status",
        Cell: ({ value, row }: any) => {
          let label = "Pending";
          let tint = "#F59E0B";

          if (value === 2 || row.original.Fin_Appr == 1) {
            label = "Approved";
            tint = "#10B981";
          } else if (value === 3 || row.original.Fin_Appr == 2) {
            label = "Rejected";
            tint = "#E11D48";
          } else {
            label = "Pending";
            tint = "#F59E0B";
          }

          return (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                fontWeight: 600,
                color: tint,
                backgroundColor: `${tint}14`,
                border: `1px solid ${tint}55`,
                padding: "3px 8px",
                borderRadius: "8px",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: tint,
                  flex: "0 0 auto",
                }}
              />
              {label}
            </span>
          );
        },
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: "Employee_Name",
        Cell: ({ value }: any) => value || "—",
      },
      {
        Header: "DESIGNATION",
        accessor: "EMPLOYEEDESIGNATION",
        Cell: ({ value }: any) => value || "—",
      },
      {
        Header: "APPLICABLE DATE",
        accessor: "Change_Date",
        Cell: ({ value }: any) => formatDMY(value),
      },
      {
        Header: "CURRENT WO",
        accessor: "Prev_WO",
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {getDayName(value)}
          </span>
        ),
      },
      {
        Header: "NEW WO",
        accessor: "New_WO",
        Cell: ({ value }: any) => (
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {getDayName(value)}
          </span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dayNames]
  );

  // Map Backend Row Data
  const mapRowData = (row: any, i: number) => {
    let status = 1; // Pending
    if (row.Fin_Appr == 1 || row.Fin_Appr === "1") {
      status = 2; // Approved
    } else if (row.Fin_Appr == 2 || row.Fin_Appr === "2") {
      status = 3; // Rejected
    } else {
      status = 1; // Pending
    }

    return {
      ...row,
      srno: i + 1,
      Tran_id: row.Tran_id || i + 1,
      status,
      Utd: row.Tran_id || row.utd || i + 1,
    };
  };

  // Build Payload for POST WOApproverView
  const buildFetchParams = (dates: any, currentUser: any) => {
    return {
      Appr_Code: currentUser?.EMPCODE,
      loc_code: currentUser?.branch || "",
      isSelf: 0,
      DateFrom: dates.DATE_FROM,
      DateTo: dates.DATE_TO,
    };
  };

  // Handle Approve Action
  const handleApproveRows = async (
    selectedRows: any[],
    remarkText: string
  ): Promise<boolean> => {
    const tranIds = selectedRows.map((r: any) => {
      const row = r.rowData || r;
      return row.Tran_id || row.id;
    });

    const firstRow = selectedRows[0]?.rowData || selectedRows[0];
    const empCode = firstRow?.EMPCODE || firstRow?.EmpCode || user?.EMPCODE;

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/mobile/ApproveWOReq`,
        {
          Tran_Id: tranIds.join(","),
          Remark: remarkText,
          EMPCODE: empCode,
          loc_code: user?.branch || "",
          Appr_Code: user?.EMPCODE,
          ApproveOrRej: 1,
          Fin_Appr: 1,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      await Swal.fire({
        icon: "success",
        title: "Approved",
        text: "Data Approved successfully.",
        confirmButtonColor: "#4F46E5",
      });

      return true;
    } catch (error: any) {
      console.error("Approve error:", error);
      await Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error?.response?.data?.message ||
          "Something went wrong. Please try again.",
        confirmButtonColor: "#4F46E5",
      });
      return false;
    }
  };

  // Handle Reject Action
  const handleRejectRows = async (
    selectedRows: any[],
    remarkText: string
  ): Promise<boolean> => {
    const tranIds = selectedRows.map((r: any) => {
      const row = r.rowData || r;
      return row.Tran_id || row.id;
    });

    const firstRow = selectedRows[0]?.rowData || selectedRows[0];
    const empCode = firstRow?.EMPCODE || firstRow?.EmpCode || user?.EMPCODE;

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/mobile/ApproveWOReq`,
        {
          Tran_Id: tranIds.join(","),
          Remark: remarkText,
          EMPCODE: empCode,
          loc_code: user?.branch || "",
          Appr_Code: user?.EMPCODE,
          ApproveOrRej: 0,
          Fin_Appr: 2,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      await Swal.fire({
        icon: "success",
        title: "Rejected",
        text: "Data Rejected successfully.",
        confirmButtonColor: "#4F46E5",
      });

      return true;
    } catch (error: any) {
      console.error("Reject error:", error);
      await Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error?.response?.data?.message ||
          "Something went wrong. Please try again.",
        confirmButtonColor: "#4F46E5",
      });
      return false;
    }
  };

  return (
    <ApproverGridTemplate
      pageTitle="Weekly off approver grid"
      pageSubtitle="Approving a change rewrites the roster from the applicable date onwards."
      tableTitle="Weekly off changes"
      approveButtonText="Approve"
      columns={columns}
      selectKey="Tran_id"
      fetchApiUrl={`${process.env.NEXT_PUBLIC_URL_LOCAL}/mobile/WOApproverView`}
      fetchMethod="POST"
      buildFetchParams={buildFetchParams}
      mapRowData={mapRowData}
      moduleName="Shift"
      onApproveRows={handleApproveRows}
      onRejectRows={handleRejectRows}
    />
  );
}
