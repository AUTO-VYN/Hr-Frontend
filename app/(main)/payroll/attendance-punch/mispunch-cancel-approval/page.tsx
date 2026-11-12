"use client";

import React, { useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import Image from "next/image";
import ApproverGridTemplate, { formatDate } from "@/components/Templates/ApproverGridTemplate";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import FileViewer from "@/components/atoms/Fileviewer";
import Button from "@/components/atoms/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MispunchCancelApprovalPage() {
  const user = useCurrentUser();
  const [dialogRemark, setDialogRemark] = useState<string>("");
  const [isDialogActionLoading, setIsDialogActionLoading] = useState<boolean>(false);


  // 3-dot visual helper matching legacy code logic
  const getDotColor = (index: number, stat: any, isLastDotRed: any) => {
    if (stat == 4) {
      return isLastDotRed == 2 ? "#E11D48" : "#10B981";
    }
    if (index < stat - 1) {
      return "#10B981";
    }
    return "#F59E0B";
  };

  // Table Columns Definition Matching Prototype & Legacy Code
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
        Header: "LEVEL",
        accessor: "stat",
        Cell: ({ row }: any) => (
          <div className="flex items-center gap-[5px]" title={`Level ${row.original.stat || 1}`}>
            {[0, 1, 2].map((idx) => (
              <span
                key={idx}
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  backgroundColor: getDotColor(idx, row.original.stat, row.original.Canc_Fin),
                  display: "inline-block",
                }}
              />
            ))}
          </div>
        ),
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
        Header: "ACTUAL IN",
        accessor: "Actual_In",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "ACTUAL OUT",
        accessor: "Actual_Out",
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
      {
        Header: "APPLIED ON",
        accessor: "Mispunch_applied_on",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
            {formatDate(value)}
          </span>
        ),
      },
    ],
    []
  );

  // Custom fetch params for GET /mobile/getMispunchCancelReqData
  const buildFetchParams = (dates: any, currentUser: any) => ({
    Appr_Code: currentUser?.EMPCODE,
    StartDate: dates.DATE_FROM,
    EndDate: dates.DATE_TO,
  });

  // Map backend row data to standard status values (1: Pending, 2: Approved, 3: Rejected)
  const mapRowData = (row: any, i: number) => {
    let status = 1; // Pending
    if (row.Canc_Fin == 1) {
      status = 2; // Approved
    } else if (row.Canc_Fin == 2) {
      status = 3; // Rejected
    } else if (row.Canc_Fin == 0 && row.status_khud_ka != null) {
      status = 2; // Approved/Processed
    }
    return {
      ...row,
      srno: i + 1,
      status,
      Utd: row.Utd ?? row.utd ?? row.id ?? i + 1,
    };
  };

  // Bulk Approve Handler: calls GET /mobile/ApproveCancelMisspunchReq with ApproveOrRej: "1"
  const onApproveRows = async (selectedRows: any[], remark: string) => {
    let successCount = 0;
    const failMessages: string[] = [];

    for (const row of selectedRows) {
      const selectedRowData = row.rowData || row;
      try {
        const result = await axios.get(
          `${process.env.NEXT_PUBLIC_URL}/mobile/ApproveCancelMisspunchReq`,
          {
            params: {
              Comp_Code: user?.Comp_Code || "omll",
              EMPCODE: selectedRowData.EmpCode,
              Appr_Code: user?.EMPCODE,
              ApproveOrRej: "1",
              Utd: selectedRowData.Utd,
              Remark: remark,
              module: "misspunch",
            },
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
        text: `${successCount} mis-punch cancellation request(s) approved successfully.`,
        confirmButtonColor: "#4F46E5",
      });
      return true;
    }
    return false;
  };

  // Bulk Reject Handler: calls GET /mobile/ApproveCancelMisspunchReq with ApproveOrRej: "0"
  const onRejectRows = async (selectedRows: any[], remark: string) => {
    let successCount = 0;
    const failMessages: string[] = [];

    for (const row of selectedRows) {
      const selectedRowData = row.rowData || row;
      try {
        const result = await axios.get(
          `${process.env.NEXT_PUBLIC_URL}/mobile/ApproveCancelMisspunchReq`,
          {
            params: {
              Comp_Code: user?.Comp_Code || "omll",
              EMPCODE: selectedRowData.EmpCode,
              Appr_Code: user?.EMPCODE,
              ApproveOrRej: "0",
              Remark: remark,
              Utd: selectedRowData.Utd,
              module: "misspunch",
            },
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
        text: `${successCount} mis-punch cancellation request(s) rejected successfully.`,
        confirmButtonColor: "#E11D48",
      });
      return true;
    }
    return false;
  };

  // Render Double Click Details Dialog with file attachments & actions
  const renderDetailsDialog = (
    selectedRow: any,
    isOpen: boolean,
    onClose: () => void,
    onSuccess: () => void
  ) => {
    if (!selectedRow) return null;

    const handleSingleAction = async (approveOrRej: "1" | "0") => {
      if (!dialogRemark || !dialogRemark.trim()) {
        Swal.fire({
          icon: "warning",
          title: "Remark Required",
          text: `Please enter a remark before ${approveOrRej === "1" ? "approving" : "rejecting"}.`,
          confirmButtonColor: "#4F46E5",
        });
        return;
      }

      setIsDialogActionLoading(true);
      try {
        const result = await axios.get(
          `${process.env.NEXT_PUBLIC_URL}/mobile/ApproveCancelMisspunchReq`,
          {
            params: {
              Comp_Code: user?.Comp_Code || "omll",
              EMPCODE: selectedRow.EmpCode,
              Appr_Code: user?.EMPCODE,
              ApproveOrRej: approveOrRej,
              Utd: selectedRow.Utd,
              Remark: dialogRemark,
              module: "misspunch",
            },
            headers: {
              compcode: user?.Comp_Code,
              name: user?.name,
            },
          }
        );

        if (result.data?.status === true || result.data?.Status === true) {
          await Swal.fire({
            icon: "success",
            title: approveOrRej === "1" ? "Approved Successfully" : "Rejected Successfully",
            text: `Mis-punch cancellation request for ${selectedRow.EmpName || selectedRow.EmpCode} has been ${
              approveOrRej === "1" ? "approved" : "rejected"
            }.`,
            confirmButtonColor: approveOrRej === "1" ? "#4F46E5" : "#E11D48",
          });
          setDialogRemark("");
          onClose();
          onSuccess();
        } else {
          Swal.fire({
            icon: "error",
            title: "Action Failed",
            text: result.data?.Message || "Operation could not be completed.",
            confirmButtonColor: "#4F46E5",
          });
        }
      } catch (err: any) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: err.response?.data?.Message || "Server communication error.",
          confirmButtonColor: "#4F46E5",
        });
      } finally {
        setIsDialogActionLoading(false);
      }
    };

    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-full max-w-3xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[16px] p-6 shadow-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="border-b border-[#E2E8F0] dark:border-[#1F2937] pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-[8px]">
                <DialogTitle className="text-[17px] font-[650] text-[#1E293B] dark:text-[#E7ECF3]">
                  Mis-punch Details
                </DialogTitle>
                <div className="flex items-center gap-[4px] ml-2">
                  {[0, 1, 2].map((idx) => (
                    <span
                      key={idx}
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: getDotColor(idx, selectedRow.stat, selectedRow.Canc_Fin),
                        display: "inline-block",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogDescription className="text-[12px] text-[#64748B] dark:text-[#94A3B8] mt-1">
              Complete regularisation record and attachments submitted by employee.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            {/* Employee Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-[12px] bg-[#F8FAFC] dark:bg-[#0E1524] border border-[#E2E8F0] dark:border-[#1F2937]">
              <div>
                <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] uppercase block">
                  Employee
                </span>
                <span className="text-[13px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
                  {selectedRow.EmpName || "—"}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] uppercase block">
                  Emp Code
                </span>
                <span className="text-[13px] font-[500] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums">
                  {selectedRow.EmpCode || "—"}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] uppercase block">
                  Designation
                </span>
                <span className="text-[13px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
                  {selectedRow.EmployeeDesignation || "—"}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] uppercase block">
                  Date
                </span>
                <span className="text-[13px] font-[500] text-[#1E293B] dark:text-[#E7ECF3]">
                  {formatDate(selectedRow.Date)}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] uppercase block">
                  Req In / Out
                </span>
                <span className="text-[13px] font-[500] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums">
                  {selectedRow.In1 || "—"} / {selectedRow.Out1 || "—"}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] uppercase block">
                  Actual In / Out
                </span>
                <span className="text-[13px] font-[500] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums">
                  {selectedRow.Actual_In || "—"} / {selectedRow.Actual_Out || "—"}
                </span>
              </div>
            </div>

            {/* Reasons and Remarks */}
            <div className="space-y-2 text-[12.5px]">
              <div className="p-3 rounded-[10px] bg-[#FFFFFF] dark:bg-[#0E1524] border border-[#E2E8F0] dark:border-[#1F2937]">
                <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] uppercase block mb-1">
                  Reason for Mis-punch
                </span>
                <p className="m-0 text-[#1E293B] dark:text-[#E7ECF3]">
                  {selectedRow.Mipunch_Reason || "—"}
                </p>
              </div>

              {selectedRow.MI_Remark && (
                <div className="p-3 rounded-[10px] bg-[#FFFFFF] dark:bg-[#0E1524] border border-[#E2E8F0] dark:border-[#1F2937]">
                  <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] uppercase block mb-1">
                    Employee Remark
                  </span>
                  <p className="m-0 text-[#1E293B] dark:text-[#E7ECF3]">
                    {selectedRow.MI_Remark}
                  </p>
                </div>
              )}

              {(selectedRow.head_remark || selectedRow.head_remark_by) && (
                <div className="p-3 rounded-[10px] bg-[#FFFFFF] dark:bg-[#0E1524] border border-[#E2E8F0] dark:border-[#1F2937]">
                  <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] uppercase block mb-1">
                    Head Remark ({selectedRow.head_remark_by || "Head"})
                  </span>
                  <p className="m-0 text-[#1E293B] dark:text-[#E7ECF3]">
                    {selectedRow.head_remark || "—"}
                  </p>
                </div>
              )}

              {selectedRow.Spl_Remark && (
                <div className="p-3 rounded-[10px] bg-[#FFFFFF] dark:bg-[#0E1524] border border-[#E2E8F0] dark:border-[#1F2937]">
                  <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] uppercase block mb-1">
                    Special Remark
                  </span>
                  <p className="m-0 text-[#1E293B] dark:text-[#E7ECF3]">
                    {selectedRow.Spl_Remark}
                  </p>
                </div>
              )}
            </div>

            {/* Proof Attachments (In / Out) */}
            {(selectedRow.fileIn || selectedRow.fileOut) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {selectedRow.fileIn && (
                  <div className="p-3 rounded-[10px] border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0E1524]">
                    <span className="text-[11px] font-[600] text-[#10B981] uppercase block mb-2">
                      In Punch Proof
                    </span>
                    <div className="relative w-full h-[120px] rounded-[8px] overflow-hidden bg-black/5 mb-2">
                      <Image
                        src={selectedRow.fileIn}
                        alt="In Proof"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <FileViewer fileLink={selectedRow.fileIn} celldata={selectedRow.fileIn} />
                  </div>
                )}
                {selectedRow.fileOut && (
                  <div className="p-3 rounded-[10px] border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0E1524]">
                    <span className="text-[11px] font-[600] text-[#E11D48] uppercase block mb-2">
                      Out Punch Proof
                    </span>
                    <div className="relative w-full h-[120px] rounded-[8px] overflow-hidden bg-black/5 mb-2">
                      <Image
                        src={selectedRow.fileOut}
                        alt="Out Proof"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <FileViewer fileLink={selectedRow.fileOut} celldata={selectedRow.fileOut} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Footer inside Dialog */}
          {!selectedRow.status_khud_ka && (selectedRow.status === 1 || selectedRow.Canc_Fin == 0) && (
            <div className="border-t border-[#E2E8F0] dark:border-[#1F2937] pt-3.5 flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                placeholder="Enter remark for this decision..."
                value={dialogRemark}
                onChange={(e) => setDialogRemark(e.target.value)}
                className="flex-1 w-full h-[38px] px-3 text-[12.5px] rounded-[9px] border border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] outline-none focus:border-[#4F46E5]"
              />
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSingleAction("0")}
                  disabled={isDialogActionLoading}
                  className="!h-[38px] !px-4 !border-[#E11D48]/40 hover:!border-[#E11D48] !bg-[#FFFFFF] dark:!bg-[#111827] hover:!bg-[#E11D48]/10 !text-[#E11D48] !text-[12.5px] !font-[600] !rounded-[9px] cursor-pointer"
                >
                  Reject
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSingleAction("1")}
                  disabled={isDialogActionLoading}
                  className="!h-[38px] !px-5 !bg-[#4F46E5] hover:!brightness-[1.08] !text-white !text-[12.5px] !font-[600] !rounded-[9px] cursor-pointer"
                >
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <ApproverGridTemplate
      pageTitle="Mis-punch cancel approver grid"
      pageSubtitle="Approving a withdrawal restores the original raw punch and removes the regularisation."
      tableTitle="Withdrawal requests"
      approveButtonText="Approve withdrawal"
      columns={columns}
      fetchApiUrl={`${process.env.NEXT_PUBLIC_URL}/mobile/getMispunchCancelReqData`}
      fetchMethod="GET"
      buildFetchParams={buildFetchParams}
      mapRowData={mapRowData}
      onApproveRows={onApproveRows}
      onRejectRows={onRejectRows}
      renderDetailsDialog={renderDetailsDialog}
      moduleName="misspunch"
    />
  );
}
