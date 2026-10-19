import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-brand-charcoal/60 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full card-shadow p-5 sm:p-6 text-center space-y-4 border border-stone-100">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-xl">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-extrabold text-brand-charcoal text-base">{title}</h3>
          <p className="text-xs text-brand-greyMid mt-1">{message}</p>
        </div>
        <div className="flex justify-center gap-2.5 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-brand-greyMid bg-stone-100 hover:bg-stone-200 cursor-pointer min-h-[42px] touch-manipulation"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md cursor-pointer min-h-[42px] touch-manipulation"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};
