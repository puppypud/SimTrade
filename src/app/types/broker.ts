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
  qty?: number;
  notional?: number;
  OrderSide: 'BUY' | 'SELL' ;
  OrderType: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT' | 'TRAILING_STOP';
  TimeInForce: 'DAY' | 'GTC' | 'IOC' | 'FOK';
}

// สำหรับ Response (ถ้ามี)
export interface OrderResponse {
  id: string;
  status: string;
  // ... field อื่นๆ ตามที่ Backend ส่งมา
}
 
export interface AccountInfo {
  id: string;
  accountNumber: string;
  status: string;
  currency: string;
  buyingPower: number;          // อำนาจซื้อ
  cash: number;                 // เงินสด
  portfolioValue: number;       // มูลค่าพอร์ตรวม
  equity: number;               // มูลค่าสินทรัพย์สุทธิ (มักเท่ากับ portfolioValue)
  lastEquity: number;           // มูลค่าเมื่อปิดตลาดวันก่อน (เอาไว้เทียบกำไรวันนี้)
  longMarketValue: number;      // มูลค่าหุ้นขาขึ้นที่ถืออยู่
  daytradeCount: number;        // จำนวนครั้งที่เทรดจบในวัน
  createdAt: string;
}
export interface Position {
assetId: string;
  symbol: string;
  exchange: string;
  assetClass: string;
  assetMarginable: boolean;
  
  // แปลงจาก string -> number เพื่อให้ UI คำนวณง่าย
  avgEntryPrice: number;    
  qty: number;              
  
  side: string;             
  marketValue: number;
  costBasis: number;        
  
  unrealizedPl: number;     
  unrealizedPlpc: number;   // ค่า % ที่คูณ 100 แล้ว
  
  unrealizedIntradayPl: number;
  unrealizedIntradayPlpc: number;
  
  currentPrice: number;
  lastdayPrice: number;
  changeToday: number;      // ค่า % ที่คูณ 100 แล้ว
  
  // field ที่ไม่แน่ใจ ใส่ any หรือ optional ไว้ก่อนได้ ไม่รกครับ
  swapRate?: number;
  avgEntrySwapRate?: number;
  usd?: any;
}
