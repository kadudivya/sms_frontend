import { useState } from 'react';
import { staff } from '../../api/endpoints';
import { urlKind, useAuth } from '../../auth/AuthContext';
import { Async, Badge, Card, Empty, ErrorNote, Field, Modal, Notice, PageHeader, Table } from '../../components/ui';
import { humanize } from '../../lib/labels';
import { useAction, useApi } from '../../lib/useApi';

function BundlePicker({ bundles, value, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {bundles.map((b) => (
        <label key={b} className={`flex min-h-[44px] items-center gap-2 rounded-lg border px-3 text-sm ${value.includes(b) ? 'border-brand bg-brand-soft' : 'border-gray-300'}`}>
          <input type="checkbox" checked={value.includes(b)} onChange={(e) => onChange(e.target.checked ? [...value, b] : value.filter((x) => x !== b))} />
          {humanize(b)}
        </label>
      ))}
    </div>
  );
}

// Team and permissions for the active institution (college or university admins).
export default function Team() {
  const { membership } = useAuth();
  const iid = membership?.institution_id;
  const kind = urlKind(membership);
  const members = useApi(() => staff.members(kind, iid), [kind, iid]);
  const pending = useApi(() => staff.accessRequests(kind, iid), [kind, iid]);
  const meta = useApi(() => staff.bundles(), []);
  const bundleNames = Object.keys(meta.data?.bundles || {});
  const [invite, setInvite] = useState({ full_name: '', email: '', bundles: [], secondary_admin: false });
  const [editing, setEditing] = useState(null);
  const [approving, setApproving] = useState(null);
  const { run, busy, error } = useAction();
  const [sent, setSent] = useState('');

  const reload = () => { members.reload(); pending.reload(); };

  const sendInvite = (e) => {
    e.preventDefault();
    run(async () => {
      await staff.invite(kind, iid, invite.secondary_admin ? { full_name: invite.full_name, email: invite.email, secondary_admin: true } : invite);
      setSent(`Invitation sent to ${invite.email}`);
      setInvite({ full_name: '', email: '', bundles: [], secondary_admin: false });
    }).catch(() => {});
  };

  return (
    <>
      <PageHeader title="Team and permissions" subtitle="Users can do only what their bundles allow. Admins hold every permission for this institution." />

      <Async state={pending}>
        {(rows) => rows.length > 0 && (
          <Card title={`${rows.length} access request${rows.length > 1 ? 's' : ''}`} className="border-amber-200 bg-amber-50">
            <ul className="flex flex-col divide-y divide-amber-100">
              {rows.map((m) => (
                <li key={m.membership_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div><strong>{m.full_name}</strong> · {m.designation} · {m.email}<br /><span className="text-sm muted">{humanize(m.account_state)}</span></div>
                  <div className="flex gap-2">
                    <button type="button" className="btn-secondary" onClick={() => setApproving({ ...m, picked: [] })}>Approve with bundles</button>
                    <button type="button" className="btn-danger" disabled={busy} onClick={() => run(async () => { await staff.decideAccess(m.membership_id, { approve: false, reason: 'Not authorised' }); reload(); }).catch(() => {})}>Reject</button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </Async>

      <Card>
        <Async state={members} empty={<Empty title="No team members yet" />}>
          {(rows) => (
            <Table
              rowKey="membership_id"
              rows={rows.filter((m) => m.approval_status === 'APPROVED')}
              columns={[
                { key: 'name', header: 'Member', render: (m) => <><strong>{m.full_name}</strong><br /><span className="text-sm muted">{m.email}</span></> },
                { key: 'role', header: 'Role', render: (m) => `${m.role === 'ADMIN' ? 'Admin' : 'User'}${m.is_primary ? ' · primary' : ''}` },
                { key: 'b', header: 'Permission bundles', render: (m) => (m.role === 'ADMIN' ? <Badge>All permissions</Badge> : <div className="flex flex-wrap gap-1">{(m.bundles || []).map((b) => <Badge key={b}>{humanize(b)}</Badge>)}</div>) },
                { key: 's', header: 'Status', render: (m) => humanize(m.status) },
                { key: 'a', header: <span className="sr-only">Actions</span>, render: (m) => (m.role === 'USER' ? <button type="button" className="btn-secondary min-h-[36px]" onClick={() => setEditing({ ...m, picked: m.bundles || [] })}>Edit</button> : null) },
              ]}
            />
          )}
        </Async>
      </Card>

      <form className="card flex flex-col gap-4" onSubmit={sendInvite}>
        <h2>Invite a team member</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name"><input className="input" value={invite.full_name} onChange={(e) => setInvite({ ...invite, full_name: e.target.value })} required /></Field>
          <Field label="Official email"><input className="input" type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} required /></Field>
        </div>
        {!invite.secondary_admin && <BundlePicker bundles={bundleNames} value={invite.bundles} onChange={(bundles) => setInvite({ ...invite, bundles })} />}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={invite.secondary_admin} onChange={(e) => setInvite({ ...invite, secondary_admin: e.target.checked })} />Invite as a secondary admin instead</label>
        {sent && <Notice tone="green">{sent}</Notice>}
        <ErrorNote error={error} />
        <div className="flex justify-end"><button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Send invitation'}</button></div>
      </form>

      {(editing || approving) && (
        <Modal title={editing ? `Bundles for ${editing.full_name}` : `Approve ${approving.full_name}`} onClose={() => { setEditing(null); setApproving(null); }}>
          <div className="flex flex-col gap-4">
            <BundlePicker
              bundles={bundleNames}
              value={(editing || approving).picked}
              onChange={(picked) => (editing ? setEditing({ ...editing, picked }) : setApproving({ ...approving, picked }))}
            />
            <ErrorNote error={error} />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => { setEditing(null); setApproving(null); }}>Cancel</button>
              <button
                type="button" className="btn" disabled={busy || (editing || approving).picked.length === 0}
                onClick={() => run(async () => {
                  if (editing) await staff.updatePermissions(editing.membership_id, { bundles: editing.picked });
                  else await staff.decideAccess(approving.membership_id, { approve: true, bundles: approving.picked });
                  setEditing(null); setApproving(null); reload();
                }).catch(() => {})}
              >
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
