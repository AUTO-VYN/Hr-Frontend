"use client";

import React, { useEffect, useState } from "react";
import { useFormData } from "./Context/FormDataContext";
import YNDynamicTable from "@/components/atoms/YNDynamicTable";
import { BriefcaseBusiness } from "lucide-react";

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
  if (!dateString) return "";
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Page: React.FC = () => {
  const { formData, setFormData } = useFormData();

  // Process the table data to format dates
  const [tableData, setTableData] = useState<RowData[]>(
    formData.EmpExperience?.map((row: RowData) => ({
      ...row,
      Emp_From_Date: formatDate(row.Emp_From_Date),
      Emp_To_Date: formatDate(row.Emp_To_Date),
    })) || ([{}] as any),
  );

  useEffect(() => {
    setFormData((prevData: any) => ({
      ...prevData,
      EmpExperience: tableData,
    }));
  }, [tableData, setFormData]);

  const columnsShow = [
    "Company",
    "Designation",
    "Responsibilities",
    "From",
    "To",
    "Settlement Done",
    "Salary (CTC)",
    "Reason for leaving",
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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-[#0B1220]">
      {/* Header (like screenshot) */}
      <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-slate-200 dark:bg-[#0B1220] dark:border-slate-800">
        <div className="text-violet-600 dark:text-violet-400">
          <BriefcaseBusiness size={18} />
        </div>
        <div className="text-[13px] font-semibold tracking-[0.12em] text-slate-900 uppercase dark:text-slate-100">
          WORK DETAILS
        </div>
      </div>

      {/* Table */}
      <div className="work-details-table">
        <YNDynamicTable
          columnsShow={columnsShow}
          columns={columns}
          tableData={tableData}
          setTableData={setTableData}
          constraints={constraints}
           addLabel="Add Work Experience"
        />
      </div>

      {/* Only UI overrides for this page (no functionality change) */}
      
    </div>
  );
};

export default Page;