'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { brokerService } from '@/src/app/services/brokerService';

interface CancelOrderButtonProps {
  accountId: string;
  orderId: string;
}

export default function CancelOrderButton({ accountId, orderId }: CancelOrderButtonProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const router = useRouter();

  const handleCancel = async () => {
    // ใช้ confirm box แบบมาตรฐาน หรือจะเปลี่ยนเป็น Modal สวยๆ ในอนาคตก็ได้
    if (!confirm('Confirm to cancel this order?')) return;

    setIsCancelling(true);
    try {
      await brokerService.cancelOrder(accountId, orderId);
      // รอสักนิดเพื่อให้ Server อัปเดตสถานะทัน
      await new Promise(resolve => setTimeout(resolve, 500)); 
      router.refresh();
    } catch (error: any) {
      alert('Failed to cancel: ' + (error.response?.data || error.message));
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <button
      onClick={handleCancel}
      disabled={isCancelling}
      className={`
        group relative flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg
        text-xs font-bold uppercase tracking-wider transition-all duration-200
        border shadow-sm
        ${isCancelling 
          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
          : 'bg-white text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700 hover:shadow-md active:scale-95'
        }
      `}
    >
      {isCancelling ? (
        // Loading Spinner Icon
        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        // Trash Icon
        <svg 
          className="w-3.5 h-3.5 transition-transform group-hover:scale-110" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )}
      
      <span>{isCancelling ? 'Processing' : 'Cancel'}</span>
    </button>
  );
}