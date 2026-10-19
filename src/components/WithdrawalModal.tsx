import React, { useState, useEffect, useMemo } from 'react';
import { Gift } from '../types';
import {
  HeartHandshake,
  X,
  Check,
  ShieldAlert,
  AlertTriangle,
  Boxes,
  Plus,
  Trash2,
} from 'lucide-react';

interface WithdrawalItem {
  id: string;
  giftId: string;
  qty: number;
}

interface WithdrawalModalProps {
  isOpen: boolean;
  gifts: Gift[];
  preSelectedGiftId?: string;
  onClose: () => void;
  onSubmit: (
    giftId: string,
    qty: number,
    person: string,
    reason: string,
    customDate?: string,
    reserved?: string
  ) => void;
  onBatchSubmit?: (
    items: Array<{ giftId: string; qty: number }>,
    person: string,
    reason: string,
    customDate?: string,
    reserved?: string
  ) => void;
}

// Function to check if a gift requires manager authorization
export function requiresManagerApproval(giftName?: string): boolean {
  if (!giftName) return false;
  const normalized = giftName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const isGuardaSol = normalized.includes('guarda') && normalized.includes('sol');
  const isPrensaFrancesa =
    normalized.includes('prensa') ||
    (normalized.includes('francesa') && normalized.includes('prensa'));

  return isGuardaSol || isPrensaFrancesa;
}

