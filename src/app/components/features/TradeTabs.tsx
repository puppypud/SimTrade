// src/app/components/features/TradeTabs.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { brokerService } from '@/src/app/services/brokerService';
import { BuyStockRequest, AccountInfo } from '@/src/app/types/broker';

interface TradeTabsProps {
  symbol: string;
}

// ควรดึงจาก Context หรือ Env ในการใช้งานจริง
const HARDCODED_ACCOUNT_ID = 'cccc73bb-c37e-4987-b059-075da0dfee8a';

export default function TradeTabs({ symbol }: TradeTabsProps) {
  // State ตาม Interface BuyStockRequest
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<BuyStockRequest['OrderType']>('MARKET');
  const [timeInForce, setTimeInForce] = useState<BuyStockRequest['TimeInForce']>('DAY');
  const [qty, setQty] = useState<number | ''>('');
  
  // State เพิ่มเติมสำหรับ UI (ราคา Limit/Stop) 
  // *หมายเหตุ: แม้ Interface หลักอาจจะยังไม่มี field ราคา แต่ในทางปฏิบัติ Limit Order ต้องใช้
  // ตรงนี้ใส่ไว้ใน State เพื่อรองรับการขยายผลในอนาคต หรือส่งไปกับ params แบบ any ได้ถ้า Service รองรับ
  const [price, setPrice] = useState<number | ''>(''); 

  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  // Reset เมื่อเปลี่ยน Symbol
  useEffect(() => {
    setMessage(null);
    setQty('');
    setPrice('');
  }, [symbol]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qty || Number(qty) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid quantity.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // เตรียม Payload ให้ครบถ้วนตาม Interface
      const payload: BuyStockRequest = {
        accountId: HARDCODED_ACCOUNT_ID,
        symbol: symbol,
        qty: Number(qty),
        OrderSide: orderSide,
        OrderType: orderType,
        TimeInForce: timeInForce,
        // หมายเหตุ: หาก Backend ต้องการ price สำหรับ Limit Order อาจต้องแก้ Interface หรือ brokerService เพิ่มเติม
        // notional: ... (ใส่ logic เพิ่มได้ถ้าต้องการเทรดเป็นจำนวนเงิน)
      };

      await brokerService.buyStock(payload);

      setMessage({ type: 'success', text: 'Order placed successfully!' });
      setQty(''); // Reset
      
      // Refresh Account Data
      const updatedAccount = await brokerService.getAccountInfo(HARDCODED_ACCOUNT_ID);
      setAccount(updatedAccount);

    } catch (error: any) {
      console.error(error);
      setMessage({ 
        type: 'error', 
        text: error?.response?.data?.message || 'Failed to place order.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const isBuy = orderSide === 'BUY';
  const themeColor = isBuy ? 'emerald' : 'red';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
      
      {/* Header: Symbol & Price Info */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">{symbol}</h2>
          <span className="text-xs font-medium text-gray-400">USD MARKET</span>
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
          onClick={() => setOrderSide('BUY')}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${
            isBuy 
              ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600' 
              : 'text-gray-400 hover:bg-gray-50'
          }`}
        >
          BUY
        </button>
        <button
          onClick={() => setOrderSide('SELL')}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${
            !isBuy 
              ? 'bg-red-50 text-red-700 border-b-2 border-red-600' 
              : 'text-gray-400 hover:bg-gray-50'
          }`}
        >
          SELL
        </button>
      </div>

      {/* Form Area */}
      <div className="p-6 space-y-5">
        
        {/* Order Type & TIF Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Order Type</label>
            <div className="relative">
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as BuyStockRequest['OrderType'])}
                className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent block w-full p-2.5 outline-none appearance-none font-medium"
              >
                <option value="MARKET">Market</option>
                <option value="LIMIT">Limit</option>
                <option value="STOP">Stop</option>
                <option value="STOP_LIMIT">Stop Limit</option>
                <option value="TRAILING_STOP">Trailing Stop</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Time In Force</label>
            <div className="relative">
              <select
                value={timeInForce}
                onChange={(e) => setTimeInForce(e.target.value as BuyStockRequest['TimeInForce'])}
                className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent block w-full p-2.5 outline-none appearance-none font-medium"
              >
                <option value="DAY">Day</option>
                <option value="GTC">GTC</option>
                <option value="IOC">IOC</option>
                <option value="FOK">FOK</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quantity Input */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Quantity (Shares)</label>
          <div className="relative">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={qty}
              onChange={(e) => setQty(e.target.value === '' ? '' : parseFloat(e.target.value))}
              placeholder="0"
              className="block w-full p-3 pl-4 text-sm text-gray-900 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <span className="text-gray-400 text-xs font-bold">QTY</span>
            </div>
          </div>
        </div>

        {/* Optional: Limit Price Input (แสดงเมื่อเป็น Limit หรือ Stop Limit) */}
        {(orderType === 'LIMIT' || orderType === 'STOP_LIMIT') && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Limit Price</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <span className="text-gray-500 font-bold">$</span>
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="0.00"
                className="block w-full p-3 pl-8 text-sm text-gray-900 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
              />
            </div>
          </div>
        )}

        {/* Submit Section */}
        <div className="pt-2">
          {message && (
            <div className={`mb-3 p-3 rounded-md text-xs font-medium ${
              message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !symbol}
            className={`w-full text-white font-bold rounded-xl text-sm px-5 py-3.5 text-center shadow-md transition-all transform active:scale-[0.98] duration-200
              ${loading ? 'bg-gray-400 cursor-not-allowed' : 
                isBuy ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'
              }
            `}
          >
            {loading ? 'Processing...' : `${orderSide} ${symbol}`}
          </button>
        </div>

      </div>
    </div>
  );
}