import React, { useState } from 'react';
import { KeyRound, Check, X, ShieldAlert } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChangePassword: (currentPass: string, newPass: string) => boolean;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onChangePassword,
}) => {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPass || !newPass || !confirmPass) {
      setError('Preencha todos os campos.');
      return;
    }

    if (newPass !== confirmPass) {
      setError('A nova senha e a confirmação não coincidem.');
      return;
    }

    if (newPass.length < 3) {
      setError('A nova senha deve ter no mínimo 3 caracteres.');
      return;
    }

    const success = onChangePassword(currentPass, newPass);
    if (!success) {
      setError('Senha atual incorreta.');
    } else {
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-brand-forest text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-brand-lime" />
            <h3 className="font-extrabold text-base">Alterar Senha de Gestão</h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-300 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Senha Atual
            </label>
            <input
              type="password"
              value={currentPass}
              onChange={(e) => {
                setCurrentPass(e.target.value);
                if (error) setError('');
              }}
              placeholder="Digite a senha atual..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-brand-forest text-sm font-semibold outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Nova Senha
            </label>
            <input
              type="password"
              value={newPass}
              onChange={(e) => {
                setNewPass(e.target.value);
                if (error) setError('');
              }}
              placeholder="Digite a nova senha..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-brand-forest text-sm font-semibold outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => {
                setConfirmPass(e.target.value);
                if (error) setError('');
              }}
              placeholder="Confirme a nova senha..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-brand-forest text-sm font-semibold outline-hidden"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-sm hover:bg-stone-50 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-brand-forest hover:bg-brand-forest/90 text-white font-extrabold text-sm shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Senha</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
