"use client";

import React, { useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import ApproverGridTemplate, { formatDate } from "@/components/Templates/ApproverGridTemplate";
import { useCurrentUser } from "@/app/hooks/use-current-user";

export default function LeaveCancelApprovalPage() {
  const user = useCurrentUser();


  // Table Columns Definition Matching Prototype & Legacy System
  const columns = useMemo(
    () => [
      {
        Header: "STATUS",
        accessor: "status",
        Cell: ({ value, row }: any) => {
          let label = "Pending";
          let tint = "#F59E0B";

          if (value === 2 || row.original.Canc_Fin == 1) {
            label = "Approved";
            tint = "#10B981";
          } else if (value === 3 || row.original.Canc_Fin == 2) {
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
                padding: "4px 8px",
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
        Header: "REQUEST DATE",
        accessor: "Date",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[500] text-[#1E293B] dark:text-[#E7ECF3] whitespace-nowrap">
            {formatDate(value)}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE",
        accessor: "EmpName",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[600] text-[#1E293B] dark:text-[#E7ECF3] whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "DESIGNATION",
        accessor: "EmployeeDesignation",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3] whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "EMP CODE",
        accessor: "EmpCode",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[500] text-[#64748B] dark:text-[#94A3B8] tabular-nums whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "IN TIME",
        accessor: "In1",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "OUT TIME",
        accessor: "Out1",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "REASON",
        accessor: "Mipunch_Reason",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3] whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "REMARK",
        accessor: "MI_Remark",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "SPECIAL REMARK",
        accessor: "Spl_Remark",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "HEAD NAME",
        accessor: "head_remark_by",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3] whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "HEAD REMARK",
        accessor: "head_remark",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
            {value || "—"}
          </span>
        ),
      },
    ],
    []
  );

  // Bulk Approve Handler for Leave Cancellation
  const onApproveRows = async (selectedRows: any[], remark: string) => {
    let successCount = 0;
    const failMessages: string[] = [];

    for (const row of selectedRows) {
      const selectedRowData = row.rowData || row;
      try {
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/mobile/ApproveLeaveReqCancel`,
          {
            EMPCODE: selectedRowData.EmpCode,
            Appr_Code: user?.EMPCODE,
            ApproveOrRej: "1",
            Utd: selectedRowData.Utd,
            Remark: remark,
          },
          {
            headers: {
              compcode: user?.Comp_Code,
              name: user?.name,
            },
          }
        );
        if (result.data?.status === true || result.data?.Status === true) {
          successCount++;
        } else {
          failMessages.push(
            `${selectedRowData.EmpCode}: ${result.data?.Message || "Failed"}`
          );
        }
      } catch (err: any) {
        failMessages.push(
          `${selectedRowData.EmpCode}: ${err.response?.data?.Message || "Failed"}`
        );
      }
    }

    if (successCount > 0) {
      await Swal.fire({
        icon: "success",
        title: "Approved Successfully",
        text: `${successCount} leave cancel request(s) approved successfully.`,
        confirmButtonColor: "#4F46E5",
      });
      return true;
    }
    return false;
  };

  // Bulk Reject Handler for Leave Cancellation
  const onRejectRows = async (selectedRows: any[], remark: string) => {
    let successCount = 0;
    const failMessages: string[] = [];

    for (const row of selectedRows) {
      const selectedRowData = row.rowData || row;
      try {
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/mobile/ApproveLeaveReqCancel`,
          {
            EMPCODE: selectedRowData.EmpCode,
            Appr_Code: user?.EMPCODE,
            ApproveOrRej: "0",
            Remark: remark,
            Utd: selectedRowData.Utd,
          },
          {
            headers: {
              compcode: user?.Comp_Code,
              name: user?.name,
            },
          }
        );
        if (result.data?.status === true || result.data?.Status === true) {
          successCount++;
        } else {
          failMessages.push(
            `${selectedRowData.EmpCode}: ${result.data?.Message || "Failed"}`
          );
        }
      } catch (err: any) {
        failMessages.push(
          `${selectedRowData.EmpCode}: ${err.response?.data?.Message || "Failed"}`
        );
      }
    }

    if (successCount > 0) {
      await Swal.fire({
        icon: "success",
        title: "Rejected Successfully",
        text: `${successCount} leave cancel request(s) rejected successfully.`,
        confirmButtonColor: "#E11D48",
      });
      return true;
    }
    return false;
  };

  return (
    <ApproverGridTemplate
      pageTitle="Leave cancel approver grid"
      pageSubtitle="Approve a cancellation and the leave day is reversed in both attendance and the leave ledger."
      tableTitle="Cancellation requests"
      approveButtonText="Approve cancellation"
      columns={columns}
      fetchApiUrl={`${process.env.NEXT_PUBLIC_URL}/mobile/getLeaveCancellationData`}
      onApproveRows={onApproveRows}
      onRejectRows={onRejectRows}
      moduleName="leave"
    />
  );
}
