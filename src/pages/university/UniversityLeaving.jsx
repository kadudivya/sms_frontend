import { useState } from 'react';
import { migration } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { Async, Card, Empty, ErrorNote, Field, Modal, PageHeader, StatusBadge, Table } from '../../components/ui';
import { fmtDate } from '../../lib/format';
import { useAction, useApi } from '../../lib/useApi';

// Source university issues the migration certificate once the student accepts an offer elsewhere.
export default function UniversityLeaving() {
  const { membership } = useAuth();
  const params = { direction: 'outgoing', status: 'OFFER_ACCEPTED', page_size: 50 };
  const state = useApi(() => migration.list(params), [membership?.institution_id]); // scoped to the university's colleges by the backend
  const [releasing, setReleasing] = useState(null);
  const [file, setFile] = useState(null);
  const { run, busy, error } = useAction();

  return (
    <>
      <PageHeader title="Leaving approvals" subtitle="Students who accepted a seat at another university. Upload the migration certificate within 15 days." />
      <Card>
        <Async state={state} empty={<Empty title="No students waiting for a migration certificate" />}>
          {(rows) => (
            <Table
              rows={rows}
              columns={[
                { key: 'ref', header: 'Reference', render: (r) => <strong>{r.reference_no}</strong> },
                { key: 'student', header: 'Student', render: (r) => r.student_name },
                { key: 'from', header: 'Current college', render: (r) => r.source_institution.name },
                { key: 'to', header: 'Moving to', render: (r) => r.destination_institution.name },
                { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.request_status} /> },
                { key: 'at', header: 'Updated', render: (r) => fmtDate(r.updated_at) },
                { key: 'act', header: <span className="sr-only">Action</span>, render: (r) => <button type="button" className="btn-secondary" onClick={() => { setFile(null); setReleasing(r); }}>Upload certificate</button> },
              ]}
            />
          )}
        </Async>
      </Card>
      {releasing && (
        <Modal title={`Release ${releasing.student_name}`} onClose={() => setReleasing(null)}>
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); run(async () => { await migration.universityRelease(releasing.id, file); setReleasing(null); state.reload(); }).catch(() => {}); }}>
            <Field label="Migration certificate (PDF)"><input type="file" accept="application/pdf" className="text-sm" onChange={(e) => setFile(e.target.files?.[0] || null)} required /></Field>
            <ErrorNote error={error} />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setReleasing(null)}>Cancel</button>
              <button className="btn" disabled={busy || !file}>{busy ? 'Uploading…' : 'Upload and release'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
