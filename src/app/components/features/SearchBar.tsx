'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { brokerService } from '@/src/app/services/brokerService';
import { StockSearchDto } from '@/src/app/types/broker';
import { formatSymbolDisplay } from "@/src/app/utils/formatters";

const SearchBar = () => {
    const router = useRouter();
    const [searchInput, setSearchInput] = useState('');
    const [results, setResults] = useState<StockSearchDto[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
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
        if (!keyword.trim()) {
            setResults([]);
            setIsDropdownOpen(false);
            return;
        }

        setIsLoading(true);
        try {
            const data = await brokerService.searchAssets(keyword);
            // Backend returns a generic response, ensure to extract array
            const searchResults = Array.isArray(data) ? data : ((data as any).data || []);
            setResults(searchResults);
            setIsDropdownOpen(searchResults.length > 0);
        } catch (error) {
            console.error('Failed to search assets:', error);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchInput(value);

        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

        debounceTimeout.current = setTimeout(() => {
            fetchSearchResults(value);
        }, 300); // 300ms debounce
    };

    const isCryptoSymbol = (symbol: string, exchange?: string) => {
        // Crypto symbols typically contain "/" (e.g., BTC/USD)
        // or come from crypto exchanges
        const cryptoExchanges = ['FTXU', 'CBSE', 'ERSX', 'CRYPTO'];
        return symbol.includes('/') || (exchange && cryptoExchanges.includes(exchange.toUpperCase()));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchInput.trim()) {
            setIsDropdownOpen(false);
            const sym = searchInput.toUpperCase();
            const path = isCryptoSymbol(sym) ? '/tradecrypto' : '/trade';
            router.push(`${path}?symbol=${sym}`);
        }
    };

    const handleSelectSymbol = (symbol: string, exchange?: string) => {
        setSearchInput(symbol);
        setIsDropdownOpen(false);
        const path = isCryptoSymbol(symbol, exchange) ? '/tradecrypto' : '/trade';
        router.push(`${path}?symbol=${symbol.toUpperCase()}`);
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
                placeholder="Search symbol (e.g. AAPL)..."
                value={searchInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                    if (results.length > 0) setIsDropdownOpen(true);
                }}
            />

            {/* Dropdown Results */}
            {isDropdownOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-theme-border rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto">
                    <ul className="py-2">
                        {results.map((result) => (
                            <li
                                key={result.symbol}
                                onClick={() => handleSelectSymbol(result.symbol, result.exchange)}
                                className="px-4 py-2 hover:bg-background cursor-pointer flex justify-between items-center transition-colors"
                            >
                                <div className="flex flex-col">
                                    <span className="font-bold text-foreground">{formatSymbolDisplay(result.symbol)}</span>
                                    <span className="text-xs text-muted truncate max-w-[200px]">{result.name}</span>
                                </div>
                                <span className="text-xs font-medium text-gold bg-gold/10 px-2 py-0.5 rounded">
                                    {result.exchange}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SearchBar;
