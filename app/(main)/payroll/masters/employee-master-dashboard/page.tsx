"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import HashloaderComponent from "@/components/Templates/hashloader";
import axios from "axios";
import Swal from "sweetalert2";
import EmployeeTrendChart from "./EmployeeTrendChart";
import DepartmentPieChart from "./DepartmentPieChart";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";

function showSideAlert(message, type) {
    const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 9000,
        timerProgressBar: true,
    });
    Toast.fire({ icon: type, title: message });
}

export default function Employee_Master_Dashboard() {
    const user = useCurrentUser();
    const [isLoading, setIsLoading] = useState(false);
    const [dashboardData, setDashboardData] = useState(null);
    const [selectedRange, setSelectedRange] = useState(6);
    const [selectedLocation, setSelectedLocation] = useState("");
    const [selectedMonth, setSelectedMonth] = useState("");

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [employeeDetails, setEmployeeDetails] = useState(null);
    const [isEmployeeLoading, setIsEmployeeLoading] = useState(false);

    const [isEmployeeListModalOpen, setIsEmployeeListModalOpen] = useState(false);
    const [employeeListData, setEmployeeListData] = useState([]);
    const [employeeListTitle, setEmployeeListTitle] = useState("");
    const [employeeListSubtitle, setEmployeeListSubtitle] = useState("");
    const [isEmployeeListLoading, setIsEmployeeListLoading] = useState(false);
    const [employeeListSearchTerm, setEmployeeListSearchTerm] = useState("");

    useEffect(() => {
        fetchDashboardData();
    }, [selectedRange, selectedLocation, selectedMonth]);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_URL}/employee/getDashboardData`,
                {
                    range: selectedRange,
                    location: selectedLocation,
                    month: selectedMonth,
                    login_loc: (user as any)?.branch
                },
                {
                    headers: {
                        compcode: (user as any)?.Comp_Code,
                        name: user?.name,
                    }
                });
            console.log(response.data, "response.data");
            if (response.data.success) {
                setDashboardData(response.data.data);
            } else {
                showSideAlert(response.data.message, "warning");
            }
        } catch (err) {
            console.error("Error fetching dashboard data:", err);
            showSideAlert("Failed to load dashboard data", "warning");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFilterChange = (type, value) => {
        if (type === 'location') {
            setSelectedLocation(value);
        } else if (type === 'month') {
            setSelectedMonth(value);
        }
    };


    // Fetch Employees by Type
    const fetchEmployeesByType = async (type, value = null, title, subtitle) => {
        setIsEmployeeListLoading(true);
        setIsEmployeeListModalOpen(true);
        setEmployeeListTitle(title);
        setEmployeeListSubtitle(subtitle);
        setEmployeeListSearchTerm("");
        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_URL}/employee/getEmployeesByType`,
                {
                    type,
                    value,
                    login_loc: (user as any)?.branch
                },
                {
                    headers: {
                        compcode: (user as any)?.Comp_Code,
                        name: user?.name
                    }
                }
            );
            if (response.data.success) {
                setEmployeeListData(response.data.data);
                setEmployeeListSubtitle(`Total: ${response.data.total} employees`);
            } else {
                showSideAlert(response.data.message, "warning");
            }
        } catch (err) {
            showSideAlert("Failed to load employees", "warning");
        } finally {
            setIsEmployeeListLoading(false);
        }
    };

    // Card Click Handlers
    const handleTotalEmployeesClick = () => {
        fetchEmployeesByType('all', null, 'All Employees', `Total: ${dashboardData?.stats.totalEmployees} employees`);
    };

    const handleActiveEmployeesClick = () => {
        fetchEmployeesByType('active', null, 'Active Employees', `Active: ${dashboardData?.stats.activeEmployees} employees`);
    };

    const handleDepartmentsClick = () => {
        const departmentsList = dashboardData?.employeesByDepartment || [];
        setEmployeeListData(departmentsList.map(dept => ({
            EMPCODE: dept.department,
            name: dept.department,
            designation: `${dept.count} employees`,
            department: dept.department,
            isDepartment: true,
            count: dept.count
        })));
        setEmployeeListTitle("Departments");
        setEmployeeListSubtitle(`Total Departments: ${dashboardData?.stats.departments}`);
        setIsEmployeeListModalOpen(true);
        setEmployeeListSearchTerm("");
    };
    const handleDesignationsClick = () => {
        fetchEmployeesByType('all', null, 'All Employees', `Total: ${dashboardData?.stats.totalEmployees} employees`);
    };

    const handleNewHiresClick = () => {
        fetchEmployeesByType('newhires', null, 'New Hires (This Month)', `This Month: ${dashboardData?.stats.newHires} new employees`);
    };

    const handleDepartmentClick = (departmentName) => {
        fetchEmployeesByType('department', departmentName, `Department: ${departmentName}`, `Employees in ${departmentName}`);
    };

    const handleEmployeeClickFromList = async (empcode) => {
        setIsEmployeeListModalOpen(false);
        await fetchEmployeeDetails(empcode);
    };

    const filteredEmployeeList = employeeListData.filter(emp => {
        const searchLower = employeeListSearchTerm.toLowerCase();
        if (emp.isDepartment) {
            return emp.name?.toLowerCase().includes(searchLower);
        }
        return (
            emp.name?.toLowerCase().includes(searchLower) ||
            emp.EMPCODE?.toLowerCase().includes(searchLower) ||
            emp.designation?.toLowerCase().includes(searchLower) ||
            emp.department?.toLowerCase().includes(searchLower)
        );
    });

    const fetchEmployeeDetails = async (empcode) => {
        setIsModalOpen(true);
        setIsEmployeeLoading(true);
        setSelectedEmployee(empcode);
        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_URL}/employee/getEmployeeDetails`,
                {
                    empcode,
                    login_loc: (user as any)?.branch
                },
                {
                    headers: {
                        compcode: (user as any)?.Comp_Code,
                        name: user?.name,
                    }
                }
            );
            if (response.data.success) {
                setEmployeeDetails(response.data.data);
            } else {
                showSideAlert(response.data.message, "warning");
            }
        } catch (err) {
            console.error("Error fetching employee details:", err);
            showSideAlert("Failed to load employee details", "warning");
        } finally {
            setIsEmployeeLoading(false);
        }
    };

    const StatCard = ({
    title,
    value,
    percentage,
    icon,
    color,
    bgColor,
    onClick,
}: {
    title: any;
    value: any;
    percentage?: number | null;
    icon: any;
    color: string;
    bgColor: string;
    onClick?: () => void;
}) => (
        <div className={`rounded-xl shadow-sm p-4 border-l-4 transition-all hover:shadow-md hover:cursor-pointer`}
            style={{
                borderLeftColor: color,
                backgroundColor: bgColor
            }}
            onClick={onClick}
        >
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <p className="text-xs font-medium text-gray-600 dark:text-black uppercase tracking-wide mb-1">
                        {title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-black">
                        {value?.toLocaleString() || 0}
                    </p>
                    {percentage !== undefined && percentage !== null && (
                        <p className={`text-xs mt-1 font-medium ${percentage >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {percentage >= 0 ? '↑' : '↓'} {Math.abs(percentage)}% vs last month
                        </p>
                    )}
                </div>
                <div className={`text-3xl opacity-80`}>
                    {icon}
                </div>
            </div>
        </div>
    );

    const RecentJoinersList = ({ joiners, onJoinerClick }) => {
        const [searchTerm, setSearchTerm] = useState("");

        if (!joiners || joiners.length === 0) {
            return (
                <div className="bg-card rounded-lg shadow border border-line p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-fg">Recent Joiners</h3>
                        <span className="text-xs text-gray-400">New members</span>
                    </div>
                    <p className="text-gray-500 text-center py-8">No recent joiners found</p>
                </div>
            );
        }

        // Filter joiners based on search term
        const filteredJoiners = joiners.filter(joiner => {
            const searchLower = searchTerm.toLowerCase();
            return (
                joiner.name?.toLowerCase().includes(searchLower) ||
                joiner.empcode?.toLowerCase().includes(searchLower) ||
                joiner.designation?.toLowerCase().includes(searchLower)
            );
        });

        // Colors array for cards
        const colors = ["#6366F1", "#22C55E", "#F59E0B", "#EF4444", "#0EA5E9", "#8B5CF6"];

        // Gradient combinations for cards without photos
        const cardColors = [
            'from-[#3B82F6] to-[#2563EB]',
            'from-[#22C55E] to-[#16A34A]',
            'from-[#A855F7] to-[#9333EA]',
            'from-[#EC4899] to-[#DB2777]',
            'from-[#F97316] to-[#EA580C]',
            'from-[#14B8A6] to-[#0D9488]',
            'from-[#6366F1] to-[#4F46E5]',
            'from-[#EF4444] to-[#DC2626]',
        ];

        // Get initials from name
        const getInitials = (name) => {
            if (!name) return '?';
            const parts = name.split(' ');
            if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
            return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
        };

        // Format date to DD-MM-YYYY
        const formatDate = (dateString) => {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        };

        return (
            <div className="bg-card rounded-lg shadow border border-line px-3 py-3">
                {/* Header with Search */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-line flex-wrap gap-3">
                    <div>
                        <h3 className="text-lg font-bold text-fg">Recent Joiners</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Search Input */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search by name, code or designation..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-3 py-1.5 text-sm border border-line rounded-lg bg-card text-fg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                            />
                            <svg
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                                >
                                    <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Count Badge */}
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-2 py-1 rounded-full whitespace-nowrap">
                            {filteredJoiners.length} / {joiners.length} New
                        </span>
                    </div>
                </div>

                {/* No Results Message */}
                {filteredJoiners.length === 0 ? (
                    <div className="text-center py-8">
                        <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-gray-500 dark:text-gray-400">No employees found matching "{searchTerm}"</p>
                    </div>
                ) : (
                    /* Horizontal Scrollable Cards */
                    <div className="overflow-x-auto pb-2 custom-scrollbar">
                        <div className="flex gap-4 min-w-max">
                            {filteredJoiners.map((joiner, index) => {
                                const color = colors[index % colors.length];
                                const gradientColor = cardColors[index % cardColors.length];
                                const initials = getInitials(joiner.name);
                                const formattedDate = formatDate(joiner.joiningDate);

                                return (
                                    <div
                                        key={joiner.empcode || index}
                                        onClick={() => onJoinerClick(joiner.empcode)}
                                        className="w-72 flex-shrink-0 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group overflow-hidden"
                                        style={{
                                            background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
                                            border: `1px solid ${color}30`
                                        }}
                                    >
                                        <div className="p-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                {joiner.photoUrl ? (
                                                    <div className="relative">
                                                        <img
                                                            src={joiner.photoUrl}
                                                            alt={joiner.name}
                                                            className="w-14 h-14 rounded-full object-cover border-2 shadow-md"
                                                            style={{ borderColor: color }}
                                                            onError={(e) => {
                                                                const img = e.currentTarget;

                                                                img.onerror = null;
                                                                img.style.display = "none";

                                                                const parent = img.parentElement;

                                                                if (parent) {
                                                                    parent.innerHTML = `
                        <div class="w-14 h-14 rounded-full bg-gradient-to-br ${gradientColor} flex items-center justify-center text-white font-bold text-xl shadow-md">
                            ${initials}
                        </div>
                    `;
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${gradientColor} flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:scale-105 transition-transform duration-300`}>
                                                        {initials}
                                                    </div>
                                                )}

                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-gray-900 dark:text-white text-sm truncate" title={joiner.name}>
                                                        {joiner.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5" title={joiner.designation}>
                                                        {joiner.designation || 'N/A'}
                                                    </p>
                                                    <span className="text-sm font-semibold" style={{ color: color }}>
                                                        {formattedDate}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Employee Profile Modal Component (using Dialog)
    const EmployeeProfileModal = () => {
        const getInitials = (name) => {
            if (!name) return '?';
            const parts = name.split(' ');
            if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
            return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
        };

        const InfoRow = ({ label, value }) => (
            <div className="flex items-start gap-3 py-2.5  border-line last:border-0">
                <span className="text-xs font-medium text-fg opacity-70 w-28 flex-shrink-0">{label}</span>
                <span className="text-sm text-fg flex-1 break-words font-medium">{value || 'N/A'}</span>
            </div>
        );

        const SectionTitle = ({ title, icon }) => (
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-line">
                <span className="text-xl">{icon}</span>
                <h4 className="text-base font-bold text-fg uppercase tracking-wide">{title}</h4>
            </div>
        );

        return (
            <Dialog open={isModalOpen} onOpenChange={(open) => {
                if (!open) {
                    setIsModalOpen(false);
                    setEmployeeDetails(null);
                    setSelectedEmployee(null);
                }
            }}>
                <DialogContent className="w-full max-w-screen-xl overflow-y-auto p-0 overflow-hidden bg-card max-h-[90vh]
                [&_button.absolute_svg]:w-8 [&_button.absolute_svg]:font-bold
                [&_button.absolute_svg]:h-6 [&_button_svg]:text-white [&_button_svg]:dark:text-white border dark:border-line">

                    {isEmployeeLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-12 h-12 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-fg opacity-70">Loading employee details...</p>
                            </div>
                        </div>
                    ) : employeeDetails ? (
                        <>
                            {/* HEADER - Premium Gradient Header */}
                            <div className="bg-gradient-to-r from-brand to-navy-2 dark:from-[var(--navy-3)] dark:to-[var(--navy-2)] px-6 py-5">
                                <div className="flex items-center gap-5">
                                    {/* Avatar */}
                                    <div className="relative">
                                        {employeeDetails.photoUrl ? (
                                            <img
                                                src={employeeDetails.photoUrl}
                                                alt={employeeDetails.personalInfo?.name}
                                                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                                            />
                                        ) : (
                                            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[var(--sky)] to-[var(--brand)] flex items-center justify-center text-white font-bold text-3xl border-4 border-white shadow-lg">
                                                {getInitials(employeeDetails.personalInfo?.name)}
                                            </div>
                                        )}
                                        <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                                    </div>

                                    {/* Header Info */}
                                    <div className="flex-1">
                                        <h2 className="text-2xl font-bold text-white">{employeeDetails.personalInfo?.name}</h2>
                                        <p className="text-[#DBEAFE] text-base mt-1 opacity-90">{employeeDetails.professionalInfo?.designation}</p>
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            <span className="text-xs text-[#DBEAFE] bg-white/20 px-2.5 py-1 rounded-full">
                                                📁 {employeeDetails.professionalInfo?.employeeCode}
                                            </span>
                                            <span className="text-xs text-[#DBEAFE] bg-white/20 px-2.5 py-1 rounded-full">
                                                🏢 {employeeDetails.professionalInfo?.department}
                                            </span>
                                            <span className="text-xs text-[#DBEAFE] bg-white/20 px-2.5 py-1 rounded-full">
                                                📍 {employeeDetails.professionalInfo?.location}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Content - Two Column Layout */}
                            <div className="overflow-y-auto flex-1 p-6 max-h-[calc(90vh-200px)] custom-scrollbar">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Left Column - Professional Information */}
                                    <div className="bg-[#F9FAFB] dark:bg-[#111827]/50 rounded-xl p-4 border border-line">
                                        <SectionTitle title="Professional Information" icon="💼" />
                                        <div className="space-y-1">
                                            <InfoRow label="Employee Code" value={employeeDetails.professionalInfo?.employeeCode} />
                                            <InfoRow label="Designation" value={employeeDetails.professionalInfo?.designation} />
                                            <InfoRow label="Department" value={employeeDetails.professionalInfo?.department} />
                                            <InfoRow label="Location" value={employeeDetails.professionalInfo?.location} />
                                            <InfoRow label="Region" value={employeeDetails.professionalInfo?.region} />
                                            <InfoRow label="Section" value={employeeDetails.professionalInfo?.section} />
                                            <InfoRow label="Shift" value={employeeDetails.professionalInfo?.shift} />
                                            <InfoRow label="Joining Date" value={employeeDetails.professionalInfo?.joiningDate} />
                                            <InfoRow label="Payment Mode" value={employeeDetails.professionalInfo?.paymentMode} />
                                            <InfoRow label="Bank Name" value={employeeDetails.professionalInfo?.bankName} />
                                            <InfoRow label="Bank Account No" value={employeeDetails.professionalInfo?.bankAccountNo} />
                                            <InfoRow label="IFSC Code" value={employeeDetails.professionalInfo?.ifscCode} />
                                            <InfoRow label="PF Number" value={employeeDetails.personalInfo?.pfNumber} />
                                        </div>
                                    </div>

                                    {/* Right Column - Personal Information */}
                                    <div className="bg-[#F9FAFB] dark:bg-[#111827]/50 rounded-xl p-4 border border-line">
                                        <SectionTitle title="Personal Information" icon="👤" />
                                        <div className="space-y-1">
                                            <InfoRow label="Full Name" value={employeeDetails.personalInfo?.name} />
                                            <InfoRow label="Gender" value={employeeDetails.personalInfo?.gender} />
                                            <InfoRow label="Date of Birth" value={employeeDetails.personalInfo?.dateOfBirth} />
                                            <InfoRow label="Blood Group" value={employeeDetails.personalInfo?.bloodGroup} />
                                            <InfoRow label="Marital Status" value={employeeDetails.personalInfo?.maritalStatus} />
                                            <InfoRow label="Email ID" value={employeeDetails.personalInfo?.email} />
                                            <InfoRow label="Mobile No" value={employeeDetails.personalInfo?.mobile} />
                                            <InfoRow label="Emergency No" value={employeeDetails.personalInfo?.emergencyNo} />
                                            <InfoRow label="PAN No" value={employeeDetails.personalInfo?.panNo} />
                                            <InfoRow label="Aadhar No" value={employeeDetails.personalInfo?.aadharNo} />
                                            <InfoRow label="UAN No" value={employeeDetails.personalInfo?.uanNo} />
                                            <InfoRow label="Father's Name" value={employeeDetails.personalInfo?.fatherName} />
                                            <InfoRow label="Mother's Name" value={employeeDetails.personalInfo?.motherName} />
                                        </div>
                                    </div>
                                </div>

                                {/* Address Section - Full Width */}
                                <div className="mt-6">
                                    <SectionTitle title="Address Information" icon="📍" />
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        <div className="bg-[#F9FAFB] dark:bg-[#111827]/50 rounded-xl p-4 border border-line">
                                            <h5 className="text-sm font-semibold text-fg mb-2 flex items-center gap-1">
                                                <span>🏠</span> Current Address
                                            </h5>
                                            <p className="text-sm text-fg opacity-80">
                                                {employeeDetails.addressInfo?.current?.address || ''}
                                            </p>

                                        </div>
                                        <div className="bg-[#F9FAFB] dark:bg-[#111827]/50 rounded-xl p-4 border border-line">
                                            <h5 className="text-sm font-semibold text-fg mb-2 flex items-center gap-1">
                                                <span>📬</span> Permanent Address
                                            </h5>
                                            <p className="text-sm text-fg opacity-80">
                                                {employeeDetails.addressInfo?.permanent?.address || ''}
                                            </p>

                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : null}
                </DialogContent>
            </Dialog>
        );
    };


    // Employee List Modal Component
    const EmployeeListModal = () => {
        if (!isEmployeeListModalOpen) return null;

        return (
            <Dialog open={isEmployeeListModalOpen} onOpenChange={(open) => {
                if (!open) {
                    setIsEmployeeListModalOpen(false);
                    setEmployeeListData([]);
                    setEmployeeListSearchTerm('');
                }
            }}>
                <DialogContent className="w-full max-w-screen-lg overflow-y-auto p-0 overflow-hidden bg-card max-h-[90vh]
                [&_button.absolute_svg]:w-8 [&_button.absolute_svg]:font-bold
                [&_button.absolute_svg]:h-6 [&_button_svg]:text-white [&_button_svg]:dark:text-white border dark:border-line">

                    {/* HEADER - Premium Gradient Header */}
                    <div className="bg-gradient-to-r from-brand to-navy-2 dark:from-[var(--navy-3)] dark:to-[var(--navy-2)] px-6 py-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white">{employeeListTitle}</h2>
                            <p className="text-sm text-[#DBEAFE] mt-0.5 opacity-90">{employeeListSubtitle}</p>
                        </div>
                    </div>

                    <div className="bg-card">
                        <div className="rounded-lg shadow-lg px-5 py-4">
                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-12">
                                    {/* Search Input */}
                                    <div className="mb-4">
                                        <div className="relative">
                                            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-fg opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            <input
                                                type="text"
                                                placeholder="Search by name, employee code, or designation..."
                                                value={employeeListSearchTerm}
                                                onChange={(e) => setEmployeeListSearchTerm(e.target.value)}
                                                autoFocus
                                                onClick={(e) => e.stopPropagation()}
                                                onPointerDown={(e) => e.stopPropagation()}
                                                className="w-full pl-10 pr-4 py-2.5 border border-line rounded-lg bg-card text-fg placeholder:text-fg dark:placeholder:text-white placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Employee List */}
                                    <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
                                        {isEmployeeListLoading ? (
                                            <div className="flex flex-col items-center justify-center py-12">
                                                <div className="w-10 h-10 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div>
                                                <p className="text-fg opacity-70 mt-3">Loading employees...</p>
                                            </div>
                                        ) : filteredEmployeeList.length === 0 ? (
                                            <div className="text-center py-12">
                                                <svg className="w-16 h-16 mx-auto text-fg opacity-30 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                                <p className="text-fg opacity-70">No employees found</p>
                                                <p className="text-xs text-fg opacity-50 mt-1">Try adjusting your search</p>
                                            </div>
                                        ) : (
                                            filteredEmployeeList.map((emp, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => emp.isDepartment ? handleDepartmentClick(emp.department) : handleEmployeeClickFromList(emp.EMPCODE)}
                                                    className="group p-4 border border-line rounded-lg cursor-pointer hover:border-[var(--brand)] dark:hover:border-[var(--sky)] hover:shadow-md transition-all duration-200 bg-card"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3">
                                                                {/* Avatar Circle */}
                                                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--sky)] flex items-center justify-center text-white font-bold text-sm">
                                                                    {emp.name?.charAt(0).toUpperCase() || '?'}
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-base font-semibold text-fg group-hover:text-[var(--brand)] dark:group-hover:text-[var(--sky)] transition-colors">
                                                                        {emp.name}
                                                                    </h4>
                                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                        <span className="text-xs text-fg opacity-60">
                                                                            📁 {emp.employeeCode || emp.EMPCODE || 'N/A'}
                                                                        </span>
                                                                        <span className="text-xs text-fg opacity-60">
                                                                            💼 {emp.designation || 'N/A'}
                                                                        </span>
                                                                        {emp.department && (
                                                                            <span className="text-xs text-fg opacity-60">
                                                                                🏢 {emp.department}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-fg opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    };

    if (isLoading && !dashboardData) {
        return (
            <div className="pb-1">
                <div className="md:col-span-12 gap-2">
                    <div className="col-span-12 rounded-t bg-navy px-2 md:px-6 py-2 border">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h1 className="font-bold sm:text-sm md:text-lg lg:text-xl text-white flex items-center gap-x-3 uppercase">
                                <span className="text-2xl">📊</span>
                                Employee Master Dashboard
                            </h1>
                            <div className="flex gap-2">
                                <Button variant="print" onClick={() => window.history.back()} className="px-7">
                                    Back
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
                <HashloaderComponent isLoading={true} />
            </div>
        );
    }

    if (!dashboardData) return null;

    const { stats, monthlyTrend, employeesByDepartment, recentJoiners, employeesByLocation, allLocations } = dashboardData;

    return (
        <div className="pb-4">
            {/* Header */}
            <div className="md:col-span-12 gap-2 sticky top-0 z-10">
                <div className="col-span-12 rounded-t bg-navy px-2 md:px-6 py-2 border border-line">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h1 className="font-bold sm:text-sm md:text-lg lg:text-xl text-white flex items-center gap-x-3 uppercase">
                            <span className="text-2xl">📊</span>
                            Employee Master Dashboard
                        </h1>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => window?.location?.reload()} className="px-7">
                                🔄 Refresh
                            </Button>
                            <Button variant="print" onClick={() => window.history.back()} className="px-7">
                                Back
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-3 mt-1">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
                    <StatCard onClick={handleTotalEmployeesClick} title="Total Employees" value={stats.totalEmployees} percentage={stats.percentages?.total} icon="👥" color="#3b82f6" bgColor="#eff6ff" />
                    <StatCard onClick={handleActiveEmployeesClick} title="Active Employees" value={stats.activeEmployees} percentage={stats.percentages?.active} icon="✅" color="#10b981" bgColor="#ecfdf5" />
                    <StatCard onClick={handleDepartmentsClick} title="Departments" value={stats.departments} icon="🏢" color="#8b5cf6" bgColor="#f5f3ff" />
                    <StatCard onClick={handleDesignationsClick} title="Designations" value={stats.designations} icon="📋" color="#f59e0b" bgColor="#fffbeb" />
                    <StatCard onClick={handleNewHiresClick} title="New Hires (This Month)" value={stats.newHires} percentage={stats.percentages?.newHires} icon="🎉" color="#ef4444" bgColor="#fef2f2" />
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
                    <EmployeeTrendChart
                        data={monthlyTrend}
                        onRangeChange={setSelectedRange}
                        selectedRange={selectedRange}
                    />
                    <DepartmentPieChart
                        data={employeesByDepartment}
                        locations={allLocations || employeesByLocation}
                        onFilterChange={handleFilterChange}
                        selectedLocation={selectedLocation}
                        selectedMonth={selectedMonth}
                    />
                </div>

                {/* Recent Joiners Section */}
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 lg:col-span-12">
                        <RecentJoinersList
                            joiners={recentJoiners}
                            onJoinerClick={fetchEmployeeDetails}
                        />
                    </div>
                </div>
            </div>

            <EmployeeListModal />
            <EmployeeProfileModal />
            <HashloaderComponent isLoading={isLoading} />
        </div>
    );
}