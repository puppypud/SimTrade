"use client";

import React, { useEffect, useState } from "react";
import { AccountInfo } from "@/src/app/types/broker"; // อย่าลืม import interface ที่สร้างเมื่อกี้
import { brokerService } from "@/src/app/services/brokerService";
import PortfolioTable from "@/src/app/components/features/PortfolioTable";
import { useAuth } from "@/src/context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper สำหรับจัดรูปแบบเงิน USD
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  useEffect(() => {
    const fetchAccountData = async () => {
      if (!user?.alpacaAccountId) return;
      try {
        const data = await brokerService.getAccountInfo(
          user.alpacaAccountId
        );
        setAccount(data);
      } catch (error) {
        console.error("Failed to fetch account data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccountData();
  }, [user]);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Loading Dashboard...
      </div>
    );
  if (!account)
    return (
      <div className="p-8 text-center text-red-500">
        Failed to load account data.
      </div>
    );

  // คำนวณกำไร/ขาดทุน ของวันนี้ (Equity ปัจจุบัน - Equity เมื่อวาน)
  const todaysChange = account.equity - account.lastEquity;
  const isPositive = todaysChange >= 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      {/* Header Section */}
      <div className="mx-auto max-w-5xl mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Overview</h1>
          <p className="text-sm text-gray-500">
            Account #: {account.accountNumber} <span className="mx-2">•</span>{" "}
            Status:{" "}
            <span className="text-green-600 font-medium">{account.status}</span>
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Day Trade Count</div>
          <div className="font-bold text-gray-700">
            {account.daytradeCount}{" "}
            <span className="text-xs font-normal text-gray-400">
              / 3 (Warning)
            </span>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-3">
        {/* Card 1: Total Equity (ใหญ่สุด) */}
        <div className="col-span-full bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">
            Total Equity (มูลค่าพอร์ตสุทธิ)
          </p>
          <div className="mt-2 flex items-baseline space-x-4">
            <h2 className="text-5xl font-extrabold text-gray-900">
              {formatCurrency(account.equity)}
            </h2>
            {/* Today's Change Indicator */}
            <div
              className={`flex items-center text-lg font-medium ${isPositive ? "text-green-600" : "text-red-600"
                }`}
            >
              {isPositive ? "▲" : "▼"} {formatCurrency(Math.abs(todaysChange))}{" "}
              (Today)
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            เทียบกับราคาปิดเมื่อวาน ({formatCurrency(account.lastEquity)})
          </p>
        </div>

        {/* Card 2: Buying Power */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">Buying Power</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {formatCurrency(account.buyingPower)}
              </h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            เงินที่สามารถใช้ซื้อหุ้นได้ทันที
          </p>
        </div>

        {/* Card 3: Cash Balance */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">Cash Balance</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {formatCurrency(account.cash)}
              </h3>
            </div>
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a1 1 0 11-2 0 1 1 0 012 0z"
                />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">เงินสดคงเหลือในบัญชี</p>
        </div>

        {/* Card 4: Invested Value */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">Invested (Long)</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {formatCurrency(account.longMarketValue)}
              </h3>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            มูลค่าหุ้นทั้งหมดที่ถืออยู่
          </p>
        </div>
      </div>
      <div className="p-6">
        <h2 className="text-2xl font-bold text-white mb-6">My Portfolio</h2>
        {/* ส่ง accountId ของ user เข้าไป */}
        {user?.alpacaAccountId ? (
          <PortfolioTable accountId={user.alpacaAccountId} />
        ) : (
          <p className="text-gray-500">Please log in to view portfolio.</p>
        )}
      </div>
    </div>
  );
}
