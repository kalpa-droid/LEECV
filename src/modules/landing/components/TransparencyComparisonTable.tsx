import React from 'react';

interface Row {
  feature: string;
  lee: string;
  others: string;
  canva: string;
}

export default function TransparencyComparisonTable({ rows }: { rows: ReadonlyArray<{ feature: string; lee: string; others: string; canva: string }> }) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[var(--ui-bg-base)]">
            <th className="px-4 py-3 text-xs font-bold text-[var(--ui-text-primary)] border-b border-[var(--ui-border)]">Característica</th>
            <th className="px-4 py-3 text-xs font-bold text-[var(--ui-text-primary)] border-b border-[var(--ui-border)]">LeeCV.app</th>
            <th className="px-4 py-3 text-xs font-bold text-[var(--ui-text-primary)] border-b border-[var(--ui-border)]">Creadores Tradicionales</th>
            <th className="px-4 py-3 text-xs font-bold text-[var(--ui-text-primary)] border-b border-[var(--ui-border)]">Canva</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-[var(--ui-bg-card)]' : 'bg-[var(--ui-bg-base)]'}>
              <td className="px-4 py-3 text-sm text-[var(--ui-text-primary)] border-b border-[var(--ui-border)]">{row.feature}</td>
              <td className="px-4 py-3 text-sm text-[var(--ui-text-primary)] border-b border-[var(--ui-border)] font-bold border-[var(--color-accent-base)] rounded-t-lg rounded-b-lg">{row.lee}</td>
              <td className="px-4 py-3 text-sm text-[var(--ui-text-secondary)] border-b border-[var(--ui-border)]">{row.others}</td>
              <td className="px-4 py-3 text-sm text-[var(--ui-text-secondary)] border-b border-[var(--ui-border)]">{row.canva}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
