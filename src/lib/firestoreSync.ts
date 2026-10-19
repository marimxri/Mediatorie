import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Gift, WithdrawalLog } from '../types';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export let db: Firestore | null = null;

try {
  const customDbId = (firebaseConfig as Record<string, unknown>).firestoreDatabaseId as string | undefined;
  if (customDbId) {
    db = getFirestore(app, customDbId);
  } else {
    db = getFirestore(app);
  }
} catch (e) {
  console.warn('Firestore não está disponível. Usando sincronização via LocalStorage/BroadcastChannel.', e);
  db = null;
}

// BroadcastChannel para sincronização instantânea entre abas no mesmo navegador
const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cristal_brindes_sync') : null;

export function notifyCrossTabChange(type: 'gifts' | 'logs', data: unknown) {
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type, data });
    } catch (e) {
      console.warn('Erro ao postar mensagem no BroadcastChannel:', e);
    }
  }
}

export function subscribeToCrossTab(
  onGifts: (gifts: Gift[]) => void,
  onLogs: (logs: WithdrawalLog[]) => void
) {
  if (!syncChannel) return () => {};

  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'gifts') {
      onGifts(event.data.data);
    } else if (event.data?.type === 'logs') {
      onLogs(event.data.data);
    }
  };

  syncChannel.addEventListener('message', handleMessage);
  return () => {
    syncChannel.removeEventListener('message', handleMessage);
  };
}

/**
 * Real-time subscription to Gifts collection in Firestore
 */
export function subscribeToGifts(
  onGiftsUpdate: (gifts: Gift[]) => void,
  initialDefaults?: Gift[]
) {
  if (!db) {
    try {
      const stored = localStorage.getItem('cristal_gifts');
      let list: Gift[] = [];
      if (stored) {
        list = JSON.parse(stored);
        if (initialDefaults) {
          const missing = initialDefaults.filter(
            (def) => !list.some((g) => g.id === def.id || g.name.toLowerCase() === def.name.toLowerCase())
          );
          if (missing.length > 0) {
            list = [...list, ...missing];
            localStorage.setItem('cristal_gifts', JSON.stringify(list));
          }
        }
      } else if (initialDefaults) {
        list = initialDefaults;
      }
      onGiftsUpdate(list);
    } catch {}
    return () => {};
  }

  const giftsCol = collection(db, 'gifts');

  return onSnapshot(
    giftsCol,
    async (snapshot) => {
      if (snapshot.empty && initialDefaults && initialDefaults.length > 0) {
        await seedGifts(initialDefaults);
        return;
      }

      let giftsList: Gift[] = snapshot.docs.map((d) => d.data() as Gift);

      if (initialDefaults) {
        const missing = initialDefaults.filter(
          (def) => !giftsList.some((g) => g.id === def.id || g.name.toLowerCase() === def.name.toLowerCase())
        );
        if (missing.length > 0) {
          missing.forEach((item) => {
            saveGiftToFirestore(item);
          });
          giftsList = [...giftsList, ...missing];
        }
      }

      onGiftsUpdate(giftsList);
    },
    (err) => {
      console.warn('Erro na sincronização Firestore dos brindes (operando em modo offline/cache):', err.message || err);
      try {
        const stored = localStorage.getItem('cristal_gifts');
        if (stored) {
          onGiftsUpdate(JSON.parse(stored));
        } else if (initialDefaults) {
          onGiftsUpdate(initialDefaults);
        }
      } catch {}
    }
  );
}

/**
 * Real-time subscription to Withdrawal Logs collection in Firestore
 */
