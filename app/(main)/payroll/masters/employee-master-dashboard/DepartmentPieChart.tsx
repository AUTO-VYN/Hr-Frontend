"use client";

import React, { useEffect, useRef, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const DepartmentPieChart = ({ data, locations, onFilterChange, selectedLocation, selectedMonth }) => {
    const chartRef = useRef(null);
    const [showAllModal, setShowAllModal] = useState(false);

    const months = [
        { value: "", label: "All Months" },
        { value: "Jan", label: "January" },
        { value: "Feb", label: "February" },
        { value: "Mar", label: "March" },
        { value: "Apr", label: "April" },
        { value: "May", label: "May" },
        { value: "Jun", label: "June" },
        { value: "Jul", label: "July" },
        { value: "Aug", label: "August" },
        { value: "Sep", label: "September" },
        { value: "Oct", label: "October" },
        { value: "Nov", label: "November" },
        { value: "Dec", label: "December" }
    ];

    const departmentColors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
        '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
        '#f97316', '#6366f1', '#d946ef', '#14b8a6',
        '#f43f5e', '#0ea5e9', '#eab308', '#a855f7'
    ];

    const totalEmployees = data?.reduce((sum, item) => sum + item.count, 0) || 0;

    const pieData = data?.slice(0, 10).map((item, index) => ({
        name: item.department,
        y: item.count,
        percentage: ((item.count / totalEmployees) * 100).toFixed(1),
        color: departmentColors[index % departmentColors.length]
    })) || [];

    let othersCount = 0;
    if (data && data.length > 10) {
        othersCount = data.slice(10).reduce((sum, item) => sum + item.count, 0);
        if (othersCount > 0) {
            pieData.push({
                name: 'Others',
                y: othersCount,
                percentage: ((othersCount / totalEmployees) * 100).toFixed(1),
                color: '#6b7280'
            });
        }
    }

    const topDepartments = data?.slice(0, 6).map((item, index) => ({
        ...item,
        percentage: ((item.count / totalEmployees) * 100).toFixed(1),
        color: departmentColors[index % departmentColors.length]
    })) || [];

    const allDepartments = data?.map((item, index) => ({
        ...item,
        percentage: ((item.count / totalEmployees) * 100).toFixed(1),
        color: departmentColors[index % departmentColors.length]
    })) || [];

    const options = {
        chart: {
            type: 'pie',
            height: 320,
            backgroundColor: 'transparent'
        },
        title: {
            text: ''
        },
        tooltip: {
            pointFormat: '<b>{point.percentage:.1f}%</b><br/>Employees: <b>{point.y}</b>'
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: "pointer",
                innerSize: "60%",
                dataLabels: {
                    enabled: true,
                    // format: '{point.percentage:.1f}%',
                    style: {
                        fontSize: '11px',
                        fontWeight: '500',
                        color: '#999999',
                        textOutline: 'none'
                    },
                    distance: 20
                },
                showInLegend: false,
                size: '75%',
                borderWidth: 0,
                states: {
                    hover: {
                        enabled: true,
                        brightness: 0.1
                    }
                }
            },
            series: {
                animation: {
                    duration: 1500,
                },
            }
        },
        series: [{
            name: 'Departments',
            colorByPoint: true,
            data: pieData.map(item => ({
                name: item.name,
                y: item.y,
                color: item.color
            })),
            colors: departmentColors
        }],
        credits: {
            enabled: false
        },
        exporting: {
            enabled: false
        }
    };

    // ✅ Add total in center of donut chart
    useEffect(() => {
        if (chartRef.current && chartRef.current.chart) {
            const chart = chartRef.current.chart;
            const total = totalEmployees.toLocaleString();
            
            // Remove old text if exists
            if (chart.customText) {
                chart.customText.destroy();
            }
            
            // Add new text in center
            const centerX = chart.plotLeft + chart.plotWidth / 2;
            const centerY = chart.plotTop + chart.plotHeight / 2;
            
            chart.customText = chart.renderer.text(
                `<div style="text-align: center">
                    <span style="font-size: 12px; color: #666;">Total</span><br/>
                    <span style="font-size: 22px; font-weight: bold; color: #2563EB;">${total}</span>
                </div>`,
                centerX,
                centerY
            )
            .attr({
                align: 'center',
                zIndex: 10
            })
            .css({
                textAlign: 'center'
            })
            .add();
        }
    }, [totalEmployees, data]);

    return (
        <>
            <div className="bg-card border border-line rounded-lg shadow p-4">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <div>
                        <h3 className="text-lg font-bold text-fg">Employees by Department</h3>
                        <p className="text-sm text-gray-500">Department wise distribution</p>
                    </div>
                    {/* Filter Options  */}
                    <div className="flex gap-2">
                        <select
                            className="border border-line rounded-md px-3 py-1 text-sm bg-card"
                            value={selectedLocation || ""}
                            onChange={(e) => onFilterChange('location', e.target.value)}
                        >
                            <option value="">All Locations</option>
                            {locations?.map((loc) => (
                                <option key={loc.location} value={loc.location}>
                                    {loc.location}
                                </option>
                            ))}
                        </select>

                        <select
                            className="border border-line rounded-md px-3 py-1 text-sm bg-card"
                            value={selectedMonth || ""}
                            onChange={(e) => onFilterChange('month', e.target.value)}
                        >
                            {months.map((month) => (
                                <option key={month.value} value={month.value}>
                                    {month.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    {/* Left Side - Pie Chart */}
                    <div className="w-full md:w-1/2">
                        <HighchartsReact
                            highcharts={Highcharts}
                            options={options}
                            ref={chartRef}
                        />
                    </div>
                    
                    {/* Right Side - Department List */}
                    <div className="w-full md:w-1/2">
                        <div className="space-y-3">
                            {topDepartments.map((dept, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: dept.color }}
                                        ></div>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {dept.department}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm text-gray-500 w-14 text-right">
                                            {dept.percentage}%
                                        </span>
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white w-16 text-right">
                                            {dept.count.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAllModal(true)}
                                className="w-full mt-3 text-[#2563EB] border-[#2563EB] hover:bg-[#EFF6FF] dark:hover:bg-[#172554]"
                            >
                                View All Departments ({data?.length || 0})
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* View All Modal */}
            <Dialog open={showAllModal} onOpenChange={setShowAllModal}>
                <DialogContent className="w-full max-w-screen-lg overflow-y-auto p-0 overflow-hidden bg-card max-h-[90vh]">
                    <div className="flex justify-between items-center px-6 py-3 bg-[#F3F8FC] dark:bg-black border-b border-line">
                        <div>
                            <h2 className="text-2xl font-bold text-[var(--brand)] dark:text-white">
                                ALL DEPARTMENTS
                            </h2>
                            <p className="text-sm text-fg opacity-70 mt-0.5">
                                Total: {totalEmployees.toLocaleString()} employees
                            </p>
                        </div>
                    </div>

                    <div className="bg-card">
                        <div className="rounded-lg shadow-lg px-5 py-4">
                            <div className="grid grid-cols-12">
                                <div className="col-span-12">
                                    <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                                        <table className="w-full border-collapse">
                                            <thead className="sticky top-0 z-10 bg-[#F3F8FC] dark:bg-black">
                                                <tr className="border-b border-line">
                                                    <th className="text-left py-3 px-4 font-semibold text-sm text-fg">#</th>
                                                    <th className="text-left py-3 px-4 font-semibold text-sm text-fg">Department</th>
                                                    <th className="text-right py-3 px-4 font-semibold text-sm text-fg">Employees</th>
                                                    <th className="text-right py-3 px-4 font-semibold text-sm text-fg">Percentage</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {allDepartments.map((dept, idx) => (
                                                    <tr key={idx} className="border-b border-line hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                                        <td className="py-3 px-4 text-sm text-fg">{idx + 1}</td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }}></div>
                                                                <span className="text-sm font-medium text-fg">{dept.department}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 text-right text-sm font-semibold text-fg">{dept.count.toLocaleString()}</td>
                                                        <td className="py-3 px-4 text-right text-sm text-fg">{dept.percentage}%</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default DepartmentPieChart;