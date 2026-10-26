import { useEffect, useState } from 'react';
import { master, onboarding, students } from '../../api/endpoints';
import { Async, Card, EnumBadge, ErrorNote, Field, KV, Notice, PageHeader } from '../../components/ui';
import { CATEGORIES, VERIFICATION, humanize } from '../../lib/labels';
import { useAction, useApi } from '../../lib/useApi';

const PROFILE_FIELDS = ['first_name', 'last_name', 'date_of_birth', 'gender', 'category', 'abc_account_id', 'guardian_name',
  'guardian_email', 'guardian_mobile', 'address_line', 'state_id', 'district_id', 'pincode'];

function ProfileForm({ profile, onSaved }) {
  const [f, setF] = useState(() => Object.fromEntries(PROFILE_FIELDS.map((k) => [k, profile[k] ?? ''])));
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const { run, busy, error } = useAction();
  const [saved, setSaved] = useState(false);
  const set = (k) => (e) => { setSaved(false); setF({ ...f, [k]: e.target.value }); };
  const fe = error?.fieldErrors || {};

  useEffect(() => { master.states().then((r) => setStates(r.data || [])).catch(() => {}); }, []);
  useEffect(() => {
    if (f.state_id) master.districts(f.state_id).then((r) => setDistricts(r.data || [])).catch(() => {});
  }, [f.state_id]);

  const submit = (e) => {
    e.preventDefault();
    const body = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '' && v !== null));
    ['state_id', 'district_id'].forEach((k) => { if (body[k]) body[k] = Number(body[k]); });
    run(async () => { await students.updateMe(body); setSaved(true); onSaved(); }).catch(() => {});
  };

  return (
    <form className="card grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={submit}>
      <h2 className="sm:col-span-2 lg:col-span-3">Personal details</h2>
      <Field label="First name" error={fe.first_name}><input className="input" value={f.first_name} onChange={set('first_name')} /></Field>
      <Field label="Last name" error={fe.last_name}><input className="input" value={f.last_name} onChange={set('last_name')} /></Field>
      <Field label="Date of birth" error={fe.date_of_birth}><input className="input" type="date" value={f.date_of_birth} onChange={set('date_of_birth')} /></Field>
      <Field label="Category" error={fe.category}>
        <select className="input" value={f.category} onChange={set('category')}>
          <option value="">Select</option>
          {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label="ABC account ID" error={fe.abc_account_id} hint="12 digits"><input className="input" inputMode="numeric" maxLength={12} value={f.abc_account_id} onChange={set('abc_account_id')} /></Field>
      <Field label="Gender" error={fe.gender}>
        <select className="input" value={f.gender} onChange={set('gender')}>
          <option value="">Select</option><option value="FEMALE">Female</option><option value="MALE">Male</option><option value="OTHER">Other</option><option value="UNDISCLOSED">Prefer not to say</option>
        </select>
      </Field>
      <div className="sm:col-span-2 lg:col-span-3"><Field label="Address" error={fe.address_line}><input className="input" value={f.address_line} onChange={set('address_line')} /></Field></div>
      <Field label="State" error={fe.state_id}>
        <select className="input" value={f.state_id} onChange={(e) => setF({ ...f, state_id: e.target.value, district_id: '' })}>
          <option value="">Select</option>{states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>
      <Field label="District" error={fe.district_id}>
        <select className="input" value={f.district_id} onChange={set('district_id')}>
          <option value="">Select</option>{districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </Field>
      <Field label="PIN code" error={fe.pincode}><input className="input" inputMode="numeric" maxLength={6} value={f.pincode} onChange={set('pincode')} /></Field>
      <Field label="Parent or guardian name" error={fe.guardian_name}><input className="input" value={f.guardian_name} onChange={set('guardian_name')} /></Field>
      <Field label="Guardian email" error={fe.guardian_email}><input className="input" type="email" value={f.guardian_email} onChange={set('guardian_email')} /></Field>
      <Field label="Guardian mobile" error={fe.guardian_mobile}><input className="input" value={f.guardian_mobile} onChange={set('guardian_mobile')} /></Field>
      <div className="flex flex-wrap items-center justify-end gap-3 sm:col-span-2 lg:col-span-3">
        <ErrorNote error={error} />
        {saved && <span className="text-sm text-green-800">Saved</span>}
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
      </div>
    </form>
  );
}

function EnrolmentForm({ profile, onSaved }) {
  const [code, setCode] = useState(profile.current_college_aishe_code || '');
  const [college, setCollege] = useState(null);
  const [f, setF] = useState({
    enrolment_number: profile.enrolment_number || '', current_course_name: profile.current_course_name || '',
    current_semester: profile.current_semester || '', batch_year: profile.batch_year || '',
  });
  const [proof, setProof] = useState(null);
  const [contact, setContact] = useState('');
  const [asked, setAsked] = useState(false);
  const { run, busy, error } = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const locked = profile.enrolment_status === 'VERIFIED' || profile.enrolment_status === 'PENDING';

  const find = () => run(async () => {
    const { data } = await onboarding.lookup(code.trim());
    setCollege(data.found ? data.institution : false);
  }).catch(() => {});

  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      await students.submitEnrolment({
        current_college_id: college.id, ...f, current_semester: Number(f.current_semester), batch_year: Number(f.batch_year),
      }, proof);
      onSaved();
    }).catch(() => {});
  };

  const askOnboarding = () => run(async () => {
    await students.requestCollegeOnboarding({ college_id: college.id, contact_email: contact });
    setAsked(true);
  }).catch(() => {});

  return (
    <Card title="Current enrolment" actions={<EnumBadge map={VERIFICATION} value={profile.enrolment_status} />}>
      {locked ? (
        <>
          <KV k="College" v={profile.current_college_name} />
          <KV k="Enrolment number" v={profile.enrolment_number} />
          <KV k="Course" v={`${profile.current_course_name} · semester ${profile.current_semester}`} />
          <KV k="Batch" v={profile.batch_year} />
          {profile.enrolment_status === 'PENDING' && <p className="mt-3 text-sm muted">Your college has been asked to confirm these details.</p>}
        </>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={submit}>
          {profile.enrolment_status === 'REJECTED' && <Notice tone="red">Your college could not confirm your enrolment: {profile.enrolment_rejection_reason}</Notice>}
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1"><Field label="Your college's AISHE code" hint="Printed on your ID card or the college website"><input className="input uppercase" value={code} onChange={(e) => { setCode(e.target.value); setCollege(null); }} /></Field></div>
            <button type="button" className="btn-secondary" disabled={!code.trim() || busy} onClick={find}>Find college</button>
          </div>
          {college === false && <Notice tone="amber">No college found for that code.</Notice>}
          {college && (
            <>
              <Notice tone={college.onboarding_status === 'ACTIVE' ? 'green' : 'amber'}>
                <strong>{college.name}</strong> · {college.parent_name || college.district_name}
                {college.onboarding_status !== 'ACTIVE' && (asked ? (
                  <div className="mt-1">Thanks. We will invite the college and let you know when it joins.</div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <div className="min-w-[220px] flex-1"><Field label="College office email (so we can invite them)"><input className="input" type="email" value={contact} onChange={(e) => setContact(e.target.value)} /></Field></div>
                    <button type="button" className="btn-secondary" disabled={!contact || busy} onClick={askOnboarding}>Ask us to bring it on board</button>
                  </div>
                ))}
              </Notice>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Enrolment / PRN number"><input className="input" value={f.enrolment_number} onChange={set('enrolment_number')} required /></Field>
                <Field label="Current course"><input className="input" value={f.current_course_name} onChange={set('current_course_name')} required /></Field>
                <Field label="Current semester"><input className="input" type="number" min={1} max={12} value={f.current_semester} onChange={set('current_semester')} required /></Field>
                <Field label="Year of admission (batch)"><input className="input" type="number" min={2000} max={2100} value={f.batch_year} onChange={set('batch_year')} required /></Field>
                <div className="sm:col-span-2"><Field label="Proof of enrolment (ID card or fee receipt)"><input type="file" accept="application/pdf,image/jpeg,image/png" className="text-sm" onChange={(e) => setProof(e.target.files?.[0] || null)} /></Field></div>
              </div>
              <div className="flex justify-end"><button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Send to college for verification'}</button></div>
            </>
          )}
          <ErrorNote error={error} />
        </form>
      )}
    </Card>
  );
}

export default function StudentProfile() {
  const state = useApi(() => students.me(), []);
  return (
    <>
      <PageHeader title="Profile and enrolment" subtitle="Your details are shared only with the colleges and universities in your requests." />
      <Async state={state}>
        {(p) => (
          <>
            {!p.profile_complete && <Notice tone="amber">Still needed: {p.missing_fields.map(humanize).join(', ')}</Notice>}
            <EnrolmentForm profile={p} onSaved={state.reload} />
            <ProfileForm profile={p} onSaved={state.reload} />
          </>
        )}
      </Async>
    </>
  );
}
