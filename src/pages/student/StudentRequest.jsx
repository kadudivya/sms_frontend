import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { migration } from '../../api/endpoints';
import { Async, Badge, Card, EnumBadge, ErrorNote, Field, KV, Notice, PageHeader, ReasonModal, StatusBadge } from '../../components/ui';
import { fmtDate, fmtDateTime, fmtPct } from '../../lib/format';
import { DOC_TYPES, ELIGIBILITY, MIGRATION_STATUS, VERIFICATION, humanize, label } from '../../lib/labels';
import { useAction, useApi } from '../../lib/useApi';

const EDITABLE = ['DRAFT', 'RETURNED_FOR_CORRECTION'];
const WITHDRAWABLE = ['DRAFT', 'SUBMITTED', 'NOC_GRANTED', 'UNDER_REVIEW', 'RETURNED_FOR_CORRECTION', 'INTERVIEW_SCHEDULED',
  'RECOMMENDED', 'ENTRY_APPROVED', 'WAITLISTED', 'PROVISIONAL_OFFER'];

function UploadRow({ item, requestId, editable, onDone }) {
  const { run, busy, error } = useAction();
  const latest = item.documents?.[item.documents.length - 1];
  const upload = (file) => run(async () => { await migration.uploadDocument(requestId, item.doc_type, file); onDone(); }).catch(() => {});
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <strong className="text-sm">{DOC_TYPES[item.doc_type] || humanize(item.doc_type)}</strong>
        {!item.required && <span className="ml-2 text-xs muted">optional</span>}
        <p className="text-sm muted">
          {latest ? `${latest.filename} · v${latest.version_no}` : 'Not uploaded'}
          {latest?.rejection_reason && <span className="text-red-700"> · {latest.rejection_reason}</span>}
        </p>
        <ErrorNote error={error} />
      </div>
      <div className="flex items-center gap-3">
        {latest && <EnumBadge map={VERIFICATION} value={latest.verification_status} />}
        {editable && (
          <label className={`btn-secondary cursor-pointer ${busy ? 'opacity-50' : ''}`}>
            {busy ? 'Uploading…' : latest ? 'Replace' : 'Upload'}
            <input type="file" className="sr-only" accept="application/pdf,image/jpeg,image/png" disabled={busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
        )}
      </div>
    </li>
  );
}

function Conversion({ r, onDone }) {
  const opt = r.conversion_options;
  const [pct, setPct] = useState('');
  const [file, setFile] = useState(null);
  const { run, busy, error } = useAction();
  if (!opt) return null;
  const save = () => run(async () => { await migration.setConversion(r.id, file, opt.needs === 'CERTIFICATE' ? pct : undefined); onDone(); }).catch(() => {});
  return (
    <Card title="Grade conversion">
      {r.conversion && <KV k="Saved" v={`${fmtPct(r.conversion.converted_percentage)} (${humanize(r.conversion.conversion_source)})`} />}
      {opt.needs === 'ACADEMIC_RECORDS' && <Notice tone="amber">Add your semester results first. <Link to="/student/records">Go to academic records</Link></Notice>}
      {opt.needs === 'NOTHING' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            {opt.grade_system} {opt.value} → <strong>{fmtPct(opt.converted_percentage)}</strong>
            {opt.label && <span className="muted"> · {opt.label}</span>}
          </p>
          <button type="button" className="btn-secondary" disabled={busy} onClick={save}>Use this conversion</button>
        </div>
      )}
      {opt.needs === 'CERTIFICATE' && (
        <div className="flex flex-col gap-3">
          <Notice>Your university has not published a conversion formula. Upload the conversion certificate it issued and enter the percentage it states.</Notice>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Percentage on the certificate"><input className="input" inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} /></Field>
            <Field label="Certificate (PDF)"><input type="file" accept="application/pdf" className="text-sm" onChange={(e) => setFile(e.target.files?.[0] || null)} /></Field>
          </div>
          <div><button type="button" className="btn-secondary" disabled={busy || !pct || !file} onClick={save}>Save conversion</button></div>
        </div>
      )}
      <ErrorNote error={error} />
    </Card>
  );
}

