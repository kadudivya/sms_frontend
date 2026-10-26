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
  const [letter, setLetter] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const fe = error?.fieldErrors || {};

  const find = async () => {
    setError(null);
    try {
      const { data } = await onboarding.lookup(code.trim());
      setLookup(data);
    } catch (err) { setError(err); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const body = { institution_type: type, aishe_code: code.trim(), ...f };
    if (lookup && !lookup.found) body.institution = cleanDetails(details);
    try {
      await request('POST', '/onboarding/registrations', { form: toFormData(body, letter) }); // SUBMIT_INSTITUTION_REGISTRATION
      navigate(`/verify-email?email=${encodeURIComponent(f.email)}`);
    } catch (err) { setError(err); } finally { setBusy(false); }
  };

  const inst = lookup?.institution;
  return (
    <AuthLayout wide title="Request admin access" subtitle="For registrars, principals and their delegates. An approver checks your authorisation letter before access is granted.">
      <form className="flex flex-col gap-5" onSubmit={submit}>
        <fieldset className="flex flex-wrap gap-3">
          <legend className="mb-2 text-[13px] font-semibold text-gray-700">I represent a</legend>
          {[['UNIVERSITY', 'University'], ['COLLEGE', 'College']].map(([v, l]) => (
            <label key={v} className={`flex min-h-[44px] items-center gap-2 rounded-lg border px-4 ${type === v ? 'border-brand bg-brand-soft' : 'border-gray-300'}`}>
              <input type="radio" name="type" checked={type === v} onChange={() => { setType(v); setLookup(null); }} />{l}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1"><Field label="AISHE code" hint={type === 'UNIVERSITY' ? 'For example U-0002' : 'For example C-12345'}><input className="input uppercase" value={code} onChange={(e) => { setCode(e.target.value); setLookup(null); }} required /></Field></div>
          <button type="button" className="btn-secondary" onClick={find} disabled={!code.trim()}>Find institution</button>
        </div>
        {inst && (
          <Notice tone={inst.has_active_admin ? 'amber' : 'green'}>
            <strong>{inst.name}</strong> · {inst.district_name}, {inst.state_name}
            {inst.parent_name && <> · affiliated to {inst.parent_name}</>}
            {inst.has_active_admin && <div className="mt-1"><Badge tone="amber">Already has an admin</Badge> Your request will be reviewed as a second-admin claim.</div>}
          </Notice>
        )}
        {lookup && !lookup.found && (
          <>
            <Notice tone="amber">We could not find {lookup.aishe_code} in the AISHE data. Enter the institution's details below.</Notice>
            <InstitutionDetails value={details} onChange={setDetails} errors={fe.institution || {}} />
          </>
        )}
        {lookup && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Your full name" error={fe.full_name}><input className="input" value={f.full_name} onChange={set('full_name')} required /></Field>
            <Field label="Designation" error={fe.designation}><input className="input" value={f.designation} onChange={set('designation')} placeholder="Registrar, Principal…" required /></Field>
            <Field label="Official email" error={fe.email} hint="Use the institution's email domain where possible"><input className="input" type="email" value={f.email} onChange={set('email')} required /></Field>
            <Field label="Mobile" error={fe.mobile}><input className="input" value={f.mobile} onChange={set('mobile')} required /></Field>
            <Field label="Password" error={fe.password}><input className="input" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} required /></Field>
            <Field label="Confirm password" error={fe.confirm_password}><input className="input" type="password" autoComplete="new-password" value={f.confirm_password} onChange={set('confirm_password')} required /></Field>
            <div className="sm:col-span-2">
              <Field label="Authorisation letter (PDF, signed by the head of the institution)" error={fe.authorization_letter}>
                <input type="file" accept="application/pdf" className="text-sm" onChange={(e) => setLetter(e.target.files?.[0] || null)} required />
              </Field>
            </div>
          </div>
        )}
        <ErrorNote error={error} />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link to="/login" className="text-sm font-semibold">Back to sign in</Link>
          <button className="btn" disabled={busy || !lookup}>{busy ? 'Submitting…' : 'Submit request'}</button>
        </div>
      </form>
    </AuthLayout>
  );
}
