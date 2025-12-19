'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; // เพิ่ม useRouter
import CryptoChart from '@/src/app/components/ui/CryptoChart'; 
import TradeTabs from '@/src/app/components/features/TradeTabs';

export default function TradeCryptoPage() {
  const router = useRouter(); // เรียกใช้ Router
  const searchParams = useSearchParams(); 
  const symbolFromUrl = searchParams.get('symbol'); 
  
  const [currentSymbol, setCurrentSymbol] = useState('');
  const [searchInput, setSearchInput] = useState(''); // State สำหรับช่อง Search ในหน้านี้

  // อัปเดต currentSymbol เมื่อ URL เปลี่ยน
  useEffect(() => {
    if (symbolFromUrl) {
      setCurrentSymbol(symbolFromUrl);
      setSearchInput(''); // ล้างช่องค้นหาหลังจากโหลดเสร็จ (Optional)
    }
  }, [symbolFromUrl]); 

  // ฟังก์ชันค้นหา
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchInput.trim()) {
      // เปลี่ยน URL parameter เพื่อให้ useEffect ทำงานและโหลดข้อมูลใหม่
      router.push(`?symbol=${searchInput.toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 text-black font-sans p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        
        {/* --- Header Section & Search Bar --- */}
        {/* ปรับให้เป็น Flex row เพื่อวางชื่อเหรียญซ้าย และช่องค้นหาขวา */}
        <div className="flex flex-col md:flex-row items-center justify-between px-2 mb-6 gap-4">
            
            {/* Left: Title Display */}
            <div className="w-full md:w-auto">
                {currentSymbol ? (
                    <div className="flex items-baseline gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                        <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">
                            {currentSymbol}
                        </h1>
                        <span className="text-lg font-medium text-gray-400">/ USD</span>
                    </div>
                ) : (
                    <h1 className="text-2xl font-bold text-gray-400">Crypto Market</h1>
                )}
            </div>

            {/* Right: Independent Search Box (ช่องค้นหาแยกของตัวเอง) */}
            <form onSubmit={handleSearch} className="w-full md:w-auto flex items-center gap-2">
                <div className="relative group w-full md:w-[300px]">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                    </div>
                    <input 
                        type="text" 
                        className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block pl-10 p-3 shadow-sm transition-all" 
                        placeholder="Search Crypto (e.g. BTC, ETH)..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                </div>
                <button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-colors active:scale-95"
                >
                    Search
                </button>
            </form>

        </div>

        {/* --- Main Layout Wrapper (Chart & Trade) --- */}
        <div className="flex flex-col lg:flex-row bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px] lg:h-[700px]">
            
            {/* Left Column: Crypto Chart Area */}
            <div className="flex-1 relative border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col">
               {currentSymbol ? (
                   <div className="absolute inset-0 w-full h-full p-2">
                      <CryptoChart symbol={currentSymbol} />
                   </div>
               ) : (
                   // Empty State
                   <div className="flex-1 flex flex-col items-center justify-center text-gray-300 bg-gray-50/30">
                       <div className="p-6 rounded-full bg-gray-100 mb-4 animate-pulse">
                           <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                       </div>
                       <p className="text-lg font-medium">Enter a symbol above to view chart</p>
                   </div>
               )}
            </div>

            {/* Right Column: Sidebar / Trade Panel */}
            <div className="w-full lg:w-[380px] bg-gray-50/50 flex flex-col border-l border-gray-100">
               <div className="p-6 h-full overflow-y-auto custom-scrollbar flex flex-col gap-4">
                  
                  {currentSymbol ? (
                      <TradeTabs symbol={currentSymbol} />
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                          {/* Instructions */}
                          <div className="w-full p-6 rounded-2xl bg-white border border-gray-200 shadow-sm">
                              <h3 className="font-bold text-gray-700">Ready to Trade?</h3>
                              <p className="text-xs text-gray-400 mt-1">Use the search box at the top right to find a coin.</p>
                          </div>
                      </div>
                  )}

               </div>
            </div>

        </div>

      </div>
    </div>
  );
}