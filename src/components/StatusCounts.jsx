import { label, MIGRATION_STATUS } from '../lib/labels';
import { Card } from './ui';

// counts: { STATUS: n } from the dashboard APIs; drawn as proportional bars
export default function StatusCounts({ title, counts = {} }) {
  const rows = Object.entries(counts).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return (
    <Card title={title}>
      {rows.length === 0 ? <p className="muted">No requests yet.</p> : (
        <ul className="flex flex-col gap-2.5">
          {rows.map(([status, n]) => (
            <li key={status} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_40px] items-center gap-3 text-sm">
              <span className="truncate">{label(MIGRATION_STATUS, status)}</span>
              <span className="h-2.5 rounded-full bg-gray-100"><span className="block h-2.5 rounded-full bg-brand" style={{ width: `${(n / max) * 100}%` }} /></span>
              <strong className="text-right">{n}</strong>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
