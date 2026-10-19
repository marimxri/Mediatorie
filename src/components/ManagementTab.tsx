import React, { useRef, useMemo } from 'react';
import { Gift, WithdrawalLog } from '../types';
import { IconHelper } from './IconHelper';
import { 
  Sliders, 
  Plus, 
  Upload, 
  Download, 
  Trash2, 
  Edit, 
  Lock, 
  KeyRound, 
  ShieldCheck 
} from 'lucide-react';

interface ManagementTabProps {
  gifts: Gift[];
  history?: WithdrawalLog[];
  onOpenAddGift: () => void;
  onOpenEditStock: (giftId: string) => void;
  onDeleteGift: (giftId: string) => void;
  onImportGiftsCSV: (importedGifts: Gift[]) => void;
  onLockManagement?: () => void;
  onOpenChangePassword?: () => void;
}

export const ManagementTab: React.FC<ManagementTabProps> = ({
  gifts,
  history = [],
  onOpenAddGift,
  onOpenEditStock,
  onDeleteGift,
  onImportGiftsCSV,
  onLockManagement,
  onOpenChangePassword,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sortedGifts = useMemo(() => {
    return [...gifts].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [gifts]);

  const handleExportGiftsCSV = () => {
    let csv = '\uFEFFBrinde;Descrição / Finalidade;Estoque Inicial;Saldo Atual;Mínimo para Alerta;Ícone\n';
    sortedGifts.forEach((g) => {
      const initial = g.initialStock ?? g.stock;
      csv += `"${g.name}";"${g.description || ''}";"${initial}";"${g.stock}";"${g.minStock}";"${g.icon || 'fa-gift'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'Tabela_Gestao_Estoque_Brindes.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
      if (lines.length === 0) return;

      const firstLine = lines[0];
      const sep = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
      const firstLineCols = firstLine.split(sep).map((c) => c.replace(/^"|"$/g, '').trim().toLowerCase());

      // Check if line 0 is a header
      const hasHeader = firstLineCols.some((c) =>
        c.includes('brinde') ||
        c.includes('nome') ||
        c.includes('item') ||
        c.includes('estoque') ||
        c.includes('saldo') ||
        c.includes('descri') ||
        c.includes('finalidade') ||
        c.includes('quantidade')
      );

      let nameIdx = 0;
      let descIdx = -1;
      let initialStockIdx = -1;
      let stockIdx = 1;
      let minStockIdx = -1;
      let iconIdx = -1;

      if (hasHeader) {
        firstLineCols.forEach((col, idx) => {
          if (col.includes('brinde') || col.includes('nome') || col.includes('item')) {
            nameIdx = idx;
          } else if (col.includes('descri') || col.includes('finalidade')) {
            descIdx = idx;
          } else if (col.includes('inicial') || col.includes('inicio') || col.includes('estoque inicial')) {
            initialStockIdx = idx;
          } else if (
            col.includes('saldo') ||
            col.includes('atual') ||
            col.includes('quantidade') ||
            col.includes('qtd') ||
            (col.includes('estoque') && !col.includes('inicial') && !col.includes('min'))
          ) {
            stockIdx = idx;
          } else if (col.includes('min') || col.includes('mín') || col.includes('alerta')) {
            minStockIdx = idx;
          } else if (col.includes('icone') || col.includes('icon')) {
            iconIdx = idx;
          }
        });
      }

      const dataLines = hasHeader ? lines.slice(1) : lines;
      const parsedGifts: Gift[] = [];

      dataLines.forEach((line, idx) => {
        const cols = line.split(sep).map((c) => c.replace(/^"|"$/g, '').trim());
        if (cols.length >= 1 && cols[nameIdx]) {
          const name = cols[nameIdx];

          // Determine stock value
          let stock = 0;
          if (stockIdx !== -1 && cols[stockIdx] !== undefined) {
            const parsed = parseInt(cols[stockIdx].replace(/[^\d-]/g, ''), 10);
            if (!isNaN(parsed)) stock = parsed;
          } else {
            // fallback: find first numeric col
            for (let c = 1; c < cols.length; c++) {
              const parsed = parseInt(cols[c].replace(/[^\d-]/g, ''), 10);
              if (!isNaN(parsed)) {
                stock = parsed;
                break;
              }
            }
          }

          // Initial stock
          let initialStock = stock;
          if (initialStockIdx !== -1 && cols[initialStockIdx] !== undefined) {
            const parsed = parseInt(cols[initialStockIdx].replace(/[^\d-]/g, ''), 10);
            if (!isNaN(parsed)) initialStock = parsed;
          }

          // Min stock
          let minStock = 3;
          if (minStockIdx !== -1 && cols[minStockIdx] !== undefined) {
            const parsed = parseInt(cols[minStockIdx].replace(/[^\d-]/g, ''), 10);
            if (!isNaN(parsed)) minStock = parsed;
          }

          // Description
          let description: string | undefined = undefined;
          if (descIdx !== -1 && cols[descIdx]) {
            description = cols[descIdx];
          }

          // Icon
          let icon = 'fa-gift';
          if (iconIdx !== -1 && cols[iconIdx]) {
            icon = cols[iconIdx];
          }

          parsedGifts.push({
            id: `imp_g_${Date.now()}_${idx}`,
            name,
            stock,
            initialStock,
            minStock,
            icon,
            description,
          });
        }
      });

      if (parsedGifts.length > 0) {
        onImportGiftsCSV(parsedGifts);
      }
      if (e.target) e.target.value = '';
    };

    reader.readAsText(file);
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 card-shadow border border-stone-200/80 space-y-5">
      {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-brand-charcoal flex items-center gap-2">
              <Sliders className="w-5 h-5 text-brand-greenMid" />
              <span>Gestão, Cadastro e Reposição de Saldos</span>
            </h2>
            <p className="text-xs text-brand-greyLight">
              Adicione novos itens, ajuste quantidades ou importe/exporte sua planilha de estoque.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.txt"
              className="hidden"
            />
            <button
              onClick={handleExportGiftsCSV}
              className="bg-stone-100 hover:bg-stone-200 text-brand-charcoal text-xs font-bold px-3 py-2.5 rounded-xl border border-stone-200 transition flex items-center gap-1.5 cursor-pointer"
              title="Exportar tabela de estoque em CSV"
            >
              <Download className="w-3.5 h-3.5 text-brand-forest" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-stone-100 hover:bg-stone-200 text-brand-charcoal text-xs font-bold px-3 py-2.5 rounded-xl border border-stone-200 transition flex items-center gap-1.5 cursor-pointer"
              title="Importar ou atualizar lista de brindes via CSV"
            >
              <Upload className="w-3.5 h-3.5 text-brand-forest" />
              <span>Importar CSV</span>
            </button>

            <button
              onClick={onOpenAddGift}
              className="bg-brand-charcoal hover:bg-brand-greyMid text-white text-xs font-black px-3.5 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-brand-lime" />
              <span>Novo Brinde</span>
            </button>
          </div>
        </div>

      {/* Mobile Card List (sm:hidden) */}
      <div className="block sm:hidden space-y-3">
        {sortedGifts.map((item) => {
          const isLow = item.stock <= item.minStock;
          const initialQty = item.initialStock ?? item.stock;

          return (
            <div
              key={item.id}
              className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                    <IconHelper iconName={item.icon} className="w-5 h-5 text-brand-forest" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-brand-charcoal text-sm truncate">{item.name}</h4>
                    {item.description && (
                      <p className="text-[11px] text-stone-600 bg-stone-50 px-2 py-0.5 rounded border border-stone-200/60 my-1 line-clamp-2">
                        <span className="font-semibold text-stone-700">Finalidade: </span>
                        {item.description}
                      </p>
                    )}
                    <p className="text-[11px] text-stone-500 font-medium">Mínimo: {item.minStock} un.</p>
                  </div>
                </div>

                {isLow ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                    Estoque Baixo
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-brand-lime/20 text-brand-forest border border-brand-lime/30 shrink-0">
                    Normal
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 bg-stone-50 p-3 rounded-xl border border-stone-100 text-center">
                <div>
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">Estoque Inicial</span>
                  <span className="text-sm font-bold text-stone-700">{initialQty} un.</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-brand-forest uppercase block">Saldo Atual</span>
                  <span className="text-base font-black text-brand-charcoal">{item.stock} un.</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => onOpenEditStock(item.id)}
                  className="flex-1 bg-brand-forest hover:bg-brand-greenMid text-white font-extrabold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px] touch-manipulation shadow-2xs"
                >
                  <Edit className="w-4 h-4 text-brand-lime" />
                  <span>Repor / Ajustar</span>
                </button>
                <button
                  onClick={() => onDeleteGift(item.id)}
                  className="bg-stone-100 hover:bg-red-50 text-stone-500 hover:text-red-600 p-2.5 rounded-xl border border-stone-200 transition cursor-pointer min-h-[42px] min-w-[42px] flex items-center justify-center"
                  title="Remover Brinde"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin Stock Table for Desktop */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-stone-200">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-stone-100 text-brand-charcoal text-[11px] uppercase tracking-wider font-black">
            <tr>
              <th className="py-3.5 px-4">Brinde</th>
              <th className="py-3.5 px-4">Descrição / Finalidade</th>
              <th className="py-3.5 px-3 text-center">Estoque Inicial</th>
              <th className="py-3.5 px-3 text-center">Saldo Atual</th>
              <th className="py-3.5 px-3 text-center">Mínimo para Alerta</th>
              <th className="py-3.5 px-3 text-center">Status</th>
              <th className="py-3.5 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 font-medium text-brand-charcoal">
            {sortedGifts.map((item) => {
              const isLow = item.stock <= item.minStock;
              const initialQty = item.initialStock ?? item.stock;

              return (
                <tr key={item.id} className="hover:bg-stone-50 transition">
                  <td className="py-3.5 px-4 flex items-center gap-3">
                    <IconHelper iconName={item.icon} className="w-5 h-5 text-brand-forest shrink-0" />
                    <span className="font-extrabold text-brand-charcoal">{item.name}</span>
                  </td>
                  <td className="py-3.5 px-4 max-w-xs text-xs text-stone-600">
                    {item.description ? (
                      <span
                        className="bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200/60 block font-normal text-stone-600 truncate max-w-[220px]"
                        title={item.description}
                      >
                        {item.description}
                      </span>
                    ) : (
                      <span className="text-stone-300 italic">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-center font-bold text-sm text-stone-700">
                    {initialQty}
                  </td>
                  <td className="py-3.5 px-3 text-center font-black text-base text-brand-charcoal">
                    {item.stock}
                  </td>
                  <td className="py-3.5 px-3 text-center text-brand-greyLight font-semibold">
                    {item.minStock}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    {isLow ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                        Estoque Baixo
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-brand-lime/20 text-brand-forest">
                        Normal
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => onOpenEditStock(item.id)}
                      className="text-brand-forest hover:text-brand-charcoal font-extrabold text-xs px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-200 cursor-pointer transition inline-flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Repor / Ajustar</span>
                    </button>
                    <button
                      onClick={() => onDeleteGift(item.id)}
                      className="text-stone-400 hover:text-red-600 p-1.5 transition cursor-pointer inline-flex items-center"
                      title="Remover Brinde"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer / Discrete Security Controls */}
      <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-400">
        <div className="flex items-center gap-1.5 text-stone-400 font-medium text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
          <span>Sessão de gestão ativa</span>
        </div>

        <div className="flex items-center gap-3">
          {onOpenChangePassword && (
            <button
              onClick={onOpenChangePassword}
              className="text-stone-400 hover:text-stone-700 text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer py-1 px-2 rounded hover:bg-stone-100"
              title="Alterar Senha de Acesso"
            >
              <KeyRound className="w-3 h-3" />
              <span>Alterar Senha</span>
            </button>
          )}

          {onLockManagement && (
            <button
              onClick={onLockManagement}
              className="text-stone-400 hover:text-amber-800 text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer py-1 px-2 rounded hover:bg-amber-50"
              title="Bloquear Acesso à Gestão"
            >
              <Lock className="w-3 h-3" />
              <span>Bloquear Acesso</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
