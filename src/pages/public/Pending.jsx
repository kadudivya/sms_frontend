import { useNavigate } from 'react-router-dom';
import { homePath, useAuth } from '../../auth/AuthContext';
import { Badge } from '../../components/ui';
import AuthLayout from './AuthLayout';

// Shown to staff whose access request or registration is still awaiting approval.
export default function Pending() {
  const { user, logout, refresh, membership } = useAuth();
  const navigate = useNavigate();
  const pending = (user?.memberships || []).filter((m) => m.approval_status !== 'APPROVED');

  return (
    <AuthLayout title="Waiting for approval" subtitle="You can sign in, but your institution access has not been approved yet.">
      <ul className="flex flex-col gap-3">
        {pending.map((m) => (
          <li key={m.membership_id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-4">
            <div><strong>{m.institution_name}</strong><p className="text-sm muted">{m.role === 'ADMIN' ? 'Admin' : 'User'} access</p></div>
            <Badge tone={m.approval_status === 'REJECTED' ? 'red' : 'amber'}>{m.approval_status === 'REJECTED' ? 'Rejected' : 'Pending'}</Badge>
          </li>
        ))}
        {pending.length === 0 && <li className="muted">No requests found for this account.</li>}
      </ul>
      <div className="mt-6 flex gap-3">
        <button type="button" className="btn" onClick={async () => { const u = await refresh(); navigate(homePath(u, membership)); }}>Check again</button>
        <button type="button" className="btn-secondary" onClick={async () => { await logout(); navigate('/login'); }}>Sign out</button>
      </div>
    </AuthLayout>
  );
}
