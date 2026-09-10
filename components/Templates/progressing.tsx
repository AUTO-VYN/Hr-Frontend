import React from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

interface LeaveProgressRingProps {
    leaveType?: string;
    opBal?: number | string;
    availLev?: number | string;
    clBal?: number | string;
    GenLev?: number | string;
}

const LeaveProgressRing: React.FC<LeaveProgressRingProps> = ({
    leaveType = "Leave Type",
    opBal = 0,
    availLev = 0,
    clBal = 0,
    GenLev = 0,
}) => {
    const numOp = Number(opBal) || 0;
    const numAvail = Number(availLev) || 0;
    const numCl = Number(clBal) || 0;
    const numGen = Number(GenLev) || 0;
    const total = numOp + numGen;
    const percentage = total > 0 ? Math.min(100, Math.round((numCl / total) * 100)) : (numCl > 0 ? 100 : 0);

    // Theme color mapping based on leave type
    const getColor = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes("casual")) return { stroke: "#4338CA", text: "#4338CA", bg: "#EEF2FF" };
        if (t.includes("paid")) return { stroke: "#10B981", text: "#059669", bg: "#ECFDF5" };
        if (t.includes("sick")) return { stroke: "#F59E0B", text: "#D97706", bg: "#FEF3C7" };
        return { stroke: "#8B5CF6", text: "#7C3AED", bg: "#F3E8FF" };
    };

    const theme = getColor(leaveType);

    return (
        <div className="flex items-center justify-between rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0B1220] p-4 sm:p-5 shadow-sm hover:shadow transition-all">
            <div className="flex items-center gap-4">
                {/* Circular Ring with Center Value */}
                <div className="relative flex items-center justify-center w-16 h-16 shrink-0">
                    <CircularProgressbar
                        value={percentage || (numCl > 0 ? 100 : 0)}
                        strokeWidth={9}
                        styles={buildStyles({
                            pathColor: theme.stroke,
                            trailColor: "var(--border)",
                            strokeLinecap: "round",
                        })}
                    />
                    <span className="absolute font-bold text-lg text-slate-900 dark:text-slate-100">
                        {numCl}
                    </span>
                </div>

                {/* Title & Metrics */}
                <div>
                    <h4 className="font-bold text-lg sm:text-xl text-slate-900 dark:text-slate-100 leading-tight mb-1">
                        {leaveType}
                    </h4>
                    <div className="text-base sm:text-lg text-slate-600 dark:text-slate-300 space-y-0.5 font-medium">
                        <div>Opening: <span className="text-slate-900 dark:text-slate-100 font-bold">{numOp}</span></div>
                        <div>Generated: <span className="text-slate-900 dark:text-slate-100 font-bold">{numGen}</span></div>
                        <div>Availed: <span className="text-slate-900 dark:text-slate-100 font-bold">{numAvail}</span></div>
                    </div>
                </div>
            </div>

            <div className="text-right text-base font-semibold hidden sm:block pr-2">
                <div className="text-slate-400 font-semibold text-sm">Bal</div>
                <div className="font-extrabold text-xl sm:text-2xl" style={{ color: theme.text }}>
                    {numCl}
                </div>
            </div>
        </div>
    );
};

export default LeaveProgressRing;
