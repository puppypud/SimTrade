"use client";

import React, { useState, useEffect, useCallback } from "react";
import { brokerService } from "@/src/app/services/brokerService";
import { StockQuote } from "@/src/app/types/broker";
import { formatSymbolDisplay } from "@/src/app/utils/formatters";
import { Trash2, TrendingUp, TrendingDown, Star, Lock } from "lucide-react";
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
                <div key={symbol} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0 flex-shrink-0">
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
                className={`flex flex-col py-5 px-4 border-b border-theme-border/30 last:border-0 transition-all duration-300 cursor-pointer group relative overflow-hidden flex-shrink-0
          ${isSelected ? "bg-gold/5 border-l-2 border-l-gold" : "bg-transparent hover:bg-white/[0.02]"}`}
            >
                {/* Subtle Glow Effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-gold/0 via-gold/0 to-gold/0 group-hover:via-gold/[0.02] transition-all duration-500 pointer-events-none" />
                
                <div className="flex justify-end items-center mb-1">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={(e) => toggleWatchlist(e, symbol)}
                            disabled={isToggling}
                            className={`p-1.5 rounded-lg transition-all border ${
                                inWatchlist 
                                    ? 'bg-gold/10 border-gold/30 text-gold shadow-sm scale-105' 
                                    : 'bg-surface/50 border-theme-border/50 text-muted/40 hover:border-gold/50 hover:text-gold hover:bg-gold/5'
                            } ${isToggling ? 'opacity-50 animate-pulse' : 'active:scale-90'}`}
                            title={inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                        >
                            <Star className={`w-3.5 h-3.5 ${inWatchlist ? 'fill-current' : ''} ${isToggling ? 'animate-spin' : ''}`} />
                        </button>
                        <span className={`text-[9px] font-bold opacity-30 ${rankColor}`}>#{index + 1}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-[110px]">
                        <div className="w-9 h-9 rounded-lg bg-surface/80 border border-theme-border flex items-center justify-center text-gold text-xs font-black shadow-sm group-hover:border-gold/30 transition-all duration-300 group-hover:scale-110">
                            {symbol.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg font-black text-foreground group-hover:text-gold transition-colors leading-tight">
                                {symbol}
                            </span>
                            <span className="text-[9px] font-medium text-muted/60 truncate max-w-[80px] uppercase tracking-tighter">
                                {fullName.split(' ')[0]} {fullName.split(' ')[1] || ''}
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 flex justify-center">
                        <RealSparkline data={bars[symbol]} up={isUp} />
                    </div>

                    <div className="flex flex-col items-end min-w-[80px]">
                        <div className={`flex items-center gap-1 text-[10px] font-black mb-0.5 ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                            {isUp ? '▲' : '▼'} {Math.abs(percentChange).toFixed(2)}%
                        </div>
                        {quote ? (
                            <div className="flex flex-col items-end">
                                <span className="text-lg font-black text-foreground tracking-tighter leading-none">
                                    {quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[8px] font-bold text-muted/40 uppercase tracking-[0.3em] mt-1">USD</span>
                            </div>
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
            <div className="bg-surface/40 backdrop-blur-md rounded-3xl shadow-xl shadow-black/5 border border-theme-border/50 flex flex-col max-h-[600px] overflow-hidden group/panel transition-all duration-500 hover:border-gold/20">
                <div className="p-6 border-b border-theme-border/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center shadow-inner">
                            <Star className="w-5 h-5 text-gold fill-gold/20" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-foreground">Seven Angels</h2>
                            <p className="text-[10px] text-muted/60 font-medium">Top Market Leaders</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col flex-1 overflow-y-auto px-2 py-2 custom-scrollbar">
                    {SEVEN_ANGELS.map((symbol, index) => renderStockItem(symbol, index, false))}
                </div>
            </div>

            {/* My Personal Watchlist (New) */}
            <div className="bg-surface/40 backdrop-blur-md rounded-3xl shadow-xl shadow-black/5 border border-theme-border/50 flex flex-col max-h-[600px] overflow-hidden group/panel transition-all duration-500 hover:border-gold/20">
                <div className="p-6 border-b border-theme-border/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center shadow-inner">
                            <Star className="w-5 h-5 text-gold fill-gold" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-foreground">My Watchlist</h2>
                            <p className="text-[10px] text-muted/60 font-medium">Your Handpicked Assets</p>
                        </div>
                    </div>
                    <span className="text-[10px] font-black bg-gold/10 text-gold px-2.5 py-1 rounded-full uppercase tracking-wider border border-gold/20 shadow-sm">
                        {myWatchlist.length} Items
                    </span>
                </div>

                <div className="flex flex-col flex-1 overflow-y-auto px-2 py-2 custom-scrollbar">
                    {myWatchlist.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted text-sm space-y-4 py-16 text-center opacity-40 group-hover/panel:opacity-60 transition-opacity">
                            <div className="w-16 h-16 rounded-3xl bg-theme-border/30 flex items-center justify-center mb-2 border border-theme-border/50">
                                <Star className="w-8 h-8 text-muted" />
                            </div>
                            <p className="font-medium tracking-tight">Your watchlist is empty<br/><span className="text-[10px] font-bold uppercase tracking-widest mt-2 block">Star stocks to track them</span></p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {myWatchlist.map((symbol, index) => renderStockItem(symbol, index, true))}
                        </div>
                    )}
                </div>
            </div>

            {/* Recommended Stocks Section */}
            <div className="bg-surface/40 backdrop-blur-md rounded-3xl shadow-xl shadow-black/5 border border-theme-border/50 flex flex-col max-h-[600px] overflow-hidden group/panel transition-all duration-500 hover:border-gold/20">
                <div className="p-6 border-b border-theme-border/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center shadow-inner">
                            <TrendingUp className="w-5 h-5 text-gold" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-foreground">
                                {user ? "Recommended" : "Trending"}
                            </h2>
                            <p className="text-[10px] text-muted/60 font-medium">AI Powered Picks</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            const currentIdentity = localStorage.getItem('simtrade_identity') || 'Day Trader';
                            localStorage.removeItem(`simtrade_random_stocks_${currentIdentity}`);
                            window.location.reload();
                        }}
                        className="p-2 rounded-lg bg-surface/50 border border-theme-border/50 text-gold/60 hover:text-gold hover:border-gold transition-all duration-300"
                        title="Refresh Recommendations"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>

                <div className="flex flex-col flex-1 overflow-y-auto px-2 py-2 custom-scrollbar">
                    {recommendedStocks.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted text-sm space-y-4 py-16 text-center opacity-40">
                            <div className="w-16 h-16 rounded-3xl bg-theme-border/30 flex items-center justify-center mb-2 animate-pulse">
                                <TrendingUp className="w-8 h-8 text-muted" />
                            </div>
                            <p className="font-medium tracking-tight">Analyzing market patterns...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {recommendedStocks.map((symbol, index) => renderStockItem(symbol, index, true))}
                        </div>
                    )}
                </div>
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
