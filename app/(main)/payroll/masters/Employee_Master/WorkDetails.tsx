"use client";
import React, { useEffect, useState } from "react";
import { useFormData } from "./Context/FormDataContext";
import YNDynamicTable from "@/components/atoms/YNDynamicTable";
import { Box, Plus, Briefcase } from "lucide-react";

interface RowData {
  Emp_Company: string;
  Emp_Designation: string;
  Emp_Responsibility: string;
  Emp_From_Date: string;
  Emp_To_Date: string;
  Emp_Settlement_Done: string;
  Emp_Drawn_Salary: string;
  Emp_Leaving_Reason: string;
}

// Function to format date
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return ""; // Handle empty date
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Page: React.FC = () => {
  const { formData, setFormData } = useFormData();

  // ✅ Default mein ek empty row set ki hai - always show at least one row
  const [tableData, setTableData] = useState<RowData[]>(() => {
    if (formData.EmpExperience && formData.EmpExperience.length > 0) {
      return formData.EmpExperience.map((row: RowData) => ({
        ...row,
        Emp_From_Date: formatDate(row.Emp_From_Date),
        Emp_To_Date: formatDate(row.Emp_To_Date),
      }));
    }
    // ✅ Always return at least one empty row as default
    return [{}];
  });

  useEffect(() => {
    setFormData((prevData: any) => ({
      ...prevData,
      EmpExperience: tableData,
    }));
  }, [tableData]);

  const columnsShow = [
    "Company",
    "Designation",
    "Responsibilities",
    "From",
    "To",
    "Settlement Done",
    "Salary (CTC)",
    "Reason of leaving",
  ];

  const columns = [
    "Emp_Company",
    "Emp_Designation",
    "Emp_Responsibility",
    "Emp_From_Date",
    "Emp_To_Date",
    "Emp_Settlement_Done",
    "Emp_Drawn_Salary",
    "Emp_Leaving_Reason",
  ];

  const constraints = {
    Emp_Company: { type: "TEXT", required: true },
    Emp_Designation: { type: "TEXT", required: true },
    Emp_Responsibility: { type: "TEXT" },
    Emp_From_Date: { type: "DATE", required: true },
    Emp_To_Date: { type: "DATE" },
    Emp_Settlement_Done: { type: "TEXT" },
    Emp_Drawn_Salary: { type: "NUMBER" },
    Emp_Leaving_Reason: { type: "TEXT" },
  };

  // ✅ Add new row functionality
  const handleAddRow = () => {
    setTableData((prev) => [...prev, {}]);
  };

  return (
    <div className="w-full bg-[#F8FAFC] dark:bg-[#1E293B] p-4 rounded-xl border border-[#E2E8F0] dark:border-[#334155] shadow-sm">
      
      {/* ✅ Header Section - Asset Details jaisa */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md">
            <Briefcase className="h-6 w-6 text-[#4F46E5] dark:text-[#818CF8]" />
          </div>
          <h1 className="font-bold text-[13px] text-[#1E293B] dark:text-[#E2E8F0] tracking-wide uppercase">
            Work Details
          </h1>
        </div>
      </div>

      {/* ✅ Table Wrapper - Asset Details jaisa */}
      <div className="w-full border border-[#EAECF0] dark:border-[#334155] rounded-lg overflow-hidden bg-white dark:bg-[#0F172A]">
        
        {/* Original YNDynamicTable - Same functionality */}
        <div className="[&_th]:!text-[10px] [&_th]:!tracking-[0.08em] [&_th]:!bg-[#F8FAFC] dark:[&_th]:!bg-[#1E293B] [&_th]:!text-[#475569] dark:[&_th]:!text-[#94A3B8] [&_tbody_tr]:!bg-white dark:[&_tbody_tr]:!bg-[#0F172A] [&_tbody_td]:!text-[#334155] dark:[&_tbody_td]:!text-[#E2E8F0] [&_tbody_tr:last-child]:!hidden [&_tbody_tr:last-child]:!pointer-events-none">
          <YNDynamicTable
            columnsShow={columnsShow}
            columns={columns}
            tableData={tableData}
            setTableData={setTableData}
            constraints={constraints}
          />
        </div>

        {/* ✅ "+ Add Experience" button */}
        <div className="px-6 py-4 border-t border-[#EAECF0] dark:border-[#334155] bg-white dark:bg-[#0F172A]">
          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[#D0D5DD] dark:border-[#475569] bg-white dark:bg-[#0F172A] px-4 py-2 text-sm font-medium text-[#4F46E5] dark:text-[#818CF8] hover:bg-[#F3F4FF] dark:hover:bg-[#1E293B] hover:border-[#A5B4FC] dark:hover:border-[#6366F1] transition-colors"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Add Experience
          </button>
        </div>
      </div>
    </div>
  );
};

export default Page;