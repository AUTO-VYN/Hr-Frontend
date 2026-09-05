"use client";

import React from "react";
import Swal from "sweetalert2";
import { useToast } from "@/app/hooks/useToast";
import { useFormData } from "./Context/FormDataContext";
import CertificatesUpload, { UploadItem } from "@/components/atoms/CertificateUpload";
import {
  // IdCard,
  CreditCard,
  FileText,
  Landmark,
  GraduationCap,
  Briefcase,
  // MapPinHouse,
  FileType2,
} from "lucide-react";

function showSideAlert(message: any, type: any) {
  const Toast = Swal.mixin({
    toast: true,
    position: "bottom-end",
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

const Docupload = () => {
  const { formData, setFormData } = useFormData();
  const { toast } = useToast();

  const getFileOrNull = (key: string): File | null => {
    const v = formData?.EmpMst?.[key];
    return v instanceof File ? v : null;
  };

  // --- UI like screenshot: 2 sections (4 tiles each) ---
  const statutoryItems: UploadItem[] = [
    {
      name: "adhar",
      title: "Aadhaar image",
      subtitle: "Required · JPG/PNG",
      // icon: <IdCard size={18} />,
      accept: "image/png,image/jpeg,image/jpg",
    },
    {
      name: "pan",
      title: "PAN image",
      subtitle: "Required · JPG/PNG",
      icon: <CreditCard size={18} />,
      accept: "image/png,image/jpeg,image/jpg",
    },
    {
      name: "salary",
      title: "Salary slip",
      subtitle: "Last 3 months · PDF",
      icon: <FileText size={18} />,
      accept: "application/pdf",
    },
    {
      name: "other1",
      title: "Bank passbook / cheque",
      subtitle: "For account verify · JPG",
      icon: <Landmark size={18} />,
      accept: "image/png,image/jpeg,image/jpg",
    },
  ];

  const supportingItems: UploadItem[] = [
    {
      name: "other2",
      title: "Education certificate",
      subtitle: "Optional · PDF",
      icon: <GraduationCap size={18} />,
      accept: "application/pdf",
    },
    {
      name: "other3",
      title: "Experience letter",
      subtitle: "Optional · PDF",
      icon: <Briefcase size={18} />,
      accept: "application/pdf",
    },
    {
      name: "other4",
      title: "Address proof",
      subtitle: "Optional · PDF",
      // icon: <MapPinHouse size={18} />,
      accept: "application/pdf",
    },
    {
      name: "otherpdf",
      title: "Other PDF document",
      subtitle: "Optional · PDF",
      icon: <FileType2 size={18} />,
      accept: "application/pdf",
    },
  ];

  return (
    <div className="w-full grid gap-6">
      {/* STATUTORY DOCUMENTS */}
      <CertificatesUpload
        headerTitle="STATUTORY DOCUMENTS"
        items={statutoryItems}
        value={{
          adhar: getFileOrNull("adhar"),
          pan: getFileOrNull("pan"),
          salary: getFileOrNull("salary"),
          other1: getFileOrNull("other1"),
        }}
        onChange={(next) => {
          // ✅ same functionality: file EmpMst me set
          setFormData((prev: any) => ({
            ...prev,
            EmpMst: {
              ...prev.EmpMst,
              ...next,
            },
          }));
        }}
      />

      {/* SUPPORTING DOCUMENTS */}
      <CertificatesUpload
        headerTitle="SUPPORTING DOCUMENTS"
        items={supportingItems}
        value={{
          other2: getFileOrNull("other2"),
          other3: getFileOrNull("other3"),
          other4: getFileOrNull("other4"),
          otherpdf: getFileOrNull("otherpdf"),
        }}
        onChange={(next) => {
          // ✅ same functionality: file EmpMst me set
          setFormData((prev: any) => ({
            ...prev,
            EmpMst: {
              ...prev.EmpMst,
              ...next,
            },
          }));
        }}
      />
    </div>
  );
};

export default Docupload;