// Function to check if a gift should trigger a special low stock warning pop-up
export function isLowStockWarningGift(giftName?: string): boolean {
  if (!giftName) return false;
  const normalized = giftName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const isLancheira = normalized.includes('lancheira');
  const isBloquinho = normalized.includes('bloquinh') || normalized.startsWith('bloco');

  return isLancheira || isBloquinho;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  isOpen,
  gifts,
  preSelectedGiftId,
  onClose,
  onSubmit,
  onBatchSubmit,
}) => {
  // Items list: starts with 1 item, user can add more to form a kit
  const [items, setItems] = useState<WithdrawalItem[]>([
    { id: 'item_1', giftId: '', qty: 1 },
  ]);

  // Shared fields
  const [person, setPerson] = useState('');
  const [reason, setReason] = useState('');
  const [withdrawalDate, setWithdrawalDate] = useState('');
  const [isReserved, setIsReserved] = useState<boolean>(false);
  const [reservedNote, setReservedNote] = useState('');

  // Pop-up alert state for manager approval
  const [showApprovalNotice, setShowApprovalNotice] = useState<boolean>(false);
  const [approvedGiftName, setApprovedGiftName] = useState<string>('');

  // Pop-up alert state for low stock warning (Lancheira térmica / Bloquinho)
  const [showLowStockNotice, setShowLowStockNotice] = useState<boolean>(false);
  const [lowStockGiftName, setLowStockGiftName] = useState<string>('');

  const sortedGifts = useMemo(() => {
    return [...gifts].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [gifts]);

  // Check if any item in the list requires manager approval
  const itemsNeedingApproval = useMemo(() => {
    return items
      .map((it) => gifts.find((g) => g.id === it.giftId))
      .filter((g): g is Gift => !!g && requiresManagerApproval(g.name));
  }, [items, gifts]);

  useEffect(() => {
    if (isOpen) {
      let targetId = '';
      if (preSelectedGiftId && sortedGifts.some((g) => g.id === preSelectedGiftId)) {
        targetId = preSelectedGiftId;
      } else if (sortedGifts.length > 0) {
        const available = sortedGifts.find((g) => g.stock > 0) || sortedGifts[0];
        targetId = available.id;
      }

      setItems([{ id: 'item_' + Date.now(), giftId: targetId, qty: 1 }]);
      setPerson('');
      setReason('');
      setWithdrawalDate(new Date().toISOString().split('T')[0]);
      setIsReserved(false);
      setReservedNote('');

      // Check pop-up triggers for pre-selected gift
      const selectedGift = gifts.find((g) => g.id === targetId);
      if (selectedGift && requiresManagerApproval(selectedGift.name)) {
        setApprovedGiftName(selectedGift.name);
        setShowApprovalNotice(true);
        setShowLowStockNotice(false);
      } else if (selectedGift && isLowStockWarningGift(selectedGift.name)) {
        setLowStockGiftName(selectedGift.name);
        setShowLowStockNotice(true);
        setShowApprovalNotice(false);
      } else {
        setShowApprovalNotice(false);
        setShowLowStockNotice(false);
      }
    }
  }, [isOpen, preSelectedGiftId, sortedGifts, gifts]);

  // Handler for updating a gift in the items list
  const handleUpdateGift = (itemId: string, newGiftId: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const giftObj = gifts.find((g) => g.id === newGiftId);
        const maxStock = giftObj ? giftObj.stock : 1;
        return {
          ...it,
          giftId: newGiftId,
          qty: Math.min(it.qty, Math.max(1, maxStock)),
        };
      })
    );

    const chosenGift = gifts.find((g) => g.id === newGiftId);
    if (chosenGift && requiresManagerApproval(chosenGift.name)) {
      setApprovedGiftName(chosenGift.name);
      setShowApprovalNotice(true);
      setShowLowStockNotice(false);
    } else if (chosenGift && isLowStockWarningGift(chosenGift.name)) {
      setLowStockGiftName(chosenGift.name);
      setShowLowStockNotice(true);
      setShowApprovalNotice(false);
    }
  };

  // Handler for updating quantity in the items list
  const handleUpdateQty = (itemId: string, newQty: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const giftObj = gifts.find((g) => g.id === it.giftId);
        const maxStock = giftObj ? giftObj.stock : 1;
        const validQty = Math.max(1, Math.min(newQty, maxStock > 0 ? maxStock : 1));
        return { ...it, qty: validQty };
      })
    );
  };

  // Handler for adding another gift row (montar kit)
  const handleAddGift = () => {
    const selectedIds = new Set(items.map((i) => i.giftId));
    const nextGift =
      sortedGifts.find((g) => !selectedIds.has(g.id) && g.stock > 0) ||
      sortedGifts.find((g) => !selectedIds.has(g.id)) ||
      sortedGifts[0];

    if (!nextGift) return;

    setItems((prev) => [
      ...prev,
      {
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        giftId: nextGift.id,
        qty: 1,
      },
    ]);

    if (requiresManagerApproval(nextGift.name)) {
      setApprovedGiftName(nextGift.name);
      setShowApprovalNotice(true);
    }
  };

  // Handler for removing a gift row
  const handleRemoveGift = (itemId: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!person.trim() || !reason.trim()) return;

    const validItems = items.filter((it) => it.giftId && it.qty >= 1);
    if (validItems.length === 0) return;

    const reservedText = isReserved
      ? reservedNote.trim()
        ? `Sim (${reservedNote.trim()})`
        : 'Sim'
      : 'Não';

    if (validItems.length === 1) {
      onSubmit(
        validItems[0].giftId,
        validItems[0].qty,
        person.trim(),
        reason.trim(),
        withdrawalDate,
        reservedText
      );
    } else if (onBatchSubmit) {
      onBatchSubmit(
        validItems.map((it) => ({ giftId: it.giftId, qty: it.qty })),
        person.trim(),
        reason.trim(),
        withdrawalDate,
        reservedText
      );
    } else {
      validItems.forEach((it) => {
        onSubmit(it.giftId, it.qty, person.trim(), reason.trim(), withdrawalDate, reservedText);
      });
    }
  };

  if (!isOpen) return null;

  // Dedicated Low Stock Alert Popup
  if (showLowStockNotice) {
    return (
      <div className="fixed inset-0 bg-brand-charcoal/60 z-50 flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full text-center shadow-2xl border border-stone-100 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center mx-auto shadow-inner">
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-base font-black text-brand-charcoal">
              Atenção: Poucas Unidades!
            </h4>
            <div className="text-xs text-stone-700 font-medium leading-relaxed bg-orange-50/90 p-3.5 rounded-xl border border-orange-200 text-orange-950 space-y-1">
              <p className="font-extrabold text-orange-900 text-sm">
                {lowStockGiftName || 'Brinde com Estoque Baixo'}
              </p>
              <p>
                Temos <strong>poucas unidades</strong> deste brinde disponíveis no estoque. Por favor, utilize com moderação e confirme a necessidade da retirada.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowLowStockNotice(false)}
              className="w-full py-2.5 px-4 bg-brand-forest hover:bg-brand-forest/90 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
            >
              Entendido, prosseguir com a solicitação
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLowStockNotice(false);
                onClose();
              }}
              className="w-full py-2 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
            >
              Voltar e escolher outro brinde
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dedicated Manager Approval Alert Popup
  if (showApprovalNotice) {
    return (
      <div className="fixed inset-0 bg-brand-charcoal/60 z-50 flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full text-center shadow-2xl border border-stone-100 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8 text-amber-700" />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-base font-black text-brand-charcoal">
              Atenção: {approvedGiftName || 'Brinde Especial'}
            </h4>
            <p className="text-xs text-stone-600 font-medium leading-relaxed bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-950">
              "Este brinde precisa da autorização do gestor. Por favor, solicite a aprovação antes de prosseguir."
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowApprovalNotice(false)}
              className="w-full py-2.5 px-4 bg-brand-forest hover:bg-brand-forest/90 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
            >
              Entendido, já tenho / vou solicitar aprovação
            </button>
            <button
              type="button"
              onClick={() => {
                setShowApprovalNotice(false);
                onClose();
              }}
              className="w-full py-2 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
            >
              Voltar e escolher outro brinde
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isKit = items.length > 1;

  return (
    <div className="fixed inset-0 bg-brand-charcoal/60 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Modal Container */}
      <div className="bg-white rounded-3xl max-w-lg w-full card-shadow overflow-hidden border border-stone-100 max-h-[92vh] flex flex-col relative">
        
        {/* Modal Header */}
        <div className="bg-brand-forest p-4 sm:p-5 text-white flex justify-between items-center border-b border-brand-greenMid/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-lime text-brand-charcoal flex items-center justify-center text-lg font-black shrink-0">
              {isKit ? <Boxes className="w-5 h-5" /> : <HeartHandshake className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-black text-base text-white leading-tight">
                {isKit ? 'Solicitar Brindes (Kit)' : 'Solicitar Brinde'}
              </h3>
              <p className="text-[11px] sm:text-xs text-stone-200">
                O estoque será abatido automaticamente ao confirmar.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-300 hover:text-white transition cursor-pointer p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* General Manager Approval Alert if any selected item requires approval */}
          {itemsNeedingApproval.length > 0 && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 flex items-center gap-2.5 text-amber-950 shadow-2xs">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="text-xs font-bold text-amber-900 leading-tight">
                Atenção:{' '}
                <strong>{itemsNeedingApproval.map((g) => g.name).join(', ')}</strong> precisa da
                autorização do gestor para prosseguir.
              </span>
            </div>
          )}

          {/* 1. SELEÇÃO DE BRINDES (com adição fluida de mais itens) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-brand-charcoal flex items-center gap-1.5">
                {isKit ? (
                  <>
                    <Boxes className="w-3.5 h-3.5 text-brand-forest" />
                    <span>1. Brindes do Kit ({items.length} tipos selecionados)</span>
                  </>
                ) : (
                  <span>1. Selecione o Brinde *</span>
                )}
              </label>
            </div>

            {/* Lista unificada e compacta de brindes */}
            <div className="space-y-2">
              {items.map((item, idx) => {
                const giftObj = gifts.find((g) => g.id === item.giftId);
                const maxStock = giftObj ? giftObj.stock : 0;
                const needsApproval = giftObj && requiresManagerApproval(giftObj.name);
                const isLow = giftObj && isLowStockWarningGift(giftObj.name);

                const selectedElsewhere = new Set(
                  items.filter((i) => i.id !== item.id).map((i) => i.giftId)
                );

                return (
                  <div
                    key={item.id}
                    className="p-2.5 sm:p-3 bg-stone-50/90 border border-stone-200/90 rounded-2xl space-y-1.5 transition-all hover:border-brand-forest/30"
                  >
                    {/* Linha Principal: [Número] [Select do Brinde] [Stepper Compacto - 1 +] [Lixeira] */}
                    <div className="flex items-center gap-2">
                      {isKit && (
                        <span className="w-6 h-6 rounded-full bg-brand-forest/10 text-brand-forest text-xs font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                      )}

                      {/* Dropdown do Brinde */}
                      <div className="flex-1 min-w-0">
                        <select
                          value={item.giftId}
                          onChange={(e) => handleUpdateGift(item.id, e.target.value)}
                          required
                          className="w-full px-3 py-2 sm:py-2.5 rounded-xl bg-white text-brand-charcoal font-bold text-xs sm:text-sm border border-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-lime cursor-pointer truncate shadow-2xs"
                        >
                          {sortedGifts.map((g) => {
                            const alreadyInAnother = selectedElsewhere.has(g.id);
                            return (
                              <option
                                key={g.id}
                                value={g.id}
                                disabled={g.stock <= 0 || alreadyInAnother}
                              >
                                {g.name} ({g.stock} un disponív.)
                                {alreadyInAnother ? ' - Já adicionado' : ''}
                                {g.stock <= 0 ? ' - Sem estoque' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Stepper de Quantidade Unificado e Ergonômico */}
                      <div className="flex items-center border border-stone-300 rounded-xl bg-white overflow-hidden shrink-0 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, item.qty - 1)}
                          disabled={item.qty <= 1}
                          className="w-8 h-8 sm:w-9 sm:h-9 text-brand-charcoal hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent font-black text-sm transition flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                          title="Diminuir"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={maxStock > 0 ? maxStock : 1}
                          value={item.qty}
                          onChange={(e) =>
                            handleUpdateQty(item.id, parseInt(e.target.value) || 1)
                          }
                          required
                          className="w-9 sm:w-11 text-center font-black text-xs sm:text-sm text-brand-charcoal border-0 bg-transparent focus:outline-none p-0"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, item.qty + 1)}
                          disabled={item.qty >= maxStock}
                          className="w-8 h-8 sm:w-9 sm:h-9 text-brand-charcoal hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent font-black text-sm transition flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                          title="Aumentar"
                        >
                          +
                        </button>
                      </div>

                      {/* Botão de Remover da Linha (exibido apenas quando há mais de 1 item) */}
                      {isKit && (
                        <button
                          type="button"
                          onClick={() => handleRemoveGift(item.id)}
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                          title="Remover este brinde do kit"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Linha Informativa Compacta: Estoque Disponível e Avisos */}
                    <div className="flex items-center justify-between text-[11px] text-stone-500 px-1 pt-0.5">
                      <span>
                        Disponível em estoque:{' '}
                        <strong className="text-brand-charcoal font-bold">{maxStock} un</strong>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {needsApproval && (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-1.5 py-0.2 rounded-md">
                            Requer Gestor
                          </span>
                        )}
                        {isLow && (
                          <span className="bg-orange-100 text-orange-900 border border-orange-300 text-[10px] font-black px-1.5 py-0.2 rounded-md">
                            Estoque Baixo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Botão sutil e direto para adicionar mais brindes */}
            <button
              type="button"
              onClick={handleAddGift}
              disabled={items.length >= sortedGifts.filter((g) => g.stock > 0).length}
              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-brand-forest/40 hover:border-brand-forest bg-stone-50 hover:bg-brand-forest/5 text-brand-forest text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group active:scale-[0.99]"
            >
              <Plus className="w-4 h-4 text-brand-forest group-hover:scale-110 transition-transform" />
              <span>
                {isKit
                  ? '+ Adicionar outro brinde a este kit'
                  : '+ Adicionar mais um brinde (Montar kit)'}
              </span>
            </button>
          </div>

          {/* 2. Deseja Reservar para Separar? */}
          <div>
            <label className="block text-xs font-extrabold text-brand-charcoal mb-1">
              2. Deseja Reservar para Separar? *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsReserved(false)}
                className={`py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  !isReserved
                    ? 'bg-stone-200 text-brand-charcoal border-stone-400 font-black'
                    : 'bg-stone-50 text-brand-greyMid border-stone-300 hover:bg-stone-100'
                }`}
              >
                Não (Retirada Imediata)
              </button>
              <button
                type="button"
                onClick={() => setIsReserved(true)}
                className={`py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  isReserved
                    ? 'bg-emerald-100 text-emerald-950 border-emerald-500 font-black shadow-xs ring-2 ring-emerald-400/30'
                    : 'bg-stone-50 text-brand-greyMid border-stone-300 hover:bg-stone-100'
                }`}
              >
                Sim (Reserva / Separar)
              </button>
            </div>
          </div>

          {isReserved && (
            <div className="animate-in fade-in duration-150 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200">
              <label className="block text-xs font-extrabold text-emerald-900 mb-1">
                Detalhes da Reserva / Data para Entrega (Opcional)
              </label>
              <input
                type="text"
                value={reservedNote}
                onChange={(e) => setReservedNote(e.target.value)}
                placeholder="Ex: Separar para o evento de Quinta-feira / Entrega dia 25"
                className="w-full px-4 py-2.5 rounded-xl bg-white text-emerald-950 font-medium text-xs border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* 3. Data da Retirada */}
          <div>
            <label className="block text-xs font-extrabold text-brand-charcoal mb-1">
              3. Data da Retirada *
            </label>
            <input
              type="date"
              value={withdrawalDate}
              onChange={(e) => setWithdrawalDate(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-stone-50 text-brand-charcoal font-medium text-xs sm:text-sm border border-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-lime"
            />
          </div>

          {/* 4. Pessoa / Setor Retirando */}
          <div>
            <label className="block text-xs font-extrabold text-brand-charcoal mb-1">
              4. Pessoa / Setor Retirando *
            </label>
            <input
              type="text"
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              required
              placeholder="Ex: Taís (Executiva), Renan (Comercial) ou Hêrika (RH)..."
              className="w-full px-4 py-2.5 rounded-xl bg-stone-50 text-brand-charcoal font-medium text-xs sm:text-sm border border-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-lime"
            />
          </div>

          {/* 5. Motivo / Corretora ou Evento */}
          <div>
            <label className="block text-xs font-extrabold text-brand-charcoal mb-1">
              5. Motivo / Corretora ou Evento *
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="Ex: Visita Safe Corretora, Reunião de Diretoria, Onboarding..."
              className="w-full px-4 py-2.5 rounded-xl bg-stone-50 text-brand-charcoal font-medium text-xs sm:text-sm border border-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-lime"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-brand-greyMid hover:bg-stone-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-black bg-brand-lime hover:bg-brand-greenMid text-brand-charcoal hover:text-white shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isKit ? 'Confirmar Saída do Kit' : 'Confirmar Solicitação'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
