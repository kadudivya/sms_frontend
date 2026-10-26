import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { auth } from '../../api/endpoints';
import { ErrorNote, Field, Notice } from '../../components/ui';
import AuthLayout from './AuthLayout';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [f, setF] = useState({ new_password: '', confirm_password: '' });
  const [state, setState] = useState({ busy: false, error: null, done: false });

  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, error: null, done: false });
    try {
      await auth.resetPassword({ token: params.get('token') || '', ...f });
      setState({ busy: false, error: null, done: true });
    } catch (error) { setState({ busy: false, error, done: false }); }
  };

  return (
    <AuthLayout title="Choose a new password">
      {state.done ? (
        <div className="flex flex-col gap-4">
          <Notice tone="green">Your password has been reset and other sessions were signed out.</Notice>
          <Link to="/login" className="btn">Sign in</Link>
        </div>
      ) : (
        <form className="flex flex-col gap-5" onSubmit={submit}>
          <Field label="New password" error={state.error?.fieldErrors?.new_password}><input className="input" type="password" autoComplete="new-password" value={f.new_password} onChange={(e) => setF({ ...f, new_password: e.target.value })} required /></Field>
          <Field label="Confirm new password" error={state.error?.fieldErrors?.confirm_password}><input className="input" type="password" autoComplete="new-password" value={f.confirm_password} onChange={(e) => setF({ ...f, confirm_password: e.target.value })} required /></Field>
          <ErrorNote error={state.error} />
          <button className="btn" disabled={state.busy}>{state.busy ? 'Saving…' : 'Reset password'}</button>
        </form>
      )}
    </AuthLayout>
  );
}
