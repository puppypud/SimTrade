"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/src/app/components/layout/Navbar";
import { brokerService } from "@/src/app/services/brokerService";
import { UserAccount } from "@/src/app/types/broker";
import { ChevronDownIcon, ChevronUpIcon, UserIcon, PhoneIcon, MapPinIcon, BanknotesIcon, CalendarIcon, PlusCircleIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";
import FundFirmModal from "@/src/app/components/features/FundFirmModal";
import FundUserModal from "@/src/app/components/features/FundUserModal";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalEquity, setTotalEquity] = useState<number | null>(null);
  const [isMaintenance, setIsMaintenance] = useState<boolean>(false);
  const [dashboardLoading, setDashboardLoading] = useState<boolean>(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [isFundFirmModalOpen, setIsFundFirmModalOpen] = useState(false);
  const [fundUserTarget, setFundUserTarget] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, equityData, statusData] = await Promise.all([
          brokerService.getAllAccounts(),
          brokerService.getAllUsersEquity(),
          brokerService.getMarketStatus()
        ]);
        setUsers(usersData);
        setTotalEquity(equityData);
        setIsMaintenance(statusData.isMaintenanceMode);
      } catch (err: any) {
        console.error("Error fetching admin data:", err);
        setError("ไม่สามารถดึงข้อมูลระบบได้");
      } finally {
        setLoading(false);
        setDashboardLoading(false);
      }
    };
    fetchData();
  }, []);

  const refreshDashboardData = async () => {
    setDashboardLoading(true);
    try {
      const equityData = await brokerService.getAllUsersEquity();
      setTotalEquity(equityData);
    } catch (err) {
      console.error("Failed to refresh dashboard data", err);
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleToggleMaintenance = async () => {
    if (!confirm(`Are you sure you want to turn ${isMaintenance ? 'OFF' : 'ON'} maintenance mode?`)) return;
    try {
      const message = !isMaintenance ? "System is under maintenance. Trading is temporarily disabled." : "";
      const response = await brokerService.toggleMaintenance(!isMaintenance, message);
      setIsMaintenance(!isMaintenance); // Assuming success correctly updates it server-side. Wait for data refetch on reload if needed.
      alert(`Maintenance mode turned ${!isMaintenance ? 'ON' : 'OFF'} successfully.`);
    } catch (err: any) {
      console.error("Failed to toggle maintenance:", err);
      alert("Failed to update maintenance mode.");
    }
  };

  const toggleRow = (userId: string) => {
    if (expandedRow === userId) {
      setExpandedRow(null); // ปิดถ้ากดซ้ำ
    } else {
      setExpandedRow(userId); // เปิดแถวใหม่
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric", month: "long", day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD",
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar Fixed */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navbar />
      </div>

      {/* Main Content (เพิ่ม pt-24 ดันเนื้อหาลงมาไม่ให้ทับ Navbar) */}
      <main className="container mx-auto px-4 pt-24 pb-12">

        {/* Header Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              จัดการระบบ <span className="text-indigo-600">Admin Panel</span>
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              ควบคุมการทำงานของระบบและจัดการข้อมูลสมาชิก SimTrade
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <button
              onClick={() => setIsFundFirmModalOpen(true)}
              className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <PlusCircleIcon className="w-5 h-5 mr-2" />
              Fund Firm Account
            </button>
          </div>
        </div>

        {/* Dashboard Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Equity Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg text-green-700">
                <BanknotesIcon className="w-6 h-6" />
              </div>
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Users Equity</h2>
            </div>
            {dashboardLoading ? (
              <div className="h-10 w-32 bg-gray-200 animate-pulse rounded mt-2"></div>
            ) : (
              <div className="text-4xl font-extrabold text-gray-900 mt-1">
                {totalEquity !== null ? formatCurrency(totalEquity) : "-"}
              </div>
            )}
          </div>

          {/* Users Count Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
                <UserIcon className="w-6 h-6" />
              </div>
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Subscribed Users</h2>
            </div>
            {dashboardLoading ? (
              <div className="h-10 w-24 bg-gray-200 animate-pulse rounded mt-2"></div>
            ) : (
              <div className="text-4xl font-extrabold text-gray-900 mt-1">
                {users.length} <span className="text-lg font-medium text-gray-500">Accounts</span>
              </div>
            )}
          </div>

          {/* Maintenance Mode Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isMaintenance ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">System Status</h2>
              </div>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${isMaintenance ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                {isMaintenance ? 'MAINTENANCE' : 'ONLINE'}
              </span>
            </div>

            <button
              onClick={handleToggleMaintenance}
              disabled={dashboardLoading}
              className={`mt-4 w-full py-2.5 px-4 rounded-xl font-bold text-sm transition-all shadow-sm ${isMaintenance
                ? 'bg-gray-800 hover:bg-gray-900 text-white'
                : 'bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-200'
                }`}
            >
              {isMaintenance ? 'Turn System Online' : 'Enable Maintenance Mode'}
            </button>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
          {loading ? (
            <div className="p-12 text-center text-gray-500 animate-pulse">กำลังโหลดข้อมูล...</div>
          ) : error ? (
            <div className="p-12 text-center text-red-500 bg-red-50">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ชื่อ-นามสกุล</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">อีเมล / เบอร์โทร</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">เลขบัญชี</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">ยอดเงิน (Equity)</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">สถานะ</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <React.Fragment key={user.id}>
                      {/* แถวหลัก (Main Row) */}
                      <tr
                        onClick={() => toggleRow(user.id)}
                        className={`cursor-pointer transition-colors duration-200 ${expandedRow === user.id ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                      >
                        {/* 1. Identity */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                              {user.identity?.givenName?.[0]}{user.identity?.familyName?.[0]}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.identity?.givenName} {user.identity?.familyName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {user.identity?.countryOfCitizenship || "USA"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Contact */}
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{user.contact?.emailAddress}</div>
                          <div className="text-xs text-gray-500">{user.contact?.phoneNumber}</div>
                        </td>

                        {/* 3. Account No */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {user.accountNumber}
                        </td>

                        {/* 4. Equity */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-bold text-gray-900">{formatCurrency(user.lastEquity)}</div>
                          <div className="text-xs text-gray-400">{user.currency}</div>
                        </td>

                        {/* 5. Status */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}>
                            {user.status}
                          </span>
                        </td>

                        {/* 6. Actions (Fund + Expand) */}
                        <td className="px-6 py-4 whitespace-nowrap text-center text-gray-400">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFundUserTarget({
                                  id: user.id,
                                  name: `${user.identity?.givenName || ''} ${user.identity?.familyName || ''}`.trim() || 'Unknown User'
                                });
                              }}
                              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-colors tooltip-trigger"
                              title="Fund User Account"
                            >
                              <CurrencyDollarIcon className="w-5 h-5" />
                            </button>
                            {expandedRow === user.id ? (
                              <ChevronUpIcon className="w-5 h-5 text-indigo-600" />
                            ) : (
                              <ChevronDownIcon className="w-5 h-5" />
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* แถวขยาย (Expanded Details Row) */}
                      {expandedRow === user.id && (
                        <tr className="bg-indigo-50">
                          <td colSpan={6} className="px-6 py-6 border-b border-indigo-100">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">

                              {/* Card 1: ข้อมูลส่วนตัว */}
                              <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-100">
                                <h3 className="text-sm font-semibold text-indigo-900 mb-3 flex items-center">
                                  <UserIcon className="w-4 h-4 mr-2" /> ข้อมูลส่วนตัว
                                </h3>
                                <div className="space-y-2 text-sm text-gray-600">
                                  <p><span className="font-medium text-gray-900">วันเกิด:</span> {user.identity?.dateOfBirth}</p>
                                  <p><span className="font-medium text-gray-900">Account ID:</span> {user.id}</p>
                                  <p><span className="font-medium text-gray-900">สัญชาติ:</span> {user.identity?.countryOfCitizenship}</p>
                                </div>
                              </div>

                              {/* Card 2: ที่อยู่ */}
                              <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-100">
                                <h3 className="text-sm font-semibold text-indigo-900 mb-3 flex items-center">
                                  <MapPinIcon className="w-4 h-4 mr-2" /> ที่อยู่ & ติดต่อ
                                </h3>
                                <div className="space-y-2 text-sm text-gray-600">
                                  <p>{user.contact?.streetAddress?.[0]}</p>
                                  <p>{user.contact?.city}, {user.contact?.state} {user.contact?.postalCode}</p>
                                </div>
                              </div>

                              {/* Card 3: ข้อมูลอื่นๆ */}
                              <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-100">
                                <h3 className="text-sm font-semibold text-indigo-900 mb-3 flex items-center">
                                  <CalendarIcon className="w-4 h-4 mr-2" /> ข้อมูลระบบ
                                </h3>
                                <div className="space-y-2 text-sm text-gray-600">
                                  <p><span className="font-medium text-gray-900">วันที่สมัคร:</span> {formatDate(user.createdAt)}</p>
                                  <p><span className="font-medium text-gray-900">ประเภท:</span> Trading Account</p>
                                  <p className="text-green-600 font-medium">ยืนยันตัวตนแล้ว</p>
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <FundFirmModal
        isOpen={isFundFirmModalOpen}
        onClose={() => setIsFundFirmModalOpen(false)}
        onSuccess={refreshDashboardData}
      />

      <FundUserModal
        isOpen={!!fundUserTarget}
        onClose={() => setFundUserTarget(null)}
        onSuccess={refreshDashboardData}
        userId={fundUserTarget?.id || ''}
        userName={fundUserTarget?.name || ''}
      />
    </div>
  );
}