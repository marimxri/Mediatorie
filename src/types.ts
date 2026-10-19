export interface Gift {
  id: string;
  name: string;
  stock: number;
  initialStock?: number;
  minStock: number;
  icon: string;
  description?: string;
}

export interface WithdrawalLog {
  id: string;
  date: string;
  dateFormatted: string;
  giftName: string;
  giftId: string;
  qtyDisplay: string;
  person: string;
  reason: string;
  reserved: string;
}

export type CatalogFilter = 'all' | 'available' | 'low' | 'empty';
export type TabType = 'vitrine' | 'planilha' | 'gestao';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
