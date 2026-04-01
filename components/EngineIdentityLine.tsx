import React from 'react';

interface EngineIdentityProps {
  engineYear?: string | null;
  engineMake?: string | null;
  engineModel?: string | null;
  engineHours?: number | null;
  engineSerial?: string | null;
  engineHorsepower?: string | null;
  className?: string;
}

export const EngineIdentityLine: React.FC<EngineIdentityProps> = ({
  engineYear,
  engineMake,
  engineModel,
  engineHours,
  engineSerial,
  engineHorsepower,
  className = 'text-[11px] font-bold text-slate-200',
}) => {
  const parts: string[] = [];
  if (engineYear || engineMake || engineModel) {
    parts.push([engineYear, engineMake, engineModel].filter(Boolean).join(' '));
  }
  if (engineHours) parts.push(`${engineHours} hrs`);
  if (engineSerial) parts.push(`S/N: ${engineSerial}`);
  if (engineHorsepower) parts.push(`${engineHorsepower}HP`);

  if (parts.length === 0) return null;

  return <p className={className}>{parts.join(' · ')}</p>;
};
