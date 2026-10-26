import { useState } from 'react';
import { notifications } from '../../api/endpoints';
import { Async, Card, Empty, PageHeader, Pager } from '../../components/ui';
import { fmtDateTime } from '../../lib/format';
import { useAction, useApi } from '../../lib/useApi';

export default function Notifications() {
  const [page, setPage] = useState(1);
  const state = useApi(() => notifications.list({ page }), [page]);
  const { run, busy } = useAction();
  const markAll = () => run(async () => { await notifications.markAll(); state.reload(); }).catch(() => {});
  const open = (n) => { if (!n.read_at) run(async () => { await notifications.markRead(n.id); state.reload(); }).catch(() => {}); };

  return (
    <>
      <PageHeader title="Notifications" actions={<button type="button" className="btn-secondary" disabled={busy} onClick={markAll}>Mark all as read</button>} />
      <Card>
        <Async state={state} empty={<Empty title="You're all caught up" />}>
          {(rows, meta) => (
            <>
              <ul className="flex flex-col divide-y divide-gray-100">
                {rows.map((n) => (
                  <li key={n.id}>
                    <button type="button" onClick={() => open(n)} className="flex w-full items-start gap-3 py-3.5 text-left">
                      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.read_at ? 'bg-transparent' : 'bg-brand'}`} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <strong className={n.read_at ? 'font-medium' : ''}>{n.subject}</strong>
                        <span className="block text-sm muted">{n.body}</span>
                        <span className="block text-xs muted">{fmtDateTime(n.created_at)}</span>
                      </span>
                      {!n.read_at && <span className="sr-only">Unread</span>}
                    </button>
                  </li>
                ))}
              </ul>
              <Pager meta={meta} onPage={setPage} />
            </>
          )}
        </Async>
      </Card>
    </>
  );
}
