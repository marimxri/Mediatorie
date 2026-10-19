import React from 'react';
import { TabType } from '../types';
import { PlusCircle, Store, TableProperties, Boxes } from 'lucide-react';
import { MediatorieLogo } from './MediatorieLogo';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenWithdrawal: () => void;
  onResetDefaults?: () => void;
  dbConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenWithdrawal,
  dbConnected,
}) => {
  return (
    <header className="bg-white border-b border-stone-200/80 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
          
          {/* Logo & Company Title */}
          <div className="flex items-center gap-2 sm:gap-4">
            <MediatorieLogo size="md" />
            <div className="hidden sm:block h-8 w-px bg-stone-200" />
            <div className="flex flex-col">
              <span className="bg-brand-forest/10 text-brand-forest font-black text-[9px] sm:text-[11px] px-2 sm:px-2.5 py-0.5 rounded-full border border-brand-forest/20 uppercase w-fit">
                Estoque Brindes 2026
              </span>
              <p className="hidden md:block text-[11px] font-medium text-stone-500 mt-0.5">
                Controle e Pedidos de Retirada
              </p>
            </div>
          </div>

          {/* Status Indicator & Top Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="flex items-center gap-1.5 bg-stone-100/80 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold text-brand-greyMid border border-stone-200">
              <span
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${
                  dbConnected ? 'bg-brand-lime animate-pulse' : 'bg-amber-500'
                }`}
              ></span>
              <span className="hidden xs:inline">{dbConnected ? 'Sincronizado' : 'Modo Local'}</span>
            </div>

            <button
              onClick={onOpenWithdrawal}
              className="bg-brand-lime hover:bg-brand-greenMid text-brand-charcoal hover:text-white font-extrabold text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 sm:gap-2 border border-brand-greenMid/20 cursor-pointer active:scale-95 touch-manipulation min-h-[40px] sm:min-h-[44px]"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Solicitar</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1.5 sm:gap-2 py-2 sm:py-3 overflow-x-auto custom-scrollbar border-t border-stone-100 -mx-3 sm:mx-0 px-3 sm:px-0">
          <button
            onClick={() => setActiveTab('vitrine')}
            className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer shrink-0 min-h-[40px] sm:min-h-[44px] ${
              activeTab === 'vitrine'
                ? 'bg-brand-forest text-white font-extrabold shadow-md'
                : 'bg-stone-50 hover:bg-stone-100 text-brand-greyMid font-bold border border-stone-200/70'
            }`}
          >
            <Store className={`w-4 h-4 ${activeTab === 'vitrine' ? 'text-brand-lime' : 'text-brand-greyMid'}`} />
            <span>1. Catálogo</span>
          </button>

          <button
            onClick={() => setActiveTab('planilha')}
            className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer shrink-0 min-h-[40px] sm:min-h-[44px] ${
              activeTab === 'planilha'
                ? 'bg-brand-forest text-white font-extrabold shadow-md'
                : 'bg-stone-50 hover:bg-stone-100 text-brand-greyMid font-bold border border-stone-200/70'
            }`}
          >
            <TableProperties className={`w-4 h-4 ${activeTab === 'planilha' ? 'text-brand-lime' : 'text-brand-forest'}`} />
            <span>2. Planilha Retiradas</span>
          </button>

          <button
            onClick={() => setActiveTab('gestao')}
            className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer shrink-0 min-h-[40px] sm:min-h-[44px] ${
              activeTab === 'gestao'
                ? 'bg-brand-forest text-white font-extrabold shadow-md'
                : 'bg-stone-50 hover:bg-stone-100 text-brand-greyMid font-bold border border-stone-200/70'
            }`}
          >
            <Boxes className={`w-4 h-4 ${activeTab === 'gestao' ? 'text-brand-lime' : 'text-brand-charcoal'}`} />
            <span>3. Gestão e Reposição</span>
          </button>
        </div>
      </div>
    </header>
  );
};
