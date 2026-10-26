import { useState } from 'react';
import { migration } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { Async, Card, Empty, ErrorNote, Field, Modal, PageHeader, Pager, StatusBadge, Table } from '../../components/ui';
import { fmtDate } from '../../lib/format';
import { humanize } from '../../lib/labels';
import { useAction, useApi } from '../../lib/useApi';

const REFUSALS = ['DUES_PENDING', 'DISCIPLINARY_ACTION_PENDING', 'ENROLMENT_NOT_VALID', 'MINIMUM_SEMESTERS_NOT_COMPLETED'];

function NocModal({ r, onClose, onDone }) {
  const [approve, setApprove] = useState(true);
  const [reason, setReason] = useState(REFUSALS[0]);
  const [note, setNote] = useState('');
  const { run, busy, error } = useAction();
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      await migration.noc(r.id, { approve, refusal_reason: approve ? undefined : reason, note: note || undefined, version: r.version });
      onDone();
    }).catch(() => {});
  };
  return (
    <Modal title={`NOC for ${r.student_name}`} onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <p className="text-sm muted">{r.reference_no} · moving to {r.destination_institution.name} ({r.course.name})</p>
        <fieldset className="flex gap-3">
          <legend className="sr-only">Decision</legend>
          {[[true, 'Grant NOC'], [false, 'Refuse']].map(([v, l]) => (
            <label key={l} className={`flex min-h-[44px] flex-1 items-center gap-2 rounded-lg border px-4 ${approve === v ? 'border-brand bg-brand-soft' : 'border-gray-300'}`}>
              <input type="radio" checked={approve === v} onChange={() => setApprove(v)} />{l}
            </label>
          ))}
        </fieldset>
        {!approve && (
          <Field label="Reason (only these grounds are allowed)">
            <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>{REFUSALS.map((x) => <option key={x} value={x}>{humanize(x)}</option>)}</select>
          </Field>
        )}
        <Field label="Note (optional)"><textarea className="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <ErrorNote error={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className={approve ? 'btn' : 'btn-danger'} disabled={busy}>{busy ? 'Saving…' : approve ? 'Grant NOC' : 'Refuse NOC'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ReleaseModal({ r, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const { run, busy, error } = useAction();
  return (
    <Modal title={`Release ${r.student_name}`} onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); run(async () => { await migration.transferCertificate(r.id, file); onDone(); }).catch(() => {}); }}>
        <p className="text-sm">The student accepted an offer from {r.destination_institution.name}. Upload the signed transfer certificate.</p>
        <Field label="Transfer certificate (PDF)"><input type="file" accept="application/pdf" className="text-sm" onChange={(e) => setFile(e.target.files?.[0] || null)} required /></Field>
        <ErrorNote error={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy || !file}>{busy ? 'Uploading…' : 'Upload and release'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function CollegeOutgoing() {
  const { membership, can } = useAuth();
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const params = { direction: 'outgoing', page, college_id: membership?.institution_id };
  const state = useApi(() => migration.list(params), [JSON.stringify(params)]);
  const done = () => { setModal(null); state.reload(); };

  return (
    <>
      <PageHeader title="Outgoing requests" subtitle="Your students who want to move. Decide the NOC within 7 days; release them once they accept an offer." />
      <Card>
        <Async state={state} empty={<Empty title="No outgoing requests" />}>
          {(rows, meta) => (
            <>
              <Table
                rows={rows}
                columns={[
                  { key: 'ref', header: 'Reference', render: (r) => <strong>{r.reference_no}</strong> },
                  { key: 'student', header: 'Student', render: (r) => r.student_name },
                  { key: 'to', header: 'Moving to', render: (r) => `${r.destination_institution.name} · ${r.course.name}` },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.request_status} /> },
                  { key: 'at', header: 'Submitted', render: (r) => fmtDate(r.submitted_at) },
                  {
                    key: 'act', header: <span className="sr-only">Action</span>,
                    render: (r) => (r.request_status === 'SUBMITTED' && can('DECIDE_NOC')
                      ? <button type="button" className="btn-secondary" onClick={() => setModal({ kind: 'noc', r })}>Decide NOC</button>
                      : r.request_status === 'OFFER_ACCEPTED' && can('ISSUE_RELEASE')
                        ? <button type="button" className="btn-secondary" onClick={() => setModal({ kind: 'release', r })}>Upload TC</button>
                        : null),
                  },
                ]}
              />
              <Pager meta={meta} onPage={setPage} />
            </>
          )}
        </Async>
      </Card>
      {modal?.kind === 'noc' && <NocModal r={modal.r} onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === 'release' && <ReleaseModal r={modal.r} onClose={() => setModal(null)} onDone={done} />}
    </>
  );
}
