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

export interface getCryptoBars {
  t: string; // Timestamp (ISO String)
  o: number; // Open
  h: number; // High
  l: number; // Low
  c: number; // Close
  v: number; // Volume
}

// สำหรับ Request ซื้อหุ้น
export interface BuyStockRequest {
  accountId: string;
  email: string;
  symbol: string;
  qty?: number;
  notional?: number;
  OrderSide: 'BUY' | 'SELL';
  OrderType: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT' | 'TRAILING_STOP';
  TimeInForce: 'DAY' | 'GTC' | 'IOC' | 'FOK';
  limitPrice?: number;
  stopPrice?: number;
}


export interface Order {
  id: string;
  clientOrderId?: string;
  createdAt?: string;
  updatedAt?: string;
  submittedAt: string;
  filledAt: string | null;
  assetId?: string;
  symbol: string;
  assetClass?: string;
  notional: number | null;
  qty: number | null;
  filledQty: number | string;
  filledAvgPrice: number | string | null;
  orderClass?: string | null;
  orderType: string; // MARKET, LIMIT
  type?: string;
  side: string; // BUY, SELL
  timeInForce?: string;
  limitPrice: number | string | null;
  stopPrice?: number | string | null;
  status: string; // FILLED, CANCELED, etc.
  extendedHours?: boolean;
  commission?: number | string;
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
export interface StockQuote {
  symbol: string;
  price: number;        // Last Trade Price (ราคาซื้อขายล่าสุด)
  tradeTime: string;
  askPrice: number;     // ราคาขาย (Ask)
  askSize: number;
  bidPrice: number;     // ราคาซื้อ (Bid)
  bidSize: number;
  openPrice?: number;   // ราคาเปิดวัน (Optional)
  prevClose?: number;   // ราคาปิดวันก่อนหน้า
}
export interface cancelorder {
  orderId: string;
}

export interface UserAccount {
  id: string;
  accountNumber: string;
  status: string;
  currency: string;
  lastEquity: number;
  createdAt: string;

  contact: {
    emailAddress: string;
    phoneNumber: string;
    streetAddress: string[];
    city: string;
    state: string;
    postalCode: string;
  };

  identity: {
    givenName: string;
    familyName: string;
    dateOfBirth: string;
    countryOfCitizenship: string;
  };
}

// ------------------------------------------------------------------
// Types added mapping to backend DTOs for unimplemented features
// ------------------------------------------------------------------

export interface CreateAccountRequest {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface RegisterRequest {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface OnboardingRequest {
  email: string;
  riskBehavior: string;
  traderType: string;
}

export interface StockSearchDto {
  symbol: string;
  name: string;
  exchange: string;
}

export interface StockInfoDatabaseDTO {
  symbol: string;
  name: string;
  beta: number;
  marketCap: number;
  volume: number;
  category: string;
  industry: string;
}

// Matches the backend UserAccount entity in com.alpaca.web.entity.UserAccount
export interface LocalUserAccount {
  id: number;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  accountNumber: string;
  phoneNumber: string;
  status: string;
  alpacaAccountId: string;
  createdAt: string;
}

export interface RegisterRequest {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;

}

export interface MarketStatus {
  isOpen: boolean;
  marketType: string;
  nextOpen: string;
  nextClose: string;
  isMaintenanceMode: boolean;
  maintenanceMessage?: string;
}

export interface AdminActionResponse {
  success: boolean;
  message: string;
}

export interface UserAnalyticsResult {
  traderType: string;         // ประเภทนักเทรด เช่น Scalper, Day Trader
  totalClosedTrades: number;  // จำนวนไม้ที่เทรดจบแล้ว
  primaryFeedback: string;    // สรุปผลลัพธ์สั้นๆ (หัวข้อ)
  recommendation: string;     // คำแนะนำแบบยาว
  winRate: number;            // อัตราการชนะ (%)
  totalRealizedPnL: number;   // กำไร/ขาดทุนสุทธิรวม (%)
  averageWinPct: number;      // กำไรเฉลี่ยต่อไม้ที่ชนะ (%)
  averageLossPct: number;     // ขาดทุนเฉลี่ยต่อไม้ที่แพ้ (%)
  riskRewardRatio: number;    // สัดส่วน Risk:Reward
  styleMatched: boolean;      // True = เล่นหุ้นถูกประเภทสายเทรด
  profitable: boolean;        // True = ภาพรวมมีกำไร
}
