import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { interviews, migration, staff } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { Async, Badge, Card, Empty, ErrorNote, Field, Modal, Notice, PageHeader, ReasonModal } from '../../components/ui';
import { fmtDateTime } from '../../lib/format';
import { humanize } from '../../lib/labels';
import { useAction, useApi } from '../../lib/useApi';

const TONE = { SCHEDULED: 'blue', COMPLETED: 'green', NO_SHOW: 'gray', CANCELLED: 'gray', RESCHEDULED: 'amber' };

// datetime-local value (IST wall clock) -> ISO with +05:30
const toIst = (local) => (local ? `${local}:00+05:30` : '');

function ScheduleForm({ requests, members, defaultRequest, onDone }) {
  const [f, setF] = useState({ request_id: defaultRequest || '', start: '', minutes: 30, mode: 'ONLINE', location: '', meeting_url: '', meeting_info: '', extra: '', panel: [] });
  const { run, busy, error } = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const start = new Date(toIst(f.start));
    const end = new Date(start.getTime() + Number(f.minutes) * 60000);
    run(async () => {
      await interviews.schedule({
        request_id: Number(f.request_id), scheduled_start: start.toISOString(), scheduled_end: end.toISOString(),
        mode: f.mode, location: f.mode === 'IN_PERSON' ? f.location : undefined,
        meeting_url: f.mode === 'ONLINE' ? f.meeting_url.trim() : undefined,
        meeting_info: f.mode === 'ONLINE' && f.meeting_info.trim() ? f.meeting_info.trim() : undefined,
        panel_user_ids: f.panel.map(Number),
        extra_slot_reason: f.extra.trim() || undefined,
      });
      setF({ ...f, start: '', meeting_url: '', meeting_info: '' });
      onDone();
    }).catch(() => {});
  };

  return (
    <form className="card grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:items-end" onSubmit={submit}>
      <h2 className="sm:col-span-2 lg:col-span-3">Schedule an interview</h2>
      <Field label="Request">
        <select className="input" value={f.request_id} onChange={set('request_id')} required>
          <option value="">Select a student</option>
          {requests.map((r) => <option key={r.id} value={r.id}>{r.reference_no} · {r.student_name}</option>)}
        </select>
      </Field>
      <Field label="Start (IST)"><input className="input" type="datetime-local" value={f.start} onChange={set('start')} required /></Field>
      <Field label="Length">
        <select className="input" value={f.minutes} onChange={set('minutes')}><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option></select>
      </Field>
      <Field label="Mode">
        <select className="input" value={f.mode} onChange={set('mode')}><option value="ONLINE">Online (your Zoom, Meet or Teams link)</option><option value="IN_PERSON">In person</option></select>
      </Field>
      {f.mode === 'IN_PERSON' && <Field label="Room or address"><input className="input" value={f.location} onChange={set('location')} required /></Field>}
      {f.mode === 'ONLINE' && (
        <Field label="Meeting link" error={error?.fieldErrors?.meeting_url} hint="Create the meeting on your own platform and paste the https link">
          <input className="input" type="url" placeholder="https://meet.google.com/…" value={f.meeting_url} onChange={set('meeting_url')} required pattern="https://.+" />
        </Field>
      )}
      {f.mode === 'ONLINE' && (
        <Field label="Meeting ID / passcode (optional)"><input className="input" value={f.meeting_info} onChange={set('meeting_info')} maxLength={500} /></Field>
      )}
      {members.length > 0 && (
        <Field label="Panel">
          <select className="input h-auto min-h-[44px] py-2" multiple value={f.panel} onChange={(e) => setF({ ...f, panel: [...e.target.selectedOptions].map((o) => o.value) })}>
            {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.full_name}</option>)}
          </select>
        </Field>
      )}
      {(error?.code === 'OUTSIDE_WORKING_HOURS' || f.extra) && (
        <Field label="Reason for a slot outside working hours (college admins)">
          <input className="input" value={f.extra} onChange={set('extra')} maxLength={500} />
        </Field>
      )}
      <button className="btn" disabled={busy}>{busy ? 'Scheduling…' : 'Schedule and notify'}</button>
      <div className="sm:col-span-2 lg:col-span-3"><ErrorNote error={error} /></div>
    </form>
  );
}

