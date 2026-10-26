import { useState } from 'react';
import { request, students } from '../../api/endpoints';
import { toFormData } from '../../components/InstitutionDetails';
import { Async, Card, Empty, ErrorNote, Field, PageHeader } from '../../components/ui';
import { humanize } from '../../lib/labels';
import { useAction, useApi } from '../../lib/useApi';

const EMPTY_SUBJECT = { subject_code: '', subject_name: '', credits: '', grade: '' };

function RecordForm({ onSaved }) {
  const [f, setF] = useState({ semester: '', grade_system: 'CGPA_10', sgpa: '', cgpa: '', percentage: '', credits_earned: '', active_backlogs: 0 });
  const [subjects, setSubjects] = useState([{ ...EMPTY_SUBJECT }]);
  const [marksheet, setMarksheet] = useState(null);
  const { run, busy, error } = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setSub = (i, k) => (e) => setSubjects(subjects.map((s, j) => (j === i ? { ...s, [k]: e.target.value } : s)));

  const submit = (e) => {
    e.preventDefault();
    const num = (v) => (v === '' ? null : Number(v));
    const body = {
      semester: Number(f.semester), grade_system: f.grade_system, sgpa: num(f.sgpa), cgpa: num(f.cgpa),
      percentage: num(f.percentage), credits_earned: num(f.credits_earned), active_backlogs: Number(f.active_backlogs || 0),
      subjects: subjects.filter((s) => s.subject_code && s.subject_name).map((s) => ({ ...s, credits: Number(s.credits || 0) })),
    };
    run(async () => {
      await request('POST', '/students/me/academic-records', { form: toFormData(body, marksheet, 'marksheet') }); // CREATE_ACADEMIC_RECORD
      onSaved();
    }).catch(() => {});
  };

  return (
    <form className="card flex flex-col gap-4" onSubmit={submit}>
      <h2>Add a semester result</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Field label="Semester"><input className="input" type="number" min={1} max={12} value={f.semester} onChange={set('semester')} required /></Field>
        <Field label="Grade system">
          <select className="input" value={f.grade_system} onChange={set('grade_system')}>
            <option value="CGPA_10">CGPA (10-point)</option><option value="CGPA_4">CGPA (4-point)</option><option value="PERCENTAGE">Percentage</option><option value="GRADE_LETTER">Letter grades</option>
          </select>
        </Field>
        {f.grade_system === 'PERCENTAGE' ? (
          <Field label="Percentage"><input className="input" inputMode="decimal" value={f.percentage} onChange={set('percentage')} /></Field>
        ) : (
          <>
            <Field label="SGPA"><input className="input" inputMode="decimal" value={f.sgpa} onChange={set('sgpa')} /></Field>
            <Field label="CGPA"><input className="input" inputMode="decimal" value={f.cgpa} onChange={set('cgpa')} /></Field>
          </>
        )}
        <Field label="Credits earned"><input className="input" inputMode="decimal" value={f.credits_earned} onChange={set('credits_earned')} /></Field>
        <Field label="Active backlogs"><input className="input" type="number" min={0} value={f.active_backlogs} onChange={set('active_backlogs')} /></Field>
        <Field label="Marksheet (PDF)"><input type="file" accept="application/pdf" className="text-sm" onChange={(e) => setMarksheet(e.target.files?.[0] || null)} /></Field>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[13px] font-semibold text-gray-700">Subjects</legend>
        {subjects.map((s, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_2fr_100px_100px]">
            <input className="input" aria-label="Subject code" placeholder="Code" value={s.subject_code} onChange={setSub(i, 'subject_code')} />
            <input className="input" aria-label="Subject name" placeholder="Subject name" value={s.subject_name} onChange={setSub(i, 'subject_name')} />
            <input className="input" aria-label="Credits" placeholder="Credits" inputMode="decimal" value={s.credits} onChange={setSub(i, 'credits')} />
            <input className="input" aria-label="Grade" placeholder="Grade" value={s.grade} onChange={setSub(i, 'grade')} />
          </div>
        ))}
        <button type="button" className="self-start text-sm font-semibold text-brand" onClick={() => setSubjects([...subjects, { ...EMPTY_SUBJECT }])}>+ Add subject</button>
      </fieldset>
      <ErrorNote error={error} />
      <div className="flex justify-end"><button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save result'}</button></div>
    </form>
  );
}

export default function StudentRecords() {
  const state = useApi(() => students.records(), []);
  return (
    <>
      <PageHeader title="Academic records" subtitle="Semester results used for eligibility, merit and credit transfer. Verified results get a new version when corrected." />
      <Async state={state} empty={<Empty title="No results added yet" />}>
        {(rows) => (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {rows.map((r) => (
              <Card key={r.id} title={`Semester ${r.semester}`} actions={<span className="text-sm muted">{humanize(r.verification_status || '')}</span>}>
                <p className="text-sm">
                  {r.grade_system === 'PERCENTAGE' ? `${r.percentage}%` : `SGPA ${r.sgpa ?? '—'} · CGPA ${r.cgpa ?? '—'}`}
                  {' · '}{r.credits_earned ?? '—'} credits · {r.active_backlogs} backlogs
                </p>
                <ul className="mt-3 flex flex-col gap-1 text-sm muted">
                  {r.subjects.map((s) => <li key={s.id}>{s.subject_code} · {s.subject_name} · {s.credits} cr{s.grade ? ` · ${s.grade}` : ''}</li>)}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </Async>
      <RecordForm onSaved={state.reload} />
    </>
  );
}
