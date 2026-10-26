import { Link } from 'react-router-dom';
import { label, tone, MIGRATION_STATUS } from '../lib/labels';

const TONES = {
  gray: 'bg-gray-200 text-gray-700',
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
};

export function Badge({ children, tone: t = 'gray' }) {
  return (
    <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-semibold ${TONES[t] || TONES.gray}`}>
      {children}
    </span>
  );
}

export function EnumBadge({ map, value }) {
  return <Badge tone={tone(map, value)}>{label(map, value)}</Badge>;
}

export const StatusBadge = ({ status }) => <EnumBadge map={MIGRATION_STATUS} value={status} />;

export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="mt-1.5 muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ title, actions, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          {title && <h2>{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function TaskTile({ to, label: text, value, hint, warn }) {
  const body = (
    <>
      <span className="text-[13px] muted">{text}</span>
      <strong className="text-[28px] leading-tight">{value ?? '—'}</strong>
      {hint && <span className={`text-[13px] ${warn ? 'text-amber-800' : 'muted'}`}>{hint}</span>}
    </>
  );
  const cls = 'flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-white p-[18px] text-gray-900';
  return to ? <Link to={to} className={`${cls} hover:border-blue-300 hover:text-gray-900`}>{body}</Link> : <div className={cls}>{body}</div>;
}

export function Field({ label: text, error, hint, children }) {
  return (
    <label className="label">
      {text}
      {children}
      {hint && !error && <span className="text-xs font-normal muted">{hint}</span>}
      {error && <span className="text-xs font-medium text-red-700">{Array.isArray(error) ? error[0] : error}</span>}
    </label>
  );
}

export function Spinner({ label: text = 'Loading…' }) {
  return (
    <div role="status" className="flex items-center gap-3 py-8 muted">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand" aria-hidden="true" />
      {text}
    </div>
  );
}

export function ErrorNote({ error, onRetry }) {
  if (!error) return null;
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
      <span>{error.message || String(error)}</span>
      {onRetry && <button type="button" className="font-semibold underline" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Notice({ tone: t = 'blue', children }) {
  const map = {
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    green: 'border-green-300 bg-green-50 text-green-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    red: 'border-red-300 bg-red-50 text-red-900',
  };
  return <div className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${map[t]}`}>{children}</div>;
}

export function Empty({ title, children }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm muted">{children}</div>}
    </div>
  );
}

// Renders loading / error / empty states around content.
export function Async({ state, empty, children }) {
  if (state.loading && !state.data) return <Spinner />;
  if (state.error) return <ErrorNote error={state.error} onRetry={state.reload} />;
  if (empty && (!state.data || (Array.isArray(state.data) && state.data.length === 0))) return empty;
  return children(state.data, state.meta);
}

export function KV({ k, v }) {
  return (
    <div className="flex justify-between gap-3 border-b border-gray-100 py-2 text-sm">
      <span className="muted">{k}</span>
      <strong className="text-right">{v ?? '—'}</strong>
    </div>
  );
}

export function Table({ columns, rows, rowKey = 'id', onRowClick, selectedKey }) {
  return (
    <div className="overflow-x-auto">
      <table className="tbl">
        <thead>
          <tr>{columns.map((c) => <th key={c.key} scope="col">{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r[rowKey]}
              className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''} ${selectedKey === r[rowKey] ? 'bg-brand-soft' : ''}`}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
            >
              {columns.map((c) => <td key={c.key}>{c.render ? c.render(r) : r[c.key] ?? '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({ meta, onPage }) {
  if (!meta || meta.pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3 text-sm">
      <span className="muted">Page {meta.page} of {meta.pages} · {meta.total} results</span>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>Previous</button>
        <button type="button" className="btn-secondary" disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)}>Next</button>
      </div>
    </nav>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2>{title}</h2>
          <button type="button" className="btn-secondary min-h-[36px] px-3" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Prompt for a reason, then run onConfirm(reason)
export function ReasonModal({ title, cta = 'Confirm', required = true, onClose, onConfirm, busy, error, danger }) {
  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm(new FormData(e.currentTarget).get('reason')?.toString().trim() || '');
        }}
      >
        <Field label={required ? 'Reason' : 'Note (optional)'}>
          <textarea name="reason" rows={4} className="textarea" required={required} maxLength={500} />
        </Field>
        <ErrorNote error={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className={danger ? 'btn-danger' : 'btn'} disabled={busy}>{busy ? 'Saving…' : cta}</button>
        </div>
      </form>
    </Modal>
  );
}
