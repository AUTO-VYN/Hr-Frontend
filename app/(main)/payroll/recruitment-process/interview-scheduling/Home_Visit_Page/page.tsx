"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import Image from "next/image";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  FileText,
  Home,
  Save,
  Trash2,
  Users,
  Video,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import Einput from "@/components/atoms/Einput";
import SelectSearch from "@/components/atoms/Select";
import ATextArea from "@/components/atoms/textArea";
import { Button } from "@/components/ui/button";
import HashloaderComponent from "@/components/Templates/hashloader";
import FileViewer from "@/components/atoms/FileviewerBank";

interface HomeVisitProps {
  initialData?: any;
  onSaveSuccess?: () => void;
  onCancel?: () => void;
}

export default function HomeVisitVerification({
  initialData,
  onSaveSuccess,
  onCancel,
}: HomeVisitProps = {}) {
  const user = useCurrentUser();
  const router = useRouter();

  const [formData1, setFormData1] = useState<any>(initialData || {});
  const [empName, setEmpName] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});

  function getCurrentDate(monthsBack = 0) {
    const today = new Date();
    today.setMonth(today.getMonth() - monthsBack);
    const year = today.getFullYear();
    let month: any = today.getMonth() + 1;
    let day: any = today.getDate();
    if (month < 10) month = "0" + month;
    if (day < 10) day = "0" + day;
    return `${year}-${month}-${day}`;
  }

  const [currentDate] = useState(getCurrentDate());

  useEffect(() => {
    if (initialData) {
      setFormData1((prev: any) => ({
        ...prev,
        ...initialData,
      }));
    }
  }, [initialData]);

  useEffect(() => {
    setFormData1((prevState: any) => ({
      ...prevState,
      CURRENTJOINDATE: currentDate,
    }));
  }, [currentDate]);

  const handleInputChange = (name: string, value: any) => {
    setFormData1((prevState: any) => ({
      ...prevState,
      [name]: value,
    }));
  };

  useEffect(() => {
    fetchDataEmpName();
  }, [user]);

  const fetchDataEmpName = async () => {
    const compCode =
      user?.Comp_Code || (user as any)?.compcode || (user as any)?.company_code || "";
    if (!compCode) return;
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/allemployee`,
        {},
        {
          headers: {
            compcode: compCode,
            name: user?.name,
          },
        }
      );
      setEmpName(response.data?.data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const YESNOOPTION = [
    { value: "1", label: "YES" },
    { value: "2", label: "NO" },
  ];

  const VISITTYPEOPTION = [
    { value: "1", label: "Video Home Visit" },
    { value: "2", label: "Physical Home Visit" },
  ];

  const fbackgroundOPTION = [
    { value: "1", label: "Middle Class" },
    { value: "2", label: "Lower Class" },
    { value: "3", label: "Upper Class" },
  ];

  const HOUSEOPTION = [
    { value: "1", label: "OWN" },
    { value: "2", label: "RENTED" },
  ];

  const uploadFields = [
    { key: "imageFile7", label: "Home Front / Exterior", icon: Camera, accept: "image/*" },
    { key: "imageFile8", label: "Living Area / Interior", icon: Camera, accept: "image/*" },
    { key: "imageFile9", label: "Family / Neighborhood", icon: Camera, accept: "image/*" },
    { key: "VideoFile1", label: "Home Visit Video", icon: Video, accept: "video/*" },
  ];

  const handleFileChange = (event: any, type: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/") || file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const previewUrl = e.target?.result as string;
        setFilePreviews((prev) => ({
          ...prev,
          [type]: previewUrl,
        }));
        setFormData1((prev: any) => ({
          ...prev,
          [type]: file,
        }));
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("video/")) {
      const previewUrl = URL.createObjectURL(file);
      setFilePreviews((prev) => ({
        ...prev,
        [type]: previewUrl,
      }));
      setFormData1((prev: any) => ({
        ...prev,
        [type]: file,
      }));
    }
  };

  const removeFile = (type: string) => {
    setFilePreviews((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
    setFormData1((prev: any) => ({
      ...prev,
      [type]: null,
    }));
  };

  const handleEmpUpdate = async () => {
    const compCode =
      user?.Comp_Code || (user as any)?.compcode || (user as any)?.company_code || "";
    setIsLoading(true);

    try {
      const formData2 = new FormData();
      formData2.append("tran_id", formData1?.TRAN_ID || "");
      formData2.append("username", user?.name || "");
      formData2.append("formData", JSON.stringify(formData1));

      uploadFields.forEach(({ key }) => {
        if (formData1[key]) {
          formData2.append(key, formData1[key]);
        }
      });

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/empupdateHomeVer`,
        formData2,
        {
          headers: {
            compcode: compCode,
            name: user?.name,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response?.data?.title === "error") {
        Swal.fire({
          icon: "error",
          title: "Update Failed",
          text: response?.data?.message || "Data not updated",
          confirmButtonColor: "#4F46E5",
        });
      } else {
        Swal.fire({
          icon: "success",
          title: "Saved Successfully",
          text: "Home visit verification details updated successfully",
          timer: 2000,
          showConfirmButton: false,
        });
        if (onSaveSuccess) {
          onSaveSuccess();
        } else {
          router.push("/autovyn/payroll/Recruitment_Process/Shortlisted_Applications");
        }
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "An error occurred while uploading verification data",
        confirmButtonColor: "#4F46E5",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const SRNO_MAP: Record<number, string> = {
    15: "imageFile7",
    16: "imageFile8",
    17: "imageFile9",
    18: "VideoFile1",
  };

  useEffect(() => {
    if (!formData1?.IMAGES?.length) return;

    const updatedFiles: any = {};
    const updatedPreviews: any = {};

    formData1.IMAGES.forEach((doc: any) => {
      const fieldName = SRNO_MAP[doc.SRNO];
      if (!fieldName) return;

      const fileUrl = `${process.env.NEXT_PUBLIC_imagepath}/${doc.path}`;
      updatedFiles[fieldName] = fileUrl;
      updatedPreviews[fieldName] = fileUrl;
    });

    setFormData1((prev: any) => ({
      ...prev,
      ...updatedFiles,
    }));

    setFilePreviews((prev) => ({
      ...prev,
      ...updatedPreviews,
    }));
  }, [formData1?.IMAGES]);

  const handleBack = () => {
    if (onCancel) {
      onCancel();
    } else {
      window.history.back();
    }
  };

  const labelStyle = "!text-[13px] sm:!text-[14px] !font-medium !text-slate-700 dark:!text-slate-300 !tracking-normal";

  return (
    <div className="w-full bg-[#F8FAFC] dark:bg-[#0A0F1C] text-slate-900 dark:text-slate-100 p-2 sm:p-4 font-sans rounded-2xl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
                  Home Visit Verification
                </h1>
                {formData1?.FULL_NAME && (
                  <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900">
                    {formData1.FULL_NAME}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                Record verification findings, family background, and attach proof photos/videos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              onClick={handleEmpUpdate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Verification
            </button>
          </div>
        </div>

        {/* Section 1: Household & Family Parameters */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-[15px] sm:text-[16px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Verification & Household Details
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            <div>
              <SelectSearch
                options={YESNOOPTION}
                title="Visit Status"
                name="VisitStatus"
                selectedValue={formData1?.VisitStatus?.toString() || null}
                handleInputChange={handleInputChange}
                labelClass={labelStyle}
              />
            </div>

            <div>
              <SelectSearch
                options={VISITTYPEOPTION}
                title="Visit Type"
                name="VisitType"
                selectedValue={formData1?.VisitType?.toString() || null}
                handleInputChange={handleInputChange}
                labelClass={labelStyle}
              />
            </div>

            <div>
              <SelectSearch
                options={fbackgroundOPTION}
                title="Family Background"
                name="fbackground"
                selectedValue={formData1?.fbackground?.toString() || null}
                handleInputChange={handleInputChange}
                labelClass={labelStyle}
              />
            </div>

            <div>
              <SelectSearch
                options={HOUSEOPTION}
                title="House Ownership"
                name="IsHouse"
                selectedValue={formData1?.IsHouse?.toString() || null}
                handleInputChange={handleInputChange}
                labelClass={labelStyle}
              />
            </div>

            <div>
              <SelectSearch
                options={YESNOOPTION}
                title="Having Car In Family"
                name="IsCar"
                selectedValue={formData1?.IsCar?.toString() || null}
                handleInputChange={handleInputChange}
                labelClass={labelStyle}
              />
            </div>

            <div>
              <Einput
                type="text"
                title="Family Members Count / Details"
                name="FMember"
                value={formData1?.FMember || ""}
                handleInputChange={handleInputChange}
                placeholder="e.g. 4 Members"
                className="!h-10 !text-sm sm:!text-[14.5px] !font-normal"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Detailed Observations & Remarks */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-[15px] sm:text-[16px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Observations & Detailed Remarks
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <ATextArea
                rows={3}
                title="Father / Husband Occupation"
                name="Foccupation"
                value={formData1?.Foccupation || ""}
                handleInputChange={handleInputChange}
                placeholder="Enter occupation details..."
                className="!text-lg sm:!text-lg !font-normal"
              />
            </div>

            <div>
              <ATextArea
                rows={3}
                title="Financial Condition"
                name="FCondition"
                value={formData1?.FCondition || ""}
                handleInputChange={handleInputChange}
                placeholder="Enter financial observations..."
                className="!text-sm sm:!text-[14.5px] !font-normal"
              />
            </div>

            <div className="md:col-span-2">
              <ATextArea
                rows={3}
                title="Overall Conclusion & Verification Recommendation"
                name="conclusion"
                value={formData1?.conclusion || ""}
                handleInputChange={handleInputChange}
                placeholder="Enter final home visit verification conclusion..."
                className="!text-sm sm:!text-[14.5px] !font-normal"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Media & Attachments */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Camera className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-[15px] sm:text-[16px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Photo & Video Evidence
              </h2>
            </div>
            <span className="text-xs sm:text-sm text-slate-500 font-normal">
              Max 3 images + 1 video
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {uploadFields.map((field, index) => {
              const fileData = formData1?.[field.key];
              const previewSrc = filePreviews[field.key] || fileData;
              const hasFile = Boolean(previewSrc);
              const isVideo =
                field.key === "VideoFile1" ||
                fileData?.type?.startsWith("video/") ||
                (typeof previewSrc === "string" &&
                  previewSrc.match(/\.(mp4|webm|ogg)$/i));
              const isPdf =
                typeof previewSrc === "string" && previewSrc.includes("pdf");

              return (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 p-4 flex flex-col justify-between space-y-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13.5px] sm:text-[14.5px] font-medium text-slate-700 dark:text-slate-200">
                      {field.label}
                    </span>
                    {hasFile && (
                      <button
                        type="button"
                        onClick={() => removeFile(field.key)}
                        className="text-rose-500 hover:text-rose-600 transition p-1 cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="relative w-full h-40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden group">
                    {hasFile ? (
                      isVideo ? (
                        <video
                          src={previewSrc}
                          controls
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : isPdf ? (
                        <iframe
                          src={previewSrc}
                          className="w-full h-full rounded-xl"
                        />
                      ) : (
                        <Image
                          src={previewSrc}
                          alt={field.label}
                          fill
                          className="object-cover rounded-xl"
                        />
                      )
                    ) : (
                      <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-3 text-center">
                        <field.icon className="w-7 h-7 sm:w-8 h-8 text-slate-400 group-hover:text-indigo-600 transition mb-1.5" />
                        <span className="text-sm sm:text-[14.5px] font-medium text-slate-600 dark:text-slate-300 group-hover:text-indigo-600">
                          Upload {field.key === "VideoFile1" ? "Video" : "Photo"}
                        </span>
                        <span className="text-xs sm:text-[13px] text-slate-400 font-normal mt-0.5">Click to select</span>
                        <input
                          type="file"
                          name={field.key}
                          accept={field.accept}
                          className="hidden"
                          onChange={(e) => handleFileChange(e, field.key)}
                        />
                      </label>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    {hasFile ? (
                      <>
                        <label className="flex-1 text-center py-2 px-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-xl text-xs sm:text-sm font-medium cursor-pointer transition">
                          Change
                          <input
                            type="file"
                            name={field.key}
                            accept={field.accept}
                            className="hidden"
                            onChange={(e) => handleFileChange(e, field.key)}
                          />
                        </label>
                        <FileViewer
                          fileLink={previewSrc}
                          celldata=""
                          Title={field.label}
                        />
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 font-normal italic">No file selected</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-end gap-3.5 pt-2">
          <Button
            variant="outline"
            onClick={handleBack}
            className="h-11 px-6 rounded-xl text-sm sm:text-base font-medium cursor-pointer"
          >
            Cancel / Back
          </Button>
          <Button
            variant="default"
            onClick={handleEmpUpdate}
            className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm sm:text-base font-medium shadow-sm cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Save Verification Data
          </Button>
        </div>
      </div>

      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
