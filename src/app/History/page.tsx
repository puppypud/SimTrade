import { brokerService } from "@/src/app/services/brokerService";
import { Order } from "@/src/app/types/broker";
import OrderTableClient from "@/src/app/components/features/OrderTableClient";

export default async function HistoryPage() {
  const accountId = "9d35fa1a-d10b-484c-abd5-6501dfee1ded";
  let orders: Order[] = [];

  try {
    orders = await brokerService.getAllOrders(accountId);
    // เรียงลำดับ ใหม่ -> เก่า
    orders.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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
          <p className="text-gray-500 mt-1 text-sm">
            ประวัติคำสั่งซื้อขายย้อนหลัง
          </p>
        </div>

        <OrderTableClient orders={orders} accountId={accountId} />

      </div>
    </div>
  );
}
