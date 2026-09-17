"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useFormData } from "./Context/FormDataContext";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import AButton from "@/components/atoms/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Award, CalendarClock, CheckCircle, Star } from "lucide-react";

const interviewStatus1 = [
  { value: "1", label: "Accepted" },
  { value: "2", label: "Next Interview Needed" },
  { value: "3", label: "Rejected" },
  { value: "4", label: "Hold" },
];
const interviewStatus2 = [
  { value: "1", label: "Accepted" },
  { value: "2", label: "Next Interview Needed" },
  { value: "3", label: "Rejected" },
  { value: "4", label: "Hold" },
];
const interviewStatus3 = [
  { value: "1", label: "Accepted" },
  { value: "2", label: "Next Interview Needed" },
  { value: "3", label: "Rejected" },
  { value: "4", label: "Hold" },
];
const interviewStatus4 = [
  { value: "1", label: "Accepted" },
  { value: "2", label: "Next Interview Needed" },
  { value: "3", label: "Rejected" },
  { value: "4", label: "Hold" },
];

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

const ratingOptions = [
  { value: "1", label: "1 - Poor" },
  { value: "2", label: "2 - Fair" },
  { value: "3", label: "3 - Average" },
  { value: "4", label: "4 - Good" },
  { value: "5", label: "5 - Excellent" },
];

type Props = {
  flag?: string | null;
  evaluationCriteria?: any[];
};

