"use client";

import React, { useState } from "react";
import {
  UsersIcon, ChartBarIcon, ShieldCheckIcon,
  BuildingLibraryIcon, ClipboardDocumentListIcon,
  ArrowTrendingUpIcon, CpuChipIcon, Cog6ToothIcon
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