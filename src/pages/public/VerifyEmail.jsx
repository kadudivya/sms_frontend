import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { auth } from '../../api/endpoints';
import { ErrorNote, Field, Notice } from '../../components/ui';
import AuthLayout from './AuthLayout';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') || '');
  const [otp, setOtp] = useState('');
  const [state, setState] = useState({ busy: false, error: null, done: null, info: '' });

  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, error: null, done: null, info: '' });
    try {
      const { data } = await auth.verifyEmail(email, otp);
      setState({ busy: false, error: null, done: data.account_state, info: '' });
    } catch (error) { setState({ busy: false, error, done: null, info: '' }); }
  };

  const resend = async () => {
    try {
      const { data } = await auth.resendEmailOtp(email);
      setState((s) => ({ ...s, info: data?.debug_otp ? `Development mode: your code is ${data.debug_otp}` : 'If verification is pending, a new code is on its way.' }));
    } catch (error) { setState((s) => ({ ...s, error })); }
  };

  if (state.done) {
    return (
      <AuthLayout title="Email verified">
        <Notice tone="green">
          {state.done === 'PENDING_APPROVAL'
            ? 'Your email is verified. Your access request now goes to an approver; we will email you when it is decided.'
            : 'Your email is verified. You can sign in now.'}
        </Notice>
        <Link to="/login" className="btn mt-6 w-full">Go to sign in</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Verify your email" subtitle="Enter the 6-digit code we emailed you.">
      <form className="flex flex-col gap-5" onSubmit={submit}>
        <Field label="Email"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Field label="Verification code"><input className="input tracking-[0.3em]" inputMode="numeric" maxLength={8} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required /></Field>
        {state.info && <Notice tone="amber">{state.info}</Notice>}
        <ErrorNote error={state.error} />
        <button className="btn" disabled={state.busy}>{state.busy ? 'Verifying…' : 'Verify email'}</button>
        <button type="button" className="text-sm font-semibold text-brand" onClick={resend} disabled={!email}>Send a new code</button>
      </form>
    </AuthLayout>
  );
}
