// src/app/components/features/TradeTabs.tsx
"use client";

import React, { useState, useEffect } from "react";
import { brokerService } from "@/src/app/services/brokerService";
import {
  BuyStockRequest,
  AccountInfo,
  StockQuote,
} from "@/src/app/types/broker";

interface TradeTabsProps {
  symbol: string;
}

// ควรดึงจาก Context หรือ Env ในการใช้งานจริง
const HARDCODED_ACCOUNT_ID = "cccc73bb-c37e-4987-b059-075da0dfee8a";

export default function TradeTabs({ symbol }: TradeTabsProps) {
  // State หลัก
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] =
    useState<BuyStockRequest["OrderType"]>("MARKET");
  const [timeInForce, setTimeInForce] =
    useState<BuyStockRequest["TimeInForce"]>("DAY");

  // State สำหรับโหมดการกรอก (Shares หรือ Dollars)
  const [inputMode, setInputMode] = useState<"SHARES" | "DOLLARS">("SHARES");
  const [amount, setAmount] = useState<number | "">(""); // ใช้ตัวแปรเดียวเก็บค่า ไม่ว่าจะเป็น Qty หรือ Notional

  // State เพิ่มเติมสำหรับ UI (ราคา Limit/Stop)
  const [price, setPrice] = useState<number | "">("");

  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // ✅ เพิ่ม State สำหรับเก็บราคาล่าสุด
  const [quote, setQuote] = useState<StockQuote | null>(null);

  // useEffect ดึง Account
  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const data = await brokerService.getAccountInfo(HARDCODED_ACCOUNT_ID);
        setAccount(data);
      } catch (error) {
        console.error("Failed to fetch account info", error);
      }
    };
    fetchAccount();
  }, []);

  // ✅ useEffect สำหรับ Auto Refresh Quote (เพิ่มใหม่)
  useEffect(() => {
    const fetchPrice = async () => {
      if (!symbol) return;
      try {
        const data = await brokerService.getLatestQuote(symbol);
        setQuote(data);
      } catch (error) {
        console.error("Failed to fetch quote:", error);
        // ไม่ต้อง setQuote(null) ก็ได้ เพื่อให้ราคาเก่าโชว์ค้างไว้ดีกว่าหายไปเลย
      }
    };

    // เรียกทันทีครั้งแรก
    fetchPrice();

    // ตั้งเวลาเรียกซ้ำทุก 3 วินาที
    const intervalId = setInterval(fetchPrice, 3000);

    // เคลียร์เมื่อ component ถูกทำลาย หรือเปลี่ยน symbol
    return () => clearInterval(intervalId);
  }, [symbol]);

  // useEffect Reset ค่า (เหมือนเดิม)
  useEffect(() => {
    setMessage(null);
    setAmount("");
    setPrice("");
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

    setLoading(true);
    setMessage(null);

    try {
      // เตรียม Payload
      const payload: BuyStockRequest = {
        accountId: HARDCODED_ACCOUNT_ID,
        symbol: symbol,
        OrderSide: orderSide,
        OrderType: orderType,
        TimeInForce: timeInForce,
        // ส่ง price ไปด้วยเผื่อกรณี Limit Order (ถ้า backend รองรับ params เพิ่มเติม)
        // price: price
      };

      // แยกกรณีตาม Input Mode
      if (inputMode === "SHARES") {
        payload.qty = Number(amount);
      } else {
        payload.notional = Number(amount);
        // ปกติ Notional มักบังคับเป็น Market Order (Backend service คุณจัดการเรื่องนี้แล้ว)
      }

      await brokerService.buyStock(payload);

      setMessage({ type: "success", text: "Order placed successfully!" });
      setAmount(""); // Reset

      // Refresh Account Data
      const updatedAccount = await brokerService.getAccountInfo(
        HARDCODED_ACCOUNT_ID
      );
      setAccount(updatedAccount);
    } catch (error: any) {
      console.error(error);
      setMessage({
        type: "error",
        text: error?.response?.data?.message || "Failed to place order.",
      });
    } finally {
      setLoading(false);
    }
  };
  // คำนวณ % Change (ถ้ามี openPrice)
  const percentChange = quote && quote.openPrice
    ? ((quote.price - quote.openPrice) / quote.openPrice) * 100
    : 0;

  const isBuy = orderSide === "BUY";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
      {/* Header: Symbol & Price Info */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">{symbol}</h2>
          
          {/* ✅ แสดงราคา Real-time ตรงนี้ */}
          <div className="flex flex-col">
            {quote ? (
                <>
                    {/* ✅ 1. ราคาตัวใหญ่: ใช้ Last Trade Price (นิ่ง ตรงกราฟ) */}
                    <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-bold tracking-tight font-mono ${
                            percentChange >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                            ${quote.price.toFixed(2)}
                        </span>
                        {/* แสดง % Change */}
                        {quote.openPrice && (
                            <span className={`text-sm font-medium ${percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {percentChange > 0 ? '+' : ''}{percentChange.toFixed(2)}%
                            </span>
                        )}
                    </div>

                    {/* ✅ 2. ข้อมูล Bid/Ask: แสดงอยู่ข้างล่างเหมือนเดิม */}
                    <div className="flex gap-3 text-xs font-medium mt-1">
                        <span className="text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                            Bid: <span className="text-gray-800">{quote.bidPrice.toFixed(2)}</span>
                            <span className="text-[10px] text-gray-400 ml-1">x{quote.bidSize}</span>
                        </span>
                        <span className="text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                            Ask: <span className="text-gray-800">{quote.askPrice.toFixed(2)}</span>
                            <span className="text-[10px] text-gray-400 ml-1">x{quote.askSize}</span>
                        </span>
                    </div>
                </>
            ) : (
                <span className="text-xs font-medium text-gray-400 mt-1 animate-pulse">
                    Loading price...
                </span>
            )}
          </div>

        </div>
        <div className="text-right">
           {account && (
             <div className="flex flex-col items-end">
               <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Buying Power</span>
               <span className="text-sm font-bold text-gray-700 font-mono">
                 ${account.buyingPower.toLocaleString(undefined, { minimumFractionDigits: 2 })}
               </span>
             </div>
           )}
        </div>
      </div>
      {/* Tabs: Buy / Sell */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setOrderSide("BUY")}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${
            isBuy
              ? "bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600"
              : "text-gray-400 hover:bg-gray-50"
          }`}
        >
          BUY
        </button>
        <button
          onClick={() => setOrderSide("SELL")}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${
            !isBuy
              ? "bg-red-50 text-red-700 border-b-2 border-red-600"
              : "text-gray-400 hover:bg-gray-50"
          }`}
        >
          SELL
        </button>
      </div>

      {/* Form Area */}
      <div className="p-6 space-y-5">
        {/* Toggle: Shares vs Dollars */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setInputMode("SHARES")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
              inputMode === "SHARES"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-600"
            }`}
          >
            Shares
          </button>
          <button
            type="button"
            onClick={() => setInputMode("DOLLARS")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
              inputMode === "DOLLARS"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-600"
            }`}
          >
            Dollars ($)
          </button>
        </div>

        {/* Order Type & TIF Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Order Type
            </label>
            <div className="relative">
              <select
                value={orderType}
                // ถ้าซื้อเป็นจำนวนเงิน (Dollars) มักจะล็อคเป็น Market Order
                disabled={inputMode === "DOLLARS"}
                onChange={(e) =>
                  setOrderType(e.target.value as BuyStockRequest["OrderType"])
                }
                className={`w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent block w-full p-2.5 outline-none appearance-none font-medium ${
                  inputMode === "DOLLARS" ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <option value="MARKET">Market</option>
                <option value="LIMIT">Limit</option>
                <option value="STOP">Stop</option>
                <option value="STOP_LIMIT">Stop Limit</option>
                <option value="TRAILING_STOP">Trailing Stop</option>
              </select>
              {inputMode !== "DOLLARS" && (
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
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
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
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
                className={`w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent block w-full p-2.5 outline-none appearance-none font-medium ${
                  inputMode === "DOLLARS" ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <option value="DAY">Day</option>
                <option value="GTC">GTC</option>
                <option value="IOC">IOC</option>
                <option value="FOK">FOK</option>
              </select>
              {inputMode !== "DOLLARS" && (
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
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

        {/* Amount Input (Dynamic based on mode) */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">
            {inputMode === "SHARES" ? "Quantity (Shares)" : "Amount (USD)"}
          </label>
          <div className="relative">
            {/* แสดง icon $ หากเป็นโหมด Dollars */}
            {inputMode === "DOLLARS" && (
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <span className="text-gray-400 font-bold">$</span>
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
              className={`block w-full p-3 text-sm text-gray-900 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono 
                ${inputMode === "DOLLARS" ? "pl-8" : "pl-4"}
              `}
            />

            {/* แสดงคำว่า QTY หากเป็นโหมด Shares */}
            {inputMode === "SHARES" && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <span className="text-gray-400 text-xs font-bold">QTY</span>
              </div>
            )}
          </div>
        </div>

        {/* Limit Price Input (แสดงเฉพาะเมื่อเลือก OrderType เป็น Limit หรือ Stop Limit และไม่ใช่โหมด Dollars) */}
        {inputMode !== "DOLLARS" &&
          (orderType === "LIMIT" || orderType === "STOP_LIMIT") && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Limit Price
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-gray-500 font-bold">$</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) =>
                    setPrice(
                      e.target.value === "" ? "" : parseFloat(e.target.value)
                    )
                  }
                  placeholder="0.00"
                  className="block w-full p-3 pl-8 text-sm text-gray-900 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
                />
              </div>
            </div>
          )}

        {/* Submit Section */}
        <div className="pt-2">
          {message && (
            <div
              className={`mb-3 p-3 rounded-md text-xs font-medium ${
                message.type === "success"
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
              ${
                loading
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
                {orderSide} {symbol}
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
