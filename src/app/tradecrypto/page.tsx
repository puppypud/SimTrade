'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import CryptoChart from '@/src/app/components/ui/CryptoChart'; 
// ✅ Import ตัวที่เราเพิ่งสร้าง
import TradeTabsCrypto from '@/src/app/components/features/TradeTabsCrypto';

export default function TradeCryptoPage() {
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
        if(!sym.includes('/')) sym += '/USD';
        
        router.push(`?symbol=${sym}`);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 text-black font-sans p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        
        {/* --- Header & Search Bar --- */}
        <div className="flex flex-col md:flex-row items-center justify-between px-2 mb-6 gap-4">
            <div className="w-full md:w-auto">
                {currentSymbol ? (
                    <div className="flex items-baseline gap-3">
                        <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">
                            {currentSymbol}
                        </h1>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-md">CRYPTO</span>
                    </div>
                ) : (
                    <h1 className="text-2xl font-bold text-gray-400">Crypto Market</h1>
                )}
            </div>

            <form onSubmit={handleSearch} className="w-full md:w-auto flex items-center gap-2">
                <input 
                    type="text" 
                    className="w-full md:w-[300px] bg-white border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 block pl-4 p-3 shadow-sm outline-none" 
                    placeholder="Search (e.g. BTC/USD)..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                />
                <button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95"
                >
                    Search
                </button>
            </form>
        </div>

        {/* --- Main Content Layout --- */}
        <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Chart Section (Left) */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
               {currentSymbol ? (
                  <div className="w-full h-full p-2">
                      <CryptoChart symbol={currentSymbol} />
                  </div>
               ) : (
                   <div className="h-full flex flex-col items-center justify-center text-gray-300">
                       <p className="text-lg font-medium">Please search for a coin to view chart</p>
                   </div>
               )}
            </div>

            {/* Trade Panel Section (Right) */}
            <div className="w-full lg:w-[400px] shrink-0">
                {currentSymbol ? (
                    // ✅ เรียกใช้ Component TradeTabsCrypto ที่นี่
                    <TradeTabsCrypto symbol={currentSymbol} />
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-[300px] flex items-center justify-center text-gray-400 p-6 text-center">
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