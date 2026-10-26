import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { migration } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { Async, Card, Empty, PageHeader, Pager, StatusBadge, Table } from '../../components/ui';
import { fmtDate, fmtPct } from '../../lib/format';
import { MIGRATION_STATUS } from '../../lib/labels';
import { useApi } from '../../lib/useApi';

// Paged list of requests in or out of the active institution.
export default function RequestQueue({ direction, base, title, subtitle, statuses, actions }) {
  const { membership } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(statuses || '');
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState('');
  const [page, setPage] = useState(1);
  const params = { direction, status, q, page, college_id: membership?.institution_id };
  const state = useApi(() => migration.list(params), [JSON.stringify(params)]);

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      <Card>
        <form className="mb-4 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(draft.trim()); }}>
          <label className="label min-w-[200px] flex-1">Reference
            <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="SMS-2026-…" />
          </label>
          <button className="btn-secondary">Search</button>
          {!statuses && (
            <label className="label min-w-[200px]">Status
              <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                <option value="">All</option>
                {Object.entries(MIGRATION_STATUS).filter(([k]) => k !== 'DRAFT').map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
          )}
        </form>
        <Async state={state} empty={<Empty title="Nothing here">No requests match these filters.</Empty>}>
          {(rows, meta) => (
            <>
              <Table
                rows={rows}
                onRowClick={(r) => navigate(`${base}/${r.id}`)}
                columns={[
                  { key: 'ref', header: 'Reference', render: (r) => <strong>{r.reference_no}</strong> },
                  { key: 'student', header: 'Student', render: (r) => r.student_name },
                  { key: 'route', header: direction === 'outgoing' ? 'Moving to' : 'Coming from', render: (r) => (direction === 'outgoing' ? r.destination_institution.name : r.source_institution.name) },
                  { key: 'course', header: 'Course', render: (r) => `${r.course.name} · sem ${r.entry_semester}` },
                  { key: 'merit', header: 'Merit', render: (r) => fmtPct(r.merit_score) },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.request_status} /> },
                  { key: 'at', header: 'Submitted', render: (r) => fmtDate(r.submitted_at) },
                ]}
              />
              <Pager meta={meta} onPage={setPage} />
            </>
          )}
        </Async>
      </Card>
    </>
  );
}
