"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // Import router
import { brokerService } from "@/src/app/services/brokerService";
import { formatSymbolDisplay } from "@/src/app/utils/formatters";
import { Position } from "@/src/app/types/broker";
import Image from "next/image";

interface PortfolioTableProps {
  accountId: string;
}

export default function PortfolioTable({ accountId }: PortfolioTableProps) {
  const router = useRouter(); // Initialize router
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  // State สำหรับจัดการการเปิด/ปิด
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedAssetId(expandedAssetId === id ? null : id);
  };

  // Helper Formats
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(val);

  const formatNumber = (val: number, digits = 2) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(val);

  const formatPercent = (val: number) => val.toFixed(2) + "%";

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const data = await brokerService.getOpenPositions(accountId);
        setPositions(data);
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

  // คำนวณมูลค่ารวมของพอร์ตเพื่อใช้หา % Weight
  const totalPortfolioValue = positions.reduce(
    (sum, pos) => sum + pos.marketValue,
    0
  );

  if (loading)
    return (
      <div className="p-10 text-center text-gray-500 animate-pulse">
        Loading Assets...
      </div>
    );
  if (positions.length === 0)
    return (
      <div className="p-10 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
        No assets in portfolio.
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Header Control */}
      <div className="flex justify-between items-center px-2 mb-2">
        <h2 className="text-lg font-bold text-gray-800">
          My Assets ({positions.length})
        </h2>
        <button className="text-xs text-blue-600 font-medium bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
          เรียงตาม: มูลค่าสินทรัพย์ ▼
        </button>
      </div>

      {positions.map((pos) => {
        // Logic การแสดงผลสี
        const isProfit = pos.unrealizedPl >= 0;
        const plColor = isProfit ? "text-green-600" : "text-red-500";
        const isDayProfit = pos.changeToday >= 0;
        const dayColor = isDayProfit ? "text-green-600" : "text-red-500";

        const isExpanded = expandedAssetId === pos.assetId;

        // คำนวณค่าเพิ่มเติม
        const approxThb = pos.marketValue * 34.5;
        const totalCost = pos.avgEntryPrice * pos.qty;

        // คำนวณ % Weight
        const portfolioWeight =
          totalPortfolioValue > 0
            ? (pos.marketValue / totalPortfolioValue) * 100
            : 0;

        return (
          <div
            key={pos.assetId}
            className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md 
              ${isExpanded
                ? "border-blue-400 ring-1 ring-blue-100 shadow-blue-100"
                : "border-gray-200"
              }`}
          >
            {/* 1. Header Row */}
            <div
              onClick={() => toggleExpand(pos.assetId)}
              className="p-5 flex justify-between items-center cursor-pointer select-none"
            >
              {/* Left: Symbol Info & Logo */}
              <div className="flex items-center space-x-4">
                <div
                  className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm hover:border-blue-300 transition-all active:scale-90"
                  title="คลิกไปหน้าเทรด"
                  onClick={(e) => {
                    e.stopPropagation();
                    const isCrypto = pos.symbol.includes("/") || pos.assetClass === 'crypto';
                    const targetPath = isCrypto ? '/tradecrypto' : '/trade';
                    router.push(`${targetPath}?symbol=${pos.symbol}`);
                  }}
                >
                  <img
                    src={`https://logo.clearbit.com/${pos.symbol}.com`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (
                        e.target as HTMLImageElement
                      ).nextElementSibling?.classList.remove("hidden");
                    }}
                    alt={pos.symbol}
                    className="w-full h-full object-cover"
                  />
                  <span className="hidden text-xs font-bold text-gray-400">
                    {pos.symbol.substring(0, 2)}
                  </span>
                </div>
                <div
                  className="hover:opacity-70 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    const isCrypto = pos.symbol.includes("/") || pos.assetClass === 'crypto';
                    const targetPath = isCrypto ? '/tradecrypto' : '/trade';
                    router.push(`${targetPath}?symbol=${pos.symbol}`);
                  }}
                >
                  <div className="font-bold text-gray-900 text-lg">
                    {formatSymbolDisplay(pos.symbol)}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                    {/* แก้ไขตรงนี้: เปลี่ยน exchange เป็น % Weight + Icon */}
                    <div className="flex items-center gap-1.5 mr-2">
                      {/* Pie Chart Icon */}
                      <Image
                        src="/pie-chart.png"
                        alt="Portfolio Weight"
                        width={16}
                        height={16}
                        className="w-2.5 h-2.5" // ใส่ opacity-60 ถ้าอยากให้สีดูจางลงเหมือน text-gray-400
                      />
                      {/* Weight Percent (Bold & Larger) */}
                      <span className="text-black font-medium text-xs">
                        {portfolioWeight.toFixed(2)}%
                      </span>
                    </div>

                    <span className="flex items-center gap-1">
                      <span className="text-gray-400">Day:</span>
                      <span className={dayColor}>
                        {isDayProfit ? "+" : ""}
                        {formatPercent(pos.changeToday)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Center: Market Value */}
              <div className="text-right hidden sm:block">
                <div className="font-bold text-gray-900">
                  {formatCurrency(pos.marketValue)}
                </div>
                <div className="text-xs text-gray-400">
                  ≈ {formatNumber(approxThb)} THB
                </div>
              </div>

              {/* Right: Unrealized P/L */}
              <div className="text-right">
                <div className={`font-bold ${plColor} text-lg`}>
                  {isProfit ? "+" : ""}
                  {formatPercent(pos.unrealizedPlpc)}
                </div>
                <div className={`text-xs ${plColor} font-medium`}>
                  ({isProfit ? "+" : ""}
                  {formatCurrency(pos.unrealizedPl)})
                </div>
              </div>
            </div>

            {/* 2. Expanded Details */}
            <div
              className={`bg-gray-50/50 border-t border-gray-100 transition-all duration-300 ease-in-out ${isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
            >
              <div className="p-6">
                <div className="grid grid-cols-2 gap-y-6 gap-x-8 text-sm">
                  {/* Row 1 */}
                  <div>
                    <p className="text-gray-400 text-xs mb-1 uppercase tracking-wide">
                      Holdings (Shares)
                    </p>
                    <p className="font-bold text-gray-800 font-mono text-base">
                      {formatNumber(pos.qty, 4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1 uppercase tracking-wide">
                      Current Price
                    </p>
                    <div className="flex items-baseline gap-2">
                      <p className="font-bold text-gray-800 font-mono text-base">
                        {formatCurrency(pos.currentPrice)}
                      </p>
                      <p className={`text-xs ${dayColor}`}>
                        ({isDayProfit ? "▲" : "▼"}{" "}
                        {Math.abs(pos.changeToday).toFixed(2)}%)
                      </p>
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div>
                    <p className="text-gray-400 text-xs mb-1 uppercase tracking-wide">
                      Avg Cost / Share
                    </p>
                    <p className="font-medium text-gray-700 font-mono">
                      {formatCurrency(pos.avgEntryPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1 uppercase tracking-wide">
                      Total Cost Basis
                    </p>
                    <p className="font-medium text-gray-700 font-mono">
                      {formatCurrency(totalCost)}
                    </p>
                  </div>
                </div>

                {/* Action Button Section */}
                <div className="mt-8 pt-4 border-t border-gray-200 flex justify-end gap-3">
                  <button
                    className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-gray-200 hover:bg-black transition-all active:scale-95 flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      // เช็คว่าเป็น Crypto หรือไม่ (จาก symbol หรือ assetClass)
                      const isCrypto = pos.symbol.includes("/") || pos.assetClass === 'crypto';
                      const targetPath = isCrypto ? '/tradecrypto' : '/trade';
                      router.push(`${targetPath}?symbol=${pos.symbol}`);
                    }}
                  >
                    <span>ซื้อ / ขาย</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
