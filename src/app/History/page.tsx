"use client";

import { useEffect, useState } from "react";
import { brokerService } from "@/src/app/services/brokerService";
import { Order } from "@/src/app/types/broker";
import OrderTableClient from "@/src/app/components/features/OrderTableClient";
import { useAuth } from "@/src/context/AuthContext";

export default function HistoryPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.alpacaAccountId) {
        setLoading(false);
        return;
      }

      try {
        const fetchedOrders = await brokerService.getAllOrders(user.alpacaAccountId);
        // เรียงลำดับ ใหม่ -> เก่า
        fetchedOrders.sort(
          (a: Order, b: Order) =>
            new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
        setOrders(fetchedOrders);
      } catch (e) {
        console.error("Failed to fetch orders", e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted animate-pulse">
        Loading History...
      </div>
    );
  }

  if (error || !user?.alpacaAccountId) {
    return (
      <div className="p-10 text-center text-red-500">
        {error ? "Failed to fetch order history. Please try again later." : "Please log in to view execution history."}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10 font-sans transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Order History</h1>
          <p className="text-muted mt-1 text-sm">
            View and manage your past order executions
          </p>
        </div>

        <OrderTableClient orders={orders} accountId={user.alpacaAccountId} />
      </div>
    </div>
  );
}
