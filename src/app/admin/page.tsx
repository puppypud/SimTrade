"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import {
  UsersIcon, ChartBarIcon, ShieldCheckIcon,
  BuildingLibraryIcon, ClipboardDocumentListIcon,
  CpuChipIcon, Cog6ToothIcon, LockClosedIcon,
} from "@heroicons/react/24/outline";

// Tab components
import AdminUserTab from "./tabs/AdminUserTab";
import AdminStockTab from "./tabs/AdminStockTab";
import AdminOrderTab from "./tabs/AdminOrderTab";
import AdminDashboardTab from "./tabs/AdminDashboardTab";
import AdminOverviewTab from "./tabs/AdminOverviewTab";
import AdminConfigTab from "./tabs/AdminConfigTab";

const TABS = [
  { id: "overview", label: "ภาพรวม", icon: ChartBarIcon },
  { id: "users", label: "จัดการผู้ใช้", icon: UsersIcon },
  { id: "stocks", label: "จัดการหุ้น", icon: BuildingLibraryIcon },
  { id: "orders", label: "ธุรกรรม", icon: ClipboardDocumentListIcon },
  { id: "dashboard", label: "Dashboard พฤติกรรม", icon: CpuChipIcon },
  { id: "configs", label: "ตั้งค่าระบบวิเคราะห์", icon: Cog6ToothIcon },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "ADMIN")) {
      const timer = setTimeout(() => router.push("/"), 3000);
      return () => clearTimeout(timer);
    }
  }, [user, isLoading, router]);

  // ---- Loading State ----
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted">
          <div className="w-10 h-10 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
          <p className="text-sm">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  // ---- Access Denied ----
  if (!user || user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-5 max-w-sm mx-auto px-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center">
              <LockClosedIcon className="w-10 h-10 text-red-400" />
            </div>
          </div>
          {/* Message */}
          <div>
            <h2 className="text-2xl font-extrabold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted text-sm leading-relaxed">
              {!user
                ? "กรุณาเข้าสู่ระบบก่อนเข้าใช้งานหน้านี้"
                : "คุณไม่มีสิทธิ์เข้าถึงหน้า Admin Panel"}
            </p>
            <p className="text-xs text-muted/60 mt-3">กำลังพาคุณกลับหน้าหลักใน 3 วินาที...</p>
          </div>
          {/* Redirect button */}
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gold text-black font-bold rounded-xl hover:bg-gold/90 transition-all duration-200 text-sm"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <main className="">
        {/* Header */}
        <div className="bg-surface border-b border-theme-border">
          <div className="container mx-auto px-4 py-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gold/10 rounded-xl">
                <ShieldCheckIcon className="w-7 h-7 text-gold" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                  Admin Control Panel
                </h1>
                <p className="text-sm text-muted">ระบบบริหารจัดการ SimTrade</p>
              </div>
            </div>

            {/* Tab Bar */}
            <div className="mt-5 flex gap-1 overflow-x-auto pb-px scrollbar-hide">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-semibold whitespace-nowrap transition-all border-b-2 ${
                      isActive
                        ? "border-gold text-gold bg-gold/5"
                        : "border-transparent text-muted hover:text-foreground hover:bg-background"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="container mx-auto px-4 py-6">
          {activeTab === "overview" && <AdminOverviewTab />}
          {activeTab === "users" && <AdminUserTab />}
          {activeTab === "stocks" && <AdminStockTab />}
          {activeTab === "orders" && <AdminOrderTab />}
          {activeTab === "dashboard" && <AdminDashboardTab />}
          {activeTab === "configs" && <AdminConfigTab />}
        </div>
      </main>
    </div>
  );
}