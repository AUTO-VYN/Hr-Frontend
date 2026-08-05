"use client";
import React, { useEffect, useState } from "react";
import SmallTitle from "@/components/atoms/smallTitle";
import { useFormData } from "./Context/FormDataContext";
import TableComponent from "@/components/atoms/DynamicTable";
import YNDynamicTable from "@/components/atoms/YNDynamicTable";

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

  // Process the table data to format dates
  const [tableData, setTableData] = useState<RowData[]>(
    formData.EmpExperience?.map((row: RowData) => ({
      ...row,
      Emp_From_Date: formatDate(row.Emp_From_Date),
      Emp_To_Date: formatDate(row.Emp_To_Date),
    })) || [{}]
  );

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

  return (
    <>
      <div className="">
        {/* <div className="overflow-x-scroll gap-3 p-4 mt-2 bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow">
          <SmallTitle text="Work Details" />
           
          <div className="overflow-x-auto w-full h-[300px]  shadow-md rounded-lg  px-6 ">
            <YNDynamicTable
              columnsShow={columnsShow}
              columns={columns}
              tableData={tableData}
              setTableData={setTableData}
              constraints={constraints}
            />
          </div>
        </div> */}


        <div className="rounded-t bg-[#193A69] dark:bg-black mb-0 px-2 py-2 border dark:border-[#D0D5DD]"> {/* ye pri div replesh karna h */}
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <h1 className=" font-semibold text-sm">
              <div className="flex  text-white dark:text-[#37a9dd] uppercase">
                Work Details
              </div>
            </h1>
          </div>
        </div>


        <div className="overflow-x-auto w-full h-[200px] gap-3 p-4 mt-2 bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow"> {/* ye pr changes h */}
          <YNDynamicTable
            columnsShow={columnsShow}
            columns={columns}
            tableData={tableData}
            setTableData={setTableData}
            constraints={constraints}
          />
        </div>
      </div>
    </>
  );
};

export default Page;
