"use client";

import React, { useState, useEffect, useCallback } from "react";
import { brokerService } from "@/src/app/services/brokerService";
import { StockQuote } from "@/src/app/types/broker";
import { Trash2, Plus, TrendingUp, TrendingDown, Star } from "lucide-react";

interface WatchlistPanelProps {
    onSelectSymbol: (symbol: string) => void;
    currentSymbol?: string;
}

const SEVEN_ANGELS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA"];
const LOCAL_STORAGE_KEY = "simtrade_my_favorites";

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
    const [favorites, setFavorites] = useState<string[]>([]);
    const [newFavorite, setNewFavorite] = useState("");
    const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
    const [loading, setLoading] = useState(true);

    // Load favorites from local storage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (stored) {
                setFavorites(JSON.parse(stored));
            }
        } catch (e) {
            console.error("Failed to load favorites", e);
        }
    }, []);

    // Save favorites whenever it changes
    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(favorites));
    }, [favorites]);

    const fetchQuotes = useCallback(async () => {
        const allSymbols = [...new Set([...SEVEN_ANGELS, ...favorites])];

        // We fetch one by one concurrently. If backend supported batch, it would be better.
        const promises = allSymbols.map(async (sym) => {
            try {
                const data = await brokerService.getLatestQuote(sym);
                return { symbol: sym, data };
            } catch (error) {
                // Return null data for failed fetch to keep processing others
                console.error(`Error fetching quote for ${sym}:`, error);
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

    }, [favorites]);

    // Initial fetch and polling
    useEffect(() => {
        fetchQuotes();
        const intervalId = setInterval(fetchQuotes, 5000); // 5 seconds polling
        return () => clearInterval(intervalId);
    }, [fetchQuotes]);

    const handleAddFavorite = (e: React.FormEvent) => {
        e.preventDefault();
        const symbol = newFavorite.trim().toUpperCase();
        if (!symbol) return;

        if (!favorites.includes(symbol) && !SEVEN_ANGELS.includes(symbol)) {
            setFavorites(prev => [...prev, symbol]);
            // Instantly trigger a fetch for the new symbol
            brokerService.getLatestQuote(symbol).then(data => {
                setQuotes(prev => ({ ...prev, [symbol]: data }));
            }).catch(err => console.error("Error fetching new favorite:", err));
        }
        setNewFavorite("");
    };

    const handleRemoveFavorite = (e: React.MouseEvent, symbolToRemove: string) => {
        e.stopPropagation();
        setFavorites(prev => prev.filter(sym => sym !== symbolToRemove));
    };

    const handleQuickAdd = (e: React.MouseEvent, symbolToAdd: string) => {
        e.stopPropagation();
        if (!favorites.includes(symbolToAdd)) {
            setFavorites(prev => [...prev, symbolToAdd]);
            // Instantly trigger a fetch
            brokerService.getLatestQuote(symbolToAdd).then(data => {
                setQuotes(prev => ({ ...prev, [symbolToAdd]: data }));
            }).catch(err => console.error("Error fetching new favorite:", err));
        }
    };

    const renderStockItem = (symbol: string, index: number, isFavoriteList: boolean = false) => {
        const quote = quotes[symbol];
        const isSelected = symbol === currentSymbol;
        const fullName = COMPANY_NAMES[symbol] || `${symbol} Inc.`;

        let percentChange = 0;
        if (quote) {
            if (quote.openPrice) {
                percentChange = ((quote.price - quote.openPrice) / quote.openPrice) * 100;
            } else {
                // Deterministic mock based on symbol and last price
                const symVal = symbol.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
                const priceVal = Math.floor(quote.price) || 0;
                const seed = symVal + priceVal;

                // Generates a mock percentage between -5% and +5%
                const mockRange = (seed % 1000) / 100;
                percentChange = seed % 2 === 0 ? mockRange : -mockRange;
            }
        }

        const isUp = percentChange >= 0;

        // Mock Sparkline SVG
        const renderSparkline = (up: boolean) => {
            const color = up ? "stroke-emerald-500" : "stroke-red-500";
            const fill = up ? "fill-emerald-500/10" : "fill-red-500/10";
            const pathUp = "M 0 20 L 5 18 L 10 22 L 20 12 L 25 15 L 35 5 L 45 8 L 55 2 L 60 4";
            const pathDown = "M 0 4 L 5 2 L 15 12 L 20 8 L 30 18 L 35 15 L 45 22 L 55 18 L 60 20";

            return (
                <div className="flex-1 flex justify-center px-4">
                    <svg width="60" height="24" viewBox="0 0 60 24" className="opacity-80">
                        <path d={up ? pathUp : pathDown} className={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        <path d={(up ? pathUp : pathDown) + " L 60 24 L 0 24 Z"} className={`${fill} border-0`} />
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

        // Top 3 numbers are orange, the rest are muted
        const rankColor = index < 3 ? "text-orange-500" : "text-muted";

        return (
            <div
                key={symbol}
                onClick={() => onSelectSymbol(symbol)}
                className={`flex items-center justify-between py-2 border-b border-theme-border/50 last:border-0 transition-colors cursor-pointer group relative
          ${isSelected ? "bg-gold/10" : "hover:bg-background"}`}
            >
                {/* 1. Ranking Index */}
                <span className={`text-xs font-semibold w-6 shrink-0 ${rankColor}`}>
                    {index + 1}
                </span>

                {/* 2. Logo Container (Mock) */}
                <div className="w-6 h-6 rounded-full bg-background text-gold flex items-center justify-center text-[10px] font-bold mr-3 shrink-0">
                    {symbol.charAt(0)}
                </div>

                {/* 3. Name & Symbol Stack */}
                <div className="flex flex-col flex-1 min-w-[120px]">
                    <span className="text-sm font-bold text-foreground truncate leading-tight group-hover:text-gold transition-colors">
                        {fullName}
                    </span>
                    <span className="text-[11px] font-medium text-muted mt-0.5">
                        {symbol}
                    </span>
                </div>

                {/* 4. Center Sparkline */}
                {quote ? renderSparkline(isUp) : <div className="flex-1"></div>}

                {/* 5. Last Price & % Change Right-aligned */}
                <div className="flex flex-col items-end min-w-[80px] shrink-0">
                    {quote ? (
                        <>
                            <span className={`text-sm font-bold ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                                {quote.price.toFixed(4)}
                            </span>
                            <span className={`text-[11px] font-semibold mt-0.5 px-1.5 py-0.5 rounded-sm ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                {isUp ? '+' : ''}{percentChange.toFixed(2)}%
                            </span>
                        </>
                    ) : (
                        <span className="text-xs text-muted">N/A</span>
                    )}
                </div>

                {/* Hover Actions - Absolute positioned on the right edge so it doesn't shift layout */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-surface via-surface to-transparent pl-6 pr-2 py-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelectSymbol(symbol);
                        }}
                        className="text-[10px] font-bold text-background bg-gold hover:bg-gold-hover px-3 py-1.5 rounded-full transition-colors uppercase tracking-wider shadow-sm"
                    >
                        Trade
                    </button>

                    {!isFavoriteList && !favorites.includes(symbol) && (
                        <button
                            onClick={(e) => handleQuickAdd(e, symbol)}
                            className="p-1.5 text-gold bg-background border border-theme-border hover:bg-theme-border rounded-full transition-colors shadow-sm"
                            title="Add to favorites"
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    )}

                    {isFavoriteList && (
                        <button
                            onClick={(e) => handleRemoveFavorite(e, symbol)}
                            className="p-1.5 text-red-500 bg-background border border-theme-border hover:bg-theme-border rounded-full transition-colors shadow-sm"
                            title="Remove from favorites"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // Common Header Component
    const TableHeader = () => (
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-theme-border text-[10px] font-semibold text-muted uppercase tracking-wider px-1">
            <span className="w-6 shrink-0">No.</span>
            <span className="flex-1 min-w-[120px] ml-3">Symbol / Name</span>
            <span className="flex-1 text-center">Trend</span>
            <span className="min-w-[80px] shrink-0 text-right">% Change</span>
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full min-h-[500px]">
            {/* Seven Angels Section */}
            <div className="bg-surface rounded-2xl shadow-sm border border-theme-border flex flex-col max-h-[600px] overflow-hidden">
                <div className="p-5 border-b border-theme-border flex items-center gap-2">
                    <Star className="w-5 h-5 text-gold fill-gold" />
                    <h2 className="text-lg font-bold text-foreground">Seven Angels</h2>
                </div>

                <div className="flex flex-col flex-1 overflow-y-auto px-5 py-3 custom-scrollbar">
                    <TableHeader />
                    {SEVEN_ANGELS.map((symbol, index) => renderStockItem(symbol, index, false))}
                </div>
            </div>

            {/* My Favorites Section */}
            <div className="bg-surface rounded-2xl shadow-sm border border-theme-border flex flex-col h-full max-h-[600px] overflow-hidden">
                <div className="p-5 border-b border-theme-border flex items-center justify-between">
                    <h2 className="text-lg font-bold text-foreground">My Favorites</h2>
                </div>

                <form onSubmit={handleAddFavorite} className="px-5 pt-4 pb-2 relative">
                    <input
                        type="text"
                        value={newFavorite}
                        onChange={(e) => setNewFavorite(e.target.value)}
                        placeholder="Add symbol e.g. NFLX"
                        className="w-full pl-3 pr-10 py-2 bg-background border border-theme-border rounded-xl text-sm font-medium text-foreground focus:ring-2 focus:ring-gold focus:border-transparent outline-none uppercase placeholder-muted placeholder:normal-case shadow-inner"
                        maxLength={10}
                    />
                    <button
                        type="submit"
                        disabled={!newFavorite.trim()}
                        className="absolute right-7 top-1/2 -translate-y-[20%] p-1.5 bg-surface shadow-sm border border-theme-border text-gold rounded-lg hover:border-gold/50 hover:bg-theme-border disabled:opacity-50 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </form>

                <div className="flex flex-col flex-1 overflow-y-auto px-5 pb-3">
                    <TableHeader />
                    {favorites.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted text-sm space-y-2 py-12 text-center">
                            <Star className="w-8 h-8 text-theme-border" />
                            <p>Your watchlist is empty.</p>
                            <p className="text-xs">Add your favorite stocks to track them easily.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {favorites.map((symbol, index) => renderStockItem(symbol, index, true))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick CSS for scrollbar inside this component */}
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
        </div>
    );
}
