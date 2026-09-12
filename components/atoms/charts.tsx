"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Loader2, PieChart as PieIcon } from "lucide-react";

// ============================================================================
// Types & Interfaces
// ============================================================================

export type ChartType =
  | "pie"
  | "donut"
  | "line"
  | "spline"
  | "bar"
  | "column"
  | "area"
  | "areaspline";

export interface PieDataPoint {
  name: string;
  y: number;
  color?: string;
  sliced?: boolean;
  selected?: boolean;
  [key: string]: any;
}

export interface ChartSeries {
  name: string;
  data: number[] | [string | number, number][] | { x?: number; y: number; [key: string]: any }[];
  type?: string;
  color?: string;
  dashStyle?: string;
  stack?: string;
  [key: string]: any;
}

export interface ChartProps {
  /** Type of the chart */
  type?: ChartType;
  /** Title of the chart */
  title?: string;
  /** Subtitle of the chart */
  subtitle?: string;
  /** Categories for X-Axis (e.g. months, departments, dates) */
  categories?: string[];
  /** Data for single or multi-series charts */
  data?: (number | PieDataPoint)[] | ChartSeries[];
  /** Custom series config (alternative to `data`) */
  series?: any[];
  /** Height in px or CSS string (default 320) */
  height?: number | string;
  /** Custom color palette */
  colors?: string[];
  /** Show/hide legends (default true) */
  showLegend?: boolean;
  /** Legend position */
  legendPosition?: "top" | "bottom" | "left" | "right";
  /** Show data labels on bars/lines/slices */
  showDataLabels?: boolean;
  /** Inner size percentage for Pie/Donut (e.g. '60%') */
  innerSize?: string | number;
  /** Value prefix for tooltips/labels (e.g. '₹') */
  valuePrefix?: string;
  /** Value suffix for tooltips/labels (e.g. '%', ' hrs') */
  valueSuffix?: string;
  /** Stacking mode for bar/column/area ('normal' | 'percent' | false) */
  stacked?: boolean | "normal" | "percent";
  /** Enable/disable gridlines */
  showGridLines?: boolean;
  /** Y-Axis title */
  yAxisTitle?: string;
  /** X-Axis title */
  xAxisTitle?: string;
  /** Loading state */
  loading?: boolean;
  /** Empty data state message */
  emptyText?: string;
  /** Custom additional Highcharts options override */
  options?: Highcharts.Options;
  /** Chart container extra classes */
  className?: string;
  /** Chart click / point events */
  onPointClick?: (point: any) => void;
}

// ============================================================================
// Modern Default Palette
// ============================================================================
export const DEFAULT_CHART_COLORS = [
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#3b82f6", // Blue
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#14b8a6", // Teal
  "#ef4444", // Red
  "#84cc16", // Lime
  "#a855f7", // Purple
];

