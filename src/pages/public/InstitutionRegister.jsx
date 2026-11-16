import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onboarding, request } from '../../api/endpoints';
import InstitutionDetails, { cleanDetails, toFormData } from '../../components/InstitutionDetails';
import { Badge, ErrorNote, Field, Notice } from '../../components/ui';
import AuthLayout from './AuthLayout';

// Path C: someone at a university or college asks for admin access.
export default function InstitutionRegister() {
  const navigate = useNavigate();
  const [type, setType] = useState('UNIVERSITY');
  const [code, setCode] = useState('');
  const [lookup, setLookup] = useState(null);
  const [details, setDetails] = useState({});
  const [f, setF] = useState({ full_name: '', designation: '', email: '', mobile: '', password: '', confirm_password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const fe = error?.fieldErrors || {};

  const find = async () => {
    setError(null);
    const trimmedCode = code.trim().toUpperCase();
    if (type === 'UNIVERSITY') {
      if (!/^U-\d{1,6}$/i.test(trimmedCode)) {
        setError({ message: 'Enter a valid university AISHE code (e.g. U-0002)' });
        setLookup(null);
        return;
      }
    }
    try {
      const { data } = await onboarding.lookup(trimmedCode, type);
      if (type === 'UNIVERSITY') {
        if (!data.found || !data.institution) {
          setError({ message: 'University does not exist.' });
          setLookup(null);
          return;
        }
        if (data.institution.onboarding_status === 'SUSPENDED') {
          setError({ message: 'This university is suspended. You cannot request admin access.' });
          setLookup(null);
          return;
        }
      }
      setLookup(data);
    } catch (err) {
      setLookup(null);
      setError(err);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (f.password !== f.confirm_password) {
      setError({ message: 'Password and confirm password must match', fieldErrors: { confirm_password: 'Passwords do not match' } });
      return;
    }
    setBusy(true);
    const body = { institution_type: type, aishe_code: code.trim().toUpperCase(), official_email: f.email, ...f };
    if (lookup && !lookup.found && type === 'COLLEGE') body.institution = cleanDetails(details);
    try {
      await request('POST', '/onboarding/registrations', { form: toFormData(body) }); // SUBMIT_INSTITUTION_REGISTRATION
      navigate(`/verify-email?email=${encodeURIComponent(f.email)}`);
    } catch (err) { setError(err); } finally { setBusy(false); }
  };

  const inst = lookup?.institution;
  return (
    <AuthLayout wide title="Request admin access" subtitle="For registrars, principals and their delegates.">
      <form className="flex flex-col gap-5" onSubmit={submit}>
        <fieldset className="flex flex-wrap gap-3">
          <legend className="mb-2 text-[13px] font-semibold text-gray-700">I represent a</legend>
          {[['UNIVERSITY', 'University'], ['COLLEGE', 'College']].map(([v, l]) => (
            <label key={v} className={`flex min-h-[44px] items-center gap-2 rounded-lg border px-4 ${type === v ? 'border-brand bg-brand-soft' : 'border-gray-300'}`}>
              <input type="radio" name="type" checked={type === v} onChange={() => { setType(v); setLookup(null); setError(null); }} />{l}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1"><Field label="AISHE code" hint={type === 'UNIVERSITY' ? 'For example U-0002' : 'For example C-12345'}><input className="input uppercase" value={code} onChange={(e) => { setCode(e.target.value); setLookup(null); setError(null); }} required /></Field></div>
          <button type="button" className="btn-secondary" onClick={find} disabled={!code.trim()}>Find institution</button>
        </div>
        {inst && (
          <Notice tone={inst.has_active_admin ? 'amber' : 'green'}>
            <strong>{inst.name}</strong> · {inst.district_name}, {inst.state_name}
            {inst.parent_name && <> · affiliated to {inst.parent_name}</>}
            {inst.has_active_admin && <div className="mt-1"><Badge tone="amber">Already has an admin</Badge> Your request will be reviewed as an admin claim.</div>}
            {type === 'UNIVERSITY' && inst.onboarding_status === 'PENDING' && (
              <div className="mt-1"><Badge tone="amber">Pending invitation</Badge> You can only request admin access if your official email matches the invitation sent for this university.</div>
            )}
            {type === 'UNIVERSITY' && inst.onboarding_status === 'MASTER' && (
              <div className="mt-1"><Badge tone="blue">Not onboarded</Badge> Your request will be reviewed by Platform Admin to onboard this university.</div>
            )}
          </Notice>
        )}
        {lookup && !lookup.found && type === 'COLLEGE' && (
          <>
            <Notice tone="amber">We could not find {lookup.aishe_code} in the AISHE data. Enter the institution's details below.</Notice>
            <InstitutionDetails value={details} onChange={setDetails} errors={fe.institution || {}} />
          </>
        )}
        {lookup && (lookup.found || type === 'COLLEGE') && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Your full name" error={fe.full_name}><input className="input" value={f.full_name} onChange={set('full_name')} required /></Field>
            <Field label="Designation" error={fe.designation}><input className="input" value={f.designation} onChange={set('designation')} placeholder="Registrar, Principal…" required /></Field>
            <Field label="Official email" error={fe.email} hint="Use the institution's email domain where possible"><input className="input" type="email" value={f.email} onChange={set('email')} required /></Field>
            <Field label="Mobile" error={fe.mobile}><input className="input" value={f.mobile} onChange={set('mobile')} required /></Field>
            <Field label="Password" error={fe.password}><input className="input" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} required /></Field>
            <Field label="Confirm password" error={fe.confirm_password}><input className="input" type="password" autoComplete="new-password" value={f.confirm_password} onChange={set('confirm_password')} required /></Field>
          </div>
        )}
        <ErrorNote error={error} />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link to="/login" className="text-sm font-semibold">Back to sign in</Link>
          <button className="btn" disabled={busy || !lookup || (!lookup.found && type === 'UNIVERSITY')}>{busy ? 'Submitting…' : 'Submit request'}</button>
        </div>
      </form>
    </AuthLayout>
  );
}
