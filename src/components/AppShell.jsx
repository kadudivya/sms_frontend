import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { homePath, useAuth } from '../auth/AuthContext';
import { ROLES } from '../lib/labels';
import { NAV } from './nav';

export default function AppShell({ area: requested }) {
  const { user, membership, memberships, switchMembership, logout, can } = useAuth();
  // Shared pages (notifications) borrow the sidebar of the user's own area
  const area = requested === 'notifications' ? homePath(user, membership).slice(1) : requested;
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const items = (NAV[area] || []).filter((i) => !i.permission || can(i.permission));
  const roleLabel = membership
    ? `${membership.institution_kind === 'COLLEGE' ? 'College' : 'University'} ${membership.role === 'ADMIN' ? 'Admin' : 'User'}`
    : ROLES[user?.roles?.[0]] || '';

  const onSwitch = (e) => {
    const id = Number(e.target.value);
    switchMembership(id);
    const m = memberships.find((x) => x.membership_id === id);
    navigate(homePath(user, m));
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <aside className="border-b border-gray-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-[264px] lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-brand-ink text-sm font-bold text-white">SM</div>
            <strong className="text-[15px]">Migration System</strong>
          </div>
          <button type="button" className="btn-secondary min-h-[40px] px-3 lg:hidden" aria-expanded={open} onClick={() => setOpen(!open)}>Menu</button>
        </div>
        <div className={`${open ? 'flex' : 'hidden'} flex-col gap-5 px-4 pb-5 lg:flex lg:h-[calc(100vh-70px)]`}>
          {area === 'platform' ? (
            <div className="flex flex-col gap-0.5 rounded-[10px] bg-brand-ink px-3 py-2.5 text-[13px] text-white">
              <strong className="text-sm">Platform administration</strong>
              <span className="text-slate-300">All institutions · India</span>
            </div>
          ) : membership ? (
            <div className="flex flex-col gap-1 rounded-[10px] border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px]">
              {memberships.length > 1 ? (
                <label className="flex flex-col gap-1">
                  <span className="sr-only">Institution</span>
                  <select className="input h-9" value={membership.membership_id} onChange={onSwitch}>
                    {memberships.map((m) => <option key={m.membership_id} value={m.membership_id}>{m.institution_name}</option>)}
                  </select>
                </label>
              ) : (
                <strong className="text-sm">{membership.institution_name}</strong>
              )}
              <span className="muted">{roleLabel}{membership.is_primary ? ' · primary' : ''}</span>
            </div>
          ) : null}
          <nav aria-label="Main" className="flex flex-col gap-1">
            {items.map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                end={i.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) => `flex min-h-[44px] items-center rounded-lg px-3 text-[15px] font-medium ${
                  isActive ? 'bg-brand-soft font-semibold text-brand' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
              >
                {i.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-0.5 border-t border-gray-200 p-3 text-sm">
            <strong>{user?.full_name}</strong>
            <span className="muted">{roleLabel}</span>
            <div className="mt-2 flex gap-4">
              <NavLink to="/notifications">Notifications</NavLink>
              <button type="button" className="font-medium text-brand hover:text-blue-900" onClick={async () => { await logout(); navigate('/login'); }}>Sign out</button>
            </div>
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-7">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
