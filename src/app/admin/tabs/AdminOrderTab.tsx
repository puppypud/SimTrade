"use client";
import React, { useEffect, useState } from "react";
import { brokerService } from "@/src/app/services/brokerService";
import { MagnifyingGlassIcon, XCircleIcon } from "@heroicons/react/24/outline";

interface OrderRow {
  id: string; symbol: string; side: string; orderType: string; status: string;
  qty: number; filledQty: number; filledAvgPrice: number; commission: number;
  limitPrice: number; notional: number; submittedAt: string; filledAt: string;
  userId: number; userEmail: string; userName: string; alpacaAccountId: string; assetClass: string;
}

const STATUS_OPTS = ["all","FILLED","CANCELED","NEW","PENDING","ACCEPTED","REJECTED","EXPIRED"];
const SIDE_OPTS = ["all","BUY","SELL"];

const statusColor: Record<string, string> = {
  FILLED: "bg-green-500/10 text-green-400",
  CANCELED: "bg-red-500/10 text-red-400",
  NEW: "bg-blue-500/10 text-blue-400",
  PENDING: "bg-yellow-500/10 text-yellow-400",
  ACCEPTED: "bg-purple-500/10 text-purple-400",
  REJECTED: "bg-red-500/10 text-red-500",
  EXPIRED: "bg-gray-500/10 text-gray-400",
};

export default function AdminOrderTab() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [symbol, setSymbol] = useState("");
  const [status, setStatus] = useState("all");
  const [side, setSide] = useState("all");
  const [canceling, setCanceling] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const PAGE_SIZE = 50;

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const load = async (p = 0) => {
    setLoading(true);
    try {
      const res = await brokerService.adminGetAllOrders({
        page: p, size: PAGE_SIZE,
        symbol: symbol || undefined,
        status: status !== "all" ? status : undefined,
        side: side !== "all" ? side : undefined,
      });
      setOrders(res.data || []);
      setSummary(res.summary || {});
      setTotal(res.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { setPage(0); load(0); }, [symbol, status, side]);

  const handleCancel = async (orderId: string) => {
    if (!confirm(`ยืนยันยกเลิกออเดอร์ ${orderId}?`)) return;
    setCanceling(orderId);
    try {
      await brokerService.adminCancelOrder(orderId);
      showToast(`✅ ยกเลิกออเดอร์ ${orderId} สำเร็จ`);
      await load(page);
    } catch (e: any) {
      showToast(`❌ ${e?.response?.data?.error || "ยกเลิกไม่สำเร็จ"}`);
    } finally { setCanceling(null); }
  };

  const fmt = (n: number | null) => n != null ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n) : "-";
  const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";

  const canCancel = (st: string) => !["FILLED","CANCELED","EXPIRED","REJECTED"].includes(st?.toUpperCase());

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed bottom-6 right-6 z-[200] bg-surface border border-theme-border rounded-2xl shadow-2xl px-5 py-3 text-sm font-semibold text-foreground">
          {toast}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Volume", value: fmt(summary.totalVolume), color: "text-gold" },
          { label: "Total Commission", value: fmt(summary.totalCommission), color: "text-green-400" },
          { label: "Buy Orders", value: summary.buyCount ?? "-", color: "text-green-400" },
          { label: "Sell Orders", value: summary.sellCount ?? "-", color: "text-red-400" },
        ].map(card => (
          <div key={card.label} className="bg-surface rounded-2xl border border-theme-border p-4">
            <div className="text-xs text-muted uppercase font-semibold mb-1">{card.label}</div>
            <div className={`text-xl font-extrabold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="Symbol เช่น AAPL"
            className="pl-9 pr-3 py-2.5 text-sm rounded-xl border border-theme-border bg-background text-foreground w-40 focus:ring-2 focus:ring-gold/50 outline-none" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="px-3 py-2.5 text-sm rounded-xl border border-theme-border bg-background text-foreground focus:ring-2 focus:ring-gold/50 outline-none">
          {STATUS_OPTS.map(s => <option key={s} value={s}>{s === "all" ? "ทุกสถานะ" : s}</option>)}
        </select>
        <select value={side} onChange={e => setSide(e.target.value)}
          className="px-3 py-2.5 text-sm rounded-xl border border-theme-border bg-background text-foreground focus:ring-2 focus:ring-gold/50 outline-none">
          {SIDE_OPTS.map(s => <option key={s} value={s}>{s === "all" ? "BUY & SELL" : s}</option>)}
        </select>
        <span className="text-sm text-muted flex-1">{total} ธุรกรรม</span>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-theme-border overflow-hidden">
        {loading ? <div className="p-12 text-center text-muted animate-pulse">กำลังโหลด...</div> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-theme-border">
              <thead className="bg-background">
                <tr>
                  {["Symbol","Side","Type","Status","Qty","ราคา","มูลค่า","Commission","ผู้ใช้","วันที่","ยกเลิก"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-background transition-colors">
                    <td className="px-4 py-3 font-bold text-sm text-foreground">{o.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${o.side === "BUY" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{o.side}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{o.orderType}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${statusColor[o.status] || "bg-theme-border text-muted"}`}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{o.filledQty ?? o.qty ?? "-"}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{fmt(o.filledAvgPrice || o.limitPrice)}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{fmt(o.notional || (o.filledAvgPrice && o.filledQty ? o.filledAvgPrice * o.filledQty : null))}</td>
                    <td className="px-4 py-3 text-sm text-green-400">{o.commission ? fmt(o.commission) : "-"}</td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-foreground font-medium">{o.userName}</div>
                      <div className="text-xs text-muted truncate max-w-[120px]">{o.userEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{fmtDate(o.submittedAt)}</td>
                    <td className="px-4 py-3">
                      {canCancel(o.status) ? (
                        <button onClick={() => handleCancel(o.id)} disabled={canceling === o.id}
                          title="ยกเลิกออเดอร์"
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors">
                          {canceling === o.id ? <span className="text-xs px-1">...</span> : <XCircleIcon className="w-4 h-4" />}
                        </button>
                      ) : <span className="text-muted text-xs">-</span>}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={11} className="py-10 text-center text-muted">ไม่พบธุรกรรม</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3">
          <button disabled={page === 0} onClick={() => { setPage(p => p - 1); load(page - 1); }}
            className="px-4 py-2 rounded-xl border border-theme-border text-sm font-semibold text-muted hover:bg-background disabled:opacity-40 transition-colors">← ก่อนหน้า</button>
          <span className="text-sm text-muted">หน้า {page + 1} / {Math.ceil(total / PAGE_SIZE)}</span>
          <button disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => { setPage(p => p + 1); load(page + 1); }}
            className="px-4 py-2 rounded-xl border border-theme-border text-sm font-semibold text-muted hover:bg-background disabled:opacity-40 transition-colors">ถัดไป →</button>
        </div>
      )}
    </div>
  );
}
