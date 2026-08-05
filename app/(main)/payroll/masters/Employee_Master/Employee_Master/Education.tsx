/* eslint-disable react/jsx-key */
"use client";

// import SmallTitle from "@/components/atoms/smallTitle";
import React, { useEffect, useState } from "react";
import { useFormData } from "./Context/FormDataContext";
import TableComponent from "@/components/atoms/DynamicTable";
import YNDynamicTable from "@/components/atoms/YNDynamicTable";
interface RowData1 {
  Emp_Degree: string;
  Emp_Board: string;
  Emp_College: string;
  Emp_Passing_year: string;
  Emp_Percentage: string;
}

interface RowData2 {
  Emp_Tool: string;
  Emp_Version: string;
  Emp_Proficiency: string;
  Emp_Last_Used: string;
  Emp_Experience: string;
}

interface RowData3 {
  Emp_Language: string;
  Emp_Language_Understand: string;
  Emp_Language_Speak: string;
  Emp_Language_Read: string;
  Emp_Language_Write: string;
}

const columnsShow = [
  "Degree/Certification",
  "Board/University",
  "School/College",
  "Year of passing",
  "Percentage/CGPA",
];
const columns = [
  "Emp_Degree",
  "Emp_Board",
  "Emp_College",
  "Emp_Passing_year",
  "Emp_Percentage",
];

const constraints = {
  Emp_Degree: { type: "TEXT", required: true, max: 30 },
  Emp_Board: { type: 'TEXT', max: 30 },
  Emp_College: { type: "TEXT", max: 30 },
  Emp_Passing_year: { type: "NUMBER", max: 4 },
  Emp_Percentage: { type: "NUMBER", max: 5 },
};
const columnsShow1 = [
  "Technology/Tools",
  "Version",
  "Proficiency level",
  "Last Used",
  "Experience (Year)",
];
const columns1 = [
  "Emp_Tool",
  "Emp_Version",
  "Emp_Proficiency",
  "Emp_Last_Used",
  "Emp_Experience",
];

const constraints1 = {
  Emp_Tool: { type: "TEXT", required: true, max: 30 },
  Emp_Version: { type: 'TEXT', max: 30 },
  Emp_Proficiency: { type: "TEXT", max: 30 },
  Emp_Last_Used: { type: "NUMBER", max: 4 },
  Emp_Experience: { type: "TEXT", max: 9 },
};
const columnsShow2 = [
  "Language",
  "Understand",
  "Speak (Yes/No)",
  "Read (Yes/No) ",
  "Write (Yes/No)",
];
const columns2 = [
  "Emp_Language",
  "Emp_Language_Understand",
  "Emp_Language_Speak",
  "Emp_Language_Read",
  "Emp_Language_Write",
];

const constraints2 = {
  Emp_Language: { type: "TEXT", required: true, max: 30 },
  Emp_Language_Understand: { type: 'TEXT', max: 30 },
  Emp_Language_Speak: { type: "TEXT", max: 30 },
  Emp_Language_Read: { type: "TEXT", max: 30 },
  Emp_Language_Write: { type: "TEXT", max: 30 },
};
const YourComponent: React.FC = () => {
  const { formData, setFormData } = useFormData();
  const [tableData, setTableData] = useState(formData.EmpEdu || [{}]);
  const [tableData1, setTableData1] = useState(formData.EmpItSkill || [{}]);
  const [tableData2, setTableData2] = useState(formData.EmpLang || [{}]);

  useEffect(() => {
    setFormData((prevData: any) => ({
      ...prevData,
      EmpEdu: tableData,
    }));
  }, [tableData]);

  //2nd Table Function  

  useEffect(() => {
    setFormData((prevData: any) => ({
      ...prevData,
      EmpItSkill: tableData1,
    }));
  }, [tableData1]);

  //3rd Table Function

  useEffect(() => {
    setFormData((prevData: any) => ({
      ...prevData,
      EmpLang: tableData2,
    }));
  }, [tableData2]);



  return (
    <div className="pb-3 ">
      <div className="grid grid-cols-12">
        <div className="col-span-12">
          <div className="overflow-x-auto gap-3 p-4  bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow"> {/* ye pr changes h */}
            <TableComponent
              columns={columns}
              tableData={tableData}
              setTableData={setTableData}
              constraints={constraints}
              columnsShow={columnsShow}
            />
          </div>
          <div className="overflow-x-auto gap-3 p-4 mt-2 bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow">{/* ye pr changes h */}
            <TableComponent
              columns={columns1}
              tableData={tableData1}
              setTableData={setTableData1}
              constraints={constraints1}
              columnsShow={columnsShow1}
            />
          </div>
          <div className="overflow-x-auto gap-3 p-4 mt-2 bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow"> {/* ye pr changes h */}
            <YNDynamicTable
              columns={columns2}
              tableData={tableData2}
              setTableData={setTableData2}
              constraints={constraints2}
              columnsShow={columnsShow2}
            />
          </div>

        </div>
      </div>
    </div>
  );
};

export default YourComponent;
