import apiClient from '@/src/app/libs/apiClient'; // import จากข้อ 2.4
import { StockBar, BuyStockRequest,AccountInfo} from '@/src/app/types/broker'; // import จากข้อ 2.3

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
  }
};