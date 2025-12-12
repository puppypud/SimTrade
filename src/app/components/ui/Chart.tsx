'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, ColorType, IChartApi, Time, AreaSeries, TickMarkType, CrosshairMode } from 'lightweight-charts';

interface StockLWChartProps {
  chartData: [number, number][];
  symbol: string;
  timeframe: string;
}

const StockLWChart = ({ chartData, symbol, timeframe }: StockLWChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<IChartApi | null>(null);

  const { startPrice, endPrice, isProfit, baseColor } = useMemo(() => {
    if (!chartData || chartData.length === 0) {
        return { startPrice: 0, endPrice: 0, isProfit: true, baseColor: '#10b981' };
    }
    const start = chartData[0][1];
    const end = chartData[chartData.length - 1][1];
    const profit = end >= start;
    return {
        startPrice: start,
        endPrice: end,
        isProfit: profit,
        baseColor: profit ? '#10b981' : '#ef4444'
    };
  }, [chartData]);

  const [displayPrice, setDisplayPrice] = useState(endPrice);
  const [displayTime, setDisplayTime] = useState<string | null>(null);
  
  useEffect(() => {
    setDisplayPrice(endPrice);
    setDisplayTime(null);
  }, [endPrice, chartData]);

  useEffect(() => {
    if (!chartContainerRef.current || chartData.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      rightPriceScale: {
        visible: true,
        borderColor: '#e5e7eb',
      },
      timeScale: {
        visible: true,
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#e5e7eb',
        tickMarkFormatter: (time: number) => {
            const date = new Date(time * 1000);
            return date.toLocaleTimeString('th-TH', { 
              timeZone: 'Asia/Bangkok', 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false
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
            color: '#9ca3af',
            labelBackgroundColor: '#4b5563',
        },
        horzLine: {
            visible: true,
            labelVisible: true,
            style: 0,
            width: 1,
            color: '#9ca3af',
            labelBackgroundColor: '#4b5563',
        }
      },
      handleScale: false,
      handleScroll: false,
    });

    const newSeries = chart.addSeries(AreaSeries, {
      lineColor: baseColor,
      topColor: baseColor,
      bottomColor: 'rgba(255, 255, 255, 0)',
      lineWidth: 2,
    });

    const formattedData = chartData.map(d => ({
        time: (d[0] / 1000) as Time, 
        value: d[1]
    }));
    
    newSeries.setData(formattedData);

    if (timeframe === '1D' && formattedData.length > 0) {
        const firstDataTime = formattedData[0].time as number;
        const marketCloseTime = firstDataTime + 23400; 
        chart.timeScale().setVisibleRange({
            from: firstDataTime as Time,
            to: marketCloseTime as Time,
        });
    } else {
        chart.timeScale().fitContent();
    }

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
        } else {
            const dataPoint = param.seriesData.get(newSeries);
            if (dataPoint) {
                const value = (dataPoint as { value: number; time: Time }).value;
                const time = param.time as number;
                
                setDisplayPrice(value);
                
                const dateObj = new Date(time * 1000);
                const timeStr = dateObj.toLocaleString('th-TH', {
                    timeZone: 'Asia/Bangkok',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                });
                setDisplayTime(timeStr);
            }
        }
    });

    chartInstance.current = chart;

    const handleResize = () => {
        if (chartContainerRef.current) {
            chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
    };
    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
    };
  }, [chartData, baseColor, endPrice, timeframe]);

  const change = displayPrice - startPrice;
  const percent = startPrice !== 0 ? (change / startPrice) * 100 : 0;
  const sign = change >= 0 ? '+' : '';
  const textColor = change >= 0 ? 'text-emerald-500' : 'text-red-500';

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
      <div className="mb-4">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-gray-500 font-bold text-sm tracking-wider">{symbol}</h2>
                
                {/* 1. ราคาหุ้น (ตัวใหญ่) */}
                <h1 className={`text-4xl font-extrabold ${textColor}`}>
                    ${displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h1>

                {/* 2. ส่วนแสดงข้อมูลรอง: เรียง Change% ไว้ก่อน แล้วตามด้วย เวลา */}
                <div className="mt-1 flex items-center gap-3 text-sm">
                    
                    {/* ส่วนนี้จะแสดง % เสมอ (เปลี่ยนค่าไปตามจุดที่เมาส์ชี้) */}
                    <span className={`font-bold ${textColor}`}>
                        {sign}{change.toFixed(2)} ({sign}{percent.toFixed(2)}%)
                    </span>

                    {/* ส่วนนี้จะสลับระหว่าง "เวลาที่ชี้" กับ "Today" */}
                    {displayTime ? (
                        <span className="text-gray-500 font-medium border-l border-gray-300 pl-3">
                            ราคา ณ: {displayTime}
                        </span>
                    ) : (
                        <span className="text-gray-400 font-normal border-l border-gray-300 pl-3">
                            {timeframe === '1D' ? 'วันนี้' : `Past ${timeframe}`}
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

export default StockLWChart;