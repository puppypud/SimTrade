'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import { brokerService } from '@/src/app/services/brokerService'; // path ตามโครงสร้างโปรเจกต์ของคุณ
import { StockBar } from '@/src/app/types/broker';

// Import ApexCharts แบบ Dynamic
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface StockAreaChartProps {
  chartData: [number, number][];
  symbol: string;
}

const StockAreaChart = ({ symbol }: StockAreaChartProps) => {
  const [selection, setSelection] = useState('all');
  // state สำหรับเก็บข้อมูลกราฟที่แปลงแล้ว [timestamp, price]
  const [chartData, setChartData] = useState<[number, number][]>([]);
  const [series, setSeries] = useState([{ name: symbol, data: [] as [number, number][] }]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. ดึงข้อมูลจาก Backend เมื่อ Component โหลด หรือ Symbol เปลี่ยน
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // เรียก Service: viewType อาจจะส่งเป็น '1Y' หรือ '5Y' เพื่อดึงข้อมูลมาให้พอกับการ Zoom
        // ในที่นี้สมมติว่าขอ '1Y' (1 ปี) เป็น Default
        const bars: StockBar[] = await brokerService.getStockBars(symbol, '1Y');

        // แปลงข้อมูลจาก StockBar (Object) เป็น Format ที่ ApexCharts ต้องการ ([timestamp, closePrice])
        const formattedData: [number, number][] = bars.map((bar) => [
          new Date(bar.t).getTime(), // แปลง ISO String เป็น Timestamp (number)
          bar.c                      // ใช้ราคา Close (c) มา plot กราฟ
        ]);

        setChartData(formattedData);
        setSeries([{ name: symbol, data: formattedData }]);
        
      } catch (error) {
        console.error("Failed to fetch stock data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (symbol) {
      fetchData();
    }
  }, [symbol]);

  const options: ApexOptions = {
    chart: {
      id: 'area-datetime',
      type: 'area',
      height: 350,
      zoom: { autoScaleYaxis: true },
      toolbar: { show: false }
    },
    dataLabels: { enabled: false },
    markers: { size: 0 },
    xaxis: {
      type: 'datetime',
      tickAmount: 6,
    },
    tooltip: {
      x: { format: 'dd MMM yyyy HH:mm' } // ปรับ format ให้ละเอียดขึ้นถ้าดูรายนาที
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.9,
        stops: [0, 100]
      }
    },
    stroke: { curve: 'smooth', width: 2 },
    colors: ['#008FFB'],
    noData: {
        text: 'Loading...' // แสดงข้อความเมื่อยังไม่มีข้อมูล
    }
  };

  // ฟังก์ชัน Zoom กราฟ (Client-side Zooming)
  const updateData = (timeline: string) => {
    setSelection(timeline);
    
    if (chartData.length === 0) return;

    const lastDate = chartData[chartData.length - 1][0];
    let minDate = chartData[0][0];

    // คำนวณช่วงเวลา Zoom จากข้อมูลที่มีอยู่แล้วใน chartData
    switch (timeline) {
      case 'one_month':
        minDate = lastDate - (30 * 24 * 60 * 60 * 1000);
        break;
      case 'six_months':
        minDate = lastDate - (180 * 24 * 60 * 60 * 1000);
        break;
      case 'one_year':
        minDate = lastDate - (365 * 24 * 60 * 60 * 1000);
        break;
      case 'ytd':
        minDate = new Date(new Date(lastDate).getFullYear(), 0, 1).getTime();
        break;
      case 'all':
        minDate = chartData[0][0];
        break;
      default:
    }

    // สั่ง update view ของกราฟ
    (window as any).ApexCharts && (window as any).ApexCharts.exec(
      'area-datetime',
      'zoomX',
      minDate,
      lastDate
    );
  };

  const btnClass = (active: boolean) => 
    `px-4 py-1 text-sm font-medium rounded transition-colors ${
      active 
        ? 'bg-blue-600 text-white' 
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }`;

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
      
      <div className="flex flex-wrap items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-700">{symbol} Timeline</h3>
        <div className="flex gap-2">
          <button onClick={() => updateData('one_month')} className={btnClass(selection === 'one_month')}>1M</button>
          <button onClick={() => updateData('six_months')} className={btnClass(selection === 'six_months')}>6M</button>
          <button onClick={() => updateData('one_year')} className={btnClass(selection === 'one_year')}>1Y</button>
          <button onClick={() => updateData('ytd')} className={btnClass(selection === 'ytd')}>YTD</button>
          <button onClick={() => updateData('all')} className={btnClass(selection === 'all')}>ALL</button>
        </div>
      </div>

      <div id="chart-timeline" className="min-h-[350px]">
        {isLoading ? (
            // แสดง Loading แบบง่ายๆ
            <div className="flex items-center justify-center h-[350px] text-gray-500">
                Loading Data...
            </div>
        ) : (
            <ReactApexChart 
                options={options} 
                series={series} 
                type="area" 
                height={350} 
            />
        )}
      </div>
    </div>
  );
};

export default StockAreaChart;