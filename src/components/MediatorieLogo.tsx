import React from 'react';

interface MediatorieLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const MediatorieLogo: React.FC<MediatorieLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
}) => {
  const titleSizes = {
    sm: 'text-xl sm:text-2xl',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-3xl sm:text-4xl',
  };

  const subtitleSizes = {
    sm: 'text-[9px] sm:text-[10px]',
    md: 'text-[10px] sm:text-[11px]',
    lg: 'text-[11px] sm:text-[12px]',
  };

  return (
    <div className={`flex flex-col justify-center select-none ${className}`}>
      {/* Name: Mediatorie */}
      <span className={`font-black tracking-tight text-stone-700 leading-none ${titleSizes[size]}`}>
        Mediatorie
      </span>

      {/* Subtitle */}
      {showSubtitle && (
        <span className={`font-bold text-stone-500 tracking-wider uppercase mt-1 ${subtitleSizes[size]}`}>
          Administradora de Benefícios
        </span>
      )}
    </div>
  );
};
