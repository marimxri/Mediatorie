import React, { useState, useMemo, useEffect } from 'react';
import { Gift, WithdrawalLog } from '../types';
import {
  PackageSearch,
  Boxes,
  AlertTriangle,
  ClipboardCheck,
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Filter,
  X,
  Gift as GiftIcon,
  CheckCircle2,
  Bookmark,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

interface StatsOverviewProps {
  gifts: Gift[];
  history: WithdrawalLog[];
  showSummaryCards?: boolean;
}

const MONTH_NAMES: Record<string, string> = {
  '01': 'Janeiro',
  '02': 'Fevereiro',
  '03': 'Março',
  '04': 'Abril',
  '05': 'Maio',
  '06': 'Junho',
  '07': 'Julho',
  '08': 'Agosto',
  '09': 'Setembro',
  '10': 'Outubro',
  '11': 'Novembro',
  '12': 'Dezembro',
};

function formatMonthLabel(yyyyMm: string): string {
  const parts = yyyyMm.split('-');
  if (parts.length === 2) {
    const [year, month] = parts;
    const name = MONTH_NAMES[month] || month;
    return `${name}/${year}`;
  }
  return yyyyMm;
}

interface PersonStats {
  key: string;
  name: string;
  totalUnits: number;
  requestCount: number;
  giftsList: Set<string>;
}

// Normaliza variações de grafia, setores (ex: RH/Marketing, Marketing/RH) e acentuação para unificar a mesma pessoa/área
export function normalizePersonName(rawName: string): { key: string; displayName: string } {
  if (!rawName || !rawName.trim()) {
    return { key: 'nao_especificado', displayName: 'Não especificado' };
  }

  const clean = rawName.trim();
  const lower = clean
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // 1. Unificação específica solicitada: "marketing/rh", "rh/marketing", "rh / marketing", etc.
  const hasRh = lower.includes('rh') || lower.includes('recursos humanos');
  const hasMkt = lower.includes('marketing') || lower.includes('mkt');
  if (hasRh && hasMkt) {
    return { key: 'rh_marketing', displayName: 'RH / Marketing' };
  }

  // 2. Outras pessoas / áreas conhecidas e suas variações
  if (lower.startsWith('herika') || lower.includes('herika')) {
    return { key: 'herika', displayName: 'Hêrika' };
  }
  if (lower.startsWith('tais') || lower.includes('tais')) {
    return { key: 'tais', displayName: 'Taís' };
  }
  if (lower.startsWith('marcos') || lower.includes('marcos')) {
    return { key: 'marcos', displayName: 'Marcos' };
  }
  if (lower.startsWith('julia') || lower.includes('julia')) {
    return { key: 'julia', displayName: 'Júlia' };
  }
  if (lower.startsWith('leo') || lower.includes('leo') || lower.startsWith('leonardo') || lower.includes('leonardo')) {
    return { key: 'leo', displayName: 'Léo' };
  }
  if (lower.startsWith('marina') || lower.includes('marina')) {
    return { key: 'marina', displayName: 'Marina' };
  }

  // 3. Setores puros
  if (lower === 'rh' || lower.startsWith('rh ') || lower.endsWith(' rh') || lower === 'recursos humanos') {
    return { key: 'rh', displayName: 'RH' };
  }
  if (lower === 'marketing' || lower === 'mkt') {
    return { key: 'marketing', displayName: 'Marketing' };
  }
  if (lower === 'comercial' || lower === 'vendas') {
    return { key: 'comercial', displayName: 'Comercial' };
  }

  // 4. Nome padrão com primeira letra maiúscula
  const firstWord = clean.split(' ')[0];
  const cleanWord = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();

  return {
    key: lower.split(' ')[0].replace(/[^a-z0-9]/g, ''),
    displayName: cleanWord,
  };
}

function parseQtyNumber(qtyStr?: string): number {
  if (!qtyStr) return 1;
  const match = qtyStr.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    return isNaN(num) || num <= 0 ? 1 : num;
  }
  return 1;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  gifts,
  history,
  showSummaryCards = false,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedPerson, setSelectedPerson] = useState<{ key: string; name: string } | null>(null);
  const [personModalScope, setPersonModalScope] = useState<'period' | 'all'>('period');
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(true);
  const [selectedGiftFilterInModal, setSelectedGiftFilterInModal] = useState<string | null>(null);

  const handleOpenPersonModal = (key: string, name: string) => {
    setSelectedPerson({ key, name });
    setPersonModalScope('period');
    setSelectedGiftFilterInModal(null);
    setIsHistoryOpen(true);
  };

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedPerson(null);
      }
    };
    if (selectedPerson) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedPerson]);

  // Extract available months dynamically from history logs
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();

    // Always include current month
    const now = new Date();
    const currentYyyyMm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(currentYyyyMm);

    history.forEach((log) => {
      if (log.date) {
        const match = log.date.match(/^(\d{4}-\d{2})/);
        if (match) {
          monthsSet.add(match[1]);
        }
      }
    });

    const sorted = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
    return sorted;
  }, [history]);

  // Filter logs by selected month
  const filteredHistory = useMemo(() => {
    if (selectedMonth === 'all') {
      return history;
    }
    return history.filter((log) => log.date && log.date.startsWith(selectedMonth));
  }, [history, selectedMonth]);

  // Summary Metrics
  const itemCount = gifts.length;
  const totalStock = gifts.reduce((acc, g) => acc + (Number(g.stock) || 0), 0);
  const lowStockCount = gifts.filter((g) => g.stock <= g.minStock).length;
  const periodWithdrawalsCount = filteredHistory.length;
  const periodUnitsCount = filteredHistory.reduce(
    (sum, l) => sum + parseQtyNumber(l.qtyDisplay),
    0
  );

  // 1. Data for "Quem Mais Retirou Brindes" (grouped by normalized person name)
  const personChartData = useMemo(() => {
    const map: Record<string, PersonStats> = {};

    filteredHistory.forEach((log) => {
      const { key, displayName } = normalizePersonName(log.person);
      const qty = parseQtyNumber(log.qtyDisplay);

      if (!map[key]) {
        map[key] = {
          key,
          name: displayName,
          totalUnits: 0,
          requestCount: 0,
          giftsList: new Set<string>(),
        };
      }

      map[key].totalUnits += qty;
      map[key].requestCount += 1;
      if (log.giftName) {
        map[key].giftsList.add(log.giftName);
      }
    });

    const list = Object.values(map);
    list.sort((a, b) => b.totalUnits - a.totalUnits || b.requestCount - a.requestCount);

    return list.slice(0, 8).map((p) => ({
      key: p.key,
      name: p.name,
      value: p.totalUnits,
      totalUnits: p.totalUnits,
      requestCount: p.requestCount,
      giftsText: Array.from(p.giftsList).slice(0, 4).join(', '),
    }));
  }, [filteredHistory]);

  // Logs for the selected person (filtered by period or all)
  const activePersonLogs = useMemo(() => {
    if (!selectedPerson) return [];
    const source = personModalScope === 'period' ? filteredHistory : history;
    return source.filter((log) => {
      const { key, displayName } = normalizePersonName(log.person);
      return (
        key === selectedPerson.key ||
        displayName.toLowerCase() === selectedPerson.name.toLowerCase()
      );
    });
  }, [selectedPerson, personModalScope, filteredHistory, history]);

  // Breakdown of gifts withdrawn by the selected person
  const activePersonGiftsBreakdown = useMemo(() => {
    const map: Record<string, { giftName: string; totalQty: number; requestsCount: number }> = {};
    activePersonLogs.forEach((log) => {
      const gName = log.giftName || 'Brinde';
      const qty = parseQtyNumber(log.qtyDisplay);
      if (!map[gName]) {
        map[gName] = { giftName: gName, totalQty: 0, requestsCount: 0 };
      }
      map[gName].totalQty += qty;
      map[gName].requestsCount += 1;
    });

    return Object.values(map).sort((a, b) => b.totalQty - a.totalQty);
  }, [activePersonLogs]);

  const activePersonTotalUnits = useMemo(() => {
    return activePersonLogs.reduce((sum, l) => sum + parseQtyNumber(l.qtyDisplay), 0);
  }, [activePersonLogs]);

  // Logs filtered by specific gift if user clicked a gift card
  const displayedPersonLogs = useMemo(() => {
    if (!selectedGiftFilterInModal) return activePersonLogs;
    return activePersonLogs.filter(
      (log) => (log.giftName || 'Brinde').trim().toLowerCase() === selectedGiftFilterInModal.trim().toLowerCase()
    );
  }, [activePersonLogs, selectedGiftFilterInModal]);

  // 2. Data for "Brindes Mais Retirados" (ranking of gifts in the filtered period)
  const giftChartData = useMemo(() => {
    const countsMap: Record<string, number> = {};
    filteredHistory.forEach((log) => {
      const qty = parseQtyNumber(log.qtyDisplay);
      countsMap[log.giftName] = (countsMap[log.giftName] || 0) + qty;
    });

    const data = gifts.map((gift) => ({
      name: gift.name,
      withdrawals: countsMap[gift.name] || 0,
      stock: gift.stock,
    }));

    data.sort((a, b) => b.withdrawals - a.withdrawals);
    return data.slice(0, 8);
  }, [gifts, filteredHistory]);

  const hasWithdrawals = filteredHistory.length > 0;

  // Aesthetic color palettes
  const personColors = [
    '#2d5038', // brand-forest
    '#3b6848',
    '#4b805c',
    '#5c9770',
    '#72ad86',
    '#8ec2a0',
    '#a3cb63', // brand-lime
    '#b8d882',
  ];

  const giftColors = [
    '#b45309', // amber-700
    '#c26010',
    '#d97706', // amber-600
    '#e58b19',
    '#f59e0b', // amber-500
    '#fbbf24',
    '#8fb898',
    '#2d5038',
  ];

  const selectedMonthLabel =
    selectedMonth === 'all'
      ? 'Todos os Meses'
      : formatMonthLabel(selectedMonth);

  return (
    <div className="space-y-6 pt-4 border-t border-stone-200/80">
      {/* Filter Bar & Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 card-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-forest/10 text-brand-forest flex items-center justify-center font-bold text-lg shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-base text-brand-charcoal leading-tight">
              Estatísticas e Gráficos de Retiradas
            </h3>
            <p className="text-xs text-stone-500 font-medium">
              Filtre por mês para analisar o desempenho e as solicitações de brindes
            </p>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-stone-50 p-1.5 rounded-xl border border-stone-200">
          <Filter className="w-4 h-4 text-stone-500 ml-1.5" />
          <span className="text-xs font-bold text-stone-600 hidden md:inline">Mês:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white text-xs font-bold text-brand-charcoal py-1.5 px-3 rounded-lg border border-stone-200 shadow-2xs focus:ring-2 focus:ring-brand-forest focus:outline-hidden cursor-pointer"
          >
            <option value="all">Todos os Meses (Geral)</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonthLabel(m)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      {showSummaryCards && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 card-shadow flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-brand-lime/20 text-brand-forest flex items-center justify-center text-xl font-bold shrink-0">
              <PackageSearch className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-brand-greyLight uppercase tracking-wider">
                Tipos Cadastrados
              </p>
              <h4 className="text-2xl font-black text-brand-charcoal">{itemCount}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 card-shadow flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-brand-greenMid/20 text-brand-forest flex items-center justify-center text-xl font-bold shrink-0">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-brand-greyLight uppercase tracking-wider">
                Total em Estoque
              </p>
              <h4 className="text-2xl font-black text-brand-forest">{totalStock}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 card-shadow flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl font-bold shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-brand-greyLight uppercase tracking-wider">
                Estoque Baixo
              </p>
              <h4 className="text-2xl font-black text-amber-700">{lowStockCount}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 card-shadow flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-stone-100 text-brand-charcoal flex items-center justify-center text-xl font-bold shrink-0">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-brand-greyLight uppercase tracking-wider">
                {selectedMonth === 'all' ? 'Solicitações (Geral)' : 'Solicitações no Mês'}
              </p>
              <div className="flex items-baseline gap-1.5">
                <h4 className="text-2xl font-black text-brand-charcoal">{periodWithdrawalsCount}</h4>
                <span className="text-xs font-bold text-stone-500">
                  {periodWithdrawalsCount === 1 ? 'registro' : 'registros'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GRÁFICO 1: QUEM MAIS RETIROU BRINDES */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 card-shadow border border-stone-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-forest text-brand-lime flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-brand-charcoal leading-tight">
                  Quem Mais Retirou Brindes
                </h3>
                <span className="bg-stone-100 text-stone-700 text-[11px] font-bold px-2 py-0.5 rounded-md border border-stone-200">
                  {selectedMonthLabel}
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium">
                Ranking de colaboradores por total de brindes retirados
              </p>
            </div>
          </div>

          {hasWithdrawals && (
            <div className="flex items-center gap-1.5 bg-brand-forest/10 text-brand-forest px-3 py-1.5 rounded-full text-xs font-black self-start sm:self-auto">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>
                {periodUnitsCount} {periodUnitsCount === 1 ? 'brinde retirado' : 'brindes retirados'} ({periodWithdrawalsCount} {periodWithdrawalsCount === 1 ? 'registro' : 'registros'})
              </span>
            </div>
          )}
        </div>

        {hasWithdrawals && personChartData.length > 0 ? (
          <div className="w-full">
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={personChartData}
                  layout="vertical"
                  margin={{ top: 10, right: 35, left: 15, bottom: 5 }}
                  className="cursor-pointer"
                  onClick={(state: any) => {
                    if (state && state.activePayload && state.activePayload.length > 0) {
                      const p = state.activePayload[0].payload;
                      if (p) {
                        handleOpenPersonModal(p.key, p.name);
                      }
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#1e293b"
                    fontSize={12}
                    fontWeight={700}
                    width={150}
                    tickLine={false}
                    style={{ cursor: 'pointer' }}
                    tickFormatter={(val) => (val.length > 18 ? `${val.substring(0, 16)}...` : val)}
                    onClick={(e: any) => {
                      if (e && e.value) {
                        const found = personChartData.find((p) => p.name === e.value);
                        if (found) {
                          handleOpenPersonModal(found.key, found.name);
                        }
                      }
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(45, 80, 56, 0.08)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-brand-charcoal text-white p-3.5 rounded-xl shadow-xl text-xs space-y-1.5 border border-stone-700 max-w-xs cursor-pointer">
                            <div className="flex items-center justify-between border-b border-stone-700 pb-1 gap-2">
                              <p className="font-black text-brand-lime text-sm">
                                {data.name}
                              </p>
                              <span className="text-[10px] bg-brand-forest px-1.5 py-0.5 rounded text-white font-bold">
                                Detalhes
                              </span>
                            </div>
                            <div className="space-y-0.5 text-stone-200">
                              <p className="font-semibold">
                                Total de Brindes:{' '}
                                <span className="font-black text-brand-lime">
                                  {data.totalUnits} {data.totalUnits === 1 ? 'unidade' : 'unidades'}
                                </span>
                              </p>
                              <p className="font-semibold">
                                Solicitações Realizadas:{' '}
                                <span className="font-black text-white">
                                  {data.requestCount} {data.requestCount === 1 ? 'vez' : 'vezes'}
                                </span>
                              </p>
                            </div>
                            {data.giftsText && (
                              <p className="font-medium text-stone-400 text-[11px] pt-1 border-t border-stone-700/60">
                                Itens: {data.giftsText}
                              </p>
                            )}
                            <p className="text-[10px] font-bold text-brand-lime/90 pt-1 flex items-center gap-1">
                              👆 Clique para ver todos os brindes
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="value"
                    radius={[0, 8, 8, 0]}
                    barSize={22}
                    cursor="pointer"
                    onClick={(data: any) => {
                      if (data) {
                        handleOpenPersonModal(data.key, data.name);
                      }
                    }}
                  >
                    {personChartData.map((_, index) => (
                      <Cell
                        key={`cell-person-${index}`}
                        fill={personColors[index % personColors.length]}
                        className="cursor-pointer transition-opacity hover:opacity-85"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between text-xs text-stone-500 gap-2">
              <span>
                Colaboradores ({selectedMonthLabel}):{' '}
                <strong className="text-brand-charcoal">{personChartData.length}</strong>
              </span>
              <span className="text-[11px] text-stone-400">
                Passe o mouse ou clique nas barras para ver os detalhes
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-stone-50 rounded-2xl p-8 text-center border border-dashed border-stone-200 my-2">
            <div className="w-12 h-12 rounded-full bg-stone-200 text-stone-500 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="font-black text-sm text-brand-charcoal mb-1">
              Nenhuma retirada encontrada em {selectedMonthLabel}
            </h4>
            <p className="text-xs text-stone-500 max-w-xs mx-auto">
              Selecione outro mês no topo ou realize novas retiradas para visualizar os dados.
            </p>
          </div>
        )}
      </div>

      {/* GRÁFICO 2: BRINDES MAIS RETIRADOS */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 card-shadow border border-stone-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg border border-amber-200/60 shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-brand-charcoal leading-tight">
                  Brindes Mais Retirados
                </h3>
                <span className="bg-stone-100 text-stone-700 text-[11px] font-bold px-2 py-0.5 rounded-md border border-stone-200">
                  {selectedMonthLabel}
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium">
                Ranking dos itens com maior saída no estoque
              </p>
            </div>
          </div>

          {hasWithdrawals && (
            <div className="flex items-center gap-1.5 bg-brand-lime/20 text-brand-forest px-3 py-1 rounded-full text-xs font-black border border-brand-lime/40 self-start sm:self-auto">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{periodUnitsCount} un no período</span>
            </div>
          )}
        </div>

        {hasWithdrawals ? (
          <div className="w-full">
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={giftChartData}
                  layout="vertical"
                  margin={{ top: 10, right: 35, left: 15, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#1e293b"
                    fontSize={12}
                    fontWeight={700}
                    width={150}
                    tickLine={false}
                    tickFormatter={(val) => (val.length > 18 ? `${val.substring(0, 16)}...` : val)}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(217, 119, 6, 0.06)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-brand-charcoal text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-stone-700">
                            <p className="font-black text-amber-400 text-sm">{data.name}</p>
                            <p className="font-semibold text-stone-200">
                              Saídas no Período: <span className="font-black text-white">{data.withdrawals} un</span>
                            </p>
                            <p className="font-medium text-stone-400">
                              Saldo Atual em Estoque: {data.stock} un
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="withdrawals" radius={[0, 8, 8, 0]} barSize={22}>
                    {giftChartData.map((_, index) => (
                      <Cell
                        key={`cell-gift-${index}`}
                        fill={giftColors[index % giftColors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between text-xs text-stone-500 gap-2">
              <span>
                Item Líder em Saídas:{' '}
                <strong className="text-amber-800">{giftChartData[0]?.name || 'N/A'}</strong> (
                {giftChartData[0]?.withdrawals || 0} un)
              </span>
              <span className="text-[11px] text-stone-400">
                Saldo atual e saídas detalhadas no cursor
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-stone-50 rounded-2xl p-8 text-center border border-dashed border-stone-200 my-2">
            <div className="w-12 h-12 rounded-full bg-stone-200 text-stone-500 flex items-center justify-center mx-auto mb-3">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h4 className="font-black text-sm text-brand-charcoal mb-1">
              Nenhuma saída registrada em {selectedMonthLabel}
            </h4>
            <p className="text-xs text-stone-500 max-w-xs mx-auto">
              Selecione outro mês para visualizar as saídas de brindes do período correspondente.
            </p>
          </div>
        )}
      </div>

      {/* MODAL DETALHADO: BRINDES RETIRADOS PELA PESSOA */}
      {selectedPerson && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn"
          onClick={() => setSelectedPerson(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-stone-200/90 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-stone-100 bg-stone-50/70 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-brand-forest text-brand-lime font-black text-xl flex items-center justify-center shadow-md shadow-brand-forest/20 shrink-0">
                  {selectedPerson.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-black text-brand-charcoal">
                      {selectedPerson.name}
                    </h3>
                    <span className="bg-brand-forest/10 text-brand-forest border border-brand-forest/20 text-xs font-black px-2.5 py-0.5 rounded-full">
                      {personModalScope === 'period'
                        ? selectedMonthLabel
                        : 'Histórico Geral'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">
                    Detalhamento dos brindes e retiradas registradas
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPerson(null)}
                className="w-9 h-9 rounded-xl bg-stone-200/70 hover:bg-stone-200 text-stone-600 hover:text-stone-900 flex items-center justify-center transition cursor-pointer shrink-0"
                title="Fechar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scope Filter Switch (Somente Mês Atual vs Todo Histórico) */}
            {selectedMonth !== 'all' && (
              <div className="px-5 sm:px-6 pt-3 pb-2 bg-stone-50/40 border-b border-stone-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="text-stone-500 font-semibold">Período de análise:</span>
                <div className="inline-flex bg-stone-200/80 p-0.5 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPersonModalScope('period')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      personModalScope === 'period'
                        ? 'bg-white text-brand-forest shadow-xs font-black'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Somente {selectedMonthLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPersonModalScope('all')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      personModalScope === 'all'
                        ? 'bg-white text-brand-forest shadow-xs font-black'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Todo o Histórico
                  </button>
                </div>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                <div className="bg-brand-forest/5 border border-brand-forest/15 rounded-2xl p-3 sm:p-3.5 text-center">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wide block">
                    Total Retirado
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-brand-forest mt-0.5 block">
                    {activePersonTotalUnits}{' '}
                    <span className="text-xs font-bold text-stone-500">un</span>
                  </span>
                </div>

                <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3 sm:p-3.5 text-center">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wide block">
                    Tipos de Brinde
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-brand-charcoal mt-0.5 block">
                    {activePersonGiftsBreakdown.length}{' '}
                    <span className="text-xs font-bold text-stone-500">itens</span>
                  </span>
                </div>

                <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3 sm:p-3.5 text-center">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wide block">
                    Solicitações
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-brand-charcoal mt-0.5 block">
                    {activePersonLogs.length}{' '}
                    <span className="text-xs font-bold text-stone-500">vezes</span>
                  </span>
                </div>
              </div>

              {/* SECTION 1: Resumo dos Brindes Retirados */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
                  <div className="flex items-center gap-2">
                    <GiftIcon className="w-4 h-4 text-brand-forest" />
                    <h4 className="font-black text-sm text-brand-charcoal">
                      Quais Brindes {selectedPerson.name} Retirou?
                    </h4>
                  </div>
                  {selectedGiftFilterInModal && (
                    <button
                      type="button"
                      onClick={() => setSelectedGiftFilterInModal(null)}
                      className="text-[11px] font-bold text-brand-forest bg-brand-forest/10 hover:bg-brand-forest/20 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Limpar filtro de brinde
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-stone-500 mb-3">
                  Clique em qualquer brinde abaixo para filtrar o histórico individual correspondente:
                </p>

                {activePersonGiftsBreakdown.length === 0 ? (
                  <div className="p-6 text-center text-xs text-stone-500 bg-stone-50 rounded-2xl border border-stone-200">
                    Nenhuma retirada registrada para esta pessoa no período selecionado.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activePersonGiftsBreakdown.map((item, idx) => {
                      const maxUnits = activePersonGiftsBreakdown[0]?.totalQty || 1;
                      const percentage = Math.max(12, Math.round((item.totalQty / maxUnits) * 100));
                      const isSelected =
                        selectedGiftFilterInModal?.toLowerCase() === item.giftName.toLowerCase();

                      return (
                        <div
                          key={`person-gift-${idx}`}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedGiftFilterInModal(null);
                            } else {
                              setSelectedGiftFilterInModal(item.giftName);
                              setIsHistoryOpen(true);
                            }
                          }}
                          className={`rounded-2xl p-3.5 transition cursor-pointer border ${
                            isSelected
                              ? 'bg-brand-forest/10 border-brand-forest shadow-xs ring-1 ring-brand-forest/40'
                              : 'bg-stone-50 hover:bg-stone-100/80 border-stone-200/80'
                          }`}
                          title="Clique para filtrar o histórico individual por este brinde"
                        >
                          <div className="flex items-center justify-between gap-3 text-xs mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-brand-forest/10 text-brand-forest font-black flex items-center justify-center text-[11px]">
                                {idx + 1}
                              </span>
                              <span className="font-black text-brand-charcoal text-sm">
                                {item.giftName}
                              </span>
                              {isSelected && (
                                <span className="bg-brand-forest text-white text-[10px] font-black px-2 py-0.2 rounded-md">
                                  Filtrado no Histórico
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-right">
                              <span className="text-stone-400 font-semibold text-[11px]">
                                ({item.requestsCount} {item.requestsCount === 1 ? 'retirada' : 'retiradas'})
                              </span>
                              <span className="font-black text-brand-forest bg-brand-lime/25 border border-brand-lime/40 px-2 py-0.5 rounded-md text-xs">
                                {item.totalQty} {item.totalQty === 1 ? 'un' : 'unidades'}
                              </span>
                            </div>
                          </div>

                          {/* Progress bar visual */}
                          <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-brand-forest h-full rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 2: Histórico Individual de Solicitações (ABRIR E FECHAR) */}
              <div className="border border-stone-200/90 rounded-2xl overflow-hidden bg-stone-50/50 shadow-2xs">
                {/* Botão de Cabeçalho para Abrir / Fechar */}
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 bg-stone-100/75 hover:bg-stone-100 transition cursor-pointer text-left border-b border-stone-200/70 select-none group"
                  aria-expanded={isHistoryOpen}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-forest/10 text-brand-forest flex items-center justify-center font-black shrink-0 group-hover:bg-brand-forest group-hover:text-white transition">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-sm text-brand-charcoal group-hover:text-brand-forest transition">
                          Histórico Individual de Solicitações
                        </h4>
                        <span className="bg-brand-forest text-white font-black px-2 py-0.5 rounded-full text-xs">
                          {displayedPersonLogs.length}{' '}
                          {displayedPersonLogs.length === 1 ? 'registro' : 'registros'}
                        </span>
                        {selectedGiftFilterInModal && (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300/80 text-[11px] font-bold px-2 py-0.5 rounded-full">
                            Filtro: {selectedGiftFilterInModal}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {isHistoryOpen
                          ? 'Clique para recolher / fechar este histórico'
                          : 'Clique para expandir / abrir e ver cada saída registrada'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-200/90 text-xs font-black text-brand-forest shadow-2xs group-hover:border-brand-forest/40 transition shrink-0 ml-2">
                    <span>{isHistoryOpen ? 'Fechar Histórico' : 'Abrir Histórico'}</span>
                    {isHistoryOpen ? (
                      <ChevronUp className="w-4 h-4 text-brand-forest" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-brand-forest" />
                    )}
                  </div>
                </button>

                {/* Conteúdo Expansível do Histórico */}
                {isHistoryOpen && (
                  <div className="p-3.5 sm:p-4 space-y-2 bg-white">
                    {displayedPersonLogs.length === 0 ? (
                      <div className="p-6 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-stone-200">
                        {selectedGiftFilterInModal ? (
                          <div className="space-y-2">
                            <p>Nenhuma retirada encontrada para o brinde "{selectedGiftFilterInModal}".</p>
                            <button
                              type="button"
                              onClick={() => setSelectedGiftFilterInModal(null)}
                              className="text-brand-forest font-bold underline cursor-pointer text-xs"
                            >
                              Ver histórico completo de todos os brindes
                            </button>
                          </div>
                        ) : (
                          'Nenhum registro encontrado.'
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          {displayedPersonLogs.map((log, lIdx) => (
                            <div
                              key={log.id || `log-${lIdx}`}
                              className="bg-stone-50/70 hover:bg-stone-50 border border-stone-200/90 rounded-xl p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-brand-forest/40 transition shadow-2xs"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-black text-brand-charcoal text-sm">
                                    {log.giftName}
                                  </span>
                                  <span className="bg-brand-forest text-white font-black px-2 py-0.5 rounded-md text-[11px]">
                                    {log.qtyDisplay} un
                                  </span>
                                  {log.reserved && (
                                    <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                      Reservado: {log.reserved}
                                    </span>
                                  )}
                                </div>
                                {log.reason && (
                                  <p className="text-stone-500 text-[11px]">
                                    <strong className="text-stone-600">Motivo:</strong> {log.reason}
                                  </p>
                                )}
                              </div>

                              <div className="text-left sm:text-right shrink-0">
                                <span className="inline-block text-[11px] font-bold text-stone-500 bg-white border border-stone-200 px-2 py-1 rounded-md">
                                  {log.dateFormatted || log.date}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Botão rápido no rodapé da seção para fechar se tiver muitos itens */}
                        {displayedPersonLogs.length > 3 && (
                          <div className="pt-2 text-center">
                            <button
                              type="button"
                              onClick={() => setIsHistoryOpen(false)}
                              className="text-xs font-bold text-stone-500 hover:text-stone-800 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition cursor-pointer"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                              Recolher / Fechar histórico
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-stone-100 bg-stone-50/70 flex items-center justify-between gap-3">
              <span className="text-xs text-stone-500 font-medium">
                {selectedGiftFilterInModal
                  ? `Mostrando ${displayedPersonLogs.length} de ${activePersonLogs.length} registros (filtrado por "${selectedGiftFilterInModal}")`
                  : `Total de ${activePersonLogs.length} ${activePersonLogs.length === 1 ? 'registro' : 'registros'} de ${selectedPerson.name}`}
              </span>
              <button
                type="button"
                onClick={() => setSelectedPerson(null)}
                className="px-5 py-2 rounded-xl bg-brand-charcoal hover:bg-stone-800 text-white font-bold text-xs transition cursor-pointer shadow-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
