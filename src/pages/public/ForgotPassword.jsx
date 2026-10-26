import { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../../api/endpoints';
import { ErrorNote, Field, Notice } from '../../components/ui';
import AuthLayout from './AuthLayout';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ busy: false, error: null, sent: false, debug: null });

  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, error: null, sent: false, debug: null });
    try {
      const { data } = await auth.forgotPassword(email);
      setState({ busy: false, error: null, sent: true, debug: data?.debug_token || null });
    } catch (error) { setState({ busy: false, error, sent: false, debug: null }); }
  };

  return (
    <AuthLayout title="Reset your password" subtitle="We will email you a single-use link that works for 30 minutes.">
      {state.sent ? (
        <div className="flex flex-col gap-4">
          <Notice tone="green">If {email} is registered, a reset link is on its way.</Notice>
          {state.debug && <Link to={`/reset-password?token=${state.debug}`}>Development mode: open the reset link</Link>}
          <Link to="/login" className="btn-secondary">Back to sign in</Link>
        </div>
      ) : (
        <form className="flex flex-col gap-5" onSubmit={submit}>
          <Field label="Email"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
          <ErrorNote error={state.error} />
          <button className="btn" disabled={state.busy}>{state.busy ? 'Sending…' : 'Email me a reset link'}</button>
          <Link to="/login" className="text-sm font-semibold">Back to sign in</Link>
        </form>
      )}
    </AuthLayout>
  );
}
