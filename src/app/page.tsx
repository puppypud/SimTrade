'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; 
import StockLWChart from '@/src/app/components/ui/Chart';

export default function TradePage() {
  const router = useRouter();
  const searchParams = useSearchParams(); 
  const symbolFromUrl = searchParams.get('symbol'); 

  const [searchInput, setSearchInput] = useState('');
  const [currentSymbol, setCurrentSymbol] = useState('');

  // Sync symbol จาก URL
  useEffect(() => {
    if (symbolFromUrl) {
      setCurrentSymbol(symbolFromUrl);
      setSearchInput(symbolFromUrl); 
    }
  }, [symbolFromUrl]); 

  // ฟังก์ชัน Search
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchInput.trim()) {
      router.push(`/?symbol=${searchInput.toUpperCase()}`);
    }
  };

  return (
    <div className="p-10 bg-gray-50 min-h-screen text-black font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Input Search Example (ถ้ายังต้องการมี) */}
        {/* <div className="mb-6">
             <input 
                type="text" 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search symbol (e.g. AAPL)..."
                className="w-full p-3 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
             />
        </div> */}

        {currentSymbol ? (
            // ✅ เหลือแค่นี้! Component จัดการตัวเองทั้งหมด
            <StockLWChart symbol={currentSymbol} />
        ) : (
            <div className="h-[400px] flex flex-col items-center justify-center text-gray-400 bg-white rounded-3xl shadow-xl border border-gray-100">
                <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
                <p>Search for a symbol in the navbar to start</p>
            </div>
        )}

      </div>
    </div>
  );
}