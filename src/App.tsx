import React, { useState, useEffect } from 'react';
import { Gift, WithdrawalLog, TabType, ToastMessage } from './types';
import { augustDefaultGifts, augustDefaultLogs, normalizeGiftsInitialStock } from './data/defaultData';
import { Navbar } from './components/Navbar';
import { StatsOverview } from './components/StatsOverview';
import { CatalogTab } from './components/CatalogTab';
import { SpreadsheetTab } from './components/SpreadsheetTab';
import { ManagementTab } from './components/ManagementTab';
import { ManagementLockScreen } from './components/ManagementLockScreen';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { WithdrawalModal } from './components/WithdrawalModal';
import { AddGiftModal } from './components/AddGiftModal';
import { EditStockModal } from './components/EditStockModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ToastContainer } from './components/ToastContainer';
import { EmailWebhookModal } from './components/EmailWebhookModal';
import { IntegrationsCard } from './components/IntegrationsCard';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, getAccessToken } from './lib/googleAuth';
import { createOrSyncGoogleSheet, importFromGoogleSheets } from './lib/googleSheets';
import { sendWithdrawalNotification } from './lib/webhookNotification';
import {
  subscribeToGifts,
  subscribeToLogs,
  saveGiftToFirestore,
  deleteGiftFromFirestore,
  saveWithdrawalLogToFirestore,
  deleteLogFromFirestore,
  seedGifts,
  seedLogs,
  subscribeToCrossTab,
  notifyCrossTabChange,
} from './lib/firestoreSync';

