import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { documents, migration } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { Async, Card, EnumBadge, ErrorNote, KV, Notice, PageHeader, ReasonModal, StatusBadge } from '../../components/ui';
import { fmtDate, fmtDateTime, fmtPct } from '../../lib/format';
import { DOC_TYPES, ELIGIBILITY, MIGRATION_STATUS, VERIFICATION, humanize, label } from '../../lib/labels';
import { useAction, useApi } from '../../lib/useApi';

function DocumentRow({ item, canVerify, onDone }) {
  const latest = item.documents?.[item.documents.length - 1];
  const { run, busy, error } = useAction();
  const [rejecting, setRejecting] = useState(null);
  const decide = (decision, reason) => run(async () => { await documents.verify(latest.id, decision, reason); setRejecting(null); onDone(); }).catch(() => {});
  const open = () => run(async () => { const { data } = await documents.get(latest.id); if (data?.download_url) window.open(data.download_url, '_blank', 'noopener'); }).catch(() => {});

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <strong className="text-sm">{DOC_TYPES[item.doc_type] || humanize(item.doc_type)}</strong>
        <p className="text-sm muted">{latest ? <button type="button" className="text-brand" onClick={open}>{latest.filename}</button> : 'Not uploaded'}</p>
        <ErrorNote error={error} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {latest && <EnumBadge map={VERIFICATION} value={latest.verification_status} />}
        {canVerify && latest && latest.verification_status === 'PENDING' && (
          <>
            <button type="button" className="btn-secondary min-h-[36px]" disabled={busy} onClick={() => decide('VERIFIED')}>Verify</button>
            <button type="button" className="btn-secondary min-h-[36px]" disabled={busy} onClick={() => setRejecting('CORRECTION_REQUESTED')}>Ask for new copy</button>
            <button type="button" className="btn-danger min-h-[36px]" disabled={busy} onClick={() => setRejecting('REJECTED')}>Reject</button>
          </>
        )}
      </div>
      {rejecting && (
        <ReasonModal title={rejecting === 'REJECTED' ? 'Reject document' : 'Ask for a corrected copy'} cta="Send" danger={rejecting === 'REJECTED'}
          busy={busy} error={error} onClose={() => setRejecting(null)} onConfirm={(reason) => decide(rejecting, reason)} />
      )}
    </li>
  );
}

