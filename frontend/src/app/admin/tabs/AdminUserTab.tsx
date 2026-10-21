"use client";
import React, { useEffect, useState } from "react";
import { brokerService } from "@/src/app/services/brokerService";
import {
  MagnifyingGlassIcon, PencilSquareIcon, TrashIcon,
  CurrencyDollarIcon, ChevronDownIcon, ChevronUpIcon,
  XMarkIcon, CheckIcon, UserPlusIcon,
  ArrowTrendingUpIcon, ClipboardDocumentListIcon,
  ChevronLeftIcon, ChevronRightIcon,
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

  const scroll = (id: string, dir: "left" | "right") => {
    const el = document.getElementById(id);
    if (el) {
      const amount = el.clientWidth + 32; // width + gap
      el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
    }
  };

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
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider w-[25%]">ชื่อ-นามสกุล</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider w-[20%]">อีเมล</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider w-[15%]">เบอร์โทร</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider w-[12%]">สถานะ</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider w-[13%]">ประเภท</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider w-[15%]">จัดการ</th>
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
                              <div className="bg-surface rounded-2xl p-6 border border-theme-border shadow-inner">
                                <h4 className="text-sm font-black text-gold uppercase mb-5 flex items-center gap-2">
                                  <CurrencyDollarIcon className="w-5 h-5" /> ยอดเงินในบัญชี
                                </h4>
                                <div className="space-y-3 text-sm">
                                  <div className="flex justify-between items-center py-2 border-b border-theme-border/50">
                                    <span className="text-muted font-medium">Equity</span>
                                    <span className="font-bold text-lg text-foreground">{fmt(portfolioData[u.id]?.account?.equity || 0)}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-2 border-b border-theme-border/50">
                                    <span className="text-muted font-medium">Cash</span>
                                    <span className="font-bold text-lg text-foreground">{fmt(portfolioData[u.id]?.account?.cash || 0)}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-2">
                                    <span className="text-muted font-medium">Buying Power</span>
                                    <span className="font-bold text-lg text-green-400">{fmt(portfolioData[u.id]?.account?.buyingPower || 0)}</span>
                                  </div>
                                </div>
                              </div>
                              {/* Positions */}
                              <div className="bg-surface rounded-2xl p-6 border border-theme-border shadow-inner relative group">
                                <div className="flex justify-between items-center mb-5">
                                  <h4 className="text-sm font-black text-gold uppercase flex items-center gap-2">
                                    <ArrowTrendingUpIcon className="w-5 h-5" /> พอร์ตหุ้น ({(portfolioData[u.id]?.positions || []).length})
                                  </h4>
                                  {(portfolioData[u.id]?.positions || []).length > 5 && (
                                    <div className="flex gap-1">
                                      <button onClick={() => scroll(`pos-${u.id}`, "left")} className="p-1 rounded bg-background border border-theme-border text-muted hover:text-gold transition-colors">
                                        <ChevronLeftIcon className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => scroll(`pos-${u.id}`, "right")} className="p-1 rounded bg-background border border-theme-border text-muted hover:text-gold transition-colors">
                                        <ChevronRightIcon className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                
                                <div id={`pos-${u.id}`} className="flex overflow-x-hidden snap-x snap-mandatory scroll-smooth gap-8 pb-2">
                                  {/* Chunk items into pages of 5 */}
                                  {(() => {
                                    const pos = portfolioData[u.id]?.positions || [];
                                    const chunks = [];
                                    for (let i = 0; i < pos.length; i += 5) chunks.push(pos.slice(i, i + 5));
                                    
                                    if (chunks.length === 0) return (
                                      <div className="min-w-full py-8 text-center bg-background/20 rounded-xl border border-dashed border-theme-border">
                                        <p className="text-xs text-muted">ไม่มีหุ้นในพอร์ตโฟลิโอ</p>
                                      </div>
                                    );

                                    return chunks.map((chunk, idx) => (
                                      <div key={idx} className="min-w-full snap-start space-y-3">
                                        <div className="grid grid-cols-2 text-[10px] uppercase text-muted font-black mb-2 px-1 tracking-widest">
                                          <span>Ticker</span>
                                          <span className="text-right">Profit/Loss</span>
                                        </div>
                                        <div className="space-y-2">
                                          {chunk.map((p: any) => (
                                            <div key={p.symbol} className="grid grid-cols-2 items-center text-sm bg-background/40 p-2.5 rounded-xl border border-theme-border/50 hover:border-gold/30 transition-colors">
                                              <span className="font-bold text-foreground">{p.symbol}</span>
                                              <span className={`text-sm font-mono text-right ${Number(p.unrealizedPl) >= 0 ? "text-green-400" : "text-red-400"}`}>
                                                {Number(p.unrealizedPl) >= 0 ? "+" : ""}{fmt(Number(p.unrealizedPl))}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ));
                                  })()}
                                </div>
                              </div>

                              {/* Recent Orders */}
                              <div className="bg-surface rounded-2xl p-6 border border-theme-border shadow-inner relative group">
                                <div className="flex justify-between items-center mb-5">
                                  <h4 className="text-sm font-black text-gold uppercase flex items-center gap-2">
                                    <ClipboardDocumentListIcon className="w-5 h-5" /> ออเดอร์ล่าสุด
                                  </h4>
                                  {(portfolioData[u.id]?.recentOrders || []).length > 5 && (
                                    <div className="flex gap-1">
                                      <button onClick={() => scroll(`ord-${u.id}`, "left")} className="p-1 rounded bg-background border border-theme-border text-muted hover:text-gold transition-colors">
                                        <ChevronLeftIcon className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => scroll(`ord-${u.id}`, "right")} className="p-1 rounded bg-background border border-theme-border text-muted hover:text-gold transition-colors">
                                        <ChevronRightIcon className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <div id={`ord-${u.id}`} className="flex overflow-x-hidden snap-x snap-mandatory scroll-smooth gap-8 pb-2">
                                  {(() => {
                                    const ords = portfolioData[u.id]?.recentOrders || [];
                                    const chunks = [];
                                    for (let i = 0; i < ords.length; i += 5) chunks.push(ords.slice(i, i + 5));

                                    if (chunks.length === 0) return (
                                      <div className="min-w-full py-8 text-center bg-background/20 rounded-xl border border-dashed border-theme-border">
                                        <p className="text-xs text-muted">ไม่พบประวัติการทำรายการ</p>
                                      </div>
                                    );

                                    return chunks.map((chunk, idx) => (
                                      <div key={idx} className="min-w-full snap-start space-y-3">
                                        <div className="grid grid-cols-3 text-[10px] uppercase text-muted font-black mb-2 px-1 tracking-widest">
                                          <span>Ticker</span>
                                          <span className="text-center">Side</span>
                                          <span className="text-right">Status</span>
                                        </div>
                                        <div className="space-y-2">
                                          {chunk.map((o: any) => (
                                            <div key={o.id} className="grid grid-cols-3 items-center text-xs bg-background/40 p-2.5 rounded-xl border border-theme-border/50 hover:border-gold/30 transition-colors">
                                              <span className="font-bold text-foreground">{o.symbol}</span>
                                              <div className="flex justify-center">
                                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${o.side === "BUY" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                                                  {o.side}
                                                </span>
                                              </div>
                                              <span className="text-muted text-right text-[10px] font-bold">{o.status}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ));
                                  })()}
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