export function subscribeToLogs(
  onLogsUpdate: (logs: WithdrawalLog[]) => void,
  initialDefaults?: WithdrawalLog[]
) {
  if (!db) {
    try {
      const stored = localStorage.getItem('cristal_history');
      if (stored) {
        onLogsUpdate(JSON.parse(stored));
      } else if (initialDefaults) {
        onLogsUpdate(initialDefaults);
      }
    } catch {}
    return () => {};
  }

  const logsCol = collection(db, 'withdrawalLogs');

  return onSnapshot(
    logsCol,
    async (snapshot) => {
      if (snapshot.empty && initialDefaults && initialDefaults.length > 0) {
        await seedLogs(initialDefaults);
        return;
      }

      const logsList: WithdrawalLog[] = snapshot.docs.map((d) => d.data() as WithdrawalLog);
      logsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onLogsUpdate(logsList);
    },
    (err) => {
      console.warn('Erro na sincronização Firestore dos históricos (operando em modo offline/cache):', err.message || err);
      try {
        const stored = localStorage.getItem('cristal_history');
        if (stored) {
          onLogsUpdate(JSON.parse(stored));
        } else if (initialDefaults) {
          onLogsUpdate(initialDefaults);
        }
      } catch {}
    }
  );
}

export function cleanGiftForFirestore(gift: Gift): Record<string, unknown> {
  const data: Record<string, unknown> = {
    id: gift.id,
    name: gift.name || '',
    stock: typeof gift.stock === 'number' ? gift.stock : (Number(gift.stock) || 0),
    minStock: typeof gift.minStock === 'number' ? gift.minStock : (Number(gift.minStock) || 0),
    icon: gift.icon || 'fa-gift',
  };

  if (gift.initialStock !== undefined && gift.initialStock !== null) {
    data.initialStock = Number(gift.initialStock);
  }
  if (gift.description !== undefined && gift.description !== null && gift.description.trim() !== '') {
    data.description = gift.description.trim();
  }

  return data;
}

export function cleanLogForFirestore(log: WithdrawalLog): Record<string, unknown> {
  return {
    id: log.id,
    date: log.date || '',
    dateFormatted: log.dateFormatted || '',
    giftName: log.giftName || '',
    giftId: log.giftId || '',
    qtyDisplay: String(log.qtyDisplay || '0'),
    person: log.person || '',
    reason: log.reason || '',
    reserved: log.reserved || '',
  };
}

export async function saveGiftToFirestore(gift: Gift) {
  if (!db) return;
  try {
    const cleanData = cleanGiftForFirestore(gift);
    await setDoc(doc(db, 'gifts', gift.id), cleanData);
  } catch (err) {
    console.warn('Erro ao salvar brinde no Firestore:', err);
  }
}

export async function deleteGiftFromFirestore(giftId: string) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'gifts', giftId));
  } catch (err) {
    console.warn('Erro ao deletar brinde do Firestore:', err);
  }
}

export async function saveWithdrawalLogToFirestore(log: WithdrawalLog) {
  if (!db) return;
  try {
    const cleanData = cleanLogForFirestore(log);
    await setDoc(doc(db, 'withdrawalLogs', log.id), cleanData);
  } catch (err) {
    console.warn('Erro ao salvar log no Firestore:', err);
  }
}

export async function deleteLogFromFirestore(logId: string) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'withdrawalLogs', logId));
  } catch (err) {
    console.warn('Erro ao remover log do Firestore:', err);
  }
}

export async function seedGifts(gifts: Gift[]) {
  if (!db) return;
  try {
    const batch = writeBatch(db);
    for (const gift of gifts) {
      const ref = doc(db, 'gifts', gift.id);
      batch.set(ref, cleanGiftForFirestore(gift));
    }
    await batch.commit();
  } catch (err) {
    console.warn('Erro ao semear brindes iniciais:', err);
  }
}

export async function seedLogs(logs: WithdrawalLog[]) {
  if (!db) return;
  try {
    const batch = writeBatch(db);
    for (const log of logs) {
      const ref = doc(db, 'withdrawalLogs', log.id);
      batch.set(ref, cleanLogForFirestore(log));
    }
    await batch.commit();
  } catch (err) {
    console.warn('Erro ao semear logs iniciais:', err);
  }
}
