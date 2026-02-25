'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import WatchlistPanel from '@/src/app/components/features/WatchlistPanel';
import MarketNewsBanner from '@/src/app/components/features/MarketNewsBanner';
import ImageBannerCarousel from '@/src/app/components/features/ImageBannerCarousel';

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading Dashboard...</div>}>
            <DashboardContent />
        </Suspense>
    );
}

function DashboardContent() {
    const router = useRouter();

    return (
        <div className="min-h-[calc(100vh-64px)] bg-background text-foreground font-sans p-4 md:p-8 transition-colors duration-300">
            <div className="max-w-[1600px] mx-auto">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between px-2 mb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">Market Overview</h1>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Market Open
                        </span>
                    </div>

                    {/* Mock Portfolio Summary Widget */}
                    <div className="bg-surface px-6 py-3 rounded-2xl shadow-sm border border-theme-border flex items-center gap-8 transition-colors duration-300">
                        <div>
                            <p className="text-xs text-muted font-medium mb-1 uppercase tracking-wider">Portfolio Value</p>
                            <p className="text-xl font-bold text-foreground">$10,000.00</p>
                        </div>
                        <div className="h-10 w-px bg-theme-border"></div>
                        <div>
                            <p className="text-xs text-muted font-medium mb-1 uppercase tracking-wider">Buying Power</p>
                            <p className="text-xl font-bold text-gold">$10,000.00</p>
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
                    <div className="w-full mt-2">
                        <WatchlistPanel
                            onSelectSymbol={(sym) => router.push(`/trade?symbol=${sym}`)}
                        />
                    </div>

                </div>
            </div>
        </div>
    );
}