'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { brokerService } from '@/src/app/services/brokerService';
import { FilteredStockResult, StockFilterRequest } from '@/src/app/types/broker';
import { ArrowLeft, SlidersHorizontal, TrendingUp, TrendingDown, Loader2, AlertTriangle } from 'lucide-react';

export default function FilterResultsPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-background flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-8 h-8 text-gold animate-spin" />
                        <p className="text-muted text-sm">Loading filter results...</p>
                    </div>
                </div>
            }
        >
            <FilterResultsContent />
        </Suspense>
    );
}

function FilterResultsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [results, setResults] = useState<FilteredStockResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Parse filter from URL search params
    const parseFilters = (): StockFilterRequest => {
        const filter: StockFilterRequest = {};
        const assetTypes = searchParams.get('assetTypes');
        const marketCapTiers = searchParams.get('marketCapTiers');
        const sectors = searchParams.get('sectors');
        const categories = searchParams.get('categories');
        const priceMin = searchParams.get('priceMin');
        const priceMax = searchParams.get('priceMax');
        const keyword = searchParams.get('keyword');

        if (assetTypes) filter.assetTypes = assetTypes.split(',');
        if (marketCapTiers) filter.marketCapTiers = marketCapTiers.split(',');
        if (sectors) filter.sectors = sectors.split(',');
        if (categories) filter.categories = categories.split(',');
        if (priceMin) filter.priceMin = parseFloat(priceMin);
        if (priceMax) filter.priceMax = parseFloat(priceMax);
        if (keyword) filter.keyword = keyword;

        return filter;
    };

    // Get active filter tags for display
    const getActiveFilters = (): string[] => {
        const tags: string[] = [];
        const assetTypes = searchParams.get('assetTypes');
        const marketCapTiers = searchParams.get('marketCapTiers');
        const sectors = searchParams.get('sectors');
        const categories = searchParams.get('categories');
        const priceMin = searchParams.get('priceMin');
        const priceMax = searchParams.get('priceMax');

        if (assetTypes) assetTypes.split(',').forEach(t => tags.push(t === 'US_EQUITY' ? 'Stocks' : 'Crypto'));
        if (marketCapTiers) marketCapTiers.split(',').forEach(t => tags.push(t.charAt(0) + t.slice(1).toLowerCase() + ' Cap'));
        if (sectors) sectors.split(',').forEach(s => tags.push(s));
        if (categories) categories.split(',').forEach(c => tags.push(c.charAt(0) + c.slice(1).toLowerCase()));
        if (priceMin || priceMax) {
            const min = priceMin || '0';
            const max = priceMax || '∞';
            tags.push(`$${min} – $${max}`);
        }
        return tags;
    };

    useEffect(() => {
        const fetchResults = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const filter = parseFilters();
                const data = await brokerService.filterStocks(filter);
                setResults(data);
            } catch (err: any) {
                console.error('Failed to fetch filter results:', err);
                const errorData = err?.response?.data;
                const errorMessage = typeof errorData === 'string' 
                    ? errorData 
                    : errorData?.message || errorData?.error || 'Failed to load results. Please try again.';
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };
        fetchResults();
    }, [searchParams]);

    const handleStockClick = (symbol: string, assetClass: string) => {
        const path = assetClass === 'CRYPTO' || symbol.includes('/') ? '/tradecrypto' : '/trade';
        router.push(`${path}?symbol=${symbol}`);
    };

    const activeTags = getActiveFilters();

    return (
        <div className="min-h-[calc(100vh-64px)] bg-background text-foreground font-sans transition-colors duration-300">

            {/* Header */}
            <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-theme-border">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-sm font-bold text-muted hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>
                        <div className="flex items-center gap-2 text-gold">
                            <SlidersHorizontal className="w-4 h-4" />
                            <span className="text-sm font-semibold">
                                {isLoading ? 'Filtering...' : `${results.length} Result${results.length !== 1 ? 's' : ''}`}
                            </span>
                        </div>
                    </div>

                    <h1 className="text-xl font-bold text-foreground mb-2">Filter Results</h1>

                    {/* Active Filter Tags */}
                    {activeTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {activeTags.map((tag, i) => (
                                <span
                                    key={i}
                                    className="bg-gold/10 text-gold text-xs font-medium px-2.5 py-1 rounded-full border border-gold/20"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-4 py-4">

                {/* Loading State */}
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-theme-border rounded-full" />
                            <div className="absolute inset-0 w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin" />
                        </div>
                        <p className="text-muted text-sm">Fetching market data...</p>
                        <p className="text-muted/50 text-xs">This may take a moment for price calculations</p>
                    </div>
                )}

                {/* Error State */}
                {error && !isLoading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                            <AlertTriangle className="w-7 h-7 text-red-400" />
                        </div>
                        <p className="text-foreground font-medium">Something went wrong</p>
                        <p className="text-muted text-sm text-center max-w-md">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-2 px-5 py-2 bg-gold text-black text-sm font-bold rounded-xl hover:bg-gold-hover transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && !error && results.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center">
                            <SlidersHorizontal className="w-7 h-7 text-gold" />
                        </div>
                        <p className="text-foreground font-medium">No stocks match your filters</p>
                        <p className="text-muted text-sm text-center max-w-md">
                            Try adjusting your filter criteria to see more results
                        </p>
                        <button
                            onClick={() => router.back()}
                            className="mt-2 px-5 py-2 bg-gold text-black text-sm font-bold rounded-xl hover:bg-gold-hover transition-colors"
                        >
                            Adjust Filters
                        </button>
                    </div>
                )}

                {/* Results List */}
                {!isLoading && !error && results.length > 0 && (
                    <div className="space-y-2">
                        {results.map((stock, index) => (
                            <button
                                key={stock.symbol}
                                onClick={() => handleStockClick(stock.symbol, stock.assetClass)}
                                className="w-full flex items-center gap-4 px-4 py-4 bg-surface border border-theme-border rounded-2xl hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 transition-all duration-200 group active:scale-[0.99]"
                                style={{ animationDelay: `${index * 40}ms` }}
                            >
                                {/* Left: Badge + Info */}
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {/* Asset Type Badge */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                                        stock.assetClass === 'CRYPTO'
                                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                            : 'bg-gold/10 text-gold border border-gold/20'
                                    }`}>
                                        {stock.assetClass === 'CRYPTO' ? '₿' : 'S'}
                                    </div>

                                    {/* Symbol + Name */}
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-foreground text-sm group-hover:text-gold transition-colors">
                                                {stock.symbol}
                                            </span>
                                            {stock.marketCapTier && stock.marketCapTier !== 'UNKNOWN' && (
                                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-background text-muted border border-theme-border">
                                                    {stock.marketCapTier}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted truncate mt-0.5">
                                            {stock.name}
                                        </p>
                                        {stock.industry && (
                                            <p className="text-[10px] text-muted/60 truncate">
                                                {stock.industry}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Price + Return */}
                                <div className="text-right shrink-0">
                                    {stock.currentPrice !== null && stock.currentPrice !== undefined ? (
                                        <p className="text-sm font-bold text-foreground">
                                            ${Number(stock.currentPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    ) : (
                                        <p className="text-sm font-medium text-muted">—</p>
                                    )}
                                    {stock.oneYearReturnPct !== null && stock.oneYearReturnPct !== undefined ? (
                                        <div className={`flex items-center justify-end gap-1 mt-0.5 ${
                                            Number(stock.oneYearReturnPct) >= 0 ? 'text-gold' : 'text-red-400'
                                        }`}>
                                            {Number(stock.oneYearReturnPct) >= 0 ? (
                                                <TrendingUp className="w-3 h-3" />
                                            ) : (
                                                <TrendingDown className="w-3 h-3" />
                                            )}
                                            <span className="text-xs font-semibold">
                                                {Number(stock.oneYearReturnPct) >= 0 ? '+' : ''}{Number(stock.oneYearReturnPct).toFixed(2)}%
                                            </span>
                                            <span className="text-[10px] text-muted ml-0.5">1Y</span>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted mt-0.5">No data</p>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
