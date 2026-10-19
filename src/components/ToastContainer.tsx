import React from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        const bgClass = isSuccess
          ? 'bg-brand-forest text-white border-brand-lime'
          : isError
          ? 'bg-red-600 text-white border-red-800'
          : 'bg-brand-charcoal text-white border-stone-400';

        return (
          <div
            key={toast.id}
            className={`p-4 rounded-2xl shadow-2xl border-l-4 ${bgClass} font-extrabold text-xs flex items-center gap-3 transition-all duration-300 min-w-[300px] pointer-events-auto animate-in slide-in-from-bottom-3 duration-200`}
          >
            {isSuccess && <CheckCircle2 className="w-5 h-5 text-brand-lime shrink-0" />}
            {isError && <AlertCircle className="w-5 h-5 text-amber-300 shrink-0" />}
            {!isSuccess && !isError && <Info className="w-5 h-5 text-brand-lime shrink-0" />}
            <span>{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
};
