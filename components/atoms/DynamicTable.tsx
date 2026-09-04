import React, { useEffect, useRef } from "react";
import { MdDelete, MdAdd } from "react-icons/md";
import "tailwindcss/tailwind.css";
import Swal from "sweetalert2";
import Eselect from "./Eselect";
import { Trash2 } from "lucide-react";

interface TableComponentProps {
  columns: string[];
  columnsShow: string[];
  tableData: any[];
  setTableData: React.Dispatch<React.SetStateAction<any[]>>;
  constraints: Record<string, any>;
  disabledProp?: boolean;
  DropDownOp?: Record<string, any[]>;
  Height?: number;
  AddBtn?: boolean;

  // ✅ UI only (optional). If not passed, text auto-infer ho jayega.
  AddBtnText?: string;
}

const TableComponent: React.FC<TableComponentProps> = ({
  columns,
  columnsShow,
  tableData,
  setTableData,
  constraints,
  disabledProp = false,
  DropDownOp = {},
  Height = 0,
  AddBtn = false,
  AddBtnText,
}) => {
  const inputRefs = useRef({});

  function showSideAlert(message: string, type: any) {
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 5000,
      timerProgressBar: true,
      customClass: {
        container: "side-alert-container",
        popup: `side-alert-${type}`,
        title: "side-alert-title",
        icon: "side-alert-icon",
      },
    });

    Toast.fire({
      icon: type,
      title: message,
    });
  }

  const handleInputChange = (
    rowIndex: number,
    field: string,
    value: any,
    inputIndex: any
  ) => {
    const constraint = constraints[field].type;
    const maxLength = constraints[field].max;

    if (constraint === "NUMBER") {
      if (isNaN(value)) return;
    }

    if (maxLength !== undefined && value?.length > maxLength) {
      value = value.substring(0, maxLength);
    }

    const newData = tableData.map((item, index) => {
      if (index === rowIndex) return { ...item, [field]: value || "" };
      return item;
    });

    setTableData(newData);
  };

  const handleDeleteRow = (rowIndex: number) => {
    const newData = tableData.filter((_: any, index: number) => index !== rowIndex);
    setTableData(newData);
  };

  const handleKeyDown = (e: any, rowIndex: number, columnIndex: number) => {
    if (e.key === "Tab") {
      if (e.shiftKey) {
        return;
      } else {
        if (
          rowIndex === tableData.length - 1 &&
          columnIndex === columns.length - 1
        ) {
          e.preventDefault();
          addNewRow();
        }
      }
    }
  };

  const addNewRow = async () => {
    const lastRow = tableData[tableData.length - 1];

    if (lastRow) {
      const issueDate = lastRow.Issue_Date ? new Date(lastRow.Issue_Date) : null;
      const revokeDate = lastRow.Revoke_Date ? new Date(lastRow.Revoke_Date) : null;

      if (issueDate && revokeDate && issueDate > revokeDate) {
        lastRow.Issue_Date = "";
        lastRow.Revoke_Date = "";
        showSideAlert(
          "Issue Date cannot be later than Revoke Date. Dates cleared.",
          "warning"
        );
        setTableData([...tableData]);
        return;
      }

      let allRequiredFieldsFilled = true;

      for (const [field, constraint] of Object.entries(constraints)) {
        const value = (lastRow as any)[field];
        if (
          (constraint as any).required &&
          (value === null ||
            value === undefined ||
            value?.toString()?.trim() === "")
        ) {
          allRequiredFieldsFilled = false;
          showSideAlert(
            `Please fill in the ${field} before adding a new one.`,
            "warning"
          );
          break;
        }
      }

      if (!allRequiredFieldsFilled) return;
    }

    const newRow = {};
    setTableData([...tableData, newRow]);
  };

  useEffect(() => {
    // keep same behavior
    if (tableData.length === 0) {
      addNewRow();
    } else {
      const rowsBeforeLast = tableData.slice(0, -1);
      const lastRow = tableData[tableData.length - 1];

      const newData = rowsBeforeLast.filter((row: any) => {
        return Object.values(row).some((value) => value !== "");
      });

      newData.push(lastRow);

      if (newData.length !== tableData.length) {
        setTableData(newData);
      }
    }
  }, [tableData]);

  const isRowDisabled = (row: any) => {
    if ((row.UTD && row.UTD != null && row.UTD != undefined) || disabledProp) {
      return true;
    }
    return false;
  };

  // ✅ Auto label like screenshot
  const inferredAddText =
    AddBtnText ||
    (columnsShow?.[0]?.toLowerCase().includes("degree")
      ? "Add qualification"
      : columnsShow?.[0]?.toLowerCase().includes("technology") ||
        columnsShow?.[0]?.toLowerCase().includes("tools")
      ? "Add technology"
      : "Add");

  return (
    <>
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10 bg-[#F9FAFB] dark:bg-primary dark:bg-opacity-10">
          <tr>
            <th className="px-6 py-3 text-left text-[12px] font-semibold tracking-[0.06em] text-[#667085] uppercase border-b border-[#EAECF0]">
              Sr.
            </th>

            {columnsShow?.map((column, index) => (
              <th
                key={index}
                className="px-6 py-3 text-left text-[12px] font-semibold tracking-[0.06em] text-[#667085] uppercase border-b border-[#EAECF0]"
              >
                {column}
              </th>
            ))}

            <th className="px-6 py-3 text-left text-[12px] font-semibold tracking-[0.06em] text-[#667085] uppercase border-b border-[#EAECF0] w-[120px]">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {tableData?.map((item, rowIndex) => {
            const disabled = isRowDisabled(item);

            return (
              <tr key={rowIndex} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-[#667085] border-b border-[#EAECF0]">
                  {rowIndex + 1}
                </td>

                {columns?.map((column, columnIndex) => {
                  const isSelect = constraints[column]?.type === "Select";

                  return (
                    <td key={columnIndex} className="px-6 py-3 border-b border-[#EAECF0]">
                      {isSelect ? (
                        <Eselect
                          option={DropDownOp[column]}
                          name={item[column]}
                          mb={"0"}
                          initialValue={item[column]?.toString() || ""}
                          handleInputChange={(label: any, value: any) =>
                            handleInputChange(
                              rowIndex,
                              column,
                              value,
                              `${rowIndex}-${columnIndex}`
                            )
                          }
                          disabled={
                            constraints[column].disabled && disabled ? true : false
                          }
                        />
                      ) : (
                        <input
                          type={
                            constraints[column].type === "DOC"
                              ? "file"
                              : constraints[column].type === "DATE"
                              ? "date"
                              : "text"
                          }
                          value={
                            constraints[column].type === "DOC"
                              ? undefined
                              : item[column]
                              ? item[column]
                              : ""
                          }
                          accept={
                            constraints[column].type === "DOC"
                              ? "image/*,application/pdf"
                              : undefined
                          }
                          onKeyDown={(e) => handleKeyDown(e, rowIndex, columnIndex)}
                          onChange={(e: any) =>
                            handleInputChange(
                              rowIndex,
                              column,
                              constraints[column].type === "DOC"
                                ? e.target.files[0]
                                : e.target.value,
                              `${rowIndex}-${columnIndex}`
                            )
                          }
                          className={`flex ${
                            Height ? "h-full py-1" : "h-9 py-1"
                          } w-full dark:bg-input bg-white px-3 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300`}
                          disabled={
                            constraints[column].disabled && disabled ? true : false
                          }
                        />
                      )}
                    </td>
                  );
                })}

                <td className="px-6 py-3 border-b border-[#EAECF0]">
                  <button
                    type="button"
                    onClick={() => !disabled && handleDeleteRow(rowIndex)}
                    className={`inline-flex items-center justify-center h-9 w-9 rounded-lg border border-[#D0D5DD] bg-white hover:bg-[#F9FAFB]
                      ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    aria-label="Delete row"
                  >
                    <Trash2 className="h-5 w-5 text-red-500" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ✅ Screenshot jaisa Add button (inside table component) */}
      {AddBtn && (
        <div className="px-6 pt-3 pb-5">
          <button
            type="button"
            onClick={() => addNewRow()}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[#D0D5DD] bg-white px-4 py-2 text-sm font-semibold text-[#5B5EF7] hover:bg-[#F3F4FF]"
          >
            <MdAdd className="h-5 w-5" />
            {inferredAddText}
          </button>
        </div>
      )}
    </>
  );
};

export default TableComponent;