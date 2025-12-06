import { brokerService } from '@/src/app/services/brokerService';

// Server Component โดย default ไม่ต้องใส่ 'use client'
export default async function DashboardPage() {
  // เรียก API ตรงนี้เลย (ทำงานฝั่ง Server ของ Next.js)
  // หมายเหตุ: ถ้าใช้ axios ใน server component บางทีอาจต้อง config เพิ่มเรื่อง base url ให้ชัดเจน
  // หรือใช้ fetch ธรรมดาก็ได้ แต่ถ้าใช้ service ที่เราทำไว้ก็ใช้ได้ครับ
  
  let orders = [];
  try {
      // ตัวอย่าง accountId
      orders = await brokerService.getAllOrders('cccc73bb-c37e-4987-b059-075da0dfee8a');
  } catch (e) {
      console.error("Fetch error");
  }

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold">Order History</h1>
      <ul>
        {orders.map((order: any) => (
          <li key={order.id} className="border-b p-2">
            {order.symbol} - {order.qty} shares - Status: {order.status}
          </li>
        ))}
      </ul>
    </div>
  );
}