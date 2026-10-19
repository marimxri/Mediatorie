import React, { useState } from 'react';
import { Mail, CheckCircle2, Send, Save, BellRing, Copy, Check, ChevronDown, ChevronUp, X, Code2 } from 'lucide-react';
import { getWebhookUrl, setWebhookUrl, isWebhookEnabled, setWebhookEnabled, sendWithdrawalNotification } from '../lib/webhookNotification';

interface EmailWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var raw = e.postData ? e.postData.contents : "";
    var data = raw ? JSON.parse(raw) : {};
    
    var email = data.recipientEmail || "marina.nascimento@mediatorie.com.br";
    var itemTitle = data.itemTitle || data.giftName || "Brinde";
    var qty = data.quantity || data.qty || 1;
    var person = data.requesterName || data.person || "Colaborador";
    var reason = data.reason || "Não especificado";
    var saldo = data.remainingStock !== undefined ? data.remainingStock : data.currentStock;
    var timestamp = data.timestamp || new Date().toLocaleString("pt-BR");
    var reserved = data.reserved || "Não";
    
    // 1. ATUALIZAR A PLANILHA DO GOOGLE SHEETS AUTOMATICAMENTE
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      if (!ss) {
        // Tenta encontrar a planilha pelo nome Mediatorie ou Cristal
        var possibleNames = [
          "Mediatorie - Controle de Estoque",
          "Mediatorie",
          "Controle de Estoque - Mediatorie",
          "Cristal Brindes - Controle de Estoque"
        ];
        for (var n = 0; n < possibleNames.length; n++) {
          var files = DriveApp.getFilesByName(possibleNames[n]);
          if (files.hasNext()) {
            ss = SpreadsheetApp.open(files.next());
            break;
          }
        }
      }
      
      if (ss) {
        // A. Registrar na aba 'Histórico de Retiradas'
        var sheetHistorico = ss.getSheetByName("Histórico de Retiradas");
        if (!sheetHistorico) {
          sheetHistorico = ss.insertSheet("Histórico de Retiradas");
          sheetHistorico.appendRow(["Data e Hora", "Solicitante / Pessoa", "Brinde", "Quantidade", "Motivo / Finalidade", "Saldo Restante", "Reservado"]);
          sheetHistorico.getRange("A1:G1").setFontWeight("bold").setBackground("#dcfce7");
        }
        sheetHistorico.appendRow([timestamp, person, itemTitle, qty, reason, saldo !== undefined ? saldo : "", reserved]);
        
        // B. Atualizar o saldo na aba 'Estoque' (ou 'Estoque de Brindes')
        var sheetEstoque = ss.getSheetByName("Estoque") || ss.getSheetByName("Estoque de Brindes");
        if (sheetEstoque && saldo !== undefined) {
          var estoqueData = sheetEstoque.getDataRange().getValues();
          for (var i = 1; i < estoqueData.length; i++) {
            if (estoqueData[i][0] && estoqueData[i][0].toString().trim().toLowerCase() === itemTitle.trim().toLowerCase()) {
              // Procura a coluna de Saldo Atual (geralmente coluna 4 ou 3)
              var colSaldo = sheetEstoque.getName() === "Estoque de Brindes" ? 4 : 3;
              sheetEstoque.getRange(i + 1, colSaldo).setValue(saldo);
              break;
            }
          }
        }
      }
    } catch(sheetErr) {
      Logger.log("Erro ao atualizar planilha: " + sheetErr.toString());
    }

    // 2. DISPARAR E-MAIL DE NOTIFICAÇÃO
    var subject = "🎁 Retirada de Brinde: " + itemTitle + " (" + qty + " un)";
    var body = "Olá Marina,\n\n" +
      "Uma nova retirada de brinde foi registrada no sistema Mediatorie Brindes:\n\n" +
      "• Brinde: " + itemTitle + "\n" +
      "• Quantidade: " + qty + " unidade(s)\n" +
      "• Solicitante: " + person + "\n" +
      "• Motivo / Finalidade: " + reason + "\n" +
      (saldo !== undefined ? "• Saldo restante em estoque: " + saldo + " un\n" : "") +
      "• Data e Hora: " + timestamp + "\n\n" +
      "Planilha atualizada automaticamente no Google Drive.\n\n" +
      "Atenciosamente,\nSistema Mediatorie Brindes";
      
    MailApp.sendEmail(email, subject, body);
    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
  } catch(err) {
    return ContentService.createTextOutput("Erro: " + err.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}`;

export const EmailWebhookModal: React.FC<EmailWebhookModalProps> = ({
  isOpen,
  onClose,
  showToast,
}) => {
  const [url, setUrl] = useState<string>(getWebhookUrl);
  const [enabled, setEnabled] = useState<boolean>(isWebhookEnabled);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [showScriptGuide, setShowScriptGuide] = useState<boolean>(false);
  const [hasCopiedCode, setHasCopiedCode] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setWebhookUrl(url);
    setWebhookEnabled(enabled);
    showToast('Configurações de e-mail salvas com sucesso!', 'success');
    onClose();
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setHasCopiedCode(true);
    showToast('Código do Google Apps Script copiado!', 'success');
    setTimeout(() => setHasCopiedCode(false), 2500);
  };

  const handleSendTest = async () => {
    setIsTesting(true);
    try {
      setWebhookUrl(url);
      setWebhookEnabled(true);
      setEnabled(true);
      const success = await sendWithdrawalNotification({
        event: 'test',
        timestamp: new Date().toLocaleString('pt-BR'),
        giftName: 'Garrafa Térmica Mediatorie (Teste)',
        qty: 1,
        person: 'Marina Nascimento',
        reason: 'Teste de Integração com Outlook',
        reserved: 'Não',
        currentStock: 49,
        minStock: 10,
      });

      if (success) {
        showToast('Disparo de teste enviado! Verifique seu Outlook em alguns instantes.', 'success');
      } else {
        showToast('Falha ao disparar teste. Verifique a URL do Webhook.', 'error');
      }
    } catch {
      showToast('Erro ao disparar teste.', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-stone-200 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-700">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-brand-charcoal">Notificações por E-mail / Outlook</h3>
              <p className="text-xs text-stone-500">Envio automático para marina.nascimento@mediatorie.com.br</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Badge */}
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 space-y-1">
            <p className="font-bold">Integração Automática Pronta</p>
            <p className="text-[11px] leading-relaxed text-emerald-800">
              Sempre que alguém registrar uma retirada no catálogo, o sistema envia o e-mail instantaneamente em segundo plano.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200/80">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-stone-600" />
              <span className="text-xs font-bold text-stone-800">Notificar por e-mail a cada retirada</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              URL do Web App (Google Apps Script / Webhook):
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full text-xs font-mono p-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Collapsible Script Code & Setup Helper */}
          <div className="border border-stone-200 rounded-2xl overflow-hidden bg-stone-50/50">
            <button
              type="button"
              onClick={() => setShowScriptGuide(!showScriptGuide)}
              className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-stone-700 hover:bg-stone-100/70 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-700" />
                <span>Ver Código do Google Apps Script & Como Implantar</span>
              </span>
              {showScriptGuide ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
            </button>

            {showScriptGuide && (
              <div className="p-4 pt-1 space-y-3 border-t border-stone-200 text-xs text-stone-600">
                <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
                  <li>Abra o <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-emerald-700 font-bold underline">script.google.com</a> e crie um <strong>Novo Projeto</strong>.</li>
                  <li>Cole o código abaixo e clique em <strong>Implantar &gt; Nova implantação</strong>.</li>
                  <li>Selecione o tipo <strong>App da Web (Web app)</strong> e em <em>Quem tem acesso</em> coloque <strong>Qualquer pessoa (Anyone)</strong>.</li>
                  <li>Copie a URL gerada (terminada em <code>/exec</code>) e cole no campo acima!</li>
                </ol>

                <div className="relative">
                  <pre className="bg-stone-900 text-emerald-400 p-3 rounded-xl text-[10px] font-mono overflow-x-auto max-h-44 leading-relaxed">
                    {APPS_SCRIPT_CODE}
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="absolute top-2 right-2 bg-stone-800 hover:bg-stone-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    {hasCopiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{hasCopiedCode ? 'Copiado!' : 'Copiar Código'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleSendTest}
            disabled={isTesting || !url}
            className="text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Send className={`w-3.5 h-3.5 ${isTesting ? 'animate-bounce' : ''}`} />
            <span>{isTesting ? 'Enviando Teste...' : 'Disparar E-mail de Teste'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-stone-500 hover:text-stone-700 px-3.5 py-2.5 rounded-xl hover:bg-stone-100 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="text-xs font-black text-white bg-brand-forest hover:bg-emerald-800 px-5 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Configuração</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
