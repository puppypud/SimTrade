import apiClient from '@/src/app/libs/apiClient'; // import จากข้อ 2.4
import { StockBar, BuyStockRequest,AccountInfo,Position} from '@/src/app/types/broker'; // import จากข้อ 2.3

export const brokerService = {
  
  // 1. ซื้อหุ้น (ตรงกับ @PostMapping("/order/user"))
  buyStock: async (data: BuyStockRequest) => {
    const params: any = {
      accountId: data.accountId,
      symbol: data.symbol,
      OrderSide: data.OrderSide,
      OrderType: data.OrderType,
      TimeInForce: data.TimeInForce
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
      
      // 2. แปลงทศนิยมเป็น % (คูณ 100) รอไว้เลย
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
  }

};