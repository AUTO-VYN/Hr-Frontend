"use client";

import React, { useEffect, useState } from "react";
import TableComponent from "@/components/atoms/DynamicTable";
import { useFormData } from "./Context/FormDataContext";
import SectionCard from "./SectionCard";
import { GraduationCap, Wrench, Languages } from "lucide-react";

type Props = {
  flag?: string | null;
};

const Education: React.FC<Props> = ({ flag }) => {
  const { formData, setFormData } = useFormData();
  const [tableData, setTableData] = useState(
    Array.isArray(formData.EmpEdu) && formData.EmpEdu.length
      ? formData.EmpEdu
      : [{}]
  );
  const [tableData1, setTableData1] = useState(
    Array.isArray(formData.EmpItSkill) && formData.EmpItSkill.length
      ? formData.EmpItSkill
      : [{}]
  );
  const [tableData2, setTableData2] = useState(
    Array.isArray(formData.EmpLang) && formData.EmpLang.length
      ? formData.EmpLang
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
      EmpEdu: tableData,
    }));
  }, [tableData, setFormData]);

  useEffect(() => {
    setFormData((prevData: any) => ({
      ...prevData,
      EmpItSkill: tableData1,
    }));
  }, [tableData1, setFormData]);

  useEffect(() => {
    setFormData((prevData: any) => ({
      ...prevData,
      EmpLang: tableData2,
    }));
  }, [tableData2, setFormData]);

  // Education / Qualifications
  const columnsShow = [
    "Degree / Certification",
    "Board/University",
    "School/College",
    "Year of passing",
    "Percentage / CGPA",
  ];
  const columns = [
    "Emp_Degree",
    "Emp_Board",
    "Emp_College",
    "Emp_Passing_year",
    "Emp_Percentage",
  ];
  const constraints = {
    Emp_Degree: { type: "TEXT", required: true, max: 30, placeholder: "e.g. B.Tech / MBA / 12th" },
    Emp_Board: { type: "TEXT", max: 30, placeholder: "e.g. CBSE / State Board / University" },
    Emp_College: { type: "TEXT", max: 30, placeholder: "e.g. College / School Name" },
    Emp_Passing_year: { type: "NUMBER", max: 4, placeholder: "e.g. 2023" },
    Emp_Percentage: { type: "NUMBER", max: 5, placeholder: "e.g. 85 or 8.5" },
  };

  // Tools & Technologies
  const columnsShow1 = [
    "Technology / Tools",
    "Version",
    "Proficiency level",
    "Last Used",
    "Experience (Years)",
  ];
  const columns1 = [
    "Emp_Tool",
    "Emp_Version",
    "Emp_Proficiency",
    "Emp_Last_Used",
    "Emp_Experience",
  ];
  const constraints1 = {
    Emp_Tool: { type: "TEXT", required: true, max: 30, placeholder: "e.g. React / Java / Excel" },
    Emp_Version: { type: "TEXT", max: 30, placeholder: "e.g. 18.0 / 2021" },
    Emp_Proficiency: { type: "TEXT", max: 30, placeholder: "e.g. Beginner / Intermediate / Expert" },
    Emp_Last_Used: { type: "NUMBER", max: 4, placeholder: "e.g. 2024" },
    Emp_Experience: { type: "NUMBER", max: 4, placeholder: "e.g.2" },
  };

  // Languages
  const columnsShow2 = [
    "Language",
    "Understand (Y/N)",
    "Speak (Y/N)",
    "Read (Y/N)",
    "Write (Y/N)",
  ];
  const columns2 = [
    "Emp_Language",
    "Emp_Language_Understand",
    "Emp_Language_Speak",
    "Emp_Language_Read",
    "Emp_Language_Write",
  ];
  const constraints2 = {
    Emp_Language: { type: "TEXT", required: true, max: 25, placeholder: "e.g. English / Hindi" },
    Emp_Language_Understand: { type: "TEXT", max: 10, placeholder: "Yes / No" },
    Emp_Language_Speak: { type: "TEXT", max: 10, placeholder: "Yes / No" },
    Emp_Language_Read: { type: "TEXT", max: 10, placeholder: "Yes / No" },
    Emp_Language_Write: { type: "TEXT", max: 10, placeholder: "Yes / No" },
  };

  return (
    <div className="w-full space-y-6">
      {/* 1. Academic & Professional Qualifications */}
      <SectionCard
        title="Academic & Professional Qualifications"
        icon={<GraduationCap size={18} />}
        bodyClassName="p-0"
      >
        <div className="w-full overflow-x-auto">
          <TableComponent
            columns={columns}
            columnsShow={columnsShow}
            tableData={tableData}
            setTableData={setTableData}
            constraints={constraints}
            disabledProp={flageData}
            AddBtn={!flageData}
            AddBtnText="Add Qualification"
          />
        </div>
      </SectionCard>

      {/* 2. IT Skills & Technology Tools */}
      <SectionCard
        title="IT Skills & Technology Tools"
        icon={<Wrench size={18} />}
        bodyClassName="p-0"
      >
        <div className="w-full overflow-x-auto">
          <TableComponent
            columns={columns1}
            columnsShow={columnsShow1}
            tableData={tableData1}
            setTableData={setTableData1}
            constraints={constraints1}
            disabledProp={flageData}
            AddBtn={!flageData}
            AddBtnText="Add Technology"
          />
        </div>
      </SectionCard>

      {/* 3. Languages Proficiency */}
      <SectionCard
        title="Languages Proficiency"
        icon={<Languages size={18} />}
        bodyClassName="p-0"
      >
        <div className="w-full overflow-x-auto">
          <TableComponent
            columns={columns2}
            columnsShow={columnsShow2}
            tableData={tableData2}
            setTableData={setTableData2}
            constraints={constraints2}
            disabledProp={flageData}
            AddBtn={!flageData}
            AddBtnText="Add Language"
          />
        </div>
      </SectionCard>
    </div>
  );
};

export default Education;
