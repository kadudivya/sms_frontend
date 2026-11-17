import { useEffect , useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboards, master, onboarding } from '../../api/endpoints';
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

const list = (r) => (Array.isArray(r) ? r : r?.data ?? []);
const AISHE_RE = /^U-\d{1,6}$/i;
const URL_RE = /^https?:\/\/[^\s/$.?#]+\.[^\s]+$/i;
const EMPTY = { aishe_code: '', name: '', state_id: '', district_id: '', website: '', year: '', location_type: '', address_line: '' };

export function CreateUniversityModal({ onClose, onCreated }) {
  const [f, setF] = useState(EMPTY);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [problem, setProblem] = useState('');
  const [done, setDone] = useState(false);
  const { run, busy, error } = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => { master.states().then((r) => setStates(list(r))).catch(() => {}); }, []);

  const pickState = (e) => {
    const id = e.target.value;
    setF({ ...f, state_id: id, district_id: '' });
    setDistricts([]);
    if (id) master.districts(id).then((r) => setDistricts(list(r))).catch(() => {});
  };

  const check = () => {
    if (!AISHE_RE.test(f.aishe_code.trim())) return 'AISHE code must look like U-1234';
    if (f.name.trim().length < 3) return 'Enter the university name';
    if (!f.state_id) return 'Select a state';
    if (!f.district_id) return 'Select a district';
    if (!URL_RE.test(f.website.trim())) return 'Enter a valid website, e.g. https://www.example.ac.in';
    if (f.year && !/^\d{4}$/.test(f.year)) return 'Year of establishment must be 4 digits';
    if (!f.location_type) return 'Select the location (Urban or Rural)';
    return '';
  };

  const submit = (e) => {
    e.preventDefault();
    const msg = check();
    setProblem(msg);
    if (msg) return;
    run(async () => {
      await onboarding.createUniversityMaster({
        aishe_code: f.aishe_code.trim().toUpperCase(),
        name: f.name.trim(),
        state_id: Number(f.state_id),
        district_id: Number(f.district_id),
        website: f.website.trim(),
        year_of_establishment: f.year ? Number(f.year) : null,
        location_type: f.location_type,
        address_line: f.address_line.trim() || null,
      });
      setDone(true);
      onCreated?.();
    }).catch(() => {});
  };

  return (
    <Modal title="Create university" onClose={onClose}>
      {done ? (
        <div className="flex flex-col gap-4">
          <Notice tone="green">{f.name} has been created with status Pending.</Notice>
          <button type="button" className="btn self-end" onClick={onClose}>Done</button>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
            <Field label="AISHE code"><input className="input uppercase" value={f.aishe_code} onChange={set('aishe_code')} placeholder="U-1234" required /></Field>
            <Field label="University name"><input className="input" value={f.name} onChange={set('name')} required /></Field>
            <Field label="State">
              <select className="input" value={f.state_id} onChange={pickState} required>
                <option value="">Select state</option>
                {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="District">
              <select className="input" value={f.district_id} onChange={set('district_id')} disabled={!f.state_id} required>
                <option value="">Select district</option>
                {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Website"><input className="input" type="url" value={f.website} onChange={set('website')} placeholder="https://www.example.ac.in" required /></Field>
            <Field label="Year of establishment (optional)"><input className="input" inputMode="numeric" maxLength={4} value={f.year} onChange={set('year')} placeholder="1990" /></Field>
            <Field label="Location">
              <select className="input" value={f.location_type} onChange={set('location_type')} required>
                <option value="">Select</option><option value="Urban">Urban</option><option value="Rural">Rural</option>
              </select>
            </Field>
            <Field label="Address line"><input className="input" value={f.address_line} onChange={set('address_line')} /></Field>
            {problem && <p className="text-sm text-red-800">{problem}</p>}
            <ErrorNote error={error} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn" disabled={busy}>{busy ? 'Creating…' : 'Create'}</button>
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
      {modal === 'link' && <UniversityInviteModal mode="link" onClose={() => setModal(null)} />}
      {modal === 'create' && <CreateUniversityModal onClose={() => setModal(null)} />}
    </>
  );
}
