"use client";
import React, { useEffect, useState } from "react";
import { brokerService } from "@/src/app/services/brokerService";
import {
  MagnifyingGlassIcon, PencilSquareIcon, TrashIcon,
  CurrencyDollarIcon, ChevronDownIcon, ChevronUpIcon,
  XMarkIcon, CheckIcon, UserPlusIcon,
} from "@heroicons/react/24/outline";
import FundUserModal from "@/src/app/components/features/FundUserModal";

interface LocalUser {
  id: number; email: string; firstName: string; lastName: string;
  phoneNumber: string; status: string; alpacaAccountId: string;
  createdAt: string; traderType: string; riskBehavior: string;
}

export default function AdminUserTab() {
  const [users, setUsers] = useState<LocalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [portfolioData, setPortfolioData] = useState<Record<number, any>>({});
  const [portfolioLoading, setPortfolioLoading] = useState<number | null>(null);
  const [fundUserId, setFundUserId] = useState<{ id: string; name: string } | null>(null);
  const [editUser, setEditUser] = useState<LocalUser | null>(null);
  const [editForm, setEditForm] = useState<Partial<LocalUser>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await brokerService.getAllAccounts();
      setUsers(data as any[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    !search ||
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleExpand = async (u: LocalUser) => {
    if (expandedId === u.id) { setExpandedId(null); return; }
    setExpandedId(u.id);
    if (!portfolioData[u.id]) {
      setPortfolioLoading(u.id);
      try {
        const data = await brokerService.adminGetUserPortfolio(u.id);
        setPortfolioData(prev => ({ ...prev, [u.id]: data }));
      } catch (e) { console.error(e); }
      finally { setPortfolioLoading(null); }
    }
  };

  const handleDelete = async (u: LocalUser) => {
    if (!confirm(`ยืนยันปิดบัญชี "${u.firstName} ${u.lastName}" ?`)) return;
    try {
      await brokerService.adminDeleteUser(u.id);
      await load();
    } catch (e) { alert("ดำเนินการไม่สำเร็จ"); }
  };

  const openEdit = (u: LocalUser) => {
    setEditUser(u);
    setEditForm({ firstName: u.firstName, lastName: u.lastName, phoneNumber: u.phoneNumber, status: u.status, traderType: u.traderType, riskBehavior: u.riskBehavior });
  };

  const saveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await brokerService.adminUpdateUser(editUser.id, editForm);
      await load();
      setEditUser(null);
    } catch (e) { alert("บันทึกไม่สำเร็จ"); }
    finally { setSaving(false); }
  };

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาผู้ใช้งาน..."
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-theme-border bg-background text-foreground focus:ring-2 focus:ring-gold/50 outline-none" />
        </div>
        <span className="text-sm text-muted">{filtered.length} ผู้ใช้งาน</span>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-theme-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted animate-pulse">กำลังโหลด...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-theme-border">
              <thead className="bg-background">
                <tr>
                  {["ชื่อ-นามสกุล","อีเมล","เบอร์โทร","สถานะ","ประเภท","จัดการ"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {filtered.map(u => (
                  <React.Fragment key={u.id}>
                    <tr
                      className={`cursor-pointer transition-colors ${expandedId === u.id ? "bg-background" : "hover:bg-background"}`}
                      onClick={() => toggleExpand(u)}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold text-sm flex-shrink-0">
                            {u.firstName?.[0]}{u.lastName?.[0]}
                          </div>
                          <span className="text-sm font-medium text-foreground">{u.firstName} {u.lastName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-muted">{u.email}</td>
                      <td className="px-5 py-3 text-sm text-muted">{u.phoneNumber || "-"}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${u.status === "ACTIVE" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-400"}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-muted">{u.traderType || "-"}</td>
                      <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setFundUserId({ id: u.alpacaAccountId, name: `${u.firstName} ${u.lastName}` })}
                            title="แจกเงิน"
                            className="p-1.5 rounded-lg bg-gold/10 text-gold hover:bg-gold/20 transition-colors">
                            <CurrencyDollarIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEdit(u)} title="แก้ไข"
                            className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(u)} title="ปิดบัญชี"
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                          {expandedId === u.id ? <ChevronUpIcon className="w-4 h-4 text-gold ml-1" /> : <ChevronDownIcon className="w-4 h-4 text-muted ml-1" />}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Portfolio Row */}
                    {expandedId === u.id && (
                      <tr className="bg-background">
                        <td colSpan={6} className="px-5 py-4">
                          {portfolioLoading === u.id ? (
                            <div className="text-sm text-muted animate-pulse">กำลังโหลดพอร์ต...</div>
                          ) : portfolioData[u.id] ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Account Info */}
                              <div className="bg-surface rounded-xl p-4 border border-theme-border">
                                <h4 className="text-xs font-bold text-gold uppercase mb-3">💰 ยอดเงิน</h4>
                                <div className="space-y-1.5 text-sm">
                                  <div className="flex justify-between"><span className="text-muted">Equity</span><span className="font-semibold">{fmt(portfolioData[u.id]?.account?.equity || 0)}</span></div>
                                  <div className="flex justify-between"><span className="text-muted">Cash</span><span className="font-semibold">{fmt(portfolioData[u.id]?.account?.cash || 0)}</span></div>
                                  <div className="flex justify-between"><span className="text-muted">Buying Power</span><span className="font-semibold text-green-400">{fmt(portfolioData[u.id]?.account?.buyingPower || 0)}</span></div>
                                </div>
                              </div>
                              {/* Positions */}
                              <div className="bg-surface rounded-xl p-4 border border-theme-border">
                                <h4 className="text-xs font-bold text-gold uppercase mb-3">📊 พอร์ตหุ้น ({(portfolioData[u.id]?.positions || []).length} ตัว)</h4>
                                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                  {(portfolioData[u.id]?.positions || []).slice(0, 5).map((p: any) => (
                                    <div key={p.symbol} className="flex justify-between text-sm">
                                      <span className="font-semibold text-foreground">{p.symbol}</span>
                                      <span className={`text-xs ${Number(p.unrealizedPl) >= 0 ? "text-green-400" : "text-red-400"}`}>
                                        {Number(p.unrealizedPl) >= 0 ? "+" : ""}{fmt(Number(p.unrealizedPl))}
                                      </span>
                                    </div>
                                  ))}
                                  {(portfolioData[u.id]?.positions || []).length === 0 && <p className="text-xs text-muted">ไม่มีหุ้นในพอร์ต</p>}
                                </div>
                              </div>
                              {/* Recent Orders */}
                              <div className="bg-surface rounded-xl p-4 border border-theme-border">
                                <h4 className="text-xs font-bold text-gold uppercase mb-3">📋 ออเดอร์ล่าสุด</h4>
                                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                  {(portfolioData[u.id]?.recentOrders || []).slice(0, 5).map((o: any) => (
                                    <div key={o.id} className="flex justify-between text-xs">
                                      <span className="font-semibold text-foreground">{o.symbol}</span>
                                      <span className={`px-1.5 py-0.5 rounded font-bold ${o.side === "BUY" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{o.side}</span>
                                      <span className="text-muted">{o.status}</span>
                                    </div>
                                  ))}
                                  {(portfolioData[u.id]?.recentOrders || []).length === 0 && <p className="text-xs text-muted">ไม่มีประวัติ</p>}
                                </div>
                              </div>
                            </div>
                          ) : <p className="text-sm text-muted">ไม่สามารถดึงข้อมูลได้</p>}
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

      {/* Fund User Modal */}
      {fundUserId && (
        <FundUserModal isOpen={!!fundUserId} onClose={() => setFundUserId(null)}
          onSuccess={load} userId={fundUserId.id} userName={fundUserId.name} />
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl border border-theme-border w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border">
              <h3 className="font-bold text-foreground">แก้ไขข้อมูลผู้ใช้</h3>
              <button onClick={() => setEditUser(null)} className="p-1.5 rounded-lg hover:bg-background text-muted"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: "ชื่อ", key: "firstName" }, { label: "นามสกุล", key: "lastName" },
                { label: "เบอร์โทร", key: "phoneNumber" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-muted uppercase">{label}</label>
                  <input value={(editForm as any)[key] || ""}
                    onChange={e => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-theme-border bg-background text-foreground text-sm focus:ring-2 focus:ring-gold/50 outline-none" />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-muted uppercase">สถานะ</label>
                <select value={editForm.status || ""} onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-theme-border bg-background text-foreground text-sm focus:ring-2 focus:ring-gold/50 outline-none">
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted uppercase">Trader Type</label>
                <select value={editForm.traderType || ""} onChange={e => setEditForm(prev => ({ ...prev, traderType: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-theme-border bg-background text-foreground text-sm focus:ring-2 focus:ring-gold/50 outline-none">
                  <option value="">-- เลือก --</option>
                  <option value="Day Trader">Day Trader</option>
                  <option value="Swing Trader">Swing Trader</option>
                  <option value="Position Trader">Position Trader</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted uppercase">Risk Behavior</label>
                <select value={editForm.riskBehavior || ""} onChange={e => setEditForm(prev => ({ ...prev, riskBehavior: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-theme-border bg-background text-foreground text-sm focus:ring-2 focus:ring-gold/50 outline-none">
                  <option value="">-- เลือก --</option>
                  <option value="Conservative">Conservative</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Aggressive">Aggressive</option>
                </select>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setEditUser(null)} className="flex-1 py-2.5 rounded-xl border border-theme-border text-muted text-sm font-semibold hover:bg-background transition-colors">ยกเลิก</button>
              <button onClick={saveEdit} disabled={saving}
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
