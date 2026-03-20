"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/src/app/components/layout/Navbar";
import { brokerService } from "@/src/app/services/brokerService";
import { UserAccount } from "@/src/app/types/broker";
import { ChevronDownIcon, ChevronUpIcon, UserIcon, PhoneIcon, MapPinIcon, BanknotesIcon, CalendarIcon, PlusCircleIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";
import FundFirmModal from "@/src/app/components/features/FundFirmModal";
import FundUserModal from "@/src/app/components/features/FundUserModal";

export default function AdminUsersPage({ params, searchParams }: any) {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalFee, setTotalFee] = useState<number | null>(null);
  const [feeGraphData, setFeeGraphData] = useState<{ date: string, amount: number }[]>([]);
  const [isMaintenance, setIsMaintenance] = useState<boolean>(false);
  const [dashboardLoading, setDashboardLoading] = useState<boolean>(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [isFundFirmModalOpen, setIsFundFirmModalOpen] = useState(false);
  const [isFundUserModalOpen, setIsFundUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);
  const [fundingTargetId, setFundingTargetId] = useState<string | null>(null);

  const handleOpenFundUser = (e: React.MouseEvent, user: UserAccount) => {
    e.stopPropagation();
    setSelectedUser({
      id: user.id,
      name: `${user.identity?.givenName || ''} ${user.identity?.familyName || ''}`.trim() || 'Unknown User'
    });
    setIsFundUserModalOpen(true);
  };

  const fetchFeeData = async (accounts: any[]) => {
    let commissions = 0;
    const dailyMap: Record<string, number> = {};

    const userOrders = await Promise.all(
      accounts.map(async (u: any) => {
        if (u.alpacaAccountId) {
          try {
            return await brokerService.getAllOrders(u.alpacaAccountId);
          } catch (e) { return []; }
        }
        return [];
      })
    );

    userOrders.flat().forEach((order: any) => {
      const comm = Number(order.commission || 0);
      if (comm > 0) {
        commissions += comm;
        const rawDate = order.filledAt || order.submittedAt || order.createdAt || new Date().toISOString();
        const dateStr = typeof rawDate === 'string' ? rawDate.split('T')[0] : new Date(rawDate).toISOString().split('T')[0];
        dailyMap[dateStr] = (dailyMap[dateStr] || 0) + comm;
      }
    });

    const sortedDates = Object.keys(dailyMap).sort();
    let graphData = sortedDates.map(date => ({
      date,
      amount: dailyMap[date]
    }));

    // Generate dummy data points for graph aesthetics if no actual fees exist yet
    if (graphData.length === 0) {
      const today = new Date();
      graphData = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        return { date: d.toISOString().split('T')[0], amount: 0 };
      });
    }

    setTotalFee(commissions);
    // Keep last 14 days
    setFeeGraphData(graphData.slice(-14));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, statusData] = await Promise.all([
          brokerService.getAllAccounts(),
          brokerService.getMarketStatus()
        ]);
        setUsers(usersData);
        setIsMaintenance(statusData.isMaintenanceMode);

        await fetchFeeData(usersData);

      } catch (err: any) {
        console.error("Error fetching admin data:", err);
        setError("ไม่สามารถดึงข้อมูลระบบได้");
      } finally {
        setLoading(false);
        setDashboardLoading(false);
      }
    };
    fetchData();
  }, []);

  const refreshDashboardData = async () => {
    setDashboardLoading(true);
    try {
      const accounts = await brokerService.getAllAccounts();
      await fetchFeeData(accounts);
    } catch (err) {
      console.error("Failed to refresh dashboard data", err);
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleToggleMaintenance = async () => {
    if (!confirm(`Are you sure you want to turn ${isMaintenance ? 'OFF' : 'ON'} maintenance mode?`)) return;
    try {
      const message = !isMaintenance ? "System is under maintenance. Trading is temporarily disabled." : "";
      const response = await brokerService.toggleMaintenance(!isMaintenance, message);
      setIsMaintenance(!isMaintenance); // Assuming success correctly updates it server-side. Wait for data refetch on reload if needed.
      alert(`Maintenance mode turned ${!isMaintenance ? 'ON' : 'OFF'} successfully.`);
    } catch (err: any) {
      console.error("Failed to toggle maintenance:", err);
      alert("Failed to update maintenance mode.");
    }
  };

  const toggleRow = (userId: string) => {
    if (expandedRow === userId) {
      setExpandedRow(null); // ปิดถ้ากดซ้ำ
    } else {
      setExpandedRow(userId); // เปิดแถวใหม่
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric", month: "long", day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD",
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300">
      {/* Navbar Fixed */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navbar />
      </div>

      {/* Main Content (เพิ่ม pt-24 ดันเนื้อหาลงมาไม่ให้ทับ Navbar) */}
      <main className="container mx-auto px-4 pt-24 pb-12">

        {/* Header Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              จัดการระบบ <span className="text-gold">Admin Panel</span>
            </h1>
            <p className="mt-2 text-sm text-muted">
              ควบคุมการทำงานของระบบและจัดการข้อมูลสมาชิก SimTrade
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <button
              onClick={() => setIsFundFirmModalOpen(true)}
              className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-gold text-black hover:bg-gold-hover transition-colors shadow-sm"
            >
              <PlusCircleIcon className="w-5 h-5 mr-2" />
              Fund Firm Account
            </button>
          </div>
        </div>

        {/* Dashboard Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Fee & Commission Card */}
          <div className="bg-surface rounded-2xl shadow-sm border border-theme-border p-6 flex flex-col justify-between overflow-hidden relative transition-colors duration-300">
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                  <BanknotesIcon className="w-6 h-6" />
                </div>
                <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Total Fees Collected</h2>
              </div>
            </div>

            <div className="relative z-10 mb-2">
              {dashboardLoading ? (
                <div className="h-10 w-32 bg-theme-border animate-pulse rounded mt-2"></div>
              ) : (
                <div className="text-4xl font-extrabold text-foreground mt-1 flex items-baseline gap-2">
                  {totalFee !== null ? formatCurrency(totalFee) : "-"}
                  {totalFee === 0 && <span className="text-sm text-muted font-medium">No fees yet</span>}
                </div>
              )}
            </div>

            {/* Sparkline Graph */}
            {!dashboardLoading && (
              <div className="h-16 flex items-end justify-between gap-[2px] w-full pt-4 mt-auto border-t border-theme-border relative z-10 transition-colors duration-300">
                {feeGraphData.map((d, i) => {
                  const maxAmount = Math.max(...feeGraphData.map(x => x.amount)) || 1;
                  const heightPct = Math.max((d.amount / maxAmount) * 100, 5); // min 5% height to show line
                  return (
                    <div
                      key={i}
                      className={`w-full rounded-sm relative group transition-all duration-300 ${d.amount > 0 ? 'bg-green-500 hover:bg-green-400' : 'bg-theme-border'}`}
                      style={{ height: `${heightPct}%` }}
                      title={`${d.date}: ${formatCurrency(d.amount)}`}
                    >
                      {/* Tooltip on Hover */}
                      {d.amount > 0 && (
                        <div className="absolute opacity-0 group-hover:opacity-100 bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-surface border border-theme-border text-foreground text-[10px] font-bold px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-50">
                          {formatCurrency(d.amount)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Users Count Card */}
          <div className="bg-surface rounded-2xl shadow-sm border border-theme-border p-6 flex flex-col justify-center transition-colors duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gold/10 rounded-lg text-gold">
                <UserIcon className="w-6 h-6" />
              </div>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Total Subscribed Users</h2>
            </div>
            {dashboardLoading ? (
              <div className="h-10 w-24 bg-theme-border animate-pulse rounded mt-2"></div>
            ) : (
              <div className="text-4xl font-extrabold text-foreground mt-1">
                {users.length} <span className="text-lg font-medium text-muted">Accounts</span>
              </div>
            )}
          </div>

          {/* Maintenance Mode Card */}
          <div className="bg-surface rounded-2xl shadow-sm border border-theme-border p-6 flex flex-col justify-between transition-colors duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isMaintenance ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">System Status</h2>
              </div>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${isMaintenance ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>
                {isMaintenance ? 'MAINTENANCE' : 'ONLINE'}
              </span>
            </div>

            <button
              onClick={handleToggleMaintenance}
              disabled={dashboardLoading}
              className={`mt-4 w-full py-2.5 px-4 rounded-xl font-bold text-sm transition-all shadow-sm ${isMaintenance
                ? 'bg-theme-border hover:brightness-110 text-foreground'
                : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20'
                }`}
            >
              {isMaintenance ? 'Turn System Online' : 'Enable Maintenance Mode'}
            </button>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-surface shadow-xl rounded-2xl overflow-hidden border border-theme-border transition-colors duration-300">
          {loading ? (
            <div className="p-12 text-center text-muted animate-pulse">กำลังโหลดข้อมูล...</div>
          ) : error ? (
            <div className="p-12 text-center text-red-400 bg-red-900/20">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-theme-border">
                <thead className="bg-background">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">ชื่อ-นามสกุล</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">อีเมล</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">เบอร์โทรศัพท์</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-muted uppercase tracking-wider">สถานะ</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-muted uppercase tracking-wider">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-theme-border">
                  {users.map((user) => (
                    <React.Fragment key={user.id}>
                      {/* แถวหลัก (Main Row) */}
                      <tr
                        onClick={() => toggleRow(user.id)}
                        className={`cursor-pointer transition-colors duration-200 ${expandedRow === user.id ? "bg-background" : "hover:bg-background"}`}
                      >
                        {/* 1. Identity */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold">
                              {(user as any).firstName?.[0] || user.identity?.givenName?.[0] || 'U'}
                              {(user as any).lastName?.[0] || user.identity?.familyName?.[0] || ''}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-foreground">
                                {(user as any).firstName || user.identity?.givenName} {(user as any).lastName || user.identity?.familyName}
                              </div>
                              <div className="text-xs text-muted">
                                {user.identity?.countryOfCitizenship || (user as any).country || "USA"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Email */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-foreground">{(user as any).email || user.contact?.emailAddress || 'No Email'}</div>
                        </td>

                        {/* 3. Phone */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-foreground">{(user as any).phoneNumber || user.contact?.phoneNumber || 'No Phone'}</div>
                        </td>

                        {/* 5. Status */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === "ACTIVE" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                            }`}>
                            {user.status}
                          </span>
                        </td>

                        {/* 6. Actions (Fund + Expand) */}
                        <td className="px-6 py-4 whitespace-nowrap text-center text-muted">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => handleOpenFundUser(e, user)}
                              disabled={fundingTargetId === user.id}
                              className={`p-1.5 rounded-lg text-gold border border-transparent transition-colors tooltip-trigger flex items-center gap-1 font-semibold ${fundingTargetId === user.id ? "opacity-50 cursor-wait bg-gold/5" : "hover:bg-gold/20 hover:border-gold/30 bg-gold/10"
                                }`}
                              title="Fund User Account"
                            >
                              <CurrencyDollarIcon className="w-5 h-5" />
                              <span className="text-xs">แจกเงิน</span>
                            </button>
                            {expandedRow === user.id ? (
                              <ChevronUpIcon className="w-5 h-5 text-gold" />
                            ) : (
                              <ChevronDownIcon className="w-5 h-5 opacity-70" />
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* แถวขยาย (Expanded Details Row) */}
                      {expandedRow === user.id && (
                        <tr className="bg-background">
                          <td colSpan={6} className="px-6 py-6 border-b border-theme-border">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">

                              {/* Card 1: ข้อมูลส่วนตัว */}
                              <div className="bg-surface p-4 rounded-lg shadow-sm border border-theme-border">
                                <h3 className="text-sm font-semibold text-gold mb-3 flex items-center">
                                  <UserIcon className="w-4 h-4 mr-2" /> ข้อมูลส่วนตัว
                                </h3>
                                <div className="space-y-2 text-sm text-muted">
                                  <p><span className="font-medium text-foreground">วันเกิด:</span> {user.identity?.dateOfBirth || (user as any).dob || '-'}</p>
                                  <p><span className="font-medium text-foreground">Account ID:</span> {user.alpacaAccountId || user.id}</p>
                                  <p><span className="font-medium text-foreground">สัญชาติ:</span> {user.identity?.countryOfCitizenship || (user as any).country || 'N/A'}</p>
                                </div>
                              </div>

                              {/* Card 2: ที่อยู่ */}
                              <div className="bg-surface p-4 rounded-lg shadow-sm border border-theme-border">
                                <h3 className="text-sm font-semibold text-gold mb-3 flex items-center">
                                  <MapPinIcon className="w-4 h-4 mr-2" /> ที่อยู่ & ติดต่อ
                                </h3>
                                <div className="space-y-2 text-sm text-muted">
                                  <p>{user.contact?.streetAddress?.[0]}</p>
                                  <p>{user.contact?.city}, {user.contact?.state} {user.contact?.postalCode}</p>
                                </div>
                              </div>

                              {/* Card 3: ข้อมูลอื่นๆ */}
                              <div className="bg-surface p-4 rounded-lg shadow-sm border border-theme-border">
                                <h3 className="text-sm font-semibold text-gold mb-3 flex items-center">
                                  <CalendarIcon className="w-4 h-4 mr-2" /> ข้อมูลระบบ
                                </h3>
                                <div className="space-y-2 text-sm text-muted">
                                  <p><span className="font-medium text-foreground">วันที่สมัคร:</span> {formatDate(user.createdAt)}</p>
                                  <p><span className="font-medium text-foreground">ประเภท:</span> Trading Account</p>
                                  <p className="text-green-500 font-medium">ยืนยันตัวตนแล้ว</p>
                                </div>
                              </div>

                            </div>
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
      </main>

      <FundFirmModal
        isOpen={isFundFirmModalOpen}
        onClose={() => setIsFundFirmModalOpen(false)}
        onSuccess={refreshDashboardData}
      />

      {selectedUser && (
        <FundUserModal
          isOpen={isFundUserModalOpen}
          onClose={() => {
            setIsFundUserModalOpen(false);
            setSelectedUser(null);
          }}
          onSuccess={async () => {
            await refreshDashboardData();
            // Optional: Re-fetch user list if needed
            const updatedUsers = await brokerService.getAllAccounts();
            setUsers(updatedUsers);
          }}
          userId={selectedUser.id}
          userName={selectedUser.name}
        />
      )}
    </div>
  );
}