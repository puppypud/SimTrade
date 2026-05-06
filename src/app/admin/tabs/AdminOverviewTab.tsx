"use client";
import React, { useEffect, useState } from "react";
import { brokerService } from "@/src/app/services/brokerService";
import {
  BanknotesIcon, UsersIcon, CurrencyDollarIcon,
  ArrowUpIcon, ArrowDownIcon,
} from "@heroicons/react/24/outline";
import FundFirmModal from "@/src/app/components/features/FundFirmModal";

export default function AdminOverviewTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [totalFee, setTotalFee] = useState<number>(0);
  const [feeGraphData, setFeeGraphData] = useState<{ date: string; amount: number }[]>([]);
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

      // Fee graph
      let commissions = 0;
      const dailyMap: Record<string, number> = {};
      const userOrders = await Promise.all(
        usersData.map(async (u: any) => {
          if (u.alpacaAccountId) {
            try { return await brokerService.getAllOrders(u.alpacaAccountId); } catch { return []; }
          }
          return [];
        })
      );
      userOrders.flat().forEach((order: any) => {
        const comm = Number(order.commission || 0);
        if (comm > 0) {
          commissions += comm;
          const raw = order.filledAt || order.submittedAt || new Date().toISOString();
          const d = typeof raw === "string" ? raw.split("T")[0] : new Date(raw).toISOString().split("T")[0];
          dailyMap[d] = (dailyMap[d] || 0) + comm;
        }
      });
      setTotalFee(commissions);
      const sorted = Object.keys(dailyMap).sort().map((date) => ({ date, amount: dailyMap[date] }));
      if (sorted.length === 0) {
        const today = new Date();
        setFeeGraphData(Array.from({ length: 7 }).map((_, i) => {
          const d = new Date(today); d.setDate(d.getDate() - (6 - i));
          return { date: d.toISOString().split("T")[0], amount: 0 };
        }));
      } else {
        setFeeGraphData(sorted.slice(-14));
      }
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

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Fee */}
        <div className="bg-surface rounded-2xl border border-theme-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-500/10 rounded-xl text-green-500">
              <BanknotesIcon className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Total Commission</span>
          </div>
          {loading ? <div className="h-9 w-36 bg-theme-border animate-pulse rounded" /> :
            <div className="text-3xl font-extrabold text-foreground">{fmt(totalFee)}</div>}
          {/* Sparkline */}
          {!loading && (
            <div className="h-12 flex items-end gap-px mt-4 border-t border-theme-border pt-3">
              {feeGraphData.map((d, i) => {
                const max = Math.max(...feeGraphData.map(x => x.amount)) || 1;
                const h = Math.max((d.amount / max) * 100, 5);
                return (
                  <div key={i} className="flex-1 rounded-sm"
                    style={{ height: `${h}%`, background: d.amount > 0 ? "#22c55e" : "var(--color-border)" }}
                    title={`${d.date}: ${fmt(d.amount)}`} />
                );
              })}
            </div>
          )}
        </div>

        {/* Total Users */}
        <div className="bg-surface rounded-2xl border border-theme-border p-5 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gold/10 rounded-xl text-gold">
              <UsersIcon className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Total Users</span>
          </div>
          {loading ? <div className="h-9 w-24 bg-theme-border animate-pulse rounded" /> :
            <div className="text-3xl font-extrabold text-foreground">
              {users.length} <span className="text-base font-medium text-muted">Accounts</span>
            </div>}
        </div>

        {/* Market Status */}
        <div className="bg-surface rounded-2xl border border-theme-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isMaintenance ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"}`}>
                <CurrencyDollarIcon className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">System Status</span>
            </div>
            <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${isMaintenance ? "bg-red-500/10 text-red-500 border-red-500/30" : "bg-green-500/10 text-green-500 border-green-500/30"}`}>
              {isMaintenance ? "MAINTENANCE" : "ONLINE"}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            <button onClick={handleToggleMaintenance}
              className={`w-full py-2 rounded-xl text-sm font-bold transition-all ${isMaintenance ? "bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/30" : "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/30"}`}>
              {isMaintenance ? "🟢 เปิดระบบซื้อขาย" : "🔴 ปิดระบบซื้อขาย (Maintenance)"}
            </button>
            <button onClick={() => setIsFundFirmOpen(true)}
              className="w-full py-2 rounded-xl text-sm font-bold bg-gold/10 text-gold hover:bg-gold/20 border border-gold/30 transition-all">
              💰 Fund Firm Account
            </button>
          </div>
        </div>
      </div>

      <FundFirmModal isOpen={isFundFirmOpen} onClose={() => setIsFundFirmOpen(false)} onSuccess={fetchData} />
    </div>
  );
}
