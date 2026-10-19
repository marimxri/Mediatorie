import React, { useState, useEffect } from 'react';
import { Gift } from '../types';
import { Edit3, X } from 'lucide-react';

interface EditStockModalProps {
  isOpen: boolean;
  gift?: Gift;
  onClose: () => void;
  onSubmit: (
    giftId: string,
    newStock: number,
    newDescription?: string,
    newName?: string,
    newMinStock?: number,
    newInitialStock?: number
  ) => void;
}

export const EditStockModal: React.FC<EditStockModalProps> = ({
  isOpen,
  gift,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [stock, setStock] = useState(0);
  const [initialStock, setInitialStock] = useState(0);
  const [minStock, setMinStock] = useState(3);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (gift) {
      setName(gift.name);
      setStock(gift.stock);
      setInitialStock(gift.initialStock ?? gift.stock);
      setMinStock(gift.minStock ?? 3);
      setDescription(gift.description || '');
    }
  }, [gift]);

  if (!isOpen || !gift) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(
      gift.id,
      stock,
      description.trim() || undefined,
      name.trim(),
      minStock,
      initialStock
    );
  };

  return (
    <div className="fixed inset-0 bg-brand-charcoal/60 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full card-shadow overflow-hidden border border-stone-100 max-h-[90vh] flex flex-col">
        <div className="bg-brand-forest p-4 text-white flex justify-between items-center shrink-0">
          <h3 className="font-bold text-xs sm:text-sm flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-brand-lime" />
            <span>Editar Brinde e Estoque</span>
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white cursor-pointer p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-bold text-brand-charcoal mb-1">
              Nome do Brinde *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Coração Anti-estresse"
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-bold text-brand-charcoal focus:ring-2 focus:ring-brand-greenMid focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-charcoal mb-1">
              Descrição / Finalidade do Brinde
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Finalidade do brinde, evento, etc."
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-brand-greenMid focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-brand-charcoal mb-1">
                Estoque Inicial
              </label>
              <input
                type="number"
                min="0"
                required
                value={initialStock}
                onChange={(e) => setInitialStock(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-2.5 py-2 rounded-xl border border-stone-300 text-sm font-bold text-brand-charcoal focus:ring-2 focus:ring-brand-greenMid focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-brand-charcoal mb-1">
                Saldo Atual *
              </label>
              <input
                type="number"
                min="0"
                required
                value={stock}
                onChange={(e) => setStock(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-2.5 py-2 rounded-xl border border-stone-300 text-sm font-black text-brand-charcoal focus:ring-2 focus:ring-brand-greenMid focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-brand-charcoal mb-1">
                Estoque Mín.
              </label>
              <input
                type="number"
                min="0"
                required
                value={minStock}
                onChange={(e) => setMinStock(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-2.5 py-2 rounded-xl border border-stone-300 text-sm font-bold text-brand-charcoal focus:ring-2 focus:ring-brand-greenMid focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-brand-greyMid hover:bg-stone-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-extrabold bg-brand-forest hover:bg-brand-greenMid text-white shadow-md cursor-pointer"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
