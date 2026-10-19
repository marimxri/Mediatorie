import React, { useState } from 'react';
import { PlusCircle, X } from 'lucide-react';

interface AddGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, stock: number, minStock: number, icon: string, description?: string) => void;
}

export const AddGiftModal: React.FC<AddGiftModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stock, setStock] = useState(10);
  const [minStock, setMinStock] = useState(3);
  const [icon, setIcon] = useState('fa-gift');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), stock, minStock, icon, description.trim() || undefined);
    setName('');
    setDescription('');
    setStock(10);
    setMinStock(3);
    setIcon('fa-gift');
  };

  return (
    <div className="fixed inset-0 bg-brand-charcoal/60 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-md w-full card-shadow overflow-hidden border border-stone-100 max-h-[90vh] flex flex-col">
        <div className="bg-brand-charcoal p-4 text-white flex justify-between items-center border-b border-brand-greyMid shrink-0">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-brand-lime" />
            <span>Cadastrar Novo Brinde</span>
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-white cursor-pointer p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-bold text-brand-charcoal mb-1">Nome do Brinde *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Copo Térmico"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-brand-greenMid focus:outline-none"
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
              placeholder="Ex: Brinde exclusivo para eventos VIP, onboarding de novos colaboradores, etc."
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-brand-greenMid focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-brand-charcoal mb-1">Quantidade Inicial *</label>
              <input
                type="number"
                min="0"
                required
                value={stock}
                onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-brand-greenMid focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-charcoal mb-1">Mínimo para Alerta</label>
              <input
                type="number"
                min="1"
                value={minStock}
                onChange={(e) => setMinStock(parseInt(e.target.value) || 1)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-brand-greenMid focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-charcoal mb-1">Ícone Ilustrativo</label>
            <select
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-brand-greenMid focus:outline-none cursor-pointer"
            >
              <option value="fa-gift">🎁 Presente / Genérico</option>
              <option value="fa-bottle-water">🥤 Garrafa / Copo</option>
              <option value="fa-book">📖 Agenda / Caderno</option>
              <option value="fa-mobile-screen-button">📱 Porta Celular / Suporte</option>
              <option value="fa-computer-mouse">🖱️ Mousepad</option>
              <option value="fa-pen-nib">🖊️ Caneta / Lápis</option>
              <option value="fa-umbrella">☔ Guarda-Chuva / Guarda-Sol</option>
              <option value="fa-note-sticky">📝 Bloquinho</option>
              <option value="fa-circle-dot">🔘 Pop Socket / Suporte</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-brand-greyMid hover:bg-stone-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-forest hover:bg-brand-greenMid text-white shadow-md cursor-pointer"
            >
              Salvar Brinde
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
