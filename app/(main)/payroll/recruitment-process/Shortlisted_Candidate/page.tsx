"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import axios from "axios";
import Swal from "sweetalert2";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import HashloaderComponent from "@/components/Templates/hashloader";
import { useFormData } from "./Context/FormDataContext";
import { useSearchParams, useRouter } from "next/navigation";
import AButton from "@/components/atoms/Button";
import CandidateMiniHeader from "./CandidateMiniHeader";
import Docupload from "./DocUpload";
import InterviewProcess from "./InterviewProcess";
import Page1 from "./Page1";
import Page2 from "./Page2";
import WorkDetails from "./WorkDetails";
import Education from "./Education";
import References from "./References";
import Others from "./Others";
import { ArrowLeft, ArrowRight, CheckCircle, RotateCcw } from "lucide-react";
import { Button } from "antd";

function ShortlistedCandidateContent() {
  const router = useRouter();

  function showSideAlert(message: any, type: any) {
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
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

  const user = useCurrentUser();
  const { formData, setFormData } = useFormData();
  const [isLoading, setIsLoading] = useState(false);
  const [cityoption, setCityoption] = useState([]);
  const [divisionoption, setDivisionoption] = useState([]);
  const [EMPLOYEEDESIGNATIONoption, setEMPLOYEEDESIGNATIONoption] = useState([]);
  const [Empshiftoption, setEmpshiftoption] = useState([]);
  const [locationnoption, setlocationnoption] = useState([]);
  const [SECTIONoption, setSECTIONoption] = useState([]);
  const [STATEoption, setSTATEoption] = useState([]);
  const [SalRegionoption, setSalRegionoption] = useState([]);
  const [evaluationCriteria, setEvaluationCriteria] = useState([]);
  const [Source, setSource] = useState([]);

  const GenderOption = [
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
  ];

  const MrOption = [
    { value: "MR.", label: "Mr" },
    { value: "Mrs.", label: "Mrs." },
    { value: "Miss.", label: "Miss." },
    { value: "Dr.", label: "Dr." },
    { value: "Prof.", label: "Prof." },
  ];

  const Type = [
    { value: "Regular", label: "Regular" },
    { value: "Casual", label: "Casual" },
  ];

  const [imageSrc1, setImageSrc1] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const searchParams = useSearchParams();
  const flag = searchParams.get("flag");
  const [flageData, setflageDataData] = useState<boolean>(false);

  useEffect(() => {
    if (flag === "true") {
      setflageDataData(false);
    } else {
      setflageDataData(true);
    }
  }, [flag]);

  const v1 = searchParams.get("v1");
  let dataa = "";
  try {
    dataa = atob(v1 || "");
    if (!v1 || v1 === "") {
      dataa = "{}";
    }
  } catch (e) {
    dataa = "{}";
  }
  const decodedParams = JSON.parse(dataa);
  const compcode = decodedParams.comp_code || searchParams.get("comp_code");
  const tran_id = decodedParams.TRAN_ID || searchParams.get("tran_id");

  useEffect(() => {
    setFormData((prevData) => ({
      ...prevData,
      compcode: compcode,
    }));
  }, [compcode, setFormData]);

  useEffect(() => {
    const fetchData1 = async () => {
      setIsLoading(true);
      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/interview/findMasters`,
          {},
          {
            headers: {
              compcode: compcode ? compcode : (user as any)?.Comp_Code,
            },
          }
        );
        const masters = response.data.data;
        setCityoption(masters.CITY || []);
        setDivisionoption(masters.DIVISION || []);
        setEMPLOYEEDESIGNATIONoption(masters.EMPLOYEEDESIGNATION || []);
        setEmpshiftoption(masters.EMP_SHIFT || []);
        setlocationnoption(masters.LOCATION || []);
        setSECTIONoption(masters.SECTION || []);
        setSTATEoption(masters.STATE || []);
        setSalRegionoption(masters.Sal_Region || []);
        setSource(masters.sources || []);
        setEvaluationCriteria(masters.EvaluationCriteria || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData1();
  }, [compcode, (user as any)?.Comp_Code]);

  const handleFileChange = (event: any) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageFile(file);
        setImageSrc1(e.target?.result);
      };
      reader.readAsDataURL(file);
    } else {
      setImageSrc1(null);
      setImageFile(null);
    }
  };

  const handleInputChange = (name: any, value: any) => {
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/getcandidata`,
        {
          tran_id: tran_id ? tran_id : formData.TRAN_ID,
        },
        {
          headers: {
            compcode: compcode ? compcode : (user as any)?.Comp_Code,
          },
        }
      );

      setFormData((prevData) => ({
        ...prevData,
        ...response.data.intrstatus,
        images: response.data.images || [],
      }));
      setFormData((prevData) => ({
        ...prevData,
        ...response.data.data,
      }));
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error fetching candidate data",
      });
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (formData.TRAN_ID || tran_id) {
      fetchData();
    }
  }, [formData.TRAN_ID, tran_id]);

  const handleEmpUpdate = async () => {
    if (!formData.TITLE) {
      showSideAlert("TITLE is mandatory. Please fill it out", "warning");
      return;
    }
    if (!formData.EMPFIRSTNAME) {
      showSideAlert("NAME is mandatory. Please fill it out", "warning");
      return;
    }
    if (!formData.LOCATION) {
      showSideAlert("LOCATION is mandatory. Please fill it out", "warning");
      return;
    }
    if (!formData.EMPLOYEEDESIGNATION) {
      showSideAlert("Designation is mandatory. Please fill it out", "warning");
      return;
    }
    if (!formData.Sal_Region) {
      showSideAlert("Region is mandatory. Please fill it out", "warning");
      return;
    }
    setIsLoading(true);
    try {
      const formData2 = new FormData();
      formData2.append("tran_id", formData.TRAN_ID);
      formData2.append("username", (user as any)?.name);
      formData2.append("formData", JSON.stringify(formData));

      if (imageFile) {
        formData2.append("ProfileImage", imageFile);
      }

      if (formData?.ImgSourseArray) {
        formData.ImgSourseArray.forEach((file: any, index: number) => {
          if (file) {
            const fieldName = [
              null,
              "UpdateCV",
              "AadharCard",
              "PANCard",
              "SalarySlip",
              "ExperienceLetter",
            ][index];
            if (fieldName) {
              formData2.append(fieldName, file);
            }
          }
        });
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/empupdate`,
        formData2,
        {
          headers: {
            compcode: (user as any)?.Comp_Code,
            name: (user as any)?.name,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      if (response?.data?.title === "error") {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Data is not updated",
        });
      } else {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Data updated successfully",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error updating data",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Sections navigation matching Employee_Master
  const SECTIONS = useMemo(
    () => [
      {
        key: "doc",
        label: "Doc Upload",
        desc: "Upload candidate documents (CV, Aadhaar, PAN, Salary slip, Experience letter).",
      },
      {
        key: "interview",
        label: "Interview Process",
        desc: "Multi-stage candidate interview assessments, reschedule and ratings.",
      },
      {
        key: "basic",
        label: "Basic Info",
        desc: "Candidate basic joining details, statutory identity and verification.",
      },
      {
        key: "personal",
        label: "Personal Info",
        desc: "Personal identification details, permanent and present addresses.",
      },
      {
        key: "work",
        label: "Work Details",
        desc: "Previous employment experience, responsibilities and drawn salary.",
      },
      {
        key: "education",
        label: "Education / Skills",
        desc: "Academic qualifications, IT tools/technology and language proficiencies.",
      },
      {
        key: "references",
        label: "References",
        desc: "Professional references, family members and nominated beneficiaries.",
      },
      {
        key: "others",
        label: "Others",
        desc: "Previous company details, medical, statutory questions and emergency contacts.",
      },
    ],
    []
  );

  const [activeSection, setActiveSection] = useState<string>("doc");
  const activeIndex = SECTIONS.findIndex((s) => s.key === activeSection);
  const activeMeta = SECTIONS[activeIndex] || SECTIONS[0];

  const goPrevSection = () => {
    if (activeIndex > 0) {
      setActiveSection(SECTIONS[activeIndex - 1].key);
    }
  };

  const goNextSection = () => {
    if (activeIndex < SECTIONS.length - 1) {
      setActiveSection(SECTIONS[activeIndex + 1].key);
    }
  };

  return (
    <div className="min-h-full w-full flex flex-col bg-[#F6F7FB] dark:bg-black pb-20">
      {/* ===== TOP MAIN HEADER (Matching Employee_Master style) ===== */}
      <header className="w-full shrink-0 border-b border-[#E6E8EF] dark:border-[#2A2F3A] bg-[#F6F7FB] dark:bg-black">
        <div className="w-full min-h-[56px] py-2.5 px-3 sm:px-6 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Brand / Title + Back Button */}
          <div className="flex items-center gap-3 min-w-0">
            <AButton
              variant="outline"
              size="sm"
              onClick={() => window.history.back()}
              className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </AButton>

            <div className="flex items-center gap-2.5">
              {/* <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center">
                <Image
                  src="/Payrollicon/Shortlisted_Candidate.png"
                  alt="Candidate"
                  width={20}
                  height={20}
                />
              </div> */}
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                Candidate Information
              </h1>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <AButton
              variant="outline"
              size="sm"
              onClick={() => window.history.back()}
              className="h-9 px-3.5 rounded-xl border-slate-200 dark:border-slate-700"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Discard
            </AButton>

            <AButton
              variant="primary"
              size="sm"
              disabled={Boolean(tran_id && compcode)}
              onClick={handleEmpUpdate}
              className="h-9 px-4 rounded-xl bg-[#4338CA] hover:bg-[#3730a3] text-white shadow-xs"
            >
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Update
            </AButton>
          </div>
        </div>
      </header>

      {/* ===== BODY CONTENT WRAPPER ===== */}
      <div className={`${isLoading ? "blur-[2px] pointer-events-none select-none" : ""}`}>
        {/* ===== TOP MINI HEADER ===== */}
        <CandidateMiniHeader
          formData={formData}
          handleInputChange={handleInputChange}
          imageSrc1={imageSrc1}
          handleFileChange={handleFileChange}
          flageData={flageData}
          options={{
            MrOption,
            GenderOption,
            Type,
            locationnoption,
            EMPLOYEEDESIGNATIONoption,
            divisionoption,
            SECTIONoption,
            SalRegionoption,
            Source,
          }}
        />

        {/* ===== LOWER LAYOUT: SIDEBAR + CONTENT (Matching Employee_Master) ===== */}
        <div className="px-3 sm:px-6 py-4">
          <div className="grid grid-cols-12 gap-5">
            {/* Sidebar */}
            <aside className="col-span-12 lg:col-span-3 xl:col-span-3 min-w-0">
              <div className="w-full bg-white dark:bg-black border border-[#E6E8EF] dark:border-[#2A2F3A] rounded-2xl p-4 shadow-xs">
                <div className="text-xs font-medium tracking-wider text-[#667085] dark:text-[#A0A7B4] uppercase px-2 py-1">
                  SECTIONS
                </div>

                <div className="mt-3 space-y-2">
                  {SECTIONS.map((sec, idx) => {
                    const active = sec.key === activeSection;

                    return (
                      <button
                        key={sec.key}
                        type="button"
                        onClick={() => setActiveSection(sec.key)}
                        className={`w-full flex items-center gap-3.5 rounded-xl border px-3.5 py-2.5 text-left transition cursor-pointer ${
                          active
                            ? "bg-[#E0E7FF] border-[#1E40AF] dark:bg-[#0B1220] dark:border-[#1E40AF]"
                            : "bg-transparent border-transparent hover:bg-[#F2F4F7] hover:border-[#D0D5DD] dark:hover:bg-[#0B1220] dark:hover:border-[#2A2F3A]"
                        }`}
                      >
                        <div
                          className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium border shrink-0 ${
                            active
                              ? "border-[#1E40AF] text-[#1E40AF] bg-white dark:bg-black"
                              : "border-[#D0D5DD] dark:border-[#2A2F3A] text-[#475467] dark:text-[#A0A7B4]"
                          }`}
                        >
                          {idx + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div
                            className={`text-sm truncate ${
                              active
                                ? "text-[#1E40AF] font-medium"
                                : "text-[#475467] dark:text-[#A0A7B4] font-normal"
                            }`}
                          >
                            {sec.label}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* Content Area */}
            <main className="col-span-12 lg:col-span-9 xl:col-span-9 min-w-0">
              {/* Section Header with Next/Prev Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 gap-3 border-b border-[#E6E8EF] dark:border-[#2A2F3A] mb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#101828] dark:text-white">
                    {activeMeta.label}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#667085] dark:text-[#A0A7B4] mt-0.5">
                    {activeMeta.desc}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <AButton
                    variant="outline"
                    size="sm"
                    onClick={goPrevSection}
                    disabled={activeIndex <= 0}
                    className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 gap-1.5"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                  </AButton>

                  <AButton
                    variant="primary"
                    size="sm"
                    onClick={goNextSection}
                    disabled={activeIndex >= SECTIONS.length - 1}
                    className="h-9 px-3.5 rounded-xl bg-[#4338CA] hover:bg-[#3730a3] text-white gap-1.5"
                  >
                    Save & next
                    <ArrowRight className="h-4 w-4" />
                  </AButton>
                </div>
              </div>

              {/* Active Section Content */}
              <div className="w-full">
                {activeSection === "doc" && <Docupload flag={flag} />}
                {activeSection === "interview" && (
                  <InterviewProcess
                    flag={flag}
                    evaluationCriteria={evaluationCriteria}
                  />
                )}
                {activeSection === "basic" && <Page1 flag={flag} />}
                {activeSection === "personal" && (
                  <Page2
                    cityoption={cityoption}
                    STATEoption={STATEoption}
                    flag={flag}
                  />
                )}
                {activeSection === "work" && <WorkDetails flag={flag} />}
                {activeSection === "education" && <Education flag={flag} />}
                {activeSection === "references" && <References flag={flag} />}
                {activeSection === "others" && (
                  <Others
                    cityoption={cityoption}
                    branch={locationnoption}
                    flag={flag}
                  />
                )}
              </div>
            </main>
          </div>
        </div>
      </div>

      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Candidate Profile...</div>}>
      <ShortlistedCandidateContent />
    </Suspense>
  );
}
