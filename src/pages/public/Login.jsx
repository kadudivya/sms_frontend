import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { homePath, useAuth } from '../../auth/AuthContext';
import { auth as authApi } from '../../api/endpoints';
import { ErrorNote, Field, Notice } from '../../components/ui';
import AuthLayout from './AuthLayout';

export default function Login() {
  const { user, ready, login, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [debugOtp, setDebugOtp] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState('');

  if (ready && user && step !== 'otp') return <Navigate to={homePath(user)} replace />;

  const goHome = (u) => navigate(location.state?.from || homePath(u), { replace: true });

  const onPassword = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await login(email, password);
      if (res.twoFactorRequired) { setStep('otp'); setDebugOtp(res.debugOtp || null); }
      else goHome(res.user);
    } catch (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED') navigate(`/verify-email?email=${encodeURIComponent(email)}`);
      else setError(err);
    } finally { setBusy(false); }
  };

  const onOtp = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { goHome(await verifyOtp(otp)); } catch (err) { setError(err); } finally { setBusy(false); }
  };

  const resend = async () => {
    setError(null);
    try {
      const { data } = await authApi.resendOtp();
      setDebugOtp(data?.debug_otp || null);
      setInfo('A new code has been sent to your email.');
    } catch (err) { setError(err); }
  };

  if (step === 'otp') {
    return (
      <AuthLayout title="Enter your sign-in code" subtitle={`We emailed a 6-digit code to ${email}. It expires in 10 minutes.`}>
        <form className="flex flex-col gap-5" onSubmit={onOtp}>
          <Field label="Sign-in code">
            <input className="input text-lg tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required autoFocus />
          </Field>
          {debugOtp && <Notice tone="amber">Development mode: your code is <strong>{debugOtp}</strong></Notice>}
          {info && <Notice tone="green">{info}</Notice>}
          <ErrorNote error={error} />
          <button className="btn" disabled={busy || otp.length < 4}>{busy ? 'Checking…' : 'Verify and sign in'}</button>
          <div className="flex justify-between text-sm">
            <button type="button" className="font-semibold text-brand" onClick={resend}>Send a new code</button>
            <button type="button" className="muted" onClick={() => { setStep('password'); setOtp(''); }}>Use a different account</button>
          </div>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Sign in" subtitle="Students, college staff, university staff and platform admins all sign in here.">
      <form className="flex flex-col gap-5" onSubmit={onPassword}>
        <Field label="Email"><input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Field label="Password"><input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
        <ErrorNote error={error} />
        <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <Link to="/forgot-password" className="text-sm font-semibold">Forgot password?</Link>
      </form>
      <div className="mt-10 flex flex-col gap-2 border-t border-gray-200 pt-6 text-sm">
        <p>New student? <Link to="/register" className="font-semibold">Create your account</Link></p>
        <p>Represent a college or university? <Link to="/institution-register" className="font-semibold">Request admin access</Link></p>
      </div>
    </AuthLayout>
  );
}
