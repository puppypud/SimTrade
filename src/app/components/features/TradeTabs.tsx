// src/app/components/features/TradeTabs.tsx
"use client";

import React, { useState, useEffect } from "react";
import { brokerService } from "@/src/app/services/brokerService";
import {
  BuyStockRequest,
  AccountInfo,
  StockQuote,
  Position,
} from "@/src/app/types/broker";
import { formatSymbolDisplay } from "@/src/app/utils/formatters";
import MarketStatusBadge from "@/src/app/components/features/MarketStatusBadge";
import { Star } from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";

interface TradeTabsProps {
  symbol: string;
}

export default function TradeTabs({ symbol }: TradeTabsProps) {
  const { user } = useAuth();
  // State หลัก
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<BuyStockRequest["OrderType"]>("MARKET");
  const [timeInForce, setTimeInForce] = useState<BuyStockRequest["TimeInForce"]>("DAY");

  // ✅ ใช้ targetPrice เป็นตัวแปรเก็บราคาเป้าหมาย (ใช้ร่วมกันทั้ง Limit และ Stop)
  const [targetPrice, setTargetPrice] = useState<number | "">("");

  // State สำหรับโหมดการกรอก (Shares หรือ Dollars)
  const [inputMode, setInputMode] = useState<"SHARES" | "DOLLARS">("SHARES");
  const [amount, setAmount] = useState<number | "">("");

  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [position, setPosition] = useState<Position | null>(null);

  // Watchlist State
  const [isFavorite, setIsFavorite] = useState(false);
  const LOCAL_STORAGE_KEY = "simtrade_my_favorites";

  // ดึงข้อมูล Watchlist
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const favorites = JSON.parse(stored) as string[];
        setIsFavorite(favorites.includes(symbol));
      }
    } catch (e) {
      console.error("Failed to load favorites in TradeTabs", e);
    }
  }, [symbol]);

  const toggleFavorite = () => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      let favorites = stored ? JSON.parse(stored) as string[] : [];

      if (isFavorite) {
        favorites = favorites.filter(sym => sym !== symbol);
      } else {
        if (!favorites.includes(symbol)) {
          favorites.push(symbol);
        }
      }

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(favorites));
      setIsFavorite(!isFavorite);
    } catch (e) {
      console.error("Failed to update favorites in TradeTabs", e);
    }
  };

  // ดึงข้อมูล Account
  useEffect(() => {
    const fetchAccount = async () => {
      if (!user?.alpacaAccountId) return;
      try {
        const data = await brokerService.getAccountInfo(user.alpacaAccountId);
        setAccount(data);
      } catch (error) {
        console.error("Failed to fetch account info", error);
      }
    };
    fetchAccount();
  }, [user]);

  // ดึงราคา Real-time
  useEffect(() => {
    const fetchPrice = async () => {
      if (!symbol) return;
      try {
        const data = await brokerService.getLatestQuote(symbol);
        setQuote(data);
      } catch (error) {
        console.error("Failed to fetch quote:", error);
      }
    };

    fetchPrice();
    const intervalId = setInterval(fetchPrice, 3000);
    return () => clearInterval(intervalId);
  }, [symbol]);

  // ดึงข้อมูล Position ของหุ้นตัวนี้
  useEffect(() => {
    const fetchPosition = async () => {
      if (!user?.alpacaAccountId || !symbol) return;
      try {
        const positions = await brokerService.getOpenPositions(user.alpacaAccountId);
        const currentPos = positions.find(p => p.symbol === symbol);
        setPosition(currentPos || null);
      } catch (error) {
        console.error("Failed to fetch position:", error);
      }
    };
    fetchPosition();
  }, [user, symbol, account]); // ดึงใหม่เมื่อ account หรือ symbol เปลี่ยน

  // Reset ค่าเมื่อเปลี่ยน Symbol หรือ Input Mode
  useEffect(() => {
    setMessage(null);
    setAmount("");
    setTargetPrice(""); // Reset ราคาเป้าหมาย
    if (inputMode === "DOLLARS") {
      setOrderType("MARKET");
      setTimeInForce("DAY");
    }
  }, [symbol, inputMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setMessage({ type: "error", text: "Please enter a valid amount." });
      return;
    }

    // Validation เพิ่มเติม: ถ้าไม่ใช่ Market ต้องใส่ราคาเสมอ
    if (orderType !== "MARKET" && (!targetPrice || Number(targetPrice) <= 0)) {
      setMessage({ type: "error", text: "Please enter a valid price." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (!user?.alpacaAccountId) {
        setMessage({ type: "error", text: "Please log in to trade." });
        setLoading(false);
        return;
      }

      // ✅ Logic การ Map ค่า targetPrice ไปใส่ให้ถูก Field ตาม OrderType
      const priceValue = targetPrice === "" ? undefined : Number(targetPrice);

      // เตรียม Payload
      const payload: BuyStockRequest = {
        accountId: user.alpacaAccountId || "",
        email: user.email,
        symbol: symbol,
        OrderSide: orderSide,
        OrderType: orderType,
        TimeInForce: timeInForce,
        // กำหนดค่าเริ่มต้นเป็น undefined ไว้ก่อน
        limitPrice: undefined,
        stopPrice: undefined,
      };

      // Map ค่าเข้า field ที่ถูกต้อง
      if (orderType === "LIMIT") {
        payload.limitPrice = priceValue;
      } else if (orderType === "STOP") {
        payload.stopPrice = priceValue; // ✅ ส่งเข้า stopPrice ให้ Backend รับค่าได้ถูกต้อง
      } else if (orderType === "STOP_LIMIT") {
        // กรณี Stop Limit ถ้า UI มีช่องเดียว ให้ถือว่า Stop = Limit
        payload.stopPrice = priceValue;
        payload.limitPrice = priceValue;
      }

      // Map Qty หรือ Notional
      if (inputMode === "SHARES") {
        payload.qty = Number(amount);
      } else {
        payload.notional = Number(amount);
      }

      console.log("Sending Payload:", payload); // Debug ดูค่าก่อนส่ง

      await brokerService.buyStock(payload);

      setMessage({ type: "success", text: "Order placed successfully!" });
      setAmount("");
      setTargetPrice(""); // Reset ราคาหลังส่ง

      // รอสักครู่เพื่อให้ Alpaca อัปเดตยอดคงเหลือในระบบ
      await new Promise(resolve => setTimeout(resolve, 1000));

      const updatedAccount = await brokerService.getAccountInfo(
        user.alpacaAccountId
      );
      setAccount(updatedAccount);

      // ดึงอีกรอบหลังจาก 3 วินาทีเพื่อความชัวร์ (เผื่อระบบประมวลผลช้า)
      setTimeout(async () => {
        if (user?.alpacaAccountId) {
          const finalUpdate = await brokerService.getAccountInfo(user.alpacaAccountId);
          setAccount(finalUpdate);
        }
      }, 3000);
    } catch (error: any) {
      console.error(error);
      const errorData = error?.response?.data;
      const errorMsg = typeof errorData === 'string'
        ? errorData
        : errorData?.message || "Failed to place order.";
      setMessage({
        type: "error",
        text: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  const baselinePrice = quote?.prevClose || quote?.openPrice || 0;
  const priceChange = quote ? quote.price - baselinePrice : 0;
  const percentChange = baselinePrice !== 0 ? (priceChange / baselinePrice) * 100 : 0;

  const isBuy = orderSide === "BUY";

  // Helper: เช็คว่าจะโชว์ช่องกรอกราคาหรือไม่
  const showPriceInput = orderType === "LIMIT" || orderType === "STOP" || orderType === "STOP_LIMIT";

  // Helper: เปลี่ยน Label ตามประเภทคำสั่ง
  const getPriceLabel = () => {
    if (orderType === "STOP") return "Stop Price";
    if (orderType === "STOP_LIMIT") return "Stop/Limit Price";
    return "Limit Price";
  };

  // ฟังก์ชันขายทั้งหมด
  const handleSellAll = () => {
    if (!position) return;
    setOrderSide("SELL");
    setInputMode("SHARES");
    setAmount(position.qty);
  };

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-theme-border overflow-hidden flex flex-col transition-colors duration-300">
      {/* Header: Symbol & Price Info */}
      <div className="px-6 py-4 border-b border-theme-border bg-surface/50 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-foreground tracking-tight">{formatSymbolDisplay(symbol)}</h2>
            <button
              onClick={toggleFavorite}
              className="p-1 hover:bg-background rounded-full transition-colors"
              title={isFavorite ? "Remove from Watchlist" : "Add to Watchlist"}
            >
              <Star
                className={`w-5 h-5 ${isFavorite ? "text-gold fill-gold" : "text-muted"}`}
              />
            </button>
            <div className="ml-2">
              <MarketStatusBadge />
            </div>
          </div>

          <div className="flex flex-col">
            {quote ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-bold tracking-tight font-mono ${percentChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                    ${quote.price.toFixed(2)}
                  </span>
                  {quote.openPrice && (
                    <span className={`text-sm font-medium ${percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {percentChange > 0 ? '+' : ''}{percentChange.toFixed(2)}%
                    </span>
                  )}
                </div>
                <div className="flex gap-3 text-xs font-medium mt-1">
                  <span className="text-muted bg-background px-1.5 py-0.5 rounded border border-theme-border">
                    Bid: <span className="text-foreground">{quote.bidPrice.toFixed(2)}</span>
                    <span className="text-[10px] text-muted ml-1">x{quote.bidSize}</span>
                  </span>
                  <span className="text-muted bg-background px-1.5 py-0.5 rounded border border-theme-border">
                    Ask: <span className="text-foreground">{quote.askPrice.toFixed(2)}</span>
                    <span className="text-[10px] text-muted ml-1">x{quote.askSize}</span>
                  </span>
                </div>
              </>
            ) : (
              <span className="text-xs font-medium text-muted mt-1 animate-pulse">
                Loading price...
              </span>
            )}
          </div>

        </div>
        <div className="text-right">
          {account && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase text-muted font-bold tracking-wider">Buying Power</span>
              <span className="text-sm font-bold text-gold font-mono">
                ${account.buyingPower.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs: Buy / Sell */}
      <div className="flex border-b border-theme-border">
        <button
          onClick={() => setOrderSide("BUY")}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${isBuy
            ? "bg-emerald-900/10 text-emerald-500 border-b-2 border-emerald-500"
            : "text-muted hover:bg-background"
            }`}
        >
          BUY
        </button>
        <button
          onClick={() => setOrderSide("SELL")}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${!isBuy
            ? "bg-red-900/10 text-red-500 border-b-2 border-red-500"
            : "text-muted hover:bg-background"
            }`}
        >
          SELL
        </button>
      </div>

      {/* Form Area */}
      <div className="p-6 space-y-5">
        {/* Simplified Position Info: Show ONLY on SELL side & minimal style */}
        {!isBuy && position && position.qty > 0 && (
          <div className="flex items-center justify-between px-3 py-2.5 bg-background rounded-xl border border-theme-border/50 transition-all duration-300">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted font-bold uppercase tracking-tight">Available to Sell</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-mono font-bold text-foreground">{position.qty}</span>
                <span className="text-[10px] text-muted font-medium">Shares</span>
                <span className="text-xs text-muted/60 ml-1">≈ ${((position.qty) * (quote?.price || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSellAll}
              className="px-3 py-1.5 text-xs font-bold text-red-500 bg-red-500/5 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-lg transition-all"
            >
              Sell All
            </button>
          </div>
        )}
        {/* Toggle: Shares vs Dollars */}
        <div className="flex bg-background p-1 rounded-lg border border-theme-border">
          <button
            type="button"
            onClick={() => setInputMode("SHARES")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${inputMode === "SHARES"
              ? "bg-surface text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
              }`}
          >
            Shares
          </button>
          <button
            type="button"
            onClick={() => setInputMode("DOLLARS")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${inputMode === "DOLLARS"
              ? "bg-surface text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
              }`}
          >
            Dollars ($)
          </button>
        </div>

        {/* Order Type & TIF Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">
              Order Type
            </label>
            <div className="relative">
              <select
                value={orderType}
                disabled={inputMode === "DOLLARS"}
                onChange={(e) =>
                  setOrderType(e.target.value as BuyStockRequest["OrderType"])
                }
                className={`w-full bg-background border border-theme-border text-foreground text-sm rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent block w-full p-2.5 outline-none appearance-none font-medium ${inputMode === "DOLLARS" ? "opacity-50 cursor-not-allowed" : ""
                  }`}
              >
                <option value="MARKET">Market</option>
                <option value="LIMIT">Limit</option>
                <option value="STOP">Stop</option>
                {/* เพิ่ม STOP_LIMIT หากต้องการ */}
                {/* <option value="STOP_LIMIT">Stop Limit</option> */}
              </select>
              {inputMode !== "DOLLARS" && (
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted">
                  <svg
                    className="fill-current h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">
              Time In Force
            </label>
            <div className="relative">
              <select
                value={timeInForce}
                disabled={inputMode === "DOLLARS"}
                onChange={(e) =>
                  setTimeInForce(
                    e.target.value as BuyStockRequest["TimeInForce"]
                  )
                }
                className={`w-full bg-background border border-theme-border text-foreground text-sm rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent block w-full p-2.5 outline-none appearance-none font-medium ${inputMode === "DOLLARS" ? "opacity-50 cursor-not-allowed" : ""
                  }`}
              >
                <option value="DAY">Day</option>
                <option value="GTC">GTC</option>
              </select>
              {inputMode !== "DOLLARS" && (
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted">
                  <svg
                    className="fill-current h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5">
            {inputMode === "SHARES" ? "Quantity (Shares)" : "Amount (USD)"}
          </label>
          <div className="relative">
            {inputMode === "DOLLARS" && (
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <span className="text-muted font-bold">$</span>
              </div>
            )}

            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) =>
                setAmount(
                  e.target.value === "" ? "" : parseFloat(e.target.value)
                )
              }
              placeholder="0.00"
              className={`block w-full p-3 text-sm text-foreground border border-theme-border rounded-lg bg-background focus:ring-2 focus:ring-gold focus:border-transparent outline-none font-mono 
                ${inputMode === "DOLLARS" ? "pl-8" : "pl-4"}
              `}
            />

            {inputMode === "SHARES" && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <span className="text-muted text-xs font-bold">QTY</span>
              </div>
            )}
          </div>
        </div>

        {/* ✅ Single Price Input (ใช้สำหรับ Limit, Stop และ Stop Limit) */}
        {inputMode !== "DOLLARS" && showPriceInput && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            <label className="block text-xs font-semibold text-muted mb-1.5">
              {getPriceLabel()}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <span className="text-muted font-bold">$</span>
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={targetPrice}
                onChange={(e) =>
                  setTargetPrice(
                    e.target.value === "" ? "" : parseFloat(e.target.value)
                  )
                }
                placeholder="0.00"
                className="block w-full p-3 pl-8 text-sm text-foreground border border-theme-border rounded-lg bg-background focus:ring-2 focus:ring-gold focus:border-transparent outline-none font-mono"
              />
            </div>
          </div>
        )}

        {/* Submit Section */}
        <div className="pt-2">
          {message && (
            <div
              className={`mb-3 p-3 rounded-md text-xs font-medium ${message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-100"
                : "bg-red-50 text-red-700 border border-red-100"
                }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !symbol}
            className={`w-full text-white font-bold rounded-xl text-sm px-5 py-3.5 text-center shadow-md transition-all transform active:scale-[0.98] duration-200
              ${loading
                ? "bg-gray-400 cursor-not-allowed"
                : isBuy
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                  : "bg-red-600 hover:bg-red-700 shadow-red-200"
              }
            `}
          >
            {loading ? (
              "Processing..."
            ) : (
              <>
                {orderSide} {formatSymbolDisplay(symbol)}
                <span className="opacity-80 font-normal ml-1">
                  (
                  {inputMode === "SHARES"
                    ? `${amount || 0} Shares`
                    : `$${amount || 0}`}
                  )
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}