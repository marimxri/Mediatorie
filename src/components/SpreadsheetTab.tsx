import React, { useState, useRef, useMemo } from 'react';
import { WithdrawalLog, Gift } from '../types';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Search,
  Trash2,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  PackageCheck,
  X,
  ChevronDown,
} from 'lucide-react';
import { User } from 'firebase/auth';

interface SpreadsheetTabProps {
  logs: WithdrawalLog[];
  gifts: Gift[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  onDeleteLog: (id: string) => void;
  onExportCSV: () => void;
  onImportLogsCSV: (importedLogs: WithdrawalLog[]) => void;
  googleUser: User | null;
  spreadsheetUrl: string | null;
  isSyncingSheets: boolean;
  onConnectGoogle: () => void;
  onSyncGoogleSheets: () => void;
  onPullGoogleSheets?: () => void;
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

// Helper to determine if a log is a reservation
export const isLogReserved = (reservedStr?: string): boolean => {
  if (!reservedStr) return false;
  const lower = reservedStr.trim().toLowerCase();
  if (lower === 'não' || lower === 'nao' || lower === 'no' || lower === '-' || lower === '') {
    return false;
  }
  return lower.startsWith('sim') || lower.includes('reserv') || lower === 'yes';
};

// Helper to check if a date is today or in the future
export const isDateTodayOrFuture = (dateStr?: string): boolean => {
  if (!dateStr) return false;
  const trimmed = dateStr.trim();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Format DD/MM/YYYY
  const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brMatch) {
    const d = parseInt(brMatch[1], 10);
    const m = parseInt(brMatch[2], 10) - 1;
    const y = parseInt(brMatch[3], 10);
    const itemDate = new Date(y, m, d, 0, 0, 0, 0);
    return itemDate.getTime() >= today.getTime();
  }

  // Format YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    const itemDate = new Date(y, m, d, 0, 0, 0, 0);
    return itemDate.getTime() >= today.getTime();
  }

  return true;
};

// Helper to check if a log is an active reservation that should be highlighted in green
export const isLogActiveReservation = (log: WithdrawalLog): boolean => {
  if (!isLogReserved(log.reserved)) return false;
  return isDateTodayOrFuture(log.date || log.dateFormatted);
};

