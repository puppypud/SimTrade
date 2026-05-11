'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import StockLWChart from '@/src/app/components/ui/Chart';
import TradeTabsCrypto from '@/src/app/components/features/TradeTabsCrypto';
import StockInfoPanel from '@/src/app/components/features/StockInfoPanel';
import { ArrowLeft } from 'lucide-react';

export default function TradeCryptoPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading Crypto Market...</div>}>
            <TradeCryptoPageContent />
        </Suspense>
    );
}

function TradeCryptoPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const symbolFromUrl = searchParams.get('symbol');

    const [currentSymbol, setCurrentSymbol] = useState('');

    useEffect(() => {
        if (symbolFromUrl) {
            setCurrentSymbol(symbolFromUrl);
        }
    }, [symbolFromUrl]);

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

                {/* --- Header --- */}
                <div className="flex items-center px-2 mb-6">
                    <div className="w-full">
                        {currentSymbol ? (
                            <div className="flex items-baseline gap-3">
                                <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
                                    {currentSymbol}
                                </h1>
                                <span className="px-2 py-1 bg-gold/20 text-gold border border-gold/30 text-xs font-bold rounded-md">CRYPTO</span>
                            </div>
                        ) : (
                            <h1 className="text-2xl font-bold text-muted">Crypto Market</h1>
                        )}
                    </div>
                </div>

                {/* --- Main Content Layout --- */}
                <div className="flex flex-col lg:flex-row gap-6">

                    {/* Left Column: Chart Area */}
                    <div className="flex-1 w-full lg:w-auto min-w-0 flex flex-col">
                        {/* Chart */}
                        {currentSymbol ? (
                            <>
                                <div className="bg-surface rounded-2xl shadow-sm border border-theme-border p-4 mb-6 relative z-10 w-full flex-1 min-h-[500px]">
                                    <StockLWChart symbol={currentSymbol} />
                                </div>
                                <StockInfoPanel symbol={currentSymbol} />
                            </>
                        ) : (
                            <div className="bg-surface rounded-2xl shadow-sm border border-theme-border p-4 mb-6 relative z-10 w-full flex-1 min-h-[500px] flex flex-col items-center justify-center text-muted">
                                <p className="text-lg font-medium">Please search for a coin to view chart</p>
                            </div>
                        )}
                    </div>

                    {/* Trade Panel Section (Right) */}
                    <div className="w-full lg:w-[400px] shrink-0 flex flex-col gap-6">
                        {currentSymbol ? (
                            // ✅ เรียกใช้ Component TradeTabsCrypto ที่นี่
                            <TradeTabsCrypto symbol={currentSymbol} />
                        ) : (
                            <div className="bg-surface rounded-2xl shadow-sm border border-theme-border h-[300px] flex items-center justify-center text-muted p-6 text-center">
                                <div>
                                    <p className="mb-2 text-4xl">🪙</p>
                                    <p>Select a coin to start trading</p>
                                </div>
                            </div>
                        )}
                    </div>

                </div>

            </div>
        </div>
    );
}