'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation'; 
import StockLWChart from '@/src/app/components/ui/Chart';
import TradeTabs from '@/src/app/components/features/TradeTabs';

export default function TradePage() {
  const searchParams = useSearchParams(); 
  const symbolFromUrl = searchParams.get('symbol'); 
  const [currentSymbol, setCurrentSymbol] = useState('');

  useEffect(() => {
    if (symbolFromUrl) setCurrentSymbol(symbolFromUrl);
  }, [symbolFromUrl]); 

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 text-black font-sans p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Header Section (แสดงชื่อหุ้น หรือ Placeholder) */}
        <div className="flex items-center justify-between px-2 mb-4">
            {currentSymbol ? (
                <h1 className="text-2xl font-bold text-gray-800 animate-in fade-in slide-in-from-left-2 duration-300">
                    {currentSymbol} / USD
                </h1>
            ) : (
                <h1 className="text-2xl font-bold text-gray-400">Market Overview</h1>
            )}
        </div>

        {/* Main Layout Wrapper (โครงสร้างหลัก แบ่งซ้าย-ขวา เสมอ) */}
        <div className="flex flex-col lg:flex-row bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px] lg:h-[700px]">
            
            {/* Left Column: Chart Area */}
            <div className="flex-1 relative border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col">
               {currentSymbol ? (
                   <div className="absolute inset-0 w-full h-full p-2">
                      <StockLWChart symbol={currentSymbol} />
                   </div>
               ) : (
                   // Empty State for Chart Area
                   <div className="flex-1 flex flex-col items-center justify-center text-gray-300 bg-gray-50/30">
                       <div className="p-6 rounded-full bg-gray-100 mb-4 animate-pulse">
                           <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
                       </div>
                       <p className="text-lg font-medium">Select a symbol to view chart</p>
                   </div>
               )}
            </div>

            {/* Right Column: Sidebar / Trade Panel */}
            <div className="w-full lg:w-[380px] bg-gray-50/50 flex flex-col border-l border-gray-100">
               <div className="p-6 h-full overflow-y-auto custom-scrollbar flex flex-col gap-4">
                  
                  {currentSymbol ? (
                      <>
                        {/* Active Trade Panel */}
                        <TradeTabs symbol={currentSymbol} />
                      </>
                  ) : (
                      // Empty State for Sidebar
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                          
                          {/* Search Prompt */}
                          <div className="w-full p-6 rounded-2xl bg-white border border-gray-200 shadow-sm">
                              <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                              </div>
                              <h3 className="font-bold text-gray-700">Ready to Trade?</h3>
                              <p className="text-xs text-gray-400 mt-1">Search for a symbol above to start.</p>
                          </div>

                          {/* Placeholder for News/Info */}
                          <div className="w-full p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 text-gray-400 text-xs">
                              Market News or Account Summary could go here...
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