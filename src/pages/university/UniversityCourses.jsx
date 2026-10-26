import { useState } from 'react';
import { academics, master } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { Async, Badge, Card, Empty, ErrorNote, Field, Modal, PageHeader, Table } from '../../components/ui';
import { fmtDate } from '../../lib/format';
import { humanize } from '../../lib/labels';
import { useAction, useApi } from '../../lib/useApi';

function Syllabi({ universityId }) {
  const list = useApi(() => academics.syllabi(universityId), [universityId]);
  const [open, setOpen] = useState(null);
  const detail = useApi(() => (open ? academics.syllabus(open) : Promise.resolve({ data: null })), [open]);
  const { run, busy, error } = useAction();

  return (
    <Card title="Syllabus versions">
      <Async state={list} empty={<Empty title="No syllabi yet" />}>
        {(rows) => (
          <ul className="flex flex-col divide-y divide-gray-100">
            {rows.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <button type="button" className="text-left" onClick={() => setOpen(open === s.id ? null : s.id)}>
                  <strong>{s.name}</strong> <span className="text-sm muted">v{s.version_no} · regulation {s.regulation_year}</span>
                </button>
                <div className="flex items-center gap-2">
                  <Badge tone={s.is_published ? 'green' : 'amber'}>{s.is_published ? 'Published' : 'Draft'}</Badge>
                  {!s.is_published && <button type="button" className="btn-secondary min-h-[36px]" disabled={busy} onClick={() => run(async () => { await academics.publishSyllabus(s.id); list.reload(); }).catch(() => {})}>Publish</button>}
                </div>
                {open === s.id && detail.data && (
                  <div className="w-full">
                    <Table
                      rows={detail.data.subjects}
                      columns={[
                        { key: 'semester', header: 'Sem' },
                        { key: 'subject_code', header: 'Code' },
                        { key: 'subject_name', header: 'Subject' },
                        { key: 'credits', header: 'Credits' },
                      ]}
                    />
                    <p className="mt-2 text-sm muted">{detail.data.total_credits} credits in total. Published versions are locked.</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Async>
      <ErrorNote error={error} />
    </Card>
  );
}

function OfferingRequests({ onChange }) {
  const list = useApi(() => academics.offeringRequests({ approval_status: 'PENDING' }), []);
  const [deciding, setDeciding] = useState(null);
  const { run, busy, error } = useAction();
  const decide = (approve, intake, note) => run(async () => {
    await academics.decideOfferingRequest(deciding.id, { approve, sanctioned_intake: approve ? Number(intake) : undefined, note: note || undefined });
    setDeciding(null); list.reload(); onChange();
  }).catch(() => {});

  return (
    <Card title="Course requests from colleges">
      <Async state={list} empty={<p className="muted">No requests waiting.</p>}>
        {(rows) => (
          <ul className="flex flex-col divide-y divide-gray-100">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div><strong className="text-sm">{r.college_name}</strong><p className="text-sm muted">{r.course_name} · intake {r.proposed_intake} · {fmtDate(r.created_at)}</p></div>
                <button type="button" className="btn-secondary min-h-[36px]" onClick={() => setDeciding(r)}>Decide</button>
              </li>
            ))}
          </ul>
        )}
      </Async>
      {deciding && (
        <Modal title={`${deciding.college_name}: ${deciding.course_name}`} onClose={() => setDeciding(null)}>
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); decide(true, fd.get('intake'), fd.get('note')); }}>
            {deciding.justification && <p className="text-sm">{deciding.justification}</p>}
            <Field label="Sanctioned intake"><input name="intake" className="input" type="number" min={1} defaultValue={deciding.proposed_intake} required /></Field>
            <Field label="Note"><textarea name="note" className="textarea" rows={3} /></Field>
            <ErrorNote error={error} />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-danger" disabled={busy} onClick={(e) => decide(false, null, new FormData(e.currentTarget.form).get('note'))}>Decline</button>
              <button className="btn" disabled={busy}>Approve</button>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}

export default function UniversityCourses() {
  const { membership } = useAuth();
  const uid = membership?.institution_id;
  const courses = useApi(() => academics.courses(uid, { page_size: 100 }), [uid]);
  const [assigning, setAssigning] = useState(null);
  const colleges = useApi(() => master.institutions({ kind: 'college', university_id: uid, institution_type: 'COLLEGE', onboarding_status: 'ACTIVE', page_size: 100 }), [uid]);
  const { run, busy, error } = useAction();

  return (
    <>
      <PageHeader title="Courses and syllabus" subtitle="The courses your colleges can offer, each with versioned syllabi that batches follow." />
      <Card>
        <Async state={courses} empty={<Empty title="No courses yet" />}>
          {(rows) => (
            <Table
              rows={rows}
              columns={[
                { key: 'code', header: 'Code', render: (c) => <strong>{c.code}</strong> },
                { key: 'name', header: 'Course' },
                { key: 'level', header: 'Level', render: (c) => humanize(c.level) },
                { key: 'total_semesters', header: 'Semesters' },
                { key: 'offer_mode', header: 'Offer mode', render: (c) => humanize(c.offer_mode) },
                { key: 'interview_required', header: 'Interview', render: (c) => (c.interview_required ? 'Required' : 'No') },
                { key: 'a', header: <span className="sr-only">Actions</span>, render: (c) => <button type="button" className="btn-secondary min-h-[36px]" onClick={() => setAssigning(c)}>Assign to college</button> },
              ]}
            />
          )}
        </Async>
      </Card>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <Syllabi universityId={uid} />
        <OfferingRequests onChange={courses.reload} />
      </div>
      {assigning && (
        <Modal title={`Assign ${assigning.name}`} onClose={() => setAssigning(null)}>
          <form className="flex flex-col gap-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(async () => { await academics.assignCourse(assigning.id, { college_id: Number(fd.get('college')), sanctioned_intake: Number(fd.get('intake')) }); setAssigning(null); }).catch(() => {});
          }}>
            <Field label="College" hint="Only onboarded colleges are listed">
              <select name="college" className="input" required>
                <option value="">Select a college</option>
                {(colleges.data || []).map((c) => <option key={c.id} value={c.id}>{c.name} ({c.aishe_code})</option>)}
              </select>
            </Field>
            <Field label="Sanctioned intake"><input name="intake" className="input" type="number" min={1} required /></Field>
            <ErrorNote error={error} />
            <div className="flex justify-end"><button className="btn" disabled={busy}>Assign</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
