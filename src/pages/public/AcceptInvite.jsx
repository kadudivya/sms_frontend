import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { onboarding, request } from '../../api/endpoints';
import InstitutionDetails, { cleanDetails, toFormData } from '../../components/InstitutionDetails';
import { Async, ErrorNote, Field, KV, Notice } from '../../components/ui';
import { fmtDate } from '../../lib/format';
import { humanize } from '../../lib/labels';
import { useApi } from '../../lib/useApi';
import AuthLayout from './AuthLayout';

// Invitations (pre-approved) and signup links (approval needed) both land here.
export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const state = useApi(() => onboarding.invitation(token), [token]);
  const [f, setF] = useState({ full_name: '', designation: '', mobile: '', password: '', confirm_password: '' });
  const [details, setDetails] = useState({});
  const [letter, setLetter] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const fe = error?.fieldErrors || {};

  const submit = (inv) => async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const body = { ...f, full_name: f.full_name || inv.full_name };
    if (inv.requires_institution_details) body.institution = cleanDetails(details);
    try {
      const { data } = await request('POST', `/onboarding/invitations/${token}/accept`, { form: toFormData(body, letter) }); // ACCEPT_INVITATION
      if (data?.next_step === 'VERIFY_EMAIL') navigate(`/verify-email?email=${encodeURIComponent(inv.email)}`);
      else navigate('/login');
    } catch (err) { setError(err); } finally { setBusy(false); }
  };

  return (
    <AuthLayout wide title="Accept your invitation">
      <Async state={state}>
        {(inv) => (
          <form className="flex flex-col gap-5" onSubmit={submit(inv)}>
            <div className="card">
              <KV k="Invitation" v={humanize(inv.purpose)} />
              <KV k="Email" v={inv.email} />
              {inv.institution && <KV k="Institution" v={`${inv.institution.name} (${inv.institution.aishe_code})`} />}
              {!inv.institution && inv.aishe_code && <KV k="AISHE code" v={inv.aishe_code} />}
              <KV k="Expires" v={fmtDate(inv.expires_at)} />
            </div>
            <Notice tone={inv.pre_approved ? 'green' : 'blue'}>
              {inv.pre_approved
                ? 'This invitation is pre-approved: once you verify your email you can sign in straight away.'
                : 'After you verify your email, an approver reviews your authorisation letter before your access starts.'}
            </Notice>
            {inv.existing_account && <Notice tone="amber">An account with this email already exists. Enter that account's password to add this access to it.</Notice>}
            {inv.requires_institution_details && <InstitutionDetails value={details} onChange={setDetails} errors={fe.institution || {}} />}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {!inv.existing_account && <Field label="Full name" error={fe.full_name}><input className="input" value={f.full_name || inv.full_name || ''} onChange={set('full_name')} required /></Field>}
              {!inv.existing_account && <Field label="Designation" error={fe.designation}><input className="input" value={f.designation} onChange={set('designation')} /></Field>}
              {!inv.existing_account && <Field label="Mobile" error={fe.mobile}><input className="input" value={f.mobile} onChange={set('mobile')} /></Field>}
              <Field label="Password" error={fe.password}><input className="input" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} required /></Field>
              {!inv.existing_account && <Field label="Confirm password" error={fe.confirm_password}><input className="input" type="password" autoComplete="new-password" value={f.confirm_password} onChange={set('confirm_password')} required /></Field>}
              {inv.requires_authorization_letter && (
                <div className="sm:col-span-2"><Field label="Authorisation letter (PDF)"><input type="file" accept="application/pdf" className="text-sm" onChange={(e) => setLetter(e.target.files?.[0] || null)} required /></Field></div>
              )}
            </div>
            <ErrorNote error={error} />
            <div className="flex items-center justify-between gap-4">
              <Link to="/login" className="text-sm font-semibold">Back to sign in</Link>
              <button className="btn" disabled={busy}>{busy ? 'Creating account…' : 'Accept and create account'}</button>
            </div>
          </form>
        )}
      </Async>
    </AuthLayout>
  );
}