// ============================================================================
// Main Chart Component
// ============================================================================
export function Chart({
  type = "column",
  title,
  subtitle,
  categories,
  data,
  series,
  height = 320,
  colors = DEFAULT_CHART_COLORS,
  showLegend = true,
  legendPosition = "bottom",
  showDataLabels = false,
  innerSize,
  valuePrefix = "",
  valueSuffix = "",
  stacked,
  showGridLines = true,
  yAxisTitle = "",
  xAxisTitle = "",
  loading = false,
  emptyText = "No data available",
  options: customOptions,
  className = "",
  onPointClick,
}: ChartProps) {
  const chartComponentRef = useRef<HighchartsReact.RefObject>(null);
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Sync dark mode from DOM class
  useEffect(() => {
    setMounted(true);
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkDark();

    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Theme-aware tokens
  const theme = useMemo(() => {
    return {
      textColor: isDark ? "#e2e8f0" : "#1e293b",
      subtextColor: isDark ? "#94a3b8" : "#64748b",
      gridColor: isDark ? "rgba(255, 255, 255, 0.07)" : "rgba(0, 0, 0, 0.06)",
      axisLineColor: isDark ? "#334155" : "#e2e8f0",
      tooltipBg: isDark ? "#0f172a" : "#ffffff",
      tooltipBorder: isDark ? "#334155" : "#e2e8f0",
      tooltipColor: isDark ? "#f8fafc" : "#0f172a",
    };
  }, [isDark]);

  // Normalize highcharts type
  const actualType = useMemo(() => {
    if (type === "donut") return "pie";
    return type;
  }, [type]);

  const isPieLike = actualType === "pie";

  // Compute final innerSize for donut/pie
  const effectiveInnerSize = useMemo(() => {
    if (innerSize !== undefined) return innerSize;
    if (type === "donut") return "60%";
    return "0%";
  }, [type, innerSize]);

  // Compute stacking option
  const stackingOption = useMemo(() => {
    if (stacked === true) return "normal";
    if (stacked === "percent" || stacked === "normal") return stacked;
    return undefined;
  }, [stacked]);

  // Normalize Series Data
  const normalizedSeries = useMemo(() => {
    if (series && series.length > 0) return series;

    if (!data || data.length === 0) return [];

    if (isPieLike) {
      return [
        {
          name: title || "Value",
          type: "pie",
          data: data.map((item) => {
            if (typeof item === "object" && item !== null) {
              return item;
            }
            return { name: "Value", y: Number(item) || 0 };
          }),
        },
      ];
    }

    // Check if data is array of series or flat numbers
    if (typeof data[0] === "object" && data[0] !== null && "data" in data[0]) {
      return data as ChartSeries[];
    }

    return [
      {
        name: title || "Value",
        type: actualType,
        data: data as any,
      },
    ];
  }, [data, series, isPieLike, title, actualType]);

  // Has valid data
  const hasData = useMemo(() => {
    if (normalizedSeries.length === 0) return false;
    return normalizedSeries.some((s) => {
      if (Array.isArray(s.data)) return s.data.length > 0;
      return false;
    });
  }, [normalizedSeries]);

  // Highcharts Configuration
  const chartOptions: Highcharts.Options = useMemo(() => {
    const baseOptions: Highcharts.Options = {
      chart: {
        type: actualType,
        height: height,
        backgroundColor: "transparent",
        style: {
          fontFamily: "inherit",
        },
      },
      title: title
        ? {
            text: title,
            align: "left",
            style: {
              color: theme.textColor,
              fontSize: "15px",
              fontWeight: "600",
            },
          }
        : { text: undefined },
      subtitle: subtitle
        ? {
            text: subtitle,
            align: "left",
            style: {
              color: theme.subtextColor,
              fontSize: "12px",
            },
          }
        : { text: undefined },
      colors: colors,
      credits: {
        enabled: false,
      },
      legend: {
        enabled: showLegend,
        layout:
          legendPosition === "left" || legendPosition === "right"
            ? "vertical"
            : "horizontal",
        align:
          legendPosition === "left"
            ? "left"
            : legendPosition === "right"
            ? "right"
            : "center",
        verticalAlign:
          legendPosition === "top"
            ? "top"
            : legendPosition === "bottom"
            ? "bottom"
            : "middle",
        itemStyle: {
          color: theme.textColor,
          fontSize: "12px",
          fontWeight: "500",
        },
        itemHoverStyle: {
          color: colors[0] || "#6366f1",
        },
      },
      xAxis: isPieLike
        ? undefined
        : {
            categories: categories,
            title: xAxisTitle
              ? {
                  text: xAxisTitle,
                  style: { color: theme.subtextColor, fontSize: "12px" },
                }
              : undefined,
            lineColor: theme.axisLineColor,
            tickColor: theme.axisLineColor,
            labels: {
              style: {
                color: theme.subtextColor,
                fontSize: "11px",
              },
            },
          },
      yAxis: isPieLike
        ? undefined
        : {
            title: yAxisTitle
              ? {
                  text: yAxisTitle,
                  style: { color: theme.subtextColor, fontSize: "12px" },
                }
              : { text: undefined },
            gridLineColor: showGridLines ? theme.gridColor : "transparent",
            labels: {
              style: {
                color: theme.subtextColor,
                fontSize: "11px",
              },
              formatter: function () {
                return `${valuePrefix}${this.value}${valueSuffix}`;
              },
            },
          },
      tooltip: {
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        borderRadius: 10,
        shadow: {
          color: "rgba(0, 0, 0, 0.15)",
          offsetX: 0,
          offsetY: 4,
          opacity: 0.1,
          width: 8,
        },
        style: {
          color: theme.tooltipColor,
          fontSize: "12px",
        },
        useHTML: true,
        shared: !isPieLike,
        valuePrefix: valuePrefix,
        valueSuffix: valueSuffix,
        pointFormat: isPieLike
          ? `<span style="color:{point.color}">\u25CF</span> {point.name}: <b>${valuePrefix}{point.y}${valueSuffix}</b> ({point.percentage:.1f}%)<br/>`
          : `<span style="color:{series.color}">\u25CF</span> {series.name}: <b>${valuePrefix}{point.y}${valueSuffix}</b><br/>`,
      },
      plotOptions: {
        series: {
          stacking: stackingOption,
          animation: {
            duration: 800,
          },
          cursor: onPointClick ? "pointer" : "default",
          point: onPointClick
            ? {
                events: {
                  click: function () {
                    onPointClick(this);
                  },
                },
              }
            : undefined,
        },
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          innerSize: effectiveInnerSize,
          borderRadius: 4,
          borderWidth: isDark ? 2 : 1,
          borderColor: isDark ? "#0f172a" : "#ffffff",
          dataLabels: {
            enabled: showDataLabels,
            format: "<b>{point.name}</b>: {point.percentage:.1f}%",
            style: {
              fontSize: "11px",
              fontWeight: "500",
              color: theme.textColor,
              textOutline: "none",
            },
          },
        },
        column: {
          borderRadius: 4,
          borderWidth: 0,
          dataLabels: {
            enabled: showDataLabels,
            style: {
              fontSize: "11px",
              fontWeight: "500",
              color: theme.textColor,
              textOutline: "none",
            },
          },
        },
        bar: {
          borderRadius: 4,
          borderWidth: 0,
          dataLabels: {
            enabled: showDataLabels,
            style: {
              fontSize: "11px",
              fontWeight: "500",
              color: theme.textColor,
              textOutline: "none",
            },
          },
        },
        line: {
          lineWidth: 2.5,
          marker: {
            radius: 3.5,
          },
          dataLabels: {
            enabled: showDataLabels,
            style: {
              fontSize: "11px",
              fontWeight: "500",
              color: theme.textColor,
              textOutline: "none",
            },
          },
        },
        spline: {
          lineWidth: 2.5,
          marker: {
            radius: 3.5,
          },
          dataLabels: {
            enabled: showDataLabels,
            style: {
              fontSize: "11px",
              fontWeight: "500",
              color: theme.textColor,
              textOutline: "none",
            },
          },
        },
        area: {
          lineWidth: 2,
          fillOpacity: isDark ? 0.25 : 0.15,
          dataLabels: {
            enabled: showDataLabels,
          },
        },
        areaspline: {
          lineWidth: 2,
          fillOpacity: isDark ? 0.25 : 0.15,
          dataLabels: {
            enabled: showDataLabels,
          },
        },
      },
      series: normalizedSeries as any,
    };

    // Deep merge with custom options if supplied
    if (customOptions) {
      const hc: any = Highcharts;
      const mergeFn = hc?.merge || hc?.default?.merge;
      if (typeof mergeFn === "function") {
        return mergeFn(baseOptions, customOptions);
      }
      return { ...baseOptions, ...customOptions };
    }
    return baseOptions;
  }, [
    actualType,
    height,
    title,
    subtitle,
    theme,
    colors,
    showLegend,
    legendPosition,
    isPieLike,
    categories,
    xAxisTitle,
    yAxisTitle,
    showGridLines,
    valuePrefix,
    valueSuffix,
    stackingOption,
    onPointClick,
    effectiveInnerSize,
    isDark,
    showDataLabels,
    normalizedSeries,
    customOptions,
  ]);

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 backdrop-blur-xs dark:bg-slate-900/70">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-600 dark:text-indigo-400" />
          <span className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            Loading chart...
          </span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !hasData && (
        <div
          style={{ height: height }}
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
            <PieIcon className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400">
            {emptyText}
          </p>
        </div>
      )}

      {/* Highcharts Render */}
      {mounted && !loading && hasData && (
        <HighchartsReact
          highcharts={Highcharts}
          options={chartOptions}
          ref={chartComponentRef}
        />
      )}
    </div>
  );
}

// ============================================================================
// Specialized Chart Sub-Components
// ============================================================================

/** Pie Chart */
export function PieChart(props: Omit<ChartProps, "type">) {
  return <Chart {...props} type="pie" />;
}

/** Donut Chart */
export function DonutChart(props: Omit<ChartProps, "type">) {
  return <Chart {...props} type="donut" />;
}

/** Line Chart */
export function LineChart(props: Omit<ChartProps, "type">) {
  return <Chart {...props} type="line" />;
}

/** Smooth Spline Line Chart */
export function SplineChart(props: Omit<ChartProps, "type">) {
  return <Chart {...props} type="spline" />;
}

/** Bar Chart (Horizontal) */
export function BarChart(props: Omit<ChartProps, "type">) {
  return <Chart {...props} type="bar" />;
}

/** Column Chart (Vertical) */
export function ColumnChart(props: Omit<ChartProps, "type">) {
  return <Chart {...props} type="column" />;
}

/** Area Chart */
export function AreaChart(props: Omit<ChartProps, "type">) {
  return <Chart {...props} type="area" />;
}

/** Smooth Area Spline Chart */
export function AreaSplineChart(props: Omit<ChartProps, "type">) {
  return <Chart {...props} type="areaspline" />;
}

export default Chart;