export const SpreadsheetTab: React.FC<SpreadsheetTabProps> = ({
  logs,
  gifts,
  selectedMonth,
  setSelectedMonth,
  onDeleteLog,
  onExportCSV,
  onImportLogsCSV,
  googleUser,
  spreadsheetUrl,
  isSyncingSheets,
  onConnectGoogle,
  onSyncGoogleSheets,
  onPullGoogleSheets,
}) => {
  const [search, setSearch] = useState('');
  const [selectedGiftFilter, setSelectedGiftFilter] = useState('');
  const [onlyReservedFilter, setOnlyReservedFilter] = useState(false);
  const [isBottomSectionClosed, setIsBottomSectionClosed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Alphabetically sorted gifts for filter dropdown
  const sortedGifts = useMemo(() => {
    return [...gifts].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [gifts]);

  // Dynamic available months list
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();

    const now = new Date();
    const currentYyyyMm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(currentYyyyMm);

    logs.forEach((log) => {
      if (log.date) {
        const match = log.date.match(/^(\d{4}-\d{2})/);
        if (match) {
          monthsSet.add(match[1]);
        }
      }
    });

    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [logs]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
      if (lines.length <= 1) return;

      const parsedLogs: WithdrawalLog[] = [];
      const dataLines = lines.slice(1);

      dataLines.forEach((line, idx) => {
        const sep = line.includes(';') ? ';' : ',';
        const cols = line.split(sep).map((c) => c.replace(/^"|"$/g, '').trim());

        if (cols.length >= 3 && cols[1]) {
          const date = cols[0] || new Date().toISOString().split('T')[0];
          const giftName = cols[1];
          const qtyDisplay = cols[2] || '1';
          const person = cols[3] || 'N/A';
          const reason = cols[4] || '';
          const reserved = cols[5] || '';

          parsedLogs.push({
            id: `imp_log_${Date.now()}_${idx}`,
            date,
            dateFormatted: date.includes('/') ? date : date,
            giftName,
            giftId: '',
            qtyDisplay,
            person,
            reason,
            reserved,
          });
        }
      });

      if (parsedLogs.length > 0) {
        onImportLogsCSV(parsedLogs);
      }
      if (e.target) e.target.value = '';
    };

    reader.readAsText(file);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        log.person.toLowerCase().includes(searchLower) ||
        log.giftName.toLowerCase().includes(searchLower) ||
        (log.reason && log.reason.toLowerCase().includes(searchLower)) ||
        (log.reserved && log.reserved.toLowerCase().includes(searchLower));

      const matchesGift = !selectedGiftFilter || log.giftName === selectedGiftFilter;
      const matchesMonth = selectedMonth === 'all' || log.date.startsWith(selectedMonth);
      const matchesReservedOnly = !onlyReservedFilter || isLogActiveReservation(log);

      return matchesSearch && matchesGift && matchesMonth && matchesReservedOnly;
    });
  }, [logs, search, selectedGiftFilter, selectedMonth, onlyReservedFilter]);

  // List of active reserved logs in the selected period (today or future)
  const activeReservedLogsInPeriod = useMemo(() => {
    return logs.filter((log) => {
      const matchesMonth = selectedMonth === 'all' || log.date.startsWith(selectedMonth);
      return matchesMonth && isLogActiveReservation(log);
    });
  }, [logs, selectedMonth]);

  const selectedMonthLabel =
    selectedMonth === 'all' ? 'Geral' : formatMonthLabel(selectedMonth);

  return (
    <div className="space-y-6">
      {/* Main Table Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 card-shadow border border-stone-200/80 space-y-4">
        {/* Table Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-brand-charcoal">
              Histórico de Retiradas ({filteredLogs.length})
            </h3>
            <p className="text-xs text-brand-greyLight mt-0.5">
              Histórico sincronizado em tempo real. As retiradas abatem o estoque automaticamente.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.txt"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-stone-100 hover:bg-stone-200 text-brand-charcoal text-xs font-bold px-3.5 py-2.5 rounded-xl border border-stone-200 transition flex items-center gap-2 cursor-pointer"
              title="Importar arquivo CSV"
            >
              <Upload className="w-4 h-4 text-brand-forest" />
              <span>Importar CSV</span>
            </button>

            <button
              onClick={onExportCSV}
              className="bg-brand-forest hover:bg-brand-greenMid text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Table Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="relative col-span-1 sm:col-span-5">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-brand-greyLight" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por pessoa, brinde ou motivo..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-50 text-xs border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-greenMid font-medium"
            />
          </div>

          <div className="col-span-1 sm:col-span-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-brand-forest text-white font-bold text-xs border border-brand-greenMid focus:outline-none focus:ring-2 focus:ring-brand-lime cursor-pointer"
            >
              <option value="all" className="bg-white text-brand-charcoal font-bold">
                Todos os Meses
              </option>
              {availableMonths.map((m) => (
                <option
                  key={m}
                  value={m}
                  className="bg-white text-brand-charcoal font-bold"
                >
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-1 sm:col-span-4">
            <select
              value={selectedGiftFilter}
              onChange={(e) => setSelectedGiftFilter(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-stone-50 text-xs border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-greenMid font-semibold text-brand-charcoal cursor-pointer"
            >
              <option value="">Todos os Brindes</option>
              {sortedGifts.map((g) => (
                <option key={g.id} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mobile Card View (sm:hidden) */}
            <div className="block sm:hidden space-y-3">
              {filteredLogs.length === 0 ? (
                <div className="py-8 px-4 text-center text-xs bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                  <p className="font-bold text-brand-charcoal">
                    Nenhuma retirada registrada em {selectedMonthLabel}.
                  </p>
                  <p className="text-stone-500 text-[11px]">
                    As novas retiradas registradas agora entrarão automaticamente em {selectedMonthLabel}.
                  </p>
                  {selectedMonth !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedMonth('all')}
                      className="mt-1 text-xs font-bold text-brand-forest bg-brand-lime/25 border border-brand-lime/50 px-3 py-1.5 rounded-lg transition"
                    >
                      Ver todos os meses
                    </button>
                  )}
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const isHighlightActive = isLogActiveReservation(log);
                  return (
                    <div
                      key={log.id}
                      className={`p-4 rounded-2xl transition space-y-2.5 ${
                        isHighlightActive
                          ? 'bg-emerald-50/90 border-2 border-emerald-500 shadow-sm'
                          : 'bg-white border border-stone-200 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-stone-200/60 pb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-brand-forest bg-brand-forest/10 px-2.5 py-0.5 rounded-full">
                            📅 {log.dateFormatted || log.date}
                          </span>
                          {isHighlightActive && (
                            <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                              RESERVA ATIVA
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => onDeleteLog(log.id)}
                          className="text-stone-400 hover:text-red-600 p-1.5 transition cursor-pointer rounded-lg hover:bg-red-50 active:scale-95 min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title="Excluir Registro"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>

                      <div className="flex items-baseline justify-between gap-2">
                        <h4
                          className={`font-extrabold text-sm leading-snug ${
                            isHighlightActive ? 'text-emerald-950' : 'text-brand-charcoal'
                          }`}
                        >
                          {log.giftName}
                        </h4>
                        <span
                          className={`font-black text-xs px-2.5 py-1 rounded-xl border shrink-0 ${
                            isHighlightActive
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-brand-lime/20 text-brand-forest border-brand-lime/40'
                          }`}
                        >
                          {log.qtyDisplay}
                        </span>
                      </div>

                      <div
                        className={`text-xs space-y-1 p-2.5 rounded-xl border ${
                          isHighlightActive
                            ? 'bg-white/90 border-emerald-200 text-emerald-950'
                            : 'bg-stone-50 border-stone-100 text-stone-700'
                        }`}
                      >
                        <p>
                          <strong className="font-bold text-brand-charcoal">
                            Pessoa/Setor:
                          </strong>{' '}
                          {log.person}
                        </p>
                        {log.reason && (
                          <p>
                            <strong className="font-bold text-brand-charcoal">Motivo:</strong>{' '}
                            {log.reason}
                          </p>
                        )}
                        {log.reserved && (
                          <p
                            className={
                              isHighlightActive
                                ? 'text-emerald-800 font-extrabold pt-0.5'
                                : 'text-stone-500 font-medium'
                            }
                          >
                            <strong>Reservado:</strong> {log.reserved}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Spreadsheet Style Table for Desktop */}
            <div className="hidden sm:block overflow-x-auto rounded-xl border border-stone-200">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-brand-forest text-white text-[11px] uppercase tracking-wider font-black">
                  <tr>
                    <th className="py-3.5 px-4 w-28 border-r border-brand-greenMid/40">Data</th>
                    <th className="py-3.5 px-4 border-r border-brand-greenMid/40">Brinde</th>
                    <th className="py-3.5 px-4 w-32 text-center border-r border-brand-greenMid/40">
                      Quantidade
                    </th>
                    <th className="py-3.5 px-4 border-r border-brand-greenMid/40">
                      Pessoa/Setor retirando
                    </th>
                    <th className="py-3.5 px-4 border-r border-brand-greenMid/40">
                      Motivo da retirada
                    </th>
                    <th className="py-3.5 px-4 w-36 border-r border-brand-greenMid/40">
                      Reservado
                    </th>
                    <th className="py-3.5 px-4 w-12 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 bg-white font-medium text-brand-charcoal">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-xs">
                        <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                          <p className="font-bold text-brand-charcoal text-sm">
                            Nenhuma retirada registrada em {selectedMonthLabel}.
                          </p>
                          <p className="text-stone-500 text-xs">
                            As novas retiradas registradas agora entrarão automaticamente em {selectedMonthLabel}.
                          </p>
                          {selectedMonth !== 'all' && (
                            <button
                              type="button"
                              onClick={() => setSelectedMonth('all')}
                              className="mt-1 text-xs font-bold text-brand-forest bg-brand-lime/25 hover:bg-brand-lime/40 border border-brand-lime/50 px-3 py-1.5 rounded-lg transition cursor-pointer"
                            >
                              Ver histórico geral (Todos os Meses)
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const isHighlightActive = isLogActiveReservation(log);
                      return (
                        <tr
                          key={log.id}
                          className={`transition border-b ${
                            isHighlightActive
                              ? 'bg-emerald-50/90 hover:bg-emerald-100/90 border-emerald-300 font-semibold'
                              : 'hover:bg-stone-50 border-stone-200/60'
                          }`}
                        >
                          <td
                            className={`py-3 px-4 font-bold border-r border-stone-200/50 ${
                              isHighlightActive ? 'text-emerald-950' : 'text-brand-forest'
                            }`}
                          >
                            {log.dateFormatted || log.date}
                          </td>
                          <td
                            className={`py-3 px-4 font-bold border-r border-stone-200/50 ${
                              isHighlightActive ? 'text-emerald-950' : 'text-brand-charcoal'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              {isHighlightActive && (
                                <span
                                  className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"
                                  title="Reserva ativa para separar"
                                ></span>
                              )}
                              <span>{log.giftName}</span>
                            </div>
                          </td>
                          <td
                            className={`py-3 px-4 text-center font-black border-r border-stone-200/50 ${
                              isHighlightActive
                                ? 'text-emerald-950 bg-emerald-100/70'
                                : 'text-brand-forest bg-stone-50/50'
                            }`}
                          >
                            {log.qtyDisplay}
                          </td>
                          <td
                            className={`py-3 px-4 font-semibold border-r border-stone-200/50 ${
                              isHighlightActive ? 'text-emerald-950' : 'text-brand-charcoal'
                            }`}
                          >
                            {log.person}
                          </td>
                          <td
                            className={`py-3 px-4 border-r border-stone-200/50 ${
                              isHighlightActive ? 'text-emerald-900' : 'text-brand-greyMid'
                            }`}
                          >
                            {log.reason || '-'}
                          </td>
                          <td className="py-3 px-4 border-r border-stone-200/50">
                            {isHighlightActive ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-black text-xs shadow-2xs">
                                <span className="w-2 h-2 rounded-full bg-brand-lime animate-pulse"></span>
                                <span>{log.reserved}</span>
                              </span>
                            ) : (
                              <span className="text-stone-400 font-medium">
                                {log.reserved || 'Não'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => onDeleteLog(log.id)}
                              className="text-stone-400 hover:text-red-600 p-1 transition cursor-pointer"
                              title="Excluir Registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

      {/* Pop-up / Reservas para Separação Card Under Spreadsheet (Closable) */}
      {!isBottomSectionClosed ? (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/70 to-emerald-100/60 border-2 border-emerald-400 shadow-md transition-all">
          <div className="flex items-start justify-between gap-3 border-b border-emerald-200/80 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0 ring-4 ring-emerald-200/70">
                <PackageCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-sm sm:text-base text-emerald-950 leading-tight">
                    Brindes Reservados para Separação
                  </h3>
                  <span className="bg-emerald-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                    {activeReservedLogsInPeriod.length} pendente(s)
                  </span>
                </div>
                <p className="text-xs text-emerald-800 font-medium mt-0.5">
                  Itens com reservas para a data atual ou futuras.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBottomSectionClosed(true)}
                className="p-1.5 rounded-xl bg-white/80 hover:bg-white text-emerald-900 hover:text-emerald-950 border border-emerald-300 transition cursor-pointer flex items-center gap-1 text-xs font-bold shadow-2xs"
                title="Fechar este aviso"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Fechar</span>
              </button>
            </div>
          </div>

          {activeReservedLogsInPeriod.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeReservedLogsInPeriod.map((log) => (
                <div
                  key={`res-card-${log.id}`}
                  className="bg-white p-4 rounded-xl border-2 border-emerald-300 shadow-xs flex flex-col justify-between space-y-3 relative overflow-hidden transition hover:shadow-md hover:border-emerald-500"
                >
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500" />
                  <div className="space-y-2 pt-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-black text-emerald-950 text-sm leading-snug">
                        {log.giftName}
                      </h4>
                      <span className="bg-emerald-100 text-emerald-950 font-black text-xs px-2.5 py-1 rounded-lg border border-emerald-300 shrink-0">
                        {log.qtyDisplay} un
                      </span>
                    </div>

                    <div className="text-xs space-y-1.5 text-stone-700 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                      <p className="flex items-center gap-1.5">
                        <strong className="text-emerald-950 font-bold">Solicitante:</strong>
                        <span className="font-semibold text-stone-800">{log.person}</span>
                      </p>
                      {log.reason && (
                        <p className="flex items-start gap-1.5">
                          <strong className="text-emerald-950 font-bold shrink-0">Motivo:</strong>
                          <span className="text-stone-700">{log.reason}</span>
                        </p>
                      )}
                      <p className="flex items-start gap-1.5 text-emerald-900 font-bold pt-1 border-t border-emerald-200/60">
                        <strong className="text-emerald-950 shrink-0">Reserva:</strong>
                        <span>{log.reserved}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-stone-100">
                    <span className="font-bold text-stone-500">
                      📅 {log.dateFormatted || log.date}
                    </span>
                    <span className="bg-emerald-600 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-lime animate-pulse"></span>
                      Separar no Estoque
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/90 rounded-xl p-4 text-center border border-emerald-200 flex items-center justify-center gap-2.5 text-emerald-900 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Nenhuma reserva pendente de separação para a data atual ou futuras.
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsBottomSectionClosed(false)}
            className="text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <PackageCheck className="w-4 h-4 text-emerald-700" />
            <span>
              Ver Painel de Separação ({activeReservedLogsInPeriod.length} reserva(s))
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
          </button>
        </div>
      )}
    </div>
  );
};
