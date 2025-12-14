'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createChart, ColorType, IChartApi, Time, AreaSeries, CrosshairMode } from 'lightweight-charts';
import { brokerService } from '@/src/app/services/brokerService'; // ตรวจสอบ Path import ให้ถูกต้องตามโปรเจคจริง

const TIMEFRAMES = ['1D', '5D', '1M', '6M', '1Y', '5Y'];

interface StockLWChartProps {
  symbol: string;
}

const StockLWChart = ({ symbol }: StockLWChartProps) => {
  // ---------------------------------------------------------------------------
  // 1. STATE MANAGEMENT (ย้ายมาจาก Page)
  // ---------------------------------------------------------------------------
  const [viewType, setViewType] = useState('1D');
  const [chartData, setChartData] = useState<[number, number][]>([]);
  const [dayOpenPrice, setDayOpenPrice] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  // Refs สำหรับ Chart
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<IChartApi | null>(null);

  // ---------------------------------------------------------------------------
  // 2. FETCH DATA LOGIC (ย้ายมาจาก Page)
  // ---------------------------------------------------------------------------
  const fetchData = useCallback(async (sym: string, vType: string) => {
    if (!sym) return;

    try {
      if (chartData.length === 0) setIsLoading(true);

      console.log(`Fetching data for ${sym} (${vType})...`);
      const bars: any[] = await brokerService.getStockBars(sym, vType);
      
      // เรียงลำดับเวลา
      bars.sort((a: any, b: any) => new Date(a.t).getTime() - new Date(b.t).getTime());

      let formattedData: [number, number][] = [];
      let referencePrice: number | undefined = undefined;

      if (vType === '1D' && bars.length > 0) {
        const lastBar = bars[bars.length - 1];
        const lastBarDate = new Date(lastBar.t).toDateString();
        
        const todayBars = bars.filter((b: any) => new Date(b.t).toDateString() === lastBarDate);
        const prevBars = bars.filter((b: any) => new Date(b.t).toDateString() !== lastBarDate);

        // หา Reference Price
        if (prevBars.length > 0) {
            referencePrice = Number(prevBars[prevBars.length - 1].c);
        } else if (todayBars.length > 0) {
            referencePrice = Number(todayBars[0].o);
        }

        // ตัด Pre-market (เริ่ม 21:30)
        const marketOpenTime = new Date(lastBar.t);
        marketOpenTime.setHours(21, 30, 0, 0); 
        
        const marketHoursBars = todayBars.filter((b: any) => new Date(b.t).getTime() >= marketOpenTime.getTime());

        if (marketHoursBars.length > 0) {
             formattedData = marketHoursBars.map((b: any) => [new Date(b.t).getTime(), Number(b.c)]);
             if (referencePrice === undefined) referencePrice = Number(marketHoursBars[0].o);
        } else {
             formattedData = todayBars.map((b: any) => [new Date(b.t).getTime(), Number(b.c)]);
        }

      } else if (bars.length > 0) {
        // Timeframe อื่นใช้ราคาเปิดแท่งแรก
        referencePrice = Number(bars[0].o);
        formattedData = bars.map((b: any) => [new Date(b.t).getTime(), Number(b.c)]);
      }

      setChartData(formattedData);
      setDayOpenPrice(referencePrice);
      setIsLoading(false);

    } catch (error) {
      console.error("Fetch error:", error);
      setIsLoading(false);
    }
  }, []); // dependency array ว่าง เพราะใช้ภายใน component

  // Effect: Fetch เมื่อ Symbol หรือ ViewType เปลี่ยน
  useEffect(() => {
    if (symbol) {
      fetchData(symbol, viewType);
    }
  }, [symbol, viewType, fetchData]);

  // Effect: Polling ข้อมูลทุก 2 นาที (เฉพาะ 1D)
  useEffect(() => {
    if (!symbol || viewType !== '1D') return;
    const intervalId = setInterval(() => {
        fetchData(symbol, viewType);
    }, 120000); 
    return () => clearInterval(intervalId);
  }, [symbol, viewType, fetchData]);


  // ---------------------------------------------------------------------------
  // 3. CHART RENDERING & DISPLAY LOGIC (Logic เดิมของ Chart)
  // ---------------------------------------------------------------------------
  const { startPrice, endPrice, baseColor } = useMemo(() => {
    if (!chartData || chartData.length === 0) {
        return { startPrice: 0, endPrice: 0, baseColor: '#10b981' };
    }
    const start = dayOpenPrice ?? chartData[0][1];
    const end = chartData[chartData.length - 1][1];
    const profit = end >= start;
    return {
        startPrice: start,
        endPrice: end,
        baseColor: profit ? '#10b981' : '#ef4444'
    };
  }, [chartData, dayOpenPrice]);

  const [displayPrice, setDisplayPrice] = useState(endPrice);
  const [displayTime, setDisplayTime] = useState<string | null>(null);
  const [displayChange, setDisplayChange] = useState(0);
  const [displayPercent, setDisplayPercent] = useState(0);

  // Sync display state with data
  useEffect(() => {
    setDisplayPrice(endPrice);
    setDisplayTime(null);
    const change = endPrice - startPrice;
    const percent = startPrice !== 0 ? (change / startPrice) * 100 : 0;
    setDisplayChange(change);
    setDisplayPercent(percent);
  }, [endPrice, startPrice, chartData]);

  // Create Chart Instance
  useEffect(() => {
    if (!chartContainerRef.current || chartData.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#9ca3af' },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { visible: true, borderColor: '#e5e7eb' },
      timeScale: {
        visible: true, timeVisible: true, secondsVisible: false, borderColor: '#e5e7eb',
        tickMarkFormatter: (time: number) => {
            const date = new Date(time * 1000);
            return date.toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false });
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { visible: true, labelVisible: true, style: 0, width: 1, color: '#9ca3af', labelBackgroundColor: '#4b5563' },
        horzLine: { visible: true, labelVisible: true, style: 0, width: 1, color: '#9ca3af', labelBackgroundColor: '#4b5563' }
      },
      handleScale: false, handleScroll: false,
    });

    const newSeries = chart.addSeries(AreaSeries, {
      lineColor: baseColor, topColor: baseColor, bottomColor: 'rgba(255, 255, 255, 0)', lineWidth: 2,
    });

    // Data Processing (เหมือนเดิม)
    let processedData = chartData;
    if (viewType === '1D') {
        const TWO_MIN_MS = 2 * 60 * 1000;
        const groupedMap = new Map<number, number>();
        chartData.forEach(([time, price]) => {
            const roundedTime = Math.floor(time / TWO_MIN_MS) * TWO_MIN_MS;
            groupedMap.set(roundedTime, price);
        });
        processedData = Array.from(groupedMap.entries()).sort((a, b) => a[0] - b[0]);
    }

    const formattedSeriesData = processedData.map(d => ({ time: (d[0] / 1000) as Time, value: d[1] }));
    newSeries.setData(formattedSeriesData);

    if (viewType === '1D' && formattedSeriesData.length > 0) {
        const firstDataTime = formattedSeriesData[0].time as number;
        const marketCloseTime = firstDataTime + 23400; 
        chart.timeScale().setVisibleRange({ from: firstDataTime as Time, to: marketCloseTime as Time });
    } else {
        chart.timeScale().fitContent();
    }

    // Crosshair logic
    chart.subscribeCrosshairMove((param) => {
        if (param.point === undefined || !param.time || param.point.x < 0 || param.point.x > chartContainerRef.current!.clientWidth || param.point.y < 0 || param.point.y > chartContainerRef.current!.clientHeight) {
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
                setDisplayTime(dateObj.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
            }
        }
    });

    chartInstance.current = chart;
    const handleResize = () => { if (chartContainerRef.current) chart.applyOptions({ width: chartContainerRef.current.clientWidth }); };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.remove(); };
  }, [chartData, baseColor, endPrice, viewType, startPrice]); 

  // ---------------------------------------------------------------------------
  // 4. JSX RENDER
  // ---------------------------------------------------------------------------
  const sign = displayChange >= 0 ? '+' : '';
  const dynamicTextColor = displayChange >= 0 ? 'text-emerald-500' : 'text-red-500';

  if (isLoading && chartData.length === 0) {
    return (
        <div className="bg-white h-[400px] p-6 rounded-xl shadow-lg border border-gray-100 flex flex-col items-center justify-center text-gray-400">
             <div className="animate-pulse flex flex-col items-center">
                <div className="h-4 w-4 bg-blue-500 rounded-full mb-2 animate-bounce"></div>
                Loading {symbol}...
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
      
      {/* Timeframe Selector (ย้ายมาจาก Page) */}
      <div className="absolute top-6 right-6 z-10 flex bg-gray-100 p-1 rounded-lg">
        {TIMEFRAMES.map((tf) => (
            <button
                key={tf}
                onClick={() => setViewType(tf)}
                className={`
                    px-3 py-1 text-xs font-bold rounded-md transition-all duration-200
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

      <div className="mb-4">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-gray-500 font-bold text-sm tracking-wider">{symbol}</h2>
                <h1 className={`text-4xl font-extrabold ${dynamicTextColor}`}>
                    ${displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h1>
                <div className="mt-1 flex items-center gap-3 text-sm">
                    <span className={`font-bold ${dynamicTextColor}`}>
                        {sign}{displayChange.toFixed(2)} ({sign}{displayPercent.toFixed(2)}%)
                    </span>
                    {displayTime ? (
                        <span className="text-gray-500 font-medium border-l border-gray-300 pl-3">ราคา ณ: {displayTime}</span>
                    ) : (
                        <span className="text-gray-400 font-normal border-l border-gray-300 pl-3">{viewType === '1D' ? 'วันนี้' : `Past ${viewType}`}</span>
                    )}
                </div>
            </div>
        </div>
      </div>
      
      <div ref={chartContainerRef} className="w-full h-[300px]" />
    </div>
  );
};

export default StockLWChart;