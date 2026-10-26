import { useEffect, useMemo, useState } from 'react';
import { academics, master, vacancies } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { Async, Card, ErrorNote, Field, Notice, PageHeader } from '../../components/ui';
import { CATEGORIES } from '../../lib/labels';
import { useAction, useApi } from '../../lib/useApi';

function VacancyEditor({ offering, year, semester, existing, onSaved }) {
  const byCat = Object.fromEntries((existing?.categories || []).map((c) => [c.category, c]));
  const [seats, setSeats] = useState(() => Object.fromEntries(Object.keys(CATEGORIES).map((k) => [k, byCat[k]?.seats ?? 0])));
  const { run, busy, error } = useAction();
  const [saved, setSaved] = useState(false);
  const total = Object.values(seats).reduce((s, n) => s + Number(n || 0), 0);
  const intake = offering?.sanctioned_intake;

  const save = () => run(async () => {
    await vacancies.upsert({
      offering_id: offering.id, academic_year_id: Number(year), entry_semester: Number(semester),
      categories: Object.fromEntries(Object.entries(seats).map(([k, v]) => [k, Number(v || 0)])),
    });
    setSaved(true);
    onSaved();
  }).catch(() => {});

  return (
    <>
      <div className="overflow-x-auto">
        <table className="tbl">
          <thead><tr><th scope="col">Category</th><th scope="col">Seats</th><th scope="col">Offered (blocked)</th><th scope="col">Filled</th><th scope="col">Available</th></tr></thead>
          <tbody>
            {Object.entries(CATEGORIES).map(([k, l]) => {
              const c = byCat[k];
              const min = (c?.blocked || 0) + (c?.filled || 0);
              return (
                <tr key={k}>
                  <td>{l}</td>
                  <td><input className="input h-10 w-24" type="number" min={min} aria-label={`${l} seats`} value={seats[k]} onChange={(e) => { setSaved(false); setSeats({ ...seats, [k]: e.target.value }); }} /></td>
                  <td>{c?.blocked ?? 0}</td>
                  <td>{c?.filled ?? 0}</td>
                  <td><strong>{Math.max(Number(seats[k] || 0) - min, 0)}</strong></td>
                </tr>
              );
            })}
            <tr className="bg-gray-50"><td><strong>Total</strong></td><td><strong>{total}</strong>{intake ? ` of ${intake}` : ''}</td><td colSpan={3} /></tr>
          </tbody>
        </table>
      </div>
      {intake && total > intake && <Notice tone="red">Total seats cannot exceed the sanctioned intake of {intake}.</Notice>}
      <ErrorNote error={error} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm muted">Seats already offered or filled cannot be removed. Reductions while a window is open notify the university.</span>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-800">Saved</span>}
          <button type="button" className="btn" disabled={busy || (intake && total > intake)} onClick={save}>{busy ? 'Saving…' : 'Save vacancies'}</button>
        </div>
      </div>
    </>
  );
}

function RequestCourse({ collegeId, universityId }) {
  const courses = useApi(() => (universityId ? academics.courses(universityId, { page_size: 100 }) : Promise.resolve({ data: [] })), [universityId]);
  const requests = useApi(() => academics.offeringRequests({ approval_status: 'ALL' }), []);
  const [f, setF] = useState({ course_id: '', proposed_intake: 40, justification: '' });
  const { run, busy, error } = useAction();
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      await academics.requestOffering(collegeId, { course_id: Number(f.course_id), proposed_intake: Number(f.proposed_intake), justification: f.justification || undefined });
      setF({ ...f, course_id: '' });
      requests.reload();
    }).catch(() => {});
  };
  const mine = (requests.data || []).filter((r) => r.college_id === collegeId);
  return (
    <Card title="Request a new course">
      <form className="flex flex-wrap items-end gap-3" onSubmit={submit}>
        <div className="min-w-[240px] flex-1">
          <Field label="University course">
            <select className="input" value={f.course_id} onChange={(e) => setF({ ...f, course_id: e.target.value })} required>
              <option value="">Select a course</option>
              {(courses.data || []).map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </Field>
        </div>
        <div className="w-36"><Field label="Proposed intake"><input className="input" type="number" min={1} value={f.proposed_intake} onChange={(e) => setF({ ...f, proposed_intake: e.target.value })} /></Field></div>
        <button className="btn-secondary" disabled={busy}>Send to university</button>
      </form>
      <ErrorNote error={error} />
      {mine.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1 text-sm">
          {mine.map((r) => <li key={r.id}>{r.course_name} · intake {r.proposed_intake} · <strong>{r.approval_status.toLowerCase()}</strong></li>)}
        </ul>
      )}
    </Card>
  );
}

export default function CollegeVacancies() {
  const { membership } = useAuth();
  const cid = membership?.institution_id;
  const offerings = useApi(() => academics.offerings({ college_id: cid, page_size: 100 }), [cid]);
  const college = useApi(() => master.institution('college', cid), [cid]);
  const universityId = college.data?.university_id || offerings.data?.[0]?.university_id;
  const years = useApi(() => academics.academicYears(universityId ? { university_id: universityId } : {}), [universityId]);
  const [sel, setSel] = useState({ offering: '', year: '', semester: '3' });

  useEffect(() => {
    if (!sel.offering && offerings.data?.length) setSel((s) => ({ ...s, offering: String(offerings.data[0].id) }));
  }, [offerings.data, sel.offering]);
  useEffect(() => {
    if (!sel.year && years.data?.length) setSel((s) => ({ ...s, year: String(years.data[0].id) }));
  }, [years.data, sel.year]);

  const vac = useApi(
    () => (sel.offering && sel.year ? vacancies.list({ offering_id: sel.offering, academic_year_id: sel.year, entry_semester: sel.semester }) : Promise.resolve({ data: [] })),
    [sel.offering, sel.year, sel.semester],
  );
  const offering = useMemo(() => (offerings.data || []).find((o) => String(o.id) === sel.offering), [offerings.data, sel.offering]);

  return (
    <>
      <PageHeader title="Courses and vacancies" subtitle="Seats you open for migration students, by reservation category." />
      <Async state={offerings}>
        {(rows) => (rows.length === 0 ? <Notice tone="amber">Your university has not assigned any courses to this college yet.</Notice> : (
          <Card>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Course">
                <select className="input" value={sel.offering} onChange={(e) => setSel({ ...sel, offering: e.target.value })}>
                  {rows.map((o) => <option key={o.id} value={o.id}>{o.course_name} · intake {o.sanctioned_intake}</option>)}
                </select>
              </Field>
              <Field label="Academic year">
                <select className="input" value={sel.year} onChange={(e) => setSel({ ...sel, year: e.target.value })}>
                  {(years.data || []).map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
                </select>
              </Field>
              <Field label="Entry semester">
                <select className="input" value={sel.semester} onChange={(e) => setSel({ ...sel, semester: e.target.value })}>
                  {[2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>Semester {n}</option>)}
                </select>
              </Field>
            </div>
            <Async state={vac}>
              {(v) => <VacancyEditor key={`${sel.offering}-${sel.year}-${sel.semester}-${v?.[0]?.updated_at || 'new'}`} offering={offering} year={sel.year} semester={sel.semester} existing={v?.[0]} onSaved={vac.reload} />}
            </Async>
          </Card>
        ))}
      </Async>
      <RequestCourse collegeId={cid} universityId={universityId} />
    </>
  );
}
