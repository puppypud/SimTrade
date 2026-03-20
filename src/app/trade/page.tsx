'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import StockLWChart from '@/src/app/components/ui/Chart';
import TradeTabs from '@/src/app/components/features/TradeTabs';
import MarketNewsBanner from '@/src/app/components/features/MarketNewsBanner';
import StockInfoPanel from '@/src/app/components/features/StockInfoPanel';
import { ArrowLeft } from 'lucide-react';

export default function TradeStockPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading Trading Interface...</div>}>
            <TradeStockContent />
        </Suspense>
    );
}

function TradeStockContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const symbolFromUrl = searchParams.get('symbol');
    const [currentSymbol, setCurrentSymbol] = useState('');

    useEffect(() => {
        if (symbolFromUrl) {
            setCurrentSymbol(symbolFromUrl);
        } else {
            setCurrentSymbol('AAPL'); // Default fallback
        }
    }, [symbolFromUrl]);

    const handleSelectSymbol = (sym: string) => {
        // Update URL so it can be bookmarked and shared
        router.push(`?symbol=${sym}`);
    };

    return (
        <div className="min-h-[calc(100vh-64px)] bg-background text-foreground font-sans p-4 md:p-8 transition-colors duration-300">
            <div className="max-w-[1600px] mx-auto">

                {/* Top Nav & Header Section */}
                <div className="mb-2 px-2">
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center gap-2 text-sm font-bold text-muted hover:text-foreground transition-colors inline-block pb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </button>
                </div>


                {/* Main Layout Wrapper - Responsive Grid/Flex */}
                <div className="flex flex-col lg:flex-row gap-6">

                    {/* Left Column: Chart Area & Banners */}
                    <div className="flex-1 w-full lg:w-auto min-w-0 flex flex-col">
                        {/* News Banner */}
                        <div className="mb-6 w-full">
                            <MarketNewsBanner />
                        </div>

                        {/* Chart */}
                        {currentSymbol ? (
                            <>
                                <div className="bg-surface rounded-2xl shadow-sm border border-theme-border p-4 mb-6 relative z-10 flex-1 min-h-[500px]">
                                    <StockLWChart symbol={currentSymbol} />
                                </div>
                                <StockInfoPanel symbol={currentSymbol} />
                            </>
                        ) : (
                            // Empty State
                            <div className="bg-surface rounded-2xl shadow-sm border border-theme-border p-4 mb-6 relative z-10 min-h-[500px] flex flex-col items-center justify-center text-muted bg-surface w-full h-full">
                                <div className="p-6 rounded-full bg-background mb-4 animate-pulse">
                                    <svg className="w-16 h-16 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
                                </div>
                                <p className="text-lg font-medium text-foreground">Select a symbol to view chart</p>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Sidebar / Trade Panel */}
                    <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-6">
                        {currentSymbol && (
                            <TradeTabs symbol={currentSymbol} />
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
