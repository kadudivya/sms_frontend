import { useState } from 'react';
import { onboarding } from '../api/endpoints';
import { fmtDateTime } from '../lib/format';
import { humanize } from '../lib/labels';
import { useAction, useApi } from '../lib/useApi';
import { Async, Badge, Card, Empty, ErrorNote, Field, KV, Notice } from './ui';

function Detail({ id, onDecided }) {
  const state = useApi(() => onboarding.registration(id), [id]);
  const [note, setNote] = useState('');
  const { run, busy, error } = useAction();
  const [result, setResult] = useState(null);

  const decide = (approve) => run(async () => {
    if (approve) await onboarding.approve(id, note || undefined);
    else await onboarding.reject(id, note);
    setResult(approve ? 'approved' : 'rejected');
    const name = state.data?.requester?.full_name || 'The requester';
    onDecided(approve ? `${name} approved and emailed a sign-in link.` : `${name}'s request rejected; they have been emailed your reason.`);
  }).catch(() => {});

  return (
    <Async state={state}>
      {(reg) => {
        const inst = reg.institution;
        const pending = reg.approval_status === 'PENDING' && !result;
        return (
          <section className="card flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl">{inst?.name || reg.manual_details?.name || 'Unknown institution'}</h2>
                <p className="mt-1 text-sm muted">Submitted {fmtDateTime(reg.created_at)} · {humanize(reg.path)}</p>
              </div>
              <div className="flex gap-2">
                {reg.is_second_claim && <Badge tone="amber">Second-admin claim</Badge>}
                {reg.is_manual_institution && <Badge tone="amber">Not in AISHE data</Badge>}
                <Badge tone={reg.approval_status === 'APPROVED' ? 'green' : reg.approval_status === 'REJECTED' ? 'red' : 'blue'}>{humanize(reg.approval_status)}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide muted">Institution</h3>
                <KV k="AISHE code" v={inst?.aishe_code} />
                <KV k="Type" v={humanize(reg.institution?.registration_type || reg.institution_kind)} />
                <KV k="Location" v={inst ? `${inst.district_name || ''}, ${inst.state_name || ''}` : '—'} />
                {inst?.parent_name && <KV k="Affiliated to" v={inst.parent_name} />}
                <KV k="Existing admin" v={inst?.has_active_admin ? 'Yes' : 'None'} />
              </div>
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide muted">Requester</h3>
                <KV k="Name" v={reg.requester.full_name} />
                <KV k="Designation" v={reg.designation} />
                <KV k="Email" v={reg.requester.email} />
                <KV k="Email verified" v={reg.requester.email_verified ? 'Yes' : <span className="text-amber-800">Not yet</span>} />
                <KV k="Authorisation letter" v={reg.authorization_letter ? <a href={reg.authorization_letter.download_url} target="_blank" rel="noreferrer">{reg.authorization_letter.filename}</a> : 'None'} />
              </div>
            </div>
            {pending && (
              <>
                <Notice>Before approving, call the institution's published number to confirm the letter, and note the call below.</Notice>
                <Field label="Remarks (required to reject)"><textarea className="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
                <ErrorNote error={error} />
                <div className="flex flex-wrap justify-end gap-2">
                  <button type="button" className="btn-danger" disabled={busy || !note.trim()} onClick={() => decide(false)}>Reject with reason</button>
                  <button type="button" className="btn" disabled={busy || !reg.requester.email_verified} onClick={() => decide(true)}>Approve as admin</button>
                </div>
              </>
            )}
            {result === 'approved' && <Notice tone="green"><strong>Approved.</strong> {reg.requester.full_name} has been emailed a sign-in link.</Notice>}
            {result === 'rejected' && <Notice tone="red"><strong>Rejected.</strong> The requester has been emailed your reason.</Notice>}
          </section>
        );
      }}
    </Async>
  );
}

export default function RegistrationReview({ institutionKind }) {
  const [status, setStatus] = useState('PENDING');
  const params = { approval_status: status, institution_kind: institutionKind, page_size: 50 };
  const queue = useApi(() => onboarding.registrations(params), [status, institutionKind]);
  const [selected, setSelected] = useState(null);
  const [flash, setFlash] = useState('');
  const current = (queue.data || []).some((r) => r.id === selected) ? selected : queue.data?.[0]?.id;
  const decided = (msg) => { setFlash(msg); setSelected(null); queue.reload(); };

  return (
    <>
      <div className="flex flex-wrap gap-2" role="tablist">
        {['PENDING', 'APPROVED', 'REJECTED'].map((s) => (
          <button key={s} type="button" role="tab" aria-selected={status === s} onClick={() => { setStatus(s); setSelected(null); setFlash(''); }}
            className={status === s ? 'btn min-h-[40px]' : 'btn-secondary min-h-[40px]'}>{humanize(s)}</button>
        ))}
      </div>
      {flash && <Notice tone="green">{flash}</Notice>}
      <Async state={queue} empty={<Card><Empty title="No registrations here" /></Card>}>
        {(rows) => (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
            <nav aria-label="Registrations" className="flex flex-col gap-2">
              {rows.map((r) => (
                <button key={r.id} type="button" onClick={() => setSelected(r.id)}
                  className={`flex flex-col gap-1 rounded-[10px] border p-3.5 text-left text-sm ${current === r.id ? 'border-brand bg-brand-soft' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                  <strong>{r.institution_name || r.aishe_code}</strong>
                  <span className="muted">{r.requester_name} · {r.designation}</span>
                  <span>{r.is_second_claim ? <Badge tone="amber">Second-admin claim</Badge> : <Badge tone="blue">New claim</Badge>}</span>
                </button>
              ))}
            </nav>
            {current && <Detail key={current} id={current} onDecided={decided} />}
          </div>
        )}
      </Async>
    </>
  );
}
