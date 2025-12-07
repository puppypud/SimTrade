import apiClient from '@/src/app/libs/apiClient'; // import จากข้อ 2.4
import { StockBar, BuyStockRequest,AccountInfo} from '@/src/app/types/broker'; // import จากข้อ 2.3

export const brokerService = {
  // 1. ซื้อหุ้น (ตรงกับ @PostMapping("/order/user"))
  buyStock: async (data: BuyStockRequest) => {
    // เนื่องจาก Backend รับเป็น @RequestParam (Query Param) ไม่ใช่ JSON Body
    // เราต้องส่งเป็น params หรือ FormData (แต่ดูจาก Java โค้ดน่าจะเป็น Query Param)
    const response = await apiClient.post('/broker/order/user', null, {
      params: {
        accountId: data.accountId,
        symbol: data.symbol,
        qty: data.qty,
        OrderSide: data.OrderSide,
        OrderType: data.OrderType,
        TimeInForce: data.TimeInForce
      }
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