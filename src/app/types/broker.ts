// src/types/broker.ts

// ตรงกับ StockBar ใน Java
export interface StockBar {
  t: string; // Timestamp (ISO String)
  o: number; // Open
  h: number; // High
  l: number; // Low
  c: number; // Close
  v: number; // Volume
}

// สำหรับ Request ซื้อหุ้น
export interface BuyStockRequest {     //กลับมาแก้ OrderSide OrderType TimeInForce ที่หลัง 
  accountId: string;
  symbol: string;
  qty: number;
  OrderSide: 'BUY' | 'SELL';
  OrderType: 'MARKET' | 'LIMIT';
  TimeInForce: 'DAY' | 'GTC';
}

// สำหรับ Response (ถ้ามี)
export interface OrderResponse {
  id: string;
  status: string;
  // ... field อื่นๆ ตามที่ Backend ส่งมา
}