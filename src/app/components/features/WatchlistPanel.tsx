"use client";

import React, { useState, useEffect, useCallback } from "react";
import { brokerService } from "@/src/app/services/brokerService";
import { StockQuote } from "@/src/app/types/broker";
import { formatSymbolDisplay } from "@/src/app/utils/formatters";
import { Trash2, Plus, TrendingUp, TrendingDown, Star, Lock } from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";

interface WatchlistPanelProps {
    onSelectSymbol: (symbol: string) => void;
    currentSymbol?: string;
}

const SEVEN_ANGELS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA"];

// Mock Full Names for the layout
const COMPANY_NAMES: Record<string, string> = {
    "AAPL": "Apple Inc.",
    "MSFT": "Microsoft Corporation",
    "GOOGL": "Alphabet Inc.",
    "AMZN": "Amazon.com, Inc.",
    "NVDA": "NVIDIA Corporation",
    "META": "Meta Platforms, Inc.",
    "TSLA": "Tesla, Inc."
};

export default function WatchlistPanel({ onSelectSymbol, currentSymbol }: WatchlistPanelProps) {
    const { user } = useAuth();
    const [recommendedStocks, setRecommendedStocks] = useState<string[]>([]);
    const [myWatchlist, setMyWatchlist] = useState<string[]>([]);
    const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
    const [bars, setBars] = useState<Record<string, number[]>>({}); 
    const [loading, setLoading] = useState(true);
    const [expandedSeven, setExpandedSeven] = useState(false);
    const [expandedRecommended, setExpandedRecommended] = useState(false);
    const [expandedMyWatchlist, setExpandedMyWatchlist] = useState(false);
    const [showGuestModal, setShowGuestModal] = useState(false);
    const [togglingSymbols, setTogglingSymbols] = useState<Set<string>>(new Set());

    const toggleWatchlist = async (e: React.MouseEvent, symbol: string) => {
        e.stopPropagation();
        if (!user) {
            setShowGuestModal(true);
            return;
        }

        if (togglingSymbols.has(symbol)) return;

        setTogglingSymbols(prev => new Set(prev).add(symbol));
        console.log(`[Watchlist] Toggling ${symbol} for user ${user.id}`);

        try {
            if (myWatchlist.includes(symbol)) {
                await brokerService.removeFromWatchlist(user.id, symbol);
                setMyWatchlist(prev => prev.filter(s => s !== symbol));
            } else {
                await brokerService.addToWatchlist(user.id, symbol);
                setMyWatchlist(prev => [...prev, symbol]);
            }
        } catch (error) {
            console.error("[Watchlist] Failed to update:", error);
            alert("ไม่สามารถอัปเดต Watchlist ได้ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setTogglingSymbols(prev => {
                const next = new Set(prev);
                next.delete(symbol);
                return next;
            });
        }
    };

    const handleRowClick = (symbol: string) => {
        if (!user) {
            setShowGuestModal(true);
        } else {
            onSelectSymbol(symbol);
        }
    };

    const fetchMyWatchlist = useCallback(async () => {
        if (user?.id) {
            try {
                const list = await brokerService.getWatchlist(user.id);
                setMyWatchlist(list);
            } catch (error) {
                console.error("Failed to fetch personal watchlist:", error);
            }
        }
    }, [user?.id]);

    useEffect(() => {
        const fetchIdentityAndStocks = async () => {
            let currentIdentity = localStorage.getItem('simtrade_identity') || 'Day Trader';
            if (user?.id) {
                try {
                    const profile = await brokerService.getUserProfile(user.id);
                    if (profile.traderType && profile.traderType !== 'Unknown') {
                        currentIdentity = profile.traderType;
                        localStorage.setItem('simtrade_identity', currentIdentity);
                    }
                    // Also fetch personal watchlist
                    fetchMyWatchlist();
                } catch (e) {
                    console.error("Failed to load trader identity", e);
                }
            }

            const storedRandoms = localStorage.getItem(`simtrade_random_stocks_${currentIdentity}`);
            if (storedRandoms) {
                try {
                    const parsed = JSON.parse(storedRandoms);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setRecommendedStocks(parsed);
                        return;
                    }
                } catch (e) { }
            }

            try {
                const selected = await brokerService.getRecommendedStocks(currentIdentity);
                if (selected && selected.length > 0) {
                    setRecommendedStocks(selected);
                    localStorage.setItem(`simtrade_random_stocks_${currentIdentity}`, JSON.stringify(selected));
                }
            } catch (error) {
                console.error("Failed to fetch recommended stocks from API", error);
            }
        };
        fetchIdentityAndStocks();
    }, [user, fetchMyWatchlist]);

    const fetchQuotes = useCallback(async () => {
        const allSymbols = [...new Set([...SEVEN_ANGELS, ...recommendedStocks, ...myWatchlist])];

        const promises = allSymbols.map(async (sym) => {
            try {
                const data = await brokerService.getLatestQuote(sym);
                return { symbol: sym, data };
            } catch (error) {
                return { symbol: sym, data: null };
            }
        });

        const results = await Promise.all(promises);

        setQuotes((prev) => {
            const newQuotes = { ...prev };
            results.forEach((res) => {
                if (res.data) {
                    newQuotes[res.symbol] = res.data;
                }
            });
            return newQuotes;
        });
        setLoading(false);

    }, [recommendedStocks, myWatchlist]);

    const fetchBars = useCallback(async () => {
        const symbols = [...new Set([...SEVEN_ANGELS, ...recommendedStocks, ...myWatchlist])];
        const newBars: Record<string, number[]> = {};

        await Promise.all(symbols.map(async (sym) => {
            try {
                const data = await brokerService.getStockBars(sym, '1D');
                if (data && Array.isArray(data) && data.length > 0) {
                    newBars[sym] = data.map(b => b.c); 
                }
            } catch (error) {
                console.error(`Error fetching bars for ${sym}:`, error);
            }
        }));

        setBars(prev => ({ ...prev, ...newBars }));
    }, [recommendedStocks, myWatchlist]);

    // Initial fetch and polling
    useEffect(() => {
        fetchQuotes();
        fetchBars();
        const quoteInterval = setInterval(fetchQuotes, 5000); 
        const barInterval = setInterval(fetchBars, 60000);   
        return () => {
            clearInterval(quoteInterval);
            clearInterval(barInterval);
        };
    }, [fetchQuotes, fetchBars]);

    const renderStockItem = (symbol: string, index: number, isFavoriteList: boolean = false) => {
        const quote = quotes[symbol];
        const isSelected = symbol === currentSymbol;
        const fullName = COMPANY_NAMES[symbol] || `${symbol} Inc.`;
        const inWatchlist = myWatchlist.includes(symbol);
        const isToggling = togglingSymbols.has(symbol);

        let percentChange = 0;
        if (quote) {
            const basePrice = quote.prevClose || quote.openPrice;
            if (basePrice) {
                percentChange = ((quote.price - basePrice) / basePrice) * 100;
            }
        }

        const isUp = percentChange >= 0;

        const RealSparkline = ({ data, up }: { data: number[], up: boolean }) => {
            if (!data || data.length < 2) {
                return (
                    <div className="flex-1 flex justify-center px-4">
                        <svg width="80" height="32" viewBox="0 0 80 32" className="opacity-30">
                            <line x1="0" y1="16" x2="80" y2="16" stroke="currentColor" strokeWidth="1" strokeDasharray="4" />
                        </svg>
                    </div>
                );
            }

            const min = Math.min(...data);
            const max = Math.max(...data);
            const range = max - min || 1;
            const width = 80;
            const height = 32;

            const points = data.map((val, i) => {
                const x = (i / (data.length - 1)) * width;
                const y = height - ((val - min) / range) * height * 0.8 - (height * 0.1);
                return `${x},${y}`;
            }).join(' ');

            const color = up ? "#10b981" : "#ef4444";
            const fillGradientId = `grad-${symbol}-${up ? 'up' : 'down'}`;

            return (
                <div className="flex-1 flex justify-center px-2">
                    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                        <defs>
                            <linearGradient id={fillGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.2 }} />
                                <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
                            </linearGradient>
                        </defs>
                        <path
                            d={`M 0 ${height} L ${points} L ${width} ${height} Z`}
                            fill={`url(#${fillGradientId})`}
                        />
                        <polyline
                            points={points}
                            fill="none"
                            stroke={color}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
            );
        };

        if (loading && !quote) {
            return (
                <div key={symbol} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="w-4 h-4 bg-gray-200 rounded animate-pulse mr-4"></div>
                    <div className="flex-1 flex flex-col gap-1.5">
                        <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="w-12 h-3 bg-gray-100 rounded animate-pulse"></div>
                    </div>
                    <div className="flex-1 flex justify-center">
                        <div className="w-16 h-6 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 w-20">
                        <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="w-12 h-3 bg-gray-100 rounded animate-pulse"></div>
                    </div>
                </div>
            );
        }

        const rankColor = index < 3 ? "text-orange-500" : "text-muted";

        return (
            <div
                key={symbol}
                onClick={() => handleRowClick(symbol)}
                className={`flex flex-col py-4 px-4 border-b border-theme-border/50 last:border-0 transition-all cursor-pointer group relative hover:bg-gold/5
          ${isSelected ? "bg-gold/10" : "bg-transparent"}`}
            >
                <div className="flex justify-between items-center mb-2">
                    <div className="flex gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-gold/10 text-gold text-[9px] font-black uppercase tracking-wider border border-gold/20">
                            {SEVEN_ANGELS.includes(symbol) ? "หุ้นสหรัฐฯ" : (user ? "แนะนำพิเศษ" : "Trending")}
                        </span>
                        {isUp && percentChange > 5 && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-wider border border-emerald-500/20">
                                Hot 🔥
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={(e) => toggleWatchlist(e, symbol)}
                            disabled={isToggling}
                            className={`p-2.5 rounded-xl transition-all border-2 ${
                                inWatchlist 
                                    ? 'bg-gold border-gold text-surface shadow-lg scale-105 shadow-gold/20' 
                                    : 'bg-surface border-theme-border text-gold hover:border-gold hover:bg-gold/5'
                            } ${isToggling ? 'opacity-50 animate-pulse' : 'active:scale-95'}`}
                            title={inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                        >
                            <Star className={`w-5 h-5 ${inWatchlist ? 'fill-current' : ''} ${isToggling ? 'animate-spin' : ''}`} />
                        </button>
                        <span className={`text-[10px] font-bold ${rankColor}`}>#{index + 1}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-[120px]">
                        <div className="w-10 h-10 rounded-xl bg-surface border border-theme-border flex items-center justify-center text-gold text-sm font-black shadow-sm group-hover:border-gold/50 transition-colors">
                            {symbol.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-foreground group-hover:text-gold transition-colors leading-none mb-1">
                                {symbol}
                            </span>
                            <span className="text-[10px] font-medium text-muted truncate max-w-[100px]">
                                {fullName.split(' ')[0]} {fullName.split(' ')[1] || ''}
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 flex justify-center">
                        <RealSparkline data={bars[symbol]} up={isUp} />
                    </div>

                    <div className="flex flex-col items-end min-w-[90px]">
                        <div className={`flex items-center gap-1 text-[11px] font-black mb-1 ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                            {isUp ? '↗' : '↘'} {Math.abs(percentChange).toFixed(2)}%
                        </div>
                        {quote ? (
                            <>
                                <span className="text-xl font-black text-foreground tracking-tight">
                                    {quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                </span>
                                <span className="text-[9px] font-bold text-muted uppercase tracking-[0.2em] mt-0.5">USD</span>
                            </>
                        ) : (
                            <span className="text-xs text-muted">Loading...</span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
            {/* Seven Angels Section */}
            <div className="bg-surface rounded-2xl shadow-sm border border-theme-border flex flex-col max-h-[600px] overflow-hidden">
                <div className="p-5 border-b border-theme-border flex items-center gap-2">
                    <Star className="w-5 h-5 text-gold fill-gold" />
                    <h2 className="text-lg font-bold text-foreground">Seven Angels</h2>
                </div>

                <div className="flex flex-col flex-1 overflow-y-auto px-5 py-3 custom-scrollbar">
                    {SEVEN_ANGELS.slice(0, expandedSeven ? undefined : 4).map((symbol, index) => renderStockItem(symbol, index, false))}
                </div>

                {SEVEN_ANGELS.length > 4 && (
                    <button
                        onClick={() => setExpandedSeven(!expandedSeven)}
                        className="w-full py-3 bg-surface border-t border-theme-border flex items-center justify-center gap-2 text-xs font-black text-muted hover:text-gold transition-colors"
                    >
                        {expandedSeven ? "ย่อลง" : "ดูเพิ่มเติม"}
                        <Plus className={`w-3 h-3 transition-transform ${expandedSeven ? 'rotate-45' : ''}`} />
                    </button>
                )}
            </div>

            {/* My Personal Watchlist (New) */}
            <div className="bg-surface rounded-2xl shadow-sm border border-gold/30 flex flex-col max-h-[600px] overflow-hidden bg-gradient-to-br from-surface to-gold/5">
                <div className="p-5 border-b border-gold/20 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Star className="w-5 h-5 text-gold fill-gold" />
                        My Watchlist
                    </h2>
                    <span className="text-[10px] font-black bg-gold/10 text-gold px-2 py-1 rounded-md uppercase tracking-wider">
                        {myWatchlist.length} Items
                    </span>
                </div>

                <div className="flex flex-col flex-1 overflow-y-auto px-5 py-3 custom-scrollbar">
                    {myWatchlist.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted text-sm space-y-3 py-12 text-center opacity-60">
                            <div className="w-12 h-12 rounded-2xl bg-theme-border flex items-center justify-center mb-2">
                                <Star className="w-6 h-6 text-muted" />
                            </div>
                            <p>ไม่มีหุ้นใน Watchlist<br/><span className="text-[10px]">กดดาวที่หุ้นเพื่อบันทึกไว้ดูภายหลัง</span></p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {myWatchlist.slice(0, expandedMyWatchlist ? undefined : 4).map((symbol, index) => renderStockItem(symbol, index, true))}
                        </div>
                    )}
                </div>

                {myWatchlist.length > 4 && (
                    <button
                        onClick={() => setExpandedMyWatchlist(!expandedMyWatchlist)}
                        className="w-full py-3 bg-surface border-t border-theme-border flex items-center justify-center gap-2 text-xs font-black text-muted hover:text-gold transition-colors"
                    >
                        {expandedMyWatchlist ? "ย่อลง" : "ดูเพิ่มเติม"}
                        <Plus className={`w-3 h-3 transition-transform ${expandedMyWatchlist ? 'rotate-45' : ''}`} />
                    </button>
                )}
            </div>

            {/* Recommended Stocks Section */}
            <div className="bg-surface rounded-2xl shadow-sm border border-theme-border flex flex-col max-h-[600px] overflow-hidden">
                <div className="p-5 border-b border-theme-border flex items-center justify-between">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-gold" />
                        {user ? "ตัวเลือกแนะนำตามสไตล์คุณ" : "Trending Stocks"}
                    </h2>
                    <button
                        onClick={() => {
                            const currentIdentity = localStorage.getItem('simtrade_identity') || 'Day Trader';
                            localStorage.removeItem(`simtrade_random_stocks_${currentIdentity}`);
                            window.location.reload();
                        }}
                        className="text-[10px] font-black text-gold border border-gold/30 px-2 py-1 rounded-lg hover:bg-gold/10 transition-colors uppercase"
                    >
                        Refresh
                    </button>
                </div>

                <div className="flex flex-col flex-1 overflow-y-auto px-5 py-3 custom-scrollbar">
                    {recommendedStocks.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted text-sm space-y-2 py-12 text-center">
                            <Star className="w-8 h-8 text-theme-border animate-pulse" />
                            <p>Loading recommendations...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {recommendedStocks.slice(0, expandedRecommended ? undefined : 4).map((symbol, index) => renderStockItem(symbol, index, true))}
                        </div>
                    )}
                </div>

                {recommendedStocks.length > 4 && (
                    <button
                        onClick={() => setExpandedRecommended(!expandedRecommended)}
                        className="w-full py-3 bg-surface border-t border-theme-border flex items-center justify-center gap-2 text-xs font-black text-muted hover:text-gold transition-colors"
                    >
                        {expandedRecommended ? "ย่อลง" : "ดูเพิ่มเติม"}
                        <Plus className={`w-3 h-3 transition-transform ${expandedRecommended ? 'rotate-45' : ''}`} />
                    </button>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: #d1d5db;
        }
      `}} />


            {/* Guest Modal Overlay */}
            {showGuestModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setShowGuestModal(false)}
                >
                    <div 
                        className="bg-surface border border-theme-border rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-16 h-16 bg-yellow-400/10 rounded-full flex items-center justify-center mb-5">
                            <Lock className="w-8 h-8 text-yellow-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-3">เฉพาะสมาชิกเท่านั้น</h3>
                        <p className="text-muted text-sm mb-8 leading-relaxed">
                            กรุณาเข้าสู่ระบบ หรือสมัครสมาชิกเพื่อเริ่มต้นจำลองการเทรดและเข้าถึงฟีเจอร์อย่างเต็มรูปแบบ
                        </p>
                        <div className="flex gap-3 w-full">
                            <button 
                                onClick={() => setShowGuestModal(false)} 
                                className="flex-1 py-3 rounded-xl border-2 border-theme-border text-foreground font-bold hover:bg-background transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button 
                                onClick={() => window.location.href = '/register'} 
                                className="flex-1 py-3 rounded-xl bg-yellow-400 text-[#1A1A1A] font-extrabold hover:bg-yellow-500 transition-colors"
                            >
                                สมัครสมาชิก
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
