import apiClient from '@/src/app/libs/apiClient'; // import จากข้อ 2.4
import { StockBar, BuyStockRequest,AccountInfo,Position,StockQuote,UserAccount,getCryptoBars} from '@/src/app/types/broker'; // import จากข้อ 2.3

export const brokerService = {
  
  // 1. ซื้อหุ้น (ตรงกับ @PostMapping("/order/user"))
  buyStock: async (data: BuyStockRequest) => {
    const params: any = {
      accountId: data.accountId,
      symbol: data.symbol,
      OrderSide: data.OrderSide,
      OrderType: data.OrderType,
      TimeInForce: data.TimeInForce,
      limitPrice: data.limitPrice,
      stopPrice: data.stopPrice
    };

    if (data.notional && data.notional > 0) {
      params.notional = data.notional;
      params.type = 'MARKET'; 
      params.tif = 'DAY';
    } else {
      params.qty = data.qty;
    }

    const response = await apiClient.post('/broker/order/user', null, {
      params: params
    });
    return response.data;
  },

  // 2. ดึงกราฟหุ้น (ตรงกับ @GetMapping("/order/stock-bar"))
  getStockBars: async (symbol: string, viewType: string): Promise<StockBar[]> => {
    const response = await apiClient.get('/broker/order/stock-bar', {
      params: {
        symbols: symbol,
        viewType: viewType
      }
    });
    return response.data;
  },

  // 3. ดึงออเดอร์ทั้งหมด
  getAllOrders: async (accountId: string) => {
    const response = await apiClient.get('/broker/order/get/all-order', {
      params: { accountId }
    });
    return response.data;
  },

  getAccountInfo: async (accountId: string) => {                        //ใช้ตอน get แบบ มี value ตามช่อง url 
    const response = await apiClient.get(`/broker/account/${accountId}`);
    return response.data;
  },

  getOpenPositions: async (accountId: string): Promise<Position[]> => {
    // ยิงไปที่ Endpoint ที่เราเพิ่งสร้างใน Java Controller
    const response = await apiClient.get(`/broker/positions/${accountId}`);
    // Map ข้อมูลดิบ (Raw Data) ให้เข้ากับ Interface ที่เราออกแบบ
    return response.data.map((item: any) => ({
      assetId: item.assetId,
      symbol: item.symbol,
      exchange: item.exchange,
      assetClass: item.assetClass,
      assetMarginable: item.assetMarginable,
      
      // 1. แปลง String เป็น Number
      qty: parseFloat(item.qty || "0"),
      avgEntryPrice: parseFloat(item.avgEntryPrice || "0"),
      
      side: item.side,
      marketValue: item.marketValue,
      costBasis: item.costBasis,
      unrealizedPl: item.unrealizedPl,
      
      // 2. แปลงทศนิยมเป็น % (คูณ 100) 
      unrealizedPlpc: (item.unrealizedPlpc || 0) * 100,
      
      unrealizedIntradayPl: item.unrealizedIntradayPl,
      unrealizedIntradayPlpc: (item.unrealizedIntradayPlpc || 0) * 100,
      
      currentPrice: item.currentPrice,
      lastdayPrice: item.lastdayPrice,
      changeToday: (item.changeToday || 0) * 100,
      
      swapRate: item.swapRate,
      avgEntrySwapRate: item.avgEntrySwapRate,
      usd: item.usd
    }));
  },
  getLatestQuote: async (symbol: string) => {
    const response = await apiClient.get('/broker/quote', {
      params: { symbol }
    });
    return response.data;
  },
  cancelOrder: async (accountId: string, orderId: string) => {
    const response = await apiClient.post('/broker/order/cancel', null, {
      params: { accountId, orderId }
    });
    return response.data;
  },

  getAllAccounts: async (): Promise<UserAccount[]> => {
    // ยิง API ไปที่ Endpoint ที่เราสร้างไว้ใน Backend
    const response = await apiClient.get('/broker/admin/users');
    return response.data;
  },

  getCryptoBars: async (symbol: string, viewType: string): Promise<StockBar[]> => {
    // ยิงไปที่ Endpoint ใหม่ /crypto-bar
    const response = await apiClient.get('/broker/order/crypto-bar', {
      params: {
        symbol: symbol,   // ส่งไปตัวเดียว
        viewType: viewType
      }
    });
    return response.data;
  },
  getLatestCryptoQuote: async (symbol: string) => {
    // ยิงไปที่ /broker/quote/crypto ตามที่แก้ใน Backend
    const response = await apiClient.get('/broker/quote/crypto', {
      params: { symbol }
    });
    return response.data; // คืนค่า { symbol, price, askPrice, ... }
  },

  // ✅ 2. เพิ่มฟังก์ชันส่งคำสั่งซื้อขาย Crypto
  createCryptoOrder: async (
    accountId: string, 
    symbol: string, 
    side: "BUY" | "SELL", 
    amount: number, 
    mode: "QTY" | "NOTIONAL", 
    orderType: string,      // เพิ่ม
    timeInForce: string,    // เพิ่ม
    limitPrice?: number,
    stopPrice?: number      // เพิ่ม
  ) => {
    
    const params: any = {
      accountId,
      symbol,
      OrderSide: side,
      OrderType: orderType,   // ส่งค่าไป Backend
      TimeInForce: timeInForce // ส่งค่าไป Backend
    };

    if (mode === "NOTIONAL") {
      params.notional = amount;
      // Notional บังคับเป็น Market Order เสมอ
      params.OrderType = "MARKET"; 
    } else {
      params.qty = amount;
      
      // ใส่ราคาตามประเภทออเดอร์
      if (limitPrice) params.limitPrice = limitPrice;
      if (stopPrice) params.stopPrice = stopPrice;
    }

    const response = await apiClient.post('/broker/orders/crypto', null, {
      params: params
    });
    return response.data;
  },
};