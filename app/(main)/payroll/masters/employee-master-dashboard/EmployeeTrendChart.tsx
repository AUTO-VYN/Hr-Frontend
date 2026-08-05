"use client";

import React, { useEffect, useRef } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Button } from "@/components/ui/button";

const EmployeeTrendChart = ({ data, onRangeChange, selectedRange }) => {
    const chartRef = useRef(null);

    const ranges = [
        { value: 3, label: "Last 3 Months" },
        { value: 6, label: "Last 6 Months" },
        { value: 9, label: "Last 9 Months" },
        { value: 12, label: "Last 12 Months" }
    ];

    const options = {
        chart: {
            type: 'column',
            height: 350,
            backgroundColor: 'transparent',
            animation: {
                duration: 1500
            },
            options3d: {
                enabled: true,
                alpha: 15,
            },
        },
        title: {
            text: '',
            align: 'left',
            style: {
                fontSize: '16px',
                fontWeight: 'bold'
            }
        },

        xAxis: {
            categories: data?.map(item => item.month) || [],
            title: {
                text: 'Month'
            },
            labels: {
                rotation: -45,
                style: {
                    fontSize: "14px",
                    fontWeight: "bold",
                    color: "#999999",
                },
            }
        },
        yAxis: {
            title: {
                text: 'Number of Employees'
            },
            min: 0,
            labels: {
                formatter: function () {
                    return Highcharts.numberFormat(this.value, 0);
                },
                 style: {
                    fontSize: "14px",
                    fontWeight: "bold",
                    color: "#999999",
                },
            }
        },
        tooltip: {
            shared: true,
            crosshairs: true,
            valueSuffix: ' employees',
            animation: {
                duration: 800, // Line draw animation
                easing: 'easeOutBounce'
            },
        },
        legend: {
            layout: 'horizontal',
            align: 'center',
            verticalAlign: 'bottom',
            symbolRadius: 4
        },
        plotOptions: {
            column: {
                borderRadius: 5,
                pointPadding: 0.1,
                groupPadding: 0.1,
                animation: {
                    duration: 2000,
                    easing: "easeOutBounce"
                }
            },
            series: {
                animation: {
                    duration: 2000
                }
            }
        },
        series: [
            {
                name: 'Total Employees',
                data: data?.map(item => item.total) || [],
                color: '#3b82f6',
                lineWidth: 2,
                marker: {
                    fillColor: '#3b82f6'
                }
            },
            {
                name: 'Active Employees',
                data: data?.map(item => item.active) || [],
                color: '#10b981',
                lineWidth: 2,
                marker: {
                    fillColor: '#10b981'
                }
            }
        ],
        credits: {
            enabled: false
        },
        exporting: {
            enabled: false
        }
    };

    return (
        <div className="bg-card border border-line rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <div>
                    <h3 className="text-lg font-bold text-fg">Employee Overview</h3>
                    <p className="text-sm text-muted">Monthly employee trend</p>
                </div>
                <div className="flex gap-2">
                    {ranges.map((range) => (
                        <Button
                            key={range.value}
                            variant={selectedRange === range.value ? "" : "outline"}
                            size="sm"
                            onClick={() => onRangeChange(range.value)}
                            className={`text-xs px-3 py-1 h-auto ${selectedRange === range.value
                                ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
                                : ''
                                }`}
                        >
                            {range.label}
                        </Button>
                    ))}
                </div>
            </div>
            <HighchartsReact
                highcharts={Highcharts}
                options={options}
                ref={chartRef}
            />
        </div>
    );
};

export default EmployeeTrendChart;