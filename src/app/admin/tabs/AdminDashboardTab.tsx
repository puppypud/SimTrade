"use client";
import React, { useEffect, useState } from "react";
import { brokerService } from "@/src/app/services/brokerService";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

export default function AdminDashboardTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await brokerService.adminGetDashboardStats();
      setStats(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="p-12 text-center text-muted animate-pulse">กำลังโหลดข้อมูล Dashboard...</div>;
  if (!stats) return <div className="p-12 text-center text-red-400">โหลดข้อมูลไม่สำเร็จ</div>;

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
  const fmtN = (n: number) => new Intl.NumberFormat("en-US").format(n || 0);

  // Build bar chart data
  const dailyVolumeEntries = Object.entries(stats.dailyVolume || {}).slice(-14) as [string, number][];
  const maxVol = Math.max(...dailyVolumeEntries.map(([, v]) => v), 1);

  // Trader type colors
  const typeColors: Record<string, string> = {
    "Day Trader": "#f59e0b", "Swing Trader": "#8b5cf6",
    "Position Trader": "#10b981", Unknown: "#6b7280",
  };
  const riskColors: Record<string, string> = {
    Conservative: "#10b981", Moderate: "#f59e0b", Aggressive: "#ef4444", Unknown: "#6b7280",
  };

  const totalTraders = Object.values(stats.traderTypeDistribution || {}).reduce((a: any, b: any) => a + b, 0) as number;
  const totalRisk = Object.values(stats.riskBehaviorDistribution || {}).reduce((a: any, b: any) => a + b, 0) as number;

  return (
    <div className="space-y-6">
      {/* Refresh */}
      <div className="flex justify-end">
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-theme-border text-sm text-muted hover:bg-background transition-colors">
          <ArrowPathIcon className="w-4 h-4" /> รีเฟรช
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Volume", value: fmt(stats.totalVolume), color: "text-gold" },
          { label: "Total Commission", value: fmt(stats.totalCommission), color: "text-green-400" },
          { label: "Total Orders", value: fmtN(stats.totalOrders), color: "text-blue-400" },
          { label: "Total Users", value: fmtN(stats.totalUsers), color: "text-purple-400" },
        ].map(c => (
          <div key={c.label} className="bg-surface rounded-2xl border border-theme-border p-5">
            <div className="text-xs text-muted uppercase font-semibold mb-2">{c.label}</div>
            <div className={`text-2xl font-extrabold ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Daily Volume Bar Chart */}
        <div className="bg-surface rounded-2xl border border-theme-border p-5">
          <h3 className="text-sm font-bold text-foreground mb-4">📈 ปริมาณซื้อขายรายวัน (14 วัน)</h3>
          {dailyVolumeEntries.length === 0 ? (
            <p className="text-muted text-sm text-center py-8">ไม่มีข้อมูล</p>
          ) : (
            <div className="flex items-end gap-1 h-40">
              {dailyVolumeEntries.map(([date, vol]) => {
                const h = Math.max((vol / maxVol) * 100, 4);
                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="relative w-full">
                      <div className="w-full rounded-t-sm bg-gold/70 hover:bg-gold transition-all cursor-pointer"
                        style={{ height: `${(h / 100) * 128}px` }}
                        title={`${date}: ${fmt(vol)}`} />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-surface border border-theme-border text-xs text-foreground px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                        {fmt(vol)}
                      </div>
                    </div>
                    <span className="text-[9px] text-muted transform -rotate-45 origin-center truncate w-6">{date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Buy vs Sell */}
        <div className="bg-surface rounded-2xl border border-theme-border p-5">
          <h3 className="text-sm font-bold text-foreground mb-4">📊 สัดส่วน Buy / Sell</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-green-400 font-semibold">BUY</span>
                <span className="text-green-400 font-bold">{stats.buyOrders}</span>
              </div>
              <div className="h-3 bg-theme-border rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${stats.totalOrders ? (stats.buyOrders / stats.totalOrders) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-red-400 font-semibold">SELL</span>
                <span className="text-red-400 font-bold">{stats.sellOrders}</span>
              </div>
              <div className="h-3 bg-theme-border rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full transition-all"
                  style={{ width: `${stats.totalOrders ? (stats.sellOrders / stats.totalOrders) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
          {/* Status breakdown */}
          <h4 className="text-xs font-bold text-muted uppercase mt-4 mb-2">Order Status</h4>
          <div className="space-y-1.5">
            {Object.entries(stats.statusBreakdown || {}).map(([st, count]: any) => (
              <div key={st} className="flex items-center gap-2">
                <span className="text-xs text-muted w-20 truncate">{st}</span>
                <div className="flex-1 h-2 bg-theme-border rounded-full overflow-hidden">
                  <div className="h-full bg-gold/60 rounded-full" style={{ width: `${(count / stats.totalOrders) * 100}%` }} />
                </div>
                <span className="text-xs font-bold text-foreground w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2: Behavior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Trader Type Donut */}
        <div className="bg-surface rounded-2xl border border-theme-border p-5">
          <h3 className="text-sm font-bold text-foreground mb-4">🧬 ประเภทนักเทรด</h3>
          <div className="space-y-3">
            {Object.entries(stats.traderTypeDistribution || {}).map(([type, count]: any) => {
              const pct = totalTraders > 0 ? Math.round((count / totalTraders) * 100) : 0;
              const color = typeColors[type] || "#6b7280";
              return (
                <div key={type}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold" style={{ color }}>{type}</span>
                    <span className="text-muted">{count} คน ({pct}%)</span>
                  </div>
                  <div className="h-2.5 bg-theme-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Risk Behavior */}
        <div className="bg-surface rounded-2xl border border-theme-border p-5">
          <h3 className="text-sm font-bold text-foreground mb-4">⚠️ ระดับความเสี่ยง</h3>
          <div className="space-y-3">
            {Object.entries(stats.riskBehaviorDistribution || {}).map(([risk, count]: any) => {
              const pct = totalRisk > 0 ? Math.round((count / totalRisk) * 100) : 0;
              const color = riskColors[risk] || "#6b7280";
              return (
                <div key={risk}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold" style={{ color }}>{risk}</span>
                    <span className="text-muted">{count} คน ({pct}%)</span>
                  </div>
                  <div className="h-2.5 bg-theme-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 10 Traded Symbols */}
        <div className="bg-surface rounded-2xl border border-theme-border p-5">
          <h3 className="text-sm font-bold text-foreground mb-4">🏆 หุ้นยอดนิยม Top 10</h3>
          <div className="space-y-2">
            {(stats.topSymbols || []).map((item: any, i: number) => {
              const maxCount = stats.topSymbols[0]?.count || 1;
              const pct = Math.round((item.count / maxCount) * 100);
              return (
                <div key={item.symbol} className="flex items-center gap-2">
                  <span className="text-xs text-muted w-4 text-right">{i + 1}</span>
                  <span className="text-xs font-bold text-foreground w-12">{item.symbol}</span>
                  <div className="flex-1 h-2 bg-theme-border rounded-full overflow-hidden">
                    <div className="h-full bg-gold/70 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted w-8 text-right">{item.count}</span>
                </div>
              );
            })}
            {(!stats.topSymbols || stats.topSymbols.length === 0) && (
              <p className="text-xs text-muted text-center py-4">ไม่มีข้อมูล</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
