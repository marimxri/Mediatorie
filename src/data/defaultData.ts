import { Gift, WithdrawalLog } from '../types';

export const augustDefaultGifts: Gift[] = [
  { id: "aug_2", name: "Agendas OAB", stock: 12, initialStock: 12, minStock: 3, icon: "fa-book" },
  { id: "aug_3", name: "Agendas Inst.", stock: 13, initialStock: 13, minStock: 3, icon: "fa-book-open" },
  { id: "aug_11", name: "Bloquinhos", stock: 25, initialStock: 25, minStock: 5, icon: "fa-note-sticky", description: "Poucas unidades em estoque" },
  { id: "aug_6", name: "Canetas Executivas", stock: 62, initialStock: 62, minStock: 10, icon: "fa-pen-nib" },
  { id: "aug_12", name: "Coração Anti-estresse", stock: 500, initialStock: 500, minStock: 20, icon: "fa-heart" },
  { id: "aug_1", name: "Garrafa térmica", stock: 235, initialStock: 246, minStock: 15, icon: "fa-bottle-water", description: "Brinde exclusivo para a campanha do dado" },
  { id: "aug_10", name: "Guarda Sol", stock: 6, initialStock: 6, minStock: 2, icon: "fa-umbrella-beach" },
  { id: "aug_7", name: "Guarda Chuva", stock: 1, initialStock: 1, minStock: 1, icon: "fa-umbrella" },
  { id: "aug_13", name: "Lancheira térmica", stock: 8, initialStock: 8, minStock: 3, icon: "fa-box-archive", description: "Poucas unidades em estoque" },
  { id: "aug_9", name: "Lápis", stock: 100, initialStock: 100, minStock: 20, icon: "fa-pencil" },
  { id: "aug_5", name: "Mouse-pads", stock: 76, initialStock: 76, minStock: 10, icon: "fa-computer-mouse" },
  { id: "aug_8", name: "Pop Socket", stock: 3, initialStock: 3, minStock: 2, icon: "fa-circle-dot" },
  { id: "aug_4", name: "Porta Celular", stock: 147, initialStock: 147, minStock: 15, icon: "fa-mobile-screen-button" }
];

export const augustDefaultLogs: WithdrawalLog[] = [
  { id: "l_aug1", date: "2026-08-03", dateFormatted: "03/ago", giftName: "Porta Celular", giftId: "aug_4", qtyDisplay: "2", person: "Marcos (Vendas)", reason: "Cliente VIP", reserved: "" },
  { id: "l_aug2", date: "2026-08-05", dateFormatted: "05/ago", giftName: "Agendas OAB", giftId: "aug_2", qtyDisplay: "1", person: "Hêrika (RH)", reason: "Novo Colaborador", reserved: "" },
  { id: "l_aug3", date: "2026-08-11", dateFormatted: "11/ago", giftName: "Garrafa térmica", giftId: "aug_1", qtyDisplay: "5", person: "Taís (Executiva)", reason: "Evento Corporativo", reserved: "" },
  { id: "l_aug4", date: "2026-08-14", dateFormatted: "14/ago", giftName: "Garrafa térmica", giftId: "aug_1", qtyDisplay: "6", person: "Taís (Executiva)", reason: "Campanha Dado", reserved: "" },
  { id: "l_aug5", date: "2026-08-18", dateFormatted: "18/ago", giftName: "Canetas Executivas", giftId: "aug_6", qtyDisplay: "10", person: "Júlia (Comercial)", reason: "Visita Cliente", reserved: "" },
  { id: "l_aug6", date: "2026-08-20", dateFormatted: "20/ago", giftName: "Bloquinhos", giftId: "aug_11", qtyDisplay: "5", person: "Hêrika (RH)", reason: "Integração equipe", reserved: "" },
  { id: "l1", date: "2026-07-01", dateFormatted: "01/jul", giftName: "Agenda 2026", giftId: "aug_3", qtyDisplay: "5", person: "Hêrika (RH)", reason: "Interno", reserved: "" },
  { id: "l2", date: "2026-07-06", dateFormatted: "06/jul", giftName: "Panfletos", giftId: "", qtyDisplay: "3", person: "Júlia (Comercial)", reason: "Safe corretora", reserved: "" },
  { id: "l3", date: "2026-07-09", dateFormatted: "09/jul", giftName: "Agenda 2026", giftId: "aug_3", qtyDisplay: "3", person: "Léo (Coordenação)", reason: "Reunião de alinhamento", reserved: "" },
  { id: "l4", date: "2026-07-09", dateFormatted: "09/jul", giftName: "Porta vinho 1", giftId: "", qtyDisplay: "1", person: "Taís (Executiva)", reason: "Nexora", reserved: "" },
  { id: "l5", date: "2026-07-13", dateFormatted: "13/jul", giftName: "Copo Café", giftId: "", qtyDisplay: "5", person: "Taís (Executiva)", reason: "Visita corretora", reserved: "" },
  { id: "l6", date: "2026-07-13", dateFormatted: "13/jul", giftName: "Copo", giftId: "", qtyDisplay: "3", person: "Taís (Executiva)", reason: "Visita corretora", reserved: "" }
];

export function normalizeGiftsInitialStock(gifts: Gift[], logs: WithdrawalLog[] = []): Gift[] {
  return gifts.map((g) => {
    let updatedName = g.name;
    let description = g.description;
    let stock = g.stock;

    if (updatedName.toLowerCase().includes('cab')) {
      updatedName = updatedName.replace(/cab/i, 'OAB');
    }

    if (
      updatedName.toLowerCase() === 'garrafas' ||
      updatedName.toLowerCase() === 'garrafa' ||
      updatedName.toLowerCase() === 'garrafa termica' ||
      updatedName.toLowerCase() === 'garrafas térmicas' ||
      updatedName.toLowerCase() === 'garrafas termicas'
    ) {
      updatedName = 'Garrafa térmica';
      if (!description) {
        description = 'Brinde exclusivo para a campanha do dado';
      }
      if (stock === 2 || stock === 35 || stock === 246) {
        stock = 235;
      }
    }

    let initialStock = g.initialStock;
    if (
      initialStock === undefined ||
      initialStock === null ||
      (g.id === 'aug_1' && (initialStock === 2 || initialStock === 35 || initialStock === 246)) ||
      (updatedName.toLowerCase() === 'garrafa térmica' && (initialStock === 2 || initialStock === 35 || initialStock === 246))
    ) {
      const totalWithdrawn = logs
        .filter((l) => l.giftId === g.id || l.giftName.toLowerCase() === g.name.toLowerCase() || l.giftName.toLowerCase() === updatedName.toLowerCase())
        .reduce((sum, l) => sum + (parseInt(l.qtyDisplay) || 0), 0);

      const defaultMatch = augustDefaultGifts.find(
        (def) => def.id === g.id || def.name.toLowerCase() === updatedName.toLowerCase()
      );

      initialStock = defaultMatch?.initialStock ?? (stock + totalWithdrawn);
    }

    return {
      ...g,
      name: updatedName,
      description,
      stock,
      initialStock,
    };
  }).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
