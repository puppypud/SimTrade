'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import WatchlistPanel from '@/src/app/components/features/WatchlistPanel';
import MarketNewsBanner from '@/src/app/components/features/MarketNewsBanner';
import ImageBannerCarousel from '@/src/app/components/features/ImageBannerCarousel';
import RecommendedStocksPanel from '@/src/app/components/features/RecommendedStocksPanel';
import { useAuth } from '@/src/context/AuthContext';
import { brokerService } from '@/src/app/services/brokerService';
import { useState, useEffect } from 'react';

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
        if (user && user.alpacaAccountId) {
            brokerService.getAccountInfo(user.alpacaAccountId)
                .then(data => {
                    // Update state using the data returned from Alpaca via BrokerService
                    setPortfolioValue(Number(data.equity) || 0);
                    setBuyingPower(Number(data.buyingPower) || 0);
                })
                .catch(err => {
                    console.error("Failed to fetch account info:", err);
                });
        }
    }, [user]);

    // Format currency Helper
    const formatCurrency = (value: number | null) => {
        if (value === null) return "$0.00";
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    };

    return (
        <div className="min-h-[calc(100vh-64px)] bg-background text-foreground font-sans p-4 md:p-8 transition-colors duration-300">
            <div className="max-w-[1600px] mx-auto">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between px-2 mb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">Market Overview</h1>
                    </div>

                    {/* Mock Portfolio Summary Widget */}
                    <div className="bg-surface px-6 py-3 rounded-2xl shadow-sm border border-theme-border flex items-center gap-8 transition-colors duration-300">
                        <div>
                            <p className="text-xs text-muted font-medium mb-1 uppercase tracking-wider">Portfolio Value</p>
                            <p className="text-xl font-bold text-foreground">
                                {portfolioValue !== null ? formatCurrency(portfolioValue) : "Loading..."}
                            </p>
                        </div>
                        <div className="h-10 w-px bg-theme-border"></div>
                        <div>
                            <p className="text-xs text-muted font-medium mb-1 uppercase tracking-wider">Buying Power</p>
                            <p className="text-xl font-bold text-gold">
                                {buyingPower !== null ? formatCurrency(buyingPower) : "Loading..."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Layout Wrapper - Full Width Banners */}
                <div className="flex flex-col gap-6 w-full">

                    {/* Banners Area */}
                    <div className="flex flex-col gap-6 w-full">
                        <MarketNewsBanner />
                        <ImageBannerCarousel />
                    </div>

                    {/* Dashboard Content Area */}
                    <div className="w-full mt-2 flex flex-col gap-6">
                        <RecommendedStocksPanel />

                        <WatchlistPanel
                            onSelectSymbol={(sym) => router.push(`/trade?symbol=${sym}`)}
                        />
                    </div>

                </div>
            </div>
        </div>
    );
}