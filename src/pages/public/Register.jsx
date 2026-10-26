import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { students } from '../../api/endpoints';
import { ErrorNote, Field } from '../../components/ui';
import { CATEGORIES } from '../../lib/labels';
import AuthLayout from './AuthLayout';

const INITIAL = {
  first_name: '', last_name: '', email: '', mobile: '', date_of_birth: '', gender: '', category: 'OPEN',
  abc_account_id: '', password: '', confirm_password: '', consent: false, whatsapp_opt_in: false,
};

export default function Register() {
  const navigate = useNavigate();
  const [f, setF] = useState(INITIAL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const fe = error?.fieldErrors || {};

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const body = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''));
    try {
      await students.register(body);
      navigate(`/verify-email?email=${encodeURIComponent(f.email)}`);
    } catch (err) { setError(err); } finally { setBusy(false); }
  };

  return (
    <AuthLayout wide title="Create your student account" subtitle="No approval is needed to register. Your current college confirms your enrolment before you can send a request.">
      <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={submit} noValidate>
        <Field label="First name" error={fe.first_name}><input className="input" value={f.first_name} onChange={set('first_name')} required /></Field>
        <Field label="Last name" error={fe.last_name}><input className="input" value={f.last_name} onChange={set('last_name')} /></Field>
        <Field label="Email" error={fe.email}><input className="input" type="email" value={f.email} onChange={set('email')} required /></Field>
        <Field label="Mobile" error={fe.mobile} hint="10-digit Indian number"><input className="input" inputMode="tel" value={f.mobile} onChange={set('mobile')} required /></Field>
        <Field label="Date of birth" error={fe.date_of_birth}><input className="input" type="date" value={f.date_of_birth} onChange={set('date_of_birth')} /></Field>
        <Field label="Gender" error={fe.gender}>
          <select className="input" value={f.gender} onChange={set('gender')}>
            <option value="">Prefer not to say</option><option value="FEMALE">Female</option><option value="MALE">Male</option><option value="OTHER">Other</option>
          </select>
        </Field>
        <Field label="Reservation category" error={fe.category}>
          <select className="input" value={f.category} onChange={set('category')}>
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="ABC account ID" error={fe.abc_account_id} hint="12 digits, from abc.gov.in. You can add it later.">
          <input className="input" inputMode="numeric" maxLength={12} value={f.abc_account_id} onChange={set('abc_account_id')} />
        </Field>
        <Field label="Password" error={fe.password} hint="At least 8 characters with a letter and a number"><input className="input" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} required /></Field>
        <Field label="Confirm password" error={fe.confirm_password}><input className="input" type="password" autoComplete="new-password" value={f.confirm_password} onChange={set('confirm_password')} required /></Field>
        <label className="flex items-start gap-3 text-sm sm:col-span-2">
          <input type="checkbox" className="mt-0.5 h-5 w-5" checked={f.whatsapp_opt_in} onChange={set('whatsapp_opt_in')} />
          Send me updates on WhatsApp as well as email
        </label>
        <label className="flex items-start gap-3 text-sm sm:col-span-2">
          <input type="checkbox" className="mt-0.5 h-5 w-5" checked={f.consent} onChange={set('consent')} required />
          I agree that my academic records may be shared with the colleges and universities involved in my migration requests.
        </label>
        <div className="sm:col-span-2"><ErrorNote error={error} /></div>
        <div className="flex flex-wrap items-center justify-between gap-4 sm:col-span-2">
          <Link to="/login" className="text-sm font-semibold">I already have an account</Link>
          <button className="btn" disabled={busy || !f.consent}>{busy ? 'Creating…' : 'Create account'}</button>
        </div>
      </form>
    </AuthLayout>
  );
}
