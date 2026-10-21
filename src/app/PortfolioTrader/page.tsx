"use client";

import React, { useEffect, useState } from "react";
import { AccountInfo } from "@/src/app/types/broker";
import { brokerService } from "@/src/app/services/brokerService";
import PortfolioTable from "@/src/app/components/features/PortfolioTable";
import { useAuth } from "@/src/context/AuthContext";
import { TrendingUp, Wallet, Landmark, BarChart3, ShieldCheck, Zap } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalUnrealizedPl, setTotalUnrealizedPl] = useState(0);
  const [totalUnrealizedPlpc, setTotalUnrealizedPlpc] = useState(0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  useEffect(() => {
    const fetchAccountData = async () => {
      if (!user?.alpacaAccountId) return;
      try {
        // Fetch Account Stats
        const accData = await brokerService.getAccountInfo(user.alpacaAccountId);
        setAccount(accData);

        // Fetch Positions for Total Profit calc
        const positions = await brokerService.getOpenPositions(user.alpacaAccountId);
        const totalPl = positions.reduce((sum, pos) => sum + pos.unrealizedPl, 0);
        const totalCostPower = positions.reduce((sum, pos) => sum + pos.costBasis, 0);
        const plPc = totalCostPower > 0 ? (totalPl / totalCostPower) * 100 : 0;

        setTotalUnrealizedPl(totalPl);
        setTotalUnrealizedPlpc(plPc);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccountData();
  }, [user]);

  if (loading)
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted font-medium animate-pulse">Analyzing Portfolio...</p>
        </div>
      </div>
    );

  if (!account)
    return (
      <div className="p-12 text-center text-foreground">
        <div className="max-w-md mx-auto bg-surface rounded-2xl p-8 border border-theme-border shadow-xl">
          <Landmark className="w-16 h-16 text-muted mx-auto mb-4 opacity-20" />
          <h2 className="text-xl font-bold mb-2">No Account Found</h2>
          <p className="text-muted text-sm mb-6">We couldn't retrieve your portfolio data at this time.</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-gold text-black font-bold rounded-lg hover:bg-gold-hover transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );

  const todaysChange = account.equity - account.lastEquity;
  const isPositive = todaysChange >= 0;
  const isTotalPositive = totalUnrealizedPl >= 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Portfolio Overview</h1>
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-muted flex items-center gap-2 font-medium">
            <span className="opacity-60 uppercase tracking-widest text-[10px]">Account:</span>
            <span className="text-foreground tracking-wider font-mono bg-surface/50 px-2 py-0.5 rounded border border-theme-border/50 text-xs">
              {account.accountNumber}
            </span>
            <span className="w-1 h-1 bg-muted rounded-full mx-1"></span>
            <span className="text-emerald-500 text-xs font-bold px-2 py-0.5 bg-emerald-500/10 rounded uppercase tracking-tighter shadow-sm">
              {account.status}
            </span>
          </p>
        </div>
      </div>

      {/* 2. Hero Balance Card (High Impact) */}
      <div className="relative group overflow-hidden bg-surface border border-theme-border rounded-[2.5rem] shadow-2xl p-8 md:p-12">
        {/* Background Design Elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-gold/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-gold/20 transition-colors duration-500"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 bg-gold/5 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="relative z-10 grid md:grid-cols-[1fr_auto_1fr] items-center gap-12">
          {/* Main Balance */}
          <div className="space-y-3">
            <p className="text-muted text-xs font-black uppercase tracking-[0.2em] opacity-80 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gold" /> Total Portfolio Value
            </p>
            <div className="space-y-1">
              <h2 className="text-6xl md:text-7xl font-black text-foreground tracking-tighter">
                {formatCurrency(account.equity)}
              </h2>
              <div className="flex items-center gap-3">
                <div className={`flex items-center px-4 py-1.5 rounded-full text-base font-bold shadow-lg shadow-black/5 ${isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                  {isPositive ? "▲" : "▼"} {formatCurrency(Math.abs(todaysChange))}
                  <span className="ml-1.5 text-xs opacity-70 font-black">Today</span>
                </div>
                <span className="text-muted text-xs font-semibold">vs prev close ({formatCurrency(account.lastEquity)})</span>
              </div>
            </div>
          </div>

          {/* Divider Line */}
          <div className="hidden md:block w-px h-32 bg-gradient-to-b from-transparent via-theme-border to-transparent"></div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-1 gap-8">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-muted font-black uppercase tracking-widest mb-2 opacity-60">Total Unrealized Profit / Loss</p>
                <div className={`text-3xl font-black flex items-baseline gap-2 ${isTotalPositive ? "text-emerald-500" : "text-red-500"}`}>
                  {isTotalPositive ? "+" : "-"}{formatCurrency(Math.abs(totalUnrealizedPl))}
                  <span className="text-sm font-bold opacity-80 leading-none">({isTotalPositive ? "+" : ""}{totalUnrealizedPlpc.toFixed(2)}%)</span>
                </div>
              </div>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${isTotalPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                <div className={`w-1.5 h-1.5 rounded-full animate-ping ${isTotalPositive ? "bg-emerald-500" : "bg-red-500"}`}></div>
                {isTotalPositive ? "Portfolio Growth" : "Market Correction"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Stats Grid - Row of 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Buying Power"
          value={formatCurrency(account.buyingPower)}
          description="Available for immediate orders"
          icon={<Zap className="w-5 h-5" />}
          color="gold"
        />
        <StatCard
          label="Cash Balance"
          value={formatCurrency(account.cash)}
          description="Settled funds in account"
          icon={<Landmark className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          label="Invested Assets"
          value={formatCurrency(account.longMarketValue)}
          description="Current value of open positions"
          icon={<TrendingUp className="w-5 h-5" />}
          color="emerald"
        />
      </div>

      {/* 4. Portfolio Table Section */}
      <div className="bg-surface border border-theme-border rounded-[2rem] shadow-xl overflow-hidden transition-all duration-500">
        <div className="p-8 border-b border-theme-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-gold" />
            </div>
            <h2 className="text-2xl font-black text-foreground tracking-tight">Active Holdings</h2>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted tracking-widest">
            <div className="w-2 h-2 rounded-full bg-emerald-500 border-2 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            Market Live
          </div>
        </div>

        <div className="p-0 sm:p-2">
          {user?.alpacaAccountId ? (
            <PortfolioTable accountId={user.alpacaAccountId} />
          ) : (
            <div className="p-20 text-center">
              <p className="text-muted font-medium">Authentication required to view assets.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

function StatCard({ label, value, description, icon, color }: { label: string, value: string, description: string, icon: React.ReactNode, color: 'gold' | 'blue' | 'emerald' }) {
  const colorMap = {
    gold: "text-gold bg-gold/10 border-gold/20",
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
  };

  return (
    <div className="bg-surface border border-theme-border p-6 rounded-[1.5rem] shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl border ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-[10px] text-muted font-black uppercase tracking-widest mb-1 opacity-70">{label}</p>
        <h3 className="text-3xl font-black text-foreground tracking-tight mb-2">{value}</h3>
        <p className="text-xs text-muted font-medium flex items-center gap-1.5">
          <div className="w-1 h-1 bg-muted rounded-full opacity-30"></div>
          {description}
        </p>
      </div>
    </div>
  );
}
