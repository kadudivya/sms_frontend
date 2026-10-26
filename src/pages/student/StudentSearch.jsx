import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { migration, search } from '../../api/endpoints';
import { Async, Badge, Empty, ErrorNote, Field, Modal, PageHeader, Pager } from '../../components/ui';
import { fmtDate } from '../../lib/format';
import { humanize } from '../../lib/labels';
import { useApi } from '../../lib/useApi';

export default function StudentSearch() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ course: '', college: '', university: '', level: '', available_only: 'true' });
  const [query, setQuery] = useState({ ...filters, page: 1 });
  const state = useApi(() => search.offerings(query), [JSON.stringify(query)]);
  const [picked, setPicked] = useState(null);
  const [semester, setSemester] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.type === 'checkbox' ? (e.target.checked ? 'true' : '') : e.target.value });

  const start = async () => {
    setBusy(true); setError(null);
    try {
      const { data } = await migration.create({
        offering_id: picked.offering_id,
        entry_semester: Number(semester),
        academic_year_id: picked.window?.academic_year_id,
      });
      navigate(`/student/requests/${data.id}`);
    } catch (err) { setError(err); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Find a course" subtitle="Courses at onboarded colleges, with seats open for migration students." />
      <form
        className="card grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
        onSubmit={(e) => { e.preventDefault(); setQuery({ ...filters, page: 1 }); }}
      >
        <Field label="Course"><input className="input" value={filters.course} onChange={set('course')} placeholder="B.Sc Computer Science" /></Field>
        <Field label="College"><input className="input" value={filters.college} onChange={set('college')} /></Field>
        <Field label="University"><input className="input" value={filters.university} onChange={set('university')} /></Field>
        <Field label="Level">
          <select className="input" value={filters.level} onChange={set('level')}>
            <option value="">Any</option><option value="UNDERGRADUATE">Undergraduate</option><option value="POSTGRADUATE">Postgraduate</option><option value="DIPLOMA">Diploma</option>
          </select>
        </Field>
        <button className="btn">Search</button>
        <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-5">
          <input type="checkbox" className="h-5 w-5" checked={filters.available_only === 'true'} onChange={set('available_only')} /> Only show courses with seats available
        </label>
      </form>

      <Async state={state} empty={<Empty title="No courses match">Try a broader course name or clear the seat filter.</Empty>}>
        {(rows, meta) => (
          <section className="flex flex-col gap-3" aria-label="Results">
            {rows.map((o) => (
              <article key={o.offering_id} className="card flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base">{o.course_name}</h2>
                    <Badge tone="gray">{o.level}</Badge>
                    {o.interview_required && <Badge tone="blue">Interview</Badge>}
                  </div>
                  <p className="mt-1 text-sm muted">{o.college_name} · {o.university_name}{o.district ? ` · ${o.district}, ${o.state}` : ''}</p>
                  <p className="mt-1 text-sm muted">
                    {o.window ? `Window ${fmtDate(o.window.opens_on)} – ${fmtDate(o.window.closes_on)}` : 'No open window'} · {humanize(o.offer_mode)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <strong className="text-xl">{o.available_seats ?? '—'}</strong>
                    <p className="text-xs muted">{o.vacancy_uploaded ? 'seats available' : 'vacancies not published'}</p>
                  </div>
                  <button type="button" className="btn" disabled={!o.accepting_requests} onClick={() => { setPicked(o); setSemester(String(o.window?.entry_semesters?.[0] || '')); }}>
                    {o.accepting_requests ? 'Start request' : 'Not accepting'}
                  </button>
                </div>
              </article>
            ))}
            <Pager meta={meta} onPage={(page) => setQuery({ ...query, page })} />
          </section>
        )}
      </Async>

      {picked && (
        <Modal title="Start a migration request" onClose={() => setPicked(null)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm"><strong>{picked.course_name}</strong> at {picked.college_name}</p>
            <Field label="Join in semester">
              <select className="input" value={semester} onChange={(e) => setSemester(e.target.value)}>
                {(picked.window?.entry_semesters || []).map((s) => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </Field>
            <p className="text-sm muted">This creates a draft. Your records and documents are checked before you submit it.</p>
            <ErrorNote error={error} />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setPicked(null)}>Cancel</button>
              <button type="button" className="btn" disabled={busy || !semester} onClick={start}>{busy ? 'Creating…' : 'Create draft'}</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
