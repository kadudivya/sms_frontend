import { useState } from 'react';
import { onboarding } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import RegistrationReview from '../../components/RegistrationReview';
import { ErrorNote, Field, Notice, PageHeader } from '../../components/ui';
import { useAction } from '../../lib/useApi';

// Bring affiliated colleges on board: invite a pre-approved admin, send a signup link, or review requests.
function InviteCollege({ universityId }) {
  const [f, setF] = useState({ aishe_code: '', name: '', email: '', mode: 'link' });
  const [sent, setSent] = useState('');
  const { run, busy, error } = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      if (f.mode === 'link') await onboarding.sendCollegeSignupLink(universityId, { aishe_code: f.aishe_code, email: f.email });
      else await onboarding.createCollege(universityId, { aishe_code: f.aishe_code, admin_email: f.email, admin_name: f.name });
      setSent(f.mode === 'link' ? `Signup link sent to ${f.email}` : `${f.name} invited as the college's admin`);
      setF({ aishe_code: '', name: '', email: '', mode: f.mode });
    }).catch(() => {});
  };

  return (
    <form className="card flex flex-col gap-4" onSubmit={submit}>
      <h2>Bring a college on board</h2>
      <fieldset className="flex flex-wrap gap-3">
        <legend className="sr-only">How</legend>
        {[['link', 'Send a signup link (they upload a letter, you approve)'], ['direct', 'Invite a pre-approved admin']].map(([v, l]) => (
          <label key={v} className={`flex min-h-[44px] items-center gap-2 rounded-lg border px-4 text-sm ${f.mode === v ? 'border-brand bg-brand-soft' : 'border-gray-300'}`}>
            <input type="radio" checked={f.mode === v} onChange={() => setF({ ...f, mode: v })} />{l}
          </label>
        ))}
      </fieldset>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="College AISHE code"><input className="input uppercase" value={f.aishe_code} onChange={set('aishe_code')} required /></Field>
        {f.mode === 'direct' && <Field label="Admin's name"><input className="input" value={f.name} onChange={set('name')} required /></Field>}
        <Field label="Email"><input className="input" type="email" value={f.email} onChange={set('email')} required /></Field>
      </div>
      {sent && <Notice tone="green">{sent}</Notice>}
      <ErrorNote error={error} />
      <div className="flex justify-end"><button className="btn" disabled={busy}>{busy ? 'Sending…' : f.mode === 'link' ? 'Send signup link' : 'Send invitation'}</button></div>
    </form>
  );
}

export default function UniversityColleges() {
  const { membership, can } = useAuth();
  return (
    <>
      <PageHeader title="College registrations" subtitle="Colleges affiliated to you ask for admin access here. Approve only after checking the authorisation letter." />
      {can('CREATE_COLLEGE') && <InviteCollege universityId={membership?.institution_id} />}
      <RegistrationReview institutionKind="COLLEGE" />
    </>
  );
}