function Credits({ r, canAssess, onDone }) {
  const [rows, setRows] = useState(() => Object.fromEntries(r.credits.map((c) => [c.id, { decision: c.decision, mapped_subject_code: c.mapped_subject_code || '', reason: c.reason || '' }])));
  const { run, busy, error } = useAction();
  const dirty = r.credits.some((c) => rows[c.id].decision !== c.decision || (rows[c.id].mapped_subject_code || '') !== (c.mapped_subject_code || ''));
  const set = (id, k, v) => setRows({ ...rows, [id]: { ...rows[id], [k]: v } });
  const accepted = r.credits.filter((c) => rows[c.id].decision === 'ACCEPTED').reduce((s, c) => s + Number(c.credits), 0);
  const total = r.credits.reduce((s, c) => s + Number(c.credits), 0);

  const save = () => run(async () => {
    const decisions = r.credits.map((c) => ({ id: c.id, ...rows[c.id] })).filter((d) => d.decision !== 'PENDING')
      .map((d) => Object.fromEntries(Object.entries(d).filter(([, v]) => v !== '')));
    await migration.assessCredits(r.id, decisions);
    onDone();
  }).catch(() => {});

  if (r.credits.length === 0) return null;
  return (
    <Card title="Credit transfer" actions={<span className="text-sm muted">{accepted} of {total} credits accepted</span>}>
      <div className="overflow-x-auto">
        <table className="tbl">
          <thead><tr><th scope="col">Sem</th><th scope="col">Subject</th><th scope="col">Credits</th><th scope="col">Maps to</th><th scope="col">Decision</th></tr></thead>
          <tbody>
            {r.credits.map((c) => (
              <tr key={c.id}>
                <td>{c.semester}</td>
                <td>{c.subject_name}<br /><span className="text-xs muted">{c.subject_code}{c.grade ? ` · ${c.grade}` : ''}</span></td>
                <td>{c.credits}</td>
                <td><input className="input h-9 w-28" aria-label={`Maps to for ${c.subject_name}`} disabled={!canAssess} value={rows[c.id].mapped_subject_code} onChange={(e) => set(c.id, 'mapped_subject_code', e.target.value)} /></td>
                <td>
                  <select className="input h-9 w-32" aria-label={`Decision for ${c.subject_name}`} disabled={!canAssess} value={rows[c.id].decision} onChange={(e) => set(c.id, 'decision', e.target.value)}>
                    <option value="PENDING">Pending</option><option value="ACCEPTED">Accept</option><option value="REJECTED">Reject</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ErrorNote error={error} />
      {canAssess && <div className="mt-3 flex justify-end"><button type="button" className="btn-secondary" disabled={busy || !dirty} onClick={save}>{busy ? 'Saving…' : 'Save credit decisions'}</button></div>}
    </Card>
  );
}

export default function CollegeReview() {
  const { id } = useParams();
  const { can } = useAuth();
  const state = useApi(() => migration.get(id), [id]);
  const { run, busy, error } = useAction();
  const [modal, setModal] = useState(null);
  const act = (fn) => run(async () => { await fn(); setModal(null); state.reload(); }).catch(() => {});

  return (
    <Async state={state}>
      {(r) => {
        const s = r.summary;
        const st = r.request_status;
        const reviewing = st === 'UNDER_REVIEW' || st === 'INTERVIEW_SCHEDULED';
        return (
          <>
            <Link to="/college/incoming" className="text-sm font-semibold">← Incoming requests</Link>
            <PageHeader
              title={s.student_name}
              subtitle={`${r.reference_no} · ${s.source_institution.name} → ${s.course.name}, semester ${s.entry_semester} · ${humanize(s.migration_type)}`}
              actions={<StatusBadge status={st} />}
            />
            {st === 'NOC_GRANTED' && can('REVIEW_REQUEST') && (
              <Notice>The current college has granted the NOC. <button type="button" className="font-semibold underline" disabled={busy} onClick={() => act(() => migration.startReview(r.id))}>Start review</button></Notice>
            )}
            <ErrorNote error={error} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="flex flex-col gap-6 lg:col-span-2">
                <Card title="Documents">
                  <ul className="flex flex-col divide-y divide-gray-100">
                    {r.checklist.map((item) => <DocumentRow key={item.doc_type} item={item} canVerify={reviewing && can('VERIFY_DOCUMENTS')} onDone={state.reload} />)}
                  </ul>
                </Card>
                <Credits key={JSON.stringify(r.credits.map((c) => c.decision))} r={r} canAssess={reviewing && can('ASSESS_CREDITS')} onDone={state.reload} />
              </div>
              <div className="flex flex-col gap-6">
                <Card title="Eligibility and merit">
                  <KV k="Eligibility" v={<EnumBadge map={ELIGIBILITY} value={s.eligibility_result} />} />
                  <KV k="Merit score" v={fmtPct(s.merit_score)} />
                  {r.conversion && <KV k="Converted from" v={`${r.conversion.source_grade_system} ${r.conversion.source_value}`} />}
                  <KV k="Submitted" v={fmtDate(s.submitted_at)} />
                  {reviewing && <button type="button" className="mt-3 text-sm font-semibold text-brand" disabled={busy} onClick={() => act(() => migration.eligibilityCheck(r.id))}>Re-run eligibility check</button>}
                </Card>
                <Card title="Interview" actions={reviewing && can('CONDUCT_INTERVIEW') ? <Link to={`/college/interviews?request=${r.id}`} className="text-sm font-semibold">Schedule</Link> : null}>
                  {r.interviews.length === 0 ? <p className="text-sm muted">None scheduled.</p> : r.interviews.map((iv) => (
                    <p key={iv.id} className="text-sm"><strong>{fmtDateTime(iv.scheduled_start)}</strong> · {humanize(iv.interview_status)} · {humanize(iv.outcome)}</p>
                  ))}
                </Card>
                <Card title="History">
                  <ol className="flex flex-col gap-2 text-sm">
                    {r.history.map((h) => <li key={h.id}><strong>{label(MIGRATION_STATUS, h.to_status)}</strong> <span className="muted">· {fmtDateTime(h.created_at)}</span></li>)}
                  </ol>
                </Card>
              </div>
            </div>

            {reviewing && (
              <section className="card flex flex-col gap-3">
                {r.review_blockers.length > 0 && (
                  <Notice tone="amber"><strong>Before you can recommend:</strong><ul className="mt-1 list-disc pl-5">{r.review_blockers.map((b) => <li key={b}>{b}</li>)}</ul></Notice>
                )}
                <div className="flex flex-wrap justify-end gap-2">
                  <button type="button" className="btn-secondary" onClick={() => setModal('return')}>Return for correction</button>
                  <button type="button" className="btn-danger" onClick={() => setModal('reject')}>Reject</button>
                  {can('RECOMMEND_REQUEST') && (
                    <button type="button" className="btn" disabled={busy || r.review_blockers.length > 0} onClick={() => setModal('recommend')}>Recommend to university</button>
                  )}
                </div>
              </section>
            )}
            {st === 'RELEASED' && can('CONFIRM_ADMISSION') && (
              <Notice tone="green">The student has been released. <button type="button" className="font-semibold underline" disabled={busy} onClick={() => act(() => migration.confirmAdmission(r.id, r.version))}>Confirm admission (fee paid)</button></Notice>
            )}
            {st === 'ADMITTED_ORIGINALS_PENDING' && can('VERIFY_ORIGINALS') && (
              <Notice>Admitted. <button type="button" className="font-semibold underline" disabled={busy} onClick={() => act(() => migration.verifyOriginals(r.id))}>Record that originals were verified</button></Notice>
            )}

            {modal === 'return' && <ReasonModal title="Return for correction" cta="Send to student" busy={busy} error={error} onClose={() => setModal(null)} onConfirm={(note) => act(() => migration.returnForCorrection(r.id, note, r.version))} />}
            {modal === 'reject' && <ReasonModal title="Reject this request" cta="Reject" danger busy={busy} error={error} onClose={() => setModal(null)} onConfirm={(reason) => act(() => migration.reject(r.id, reason, r.version))} />}
            {modal === 'recommend' && <ReasonModal title="Recommend to the university" cta="Recommend" required={false} busy={busy} error={error} onClose={() => setModal(null)} onConfirm={(note) => act(() => migration.recommend(r.id, note || undefined, r.version))} />}
          </>
        );
      }}
    </Async>
  );
}