export default function CollegeInterviews() {
  const { membership } = useAuth();
  const [params] = useSearchParams();
  const cid = membership?.institution_id;
  const list = useApi(() => interviews.list({ page_size: 100 }), []);
  const reqs = useApi(() => migration.list({ direction: 'incoming', college_id: cid, status: 'UNDER_REVIEW,INTERVIEW_SCHEDULED', page_size: 100 }), [cid]);
  const team = useApi(() => staff.members('college', cid).catch(() => ({ data: [] })), [cid]);
  const hours = useApi(() => interviews.hours(cid), [cid]);
  const { run, busy, error } = useAction();
  const [failing, setFailing] = useState(null);
  const [linking, setLinking] = useState(null);

  const names = useMemo(() => Object.fromEntries((reqs.data || []).map((r) => [r.id, r])), [reqs.data]);
  const act = (fn) => run(async () => { await fn(); setFailing(null); setLinking(null); list.reload(); reqs.reload(); }).catch(() => {});

  return (
    <>
      <PageHeader
        title="Interviews"
        subtitle={hours.data?.length ? `Working hours: ${hours.data.map((h) => `${humanize(h.weekday)} ${h.start_time?.slice(0, 5)}–${h.end_time?.slice(0, 5)}`).join(' · ')}` : 'Set working hours so students see valid slots.'}
      />
      <ScheduleForm requests={reqs.data || []} members={(team.data || []).filter((m) => m.approval_status === 'APPROVED')} defaultRequest={params.get('request')} onDone={() => { list.reload(); reqs.reload(); }} />
      <Card title="Upcoming and recent">
        <ErrorNote error={error} />
        <Async state={list} empty={<Empty title="No interviews yet" />}>
          {(rows) => (
            <ul className="flex flex-col divide-y divide-gray-100">
              {rows.map((iv) => {
                const r = names[iv.request_id];
                const open = iv.interview_status === 'SCHEDULED';
                return (
                  <li key={iv.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                    <div>
                      <strong>{r?.student_name || `Request #${iv.request_id}`} · {fmtDateTime(iv.scheduled_start)}</strong>
                      <p className="text-sm muted">
                        {r?.reference_no || ''} · {humanize(iv.mode)}{iv.location ? `, ${iv.location}` : ''}
                        {iv.meeting_url && <> · <a href={iv.meeting_url} target="_blank" rel="noreferrer" className="break-all">{iv.meeting_url}</a></>}
                        {iv.meeting_info ? ` · ${iv.meeting_info}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={TONE[iv.interview_status]}>{humanize(iv.interview_status)}</Badge>
                      {iv.outcome !== 'PENDING' && <Badge tone={iv.outcome === 'PASSED' ? 'green' : 'amber'}>{iv.outcome === 'PASSED' ? 'Passed' : 'Not selected'}</Badge>}
                      {open && (
                        <>
                          {iv.mode === 'ONLINE' && <a className="btn-secondary min-h-[36px]" href={iv.meeting_url} target="_blank" rel="noreferrer">Open meeting</a>}
                          {iv.mode === 'ONLINE' && <button type="button" className="btn-secondary min-h-[36px]" onClick={() => setLinking({ ...iv, url: iv.meeting_url, info: iv.meeting_info || '' })}>Change link</button>}
                          <button type="button" className="btn-secondary min-h-[36px]" disabled={busy} onClick={() => act(() => interviews.outcome(iv.id, 'PASSED'))}>Passed</button>
                          <button type="button" className="btn-secondary min-h-[36px]" disabled={busy} onClick={() => setFailing(iv)}>Not selected</button>
                          <button type="button" className="btn-secondary min-h-[36px]" disabled={busy} onClick={() => act(() => interviews.noShow(iv.id))}>No-show</button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Async>
        <div className="mt-3"><Notice>A second no-show closes the request. Students may move an interview once, at least 24 hours ahead.</Notice></div>
      </Card>
      {linking && (
        <Modal title="Change the meeting link" onClose={() => setLinking(null)}>
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); act(() => interviews.updateMeetingLink(linking.id, linking.url.trim(), linking.info.trim())); }}>
            <Field label="Meeting link" error={error?.fieldErrors?.meeting_url}><input className="input" type="url" pattern="https://.+" value={linking.url} onChange={(e) => setLinking({ ...linking, url: e.target.value })} required /></Field>
            <Field label="Meeting ID / passcode (optional)"><input className="input" value={linking.info} onChange={(e) => setLinking({ ...linking, info: e.target.value })} maxLength={500} /></Field>
            <p className="text-sm muted">The student and the panel are notified of the new link.</p>
            <ErrorNote error={error} />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setLinking(null)}>Cancel</button>
              <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save and notify'}</button>
            </div>
          </form>
        </Modal>
      )}
      {failing && <ReasonModal title="Record: not selected" cta="Save outcome" busy={busy} error={error} onClose={() => setFailing(null)} onConfirm={(remarks) => act(() => interviews.outcome(failing.id, 'FAILED', remarks))} />}
    </>
  );
}