const InterviewProcess: React.FC<Props> = ({ flag, evaluationCriteria = [] }) => {
  const [flageData, setflageDataData] = useState<boolean>(false);
  const [rescheduleStage, setRescheduleStage] = useState<string | null>(null);

  useEffect(() => {
    if (flag === "true") {
      setflageDataData(true);
    } else {
      setflageDataData(false);
    }
  }, [flag]);

  const user = useCurrentUser();
  const { formData, setFormData } = useFormData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sumbittingData, setSumbittingData] = useState(false);
  const [isOpenRating, setIsOpenRating] = useState(false);
  const [ratings, setRatings] = useState<any[]>([]);

  const [ReschedulDisableStage1, setReschedulDisableStage1] = useState(false);
  const [ReschedulDisableStage2, setReschedulDisableStage2] = useState(false);
  const [ReschedulDisableStage3, setReschedulDisableStage3] = useState(false);
  const [ReschedulDisableStage4, setReschedulDisableStage4] = useState(false);

  const handleInputchange = (name: string, value: any) => {
    if (
      name === "INTR1RATING" ||
      name === "INTR2RATING" ||
      name === "INTR3RATING" ||
      name === "INTR4RATING"
    ) {
      if (Number(value) > 5) return;
      const value1 = String(value).replace(/[^0-9.]/g, "");
      const validValue =
        value1.split(".").length > 2
          ? value1.slice(0, value1.lastIndexOf("."))
          : value1;
      setFormData((prevState: any) => ({
        ...prevState,
        [name]: validValue,
      }));
      return;
    }
    if (
      name === "INTR1SALARY" ||
      name === "INTR2SALARY" ||
      name === "INTR3SALARY" ||
      name === "INTR4SALARY"
    ) {
      const value1 = String(value).replace(/[^0-9.]/g, "");
      const validValue =
        value1.split(".").length > 2
          ? value1.slice(0, value1.lastIndexOf("."))
          : value1;

      if (Number(validValue) >= 0 && Number(validValue) <= 1000000000) {
        setFormData((prevState: any) => ({
          ...prevState,
          [name]: validValue,
        }));
      }
      return;
    }
    setFormData((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getCurrentRatingField = () => {
    if (formData?.INTR4BY) return "INTR4RATING";
    if (formData?.INTR3BY) return "INTR3RATING";
    if (formData?.INTR2BY) return "INTR2RATING";
    if (formData?.INTR1BY) return "INTR1RATING";
    return null;
  };

  const handleRatingChange = (item: any, ratingValue: string) => {
    setRatings((prev) => {
      const existingIndex = prev.findIndex((r) => r.value === item.value);
      const newEntry = {
        value: item.value,
        label: item.label,
        abbr: item.abbr,
        rating: ratingValue,
      };

      let updated;
      if (existingIndex > -1) {
        updated = [...prev];
        updated[existingIndex] = newEntry;
      } else {
        updated = [...prev, newEntry];
      }

      const total = updated.reduce((sum, r) => sum + Number(r.rating || 0), 0);
      const avg = (total / updated.length).toFixed(2);

      const ratingField = getCurrentRatingField();
      if (ratingField) {
        setFormData((prevForm: any) => ({
          ...prevForm,
          [ratingField]: avg,
        }));
      }

      return updated;
    });
  };

  const calculateAverageRating = () => {
    if (!ratings.length) return "0.00";
    const total = ratings.reduce(
      (sum, r) => sum + Number(r.rating || 0),
      0
    );
    return (total / ratings.length).toFixed(2);
  };

  const SubmitData = async () => {
    try {
      if (formData.INT_STATUS === "99") {
        Swal.fire({
          icon: "info",
          title: "Wait",
          text: "This data is rejected.",
        });
        return;
      }

      if (formData?.CrtiriaVald === 1) {
        if (!ratings || ratings.length === 0) {
          showSideAlert("Please provide ratings before submitting.", "warning");
          return;
        }

        const missingRatingItems = (evaluationCriteria || []).filter(
          (c) => !ratings.find((r) => r.value === c.value && r.rating)
        );

        if (missingRatingItems.length > 0) {
          showSideAlert("Please provide ratings before submitting.", "warning");
          return;
        }
      }

      const dataToSend = {
        tran_id: formData.TRAN_ID,
        ratings: ratings,
        interviewData: [
          {
            status: formData.INTR1STATUS,
            rating: formData.INTR1RATING,
            remark: formData.INTR1REMARK,
            salary: formData.INTR1SALARY,
          },
          {
            status: formData.INTR2STATUS,
            rating: formData.INTR2RATING,
            remark: formData.INTR2REMARK,
            salary: formData.INTR2SALARY,
          },
          {
            status: formData.INTR3STATUS,
            rating: formData.INTR3RATING,
            remark: formData.INTR3REMARK,
            salary: formData.INTR3SALARY,
          },
          {
            status: formData.INTR4STATUS,
            rating: formData.INTR4RATING,
            remark: formData.INTR4REMARK,
            salary: formData.INTR4SALARY,
          },
        ],
      };

      await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/candidateresult`,
        dataToSend,
        {
          headers: {
            compcode: formData?.compcode ? formData?.compcode : (user as any)?.Comp_Code,
          },
        }
      );

      setIsOpenRating(false);
      setSumbittingData(true);
      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Interview Review saved successfully",
      });
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.Message ||
        error?.response?.data ||
        error?.message ||
        "Failed to save interview review. Please try again later.";

      Swal.fire({
        icon: "error",
        title: "Warning",
        text: errorMsg,
      });
    }
  };

  const handleRescheduleRemark = async () => {
    if (!rescheduleStage) return;

    const remark = formData?.RescheduleRemark;
    const RescheduleDate = formData?.RescheduleDate;
    const RescheduleTime = formData?.RescheduleTime;

    const reschedulePayload = {
      reschedule_status: true,
      remark: remark,
      RescheduleDate: RescheduleDate,
      RescheduleTime: RescheduleTime,
      TRAN_ID: formData?.TRAN_ID,
      HR_EMPCODE: (user as any)?.EMPCODE,
    };

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/${rescheduleStage}`,
        reschedulePayload,
        {
          headers: {
            compcode: formData?.compcode || (user as any)?.Comp_Code,
          },
        }
      );

      Swal.fire({
        icon: "success",
        title: "Rescheduled!",
        text: `Interview has been rescheduled successfully.`,
      });
      setReschedulDisableStage1(true);
      setReschedulDisableStage2(true);
      setReschedulDisableStage3(true);
      setReschedulDisableStage4(true);

      setIsDialogOpen(false);
      setFormData((prev: any) => ({
        ...prev,
        RescheduleRemark: "",
        RescheduleDate: null,
        RescheduleTime: null,
      }));
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: "Could not reschedule interview. Try again.",
      });
    }
  };

  const DialogDiasbled = () => {
    setIsDialogOpen(false);
    setFormData((prev: any) => ({
      ...prev,
      RescheduleRemark: "",
      RescheduleDate: "",
      RescheduleTime: "",
    }));
  };

  // Status calculation helpers
  const isStage1Disabled = ReschedulDisableStage1
    ? true
    : formData?.INTR2BY
      ? true
      : formData?.INTR1BY
        ? false
        : true;

  const isStage2Disabled = ReschedulDisableStage2
    ? true
    : formData?.INTR3BY
      ? true
      : formData?.INTR2BY
        ? false
        : true;

  const isStage3Disabled = ReschedulDisableStage3
    ? true
    : formData?.INTR4BY
      ? true
      : formData?.INTR3BY
        ? false
        : true;

  const isStage4Disabled = ReschedulDisableStage4
    ? true
    : formData?.INTR4BY
      ? false
      : true;

  return (
    <div className="w-full space-y-5">
      {/* Top Header Row for Interview Stage */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-white dark:bg-black border border-[#E6E8EF] dark:border-[#2A2F3A] rounded-2xl gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Award size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wide text-[#0F172A] dark:text-white uppercase">
              Interview Evaluation Stages
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Assess candidate performance across consecutive interview rounds.
            </p>
          </div>
        </div>

        <AButton
          variant="primary"
          size="sm"
          onClick={SubmitData}
          disabled={sumbittingData}
          className="h-9 px-4 rounded-xl bg-[#4338CA] hover:bg-[#3730a3] text-white self-end sm:self-auto"
        >
          <CheckCircle className="h-4 w-4 mr-1.5" />
          {sumbittingData ? "Review Submitted" : "Submit Review"}
        </AButton>
      </div>

      {/* 4 Stage Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* STAGE 1 */}
        <div className="bg-white dark:bg-black border border-[#E6E8EF] dark:border-[#2A2F3A] rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-[#F8FAFC] dark:bg-[#0B0F19] border-b border-[#E6E8EF] dark:border-[#2A2F3A]">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Stage 1
            </span>
            <AButton
              variant="outline"
              size="sm"
              onClick={() => {
                setRescheduleStage("Schedule1interview");
                setIsDialogOpen(true);
              }}
              disabled={isStage1Disabled}
              className="h-7 px-2.5 text-xs rounded-lg"
            >
              <CalendarClock size={13} className="mr-1" />
              ReSchedule
            </AButton>
          </div>

          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <Einput
                title="Stage 1 Remark"
                name="INTR1REMARK"
                maxLength={200}
                type="text"
                disabled={isStage1Disabled}
                value={formData.INTR1REMARK}
                handleInputChange={handleInputchange}
              />

              <Einput
                title="Offered / Expected Salary"
                name="INTR1SALARY"
                type="number"
                disabled={isStage1Disabled}
                value={formData.INTR1SALARY}
                handleInputChange={handleInputchange}
              />

              <Eselect
                initialValue={formData.INTR1STATUS?.toString()}
                option={interviewStatus1}
                title="Interview Status"
                name="INTR1STATUS"
                handleInputChange={handleInputchange}
                disabled={
                  formData?.INTR2BY
                    ? true
                    : formData?.INTR1BY
                      ? false
                      : true
                }
              />
            </div>

            <div className="pt-2">
              <AButton
                variant="subtle"
                size="sm"
                fullWidth
                onClick={() => setIsOpenRating(true)}
                disabled={isStage1Disabled}
                className="h-8 rounded-xl text-xs font-semibold"
              >
                <Star size={13} className="mr-1" />
                {formData.INTR1RATING
                  ? `Rating: ${formData.INTR1RATING} / 5`
                  : "+ Add Rating"}
              </AButton>
            </div>
          </div>
        </div>

        {/* STAGE 2 */}
        <div className="bg-white dark:bg-black border border-[#E6E8EF] dark:border-[#2A2F3A] rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-[#F8FAFC] dark:bg-[#0B0F19] border-b border-[#E6E8EF] dark:border-[#2A2F3A]">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Stage 2
            </span>
            <AButton
              variant="outline"
              size="sm"
              onClick={() => {
                setRescheduleStage("Schedule2interview");
                setIsDialogOpen(true);
              }}
              disabled={isStage2Disabled}
              className="h-7 px-2.5 text-xs rounded-lg"
            >
              <CalendarClock size={13} className="mr-1" />
              ReSchedule
            </AButton>
          </div>

          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <Einput
                title="Stage 2 Remark"
                name="INTR2REMARK"
                maxLength={200}
                type="text"
                disabled={isStage2Disabled}
                value={formData.INTR2REMARK}
                handleInputChange={handleInputchange}
              />

              <Einput
                title="Offered / Expected Salary"
                name="INTR2SALARY"
                type="number"
                disabled={isStage2Disabled}
                value={formData.INTR2SALARY}
                handleInputChange={handleInputchange}
              />

              <Eselect
                initialValue={formData.INTR2STATUS?.toString()}
                option={interviewStatus2}
                title="Interview Status"
                name="INTR2STATUS"
                handleInputChange={handleInputchange}
                disabled={isStage2Disabled}
              />
            </div>

            <div className="pt-2">
              <AButton
                variant="subtle"
                size="sm"
                fullWidth
                onClick={() => setIsOpenRating(true)}
                disabled={isStage2Disabled}
                className="h-8 rounded-xl text-xs font-semibold"
              >
                <Star size={13} className="mr-1" />
                {formData.INTR2RATING
                  ? `Rating: ${formData.INTR2RATING} / 5`
                  : "+ Add Rating"}
              </AButton>
            </div>
          </div>
        </div>

        {/* STAGE 3 */}
        <div className="bg-white dark:bg-black border border-[#E6E8EF] dark:border-[#2A2F3A] rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-[#F8FAFC] dark:bg-[#0B0F19] border-b border-[#E6E8EF] dark:border-[#2A2F3A]">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Stage 3
            </span>
            <AButton
              variant="outline"
              size="sm"
              onClick={() => {
                setRescheduleStage("Schedule3interview");
                setIsDialogOpen(true);
              }}
              disabled={isStage3Disabled}
              className="h-7 px-2.5 text-xs rounded-lg"
            >
              <CalendarClock size={13} className="mr-1" />
              ReSchedule
            </AButton>
          </div>

          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <Einput
                title="Stage 3 Remark"
                name="INTR3REMARK"
                maxLength={200}
                type="text"
                disabled={isStage3Disabled}
                value={formData.INTR3REMARK}
                handleInputChange={handleInputchange}
              />

              <Einput
                title="Offered / Expected Salary"
                name="INTR3SALARY"
                type="number"
                disabled={isStage3Disabled}
                value={formData.INTR3SALARY}
                handleInputChange={handleInputchange}
              />

              <Eselect
                initialValue={formData.INTR3STATUS?.toString()}
                option={interviewStatus3}
                title="Interview Status"
                name="INTR3STATUS"
                handleInputChange={handleInputchange}
                disabled={isStage3Disabled}
              />
            </div>

            <div className="pt-2">
              <AButton
                variant="subtle"
                size="sm"
                fullWidth
                onClick={() => setIsOpenRating(true)}
                disabled={isStage3Disabled}
                className="h-8 rounded-xl text-xs font-semibold"
              >
                <Star size={13} className="mr-1" />
                {formData.INTR3RATING
                  ? `Rating: ${formData.INTR3RATING} / 5`
                  : "+ Add Rating"}
              </AButton>
            </div>
          </div>
        </div>

        {/* STAGE 4 */}
        <div className="bg-white dark:bg-black border border-[#E6E8EF] dark:border-[#2A2F3A] rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-[#F8FAFC] dark:bg-[#0B0F19] border-b border-[#E6E8EF] dark:border-[#2A2F3A]">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Stage 4
            </span>
            <AButton
              variant="outline"
              size="sm"
              onClick={() => {
                setRescheduleStage("Schedule4interview");
                setIsDialogOpen(true);
              }}
              disabled={isStage4Disabled}
              className="h-7 px-2.5 text-xs rounded-lg"
            >
              <CalendarClock size={13} className="mr-1" />
              ReSchedule
            </AButton>
          </div>

          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <Einput
                title="Stage 4 Remark"
                name="INTR4REMARK"
                maxLength={200}
                type="text"
                disabled={isStage4Disabled}
                value={formData.INTR4REMARK}
                handleInputChange={handleInputchange}
              />

              <Einput
                title="Offered / Expected Salary"
                name="INTR4SALARY"
                type="number"
                disabled={isStage4Disabled}
                value={formData.INTR4SALARY}
                handleInputChange={handleInputchange}
              />

              <Eselect
                initialValue={formData.INTR4STATUS?.toString()}
                option={interviewStatus4}
                title="Interview Status"
                name="INTR4STATUS"
                handleInputChange={handleInputchange}
                disabled={isStage4Disabled}
              />
            </div>

            <div className="pt-2">
              <AButton
                variant="subtle"
                size="sm"
                fullWidth
                onClick={() => setIsOpenRating(true)}
                disabled={isStage4Disabled}
                className="h-8 rounded-xl text-xs font-semibold"
              >
                <Star size={13} className="mr-1" />
                {formData.INTR4RATING
                  ? `Rating: ${formData.INTR4RATING} / 5`
                  : "+ Add Rating"}
              </AButton>
            </div>
          </div>
        </div>
      </div>

      {/* Reschedule Dialog Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-full max-w-lg bg-white dark:bg-[#0B1220] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              ReSchedule Interview
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Provide the new date, time, and reason for rescheduling this interview round.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 mt-3">
            <div>
              <Einput
                type="text"
                title="Reason / Remark"
                name="RescheduleRemark"
                maxLength={200}
                value={formData?.RescheduleRemark}
                handleInputChange={handleInputchange}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Einput
                  title="Interview Date"
                  type="date"
                  name="RescheduleDate"
                  value={formData?.RescheduleDate}
                  handleInputChange={handleInputchange}
                />
              </div>

              <div>
                <Einput
                  title="Interview Time"
                  type="time"
                  name="RescheduleTime"
                  value={formData?.RescheduleTime}
                  handleInputChange={handleInputchange}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <AButton
                variant="outline"
                size="sm"
                onClick={DialogDiasbled}
                className="h-9 px-4 rounded-xl"
              >
                Cancel
              </AButton>

              <AButton
                variant="primary"
                size="sm"
                onClick={handleRescheduleRemark}
                className="h-9 px-4 rounded-xl bg-[#4338CA] hover:bg-[#3730a3] text-white"
              >
                Save Schedule
              </AButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog Modal */}
      <Dialog open={isOpenRating} onOpenChange={setIsOpenRating}>
        <DialogContent className="w-full max-w-xl bg-white dark:bg-[#0B1220] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
              Candidate Evaluation Ratings
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Score candidate against each evaluation criteria on a scale of 1 to 5.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 my-3">
            {evaluationCriteria?.map((item: any, index: number) => {
              const currentRating =
                ratings.find((r) => r.value === item.value)?.rating || "";

              return (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30"
                >
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 sm:w-3/5">
                    {item.label}
                  </div>

                  <div className="sm:w-2/5">
                    <select
                      className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1A2D] px-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-400"
                      value={currentRating}
                      onChange={(e) => handleRatingChange(item, e.target.value)}
                    >
                      <option value="">Select Rating</option>
                      {ratingOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Average Score:{" "}
              <span className="text-indigo-600 dark:text-indigo-400 text-sm">
                {calculateAverageRating()} / 5
              </span>
            </div>

            <div className="flex gap-2">
              <AButton
                variant="outline"
                size="sm"
                onClick={() => setIsOpenRating(false)}
                className="h-8 px-3 rounded-xl text-xs"
              >
                Close
              </AButton>

              <AButton
                variant="primary"
                size="sm"
                onClick={SubmitData}
                disabled={sumbittingData}
                className="h-8 px-4 rounded-xl bg-[#4338CA] hover:bg-[#3730a3] text-white text-xs"
              >
                {sumbittingData ? "Saved" : "Save Ratings"}
              </AButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InterviewProcess;