"use client";

import React, { useState, useEffect } from "react";
import { brokerService } from "@/src/app/services/brokerService";
import { AccountInfo, StockQuote } from "@/src/app/types/broker"; // ตรวจสอบ path ให้ถูกต้อง

interface TradeTabsCryptoProps {
  symbol: string;
}

// ควรดึงจาก Context หรือ Env ในการใช้งานจริง
const HARDCODED_ACCOUNT_ID = "cccc73bb-c37e-4987-b059-075da0dfee8a";

export default function TradeTabsCrypto({ symbol }: TradeTabsCryptoProps) {
  // State หลัก
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  
  // Input Mode: COIN (ระบุจำนวนเหรียญ) หรือ USD (ระบุจำนวนเงิน)
  const [inputMode, setInputMode] = useState<"COIN" | "USD">("COIN");
  
  const [amount, setAmount] = useState<number | "">(""); 
  const [limitPrice, setLimitPrice] = useState<number | "">("");

  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [quote, setQuote] = useState<StockQuote | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ดึงข้อมูล Account
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

  // ดึงราคา Real-time (ใช้ Logic เดียวกับ Stock ไปก่อน หรือเปลี่ยนเป็น API Crypto ถ้ามี)
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

  // Reset ค่าเมื่อเปลี่ยน Symbol หรือ Mode
  useEffect(() => {
    setMessage(null);
    setAmount("");
    setLimitPrice("");
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
      // เรียกใช้ function createCryptoOrder ที่เราเพิ่มใน step 1
      await brokerService.createCryptoOrder(
        HARDCODED_ACCOUNT_ID,
        symbol,
        orderSide,
        Number(amount),
        inputMode === "COIN" ? "QTY" : "NOTIONAL", // Map mode ให้ตรงกับ logic service
        (inputMode === "COIN" && limitPrice !== "") ? Number(limitPrice) : undefined
      );

      setMessage({ type: "success", text: "Crypto Order placed successfully!" });
      setAmount("");
      
      // Refresh Account
      const updatedAccount = await brokerService.getAccountInfo(HARDCODED_ACCOUNT_ID);
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

  const isBuy = orderSide === "BUY";
  const percentChange = quote && quote.openPrice
    ? ((quote.price - quote.openPrice) / quote.openPrice) * 100
    : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
      {/* Header: Symbol & Price */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">{symbol}</h2>
          <div className="flex flex-col">
            {quote ? (
                <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-bold tracking-tight font-mono ${
                        percentChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                        ${quote.price.toFixed(2)}
                    </span>
                </div>
            ) : (
                <span className="text-xs font-medium text-gray-400 mt-1 animate-pulse">Loading price...</span>
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

      {/* Buy / Sell Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setOrderSide("BUY")}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${
            isBuy ? "bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600" : "text-gray-400 hover:bg-gray-50"
          }`}
        >
          BUY
        </button>
        <button
          onClick={() => setOrderSide("SELL")}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${
            !isBuy ? "bg-red-50 text-red-700 border-b-2 border-red-600" : "text-gray-400 hover:bg-gray-50"
          }`}
        >
          SELL
        </button>
      </div>

      {/* Form */}
      <div className="p-6 space-y-5">
        
        {/* Toggle: Coins (Qty) vs Dollars (Notional) */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setInputMode("COIN")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
              inputMode === "COIN" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-600"
            }`}
          >
            Coins (Qty)
          </button>
          <button
            type="button"
            onClick={() => setInputMode("USD")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
              inputMode === "USD" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-600"
            }`}
          >
            Dollars ($)
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">
            {inputMode === "COIN" ? "Quantity (Coins)" : "Amount (USD)"}
          </label>
          <div className="relative">
            {inputMode === "USD" && (
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <span className="text-gray-400 font-bold">$</span>
              </div>
            )}
            <input
              type="number"
              min="0.000001"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
              placeholder="0.00"
              className={`block w-full p-3 text-sm text-gray-900 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono 
                ${inputMode === "USD" ? "pl-8" : "pl-4"}
              `}
            />
          </div>
        </div>

        {/* Limit Price Input (แสดงเฉพาะเมื่อเลือก Coins) */}
        {inputMode === "COIN" && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Limit Price (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-gray-500 font-bold">$</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value === "" ? "" : parseFloat(e.target.value))}
                  placeholder="Leave empty for Market Order"
                  className="block w-full p-3 pl-8 text-sm text-gray-900 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">If set, this will be a Limit Order. If empty, Market Order.</p>
            </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          {message && (
            <div className={`mb-3 p-3 rounded-md text-xs font-medium ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !symbol}
            className={`w-full text-white font-bold rounded-xl text-sm px-5 py-3.5 text-center shadow-md transition-all transform active:scale-[0.98] duration-200
              ${loading ? "bg-gray-400 cursor-not-allowed" : isBuy ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
            `}
          >
            {loading ? "Processing..." : `${orderSide} ${symbol}`}
          </button>
        </div>
      </div>
    </div>
  );
}