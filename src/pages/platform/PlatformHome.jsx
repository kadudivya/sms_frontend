import { useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboards, onboarding } from '../../api/endpoints';
import StatusCounts from '../../components/StatusCounts';
import { Async, Card, ErrorNote, Field, Modal, Notice, PageHeader, Table, TaskTile } from '../../components/ui';
import { fmtNum } from '../../lib/format';
import { humanize } from '../../lib/labels';
import { useAction, useApi } from '../../lib/useApi';

// Path A (create + pre-approved admin) or path B (signup link) for a university
export function UniversityInviteModal({ mode, onClose }) {
  const [f, setF] = useState({ aishe_code: '', email: '', name: '' });
  const [done, setDone] = useState(false);
  const { run, busy, error } = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      if (mode === 'link') await onboarding.sendUniversitySignupLink({ aishe_code: f.aishe_code, email: f.email });
      else await onboarding.createUniversity({ aishe_code: f.aishe_code, admin_email: f.email, admin_name: f.name });
      setDone(true);
    }).catch(() => {});
  };
  return (
    <Modal title={mode === 'link' ? 'Send a university signup link' : 'Create a university and invite its admin'} onClose={onClose}>
      {done ? (
        <div className="flex flex-col gap-4">
          <Notice tone="green">{mode === 'link' ? `Signup link sent to ${f.email}. It works for that email and AISHE code only.` : `${f.name} has been invited as the pre-approved admin.`}</Notice>
          <button type="button" className="btn self-end" onClick={onClose}>Done</button>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <Field label="University AISHE code"><input className="input uppercase" value={f.aishe_code} onChange={set('aishe_code')} required /></Field>
          {mode !== 'link' && <Field label="Admin's name"><input className="input" value={f.name} onChange={set('name')} required /></Field>}
          <Field label={mode === 'link' ? 'Send to (registrar or delegate)' : "Admin's official email"}><input className="input" type="email" value={f.email} onChange={set('email')} required /></Field>
          <p className="text-sm muted">{mode === 'link' ? 'Use after a call with the university. They upload an authorisation letter and you approve it.' : 'Use only when you have already verified the person; no letter or approval is needed.'}</p>
          <ErrorNote error={error} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn" disabled={busy}>{busy ? 'Sending…' : mode === 'link' ? 'Send link' : 'Create and invite'}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default function PlatformHome() {
  const state = useApi(() => dashboards.platform(), []);
  const [modal, setModal] = useState(null);

  return (
    <>
      <PageHeader
        title="Platform overview"
        subtitle="Onboarding, approvals and system health across India."
        actions={(
          <>
            <Link to="/platform/institutions" className="btn-secondary">Institutions</Link>
            <button type="button" className="btn-secondary" onClick={() => setModal('link')}>Send signup link</button>
            <button type="button" className="btn" onClick={() => setModal('create')}>Create university</button>
          </>
        )}
      />
      <Async state={state}>
        {(d) => {
          const p = d.pending_tasks;
          const a = d.alerts;
          return (
            <>
              <section aria-label="Pending work" className="grid grid-cols-2 gap-3.5 lg:grid-cols-3">
                <TaskTile to="/platform/registrations" label="University registrations" value={p.registrations} hint={p.second_admin_claims ? `${p.second_admin_claims} second-admin claim(s)` : 'awaiting approval'} warn={p.second_admin_claims > 0} />
                <TaskTile label="Overdue releases" value={p.overdue_releases} hint="past the release deadline" warn={p.overdue_releases > 0} />
                <TaskTile label="College onboarding requests" value={p.college_onboarding_requests} hint="from students" />
                <TaskTile label="Support tickets" value={p.support_tickets_open} />
                <TaskTile label="Data requests" value={p.data_requests_open} hint="export · erasure" />
                <TaskTile label="Students" value={fmtNum(d.users.students)} hint={`${fmtNum(d.users.active)} institution users`} />
              </section>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
                <Card title="Students waiting on colleges not yet onboarded">
                  {d.students_waiting_on_colleges.length === 0 ? <p className="muted">No one is waiting.</p> : (
                    <Table
                      rowKey="college_id"
                      rows={d.students_waiting_on_colleges}
                      columns={[
                        { key: 'name', header: 'College', render: (r) => r.name },
                        { key: 'aishe', header: 'AISHE', render: (r) => r.aishe_code },
                        { key: 'n', header: 'Waiting', render: (r) => <strong>{r.students_waiting}</strong> },
                      ]}
                    />
                  )}
                </Card>
                <Card title="Alerts">
                  {Object.entries(a).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 border-b border-gray-100 py-2.5 text-sm last:border-0">
                      <span>{humanize(k)}</span>
                      <strong className={v > 0 ? 'text-red-800' : ''}>{fmtNum(v)}</strong>
                    </div>
                  ))}
                </Card>
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card title="Institutions by onboarding status">
                  <Table
                    rowKey="type"
                    rows={Object.entries(d.institutions).map(([type, counts]) => ({ type, ...counts }))}
                    columns={[
                      { key: 'type', header: 'Type', render: (r) => humanize(r.type) },
                      ...['MASTER', 'PENDING', 'ACTIVE', 'SUSPENDED'].map((st) => ({ key: st, header: st === 'MASTER' ? 'Not onboarded' : humanize(st), render: (r) => fmtNum(r[st] || 0) })),
                    ]}
                  />
                </Card>
                <StatusCounts title="Requests by status" counts={d.requests_by_status} />
              </div>
            </>
          );
        }}
      </Async>
      {modal && <UniversityInviteModal mode={modal} onClose={() => setModal(null)} />}
    </>
  );
}
