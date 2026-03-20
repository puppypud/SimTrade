'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import WatchlistPanel from '@/src/app/components/features/WatchlistPanel';
import MarketNewsBanner from '@/src/app/components/features/MarketNewsBanner';
import ImageBannerCarousel from '@/src/app/components/features/ImageBannerCarousel';
import RecommendedStocksPanel from '@/src/app/components/features/RecommendedStocksPanel';
import { useAuth } from '@/src/context/AuthContext';
import { brokerService } from '@/src/app/services/brokerService';

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [portfolioValue, setPortfolioValue] = useState<number | null>(null);
  const [buyingPower, setBuyingPower] = useState<number | null>(null);

  useEffect(() => {
    if (user?.alpacaAccountId) {
      brokerService.getAccountInfo(user.alpacaAccountId)
        .then(data => {
          setPortfolioValue(Number(data.equity) || 0);
          setBuyingPower(Number(data.buyingPower) || 0);
        })
        .catch(err => console.error("Dashboard fetch error:", err));
    }
  }, [user]);

  const formatCurrency = (value: number | null) => {
    if (value === null) return "$0.00";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">

        {/* Header with Stats */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2">My Dashboard</h1>
            <p className="text-muted font-medium">ยินดีต้อนรับกลับมา, {user?.firstName || 'Trader'}</p>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <div className="flex-1 md:w-48 bg-surface p-4 rounded-2xl border border-theme-border">
              <p className="text-[10px] font-black uppercase text-muted tracking-widest mb-1">Portfolio</p>
              <p className="text-xl font-bold">{formatCurrency(portfolioValue)}</p>
            </div>
            <div className="flex-1 md:w-48 bg-surface p-4 rounded-2xl border border-theme-border">
              <p className="text-[10px] font-black uppercase text-muted tracking-widest mb-1">Buying Power</p>
              <p className="text-xl font-bold text-gold">{formatCurrency(buyingPower)}</p>
            </div>
          </div>
        </div>

        {/* Banners */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <ImageBannerCarousel />
          </div>
          <div className="h-full">
            <MarketNewsBanner />
          </div>
        </div>

        {/* Watchlist Section */}
        <div className="space-y-6">
          <RecommendedStocksPanel />
          <WatchlistPanel onSelectSymbol={(sym) => router.push(`/trade?symbol=${sym}`)} />
        </div>
      </div>
    </div>
  );
}
