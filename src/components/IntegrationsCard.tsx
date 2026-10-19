import React from 'react';
import { 
  ShieldCheck, 
  FileSpreadsheet, 
  CheckCircle2, 
  ExternalLink, 
  RefreshCw, 
  Download, 
  Mail, 
  Sliders 
} from 'lucide-react';
import { User } from 'firebase/auth';

interface IntegrationsCardProps {
  googleUser?: User | null;
  spreadsheetUrl?: string | null;
  isSyncingSheets?: boolean;
  onConnectGoogle?: () => void;
  onSyncGoogleSheets?: () => void;
  onPullGoogleSheets?: () => void;
  onOpenEmailSettings?: () => void;
}

export const IntegrationsCard: React.FC<IntegrationsCardProps> = ({
  googleUser,
  spreadsheetUrl,
  isSyncingSheets = false,
  onConnectGoogle,
  onSyncGoogleSheets,
  onPullGoogleSheets,
  onOpenEmailSettings,
}) => {
  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 card-shadow border border-stone-200/80 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
        <div>
          <h3 className="text-base font-black text-brand-charcoal flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-forest" />
            <span>Central de Integrações e Automações</span>
            <span className="bg-emerald-100 text-emerald-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
              🔒 Área Restrita
            </span>
          </h3>
          <p className="text-xs text-brand-greyLight mt-0.5">
            Gerencie a sincronização contínua com sua planilha do Google Drive e os disparos de notificações por e-mail.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Google Sheets & Google Drive */}
        <div className="bg-emerald-50/60 p-4 sm:p-5 rounded-2xl border border-emerald-200/80 flex flex-col justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-black text-emerald-950">
                  Google Sheets & Google Drive
                </h4>
                {googleUser ? (
                  <span className="bg-emerald-200 text-emerald-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Conectado
                  </span>
                ) : (
                  <span className="bg-stone-200 text-stone-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Desconectado
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-800/90 mt-1 leading-relaxed">
                {googleUser
                  ? `Sincronizado com ${googleUser.email}. A planilha possui as abas de Estoque e Histórico.`
                  : 'Conecte sua conta do Google para manter sua planilha sincronizada automaticamente no Google Drive.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-200/60">
            {!googleUser ? (
              <button
                onClick={onConnectGoogle}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <span className="font-black">G</span>
                <span>Conectar Google Sheets</span>
              </button>
            ) : (
              <>
                <button
                  onClick={onSyncGoogleSheets}
                  disabled={isSyncingSheets}
                  title="Forçar envio de todo o estoque e histórico para a planilha agora"
                  className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                  <span>{isSyncingSheets ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
                </button>

                {onPullGoogleSheets && (
                  <button
                    onClick={onPullGoogleSheets}
                    disabled={isSyncingSheets}
                    title="Importar atualizações feitas na planilha do Google"
                    className="bg-white hover:bg-emerald-100/80 text-emerald-900 border border-emerald-300 text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-800" />
                    <span>Puxar da Planilha</span>
                  </button>
                )}

                {spreadsheetUrl && (
                  <a
                    href={spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white hover:bg-emerald-100/80 text-emerald-900 border border-emerald-300 text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Abrir no Google</span>
                  </a>
                )}
              </>
            )}
          </div>
        </div>

        {/* Card 2: Notificações por E-mail */}
        <div className="bg-sky-50/60 p-4 sm:p-5 rounded-2xl border border-sky-200/80 flex flex-col justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-sky-700 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Mail className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-black text-sky-950">
                  Notificações por E-mail (Outlook / Webhook)
                </h4>
                <span className="bg-sky-200 text-sky-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-sky-700" /> Ativo
                </span>
              </div>
              <p className="text-xs text-sky-800/90 mt-1 leading-relaxed">
                Disparos automáticos com resumo completo para <strong>marina.nascimento@mediatorie.com.br</strong> a cada retirada realizada no catálogo.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-sky-200/60">
            {onOpenEmailSettings && (
              <button
                onClick={onOpenEmailSettings}
                className="bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-sky-200" />
                <span>Configurações do E-mail / Disparar Teste</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
