"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/src/app/components/layout/Navbar";
import { brokerService } from "@/src/app/services/brokerService";
import { UserAccount } from "@/src/app/types/broker";
// ใช้ Heroicons สำหรับไอคอนสวยๆ (ถ้าไม่มีให้ลง npm install @heroicons/react)
import { ChevronDownIcon, ChevronUpIcon, UserIcon, PhoneIcon, MapPinIcon, BanknotesIcon, CalendarIcon } from "@heroicons/react/24/outline";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null); // State สำหรับแถวที่ถูกขยาย

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await brokerService.getAllAccounts();
        setUsers(data);
      } catch (err: any) {
        console.error("Error fetching users:", err);
        setError("ไม่สามารถดึงข้อมูลผู้ใช้งานได้");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

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
              จัดการสมาชิก <span className="text-indigo-600">Admin Panel</span>
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              รายชื่อผู้ใช้งานทั้งหมดในระบบ SimTrade
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
              <UserIcon className="w-4 h-4 mr-2" />
              สมาชิกทั้งหมด: {users.length} คน
            </span>
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
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">รายละเอียด</th>
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
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>
                            {user.status}
                          </span>
                        </td>

                        {/* 6. Expand Button */}
                        <td className="px-6 py-4 whitespace-nowrap text-center text-gray-400">
                          {expandedRow === user.id ? (
                            <ChevronUpIcon className="w-5 h-5 mx-auto text-indigo-600" />
                          ) : (
                            <ChevronDownIcon className="w-5 h-5 mx-auto" />
                          )}
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
    </div>
  );
}