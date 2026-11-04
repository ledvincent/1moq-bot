import type { ReactNode } from 'react';

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
