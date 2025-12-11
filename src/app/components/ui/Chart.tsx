'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
// 1. Import AreaSeries เข้ามาเพิ่ม (สำหรับ v5)
import { createChart, ColorType, IChartApi, Time, AreaSeries } from 'lightweight-charts';

interface StockLWChartProps {
  chartData: [number, number][]; // [Time (ms), Price]
  symbol: string;
  timeframe: string;
}

const StockLWChart = ({ chartData, symbol, timeframe }: StockLWChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<IChartApi | null>(null);

  // คำนวณค่าเริ่มต้นและสีของกราฟ
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
        baseColor: profit ? '#10b981' : '#ef4444' // Emerald vs Red
    };
  }, [chartData]);

  const [displayPrice, setDisplayPrice] = useState(endPrice);
  
  useEffect(() => {
    setDisplayPrice(endPrice);
  }, [endPrice]);

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
      rightPriceScale: { visible: false },
      timeScale: { visible: false },
      crosshair: {
        vertLine: {
            visible: true,
            labelVisible: false,
            style: 0,
            width: 1,
            color: '#9ca3af',
        },
        horzLine: {
            visible: false,
            labelVisible: false 
        }
      },
      handleScale: false,
      handleScroll: false,
    });

    // 2. แก้ไขตรงนี้: ใช้ addSeries(AreaSeries, options) แทน addAreaSeries(options)
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
    chart.timeScale().fitContent();

    // Event เลื่อนเมาส์
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
        } else {
            const dataPoint = param.seriesData.get(newSeries);
            if (dataPoint) {
                // ต้อง Cast Type ให้ตรงกับชนิดของข้อมูลที่เราใช้
                const value = (dataPoint as { value: number; time: Time }).value;
                setDisplayPrice(value);
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
  }, [chartData, baseColor, endPrice]);

  const change = displayPrice - startPrice;
  const percent = startPrice !== 0 ? (change / startPrice) * 100 : 0;
  const sign = change >= 0 ? '+' : '';
  const textColor = change >= 0 ? 'text-emerald-500' : 'text-red-500';

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
      <div className="mb-4">
        <h2 className="text-gray-500 font-bold text-sm tracking-wider">{symbol}</h2>
        <div className="flex items-baseline gap-3">
            <h1 className={`text-4xl font-extrabold ${textColor}`}>
                ${displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h1>
        </div>
        <div className={`text-sm font-semibold mt-1 ${textColor} flex items-center gap-1`}>
            <span>
                {sign}{change.toFixed(2)} ({sign}{percent.toFixed(2)}%)
            </span>
            <span className="text-gray-400 font-normal ml-1">
                {timeframe === '1D' ? 'Today' : `Past ${timeframe}`}
            </span>
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full h-[300px]" />
    </div>
  );
};

export default StockLWChart;