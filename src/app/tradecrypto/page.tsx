'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import CryptoChart from '@/src/app/components/ui/CryptoChart';
// ✅ Import ตัวที่เราเพิ่งสร้าง
import TradeTabsCrypto from '@/src/app/components/features/TradeTabsCrypto';
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
    const [searchInput, setSearchInput] = useState('');

    useEffect(() => {
        if (symbolFromUrl) {
            setCurrentSymbol(symbolFromUrl);
            setSearchInput('');
        }
    }, [symbolFromUrl]);

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (searchInput.trim()) {
            // บังคับให้เป็นตัวพิมพ์ใหญ่และเติม /USD ถ้าไม่มี (User Experience)
            let sym = searchInput.toUpperCase().trim();
            if (!sym.includes('/')) sym += '/USD';

            router.push(`?symbol=${sym}`);
        }
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

                {/* --- Header & Search Bar --- */}
                <div className="flex flex-col md:flex-row items-center justify-between px-2 mb-6 gap-4">
                    <div className="w-full md:w-auto">
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

                    <form onSubmit={handleSearch} className="w-full md:w-auto flex items-center gap-2">
                        <input
                            type="text"
                            className="w-full md:w-[300px] bg-background border border-theme-border text-foreground text-sm rounded-xl focus:ring-2 focus:ring-gold block pl-4 p-3 shadow-sm outline-none placeholder-muted"
                            placeholder="Search (e.g. BTC/USD)..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="bg-gold hover:bg-gold-hover text-background font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95"
                        >
                            Search
                        </button>
                    </form>
                </div>

                {/* --- Main Content Layout --- */}
                <div className="flex flex-col lg:flex-row gap-6">

                    {/* Left Column: Chart Area */}
                    <div className="flex-1 w-full lg:w-auto min-w-0 flex flex-col">
                        {/* Chart */}
                        <div className="bg-surface rounded-2xl shadow-sm border border-theme-border p-4 mb-6 relative z-10 w-full flex-1 min-h-[500px]">
                            {currentSymbol ? (
                                <CryptoChart symbol={currentSymbol} />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted w-full">
                                    <p className="text-lg font-medium">Please search for a coin to view chart</p>
                                </div>
                            )}
                        </div>
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