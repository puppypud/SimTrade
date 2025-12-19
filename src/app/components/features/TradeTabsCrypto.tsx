"use client";

import React, { useState, useEffect } from "react";
import { brokerService } from "@/src/app/services/brokerService";
import { AccountInfo } from "@/src/app/types/broker"; 

interface TradeTabsCryptoProps {
  symbol: string;
}

// ⚠️ ใช้ Account ID ของ User ที่ต้องการทดสอบ (ในการใช้งานจริงควรดึงจาก Context/Auth)
const HARDCODED_ACCOUNT_ID = "9d35fa1a-d10b-484c-abd5-6501dfee1ded"; 

export default function TradeTabsCrypto({ symbol }: TradeTabsCryptoProps) {
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [inputMode, setInputMode] = useState<"COIN" | "USD">("COIN");
  const [amount, setAmount] = useState<number | "">(""); 
  const [limitPrice, setLimitPrice] = useState<number | "">("");
  
  const [account, setAccount] = useState<AccountInfo | null>(null);
  
  // ใช้ Type Any ไปก่อนเพราะ Backend ส่ง Map กลับมา (หรือจะสร้าง Interface CryptoQuote ก็ได้)
  const [quote, setQuote] = useState<any | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 1. ดึงข้อมูล Account (Buying Power)
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

  // 2. ดึงราคา Real-time (Loop ทุก 3 วินาที)
  useEffect(() => {
    const fetchPrice = async () => {
      if (!symbol) return;
      try {
        // ✅ เรียกฟังก์ชันใหม่ที่เราสร้างใน Step 1
        const data = await brokerService.getLatestCryptoQuote(symbol);
        setQuote(data);
      } catch (error) {
        console.error("Failed to fetch quote:", error);
      }
    };
    
    fetchPrice(); // เรียกครั้งแรกทันที
    const intervalId = setInterval(fetchPrice, 3000); // วนลูป
    return () => clearInterval(intervalId);
  }, [symbol]);

  // Reset ค่าเมื่อเปลี่ยน Symbol
  useEffect(() => {
    setMessage(null);
    setAmount("");
    setLimitPrice("");
  }, [symbol]);

  // ฟังก์ชันกดปุ่ม Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setMessage({ type: "error", text: "Please enter a valid amount." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // ✅ เรียกฟังก์ชันสร้าง Order ใหม่
      await brokerService.createCryptoOrder(
        HARDCODED_ACCOUNT_ID,
        symbol,
        orderSide,
        Number(amount),
        inputMode === "COIN" ? "QTY" : "NOTIONAL", // แปลง Mode ให้ตรงกับ Service
        (inputMode === "COIN" && limitPrice !== "") ? Number(limitPrice) : undefined
      );

      setMessage({ type: "success", text: `Success! ${orderSide} order placed.` });
      setAmount("");
      
      // อัปเดตเงินในกระเป๋าใหม่
      const updatedAccount = await brokerService.getAccountInfo(HARDCODED_ACCOUNT_ID);
      setAccount(updatedAccount);

    } catch (error: any) {
      console.error(error);
      const errorMsg = error?.response?.data || error?.message || "Failed to place order";
      setMessage({ type: "error", text: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg) });
    } finally {
      setLoading(false);
    }
  };

  const isBuy = orderSide === "BUY";
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* --- ส่วน Header แสดงราคา --- */}
      <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">{symbol}</h2>
          <div className="mt-1">
            {quote && quote.price ? (
               <span className={`text-3xl font-bold tracking-tight font-mono text-gray-800`}>
                 ${Number(quote.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
               </span>
            ) : (
               <span className="text-sm text-gray-400 animate-pulse">Loading price...</span>
            )}
          </div>
        </div>
        
        {/* แสดง Buying Power */}
        <div className="text-right">
           {account && (
             <div className="flex flex-col items-end">
               <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Available Cash</span>
               <span className="text-sm font-bold text-emerald-600 font-mono">
                 ${account.buyingPower.toLocaleString(undefined, { minimumFractionDigits: 2 })}
               </span>
             </div>
           )}
        </div>
      </div>

      {/* --- ส่วน Tabs BUY / SELL --- */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setOrderSide("BUY")}
          className={`flex-1 py-3 text-sm font-bold transition-all ${
            isBuy ? "bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500" : "text-gray-400 hover:bg-gray-50"
          }`}
        >
          BUY
        </button>
        <button
          onClick={() => setOrderSide("SELL")}
          className={`flex-1 py-3 text-sm font-bold transition-all ${
            !isBuy ? "bg-red-50 text-red-700 border-b-2 border-red-500" : "text-gray-400 hover:bg-gray-50"
          }`}
        >
          SELL
        </button>
      </div>

      {/* --- ส่วน Form กรอกข้อมูล --- */}
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        
        {/* ปุ่มสลับโหมด เหรียญ vs เงินดอลลาร์ */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setInputMode("COIN")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
              inputMode === "COIN" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-600"
            }`}
          >
            Amount (Coins)
          </button>
          <button
            type="button"
            onClick={() => setInputMode("USD")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
              inputMode === "USD" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-600"
            }`}
          >
            Total (USD)
          </button>
        </div>

        {/* ช่องกรอกจำนวน */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">
            {inputMode === "COIN" ? `Quantity (${symbol.split('/')[0]})` : "Amount ($)"}
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
              placeholder="0.00"
              className="block w-full p-3 pl-4 text-lg text-gray-900 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono transition-all"
            />
          </div>
        </div>

        {/* ช่องกรอกราคา Limit (เฉพาะโหมด Coins) */}
        {inputMode === "COIN" && (
           <div className="animate-in fade-in slide-in-from-top-2 duration-200">
             <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex justify-between">
                <span>Limit Price (Optional)</span>
                <span className="text-[10px] text-gray-400 font-normal">Leave empty for Market Order</span>
             </label>
             <div className="relative">
                <span className="absolute left-4 top-3.5 text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value === "" ? "" : parseFloat(e.target.value))}
                  placeholder="Market Price"
                  className="block w-full p-3 pl-8 text-sm text-gray-900 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
                />
             </div>
           </div>
        )}

        {/* ปุ่ม Submit */}
        <div className="pt-4">
          {message && (
            <div className={`mb-4 p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                message.type === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
            }`}>
              {message.type === "success" ? "✅" : "❌"} {message.text}
            </div>
          )}

          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !symbol}
            className={`w-full text-white font-bold rounded-xl text-base px-5 py-4 text-center shadow-lg transition-all transform active:scale-[0.98] duration-200
              ${loading ? "bg-gray-400 cursor-not-allowed" : isBuy ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-200" : "bg-red-600 hover:bg-red-500 shadow-red-200"}
            `}
          >
            {loading ? "Processing..." : `${orderSide} ${symbol}`}
          </button>
        </div>
      </div>
    </div>
  );
}