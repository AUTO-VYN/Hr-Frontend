"use client";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import axios from "axios";
import React, { forwardRef, useEffect, useState } from "react";
import { useFormData } from "./Context/FormDataContext";
import Image from "next/image";

const HindiPrintout = forwardRef<HTMLDivElement, any>((props, ref) => {
  const user = useCurrentUser() as any;
  const [company, setCompany] = useState<any>({});
  const [democarfatch, setDemocarfatch] = useState<any>({});
  const [age, setAge] = useState<number | string | null>(null);
  const { formData1: ctxFormData } = useFormData();
  const formData1 = props?.formData1 || ctxFormData || {};
  const [empName, setEmpName] = useState<any[]>([]);
  const [Marutilogo, setMarutilogo] = useState<string | undefined>();

  const ratingMap: Record<string, string> = {
    "1": "1 - Poor",
    "2": "2 - Fair",
    "3": "3 - Average",
    "4": "4 - Good",
    "5": "5 - Excellent",
  };

  const buildEvaluationTable = (data: any[] = []) => {
    const rows: Record<string, any> = {};
    if (Array.isArray(data)) {
      data.forEach((item) => {
        const criteria = item?.Nominee_Name;
        const interviewer = item?.Member_Name; // 1,2,3,4
        const rating = ratingMap[item?.Is_Minor] || "";
        if (criteria) {
          if (!rows[criteria]) {
            rows[criteria] = {
              criteria,
              i1: "",
              i2: "",
              i3: "",
              i4: "",
            };
          }
          if (interviewer === "1") rows[criteria].i1 = rating;
          if (interviewer === "2") rows[criteria].i2 = rating;
          if (interviewer === "3") rows[criteria].i3 = rating;
          if (interviewer === "4") rows[criteria].i4 = rating;
        }
      });
    }
    return Object.values(rows);
  };

  const evaluationRows = buildEvaluationTable(formData1?.EvaluationCriteria);

  const getCompCode = () => {
    return (
      user?.Comp_Code ||
      user?.compcode ||
      user?.comp_code ||
      user?.COMP_CODE ||
      user?.company_code ||
      user?.DB ||
      ""
    );
  };

  useEffect(() => {
    const compCode = getCompCode();
    if (!compCode) return;
    fetchDataEmpName();
    printapi();
  }, [user]);

  const fetchDataEmpName = async () => {
    const compCode = getCompCode();
    if (!compCode) return;
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/allemployee`,
        { compcode: compCode },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "",
          },
        }
      );
      if (response.data?.data) {
        setEmpName(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  function getLabelByValue(targetValue: any) {
    if (!targetValue) return "";
    const foundObject = empName.find(
      (item) => String(item.value ?? item.EMPCODE) === String(targetValue)
    );
    return foundObject ? (foundObject.label ?? foundObject.EMPNAME) : "";
  }

  const calculateAge = (dob: any) => {
    if (!dob) return "";
    try {
      const parts = String(dob).split("-");
      let birthDate: Date;
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          birthDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        } else {
          birthDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
      } else {
        birthDate = new Date(dob);
      }
      if (isNaN(birthDate.getTime())) return "";
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      return calculatedAge;
    } catch {
      return "";
    }
  };

  useEffect(() => {
    if (formData1?.DOB1) {
      const ageValue = calculateAge(formData1.DOB1);
      setAge(ageValue);
    }
  }, [formData1?.DOB1]);

  const CATEGORYS = (categoryValue: any) => {
    switch (categoryValue?.toString()?.trim()) {
      case "1":
        return "सामान्य";
      case "2":
        return "अन्य पिछड़ा वर्ग";
      case "3":
        return "अनुसूचित जाति";
      case "4":
        return "अनुसूचित जनजाति";
      default:
        return categoryValue || "Unknown";
    }
  };

  const DRIVE = formData1?.DRIVE?.toString()?.trim();

  const printapi = async () => {
    const compCode = getCompCode();
    if (!compCode) return;
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/PrintHeader`,
        {
          multi_loc: user?.branch || "",
          compcode: compCode,
        },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "",
          },
        }
      );
      if (result?.data) {
        setMarutilogo(result.data.MarutilogoImg);
        if (result.data.company && result.data.company[0]) {
          setCompany(result.data.company[0]);
        }
        if (result.data.DemoCarFetch && result.data.DemoCarFetch[0]) {
          setDemocarfatch(result.data.DemoCarFetch[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching print header:", error);
    }
  };

  function calculateDateDifference(empFromDate: any, empToDate: any) {
    if (!empFromDate || !empToDate) return "";
    try {
      const fromDate = new Date(empFromDate);
      const toDate = new Date(empToDate);
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return "";
      let years = toDate.getFullYear() - fromDate.getFullYear();
      let months = toDate.getMonth() - fromDate.getMonth();
      let days = toDate.getDate() - fromDate.getDate();
      if (days < 0) {
        months--;
        days += new Date(toDate.getFullYear(), toDate.getMonth(), 0).getDate();
      }
      if (months < 0) {
        years--;
        months += 12;
      }
      const parts = [];
      if (years > 0) parts.push(`${years} years`);
      if (months > 0) parts.push(`${months} months`);
      if (days > 0) parts.push(`${days} days`);
      return parts.length > 0 ? parts.join(" ") : "0 days";
    } catch {
      return "";
    }
  }

  function processEmployeeDates(employeeExperiences: any[] = []) {
    if (!Array.isArray(employeeExperiences)) return [];
    return employeeExperiences.map((employee) => {
      const { Emp_From_Date, Emp_To_Date } = employee || {};
      const diff = calculateDateDifference(Emp_From_Date, Emp_To_Date);
      return {
        ...employee,
        DateDifference: diff,
      };
    });
  }

  const employeeExperiences = formData1?.EmpExperience;
  const updatedEmployeeExperiences = processEmployeeDates(employeeExperiences);

  const padArray = (array: any[] = [], length: number) => {
    if (!Array.isArray(array)) {
      return Array(length).fill({});
    }
    return [...array, ...Array(Math.max(0, length - array.length)).fill({})];
  };

  const rows = padArray(updatedEmployeeExperiences, 10);

  const tableRows = [
    {
      label: "इंटरव्यू लेने वाले का नाम:",
      i1: getLabelByValue(formData1?.INTR1BY),
      i2: getLabelByValue(formData1?.INTR2BY),
      i3: getLabelByValue(formData1?.INTR3BY),
      i4: getLabelByValue(formData1?.INTR4BY),
    },
    {
      label: "टिप्पणी:",
      i1: formData1?.INTR1REMARK || "",
      i2: formData1?.INTR2REMARK || "",
      i3: formData1?.INTR3REMARK || "",
      i4: formData1?.INTR4REMARK || "",
    },
    {
      label: "औसत दर्ज़ा",
      i1: formData1?.INTR1RATING || "",
      i2: formData1?.INTR2RATING || "",
      i3: formData1?.INTR3RATING || "",
      i4: formData1?.INTR4RATING || "",
    },
    ...evaluationRows.map((r: any) => ({
      label: r.criteria,
      i1: r.i1,
      i2: r.i2,
      i3: r.i3,
      i4: r.i4,
    })),
  ];

  return (
    <div
      ref={ref}
      className="w-full h-full overflow-y-auto custom-scrollbar p-2 sm:p-4 bg-white text-black select-text"
    >
      <div className="grid grid-cols-12 max-w-[900px] mx-auto">
        {/* ================= PAGE 1 ================= */}
        <div className="min-h-[1060px] border-4 border-black p-2 col-span-12 mt-2 ml-2 mr-2 bg-white print:break-after-page break-after-page">
          <div className="grid grid-cols-12">
            <div className="col-span-2">
              <Image
                src={
                  company?.Comp_Logo
                    ? `${process.env.NEXT_PUBLIC_imagepath}${company?.Comp_Logo}`
                    : "/logo.png"
                }
                alt="company logo"
                className="h-16 w-full object-contain"
                width={500}
                height={64}
              />
            </div>
            <div className="col-span-6">
              <p className="text-b600 uppercase text-center font-bold text-xl">
                {company?.spl_rem || ""}
              </p>
              <p className="text-blue-600 uppercase mt-1 font-semibold pl-2 text-center text-[15px]">
                A Unit Of {company?.Comp_Name}
              </p>
              <p className="font-bold mt-1 text-center">{company?.Right_Head1}</p>
            </div>
            <div className="col-span-4">
              <div className="font-bold text-b600 text-end uppercase text-base flex justify-end">
                <img
                  src={Marutilogo || "/maruti.png"}
                  alt="Company Logo"
                  className="h-10 w-auto object-contain"
                  onError={(e: any) => (e.target.style.display = "none")}
                />
              </div>
              <div className="bg-blue-100 border border-blue-500 mt-2 text-blue-700 px-2 rounded relative ml-14">
                <span className="flex items-center mt-1 justify-center text-[12px] font-medium">
                  For office Use
                </span>
                <p className="font-medium mt-1 mb-2 text-[12px]">Serial No. : </p>
              </div>
            </div>
            <div className="col-span-12 mt-2 bg-black text-white font-semibold px-6 max-h-32 text-base">
              {company?.Godw_Add1} {company?.Godw_Add2}
            </div>
          </div>

          <div className="grid grid-cols-12 justify-center">
            <div className="col-span-9">
              <div className="grid grid-cols-12">
                <div className="col-span-6 text-[14px] font-medium">
                  फॉर्म संख्या: {formData1?.TRAN_ID}
                </div>
                <div className="col-span-6 text-[14px] font-medium">
                  दिनांक: {formData1?.APPLICATION_DATE1}
                </div>
              </div>
              <div className="col-span-12 text-[14px] font-medium">
                आवेदन किया गया पद: {formData1?.DESIGNATION}
              </div>
              <div className="col-span-12 mt-2 bg-black text-white uppercase px-6 text-lg font-semibold">
                व्यक्तिगत जानकारी
              </div>
              <div className="grid grid-cols-12 mt-2">
                <div className="col-span-7 mt-4">
                  <div className="grid grid-cols-12">
                    <div className="col-span-12 text-[14px] font-medium">
                      आवेदक का नाम: {formData1?.NAME}
                    </div>
                  </div>
                </div>
                <div className="col-span-5 flex justify-end ml-4">
                  <div className="bg-blue-100 border border-blue-500 text-blue-700 px-4 rounded relative w-44">
                    <span className="flex items-center justify-center font-medium">
                      कार्यालय उपयोग हेतु
                    </span>
                    <p className="font-medium">संदर्भ................</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-3 ml-2 mr-2 mt-1">
              <div className="bg-blue-100 border border-blue-500 text-blue-700 rounded relative w-40 h-40 overflow-hidden flex items-center justify-center">
                <img
                  src={`https://erp.autovyn.com/backend/fetch?filePath=${
                    formData1?.IMAGES ? formData1?.IMAGES[0]?.path : ""
                  }`}
                  alt="candidate photo"
                  className="h-40 p-1 w-40 object-cover"
                  onError={(e: any) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 -mt-4">
            <div className="col-span-12 font-medium text-[14px] mt-2 flex">
              पिता का नाम/पति का नाम:
              <p className="underline ml-2">{formData1?.FATHERS_NAME}</p>
            </div>
            <div className="col-span-12 font-medium mt-2 text-[14px] flex">
              शहर:
              <p className="underline ml-2">{formData1?.CITY1}</p>
            </div>
            <div className="col-span-12 font-medium mt-1 text-[14px] flex">
              पता:
              <p className="underline ml-2">{formData1?.ADDRESS}</p>
            </div>
            <div className="col-span-6 font-medium mt-1 text-[14px] flex">
              पिनकोड:
              <p className="underline ml-2">{formData1?.PINCODE}</p>
            </div>
            <div className="col-span-6 font-medium mt-1 text-[14px] flex">
              लिंग:
              <p className="underline ml-2">{formData1?.GENDER}</p>
            </div>
            <div className="col-span-6 font-medium mt-1 text-[14px] flex">
              संपर्क नंबर:
              <p className="underline ml-2">{formData1?.MOB_NO}</p>
            </div>
            <div className="col-span-6 font-medium mt-1 text-[14px]">आपातकालीन नंबर</div>
            <div className="col-span-6 font-medium mt-1 text-[14px]">
              जन्मतिथि: {formData1?.DOB1}
            </div>
            <div className="col-span-6 font-medium mt-1 text-[14px]">
              {formData1?.Emgy_No} : {formData1?.Emgy_Mob_No}
            </div>
            <div className="col-span-6 font-medium mt-1 text-[14px] flex">
              ईमेल:
              <p className="underline ml-2">{formData1?.EMAIL} </p>
            </div>
            <div className="col-span-6 font-medium mt-1 text-[14px]">
              आयु: {age !== null ? age : ""}
            </div>
            <div className="col-span-6 font-medium mt-1 text-[14px]">
              विवाह की तारीख: {formData1?.DOM}{" "}
            </div>
            <div className="col-span-6 font-medium mt-1 text-[14px] flex">
              श्रेणी:
              <p className="underline ml-2"> {CATEGORYS(formData1?.CATEGORY)}</p>
            </div>
            <div className="col-span-6 font-medium mt-1 text-[14px] flex">
              उपजाति:
              <p className="underline ml-2">{formData1?.CASTE}</p>
            </div>
            <div className="col-span-6 font-medium text-[12px]">
              ड्राइविंग कौशल:
              <div className="flex flex-col mt-1">
                <label>
                  <input
                    type="checkbox"
                    value="टू व्हीलर"
                    className="text-[12px]"
                    checked={DRIVE === "2"}
                    readOnly
                  />{" "}
                  टू व्हीलर
                </label>
                <label>
                  <input
                    type="checkbox"
                    value="फोर व्हीलर"
                    className="text-[12px]"
                    checked={DRIVE === "4"}
                    readOnly
                  />{" "}
                  फोर व्हीलर
                </label>
                <label>
                  <input
                    type="checkbox"
                    value="टू व्हीलर और फोर व्हीलर"
                    className="text-[12px]"
                    checked={DRIVE === "1"}
                    readOnly
                  />{" "}
                  टू व्हीलर और फोर व्हीलर
                </label>
              </div>
            </div>
            <div className="col-span-6 font-medium mt-1 text-[14px] flex">
              उच्चतम योग्यता:
              <p className="underline ml-2"> {formData1?.HIGH_QUAL}</p>
            </div>
          </div>

          <div className="col-span-12 mt-1">
            <div className="grid grid-cols-12">
              <div className="col-span-12 bg-black text-white font-semibold px-6 text-lg uppercase">
                शैक्षणिक योग्यता
              </div>
              <div className="col-span-12 font-bold text-lg">
                <table className="table-auto w-full border border-black">
                  <thead>
                    <tr>
                      <th className="border border-black text-[14px] whitespace-nowrap px-1 py-1">
                        कक्षा
                      </th>
                      <th className="border border-black text-[14px] whitespace-nowrap px-1 py-1">
                        बोर्ड / विश्वविद्यालय
                      </th>
                      <th className="border border-black text-[14px] whitespace-nowrap">
                        स्कूल / कॉलेज
                      </th>
                      <th className="border border-black text-[14px] whitespace-nowrap px-1 py-1">
                        उत्तीर्ण वर्ष
                      </th>
                      <th className="border border-black text-[14px] whitespace-nowrap px-1 py-1">
                        प्रतिशत
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData1?.EmpEdu &&
                      formData1?.EmpEdu.map((item: any, index: any) => (
                        <tr key={index}>
                          <td className="border border-black text-[14px] px-1 py-1">
                            {item.Emp_Degree}
                          </td>
                          <td className="border border-black text-[14px] px-1 py-1">
                            {item.Emp_Board}
                          </td>
                          <td className="border border-black text-[14px] px-1 py-1">
                            {item.Emp_College}
                          </td>
                          <td className="border border-black text-[14px] px-1 py-1">
                            {item.Emp_Passing_year}
                          </td>
                          <td className="border border-black text-[14px] px-1 py-1">
                            {item.Emp_Percentage}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ================= PAGE 2 ================= */}
        <div className="col-span-12 print:break-after-page break-after-page">
          <div className="min-h-[1035px] border-4 border-black p-2 col-span-12 mt-6 ml-2 mr-2 bg-white">
            <div className="col-span-12 mt-4 font-semibold bg-black text-white text-start text-lg uppercase px-2">
              व्यवसायिक अनुभव
            </div>
            <div className="grid grid-cols-12">
              <div className="border-t border-l border-b border-black text-[14px] font-bold px-2 py-1 col-span-3">
                कंपनी का नाम
              </div>
              <div className="border-t border-l border-b border-black text-[14px] font-bold px-2 py-1 col-span-4 text-center">
                नौकरी का प्रोफ़ाइल
              </div>
              <div className="border-t border-l border-b border-black text-[14px] font-bold px-2 py-1 col-span-3">
                कंपनी छोड़ने का कारण
              </div>
              <div className="border-t border-l border-b border-r border-black text-[14px] font-bold px-2 py-1 col-span-2">
                वेतन
              </div>
              {rows.map((item: any, index: number) => (
                <React.Fragment key={index}>
                  <div className="border-l border-b border-black text-[14px] px-2 col-span-3 break-words pt-1">
                    <span className="font-semibold">{`${index + 1})`}</span>
                    <span className="ml-2">{item?.Emp_Company || ""}</span>
                  </div>
                  <div className="border-l border-b border-black text-[14px] px-3 py-2 col-span-4">
                    <p className="mt-1">
                      <span className="font-semibold">पद: </span>
                      <span>{item?.Emp_Designation || ""}</span>
                    </p>
                    <p>
                      <span className="font-semibold">कार्य: </span>
                      <span>{item?.Emp_Responsibility || ""}</span>
                    </p>
                    <p>
                      <span className="font-semibold">अवधि: </span>
                      <span>{item?.DateDifference}</span>
                    </p>
                  </div>
                  <div className="border-l border-b border-black text-[14px] pt-1 px-2 col-span-3 break-words">
                    {item?.Emp_Leaving_Reason || ""}
                  </div>
                  <div className="border-l border-r border-b border-black text-[14px] pt-1 px-2 col-span-2">
                    {item?.Emp_Drawn_Salary != null
                      ? Number(item?.Emp_Drawn_Salary).toFixed(2)
                      : ""}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* ================= PAGE 3 ================= */}
        <div className="min-h-[1000px] col-span-12 mt-6 ml-2 mr-2 p-2 border-4 border-black bg-white print:break-after-page break-after-page">
          <div className="col-span-12">
            <div className="grid grid-cols-12">
              <div className="border-t border-l border-black text-[14px] font-bold px-2 mt-2 col-span-2 text-center"></div>
              <div className="border-t border-l border-black text-[14px] font-bold px-2 mt-2 col-span-2 text-center">
                1
              </div>
              <div className="border-t border-l border-black text-[14px] font-bold px-2 mt-2 col-span-2 text-center">
                2
              </div>
              <div className="border-t border-l border-black text-[14px] font-bold px-2 mt-2 col-span-2 text-center">
                3
              </div>
              <div className="border-t border-l border-black text-[14px] font-bold px-2 mt-2 col-span-2 text-center">
                4
              </div>
              <div className="border-t border-l border-r border-black text-[14px] font-bold px-2 mt-2 col-span-2 text-center">
                5
              </div>
              <div className="border-t border-l border-black text-[14px] py-0.5 font-bold px-2 col-span-2">
                जीएम/मालिक का नाम
              </div>
              <div className="border-t border-l border-black text-[14px] py-0.5 px-2 col-span-2 break-words">
                {""}
              </div>
              <div className="border-t border-l border-black text-[14px] py-0.5 px-2 col-span-2 break-words">
                {""}
              </div>
              <div className="border-t border-l border-black text-[14px] py-0.5 px-2 col-span-2 break-words">
                {""}
              </div>
              <div className="border-t border-l border-black text-[14px] py-0.5 px-2 col-span-2 break-words">
                {""}
              </div>
              <div className="border-t border-l border-r border-black text-[14px] py-0.5 px-2 col-span-2 break-words">
                {""}
              </div>
              <div className="border-t border-l border-b border-black text-[14px] py-0.5 font-bold px-2 col-span-2">
                संपर्क नंबर
              </div>
              <div className="border-t border-l border-b border-black text-[14px] py-0.5 px-2 col-span-2 break-words"></div>
              <div className="border-t border-l border-b border-black text-[14px] py-0.5 px-2 col-span-2 break-words"></div>
              <div className="border-t border-l border-b border-black text-[14px] py-0.5 px-2 col-span-2 break-words"></div>
              <div className="border-t border-l border-b border-black text-[14px] py-0.5 px-2 col-span-2 break-words"></div>
              <div className="border-t border-l border-r border-b border-black text-[14px] py-0.5 px-2 col-span-2 break-words"></div>
            </div>
          </div>

          <div className="col-span-12">
            <div className="grid grid-cols-12">
              <div className="border-t border-l border-black text-[14px] font-bold px-2 mt-2 col-span-2 text-center"></div>
              <div className="border-t border-l border-black text-[14px] font-bold px-2 mt-2 col-span-2 text-center">
                6
              </div>
              <div className="border-t border-l border-black text-[14px] font-bold px-2 mt-2 col-span-2 text-center">
                7
              </div>
              <div className="border-t border-l border-black text-[14px] font-bold px-2 mt-2 col-span-2 text-center">
                8
              </div>
              <div className="border-t border-l border-black text-[14px] font-bold px-2 mt-2 col-span-2 text-center">
                9
              </div>
              <div className="border-t border-l border-r border-black text-[14px] font-bold px-2 mt-2 col-span-2 text-center">
                10
              </div>
              <div className="border-t border-l border-black text-[14px] py-0.5 font-bold px-2 col-span-2">
                जीएम/मालिक का नाम
              </div>
              <div className="border-t border-l border-black text-[14px] py-0.5 px-2 col-span-2 break-words">
                {""}
              </div>
              <div className="border-t border-l border-black text-[14px] py-0.5 px-2 col-span-2 break-words">
                {""}
              </div>
              <div className="border-t border-l border-black text-[14px] py-0.5 px-2 col-span-2 break-words">
                {""}
              </div>
              <div className="border-t border-l border-black text-[14px] py-0.5 px-2 col-span-2 break-words">
                {""}
              </div>
              <div className="border-t border-l border-r border-black text-[14px] py-0.5 px-2 col-span-2 break-words">
                {""}
              </div>
              <div className="border-t border-l border-b border-black text-[14px] py-0.5 font-bold px-2 col-span-2">
                संपर्क नंबर
              </div>
              <div className="border-t border-l border-b border-black text-[14px] py-0.5 px-2 col-span-2 break-words"></div>
              <div className="border-t border-l border-b border-black text-[14px] py-0.5 px-2 col-span-2 break-words"></div>
              <div className="border-t border-l border-b border-black text-[14px] py-0.5 px-2 col-span-2 break-words"></div>
              <div className="border-t border-l border-b border-black text-[14px] py-0.5 px-2 col-span-2 break-words"></div>
              <div className="border-t border-l border-r border-b border-black text-[14px] py-0.5 px-2 col-span-2 break-words"></div>
            </div>
          </div>

          <div className="col-span-12 font-semibold mt-4 px-6 bg-black text-white text-lg uppercase">
            परिवार का पृष्ठभूमि
          </div>
          <div className="col-span-12 font-bold text-lg">
            <table className="table-auto w-full border border-black">
              <thead>
                <tr>
                  <th className="border border-black text-[14px] w-20 font-bold px-1 py-1">
                    रिश्ता
                  </th>
                  <th className="border border-black text-[14px] w-28 font-bold px-1 py-1">नाम</th>
                  <th className="border border-black text-[14px] font-bold px-1 py-1">योग्यता</th>
                  <th className="border border-black text-[14px] font-bold px-1 py-1">व्यवसाय</th>
                  <th className="border border-black text-[14px] font-bold px-1 py-1">विभाग</th>
                </tr>
              </thead>
              <tbody>
                {formData1?.EmpNominee &&
                  formData1?.EmpNominee.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="border border-gray-300 text-[14px] px-4">{item.Relation}</td>
                      <td className="border border-gray-300 text-[14px] text-center">
                        {item.Nominee_Name}
                      </td>
                      <td className="border border-gray-300 text-[14px] text-center">
                        {item.Member_Name}
                      </td>
                      <td className="border border-gray-300 text-[14px] text-center">
                        {item.Percentage}
                      </td>
                      <td className="border border-gray-300 text-[14px] text-center">
                        {item.Is_Minor}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="col-span-12 bg-black text-white font-semibold px-6 text-lg uppercase mt-4">
            भाषा / कंप्यूटर ज्ञान
          </div>
          <div className="col-span-12">
            <table className="table-auto w-full border border-black">
              <thead>
                <tr>
                  <th className="border border-gray-300 text-sm p-2">भाषा</th>
                  <th className="border border-gray-300 text-sm p-2">बोलना</th>
                  <th className="border border-gray-300 text-sm p-2">पढ़ना</th>
                  <th className="border border-gray-300 text-sm p-2">लिखना</th>
                  <th className="border border-gray-300 text-sm p-2">कंप्यूटर</th>
                </tr>
              </thead>
              <tbody>
                {formData1?.EmpLang &&
                  formData1?.EmpLang.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="border border-gray-300 text-[14px] px-4">
                        {item.Emp_Language}
                      </td>
                      <td className="border border-gray-300 text-[14px] text-center">
                        {item.Emp_Language_Understand}
                      </td>
                      <td className="border border-gray-300 text-[14px] text-center">
                        {item.Emp_Language_Speak}
                      </td>
                      <td className="border border-gray-300 text-[14px] text-center">
                        {item.Emp_Language_Read}
                      </td>
                      <td className="border border-gray-300 text-[14px] text-center">
                        {item.Emp_Language_Write}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ================= PAGE 4 ================= */}
        <div className="min-h-[1000px] col-span-12 mt-6 ml-2 mr-2 p-2 border-4 border-black bg-white print:break-after-page break-after-page">
          <div className="col-span-12 mt-2">
            <div className="bg-blue-100 border border-blue-500 text-blue-700 px-3 py-3 rounded relative w-full">
              <div className="grid grid-cols-12 gap-y-2">
                <div className="col-span-6 text-[14px] font-medium flex gap-x-1">
                  <p>किसी भी प्रकार की बीमारी / विकलांगता: </p>
                  <label>
                    <input type="checkbox" value="yes" className="text-[12px]" readOnly /> YES
                  </label>
                  <label>
                    <input type="checkbox" value="no" className="text-[12px]" readOnly /> NO
                  </label>
                </div>
                <div className="col-span-6 text-[14px] font-medium flex gap-x-1">
                  <p>किसी भी कानूनी मामला: </p>
                  <label>
                    <input type="checkbox" value="yes" className="text-[12px]" readOnly /> YES
                  </label>
                  <label>
                    <input type="checkbox" value="no" className="text-[12px]" readOnly /> NO
                  </label>
                </div>
                <div className="col-span-12 my-1">
                  <hr className="border-blue-400" />
                </div>
                <div className="col-span-12 text-[14px] mt-1 font-medium flex gap-x-1">
                  <p>हमारी कंपनी के वर्तमान / पूर्व कर्मचारी के साथ कोई संबंध: </p>
                  <label>
                    <input type="checkbox" value="yes" className="text-[12px]" readOnly /> YES
                  </label>
                  <label>
                    <input type="checkbox" value="no" className="text-[12px]" readOnly /> NO
                  </label>
                </div>
                <div className="col-span-12 text-[14px] mt-1 font-medium">
                  <p>अगर हाँ, तो कृपया नाम, संबंध और संपर्क नंबर बताएं: </p>
                </div>
                <div className="col-span-4 text-[14px] mt-1 font-medium">
                  <p>अपेक्षित वेतन: </p>
                </div>
                <div className="col-span-8 text-[14px] mt-1 font-medium">
                  <p>जुड़ने के लिए आवश्यक समय: तुरंत / 07 दिन / 15 दिन / 01 महीना</p>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 px-6 font-semibold text-lg bg-black text-white uppercase mt-4">
            संदर्भ: व्यक्तिगत सरकारी / व्यावसायिक एवं पेशेवर
          </div>
          <div className="col-span-12">
            <table className="table-auto w-full border border-black">
              <thead>
                <tr>
                  <th className="border border-black text-[14px] font-bold px-2 py-1">नाम</th>
                  <th className="border border-black text-[14px] font-bold px-2 py-1">व्यवसाय</th>
                  <th className="border border-black text-[14px] font-bold px-2 py-1">
                    पूर्ण पता और संपर्क नंबर
                  </th>
                  <th className="border border-black text-[14px] font-bold px-2 py-1">रिश्ता</th>
                </tr>
              </thead>
              <tbody>
                {["1", "2"].map((action, index) => (
                  <tr key={index}>
                    <td className="border border-black text-center px-2 py-1">{action}</td>
                    <td className="border border-black text-[14px] px-2 py-1"></td>
                    <td className="border border-black text-[14px] px-2 py-1"></td>
                    <td className="border border-black text-[14px] px-2 py-1"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="col-span-12 mt-4">
            <div className="bg-blue-100 border border-blue-500 text-blue-700 px-3 py-2 relative w-full">
              <div className="grid grid-cols-12">
                <div className="col-span-12 font-medium flex">
                  <p className="ml-1">
                    पूर्ण विवरण भरना अनिवार्य है। (किसी भी स्पष्टीकरण के लिए, कृपया एचआर/रिसेप्शन
                    से संपर्क करें।)
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 px-6 font-semibold text-lg bg-black text-white uppercase mt-4">
            घोषणा
          </div>
          <div className="col-span-12">
            <div className="bg-blue-100 border border-blue-500 text-blue-700 px-3 py-2 relative w-full">
              <div className="grid grid-cols-12">
                <div className="col-span-12 font-medium">
                  <p className="text-[16px]">
                    मैं यह घोषणा करता/करती हूँ कि मेरी आवेदन पत्र में दी गई सभी जानकारी मेरी जानकारी
                    और विश्वास के अनुसार सत्य और पूर्ण है।
                  </p>
                </div>
                <div className="col-span-6 mt-14 font-medium">
                  <p>तारीख</p>
                </div>
                <div className="col-span-6 font-medium mt-14">
                  <p>हस्ताक्षर</p>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 mt-4">
            <div className="bg-blue-100 border border-blue-500 text-blue-700 rounded-b relative w-full h-auto">
              <div className="grid grid-cols-12">
                <div className="col-span-12 font-medium">
                  <p className="uppercase flex justify-center mt-2 text-base font-bold">
                    केवल कार्यालय के उपयोग के लिए
                  </p>
                </div>
                <div className="col-span-12 pl-2 font-medium mt-1">
                  <p>बॉंड और सुरक्षा के लिए तैयार: </p>
                </div>
                <div className="col-span-12 mt-4 border border-blue-300 w-full"></div>
                <div className="col-span-6 font-medium h-auto">
                  <p className="flex justify-center uppercase text-base font-bold mt-2">
                    कंप्यूटर परीक्षण
                  </p>
                  <p className="pl-2">परीक्षा ली गई:</p>
                  <p className="pl-2 mt-2">टिप्पणियाँ:</p>
                  <div className="p-1">
                    <table className="table-auto w-full mt-1 border border-blue-300 text-xs">
                      <tbody>
                        <tr>
                          <td className="border border-blue-300 px-1 text-center">1</td>
                          <td className="border border-blue-300 px-4 py-1.5 font-medium">
                            बुनियादी एक्सेल (10 में से अंक)
                          </td>
                          <td className="border border-blue-300 px-3"></td>
                        </tr>
                        <tr>
                          <td className="border border-blue-300 px-1 text-center">2</td>
                          <td className="border border-blue-300 px-4 py-1">एडवांस एक्सेल</td>
                          <td className="border border-blue-300 px-3"></td>
                        </tr>
                        <tr>
                          <td className="border border-blue-300 px-1 text-center">3</td>
                          <td className="border border-blue-300 px-4 py-1">Vlookup</td>
                          <td className="border border-blue-300 px-3"></td>
                        </tr>
                        <tr>
                          <td className="border border-blue-300 px-1 text-center">4</td>
                          <td className="border border-blue-300 px-4 py-1">कंडीशनल फॉर्मेटिंग</td>
                          <td className="border border-blue-300 px-3"></td>
                        </tr>
                        <tr>
                          <td className="border border-blue-300 px-1 text-center">5</td>
                          <td className="border border-blue-300 px-4 py-1">पिवट टेबल</td>
                          <td className="border border-blue-300 px-3"></td>
                        </tr>
                        <tr>
                          <td className="border border-blue-300 px-1 text-center">6</td>
                          <td className="border border-blue-300 px-4 py-1">डुप्लिकेट हटाना</td>
                          <td className="border border-blue-300 px-3"></td>
                        </tr>
                        <tr>
                          <td className="border border-blue-300 px-1 text-center">7</td>
                          <td className="border border-blue-300 px-4 py-1">फिल्टर और शॉर्ट</td>
                          <td className="border border-blue-300 px-3"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="col-span-6 font-medium h-auto border-l border-blue-300">
                  <p className="flex justify-center uppercase text-base font-bold mt-2">
                    ड्राइविंग परीक्षण
                  </p>
                  <p className="pl-2">परीक्षा ली गई:</p>
                  <p className="pl-2 mt-2">टिप्पणियाँ:</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= PAGE 5 ================= */}
        <div className="min-h-[1000px] col-span-12 mt-10 ml-2 mr-2 p-2 border-4 border-black bg-white">
          <div className="col-span-12 mt-6">
            <table className="w-full border-collapse border border-black text-sm">
              <thead>
                <tr className="font-bold text-center bg-gray-50">
                  <th className="border border-black p-2">Field / Criteria</th>
                  <th className="border border-black p-2">पहले चरण का इंटरव्यू:</th>
                  <th className="border border-black p-2">दूसरे चरण का इंटरव्यू:</th>
                  <th className="border border-black p-2">तीसरे चरण का इंटरव्यू:</th>
                  <th className="border border-black p-2">चौथे चरण का इंटरव्यू:</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, idx) => (
                  <tr key={idx}>
                    <td className="border border-black p-2 font-semibold">{row.label}</td>
                    <td className="border border-black p-2 text-center">{row.i1}</td>
                    <td className="border border-black p-2 text-center">{row.i2}</td>
                    <td className="border border-black p-2 text-center">{row.i3}</td>
                    <td className="border border-black p-2 text-center">{row.i4}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ================= FINAL DETAILS ================= */}
          <div className="col-span-12 grid grid-cols-2 gap-4 mt-8 text-sm">
            <div>
              <span className="font-bold">पद : </span>
            </div>
            <div>
              <span className="font-bold">विभाग: </span>
            </div>
            <div>
              <span className="font-bold">जॉइनिंग स्थान: </span>
            </div>
            <div>
              <span className="font-bold">वेतन: </span>
            </div>
          </div>

          {/* ================= STATUS ================= */}
          <div className="col-span-12 grid grid-cols-12 mt-8 text-sm">
            <div className="col-span-2 font-bold">स्थिति:</div>
            <div className="col-span-10 font-semibold">
              S (चुनें) / P (लंबित) / NS (चयनित नहीं) / BGC (जमानतदाता सत्यापन)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

HindiPrintout.displayName = "HindiPrintout";

export default HindiPrintout;
