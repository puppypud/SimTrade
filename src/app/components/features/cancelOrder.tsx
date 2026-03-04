'use client';

import { useState } from 'react';
import { brokerService } from '@/src/app/services/brokerService';

interface CancelOrderButtonProps {
  accountId: string;
  orderId: string;
  onCancelled?: () => void;
}

export default function CancelOrderButton({ accountId, orderId, onCancelled }: CancelOrderButtonProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const confirmCancel = async () => {
    setShowConfirm(false);
    setIsCancelling(true);
    try {
      await brokerService.cancelOrder(accountId, orderId);
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsDone(true);
      if (onCancelled) onCancelled();
    } catch (error: any) {
      console.error('Failed to cancel order:', error);
    } finally {
      setIsCancelling(false);
    }
  };

  // ยกเลิกสำเร็จแล้ว → ซ่อนปุ่ม
  if (isDone) return null;

  return (
    <>
      <button
        onClick={handleCancelClick}
        disabled={isCancelling}
        className={`
          group relative flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg
          text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-300
          border shadow-sm active:scale-95
          ${isCancelling
            ? 'bg-muted/10 text-muted/40 border-theme-border cursor-not-allowed'
            : 'bg-surface text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white hover:border-red-500 hover:shadow-red-500/20'
          }
        `}
      >
        {isCancelling ? (
          <div className="w-3.5 h-3.5 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
        ) : (
          <svg
            className="w-3.5 h-3.5 transition-transform group-hover:rotate-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )}
        <span>{isCancelling ? 'Processing' : 'Cancel'}</span>
      </button>

      {/* Custom Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-theme-border w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-foreground mb-2 uppercase tracking-tight">Cancel Order?</h3>
              <p className="text-muted text-sm mb-8 leading-relaxed">
                This action cannot be undone. Are you sure you want to cancel this order?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-6 py-3.5 rounded-xl bg-background text-foreground font-bold text-sm hover:bg-muted/10 transition-colors border border-theme-border"
                >
                  Go Back
                </button>
                <button
                  onClick={confirmCancel}
                  className="px-6 py-3.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all shadow-lg shadow-red-500/25 active:scale-95"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}