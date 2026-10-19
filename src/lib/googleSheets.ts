import { Gift, WithdrawalLog } from '../types';

export interface SyncResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

export async function createOrSyncGoogleSheet(
  accessToken: string,
  existingSpreadsheetId: string | null,
  gifts: Gift[],
  logs: WithdrawalLog[]
): Promise<SyncResult> {
  let spreadsheetId = existingSpreadsheetId;

  if (!spreadsheetId) {
    // Create new spreadsheet with 'Estoque de Brindes' as tab 1 and 'Histórico de Retiradas' as tab 2
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: 'Mediatorie - Controle de Estoque',
        },
        sheets: [
          {
            properties: {
              title: 'Estoque de Brindes',
              index: 0,
              gridProperties: { rowCount: Math.max(100, gifts.length + 10), columnCount: 10 },
            },
          },
          {
            properties: {
              title: 'Histórico de Retiradas',
              index: 1,
              gridProperties: { rowCount: Math.max(200, logs.length + 10), columnCount: 10 },
            },
          },
        ],
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(err.error?.message || 'Falha ao criar planilha no Google Sheets');
    }

    const data = await createRes.json();
    spreadsheetId = data.spreadsheetId;
  }

  if (!spreadsheetId) {
    throw new Error('ID da planilha não encontrado');
  }

  // Ensure both tabs exist in case it was created previously with different tab names
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          { addSheet: { properties: { title: 'Estoque de Brindes' } } },
          { addSheet: { properties: { title: 'Histórico de Retiradas' } } },
        ],
      }),
    });
  } catch {
    // Tabs already exist, proceed
  }

  // 1. Prepare 'Estoque de Brindes' rows
  const giftRows = [
    ['Brinde', 'Finalidade / Descrição', 'Estoque Inicial', 'Saldo Atual em Estoque', 'Mínimo Alerta', 'Status'],
    ...gifts.map((g) => [
      g.name,
      g.description || '-',
      g.initialStock ?? g.stock,
      g.stock,
      g.minStock,
      g.stock <= 0 ? 'SEM ESTOQUE' : g.stock <= g.minStock ? 'ESTOQUE BAIXO' : 'OK',
    ]),
  ];

  // 2. Prepare 'Histórico de Retiradas' rows
  const logRows = [
    ['Data', 'Brinde', 'Quantidade', 'Pessoa / Solicitante', 'Motivo / Finalidade', 'Reservado', 'ID Registro'],
    ...logs.map((log) => [
      log.dateFormatted || log.date,
      log.giftName,
      log.qtyDisplay,
      log.person,
      log.reason,
      log.reserved || 'Não',
      log.id,
    ]),
  ];

  // 3. Batch Update values to Google Sheets
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: `'Estoque de Brindes'!A1:F${giftRows.length}`,
            majorDimension: 'ROWS',
            values: giftRows,
          },
          {
            range: `'Histórico de Retiradas'!A1:G${logRows.length}`,
            majorDimension: 'ROWS',
            values: logRows,
          },
        ],
      }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json();
    console.error('Erro no update de valores das abas:', err);
    throw new Error(err.error?.message || 'Erro ao enviar dados para a planilha');
  }

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return {
    spreadsheetId,
    spreadsheetUrl,
  };
}

export async function importFromGoogleSheets(
  accessToken: string,
  spreadsheetId: string
): Promise<{ gifts: Gift[]; logs: WithdrawalLog[] } | null> {
  try {
    // 1. Fetch gifts from 'Estoque de Brindes'
    const giftsRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Estoque%20de%20Brindes!A2:F500`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    // 2. Fetch logs from 'Histórico de Retiradas'
    const logsRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Hist%C3%B3rico%20de%20Retiradas!A2:F1000`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!giftsRes.ok || !logsRes.ok) return null;

    const giftsData = await giftsRes.json();
    const logsData = await logsRes.json();

    const giftsRows: string[][] = giftsData.values || [];
    const logsRows: string[][] = logsData.values || [];

    const importedGifts: Gift[] = giftsRows.map((row, index) => {
      // If 6 cols: [name, desc, initial, stock, minStock, icon]
      // If 4 cols: [name, stock, minStock, icon]
      const hasDescAndInitial = row.length >= 5;
      const name = row[0] || 'Brinde';
      const description = hasDescAndInitial ? row[1] : undefined;
      const initialStock = hasDescAndInitial ? parseInt(row[2], 10) || 0 : undefined;
      const stock = hasDescAndInitial ? parseInt(row[3], 10) || 0 : parseInt(row[1], 10) || 0;
      const minStock = hasDescAndInitial ? parseInt(row[4], 10) || 5 : parseInt(row[2], 10) || 5;
      const icon = hasDescAndInitial ? row[5] || 'fa-gift' : row[3] || 'fa-gift';

      return {
        id: `g_import_${index}_${name}`,
        name,
        description,
        initialStock: initialStock ?? stock,
        stock,
        minStock,
        icon,
      };
    });

    const importedLogs: WithdrawalLog[] = logsRows.map((row, index) => ({
      id: row[5] || `log_import_${index}`,
      date: row[0] || new Date().toISOString(),
      dateFormatted: row[0],
      giftName: row[1] || 'Brinde',
      giftId: '',
      qtyDisplay: row[2] || '1 un',
      person: row[3] || '',
      reason: row[4] || '',
      reserved: '-',
    }));

    return {
      gifts: importedGifts,
      logs: importedLogs,
    };
  } catch (err) {
    console.error('Erro ao importar da planilha:', err);
    return null;
  }
}