export default function App() {
  // Main state
  const [gifts, setGifts] = useState<Gift[]>(() => {
    try {
      const stored = localStorage.getItem('cristal_gifts');
      if (stored) {
        const parsed = JSON.parse(stored);
        const hasLancheira = parsed.some((g: Gift) => g.name.toLowerCase().includes('lancheira'));
        const merged = hasLancheira
          ? parsed
          : [...parsed, augustDefaultGifts.find((g) => g.id === 'aug_13')!].filter(Boolean);
        return normalizeGiftsInitialStock(merged);
      }
    } catch {}
    return augustDefaultGifts;
  });
  const [historyLogs, setHistoryLogs] = useState<WithdrawalLog[]>(() => {
    try {
      const stored = localStorage.getItem('cristal_history');
      if (stored) return JSON.parse(stored);
    } catch {}
    return augustDefaultLogs;
  });
  const [activeTab, setActiveTab] = useState<TabType>('vitrine');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const currentYyyyMm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return currentYyyyMm;
  });

  // Google Sheets integration state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() => localStorage.getItem('cristal_sheets_id'));
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(() => localStorage.getItem('cristal_sheets_url'));
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);

  // Modals state
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  const [preSelectedGiftId, setPreSelectedGiftId] = useState<string | undefined>(undefined);

  const [isAddGiftOpen, setIsAddGiftOpen] = useState(false);

  const [isEditStockOpen, setIsEditStockOpen] = useState(false);
  const [editingGift, setEditingGift] = useState<Gift | undefined>(undefined);
  const [isEmailSettingsOpen, setIsEmailSettingsOpen] = useState(false);

  // Management Password Protection state
  const [isManagementUnlocked, setIsManagementUnlocked] = useState(false);
  const [managementPassword, setManagementPassword] = useState<string>(
    () => localStorage.getItem('cristal_gestao_password') || '1234'
  );
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Management Password Handlers
  const handleUnlockManagement = (enteredPass: string): boolean => {
    if (enteredPass === managementPassword) {
      setIsManagementUnlocked(true);
      showToast('Acesso à Gestão liberado!', 'success');
      return true;
    }
    return false;
  };

  const handleLockManagement = () => {
    setIsManagementUnlocked(false);
    showToast('Aba de Gestão bloqueada.', 'info');
  };

  const handleChangePassword = (currentPass: string, newPass: string): boolean => {
    if (currentPass !== managementPassword) {
      return false;
    }
    setManagementPassword(newPass);
    localStorage.setItem('cristal_gestao_password', newPass);
    showToast('Senha de gestão alterada com sucesso!', 'success');
    return true;
  };
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Toast notifications state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Show Toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = "t_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Real-time Firestore Sync & Cross-tab broadcast sync
  useEffect(() => {
    const unsubGifts = subscribeToGifts((firestoreGifts) => {
      const hasLancheira = firestoreGifts.some((g: Gift) => g.name.toLowerCase().includes('lancheira'));
      const merged = hasLancheira
        ? firestoreGifts
        : [...firestoreGifts, augustDefaultGifts.find((g) => g.id === 'aug_13')!].filter(Boolean);
      const normalized = normalizeGiftsInitialStock(merged, historyLogs);
      setGifts(normalized);
      localStorage.setItem('cristal_gifts', JSON.stringify(normalized));
    }, augustDefaultGifts);

    const unsubLogs = subscribeToLogs((firestoreLogs) => {
      const sanitizedLogs = firestoreLogs.map((log) => ({
        ...log,
        giftName: log.giftName.replace(/cab/i, 'OAB'),
      }));
      setHistoryLogs(sanitizedLogs);
      localStorage.setItem('cristal_history', JSON.stringify(sanitizedLogs));
      setGifts((prevGifts) => normalizeGiftsInitialStock(prevGifts, sanitizedLogs));
    }, augustDefaultLogs);

    const unsubCross = subscribeToCrossTab(
      (crossGifts) => setGifts(normalizeGiftsInitialStock(crossGifts, historyLogs)),
      (crossLogs) => setHistoryLogs(crossLogs)
    );

    return () => {
      unsubGifts();
      unsubLogs();
      unsubCross();
    };
  }, []);

  // Listen to Google Auth State
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        // Auto sync if user is connected
        syncWithGoogleSheets(token, gifts, historyLogs);
      },
      () => {
        setGoogleUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Sync helper function
  const syncWithGoogleSheets = async (
    token?: string,
    currentGifts: Gift[] = gifts,
    currentLogs: WithdrawalLog[] = historyLogs
  ) => {
    try {
      const accessToken = token || (await getAccessToken());
      if (!accessToken) return;

      setIsSyncingSheets(true);
      const result = await createOrSyncGoogleSheet(
        accessToken,
        spreadsheetId,
        currentGifts,
        currentLogs
      );

      setSpreadsheetId(result.spreadsheetId);
      setSpreadsheetUrl(result.spreadsheetUrl);
      localStorage.setItem('cristal_sheets_id', result.spreadsheetId);
      localStorage.setItem('cristal_sheets_url', result.spreadsheetUrl);
    } catch (err: any) {
      console.error('Erro na sincronização com Google Sheets:', err);
    } finally {
      setIsSyncingSheets(false);
    }
  };

  // Função utilitária para sincronização automática em segundo plano com o Google Sheets
  const autoSyncToGoogleSheets = async (currentGifts: Gift[], currentLogs: WithdrawalLog[]) => {
    const token = await getAccessToken();
    if (token) {
      try {
        await syncWithGoogleSheets(token, currentGifts, currentLogs);
      } catch (err) {
        console.warn('Auto-sync Google Sheets em segundo plano:', err);
      }
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        showToast(`Conectado como ${res.user.displayName || res.user.email}!`);
        await syncWithGoogleSheets(res.accessToken, gifts, historyLogs);
        showToast('Planilha sincronizada no seu Google Drive!');
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        showToast('Login cancelado.', 'info');
      } else {
        console.error('Falha ao conectar com Google:', err);
        showToast('Falha no login com Google.', 'error');
      }
    }
  };

  const handleManualSyncGoogleSheets = async () => {
    const token = await getAccessToken();
    if (!token) {
      await handleConnectGoogle();
      return;
    }
    await syncWithGoogleSheets(token, gifts, historyLogs);
    showToast(`Planilha atualizada com sucesso! (${gifts.length} brindes e ${historyLogs.length} retiradas sincronizadas)`);
  };

  const handlePullFromGoogleSheets = async () => {
    if (!spreadsheetId) {
      showToast('Nenhuma planilha vinculada encontrada.', 'error');
      return;
    }
    const token = await getAccessToken();
    if (!token) {
      await handleConnectGoogle();
      return;
    }
    try {
      setIsSyncingSheets(true);
      const data = await importFromGoogleSheets(token, spreadsheetId);
      if (data) {
        if (data.gifts.length > 0) {
          setGifts(data.gifts);
          localStorage.setItem('cristal_gifts', JSON.stringify(data.gifts));
        }
        if (data.logs.length > 0) {
          setHistoryLogs(data.logs);
          localStorage.setItem('cristal_history', JSON.stringify(data.logs));
        }
        showToast('Dados da planilha do Google Sheets importados com sucesso!');
      } else {
        showToast('Não foi possível ler os dados da planilha.', 'error');
      }
    } catch {
      showToast('Erro ao importar dados da planilha.', 'error');
    } finally {
      setIsSyncingSheets(false);
    }
  };

  // Save to LocalStorage and Firestore whenever state updates & sync if connected
  const updateGiftsAndSave = (newGifts: Gift[]) => {
    const sorted = [...newGifts].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    setGifts(sorted);
    localStorage.setItem('cristal_gifts', JSON.stringify(sorted));
    sorted.forEach((g) => saveGiftToFirestore(g));
    notifyCrossTabChange('gifts', sorted);
    syncWithGoogleSheets(undefined, sorted, historyLogs);
  };

  const updateHistoryAndSave = (newHistory: WithdrawalLog[]) => {
    setHistoryLogs(newHistory);
    localStorage.setItem('cristal_history', JSON.stringify(newHistory));
    newHistory.forEach((l) => saveWithdrawalLogToFirestore(l));
    notifyCrossTabChange('logs', newHistory);
    syncWithGoogleSheets(undefined, gifts, newHistory);
  };

  // Actions
  const handleOpenWithdrawalModal = (giftId?: string) => {
    setPreSelectedGiftId(giftId);
    setIsWithdrawalOpen(true);
  };

  const handleWithdrawalSubmit = (
    giftId: string,
    qty: number,
    person: string,
    reason: string,
    customDate?: string,
    reservedVal?: string
  ) => {
    const targetGift = gifts.find((g) => g.id === giftId);
    if (!targetGift) return;

    if (qty > targetGift.stock) {
      showToast(`Estoque insuficiente! Você pediu ${qty}x, mas só existem ${targetGift.stock}x.`, 'error');
      return;
    }

    // Deduct stock
    const updatedGifts = gifts.map((g) =>
      g.id === giftId ? { ...g, stock: g.stock - qty } : g
    );
    updateGiftsAndSave(updatedGifts);

    // Format date
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    let dateObj = new Date();
    if (customDate) {
      const parts = customDate.split('-');
      if (parts.length === 3) {
        dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
    }

    const dayFormatted = String(dateObj.getDate()).padStart(2, '0');
    const dateFormatted = `${dayFormatted}/${months[dateObj.getMonth()]}`;

    const newLog: WithdrawalLog = {
      id: 'log_' + Date.now(),
      date: customDate || new Date().toISOString().split('T')[0],
      dateFormatted,
      giftName: targetGift.name,
      giftId: targetGift.id,
      qtyDisplay: String(qty),
      person,
      reason,
      reserved: reservedVal || 'Não',
    };

    const updatedHistory = [newLog, ...historyLogs];
    updateHistoryAndSave(updatedHistory);

    // Sincronização automática em segundo plano com a planilha do Google
    autoSyncToGoogleSheets(updatedGifts, updatedHistory);

    // Disparo instantâneo do e-mail de notificação (Google Web App / Outlook)
    sendWithdrawalNotification({
      event: 'withdrawal',
      timestamp: `${dayFormatted}/${months[dateObj.getMonth()]} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      giftName: targetGift.name,
      qty,
      person,
      reason,
      reserved: reservedVal || 'Não',
      currentStock: targetGift.stock - qty,
      minStock: targetGift.minStock,
    });

    setIsWithdrawalOpen(false);
    showToast(`Solicitação realizada! ${qty}x ${targetGift.name} abatidos do estoque.`);
  };

  const handleBatchWithdrawalSubmit = (
    items: Array<{ giftId: string; qty: number }>,
    person: string,
    reason: string,
    customDate?: string,
    reservedVal?: string
  ) => {
    if (!items || items.length === 0) return;

    // Verify all items have enough stock
    for (const item of items) {
      const targetGift = gifts.find((g) => g.id === item.giftId);
      if (!targetGift) return;
      if (item.qty > targetGift.stock) {
        showToast(
          `Estoque insuficiente para "${targetGift.name}"! Você pediu ${item.qty}x, mas só existem ${targetGift.stock}x.`,
          'error'
        );
        return;
      }
    }

    // Build deduction map
    const deductMap: Record<string, number> = {};
    items.forEach((it) => {
      deductMap[it.giftId] = (deductMap[it.giftId] || 0) + it.qty;
    });

    const updatedGifts = gifts.map((g) => {
      const toDeduct = deductMap[g.id] || 0;
      return toDeduct > 0 ? { ...g, stock: Math.max(0, g.stock - toDeduct) } : g;
    });
    updateGiftsAndSave(updatedGifts);

    // Format date
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    let dateObj = new Date();
    if (customDate) {
      const parts = customDate.split('-');
      if (parts.length === 3) {
        dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
    }

    const dayFormatted = String(dateObj.getDate()).padStart(2, '0');
    const dateFormatted = `${dayFormatted}/${months[dateObj.getMonth()]}`;

    const baseTime = Date.now();
    const newLogs: WithdrawalLog[] = items.map((it, idx) => {
      const targetGift = gifts.find((g) => g.id === it.giftId)!;
      return {
        id: 'log_' + (baseTime + idx),
        date: customDate || new Date().toISOString().split('T')[0],
        dateFormatted,
        giftName: targetGift.name,
        giftId: targetGift.id,
        qtyDisplay: String(it.qty),
        person,
        reason,
        reserved: reservedVal || 'Não',
      };
    });

    const updatedHistory = [...newLogs, ...historyLogs];
    updateHistoryAndSave(updatedHistory);

    autoSyncToGoogleSheets(updatedGifts, updatedHistory);

    // Send notifications for items
    items.forEach((it) => {
      const targetGift = gifts.find((g) => g.id === it.giftId)!;
      sendWithdrawalNotification({
        event: 'withdrawal',
        timestamp: `${dayFormatted}/${months[dateObj.getMonth()]} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        giftName: targetGift.name,
        qty: it.qty,
        person,
        reason,
        reserved: reservedVal || 'Não',
        currentStock: targetGift.stock - it.qty,
        minStock: targetGift.minStock,
      });
    });

    setIsWithdrawalOpen(false);
    const totalUnits = items.reduce((acc, it) => acc + it.qty, 0);
    showToast(
      `Kit de brindes registrado com sucesso! ${items.length} brindes (${totalUnits} un) para ${person}.`,
      'success'
    );
  };

  const handleAddGiftSubmit = (
    name: string,
    stock: number,
    minStock: number,
    icon: string,
    description?: string
  ) => {
    const newGift: Gift = {
      id: 'g_' + Date.now(),
      name,
      stock,
      initialStock: stock,
      minStock,
      icon,
      description,
    };

    const updatedGifts = [...gifts, newGift];
    updateGiftsAndSave(updatedGifts);
    autoSyncToGoogleSheets(updatedGifts, historyLogs);
    setIsAddGiftOpen(false);
    showToast(`Novo brinde "${name}" cadastrado com sucesso!`);
  };

  const handleOpenEditStock = (giftId: string) => {
    const g = gifts.find((item) => item.id === giftId);
    if (g) {
      setEditingGift(g);
      setIsEditStockOpen(true);
    }
  };

  const handleEditStockSubmit = (
    giftId: string,
    newStock: number,
    newDescription?: string,
    newName?: string,
    newMinStock?: number,
    newInitialStock?: number
  ) => {
    const targetGift = gifts.find((g) => g.id === giftId);
    if (!targetGift) return;

    const updatedGifts = gifts.map((g) =>
      g.id === giftId
        ? {
            ...g,
            name: newName || g.name,
            stock: newStock,
            initialStock: newInitialStock !== undefined ? newInitialStock : (g.initialStock ?? newStock),
            minStock: newMinStock !== undefined ? newMinStock : g.minStock,
            description: newDescription,
          }
        : g
    );
    updateGiftsAndSave(updatedGifts);
    autoSyncToGoogleSheets(updatedGifts, historyLogs);
    setIsEditStockOpen(false);
    showToast(`Brinde "${newName || targetGift.name}" atualizado com sucesso!`);
  };

  const handleDeleteGift = (giftId: string) => {
    const g = gifts.find((item) => item.id === giftId);
    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Brinde',
      message: `Deseja realmente remover "${g?.name || 'este item'}" do cadastro?`,
      onConfirm: () => {
        const updatedGifts = gifts.filter((item) => item.id !== giftId);
        updateGiftsAndSave(updatedGifts);
        deleteGiftFromFirestore(giftId);
        autoSyncToGoogleSheets(updatedGifts, historyLogs);
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        showToast('Brinde removido.');
      },
    });
  };

  const handleDeleteLog = (logId: string) => {
    const logToDelete = historyLogs.find((l) => l.id === logId);
    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Registro',
      message: logToDelete
        ? `Tem certeza que deseja remover a retirada de ${logToDelete.qtyDisplay}x "${logToDelete.giftName}"? A quantidade será devolvida ao estoque.`
        : 'Tem certeza que deseja remover este registro da planilha de retiradas?',
      onConfirm: () => {
        if (logToDelete) {
          const match = logToDelete.qtyDisplay.match(/\d+/);
          const qtyToRestore = match ? parseInt(match[0], 10) : 1;

          const targetGift = gifts.find(
            (g) =>
              (logToDelete.giftId && g.id === logToDelete.giftId) ||
              g.name.trim().toLowerCase() === logToDelete.giftName.trim().toLowerCase()
          );

          if (targetGift) {
            const updatedGifts = gifts.map((g) =>
              g.id === targetGift.id ? { ...g, stock: g.stock + qtyToRestore } : g
            );
            updateGiftsAndSave(updatedGifts);
          }
        }

        const updatedHistory = historyLogs.filter((l) => l.id !== logId);
        updateHistoryAndSave(updatedHistory);
        deleteLogFromFirestore(logId);
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        showToast('Registro excluído e estoque restaurado com sucesso!');
      },
    });
  };

  const handleResetDefaults = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Recarregar Lista de Agosto',
      message: 'Isso redefinirá a lista de brindes para as quantidades anotadas no bloco de notas de Agosto. Deseja continuar?',
      onConfirm: () => {
        seedGifts(augustDefaultGifts);
        seedLogs(augustDefaultLogs);
        updateGiftsAndSave(augustDefaultGifts);
        updateHistoryAndSave(augustDefaultLogs);
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        showToast('Lista do Bloco de Notas de Agosto recarregada!');
      },
    });
  };

  const handleExportCSV = () => {
    let csv = '\uFEFFData;Brinde;Quantidade;Pessoa/Setor retirando;Motivo da retirada;Reservado\n';
    historyLogs.forEach((l) => {
      csv += `"${l.dateFormatted || l.date}";"${l.giftName}";"${l.qtyDisplay}";"${l.person}";"${l.reason || ''}";"${l.reserved || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'Planilha_Retiradas_Agosto.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Planilha CSV baixada!');
  };

  const handleImportLogsCSV = (importedLogs: WithdrawalLog[]) => {
    const updatedHistory = [...importedLogs, ...historyLogs];
    updateHistoryAndSave(updatedHistory);
    showToast(`${importedLogs.length} registro(s) importados da planilha com sucesso!`);
  };

  const handleImportGiftsCSV = (importedGifts: Gift[]) => {
    const map = new Map<string, Gift>();

    // Helper to find matching gift by alias
    const findExistingKey = (rawName: string): string | null => {
      const clean = rawName.trim().toLowerCase();
      if (map.has(clean)) return clean;

      // Check known aliases
      if (
        clean.includes('garrafa') ||
        clean.includes('termica') ||
        clean.includes('térmica')
      ) {
        for (const k of map.keys()) {
          if (k.includes('garrafa')) return k;
        }
      }
      if (clean.includes('agenda') && (clean.includes('oab') || clean.includes('cab'))) {
        for (const k of map.keys()) {
          if (k.includes('oab') || k.includes('cab')) return k;
        }
      }
      if (clean.includes('agenda') && clean.includes('inst')) {
        for (const k of map.keys()) {
          if (k.includes('inst')) return k;
        }
      }
      if (clean.includes('mouse')) {
        for (const k of map.keys()) {
          if (k.includes('mouse')) return k;
        }
      }
      if (clean.includes('caneta')) {
        for (const k of map.keys()) {
          if (k.includes('caneta')) return k;
        }
      }
      if (clean.includes('celular')) {
        for (const k of map.keys()) {
          if (k.includes('celular')) return k;
        }
      }
      if (clean.includes('sol')) {
        for (const k of map.keys()) {
          if (k.includes('sol')) return k;
        }
      }
      if (clean.includes('chuva')) {
        for (const k of map.keys()) {
          if (k.includes('chuva')) return k;
        }
      }
      if (clean.includes('bloco') || clean.includes('bloquinho')) {
        for (const k of map.keys()) {
          if (k.includes('bloco') || k.includes('bloquinho')) return k;
        }
      }
      if (clean.includes('coracao') || clean.includes('coração')) {
        for (const k of map.keys()) {
          if (k.includes('cora') || k.includes('estresse')) return k;
        }
      }

      return null;
    };

    // Index current gifts
    gifts.forEach((g) => {
      map.set(g.name.trim().toLowerCase(), { ...g });
    });

    let updatedCount = 0;
    let addedCount = 0;

    importedGifts.forEach((imported) => {
      const matchKey = findExistingKey(imported.name);
      if (matchKey && map.has(matchKey)) {
        const existing = map.get(matchKey)!;
        map.set(matchKey, {
          ...existing,
          stock: imported.stock,
          initialStock: imported.initialStock !== undefined ? imported.initialStock : (existing.initialStock ?? imported.stock),
          minStock: imported.minStock !== undefined ? imported.minStock : existing.minStock,
          description: imported.description !== undefined ? imported.description : existing.description,
          icon: imported.icon && imported.icon !== 'fa-gift' ? imported.icon : existing.icon,
        });
        updatedCount++;
      } else {
        const newKey = imported.name.trim().toLowerCase();
        map.set(newKey, imported);
        addedCount++;
      }
    });

    const mergedGifts = Array.from(map.values());
    updateGiftsAndSave(mergedGifts);
    showToast(`Estoque atualizado! ${updatedCount} brinde(s) ajustado(s) e ${addedCount} novo(s) cadastrado(s).`);
  };

  return (
    <div className="bg-[#f7f9f6] text-brand-charcoal min-h-screen flex flex-col antialiased selection:bg-brand-lime selection:text-brand-charcoal">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenWithdrawal={() => handleOpenWithdrawalModal()}
        onResetDefaults={handleResetDefaults}
        dbConnected={true}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Tab 1: Catalog */}
        {activeTab === 'vitrine' && (
          <CatalogTab
            gifts={gifts}
            onOpenWithdrawalForGift={handleOpenWithdrawalModal}
          />
        )}

        {/* Tab 2: Spreadsheet */}
        {activeTab === 'planilha' && (
          <SpreadsheetTab
            logs={historyLogs}
            gifts={gifts}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            onDeleteLog={handleDeleteLog}
            onExportCSV={handleExportCSV}
            onImportLogsCSV={handleImportLogsCSV}
            googleUser={googleUser}
            spreadsheetUrl={spreadsheetUrl}
            isSyncingSheets={isSyncingSheets}
            onConnectGoogle={handleConnectGoogle}
            onSyncGoogleSheets={handleManualSyncGoogleSheets}
            onPullGoogleSheets={handlePullFromGoogleSheets}
          />
        )}

        {/* Tab 3: Management */}
        {activeTab === 'gestao' && !isManagementUnlocked && (
          <ManagementLockScreen
            onUnlock={handleUnlockManagement}
            onCancel={() => setActiveTab('vitrine')}
          />
        )}

        {activeTab === 'gestao' && isManagementUnlocked && (
          <div className="space-y-6">
            <ManagementTab
              gifts={gifts}
              history={historyLogs}
              onOpenAddGift={() => setIsAddGiftOpen(true)}
              onOpenEditStock={handleOpenEditStock}
              onDeleteGift={handleDeleteGift}
              onImportGiftsCSV={handleImportGiftsCSV}
              onLockManagement={handleLockManagement}
              onOpenChangePassword={() => setIsChangePasswordOpen(true)}
            />

            {/* Painel de Gráficos e Estatísticas */}
            <StatsOverview gifts={gifts} history={historyLogs} showSummaryCards={true} />

            {/* Central de Integrações e Automações (Embaixo de todos os gráficos) */}
            <IntegrationsCard
              googleUser={googleUser}
              spreadsheetUrl={spreadsheetUrl}
              isSyncingSheets={isSyncingSheets}
              onConnectGoogle={handleConnectGoogle}
              onSyncGoogleSheets={handleManualSyncGoogleSheets}
              onPullGoogleSheets={handlePullFromGoogleSheets}
              onOpenEmailSettings={() => setIsEmailSettingsOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <EmailWebhookModal
        isOpen={isEmailSettingsOpen}
        onClose={() => setIsEmailSettingsOpen(false)}
        showToast={showToast}
      />
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        onChangePassword={handleChangePassword}
      />
      <WithdrawalModal
        isOpen={isWithdrawalOpen}
        gifts={gifts}
        preSelectedGiftId={preSelectedGiftId}
        onClose={() => setIsWithdrawalOpen(false)}
        onSubmit={handleWithdrawalSubmit}
        onBatchSubmit={handleBatchWithdrawalSubmit}
      />

      <AddGiftModal
        isOpen={isAddGiftOpen}
        onClose={() => setIsAddGiftOpen(false)}
        onSubmit={handleAddGiftSubmit}
      />

      <EditStockModal
        isOpen={isEditStockOpen}
        gift={editingGift}
        onClose={() => setIsEditStockOpen(false)}
        onSubmit={handleEditStockSubmit}
      />

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
