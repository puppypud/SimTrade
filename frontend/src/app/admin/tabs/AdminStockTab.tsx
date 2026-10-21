"use client";
import React, { useEffect, useState } from "react";
import { brokerService } from "@/src/app/services/brokerService";
import {
  MagnifyingGlassIcon, PlusIcon, PencilSquareIcon,
  XMarkIcon, CheckIcon, EyeSlashIcon, EyeIcon,
} from "@heroicons/react/24/outline";

const CATEGORIES = ["STABLE", "SWING", "TRENDING", "SPECULATIVE"];
const ASSET_CLASSES = ["US_EQUITY", "CRYPTO"];

interface StockRow {
  symbol: string; name: string; assetClass: string;
  category: string; industry: string; beta: number;
  marketCap: number; avgVolume: number; tradable: boolean;
}

const emptyForm = { symbol: "", name: "", assetClass: "US_EQUITY", category: "", industry: "", beta: "", marketCap: "", avgVolume: "" };

export default function AdminStockTab() {
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showModal, setShowModal] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<StockRow | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const res = await brokerService.adminGetAllStocks({ keyword: search || undefined, category: categoryFilter || undefined });
      setStocks(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, categoryFilter]);

  const openAdd = () => { setForm({ ...emptyForm }); setEditTarget(null); setShowModal("add"); };
  const openEdit = (s: StockRow) => {
    setEditTarget(s);
    setForm({ symbol: s.symbol, name: s.name, assetClass: s.assetClass || "US_EQUITY", category: s.category || "", industry: s.industry || "", beta: s.beta?.toString() || "", marketCap: s.marketCap?.toString() || "", avgVolume: s.avgVolume?.toString() || "" });
    setShowModal("edit");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        symbol: form.symbol.toUpperCase(), name: form.name, assetClass: form.assetClass,
        category: form.category || undefined, industry: form.industry || undefined,
        beta: form.beta ? parseFloat(form.beta) : undefined,
        marketCap: form.marketCap ? parseInt(form.marketCap) : undefined,
        avgVolume: form.avgVolume ? parseInt(form.avgVolume) : undefined,
      };
      if (showModal === "add") {
        await brokerService.adminAddStock(payload);
        showToast(`✅ เพิ่มหุ้น ${payload.symbol} สำเร็จ`);
      } else if (editTarget) {
        await brokerService.adminUpdateStock(editTarget.symbol, payload);
        showToast(`✅ อัปเดต ${editTarget.symbol} สำเร็จ`);
      }
      setShowModal(null);
      await load();
    } catch (e: any) { showToast(`❌ ${e?.response?.data?.error || "ดำเนินการไม่สำเร็จ"}`); }
    finally { setSaving(false); }
  };

  const handleToggle = async (s: StockRow) => {
    try {
      await brokerService.adminUpdateStock(s.symbol, { isTradable: !s.tradable });
      showToast(`${!s.tradable ? "✅ เปิด" : "🚫 ปิด"}การซื้อขาย ${s.symbol}`);
      await load();
    } catch { showToast("❌ ดำเนินการไม่สำเร็จ"); }
  };

  const handleDelete = async (s: StockRow) => {
    if (!confirm(`ยืนยันปิดการซื้อขาย ${s.symbol}?`)) return;
    try {
      await brokerService.adminRemoveStock(s.symbol);
      showToast(`🚫 ปิดการซื้อขาย ${s.symbol} สำเร็จ`);
      await load();
    } catch { showToast("❌ ดำเนินการไม่สำเร็จ"); }
  };

  const catColor: Record<string, string> = {
    STABLE: "bg-blue-500/10 text-blue-400", SWING: "bg-purple-500/10 text-purple-400",
    TRENDING: "bg-green-500/10 text-green-400", SPECULATIVE: "bg-orange-500/10 text-orange-400",
  };

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[200] bg-surface border border-theme-border rounded-2xl shadow-2xl px-5 py-3 text-sm font-semibold text-foreground animate-fade-in">
          {toast}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาหุ้น..."
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-theme-border bg-background text-foreground focus:ring-2 focus:ring-gold/50 outline-none" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 text-sm rounded-xl border border-theme-border bg-background text-foreground focus:ring-2 focus:ring-gold/50 outline-none">
          <option value="">ทุก Category</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-sm text-muted flex-1">{stocks.length} หลักทรัพย์</span>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-gold text-black rounded-xl font-bold text-sm hover:bg-gold/90 transition-colors">
          <PlusIcon className="w-4 h-4" /> เพิ่มหุ้น
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-theme-border overflow-hidden">
        {loading ? <div className="p-12 text-center text-muted animate-pulse">กำลังโหลด...</div> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-theme-border">
              <thead className="bg-background">
                <tr>
                  {["Symbol","ชื่อ","AssetClass","Category","Industry","Tradable","จัดการ"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {stocks.map(s => (
                  <tr key={s.symbol} className={`hover:bg-background transition-colors ${!s.tradable ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 font-bold text-foreground text-sm">{s.symbol}</td>
                    <td className="px-4 py-3 text-sm text-muted max-w-[180px] truncate">{s.name}</td>
                    <td className="px-4 py-3 text-xs text-muted">{s.assetClass}</td>
                    <td className="px-4 py-3">
                      {s.category ? (
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${catColor[s.category] || "bg-theme-border text-muted"}`}>{s.category}</span>
                      ) : <span className="text-muted text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted truncate max-w-[120px]">{s.industry || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${s.tradable ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                        {s.tradable ? "เปิด" : "ปิด"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(s)} title="แก้ไข"
                          className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggle(s)} title={s.tradable ? "ปิดการซื้อขาย" : "เปิดการซื้อขาย"}
                          className={`p-1.5 rounded-lg transition-colors ${s.tradable ? "bg-orange-500/10 text-orange-400 hover:bg-orange-500/20" : "bg-green-500/10 text-green-400 hover:bg-green-500/20"}`}>
                          {s.tradable ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDelete(s)} title="ปิดถาวร"
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl border border-theme-border w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border">
              <h3 className="font-bold text-foreground">{showModal === "add" ? "เพิ่มหุ้นใหม่" : `แก้ไข ${editTarget?.symbol}`}</h3>
              <button onClick={() => setShowModal(null)} className="p-1.5 rounded-lg hover:bg-background text-muted"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {showModal === "add" && (
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-muted uppercase">Symbol *</label>
                  <input value={form.symbol} onChange={e => setForm(p => ({ ...p, symbol: e.target.value }))}
                    placeholder="เช่น AAPL"
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-theme-border bg-background text-foreground text-sm focus:ring-2 focus:ring-gold/50 outline-none uppercase" />
                </div>
              )}
              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted uppercase">ชื่อบริษัท *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="เช่น Apple Inc."
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-theme-border bg-background text-foreground text-sm focus:ring-2 focus:ring-gold/50 outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted uppercase">Asset Class</label>
                <select value={form.assetClass} onChange={e => setForm(p => ({ ...p, assetClass: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-theme-border bg-background text-foreground text-sm focus:ring-2 focus:ring-gold/50 outline-none">
                  {ASSET_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted uppercase">Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-theme-border bg-background text-foreground text-sm focus:ring-2 focus:ring-gold/50 outline-none">
                  <option value="">-- ไม่ระบุ --</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted uppercase">Industry</label>
                <input value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}
                  placeholder="เช่น Technology"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-theme-border bg-background text-foreground text-sm focus:ring-2 focus:ring-gold/50 outline-none" />
              </div>
              {[{ label: "Beta", key: "beta", placeholder: "เช่น 1.23" },
                { label: "Market Cap", key: "marketCap", placeholder: "หน่วยดอลลาร์" },
                { label: "Avg Volume", key: "avgVolume", placeholder: "จำนวนหุ้น/วัน" }].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-muted uppercase">{label}</label>
                  <input type="number" value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-theme-border bg-background text-foreground text-sm focus:ring-2 focus:ring-gold/50 outline-none" />
                </div>
              ))}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowModal(null)} className="flex-1 py-2.5 rounded-xl border border-theme-border text-muted text-sm font-semibold hover:bg-background transition-colors">ยกเลิก</button>
              <button onClick={handleSave} disabled={saving || !form.name}
                className="flex-1 py-2.5 rounded-xl bg-gold text-black text-sm font-bold hover:bg-gold/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {saving ? "กำลังบันทึก..." : <><CheckIcon className="w-4 h-4" /> บันทึก</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
