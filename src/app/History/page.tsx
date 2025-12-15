import { brokerService } from "@/src/app/services/brokerService";
import { Order } from "@/src/app/types/broker";

// ฟังก์ชันจัดรูปแบบวันที่ให้ดูง่าย (เช่น 15 Dec 2025, 14:42)
const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ฟังก์ชันจัดรูปแบบเงิน USD
const formatCurrency = (amount: number | null) => {
  if (amount === null || amount === undefined) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
};

// ฟังก์ชันเลือกสีป้าย Status
const getStatusColor = (status: string) => {
  switch (status) {
    case "FILLED":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "CANCELED":
    case "EXPIRED":
      return "bg-gray-100 text-gray-600 border-gray-200";
    case "REJECTED":
    case "FAILED":
      return "bg-red-100 text-red-700 border-red-200";
    case "NEW":
    case "ACCEPTED":
      return "bg-blue-100 text-blue-700 border-blue-200";
    default:
      return "bg-gray-50 text-gray-600 border-gray-200";
  }
};

export default async function HistoryPage() {
  const accountId = "cccc73bb-c37e-4987-b059-075da0dfee8a";
  let orders: Order[] = [];

  try {
    // ดึงข้อมูล Orders จาก Service
    orders = await brokerService.getAllOrders(accountId);
    // เรียงลำดับจากใหม่ไปเก่า (อิงตาม createdAt)
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e) {
    console.error("Failed to fetch orders", e);
    return (
      <div className="p-10 text-center text-red-500">
        ไม่สามารถดึงข้อมูลประวัติการเทรดได้ในขณะนี้
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
          <p className="text-gray-500 mt-1 text-sm">ประวัติคำสั่งซื้อขายย้อนหลัง</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-700">Date/Time</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Symbol</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Side</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 text-right">Filled Qty</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 text-right">Avg Price</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 text-right">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      ยังไม่มีประวัติการทำรายการ
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    // คำนวณมูลค่ารวม: ถ้ามี filledQty และ filledAvgPrice ให้ใช้คูณกัน
                    // ถ้าไม่มี ให้ใช้ notional (กรณีสั่งซื้อเป็นจำนวนเงิน)
                    const totalValue =
                      order.filledQty && order.filledAvgPrice
                        ? order.filledQty * order.filledAvgPrice
                        : order.notional || 0;

                    const isBuy = order.side === "BUY";

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        {/* 1. Date */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">
                            {formatDate(order.submittedAt)}
                          </div>
                          {order.filledAt && order.status === 'FILLED' && (
                             <div className="text-xs text-gray-400 mt-0.5">Filled at {new Date(order.filledAt).toLocaleTimeString()}</div>
                          )}
                        </td>

                        {/* 2. Symbol */}
                        <td className="px-6 py-4">
                          <span className="font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded text-xs tracking-wide">
                            {order.symbol}
                          </span>
                        </td>

                        {/* 3. Side (Buy/Sell) */}
                        <td className="px-6 py-4">
                          <span
                            className={`font-bold text-xs px-2.5 py-1 rounded-full border ${
                              isBuy
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : "bg-red-50 text-red-600 border-red-100"
                            }`}
                          >
                            {order.side}
                          </span>
                          <span className="text-xs text-gray-400 ml-2 uppercase">
                            {order.orderType}
                          </span>
                        </td>

                        {/* 4. Status */}
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </td>

                        {/* 5. Quantity */}
                        <td className="px-6 py-4 text-right font-mono">
                          {order.filledQty > 0 ? (
                            <span className="text-gray-900 font-medium">
                              {new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(order.filledQty)}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>

                        {/* 6. Avg Price */}
                        <td className="px-6 py-4 text-right font-mono">
                          {order.filledAvgPrice ? (
                            <span className="text-gray-900">
                              {formatCurrency(order.filledAvgPrice)}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>

                        {/* 7. Total Value */}
                        <td className="px-6 py-4 text-right font-mono font-bold text-gray-800">
                          {totalValue > 0 ? formatCurrency(totalValue) : "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}