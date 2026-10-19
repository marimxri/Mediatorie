import React, { useState } from 'react';
import { Lock, KeyRound, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface ManagementLockScreenProps {
  onUnlock: (password: string) => boolean;
  onCancel: () => void;
}

export const ManagementLockScreen: React.FC<ManagementLockScreenProps> = ({
  onUnlock,
  onCancel,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Por favor, digite a senha.');
      return;
    }

    const success = onUnlock(password);
    if (!success) {
      setError('Senha incorreta. Tente novamente.');
      setPassword('');
    } else {
      setError('');
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-6 sm:p-8 bg-white rounded-2xl shadow-xl border border-stone-200/90 text-center">
      <div className="w-16 h-16 bg-brand-forest/10 text-brand-forest rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-forest/20 shadow-xs">
        <Lock className="w-8 h-8" />
      </div>

      <h2 className="text-xl sm:text-2xl font-black text-brand-charcoal mb-2">
        Área Restrita: Gestão
      </h2>
      <p className="text-xs sm:text-sm text-stone-500 mb-6 font-medium leading-relaxed">
        Digite a senha de autorização para visualizar o controle de estoque, cadastrar brindes e realizar reposições.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative text-left">
          <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-stone-400" />
            Senha de Acesso
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="Digite a senha..."
              autoFocus
              className="w-full pl-3.5 pr-10 py-3 rounded-xl border border-stone-300 focus:border-brand-forest focus:ring-2 focus:ring-brand-forest/20 text-sm font-semibold outline-hidden transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-xs font-bold text-red-500 mt-2 animate-shake">
              {error}
            </p>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl border border-stone-200 text-stone-600 font-bold text-sm hover:bg-stone-50 transition cursor-pointer"
          >
            Voltar ao Catálogo
          </button>

          <button
            type="submit"
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-brand-forest hover:bg-brand-forest/90 text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <span>Desbloquear</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-center gap-1.5 text-[11px] text-stone-400 font-medium">
        <ShieldCheck className="w-3.5 h-3.5 text-brand-forest" />
        <span>Acesso protegido e restrito à equipe autorizada</span>
      </div>
    </div>
  );
};
