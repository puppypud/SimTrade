'use client';

import { useEffect, useState } from 'react';
import { brokerService } from '@/src/app/services/brokerService';
import { Position } from '@/src/app/types/broker';

interface PortfolioTableProps {
  accountId: string;
}

export default function PortfolioTable({ accountId }: PortfolioTableProps) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const data = await brokerService.getOpenPositions(accountId);
        setPositions(data);
        
        // คำนวณมูลค่าพอร์ตรวมเพื่อหา % Weight
        const total = data.reduce((sum, pos) => sum + pos.marketValue, 0);
        setTotalPortfolioValue(total);
      } catch (error) {
        console.error("Failed to fetch positions", error);
      } finally {
        setLoading(false);
      }
    };

    if (accountId) {
      fetchPositions();
    }
  }, [accountId]);

  if (loading) return <div className="p-4 text-center text-gray-400">Loading Portfolio...</div>;
  if (positions.length === 0) return <div className="p-4 text-center text-gray-400">No open positions.</div>;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800 bg-[#1e1e1e] shadow-lg">
      <table className="w-full text-left text-sm text-gray-300">
        <thead className="bg-gray-900 text-xs uppercase text-gray-400">
          <tr>
            <th className="px-6 py-4 font-medium">Symbol</th>
            <th className="px-6 py-4 font-medium text-right">Price / Avg Cost</th>
            <th className="px-6 py-4 font-medium text-right">Day's Change</th>
            <th className="px-6 py-4 font-medium text-right">Total P/L</th>
            <th className="px-6 py-4 font-medium text-right">Holdings</th>
            <th className="px-6 py-4 font-medium text-right">Weight</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {positions.map((pos) => {
            // คำนวณค่าต่างๆ
            const isProfit = pos.unrealizedPl > 0;
            const isDayProfit = pos.changeToday > 0;
            const weight = totalPortfolioValue > 0 ? (pos.marketValue / totalPortfolioValue) * 100 : 0;
            
            // Format ตัวเลข
            const formatMoney = (val: number) => val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const formatPercent = (val: number) => (val * 100).toFixed(2) + '%';

            return (
              <tr key={pos.assetId} className="hover:bg-gray-800/50 transition-colors">
                {/* 1. Symbol & Logo */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img 
                      src={`https://logo.clearbit.com/${pos.symbol}.com`} 
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      alt={pos.symbol}
                      className="h-8 w-8 rounded-full bg-white object-contain p-0.5"
                    />
                    <div>
                      <div className="font-bold text-white text-lg">{pos.symbol}</div>
                      <div className="text-xs text-gray-500">{pos.exchange}</div>
                    </div>
                  </div>
                </td>

                {/* 2. & 5. Current Price & Avg Entry */}
                <td className="px-6 py-4 text-right">
                  <div className="text-white font-medium">${formatMoney(pos.currentPrice)}</div>
                  <div className="text-xs text-gray-500">Avg: ${parseFloat(pos.avgEntryPrice).toFixed(2)}</div>
                </td>

                {/* 6. & 7. Change Today & Intraday P/L */}
                <td className="px-6 py-4 text-right">
                  <div className={`font-medium ${isDayProfit ? 'text-green-400' : 'text-red-400'}`}>
                    {isDayProfit ? '+' : ''}{formatPercent(pos.changeToday)}
                  </div>
                  <div className={`text-xs ${isDayProfit ? 'text-green-500/70' : 'text-red-500/70'}`}>
                    {isDayProfit ? '+' : ''}${formatMoney(pos.unrealizedIntradayPl)}
                  </div>
                </td>

                {/* 2. Total P/L (Unrealized) */}
                <td className="px-6 py-4 text-right">
                  <div className={`font-bold ${isProfit ? 'text-green-400' : 'text-red-500'}`}>
                    {isProfit ? '+' : ''}${formatMoney(pos.unrealizedPl)}
                  </div>
                  <div className={`text-xs ${isProfit ? 'text-green-500/70' : 'text-red-500/70'}`}>
                    {isProfit ? '+' : ''}{formatPercent(pos.unrealizedPlpc)}
                  </div>
                </td>

                {/* 3. & 4. Qty & Market Value */}
                <td className="px-6 py-4 text-right">
                  <div className="text-white font-medium">${formatMoney(pos.marketValue)}</div>
                  <div className="text-xs text-gray-500">{parseFloat(pos.qty).toLocaleString()} Shares</div>
                </td>

                {/* 8. Weight (Port %) */}
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm text-gray-300">{weight.toFixed(1)}%</span>
                    <div className="h-1.5 w-16 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ width: `${weight}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}