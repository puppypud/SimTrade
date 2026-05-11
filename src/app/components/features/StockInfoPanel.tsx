'use client';

import React, { useEffect, useState } from 'react';
import { brokerService } from '@/src/app/services/brokerService';
import { StockInfoDatabaseDTO } from '@/src/app/types/broker';
import { Info, AlertCircle } from 'lucide-react';

interface StockInfoPanelProps {
    symbol: string;
}

const StockInfoPanel: React.FC<StockInfoPanelProps> = ({ symbol }) => {
    const [info, setInfo] = useState<StockInfoDatabaseDTO | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchInfo = async () => {
            if (!symbol) return;
            
            // --- Hardcode for Crypto ---
            const cleanSymbol = symbol.trim().toUpperCase();
            if (cleanSymbol === 'BTC/USD' || cleanSymbol === 'BTC') {
                setInfo({
                    symbol: 'BTC/USD',
                    name: 'Bitcoin',
                    beta: 1.60,
                    marketCap: 1590000000000,
                    volume: 40500000000,
                    category: 'กระแส (Trending)',
                    industry: 'Crypto'
                } as any);
                setIsLoading(false);
                return;
            }
            if (cleanSymbol === 'ETH/USD' || cleanSymbol === 'ETH') {
                setInfo({
                    symbol: 'ETH/USD',
                    name: 'Ethereum',
                    beta: 1.92,
                    marketCap: 281600000000,
                    volume: 15200000000,
                    category: 'กระแส (Trending)',
                    industry: 'Crypto'
                } as any);
                setIsLoading(false);
                return;
            }
            // ---------------------------

            setIsLoading(true);
            setError(null);
            try {
                const data = await brokerService.getStockInfoDetail(symbol);
                setInfo(data);
            } catch (err: any) {
                console.error('Failed to fetch stock info:', err);
                setError('Information not available for this symbol.');
                setInfo(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInfo();
    }, [symbol]);

    if (isLoading) {
        return (
            <div className="bg-surface rounded-2xl shadow-sm border border-theme-border p-6 mb-6 animate-pulse">
                <div className="h-6 bg-theme-border rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                    <div className="h-4 bg-theme-border rounded w-full"></div>
                    <div className="h-4 bg-theme-border rounded w-5/6"></div>
                    <div className="h-4 bg-theme-border rounded w-4/6"></div>
                </div>
            </div>
        );
    }

    if (error || !info) {
        return (
            <div className="bg-surface rounded-2xl shadow-sm border border-theme-border p-6 mb-6 flex items-start gap-3 text-muted">
                <AlertCircle className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-semibold text-foreground">Company Overview</h3>
                    <p className="text-sm mt-1">{error || 'No detailed information available.'}</p>
                </div>
            </div>
        );
    }

    const formatNumber = (num: number) => {
        if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toLocaleString();
    };

    const getTraderTypeFromCategory = (category: string) => {
        if (!category) return "Unknown";
        const cat = category.toUpperCase();
        if (cat.includes("SPECULATIVE") || cat.includes("เก็งกำไร") || cat.includes("HIGH_VOLATILITY"))
            return "Scalper";
        if (cat.includes("TRENDING") || cat.includes("กระแส"))
            return "Day Trader";
        if (cat.includes("SWING") || cat.includes("เล่นรอบ"))
            return "Swing Trader";
        if (cat.includes("STABLE") || cat.includes("มั่นคง") || cat.includes("BLUECHIP") || cat.includes("DIVIDEND"))
            return "Position Trader";
        return "Unknown";
    };

    const traderType = getTraderTypeFromCategory(info.category);

    return (
        <div className="bg-surface rounded-2xl shadow-sm border border-theme-border p-6 mb-6 transition-colors duration-300">
            <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-gold" />
                <h2 className="text-lg font-bold text-foreground">About {info.name || symbol}</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-background p-3 rounded-lg border border-theme-border">
                    <span className="text-xs text-muted font-semibold uppercase tracking-wider block mb-1">Sector</span>
                    <span className="text-sm text-foreground font-medium">{info.category || '-'}</span>
                </div>

                <div className="bg-background p-3 rounded-lg border border-theme-border">
                    <span className="text-xs text-muted font-semibold uppercase tracking-wider block mb-1">Trader Type</span>
                    <span className="text-sm text-foreground font-medium">{traderType}</span>
                </div>

                <div className="bg-background p-3 rounded-lg border border-theme-border">
                    <span className="text-xs text-muted font-semibold uppercase tracking-wider block mb-1">Industry</span>
                    <span className="text-sm text-foreground font-medium truncate" title={info.industry}>{info.industry || '-'}</span>
                </div>

                <div className="bg-background p-3 rounded-lg border border-theme-border">
                    <span className="text-xs text-muted font-semibold uppercase tracking-wider block mb-1">Market Cap</span>
                    <span className="text-sm text-foreground font-medium font-mono">{info.marketCap ? `$${formatNumber(info.marketCap)}` : '-'}</span>
                </div>

                <div className="bg-background p-3 rounded-lg border border-theme-border">
                    <span className="text-xs text-muted font-semibold uppercase tracking-wider block mb-1">Beta</span>
                    <span className="text-sm text-foreground font-medium font-mono">{info.beta ? info.beta.toFixed(2) : '-'}</span>
                </div>
            </div>
        </div>
    );
};

export default StockInfoPanel;
