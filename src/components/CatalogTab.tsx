import React, { useState } from 'react';
import { Gift, CatalogFilter } from '../types';
import { IconHelper } from './IconHelper';
import { Search, HeartHandshake, Box } from 'lucide-react';
import { isLowStockWarningGift } from './WithdrawalModal';

interface CatalogTabProps {
  gifts: Gift[];
  onOpenWithdrawalForGift: (giftId: string) => void;
}

export const CatalogTab: React.FC<CatalogTabProps> = ({ gifts, onOpenWithdrawalForGift }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CatalogFilter>('all');

  const filteredGifts = gifts
    .filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      if (filter === 'available') return item.stock > 0;
      if (filter === 'low') return item.stock > 0 && item.stock <= item.minStock;
      if (filter === 'empty') return item.stock <= 0;
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Search & Filters */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200/80 card-shadow flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-brand-greyLight" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar brinde no estoque..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-50 text-xs sm:text-sm border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-greenMid font-medium min-h-[44px]"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-none">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs cursor-pointer transition shrink-0 min-h-[38px] ${
              filter === 'all'
                ? 'bg-brand-forest text-white font-black'
                : 'bg-stone-100 hover:bg-stone-200 text-brand-greyMid font-bold'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('available')}
            className={`px-3.5 py-2 rounded-xl text-xs cursor-pointer transition shrink-0 min-h-[38px] ${
              filter === 'available'
                ? 'bg-brand-forest text-white font-black'
                : 'bg-stone-100 hover:bg-stone-200 text-brand-greyMid font-bold'
            }`}
          >
            Com Estoque
          </button>
          <button
            onClick={() => setFilter('low')}
            className={`px-3.5 py-2 rounded-xl text-xs cursor-pointer transition shrink-0 min-h-[38px] ${
              filter === 'low'
                ? 'bg-brand-forest text-white font-black'
                : 'bg-stone-100 hover:bg-stone-200 text-brand-greyMid font-bold'
            }`}
          >
            Estoque Baixo
          </button>
          <button
            onClick={() => setFilter('empty')}
            className={`px-3.5 py-2 rounded-xl text-xs cursor-pointer transition shrink-0 min-h-[38px] ${
              filter === 'empty'
                ? 'bg-brand-forest text-white font-black'
                : 'bg-stone-100 hover:bg-stone-200 text-brand-greyMid font-bold'
            }`}
          >
            Esgotados
          </button>
        </div>
      </div>

      {/* Catalog Cards Grid */}
      {filteredGifts.length === 0 ? (
        <div className="py-12 text-center text-brand-greyLight bg-white rounded-3xl border border-stone-200">
          <Box className="w-12 h-12 mx-auto mb-2 text-stone-300" />
          <p className="text-xs font-bold">Nenhum brinde encontrado para este filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredGifts.map((item) => {
            const isOutOfStock = item.stock <= 0;
            const isLowStock = (item.stock > 0 && item.stock <= item.minStock) || (item.stock > 0 && isLowStockWarningGift(item.name));

            let badgeClass = 'bg-brand-lime/20 text-brand-forest border-brand-lime/40';
            let statusLabel = 'OK';
            let progressColor = 'bg-brand-lime';

            if (isOutOfStock) {
              badgeClass = 'bg-red-100 text-red-700 border-red-200';
              statusLabel = 'Esgotado';
              progressColor = 'bg-red-500';
            } else if (isLowStock) {
              badgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
              statusLabel = 'Poucas un.';
              progressColor = 'bg-amber-500';
            }

            const initialQty = item.initialStock && item.initialStock > 0 ? item.initialStock : Math.max(item.stock, 1);
            const percent = Math.min(Math.round((item.stock / initialQty) * 100), 100);

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-stone-200/90 p-5 card-shadow card-shadow-hover transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand-lime/20 text-brand-forest flex items-center justify-center text-xl font-black border border-brand-lime/30">
                      <IconHelper iconName={item.icon} className="w-6 h-6" />
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${badgeClass}`}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-brand-charcoal text-base leading-tight mb-1 group-hover:text-brand-forest transition">
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="text-xs text-stone-500 font-normal line-clamp-2 mt-1 mb-2">
                      {item.description}
                    </p>
                  )}

                  <div className="flex items-baseline gap-1.5 my-3">
                    <span
                      className={`text-3xl font-black ${
                        isOutOfStock ? 'text-red-500' : 'text-brand-charcoal'
                      }`}
                    >
                      {item.stock}
                    </span>
                    <span className="text-xs font-bold text-brand-greyLight">
                      unidades em estoque
                    </span>
                  </div>

                  <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden mb-4">
                    <div
                      className={`${progressColor} h-full transition-all duration-500`}
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>

                <button
                  onClick={() => onOpenWithdrawalForGift(item.id)}
                  disabled={isOutOfStock}
                  className={`w-full py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isOutOfStock
                      ? 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200'
                      : 'bg-brand-lime hover:bg-brand-greenMid text-brand-charcoal hover:text-white shadow-xs'
                  }`}
                >
                  <HeartHandshake className="w-4 h-4" />
                  <span>{isOutOfStock ? 'Esgotado' : 'Solicitar / Retirar'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
