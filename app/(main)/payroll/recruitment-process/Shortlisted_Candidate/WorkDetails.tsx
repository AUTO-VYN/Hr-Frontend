"use client";

import React, { useEffect, useState } from "react";
import TableComponent from "@/components/atoms/DynamicTable";
import { useFormData } from "./Context/FormDataContext";
import SectionCard from "./SectionCard";
import { Briefcase } from "lucide-react";

type Props = {
  flag?: string | null;
};

const WorkDetails: React.FC<Props> = ({ flag }) => {
  const { formData, setFormData } = useFormData();
  const [tableData, setTableData] = useState(
    Array.isArray(formData.EmpExperience) && formData.EmpExperience.length
      ? formData.EmpExperience
      : [{}]
  );

  const [flageData, setflageDataData] = useState<boolean>(false);

  useEffect(() => {
    if (flag === "true") {
      setflageDataData(false);
    } else {
      setflageDataData(true);
    }
  }, [flag]);

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
    "Salary",
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
    Emp_Company: { type: "TEXT", required: true, max: 30 },
    Emp_Designation: { type: "TEXT", required: true, max: 30 },
    Emp_Responsibility: { type: "TEXT", max: 50 },
    Emp_From_Date: { type: "DATE", required: true },
    Emp_To_Date: { type: "DATE" },
    Emp_Settlement_Done: { type: "TEXT", max: 30 },
    Emp_Drawn_Salary: { type: "NUMBER", max: 9 },
    Emp_Leaving_Reason: { type: "TEXT", max: 50 },
  };

  return (
    <div className="w-full">
      <SectionCard
        title="Work Experience Details"
        icon={<Briefcase size={18} />}
        bodyClassName="p-0"
      >
        <div className="w-full overflow-x-auto">
          <TableComponent
            columnsShow={columnsShow}
            columns={columns}
            tableData={tableData}
            setTableData={setTableData}
            constraints={constraints}
            disabledProp={flageData}
            AddBtn={!flageData}
            AddBtnText="Add Experience"
          />
        </div>
      </SectionCard>
    </div>
  );
};

export default WorkDetails;
