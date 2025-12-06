'use client';

import { useState } from 'react';
import { brokerService } from '@/src/app/services/brokerService';
import { StockBar } from '@/src/app/types/broker';
// Import Component กราฟที่เราเพิ่งสร้าง
import StockAreaChart from '@/src/app/components/ui/StockAreaChart';

export default function TradePage() {
  const [symbolInput, setSymbolInput] = useState('');
  
  // State เก็บข้อมูลกราฟแบบ [Timestamp, Price]
  const [chartData, setChartData] = useState<[number, number][]>([]);
  const [currentSymbol, setCurrentSymbol] = useState('');

  const handleShowChart = async () => {
    if (!symbolInput.trim()) return;

    try {
      // 1. ดึงข้อมูลจาก Backend
      const bars = await brokerService.getStockBars(symbolInput.toUpperCase(),setChartData.length > 0 ? '1D' : '5D');
      
      // 2. แปลงข้อมูลจาก StockBar Object -> Array [Time, ClosePrice]
      // Format นี้ ApexCharts แบบ Area ชอบที่สุด
      const formattedData: [number, number][] = bars.map((bar: StockBar) => [
         new Date(bar.t).getTime(), // ค่า X: Timestamp (number)
         bar.c                      // ค่า Y: ราคาปิด (Close Price)
      ]);

      setChartData(formattedData);
      setCurrentSymbol(symbolInput.toUpperCase());

    } catch (error) {
      alert('Failed to load chart data');
    }
  };

  return (
    <div className="p-10 bg-gray-100 min-h-screen text-black">
      <h1 className="text-3xl font-bold mb-6">Trade Stock</h1>

      {/* Input Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 flex gap-4 items-end">
        <div>
          <label className="block text-sm font-bold mb-2">Symbol</label>
          <input
            type="text"
            placeholder="e.g. AAPL"
            className="border p-2 rounded w-40 text-black uppercase"
            value={symbolInput}
            onChange={(e) => setSymbolInput(e.target.value)}
          />
        </div>
        <button
          onClick={handleShowChart}
          className="bg-gray-800 hover:bg-gray-700 text-white font-bold p-2 px-6 rounded h-[42px]"
        >
          Show Chart
        </button>
      </div>

      {/* แสดงกราฟ Area Chart ที่เราสร้างไว้ */}
      {chartData.length > 0 ? (
          <StockAreaChart chartData={chartData} symbol={currentSymbol} />
      ) : (
          <div className="h-[350px] flex items-center justify-center bg-white rounded border text-gray-400">
             No data loaded
          </div>
      )}

    </div>
  );
}