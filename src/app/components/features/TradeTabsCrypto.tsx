"use client";

import React, { useState, useEffect } from "react";
import { brokerService } from "@/src/app/services/brokerService";
import { AccountInfo } from "@/src/app/types/broker";
import { Star } from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";

interface TradeTabsCryptoProps {
  symbol: string;
}

const formatPrice = (val: any) => {
  const num = Number(val);
  if (isNaN(num)) return "0.00";
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function TradeTabsCrypto({ symbol }: TradeTabsCryptoProps) {
  const { user } = useAuth();
  // --- State ---
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [inputMode, setInputMode] = useState<"COIN" | "USD">("COIN");

  // ✅ 1. เหลือแค่ MARKET, LIMIT, STOP
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP">("MARKET");

  // ✅ 2. เหลือแค่ GTC, DAY (เอา IOC, FOK ออก)
  const [timeInForce, setTimeInForce] = useState<"GTC" | "DAY">("GTC");

  const [amount, setAmount] = useState<number | "">("");
  const [limitPrice, setLimitPrice] = useState<number | "">("");
  const [stopPrice, setStopPrice] = useState<number | "">("");

  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [quote, setQuote] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // --- Watchlist State ---
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
      console.error("Failed to load favorites in TradeTabsCrypto", e);
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
      console.error("Failed to update favorites in TradeTabsCrypto", e);
    }
  };

  // 1. Fetch Account
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

  // 2. Real-time Quote
  useEffect(() => {
    const fetchPrice = async () => {
      if (!symbol) return;
      try {
        const data = await brokerService.getLatestCryptoQuote(symbol);
        setQuote(data);
      } catch (error) {
        console.error("Failed to fetch quote:", error);
      }
    };
    fetchPrice();
    const intervalId = setInterval(fetchPrice, 3000);
    return () => clearInterval(intervalId);
  }, [symbol]);

  // Reset State
  useEffect(() => {
    setMessage(null);
    setAmount("");
    setLimitPrice("");
    setStopPrice("");
    if (inputMode === "USD") {
      setOrderType("MARKET");
    }
  }, [symbol, inputMode]);

  // Submit Logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setMessage({ type: "error", text: "Please enter a valid amount." });
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

      await brokerService.createCryptoOrder(
        user.alpacaAccountId,
        symbol,
        orderSide,
        Number(amount),
        inputMode === "COIN" ? "QTY" : "NOTIONAL",
        orderType,
        timeInForce,
        // ส่ง Limit Price เฉพาะตอนเลือก LIMIT
        orderType === "LIMIT" && limitPrice !== "" ? Number(limitPrice) : undefined,
        // ส่ง Stop Price เฉพาะตอนเลือก STOP
        orderType === "STOP" && stopPrice !== "" ? Number(stopPrice) : undefined
      );

      setMessage({ type: "success", text: `Success! ${orderSide} order placed.` });
      setAmount("");

      const updatedAccount = await brokerService.getAccountInfo(user.alpacaAccountId);
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
    <div className="bg-surface rounded-2xl shadow-sm border border-theme-border overflow-hidden flex flex-col h-full transition-colors duration-300">

      {/* --- Header (Price & Balance) --- */}
      <div className="px-6 py-5 border-b border-theme-border bg-surface/50">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-foreground tracking-tight">{symbol}</h2>
              <button
                onClick={toggleFavorite}
                className="p-1 hover:bg-background rounded-full transition-colors"
                title={isFavorite ? "Remove from Watchlist" : "Add to Watchlist"}
              >
                <Star
                  className={`w-5 h-5 ${isFavorite ? "text-gold fill-gold" : "text-muted"}`}
                />
              </button>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              {quote && quote.price ? (
                <span className={`text-3xl font-bold tracking-tight font-mono text-foreground transition-all duration-300`}>
                  ${formatPrice(quote.price)}
                </span>
              ) : (
                <span className="text-sm text-muted animate-pulse">Loading...</span>
              )}
            </div>
          </div>
          <div className="text-right">
            {account && (
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase text-muted font-bold tracking-wider">Available Cash</span>
                <span className="text-sm font-bold text-emerald-500 font-mono">
                  ${account.buyingPower.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bid / Ask Bar */}
        {quote && (
          <div className="flex gap-3 text-xs font-mono mt-2 bg-background p-2 rounded-lg border border-theme-border shadow-sm">
            <div className="flex-1 text-center border-r border-theme-border">
              <span className="block text-[10px] text-muted font-sans font-bold mb-1">BID</span>
              <span className="text-emerald-500 font-bold text-sm block">{formatPrice(quote.bidPrice)}</span>
              <span className="block text-[9px] text-muted mt-0.5">Vol: {quote.bidSize || 0}</span>
            </div>
            <div className="flex-1 text-center">
              <span className="block text-[10px] text-muted font-sans font-bold mb-1">ASK</span>
              <span className="text-red-400 font-bold text-sm block">{formatPrice(quote.askPrice)}</span>
              <span className="block text-[9px] text-muted mt-0.5">Vol: {quote.askSize || 0}</span>
            </div>
          </div>
        )}
      </div>

      {/* --- Tabs BUY / SELL --- */}
      <div className="flex border-b border-theme-border">
        <button onClick={() => setOrderSide("BUY")} className={`flex-1 py-3 text-sm font-bold transition-all ${isBuy ? "bg-emerald-900/10 text-emerald-500 border-b-2 border-emerald-500" : "text-muted hover:bg-background"}`}>BUY</button>
        <button onClick={() => setOrderSide("SELL")} className={`flex-1 py-3 text-sm font-bold transition-all ${!isBuy ? "bg-red-900/10 text-red-500 border-b-2 border-red-500" : "text-muted hover:bg-background"}`}>SELL</button>
      </div>

      {/* --- Form --- */}
      <div className="p-6 space-y-5 flex-1 overflow-y-auto">

        {/* Input Mode Toggle */}
        <div className="flex bg-background border border-theme-border p-1 rounded-lg">
          <button type="button" onClick={() => setInputMode("COIN")} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${inputMode === "COIN" ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}>Coins</button>
          <button type="button" onClick={() => setInputMode("USD")} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${inputMode === "USD" ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}>USD ($)</button>
        </div>

        {/* Order Type & Time In Force */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Order Type</label>
            <div className="relative">
              <select
                value={orderType}
                disabled={inputMode === "USD"}
                onChange={(e) => setOrderType(e.target.value as any)}
                className={`w-full bg-background border border-theme-border text-foreground text-sm rounded-lg block p-2.5 outline-none font-medium ${inputMode === "USD" ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <option value="MARKET">Market</option>
                <option value="LIMIT">Limit</option>
                <option value="STOP">Stop</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Time In Force</label>
            <div className="relative">
              <select
                value={timeInForce}
                disabled={inputMode === "USD"}
                onChange={(e) => setTimeInForce(e.target.value as any)}
                className={`w-full bg-background border border-theme-border text-foreground text-sm rounded-lg block p-2.5 outline-none font-medium ${inputMode === "USD" ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {/* ✅ เอา IOC, FOK ออก เหลือแค่ GTC, DAY */}
                <option value="GTC">GTC</option>
                <option value="DAY">Day</option>
              </select>
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5">
            {inputMode === "COIN" ? `Quantity (${symbol.split('/')[0]})` : "Amount ($)"}
          </label>
          <input
            type="number" min="0" step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
            placeholder="0.00"
            className="block w-full p-3 pl-4 text-lg text-foreground border border-theme-border rounded-xl bg-background focus:ring-2 focus:ring-gold focus:border-transparent outline-none font-mono"
          />
        </div>

        {/* Limit Price Input */}
        {inputMode === "COIN" && orderType === "LIMIT" && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            <label className="block text-xs font-semibold text-muted mb-1.5">Limit Price</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-muted">$</span>
              <input
                type="number" min="0" step="any"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value === "" ? "" : parseFloat(e.target.value))}
                placeholder="0.00"
                className="block w-full p-3 pl-8 text-sm text-foreground border border-theme-border rounded-xl bg-background focus:ring-2 focus:ring-gold outline-none font-mono"
              />
            </div>
          </div>
        )}

        {/* Stop Price Input */}
        {inputMode === "COIN" && orderType === "STOP" && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            <label className="block text-xs font-semibold text-muted mb-1.5">Stop Price</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-muted">$</span>
              <input
                type="number" min="0" step="any"
                value={stopPrice}
                onChange={(e) => setStopPrice(e.target.value === "" ? "" : parseFloat(e.target.value))}
                placeholder="0.00"
                className="block w-full p-3 pl-8 text-sm text-foreground border border-theme-border rounded-xl bg-background focus:ring-2 focus:ring-gold outline-none font-mono"
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-4">
          {message && (
            <div className={`mb-4 p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
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