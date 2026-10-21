'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { brokerService } from '@/src/app/services/brokerService';
import { StockFilterRequest } from '@/src/app/types/broker';
import { X, SlidersHorizontal, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

// =================== FILTER DATA ===================

const MARKET_CAP_TIERS = [
    { id: 'MEGA', label: 'Mega Cap', desc: '> $200B' },
    { id: 'LARGE', label: 'Large Cap', desc: '$10B – $200B' },
    { id: 'MID', label: 'Mid Cap', desc: '$2B – $10B' },
    { id: 'SMALL', label: 'Small Cap', desc: '$300M – $2B' },
    { id: 'MICRO', label: 'Micro Cap', desc: '< $300M' },
];

const SECTORS = [
    'Software', 'Semiconductors & Semiconductor Equipment', 'Technology Hardware, Storage & Peripherals',
    'IT Services', 'Electronic Equipment, Instruments & Components', 'Communications Equipment',
    'Interactive Media & Services', 'Entertainment', 'Media', 'Banks', 'Capital Markets',
    'Consumer Finance', 'Insurance', 'Diversified Financial Services', 'Thrifts & Mortgage Finance',
    'Health Care Equipment & Supplies', 'Health Care Providers & Services', 'Pharmaceuticals',
    'Biotechnology', 'Life Sciences Tools & Services', 'Health Care Technology',
    'Internet & Direct Marketing Retail', 'Specialty Retail', 'Hotels, Restaurants & Leisure',
    'Multiline Retail', 'Distributors', 'Textiles, Apparel & Luxury Goods', 'Automobiles',
    'Food & Staples Retailing', 'Food Products', 'Beverages', 'Household Products', 'Personal Products',
    'Oil, Gas & Consumable Fuels', 'Energy Equipment & Services', 'Electric Utilities', 'Multi-Utilities',
    'Aerospace & Defense', 'Machinery', 'Industrial Conglomerates', 'Commercial Services & Supplies',
    'Chemicals', 'Metals & Mining', 'Equity Real Estate Investment Trusts (REITs)', 'Real Estate Management & Development'
];

const CATEGORIES = [
    { id: 'มั่นคง (Stable)', label: 'Stable (หุ้นมั่นคง)', desc: 'เน้นปันผล ความผันผวนต่ำ พื้นฐานแข็งแกร่ง', color: '#22C55E' },
    { id: 'เล่นรอบ (Swing)', label: 'Swing (หุ้นเล่นรอบ)', desc: 'เหมาะสำหรับทำกำไรตามรอบราคา ผันผวนปานกลาง', color: '#3B82F6' },
    { id: 'กระแส (Trending)', label: 'Trending (หุ้นกระแส)', desc: 'หุ้นที่มี Momentum สูง มีแนวโน้มชัดเจน', color: '#F59E0B' },
    { id: 'เก็งกำไร (Speculative)', label: 'Speculative (หุ้นเก็งกำไร)', desc: 'ผันผวนสูงมาก เสี่ยงสูงแต่กำไรสูง', color: '#EF4444' },
];

const PRICE_PRESETS = [
    { label: 'Under $10', min: 0, max: 10 },
    { label: '$10 – $50', min: 10, max: 50 },
    { label: '$50 – $200', min: 50, max: 200 },
    { label: '$200 – $500', min: 200, max: 500 },
    { label: 'Over $500', min: 500, max: undefined },
];


// =================== COMPONENT ===================

interface FilterSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function FilterSheet({ isOpen, onClose }: FilterSheetProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Filter State
    const [selectedMarketCaps, setSelectedMarketCaps] = useState<string[]>([]);
    const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [priceMin, setPriceMin] = useState<string>('');
    const [priceMax, setPriceMax] = useState<string>('');
    const [keyword, setKeyword] = useState('');

    // Section expand/collapse
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        category: true,
        marketCap: true,
        sector: false,
        price: true,
    });

    // Count active filters
    const activeFilterCount = [
        selectedMarketCaps.length > 0,
        selectedSectors.length > 0,
        selectedCategories.length > 0,
        priceMin !== '' || priceMax !== '',
        keyword !== '',
    ].filter(Boolean).length;

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
        setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
    };

    const handlePricePreset = (min: number, max: number | undefined) => {
        setPriceMin(min.toString());
        setPriceMax(max !== undefined ? max.toString() : '');
    };

    const resetAll = () => {
        setSelectedMarketCaps([]);
        setSelectedSectors([]);
        setSelectedCategories([]);
        setPriceMin('');
        setPriceMax('');
        setKeyword('');
    };

    const handleApply = async () => {
        setIsLoading(true);
        try {
            const filterRequest: StockFilterRequest = {};

            if (selectedMarketCaps.length > 0) filterRequest.marketCapTiers = selectedMarketCaps;
            if (selectedSectors.length > 0) filterRequest.sectors = selectedSectors;
            if (selectedCategories.length > 0) filterRequest.categories = selectedCategories;
            if (priceMin !== '') filterRequest.priceMin = parseFloat(priceMin);
            if (priceMax !== '') filterRequest.priceMax = parseFloat(priceMax);
            if (keyword.trim() !== '') filterRequest.keyword = keyword.trim();

            // Encode filter as URL search params and navigate to results page
            const params = new URLSearchParams();
            if (filterRequest.marketCapTiers) params.set('marketCapTiers', filterRequest.marketCapTiers.join(','));
            if (filterRequest.sectors) params.set('sectors', filterRequest.sectors.join(','));
            if (filterRequest.categories) params.set('categories', filterRequest.categories.join(','));
            if (filterRequest.priceMin !== undefined) params.set('priceMin', filterRequest.priceMin.toString());
            if (filterRequest.priceMax !== undefined) params.set('priceMax', filterRequest.priceMax.toString());
            if (filterRequest.keyword) params.set('keyword', filterRequest.keyword);

            onClose();
            router.push(`/trade/filter-results?${params.toString()}`);
        } catch (error) {
            console.error('Filter error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Sheet Panel */}
            <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-surface border-l border-theme-border z-50 flex flex-col shadow-2xl animate-slide-in-right">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-theme-border">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center">
                            <SlidersHorizontal className="w-5 h-5 text-gold" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Filters</h2>
                            {activeFilterCount > 0 && (
                                <p className="text-xs text-muted">{activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {activeFilterCount > 0 && (
                            <button
                                onClick={resetAll}
                                className="text-xs font-medium text-gold hover:text-gold-hover transition-colors px-3 py-1.5 rounded-lg hover:bg-gold/10"
                            >
                                Reset All
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-background transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 custom-scrollbar">

                    {/* Keyword Search */}
                    <div className="pb-4">
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value.toUpperCase())}
                            placeholder="Search symbol or name..."
                            className="w-full bg-background border border-theme-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-all"
                        />
                    </div>

                    {/* ===== SECTION: Category (ประเภทนักเทรด) ===== */}
                    <FilterSection
                        title="Category (ประเภทนักเทรด)"
                        isExpanded={expandedSections.category}
                        onToggle={() => toggleSection('category')}
                        count={selectedCategories.length}
                    >
                        <div className="space-y-2">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => toggleItem(selectedCategories, setSelectedCategories, cat.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all text-left ${selectedCategories.includes(cat.id)
                                            ? 'bg-gold/15 border-gold shadow-[0_0_12px_rgba(255,215,0,0.15)]'
                                            : 'bg-background border-theme-border hover:border-gold/30'
                                        }`}
                                >
                                    <div
                                        className="w-3 h-3 rounded-full shrink-0"
                                        style={{ backgroundColor: cat.color }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-medium ${selectedCategories.includes(cat.id) ? 'text-gold' : 'text-foreground'}`}>
                                            {cat.label}
                                        </p>
                                        <p className="text-xs text-muted truncate">{cat.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </FilterSection>

                    {/* ===== SECTION: Market Cap ===== */}
                    <FilterSection
                        title="Market Cap"
                        isExpanded={expandedSections.marketCap}
                        onToggle={() => toggleSection('marketCap')}
                        count={selectedMarketCaps.length}
                    >
                        <div className="space-y-2">
                            {MARKET_CAP_TIERS.map(tier => (
                                <button
                                    key={tier.id}
                                    onClick={() => toggleItem(selectedMarketCaps, setSelectedMarketCaps, tier.id)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${selectedMarketCaps.includes(tier.id)
                                            ? 'bg-gold/15 border-gold text-gold shadow-[0_0_12px_rgba(255,215,0,0.15)]'
                                            : 'bg-background border-theme-border text-foreground hover:border-gold/30'
                                        }`}
                                >
                                    <span className="font-medium">{tier.label}</span>
                                    <span className={`text-xs ${selectedMarketCaps.includes(tier.id) ? 'text-gold/70' : 'text-muted'}`}>
                                        {tier.desc}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </FilterSection>

                    {/* ===== SECTION: Sector ===== */}
                    <FilterSection
                        title="Sector"
                        isExpanded={expandedSections.sector}
                        onToggle={() => toggleSection('sector')}
                        count={selectedSectors.length}
                    >
                        <div className="flex flex-wrap gap-2">
                            {SECTORS.map(sector => (
                                <button
                                    key={sector}
                                    onClick={() => toggleItem(selectedSectors, setSelectedSectors, sector)}
                                    className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${selectedSectors.includes(sector)
                                            ? 'bg-gold/15 border-gold text-gold'
                                            : 'bg-background border-theme-border text-muted hover:border-gold/30 hover:text-foreground'
                                        }`}
                                >
                                    {sector}
                                </button>
                            ))}
                        </div>
                    </FilterSection>

                    {/* ===== SECTION: Price Range ===== */}
                    <FilterSection
                        title="Price Range"
                        isExpanded={expandedSections.price}
                        onToggle={() => toggleSection('price')}
                        count={(priceMin !== '' || priceMax !== '') ? 1 : 0}
                    >
                        <div className="space-y-3">
                            {/* Quick Presets */}
                            <div className="flex flex-wrap gap-2">
                                {PRICE_PRESETS.map((preset, i) => {
                                    const isActive = priceMin === preset.min.toString() && priceMax === (preset.max?.toString() || '');
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => handlePricePreset(preset.min, preset.max)}
                                            className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${isActive
                                                    ? 'bg-gold/15 border-gold text-gold'
                                                    : 'bg-background border-theme-border text-muted hover:border-gold/30 hover:text-foreground'
                                                }`}
                                        >
                                            {preset.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Custom Range */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <label className="text-xs text-muted mb-1 block">Min ($)</label>
                                    <input
                                        type="number"
                                        value={priceMin}
                                        onChange={(e) => setPriceMin(e.target.value)}
                                        placeholder="0"
                                        className="w-full bg-background border border-theme-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-all"
                                    />
                                </div>
                                <span className="text-muted mt-5">—</span>
                                <div className="flex-1">
                                    <label className="text-xs text-muted mb-1 block">Max ($)</label>
                                    <input
                                        type="number"
                                        value={priceMax}
                                        onChange={(e) => setPriceMax(e.target.value)}
                                        placeholder="Any"
                                        className="w-full bg-background border border-theme-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </FilterSection>

                </div>

                {/* Bottom Actions */}
                <div className="px-5 py-4 border-t border-theme-border bg-surface/80 backdrop-blur-sm">
                    <button
                        onClick={handleApply}
                        disabled={isLoading}
                        className="w-full py-3.5 bg-gold hover:bg-gold-hover text-black font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-gold/20 hover:shadow-gold/30 active:scale-[0.98]"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Applying Filters...
                            </>
                        ) : (
                            <>
                                <SlidersHorizontal className="w-4 h-4" />
                                Apply Filters
                                {activeFilterCount > 0 && (
                                    <span className="bg-black/20 text-black text-xs px-2 py-0.5 rounded-full ml-1">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Slide-in Animation */}
            <style jsx global>{`
                @keyframes slide-in-right {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-in-right {
                    animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: var(--border);
                    border-radius: 100px;
                }
            `}</style>
        </>
    );
}


// =================== SUB-COMPONENTS ===================

function FilterSection({
    title,
    isExpanded,
    onToggle,
    count,
    children,
}: {
    title: string;
    isExpanded: boolean;
    onToggle: () => void;
    count: number;
    children: React.ReactNode;
}) {
    return (
        <div className="border-b border-theme-border/50 last:border-b-0">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between py-3.5 text-sm font-semibold text-foreground hover:text-gold transition-colors group"
            >
                <div className="flex items-center gap-2">
                    {title}
                    {count > 0 && (
                        <span className="bg-gold/15 text-gold text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                            {count}
                        </span>
                    )}
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted group-hover:text-gold transition-colors" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-muted group-hover:text-gold transition-colors" />
                )}
            </button>
            {isExpanded && (
                <div className="pb-4 animate-fade-in">
                    {children}
                </div>
            )}
        </div>
    );
}
