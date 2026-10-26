import { useState } from 'react';
import { migration } from '../../api/endpoints';
import { Async, Card, Empty, ErrorNote, Field, Modal, PageHeader, Table } from '../../components/ui';
import { fmtDate } from '../../lib/format';
import { useAction, useApi } from '../../lib/useApi';

export default function UniversityAppeals() {
  const state = useApi(() => migration.appeals(), []);
  const [open, setOpen] = useState(null);
  const [note, setNote] = useState('');
  const { run, busy, error } = useAction();
  const decide = (uphold) => run(async () => { await migration.decideAppeal(open.id, uphold, note || undefined); setOpen(null); state.reload(); }).catch(() => {});

  return (
    <>
      <PageHeader title="Appeals" subtitle="Students may appeal a rejection once. Upholding an appeal sends the request back for a fresh decision." />
      <Card>
        <Async state={state} empty={<Empty title="No appeals waiting" />}>
          {(rows) => (
            <Table
              rows={rows}
              columns={[
                { key: 'ref', header: 'Reference', render: (a) => <strong>{a.request.reference_no}</strong> },
                { key: 'student', header: 'Student', render: (a) => a.request.student_name },
                { key: 'course', header: 'Course', render: (a) => `${a.request.course.name} · ${a.request.destination_institution.name}` },
                { key: 'reason', header: 'Reason', render: (a) => <span className="line-clamp-2 max-w-sm">{a.reason}</span> },
                { key: 'due', header: 'Decide by', render: (a) => fmtDate(a.due_at) },
                { key: 'act', header: <span className="sr-only">Action</span>, render: (a) => <button type="button" className="btn-secondary" onClick={() => { setNote(''); setOpen(a); }}>Decide</button> },
              ]}
            />
          )}
        </Async>
      </Card>
      {open && (
        <Modal title={`Appeal from ${open.request.student_name}`} onClose={() => setOpen(null)}>
          <div className="flex flex-col gap-4">
            <p className="rounded-lg bg-gray-50 p-3 text-sm">{open.reason}</p>
            <Field label="Decision note"><textarea className="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <ErrorNote error={error} />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-danger" disabled={busy} onClick={() => decide(false)}>Refuse</button>
              <button type="button" className="btn" disabled={busy} onClick={() => decide(true)}>Uphold</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
