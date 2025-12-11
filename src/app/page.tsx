'use client';

import { useState } from 'react';
import { brokerService } from '@/src/app/services/brokerService';
import StockLWChart from '@/src/app/components/ui/Chart';
import { StockBar } from './types/broker';

// Helper Function: แปลงวันที่จาก Backend (Array/String/Number) ให้เป็น Timestamp
const parseDate = (dateVal: any): number => {
  if (!dateVal) return 0;
  
  // กรณี 1: เป็น Array [2023, 12, 30, 10, 0] (ค่า Default ของ Java Local/OffsetDateTime)
  if (Array.isArray(dateVal)) {
    const [year, month, day, hour, minute, second] = dateVal;
    // Month ใน JS เริ่มที่ 0 (Jan) แต่ Java เริ่มที่ 1
    return new Date(year, month - 1, day, hour || 0, minute || 0, second || 0).getTime();
  }

  // กรณี 2: เป็น Timestamp Number
  if (typeof dateVal === 'number') {
    // ถ้าตัวเลขน้อยๆ (เช่น 17xxxxxxxxx) อาจเป็น Seconds ให้คูณ 1000
    return dateVal < 10000000000 ? dateVal * 1000 : dateVal;
  }

  // กรณี 3: เป็น String ISO ("2023-12-01T...")
  return new Date(dateVal).getTime();
};

export default function TradePage() {
  const [symbolInput, setSymbolInput] = useState('');
  const [viewType, setViewType] = useState('1D'); // Default เป็น 1 Day
  
  const [chartData, setChartData] = useState<[number, number][]>([]);
  const [currentSymbol, setCurrentSymbol] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleShowChart = async () => {
    if (!symbolInput.trim()) return;

    setIsLoading(true);
    try {
      // 1. เรียก API ด้วย Symbol และ ViewType ที่เลือก
      const bars: any[] = await brokerService.getStockBars(symbolInput.toUpperCase(), viewType);
      
      console.log("Raw Data form Backend:", bars); // Debug ดูข้อมูลดิบ

      // 2. แปลงข้อมูลพร้อมใช้ Helper parseDate แก้ปัญหาวันที่
      const formattedData: [number, number][] = bars
        .map((bar: StockBar): [number, number] => {
          const x = new Date(bar.t).getTime();
          const y = Number(bar.c); // หรือ parseFloat(bar.c)
          return [x, y];
        })
        .filter((d): d is [number, number] => !isNaN(d[0]) && !isNaN(d[1]));

      // เรียงลำดับเวลาจากอดีต -> ปัจจุบัน (สำคัญมากสำหรับกราฟ)
      formattedData.sort((a, b) => a[0] - b[0]);

      setChartData(formattedData);
      setCurrentSymbol(symbolInput.toUpperCase());

    } catch (error) {
      console.error(error);
      alert('Failed to load chart data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-10 bg-gray-100 min-h-screen text-black">
      <h1 className="text-3xl font-bold mb-6">Trade Stock</h1>

      {/* Input Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 flex flex-wrap gap-4 items-end">
        
        {/* ช่องกรอก Symbol */}
        <div>
          <label className="block text-sm font-bold mb-2 text-gray-700">Symbol</label>
          <input
            type="text"
            placeholder="e.g. AAPL"
            className="border p-2 rounded w-40 text-black uppercase focus:ring-2 focus:ring-blue-500 outline-none"
            value={symbolInput}
            onChange={(e) => setSymbolInput(e.target.value)}
          />
        </div>

        {/* Dropdown เลือก ViewType (Days) */}
        <div>
          <label className="block text-sm font-bold mb-2 text-gray-700">Timeframe</label>
          <select 
            value={viewType}
            onChange={(e) => setViewType(e.target.value)}
            className="border p-2 rounded w-32 text-black focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="1D">1 Day</option>
            <option value="5D">5 Days</option>
            <option value="1M">1 Month</option>
            <option value="6M">6 Months</option>
            <option value="1Y">1 Year</option>
            <option value="5Y">5 Years</option>
          </select>
        </div>

        <button
          onClick={handleShowChart}
          disabled={isLoading}
          className={`font-bold p-2 px-6 rounded h-[42px] transition-colors ${
             isLoading 
               ? 'bg-gray-400 cursor-not-allowed' 
               : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isLoading ? 'Loading...' : 'Show Chart'}
        </button>
      </div>

      {/* Display Chart */}
      {chartData.length > 0 ? (
          <StockLWChart 
             chartData={chartData} 
             symbol={currentSymbol} 
             timeframe={viewType} // *** เพิ่มบรรทัดนี้ ส่ง 1D, 5D เข้าไป
          />
      ) : (
          <div className="h-[350px] flex items-center justify-center bg-white rounded border border-gray-300 text-gray-400 shadow-sm">
             {isLoading ? 'Fetching Data...' : 'Please enter a symbol and select timeframe'}
          </div>
      )}

    </div>
  );
}