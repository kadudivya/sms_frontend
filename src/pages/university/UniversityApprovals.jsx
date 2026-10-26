import { useEffect, useState } from 'react';
import { migration } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { Async, Badge, Card, Empty, EnumBadge, ErrorNote, Field, KV, Notice, PageHeader, ReasonModal, StatusBadge } from '../../components/ui';
import { fmtDate, fmtPct } from '../../lib/format';
import { ELIGIBILITY, humanize } from '../../lib/labels';
import { useAction, useApi } from '../../lib/useApi';

function Decision({ id, onDecided }) {
  const state = useApi(() => migration.get(id), [id]);
  const { can } = useAuth();
  const [f, setF] = useState({ is_eligible: true, credits_accepted: '', remarks: '', papers: [], paper: '' });
  const [modal, setModal] = useState(null);
  const { run, busy, error } = useAction();

  useEffect(() => {
    if (state.data) setF((x) => ({ ...x, credits_accepted: state.data.credit_summary.accepted }));
  }, [state.data]);

  const act = (fn, msg) => run(async () => { await fn(); setModal(null); onDecided(msg); }).catch(() => {});

  return (
    <Async state={state}>
      {(r) => {
        const s = r.summary;
        const open = r.request_status === 'RECOMMENDED';
        const recommendation = [...r.history].reverse().find((h) => h.to_status === 'RECOMMENDED');
        return (
          <section className="card flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl">{s.student_name}</h2>
                <p className="mt-1 text-sm muted">{r.reference_no} · {s.source_institution.name} → {s.destination_institution.name} · {humanize(s.migration_type)}</p>
              </div>
              <StatusBadge status={r.request_status} />
            </div>
            <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <KV k="Eligibility" v={<EnumBadge map={ELIGIBILITY} value={s.eligibility_result} />} />
              <KV k="Merit score" v={fmtPct(s.merit_score)} />
              <KV k="Credits accepted by college" v={`${r.credit_summary.accepted} of ${r.credit_summary.accepted + r.credit_summary.rejected + r.credit_summary.pending}`} />
              <KV k="Documents" v={`${r.checklist.filter((c) => c.verified).length} of ${r.checklist.filter((c) => c.required).length} verified`} />
              <KV k="Course" v={`${s.course.name} · semester ${s.entry_semester}`} />
              <KV k="Submitted" v={fmtDate(s.submitted_at)} />
            </div>
            {recommendation?.reason && <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm"><strong>College note:</strong> {recommendation.reason}</div>}

            {open && can('APPROVE_ENTRY') && (
              <form className="flex flex-col gap-4" onSubmit={(e) => {
                e.preventDefault();
                act(() => migration.approveEntry(r.id, {
                  is_eligible: f.is_eligible, credits_accepted: Number(f.credits_accepted || 0),
                  additional_papers: f.papers, remarks: f.remarks || undefined, version: r.version,
                }), `Entry approved for ${s.student_name} (${r.reference_no}). Seats are offered according to the course's offer mode.`);
              }}>
                <h3 className="font-semibold">Equivalence decision</h3>
                <fieldset className="flex flex-wrap gap-3">
                  <legend className="sr-only">Eligible for entry?</legend>
                  {[[true, 'Eligible'], [false, 'Not eligible']].map(([v, l]) => (
                    <label key={l} className={`flex min-h-[44px] items-center gap-2 rounded-lg border px-4 ${f.is_eligible === v ? 'border-brand bg-brand-soft' : 'border-gray-300'}`}>
                      <input type="radio" checked={f.is_eligible === v} onChange={() => setF({ ...f, is_eligible: v })} />{l}
                    </label>
                  ))}
                </fieldset>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Credits accepted"><input className="input" inputMode="decimal" value={f.credits_accepted} onChange={(e) => setF({ ...f, credits_accepted: e.target.value })} /></Field>
                  <Field label="Add a paper to clear" hint="Press Enter to add">
                    <input className="input" value={f.paper} onChange={(e) => setF({ ...f, paper: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter' && f.paper.trim()) { e.preventDefault(); setF({ ...f, papers: [...f.papers, f.paper.trim()], paper: '' }); } }} />
                  </Field>
                </div>
                {f.papers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {f.papers.map((p) => (
                      <button key={p} type="button" className="inline-flex h-8 items-center gap-2 rounded-full bg-gray-100 px-3 text-sm font-semibold" onClick={() => setF({ ...f, papers: f.papers.filter((x) => x !== p) })} aria-label={`Remove ${p}`}>{p} ✕</button>
                    ))}
                  </div>
                )}
                <Field label="Remarks"><textarea className="textarea" rows={3} value={f.remarks} onChange={(e) => setF({ ...f, remarks: e.target.value })} /></Field>
                <ErrorNote error={error} />
                <div className="flex flex-wrap justify-end gap-2">
                  {s.eligibility_result === 'INELIGIBLE' && <button type="button" className="btn-secondary" onClick={() => setModal('override')}>Override eligibility</button>}
                  <button type="button" className="btn-danger" onClick={() => setModal('reject')}>Reject with reason</button>
                  <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Approve entry'}</button>
                </div>
              </form>
            )}
            {r.request_status === 'ENTRY_APPROVED' && <Notice tone="green"><strong>Entry approved.</strong> Seats are offered in the merit round when the window closes.</Notice>}
            {r.request_status === 'PROVISIONAL_OFFER' && <Notice tone="green"><strong>Provisional offer issued.</strong> The student has until {fmtDate(s.offer_expires_at)} to accept.</Notice>}
            {r.request_status === 'WAITLISTED' && <Notice>Waitlisted at position {s.waitlist_rank}.</Notice>}
            {modal === 'reject' && <ReasonModal title="Reject this request" cta="Reject" danger busy={busy} error={error} onClose={() => setModal(null)} onConfirm={(reason) => act(() => migration.reject(r.id, reason, r.version), `${r.reference_no} rejected. The student can appeal once.`)} />}
            {modal === 'override' && <ReasonModal title="Override the eligibility result" cta="Override" busy={busy} error={error} onClose={() => setModal(null)} onConfirm={(reason) => act(() => migration.overrideEligibility(r.id, reason, r.version), `Eligibility overridden for ${r.reference_no}.`)} />}
          </section>
        );
      }}
    </Async>
  );
}

export default function UniversityApprovals() {
  const { membership } = useAuth();
  const params = { direction: 'incoming', status: 'RECOMMENDED', page_size: 50 };
  const queue = useApi(() => migration.list(params), [membership?.institution_id]); // scoped to the university's colleges by the backend
  const [selected, setSelected] = useState(null);
  const [flash, setFlash] = useState('');
  const current = (queue.data || []).some((r) => r.id === selected) ? selected : queue.data?.[0]?.id;
  const decided = (msg) => { setFlash(msg || ''); setSelected(null); queue.reload(); };

  return (
    <>
      <PageHeader title="Entry approvals" subtitle="Requests your colleges recommended. Approving records the equivalence decision; seats are then offered by the course's offer mode." />
      {flash && <Notice tone="green">{flash}</Notice>}
      <Async state={queue} empty={<Card><Empty title="Nothing to approve">Recommended requests appear here.</Empty></Card>}>
        {(rows) => (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
            <nav aria-label="Queue" className="flex flex-col gap-2">
              {rows.map((r) => (
                <button key={r.id} type="button" onClick={() => setSelected(r.id)}
                  className={`flex flex-col gap-0.5 rounded-[10px] border p-3.5 text-left text-sm ${current === r.id ? 'border-brand bg-brand-soft' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                  <strong>{r.student_name} · {fmtPct(r.merit_score)}</strong>
                  <span className="muted">{r.destination_institution.name} · {r.course.name} · sem {r.entry_semester}</span>
                  <span className="muted">Submitted {fmtDate(r.submitted_at)}</span>
                </button>
              ))}
              <Badge tone="gray">{rows.length} waiting</Badge>
            </nav>
            {current && <Decision key={current} id={current} onDecided={decided} />}
          </div>
        )}
      </Async>
    </>
  );
}
