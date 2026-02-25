// src/app/components/ui/CryptoChart.tsx

"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  Time,
  AreaSeries,
  CrosshairMode,
} from "lightweight-charts";
// อย่าลืม Import brokerService
import { brokerService } from "@/src/app/services/brokerService";

const TIMEFRAMES = ["1D", "1W", "1M"]; // Crypto อาจจะมี Timeframe น้อยกว่าหรือต่างกัน ปรับได้ตามต้องการ

interface CryptoChartProps {
  symbol: string; // รับค่า เช่น "BTC", "ETH"
}

const CryptoChart = ({ symbol }: CryptoChartProps) => {

  const [viewType, setViewType] = useState("1D");
  const [chartData, setChartData] = useState<[number, number][]>([]);
  const [dayOpenPrice, setDayOpenPrice] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<IChartApi | null>(null);

  // --- ส่วนที่แก้ไข: fetchData สำหรับ Crypto โดยเฉพาะ ---
  const fetchData = useCallback(async (sym: string, vType: string) => {
    if (!sym) return;

    try {
      if (chartData.length === 0) setIsLoading(true);

      console.log(`Fetching Crypto data for ${sym} (${vType})...`);

      // *** เรียกใช้ getCryptoBars ตรงๆ ไม่ต้องเช็คเงื่อนไข ***
      const bars: any[] = await brokerService.getCryptoBars(sym, vType);

      // Sort ตามเวลา
      bars.sort(
        (a: any, b: any) => new Date(a.t).getTime() - new Date(b.t).getTime()
      );

      let formattedData: [number, number][] = [];
      let referencePrice: number | undefined = undefined;

      if (bars.length > 0) {
        referencePrice = Number(bars[0].o);
        formattedData = bars.map((b: any) => [
          new Date(b.t).getTime(),
          Number(b.c),
        ]);
      }

      setChartData(formattedData);
      setDayOpenPrice(referencePrice);
      setIsLoading(false);
    } catch (error) {
      console.error("Fetch Crypto error:", error);
      setIsLoading(false);
    }
  }, [chartData.length]);
  // -----------------------------------------------------

  // Effect: Fetch เมื่อ Symbol หรือ ViewType เปลี่ยน
  useEffect(() => {
    if (symbol) {
      fetchData(symbol, viewType);
    }
  }, [symbol, viewType, fetchData]);

  // Effect: Polling ข้อมูลทุก 5 วินาที (Crypto ตลาดเปิดตลอด Update ได้ตลอด)
  useEffect(() => {
    if (!symbol) return;
    const intervalId = setInterval(() => {
      fetchData(symbol, viewType);
    }, 5000);
    return () => clearInterval(intervalId);
  }, [symbol, viewType, fetchData]);

  // ... (ส่วนคำนวณสีและการแสดงผลด้านล่าง เหมือนกับ Chart.tsx เดิมทุกประการ Copy มาได้เลย) ...
  const { startPrice, endPrice, baseColor } = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { startPrice: 0, endPrice: 0, baseColor: "#10b981" };
    }
    const start = dayOpenPrice ?? chartData[0][1];
    const end = chartData[chartData.length - 1][1];
    const profit = end >= start;
    return {
      startPrice: start,
      endPrice: end,
      baseColor: profit ? "#10b981" : "#ef4444",
    };
  }, [chartData, dayOpenPrice]);

  const [displayPrice, setDisplayPrice] = useState(endPrice);
  const [displayTime, setDisplayTime] = useState<string | null>(null);
  const [displayChange, setDisplayChange] = useState(0);
  const [displayPercent, setDisplayPercent] = useState(0);

  useEffect(() => {
    setDisplayPrice(endPrice);
    setDisplayTime(null);
    const change = endPrice - startPrice;
    const percent = startPrice !== 0 ? (change / startPrice) * 100 : 0;
    setDisplayChange(change);
    setDisplayPercent(percent);
  }, [endPrice, startPrice, chartData]);

  // ... (ส่วน createChart และ return JSX เหมือนเดิมเป๊ะ) ...
  // แนะนำให้ Copy ส่วน useEffect ของ createChart และ return (...) จาก Chart.tsx มาวางทับด้านล่างนี้ได้เลย

  // (โค้ดส่วนแสดงผลกราฟด้านล่างนี้ ละไว้ในฐานที่เข้าใจว่าเหมือนเดิมครับ)
  useEffect(() => {
    if (!chartContainerRef.current || chartData.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { visible: true, borderColor: "#e5e7eb" },
      timeScale: {
        visible: true,
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#e5e7eb",
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          return date.toLocaleTimeString("th-TH", {
            timeZone: "Asia/Bangkok",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          visible: true,
          labelVisible: true,
          style: 0,
          width: 1,
          color: "#9ca3af",
          labelBackgroundColor: "#4b5563",
        },
        horzLine: {
          visible: true,
          labelVisible: true,
          style: 0,
          width: 1,
          color: "#9ca3af",
          labelBackgroundColor: "#4b5563",
        },
      },
      handleScale: false,
      handleScroll: false,
    });

    const newSeries = chart.addSeries(AreaSeries, {
      lineColor: baseColor,
      topColor: baseColor,
      bottomColor: "rgba(255, 255, 255, 0)",
      lineWidth: 2,
    });

    // Data Processing (เหมือนเดิม)
    let processedData = chartData;
    if (viewType === "1D") {
      const TWO_MIN_MS = 2 * 60 * 1000;
      const groupedMap = new Map<number, number>();
      chartData.forEach(([time, price]) => {
        const roundedTime = Math.floor(time / TWO_MIN_MS) * TWO_MIN_MS;
        groupedMap.set(roundedTime, price);
      });
      processedData = Array.from(groupedMap.entries()).sort(
        (a, b) => a[0] - b[0]
      );
    }

    const formattedSeriesData = processedData.map((d) => ({
      time: (d[0] / 1000) as Time,
      value: d[1],
    }));
    newSeries.setData(formattedSeriesData);

    if (viewType === "1D" && formattedSeriesData.length > 0) {
      // ... Logic Zoom ...
      chart.timeScale().fitContent(); // Crypto อาจจะไม่ต้อง fix ช่วงเวลาปิดตลาดเหมือนหุ้น ใช้ fitContent ง่ายกว่า
    } else {
      chart.timeScale().fitContent();
    }

    // Crosshair logic
    chart.subscribeCrosshairMove((param) => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current!.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current!.clientHeight
      ) {
        setDisplayPrice(endPrice);
        setDisplayTime(null);
        const change = endPrice - startPrice;
        const percent = startPrice !== 0 ? (change / startPrice) * 100 : 0;
        setDisplayChange(change);
        setDisplayPercent(percent);
      } else {
        const dataPoint = param.seriesData.get(newSeries);
        if (dataPoint) {
          const value = (dataPoint as { value: number; time: Time }).value;
          const time = param.time as number;
          setDisplayPrice(value);
          const change = value - startPrice;
          const percent = startPrice !== 0 ? (change / startPrice) * 100 : 0;
          setDisplayChange(change);
          setDisplayPercent(percent);
          const dateObj = new Date(time * 1000);
          setDisplayTime(
            dateObj.toLocaleString("th-TH", {
              timeZone: "Asia/Bangkok",
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          );
        }
      }
    });

    chartInstance.current = chart;
    const handleResize = () => {
      if (chartContainerRef.current)
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [chartData, baseColor, endPrice, viewType, startPrice]);

  // JSX RENDER
  const sign = displayChange >= 0 ? "+" : "";
  const dynamicTextColor =
    displayChange >= 0 ? "text-emerald-500" : "text-red-500";

  if (isLoading && chartData.length === 0) {
    return (
      <div className="bg-white h-[400px] p-6 rounded-xl shadow-lg border border-gray-100 flex flex-col items-center justify-center text-gray-400">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-4 w-4 bg-blue-500 rounded-full mb-2 animate-bounce"></div>
          Loading Crypto {symbol}...
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white h-[400px] p-6 rounded-xl shadow-lg border border-gray-100 flex flex-col items-center justify-center text-gray-400">
        <p>No data available for {symbol}</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 relative">
      <div className="absolute top-6 right-6 z-10 flex bg-gray-100 p-1 rounded-lg">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            onClick={() => setViewType(tf)}
            className={`
                      px-3 py-1 text-xs font-bold rounded-md transition-all duration-200
                      ${viewType === tf
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-200"
              }
                  `}
          >
            {tf}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-gray-500 font-bold text-sm tracking-wider">
              {symbol} (Crypto)
            </h2>
            <h1 className={`text-4xl font-extrabold ${dynamicTextColor}`}>
              $
              {displayPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h1>
            <div className="mt-1 flex items-center gap-3 text-sm">
              <span className={`font-bold ${dynamicTextColor}`}>
                {sign}
                {displayChange.toFixed(2)} ({sign}
                {displayPercent.toFixed(2)}%)
              </span>
              {displayTime ? (
                <span className="text-gray-500 font-medium border-l border-gray-300 pl-3">
                  ราคา ณ: {displayTime}
                </span>
              ) : (
                <span className="text-gray-400 font-normal border-l border-gray-300 pl-3">
                  {viewType === "1D" ? "Live" : `Past ${viewType}`}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div ref={chartContainerRef} className="w-full h-[300px]" />
    </div>
  );
};

export default CryptoChart;