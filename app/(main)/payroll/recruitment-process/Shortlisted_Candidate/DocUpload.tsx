"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useFormData } from "./Context/FormDataContext";
import CertificatesUpload, { UploadItem } from "@/components/atoms/CertificateUpload";
import { FileText, CreditCard, Briefcase, ExternalLink } from "lucide-react";

type Props = {
  flag?: string | null;
};

export default function Docupload({ flag }: Props) {
  const [flageData, setflageDataData] = useState<boolean>(false);

  useEffect(() => {
    if (flag === "true") {
      setflageDataData(false);
    } else {
      setflageDataData(true);
    }
  }, [flag]);

  const { formData, setFormData } = useFormData();

  // Index mapping to field keys:
  // index 1: UpdateCV
  // index 2: AadharCard
  // index 3: PANCard
  // index 4: SalarySlip
  // index 5: ExperienceLetter
  const keyMap: Record<string, number> = {
    UpdateCV: 1,
    AadharCard: 2,
    PANCard: 3,
    SalarySlip: 4,
    ExperienceLetter: 5,
  };

  const [filesValue, setFilesValue] = useState<Record<string, File | null>>({
    UpdateCV: null,
    AadharCard: null,
    PANCard: null,
    SalarySlip: null,
    ExperienceLetter: null,
  });

  // Keep existing backend image URLs
  const existingFiles = useMemo(() => {
    const urls: Record<string, string | null> = {
      UpdateCV: null,
      AadharCard: null,
      PANCard: null,
      SalarySlip: null,
      ExperienceLetter: null,
    };

    if (formData?.images && Array.isArray(formData.images)) {
      formData.images.forEach((img: any, idx: number) => {
        const filePath = img?.path || img?.File_Name;
        if (filePath) {
          const url = `https://erp.autovyn.com/backend/fetch?filePath=${filePath}`;
          if (idx === 1) urls.UpdateCV = url;
          if (idx === 2) urls.AadharCard = url;
          if (idx === 3) urls.PANCard = url;
          if (idx === 4) urls.SalarySlip = url;
          if (idx === 5) urls.ExperienceLetter = url;
        }
      });
    }
    return urls;
  }, [formData?.images]);

  const uploadItems: UploadItem[] = [
    {
      name: "UpdateCV",
      title: "Updated CV / Resume",
      subtitle: "Optional · PDF",
      icon: <FileText size={18} />,
      accept: "application/pdf",
    },
    {
      name: "AadharCard",
      title: "Aadhaar Card",
      subtitle: "JPG / PNG / PDF",
      icon: <FileText size={18} />,
      accept: "image/png,image/jpeg,image/jpg,application/pdf",
    },
    {
      name: "PANCard",
      title: "PAN Card",
      subtitle: "JPG / PNG / PDF",
      icon: <CreditCard size={18} />,
      accept: "image/png,image/jpeg,image/jpg,application/pdf",
    },
    {
      name: "SalarySlip",
      title: "Salary Slip",
      subtitle: "Last 3 months · PDF / JPG",
      icon: <FileText size={18} />,
      accept: "image/png,image/jpeg,image/jpg,application/pdf",
    },
    {
      name: "ExperienceLetter",
      title: "Experience Letter",
      subtitle: "Optional · PDF",
      icon: <Briefcase size={18} />,
      accept: "application/pdf",
    },
  ];

  const handleCertificatesChange = (next: Record<string, File | null>) => {
    setFilesValue(next);

    const imageFilesArray: (File | null)[] = Array(6).fill(null);
    Object.entries(next).forEach(([k, file]) => {
      const idx = keyMap[k];
      if (idx !== undefined) {
        imageFilesArray[idx] = file;
      }
    });

    setFormData((prev: any) => ({
      ...prev,
      ImgSourseArray: imageFilesArray,
    }));
  };

  return (
    <div className="w-full space-y-6">
      <CertificatesUpload
        headerTitle="CANDIDATE DOCUMENTS"
        items={uploadItems}
        value={filesValue}
        onChange={handleCertificatesChange}
        disabled={flageData}
        gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
      />

      {/* Existing documents view bar if any exist */}
      {Object.values(existingFiles).some(Boolean) && (
        <div className="bg-white dark:bg-black border border-[#E6E8EF] dark:border-[#2A2F3A] rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-[#667085] dark:text-[#A0A7B4] mb-3">
            Previously Uploaded Documents
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(existingFiles).map(([key, url]) => {
              if (!url) return null;
              const label =
                uploadItems.find((item) => item.name === key)?.title || key;
              return (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition"
                >
                  <ExternalLink size={14} />
                  <span>View {label}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