export default function StudentRequest() {
  const { id } = useParams();
  const state = useApi(() => migration.get(id), [id]);
  const { run, busy, error } = useAction();
  const [modal, setModal] = useState(null);

  const act = (fn) => run(async () => { await fn(); setModal(null); state.reload(); }).catch(() => {});

  return (
    <Async state={state}>
      {(r) => {
        const editable = EDITABLE.includes(r.request_status);
        const s = r.summary;
        return (
          <>
            <PageHeader
              title={`${s.course.name} · ${s.destination_institution.name}`}
              subtitle={`${r.reference_no} · from ${s.source_institution.name} · entry semester ${s.entry_semester} · ${s.academic_year}`}
              actions={<StatusBadge status={r.request_status} />}
            />

            {r.request_status === 'RETURNED_FOR_CORRECTION' && <Notice tone="amber"><strong>Your new college asked for changes:</strong> {r.correction_note}</Notice>}
            {r.request_status === 'PROVISIONAL_OFFER' && (
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2>You have an offer</h2>
                    <p className="mt-1 text-sm muted">Accept by {fmtDateTime(r.offer_expires_at)}. Accepting withdraws your other active requests.</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn-danger" onClick={() => setModal('decline')}>Decline</button>
                    <button type="button" className="btn" disabled={busy} onClick={() => act(() => migration.acceptOffer(r.id))}>Accept offer</button>
                  </div>
                </div>
              </Card>
            )}
            {r.request_status === 'WAITLISTED' && <Notice>You are waitlisted at position {s.waitlist_rank}. You will be offered a seat automatically if one frees up.</Notice>}
            {r.request_status === 'REJECTED' && !r.appeal && (
              <Notice tone="red">
                This request was rejected. You can appeal once within the appeal window.
                <button type="button" className="ml-2 font-semibold underline" onClick={() => setModal('appeal')}>File an appeal</button>
              </Notice>
            )}
            {r.appeal && <Notice>Appeal filed {fmtDate(r.appeal.created_at)} · decision due {fmtDate(r.appeal.due_at)}{r.appeal.decision_note ? ` · ${r.appeal.decision_note}` : ''}</Notice>}
            <ErrorNote error={error} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="flex flex-col gap-6 lg:col-span-2">
                <Card title="Documents">
                  <ul className="flex flex-col divide-y divide-gray-100">
                    {r.checklist.map((item) => <UploadRow key={item.doc_type} item={item} requestId={r.id} editable={editable} onDone={state.reload} />)}
                  </ul>
                </Card>
                {editable && <Conversion r={r} onDone={state.reload} />}
                {r.credits.length > 0 && (
                  <Card title="Credit transfer">
                    <p className="mb-3 text-sm muted">Accepted {r.credit_summary.accepted} · rejected {r.credit_summary.rejected} · pending {r.credit_summary.pending}</p>
                    <ul className="flex flex-col divide-y divide-gray-100 text-sm">
                      {r.credits.map((c) => (
                        <li key={c.id} className="flex justify-between gap-3 py-2">
                          <span>Sem {c.semester} · {c.subject_name} ({c.credits} cr)</span>
                          <Badge tone={c.decision === 'ACCEPTED' ? 'green' : c.decision === 'REJECTED' ? 'red' : 'gray'}>{humanize(c.decision)}</Badge>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
                {r.equivalence_decision && (
                  <Card title="University decision">
                    <KV k="Credits accepted" v={r.equivalence_decision.credits_accepted} />
                    <KV k="Papers to clear" v={(r.equivalence_decision.additional_papers || []).join(', ') || 'None'} />
                    {r.equivalence_decision.remarks && <p className="mt-3 text-sm">{r.equivalence_decision.remarks}</p>}
                  </Card>
                )}
              </div>
              <div className="flex flex-col gap-6">
                <Card title="Summary">
                  <KV k="Eligibility" v={<EnumBadge map={ELIGIBILITY} value={s.eligibility_result} />} />
                  <KV k="Merit score" v={fmtPct(s.merit_score)} />
                  <KV k="Submitted" v={fmtDate(s.submitted_at)} />
                </Card>
                {r.interviews.length > 0 && (
                  <Card title="Interview">
                    {r.interviews.map((iv) => (
                      <div key={iv.id} className="text-sm">
                        <strong>{fmtDateTime(iv.scheduled_start)}</strong>
                        <p className="muted">{humanize(iv.mode)}{iv.location ? ` · ${iv.location}` : ''} · {humanize(iv.interview_status)}</p>
                        {iv.meeting_url && iv.interview_status === 'SCHEDULED' && (
                          <p className="mt-1"><a href={iv.meeting_url} target="_blank" rel="noreferrer" className="font-semibold">Join the meeting</a>{iv.meeting_info ? <span className="muted"> · {iv.meeting_info}</span> : null}</p>
                        )}
                      </div>
                    ))}
                  </Card>
                )}
                {r.letters.length > 0 && (
                  <Card title="Letters">
                    <ul className="flex flex-col gap-2 text-sm">{r.letters.map((l) => <li key={l.id}>{humanize(l.letter_type)} · {fmtDate(l.created_at)}</li>)}</ul>
                  </Card>
                )}
                <Card title="History">
                  <ol className="flex flex-col gap-3 text-sm">
                    {r.history.map((h) => (
                      <li key={h.id}>
                        <strong>{label(MIGRATION_STATUS, h.to_status)}</strong>
                        <p className="muted">{fmtDateTime(h.created_at)}{h.reason ? ` · ${h.reason}` : ''}</p>
                      </li>
                    ))}
                  </ol>
                </Card>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {WITHDRAWABLE.includes(r.request_status) && <button type="button" className="btn-danger" onClick={() => setModal('withdraw')}>Withdraw request</button>}
              {r.request_status === 'DRAFT' && (
                <button type="button" className="btn" disabled={busy || r.submission_problems.length > 0} onClick={() => act(() => migration.submit(r.id))}>
                  Submit request
                </button>
              )}
              {r.request_status === 'RETURNED_FOR_CORRECTION' && <button type="button" className="btn" disabled={busy} onClick={() => act(() => migration.resubmit(r.id))}>Send corrections</button>}
            </div>
            {r.submission_problems.length > 0 && (
              <Notice tone="amber"><strong>Before you can submit:</strong><ul className="mt-1 list-disc pl-5">{r.submission_problems.map((p) => <li key={p}>{p}</li>)}</ul></Notice>
            )}

            {modal === 'withdraw' && <ReasonModal title="Withdraw this request?" cta="Withdraw" required={false} danger busy={busy} error={error} onClose={() => setModal(null)} onConfirm={(reason) => act(() => migration.withdraw(r.id, reason))} />}
            {modal === 'decline' && <ReasonModal title="Decline this offer?" cta="Decline offer" required={false} danger busy={busy} error={error} onClose={() => setModal(null)} onConfirm={(reason) => act(() => migration.declineOffer(r.id, reason))} />}
            {modal === 'appeal' && <ReasonModal title="Appeal the rejection" cta="File appeal" busy={busy} error={error} onClose={() => setModal(null)} onConfirm={(reason) => act(() => migration.appeal(r.id, reason))} />}
          </>
        );
      }}
    </Async>
  );
}
