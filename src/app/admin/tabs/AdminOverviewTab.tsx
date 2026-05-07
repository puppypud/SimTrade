"use client";
import React, { useEffect, useState } from "react";
import { brokerService } from "@/src/app/services/brokerService";
import {
  BanknotesIcon, UsersIcon, CurrencyDollarIcon,
  ShoppingCartIcon, ChartBarIcon, ArrowTrendingUpIcon
} from "@heroicons/react/24/outline";
import FundFirmModal from "@/src/app/components/features/FundFirmModal";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function AdminOverviewTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [totalFee, setTotalFee] = useState<number>(0);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [feeGraphData, setFeeGraphData] = useState<{ date: string; amount: number; count: number }[]>([]);
  const [topAssets, setTopAssets] = useState<{ symbol: string; count: number }[]>([]);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFundFirmOpen, setIsFundFirmOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersData, statusData] = await Promise.all([
        brokerService.getAllAccounts(),
        brokerService.getMarketStatus(),
      ]);
      setUsers(usersData);
      setIsMaintenance(statusData.isMaintenanceMode);

      let commissions = 0;
      let orderCount = 0;
      const dailyMap: Record<string, { amount: number; count: number }> = {};
      const symbolMap: Record<string, number> = {};

      const userOrders = await Promise.all(
        usersData.map(async (u: any) => {
          if (u.alpacaAccountId) {
            try { return await brokerService.getAllOrders(u.alpacaAccountId); } catch { return []; }
          }
          return [];
        })
      );

      const allOrders = userOrders.flat();
      setTotalOrders(allOrders.length);

      allOrders.forEach((order: any) => {
        // Commission calculation
        const comm = Number(order.commission || 0);
        commissions += comm;
        
        // Date mapping
        const raw = order.filledAt || order.submittedAt || new Date().toISOString();
        const d = typeof raw === "string" ? raw.split("T")[0] : new Date(raw).toISOString().split("T")[0];
        
        if (!dailyMap[d]) dailyMap[d] = { amount: 0, count: 0 };
        dailyMap[d].amount += comm;
        dailyMap[d].count += 1;

        // Symbol popularity
        const sym = order.symbol;
        if (sym) {
          symbolMap[sym] = (symbolMap[sym] || 0) + 1;
        }
      });

      setTotalFee(commissions);

      // Prepare daily graph data
      const sortedDates = Object.keys(dailyMap).sort();
      let finalDaily = sortedDates.map(d => ({ date: d, ...dailyMap[d] }));
      
      if (finalDaily.length < 7) {
        const today = new Date();
        finalDaily = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date(today); d.setDate(d.getDate() - (6 - i));
          const dateStr = d.toISOString().split("T")[0];
          return { date: dateStr, amount: dailyMap[dateStr]?.amount || 0, count: dailyMap[dateStr]?.count || 0 };
        });
      }
      setFeeGraphData(finalDaily.slice(-14));

      // Prepare top assets data
      const sortedAssets = Object.entries(symbolMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([symbol, count]) => ({ symbol, count }));
      setTopAssets(sortedAssets);

    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleToggleMaintenance = async () => {
    if (!confirm(`ต้องการ ${isMaintenance ? "เปิด" : "ปิด"}ระบบการซื้อขายไหม?`)) return;
    try {
      const msg = !isMaintenance ? "ระบบอยู่ระหว่างการบำรุงรักษา ไม่สามารถซื้อขายได้ชั่วคราว" : "";
      await brokerService.toggleMaintenance(!isMaintenance, msg);
      setIsMaintenance(!isMaintenance);
    } catch (e) { alert("ดำเนินการไม่สำเร็จ"); }
  };

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  // Chart Configs
  const activityChartOptions: any = {
    chart: { type: 'area', toolbar: { show: false }, background: 'transparent' },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05 } },
    colors: ['#eab308', '#22c55e'], // Gold and Green
    xaxis: { categories: feeGraphData.map(d => d.date), labels: { style: { colors: '#94a3b8' } } },
    yaxis: { labels: { style: { colors: '#94a3b8' } } },
    grid: { borderColor: 'rgba(148, 163, 184, 0.1)' },
    tooltip: { theme: 'dark' },
    dataLabels: { enabled: false },
    legend: { labels: { colors: '#94a3b8' }, position: 'top' }
  };

  const activitySeries = [
    { name: 'Order Count (จำนวนคำสั่งซื้อ)', data: feeGraphData.map(d => d.count) },
    { name: 'Commission ($) (ค่าธรรมเนียม)', data: feeGraphData.map(d => d.amount.toFixed(2)) }
  ];

  const topAssetsOptions: any = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, horizontal: true } },
    colors: ['#eab308'],
    xaxis: { categories: topAssets.map(a => a.symbol), labels: { style: { colors: '#94a3b8' } } },
    yaxis: { labels: { style: { colors: '#94a3b8' } } },
    grid: { show: false },
    tooltip: { theme: 'dark' },
    dataLabels: { enabled: true, style: { colors: ['#000'] } }
  };

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-surface rounded-2xl border border-theme-border p-5">
          <div className="flex items-center gap-3 mb-2 text-green-500">
            <BanknotesIcon className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Commission (ค่าธรรมเนียมรวม)</span>
          </div>
          <div className="text-2xl font-black">{loading ? "..." : fmt(totalFee)}</div>
        </div>

        <div className="bg-surface rounded-2xl border border-theme-border p-5">
          <div className="flex items-center gap-3 mb-2 text-gold">
            <UsersIcon className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Traders (จำนวนนักลงทุน)</span>
          </div>
          <div className="text-2xl font-black">{loading ? "..." : users.length}</div>
        </div>

        <div className="bg-surface rounded-2xl border border-theme-border p-5">
          <div className="flex items-center gap-3 mb-2 text-blue-500">
            <ShoppingCartIcon className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Orders (จำนวนคำสั่งซื้อ)</span>
          </div>
          <div className="text-2xl font-black">{loading ? "..." : totalOrders}</div>
        </div>

        <div className="bg-surface rounded-2xl border border-theme-border p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-emerald-500">
              <CurrencyDollarIcon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">System Status (สถานะระบบ)</span>
            </div>
            <div className={`w-2 h-2 rounded-full animate-pulse ${isMaintenance ? "bg-red-500" : "bg-emerald-500"}`} />
          </div>
          <button onClick={handleToggleMaintenance} className="text-xs font-bold text-muted hover:text-foreground transition-colors">
            {isMaintenance ? "🔴 System Maintenance" : "🟢 Fully Operational"}
          </button>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-theme-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <ArrowTrendingUpIcon className="w-4 h-4 text-gold" />
              Platform Activity (แนวโน้มกิจกรรมของแพลตฟอร์ม)
            </h3>
            <span className="text-[10px] text-muted font-medium">Orders vs Commission (จำนวนคำสั่งซื้อ และ ค่าธรรมเนียม)</span>
          </div>
          <div className="h-[300px]">
            {!loading && <Chart options={activityChartOptions} series={activitySeries} type="area" height="100%" />}
          </div>
        </div>

        {/* Top Assets */}
        <div className="bg-surface rounded-2xl border border-theme-border p-6">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-6">
            <ChartBarIcon className="w-4 h-4 text-gold" />
            Most Traded Assets (หุ้น/เหรียญที่นิยมสูงสุด)
          </h3>
          <div className="h-[300px]">
            {!loading && topAssets.length > 0 ? (
              <Chart options={topAssetsOptions} series={[{ data: topAssets.map(a => a.count) }]} type="bar" height="100%" />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted">No trading data yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions & Maintenance */}
      <div className="bg-surface rounded-2xl border border-theme-border p-6 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-sm">Maintenance Controls</h4>
          <p className="text-xs text-muted">Manage system uptime and corporate liquidity</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsFundFirmOpen(true)} className="px-4 py-2 bg-gold/10 text-gold border border-gold/30 rounded-xl text-xs font-bold hover:bg-gold/20 transition-all">
            💰 Fund Firm Account
          </button>
          <button onClick={handleToggleMaintenance} className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all ${isMaintenance ? "bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20"}`}>
            {isMaintenance ? "🟢 Enable Trading" : "🔴 Disable Trading"}
          </button>
        </div>
      </div>

      <FundFirmModal isOpen={isFundFirmOpen} onClose={() => setIsFundFirmOpen(false)} onSuccess={fetchData} />
    </div>
  );
}
