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
import { useTheme } from "next-themes";
import { brokerService } from "@/src/app/services/brokerService";

const TIMEFRAMES = ["1D", "5D", "1M", "6M", "1Y", "5Y"];

interface StockLWChartProps {
  symbol: string;
}

const StockLWChart = ({ symbol }: StockLWChartProps) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [viewType, setViewType] = useState("1D");
  const [chartData, setChartData] = useState<[number, number][]>([]);
  const [dayOpenPrice, setDayOpenPrice] = useState<number | undefined>(
    undefined
  );
  const [isLoading, setIsLoading] = useState(false);

  // Refs สำหรับ Chart
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<IChartApi | null>(null);
  // Fetch Data Function
  const fetchData = useCallback(async (sym: string, vType: string) => {
    if (!sym) return;

    try {
      if (chartData.length === 0) setIsLoading(true);

      // Detect if symbol is crypto (contains "/") and use appropriate endpoints
      const isCrypto = sym.includes('/');

      // Use Promise.allSettled so a failed quote doesn't prevent chart from rendering
      const results = await Promise.allSettled([
        isCrypto ? brokerService.getCryptoBars(sym, vType) : brokerService.getStockBars(sym, vType),
        isCrypto ? brokerService.getLatestCryptoQuote(sym) : brokerService.getLatestQuote(sym)
      ]);

      let bars: any[] = results[0].status === 'fulfilled' ? results[0].value : [];
      const quote: any = results[1].status === 'fulfilled' ? results[1].value : null;

      // Fallback: ถ้า 1D ไม่มีข้อมูล (เช่น ตลาดปิด/วันหยุด) ลอง 5D แล้ว 1M
      if (bars.length === 0 && vType === "1D") {
        const fallbackViews = ["5D", "1M"];
        for (const fb of fallbackViews) {
          try {
            bars = isCrypto
              ? await brokerService.getCryptoBars(sym, fb)
              : await brokerService.getStockBars(sym, fb);
            if (bars.length > 0) break;
          } catch { /* continue to next fallback */ }
        }
      }

      bars.sort(
        (a: any, b: any) => new Date(a.t).getTime() - new Date(b.t).getTime()
      );

      let formattedData: [number, number][] = [];
      // สำหรับ 1D ให้ใช้ราคาปิดเมื่อวานเป็นหลัก
      // สำหรับช่วงเวลาอื่น (5D, 1M, ...) ให้ใช้ราคาปิด (Close) ของแท่งแรกในอดีตสุดเป็นเกณฑ์อ้างอิง
      let referencePrice: number | undefined = vType === "1D" ? (quote?.prevClose || quote?.openPrice) : undefined;

      if (bars.length > 0) {
        if (!referencePrice) {
          // ใช้ราคาปิดของแท่งแรกสุดที่มีให้ เพราะเป็นจุดเริ่มต้นของช่วงเวลาที่ดึงมา
          referencePrice = Number(bars[0].c);
        }

        formattedData = bars.map((b: any) => [
          new Date(b.t).getTime(),
          Number(b.c),
        ]);
      }

      setChartData(formattedData);
      setDayOpenPrice(referencePrice);
      setIsLoading(false);
    } catch (error) {
      console.error("Fetch error:", error);
      setIsLoading(false);
    }
  }, []);

  // Effect: Fetch เมื่อ Symbol หรือ ViewType เปลี่ยน
  useEffect(() => {
    if (symbol) {
      fetchData(symbol, viewType);
    }
  }, [symbol, viewType, fetchData]);

  // Effect: Polling ข้อมูลทุก 2 นาที (เฉพาะ 1D)
  useEffect(() => {
    if (!symbol || viewType !== "1D") return;
    const intervalId = setInterval(() => {
      fetchData(symbol, viewType);
    }, 5000); //5วิ
    return () => clearInterval(intervalId);
  }, [symbol, viewType, fetchData]);


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

    // อ่านสีจาก CSS variables ตาม theme ปัจจุบัน
    const styles = getComputedStyle(document.documentElement);
    const borderColor = styles.getPropertyValue('--border').trim() || (isDark ? '#252D38' : '#E5E7EB');
    const textColor = styles.getPropertyValue('--text-muted').trim() || (isDark ? '#8B949E' : '#6B7280');
    const crosshairColor = isDark ? '#8B949E' : '#9ca3af';
    const crosshairLabelBg = isDark ? '#B8860B' : '#4b5563';
    const goldAccent = isDark ? 'rgba(255, 215, 0, 0.15)' : 'rgba(184, 134, 11, 0.06)';

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: textColor,
      },
      localization: {
        timeFormatter: (time: number | string) => {
          // YYYY-MM-DD string (6M, 1Y, 5Y)
          if (typeof time === "string") {
            const date = new Date(time + "T00:00:00");
            return date.toLocaleDateString("th-TH", {
              timeZone: "Asia/Bangkok",
              day: "numeric",
              month: "short",
              year: "numeric",
            });
          }
          // UNIX timestamp (1D, 5D, 1M)
          const date = new Date(time * 1000);
          return date.toLocaleString("th-TH", {
            timeZone: "Asia/Bangkok",
            day: "2-digit",
            month: "short",
            year: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: {
        visible: true,
        borderVisible: false,
      },
      timeScale: {
        visible: true,
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        rightOffset: 0,
        // intraday (1D, 5D) → uniform spacing เพื่อกำจัดช่องว่าง after-hours
        ...(["1M", "6M", "1Y", "5Y"].includes(viewType)
          ? {}
          : { uniformDistribution: true, barSpacing: 6, minBarSpacing: 2 }),
        // tickMarkType: 0=Year, 1=Month, 2=DayOfMonth, 3=Time, 4=TimeWithSeconds
        tickMarkFormatter: (time: number | string, tickMarkType: number) => {
          // YYYY-MM-DD string (6M, 1Y, 5Y)
          if (typeof time === "string") {
            const date = new Date(time + "T00:00:00");
            if (tickMarkType === 0) return date.toLocaleDateString("en-US", { year: "numeric" });
            if (tickMarkType === 1) return date.toLocaleDateString("en-US", { month: "short" });
            // 1Y, 5Y → แสดงชื่อเดือน (ไม่แสดงเลขวัน)
            if (viewType === "1Y" || viewType === "5Y") {
              return date.toLocaleDateString("en-US", { month: "short" });
            }
            return date.toLocaleDateString("en-US", { day: "numeric" });
          }
          // Business day object
          if (typeof time === "object" && time !== null) {
            const bd = time as unknown as { year: number; month: number; day: number };
            const date = new Date(bd.year, bd.month - 1, bd.day);
            if (tickMarkType === 0) return date.toLocaleDateString("en-US", { year: "numeric" });
            if (tickMarkType === 1) return date.toLocaleDateString("en-US", { month: "short" });
            if (viewType === "1Y" || viewType === "5Y") {
              return date.toLocaleDateString("en-US", { month: "short" });
            }
            return date.toLocaleDateString("en-US", { day: "numeric" });
          }
          // UNIX timestamp (1D, 5D)
          const date = new Date(time * 1000);
          // tickMarkType: 0=Year, 1=Month, 2=DayOfMonth, 3=Time
          if (tickMarkType === 0) {
            return date.toLocaleDateString("en-US", { timeZone: "Asia/Bangkok", year: "numeric" });
          }
          if (tickMarkType === 1) {
            return date.toLocaleDateString("en-US", { timeZone: "Asia/Bangkok", month: "short" });
          }
          if (tickMarkType === 2) {
            return date.toLocaleDateString("en-US", { timeZone: "Asia/Bangkok", day: "numeric" });
          }
          // 1D, 5D → แสดง HH:mm
          return date.toLocaleTimeString("en-US", {
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
          color: crosshairColor,
          labelBackgroundColor: crosshairLabelBg,
        },
        horzLine: {
          visible: true,
          labelVisible: true,
          style: 0,
          width: 1,
          color: isDark ? '#FFD70050' : crosshairColor,
          labelBackgroundColor: crosshairLabelBg,
        },
      },
      handleScale: false,
      handleScroll: false,
    });

    // สร้างสี gradient ที่เฟดจากสีกำไร/ขาดทุนลงไปเป็นโปร่งใส
    const areaTopColor = baseColor === "#10b981"
      ? "rgba(16, 185, 129, 0.4)"   // เขียว 40%
      : "rgba(239, 68, 68, 0.4)";    // แดง 40%
    const areaBottomColor = baseColor === "#10b981"
      ? "rgba(16, 185, 129, 0.0)"   // เขียว → โปร่งใส
      : "rgba(239, 68, 68, 0.0)";    // แดง → โปร่งใส

    const newSeries = chart.addSeries(AreaSeries, {
      lineColor: baseColor,
      topColor: areaTopColor,
      bottomColor: areaBottomColor,
      lineWidth: 2,
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
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

    // สำหรับ timeframe รายวัน/เดือน ใช้ YYYY-MM-DD string เพื่อกำจัดช่องว่างวันหยุด
    const isDaily = ["1M", "6M", "1Y", "5Y"].includes(viewType);

    const formattedSeriesData = processedData.map((d) => {
      if (isDaily) {
        const date = new Date(d[0]);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        return { time: `${yyyy}-${mm}-${dd}` as Time, value: d[1] };
      }
      return { time: (d[0] / 1000) as Time, value: d[1] };
    });

    // กำจัด time ซ้ำ เพื่อป้องกัน assertion error
    const seen = new Set<string | number>();
    const uniqueData = formattedSeriesData.filter((d) => {
      const key = String(d.time);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    newSeries.setData(uniqueData);

    if (formattedSeriesData.length > 0) {
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
          setDisplayPrice(value);
          const change = value - startPrice;
          const percent = startPrice !== 0 ? (change / startPrice) * 100 : 0;
          setDisplayChange(change);
          setDisplayPercent(percent);

          // แปลง time ตามรูปแบบที่ใช้
          let dateObj: Date;
          if (typeof param.time === "string") {
            dateObj = new Date(param.time + "T00:00:00");
          } else if (typeof param.time === "object" && param.time !== null) {
            const bd = param.time as unknown as { year: number; month: number; day: number };
            dateObj = new Date(bd.year, bd.month - 1, bd.day);
          } else {
            dateObj = new Date((param.time as number) * 1000);
          }

          if (isDaily) {
            setDisplayTime(
              dateObj.toLocaleDateString("th-TH", {
                timeZone: "Asia/Bangkok",
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            );
          } else {
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
  }, [chartData, baseColor, endPrice, viewType, startPrice, isDark]);

  // ---------------------------------------------------------------------------
  // 4. JSX RENDER
  // ---------------------------------------------------------------------------
  const sign = displayChange >= 0 ? "+" : "";
  const dynamicTextColor =
    displayChange >= 0 ? "text-emerald-500" : "text-red-500";

  if (isLoading && chartData.length === 0) {
    return (
      <div className="bg-surface h-[400px] p-6 rounded-xl shadow-lg border border-theme-border flex flex-col items-center justify-center text-muted transition-colors duration-300">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-4 w-4 bg-gold rounded-full mb-2 animate-bounce"></div>
          Loading {symbol}...
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-surface h-[400px] p-6 rounded-xl shadow-lg border border-theme-border flex flex-col items-center justify-center text-muted transition-colors duration-300">
        <p>No data available for {symbol}</p>
      </div>
    );
  }

  return (
    <div className="bg-surface p-6 rounded-xl shadow-lg border border-theme-border relative transition-colors duration-300">
      <div className="absolute top-6 right-6 z-10 flex bg-background p-1 rounded-lg border border-theme-border">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            onClick={() => setViewType(tf)}
            className={`
                    px-3 py-1 text-xs font-bold rounded-md transition-all duration-200
                    ${viewType === tf
                ? "bg-surface text-gold shadow-sm"
                : "text-muted hover:text-foreground hover:bg-surface/50"
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
            <h2 className="text-muted font-bold text-sm tracking-wider">
              {symbol}
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
                <span className="text-muted font-medium border-l border-theme-border pl-3">
                  ราคา ณ: {displayTime}
                </span>
              ) : (
                <span className="text-muted font-normal border-l border-theme-border pl-3">
                  {viewType === "1D" ? "วันนี้" : `Past ${viewType}`}
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
