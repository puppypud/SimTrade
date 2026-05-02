'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { brokerService } from '@/src/app/services/brokerService';
import { StockSearchDto } from '@/src/app/types/broker';
import { formatSymbolDisplay } from "@/src/app/utils/formatters";

interface SearchBarProps {
    type?: 'stock' | 'crypto';
    placeholder?: string;
}

const SearchBar = ({ type = 'stock', placeholder }: SearchBarProps) => {
    const router = useRouter();
    const [searchInput, setSearchInput] = useState('');
    const [results, setResults] = useState<StockSearchDto[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchSearchResults = async (keyword: string) => {
        const trimmedKeyword = keyword.trim();
        if (!trimmedKeyword) {
            setResults([]);
            setIsDropdownOpen(false);
            setIsLoading(false);
            return;
        }

        try {
            const data = await brokerService.searchAssets(trimmedKeyword);
            const searchResults = Array.isArray(data) ? data : ((data as any).data || []);
            setResults(searchResults);
        } catch (error) {
            console.error('Failed to search assets:', error);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let rawValue = e.target.value;
        let refinedValue = '';
        setSearchError(null);

        if (type === 'crypto') {
            // โหมด Crypto: อนุญาตให้พิมพ์สแลชได้ และแปลงเป็นตัวใหญ่
            refinedValue = rawValue.replace(/[^a-zA-Z0-9\s/]/g, '').toUpperCase();
            
            // ดักจับ Contract Address (ขึ้นต้นด้วย 0X)
            if (refinedValue.startsWith('0X') && refinedValue.length > 2) {
                setSearchError('กรุณาพิมพ์ชื่อเหรียญ (เช่น BTC) แทนการใช้ Contract Address ครับ');
                setSearchInput(refinedValue);
                setIsDropdownOpen(true);
                return;
            }
        } else {
            // โหมดปกติ แต่เมื่อรวมคริปโตแล้ว ต้องอนุญาตให้พิมพ์สแลช (/) ได้ด้วยเช่นกัน
            refinedValue = rawValue.replace(/[^a-zA-Z0-9\s/]/g, '').toUpperCase();
        }

        setSearchInput(refinedValue);

        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

        if (!refinedValue.trim()) {
            setResults([]);
            setIsDropdownOpen(false);
            setIsLoading(false);
            return;
        }

        setIsDropdownOpen(true);
        setIsLoading(true);

        debounceTimeout.current = setTimeout(() => {
            fetchSearchResults(refinedValue);
        }, 500); // 500ms debounce
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchInput.trim()) {
            setIsDropdownOpen(false);
            router.push(`/trade?symbol=${searchInput.toUpperCase()}`);
        }
    };

    const handleSelectSymbol = (symbol: string) => {
        setSearchInput(symbol);
        setIsDropdownOpen(false);
        router.push(`/trade?symbol=${symbol.toUpperCase()}`);
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {isLoading ? (
                    <svg className="h-5 w-5 text-gold animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                )}
            </div>
            <input
                type="text"
                className="w-full bg-background border border-theme-border text-foreground text-sm rounded-4xl focus:ring-2 focus:ring-gold focus:border-gold block pl-10 p-2.5 outline-none transition-all placeholder-muted"
                placeholder={placeholder || (type === 'crypto' ? "ค้นหาเหรียญ (เช่น BTC, ETH)..." : "Search symbol (e.g. AAPL)...")}
                value={searchInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                    if (results.length > 0) setIsDropdownOpen(true);
                }}
            />

            {/* Dropdown Results */}
            {isDropdownOpen && searchInput.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-theme-border rounded-xl shadow-xl z-50 max-h-72 overflow-y-auto">
                    {searchError ? (
                        <div className="p-6 flex flex-col items-center justify-center text-center bg-background/50 rounded-xl">
                            <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-3 border border-red-500/20">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <p className="text-sm font-bold text-red-400 max-w-[200px]">{searchError}</p>
                        </div>
                    ) : isLoading ? (
                        <div className="p-6 flex flex-col items-center justify-center text-muted gap-3 bg-background/50">
                            <svg className="h-6 w-6 text-gold animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-sm font-medium">กำลังค้นหาข้อมูล...</span>
                        </div>
                    ) : results.length > 0 ? (
                        <ul className="py-2">
                            {results.map((result) => (
                                <li
                                    key={result.symbol}
                                    onClick={() => handleSelectSymbol(result.symbol)}
                                    className="px-4 py-3 hover:bg-gold/5 cursor-pointer flex justify-between items-center transition-colors border-b border-theme-border/30 last:border-0"
                                >
                                    <div className="flex flex-col">
                                        <span className="font-bold text-foreground text-lg">{formatSymbolDisplay(result.symbol)}</span>
                                        <span className="text-xs text-muted truncate max-w-[200px]">{result.name}</span>
                                    </div>
                                    <span className="text-[10px] font-black tracking-wider text-gold border border-gold/30 bg-gold/5 px-2 py-1 rounded-md uppercase">
                                        {result.exchange}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-6 flex flex-col items-center justify-center text-center bg-background/50 rounded-xl">
                            <div className="w-12 h-12 bg-theme-border/50 text-muted rounded-full flex items-center justify-center mb-3">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <p className="text-sm font-medium text-muted mb-4">ไม่พบข้อมูลหุ้น <span className="text-foreground font-bold">'{searchInput}'</span></p>
                            
                            <div className="w-full h-px bg-theme-border/50 mb-4"></div>
                            
                            <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-3">คุณอาจจะสนใจหุ้นเหล่านี้:</p>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                {['MSFT', 'GOOGL', 'AMZN', 'AAPL'].map(sym => (
                                    <button 
                                        key={sym}
                                        onClick={() => handleSelectSymbol(sym)}
                                        className="text-[11px] font-bold text-gold border border-gold/40 hover:bg-gold/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer block hover:scale-105"
                                    >
                                        {sym}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchBar;
