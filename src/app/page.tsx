'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; 
import { brokerService } from '@/src/app/services/brokerService';
import StockLWChart from '@/src/app/components/ui/Chart';
import { StockBar } from './types/broker';

const TIMEFRAMES = ['1D', '5D', '1M', '6M', '1Y', '5Y']; 

export default function TradePage() {
  const router = useRouter();
  const searchParams = useSearchParams(); 
  const symbolFromUrl = searchParams.get('symbol'); 

  const [searchInput, setSearchInput] = useState(''); // State สำหรับ Input Search (ถ้ามีในอนาคต หรือ UI อื่นใช้)
  const [viewType, setViewType] = useState('1D');
  const [chartData, setChartData] = useState<[number, number][]>([]);
  const [currentSymbol, setCurrentSymbol] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // State เก็บราคาอ้างอิง (Previous Close หรือ Open) เพื่อคำนวณสี
  const [dayOpen, setDayOpen] = useState<number | undefined>(undefined);

  // ฟังก์ชัน Search (เผื่อใช้ หรือเชื่อมกับ UI เดิม)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchInput.trim()) {
      router.push(`/?symbol=${searchInput.toUpperCase()}`);
    }
  };

  const fetchData = useCallback(async (sym: string, vType: string) => {
    if (!sym) return;
    
    try {
      if (chartData.length === 0) setIsLoading(true);

      console.log(`Fetching data for ${sym} (${vType})...`);
      const bars: any[] = await brokerService.getStockBars(sym, vType);
      
      // 1. เรียงลำดับเวลาให้ถูกต้อง
      bars.sort((a: any, b: any) => new Date(a.t).getTime() - new Date(b.t).getTime());

      let formattedData: [number, number][] = [];
      let referencePrice = undefined;

      if (vType === '1D' && bars.length > 0) {
        // หา "วันที่ของข้อมูลล่าสุด" (Today)
        const lastBar = bars[bars.length - 1];
        const lastBarDate = new Date(lastBar.t).toDateString();

        // -------------------------------------------------------------
        // 🔥 LOGIC ที่ถูกต้อง: แยกข้อมูลวันนี้ vs เมื่อวาน เพื่อหาราคาอ้างอิง
        // -------------------------------------------------------------
        
        // ข้อมูลของวันนี้ (ที่จะเอาไปวาดกราฟ)
        const todayBars = bars.filter((b: any) => new Date(b.t).toDateString() === lastBarDate);
        
        // ข้อมูลของวันก่อนหน้า (เพื่อหาราคาปิดเมื่อวาน)
        const prevBars = bars.filter((b: any) => new Date(b.t).toDateString() !== lastBarDate);

        // หา Reference Price (ราคาฐานสำหรับคำนวณ เขียว/แดง)
        if (prevBars.length > 0) {
            // ✅ กรณี 1: มีข้อมูลเมื่อวาน -> ใช้ "ราคาปิดเมื่อวาน" (Previous Close)
            referencePrice = Number(prevBars[prevBars.length - 1].c);
        } else if (todayBars.length > 0) {
            // ⚠️ กรณี 2: ไม่มีข้อมูลเมื่อวาน -> ใช้ "ราคาเปิดวันนี้" แทน
            referencePrice = Number(todayBars[0].o);
        }

        // กรองข้อมูลที่จะแสดงในกราฟ (เฉพาะของวันนี้)
        // ตัด Pre-market (ก่อน 21:30) ทิ้ง เพื่อให้กราฟสวยเริ่มที่ตลาดเปิด
        const marketOpenTime = new Date(lastBar.t);
        marketOpenTime.setHours(21, 30, 0, 0); 
        
        const marketHoursBars = todayBars.filter((b: any) => new Date(b.t).getTime() >= marketOpenTime.getTime());

        if (marketHoursBars.length > 0) {
             formattedData = marketHoursBars.map((b: any) => [new Date(b.t).getTime(), Number(b.c)]);
             
             // ถ้ายังไม่มี Reference Price ให้ใช้ Open ของแท่งแรกสุดของช่วง Market Hours เป็นฐาน
             if (referencePrice === undefined) {
                 referencePrice = Number(marketHoursBars[0].o);
             }
        } else {
             // ถ้ายังไม่ถึง 21:30 หรือไม่มีข้อมูลช่วงตลาดเปิด ให้แสดงข้อมูลที่มีไปก่อน
             formattedData = todayBars.map((b: any) => [new Date(b.t).getTime(), Number(b.c)]);
        }

      } else if (bars.length > 0) {
        // สำหรับ Timeframe อื่นๆ ใช้ราคาเปิดของแท่งแรกสุด
        referencePrice = Number(bars[0].o);
        formattedData = bars.map((b: any) => [new Date(b.t).getTime(), Number(b.c)]);
      }

      setChartData(formattedData);
      setDayOpen(referencePrice); // ส่งค่าราคาฐานที่ถูกต้องไป
      setIsLoading(false);

    } catch (error) {
      console.error("Fetch error:", error);
      setIsLoading(false);
    }
  }, []); 

  // ... (useEffects เหมือนเดิม)
  useEffect(() => {
    if (symbolFromUrl) {
      setCurrentSymbol(symbolFromUrl);
      setSearchInput(symbolFromUrl); // Sync input
      fetchData(symbolFromUrl, viewType);
    }
  }, [symbolFromUrl, fetchData]); 

  useEffect(() => {
    if (currentSymbol) {
      fetchData(currentSymbol, viewType);
    }
  }, [viewType, currentSymbol, fetchData]);

  useEffect(() => {
    if (!currentSymbol || viewType !== '1D') return;
    const intervalId = setInterval(() => {
        fetchData(currentSymbol, viewType);
    }, 120000); 
    return () => clearInterval(intervalId);
  }, [currentSymbol, viewType, fetchData]);


  return (
    <div className="p-10 bg-gray-50 min-h-screen text-black font-sans">
      
      <div className="max-w-6xl mx-auto">
        
        {/* Container หลักของกราฟ (UI สีขาวแบบเดิม) */}
        <div className="relative bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            
            {/* Timeframe Selector (มุมขวาบน) */}
            <div className="absolute top-6 right-6 z-10 flex bg-gray-100 p-1 rounded-lg">
                {TIMEFRAMES.map((tf) => (
                    <button
                        key={tf}
                        onClick={() => setViewType(tf)}
                        className={`
                            px-4 py-1.5 text-xs font-bold rounded-md transition-all duration-200
                            ${viewType === tf 
                                ? 'bg-white text-blue-600 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
                            }
                        `}
                    >
                        {tf}
                    </button>
                ))}
            </div>

            {/* ส่วนแสดงผลกราฟ */}
            <div className="p-2">
                {chartData.length > 0 ? (
                    <StockLWChart 
                        chartData={chartData} 
                        symbol={currentSymbol} 
                        timeframe={viewType}
                        dayOpenPrice={dayOpen} // ✅ ส่งราคาฐานที่คำนวณถูกต้องไปให้กราฟ
                    />
                ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
                        {isLoading ? (
                           <div className="animate-pulse flex flex-col items-center">
                              <div className="h-4 w-4 bg-blue-500 rounded-full mb-2 animate-bounce"></div>
                              Loading...
                           </div>
                        ) : (
                           <>
                             <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
                             <p>Search for a symbol in the navbar to start</p>
                           </>
                        )}
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}