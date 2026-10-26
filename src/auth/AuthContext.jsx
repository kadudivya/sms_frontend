import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from '../api/endpoints';
import { setUnauthorizedHandler, tokens } from '../api/client';

const AuthContext = createContext(null);
const ACTIVE_KEY = 'sms.active_membership';

// The role a membership gives (matches app/enums.py Role)
// institution_kind is UNIVERSITY or COLLEGE (the colleges table also holds STANDALONE,
// PM_VIDYALAXMI and R&D rows; those work like colleges, see institution_type).
export function membershipRole(m) {
  return `${m.institution_kind}_${m.role}`;
}

// URL segment for kind-aware routes: /institutions/<university|college>/<id>
export function urlKind(m) {
  return m?.institution_kind === 'UNIVERSITY' ? 'university' : 'college';
}

export function homePath(user, membership) {
  if (!user) return '/login';
  if (user.roles?.includes('PLATFORM_ADMIN')) return '/platform';
  if (user.roles?.includes('STUDENT')) return '/student';
  const m = membership || (user.memberships || []).find((x) => x.approval_status === 'APPROVED');
  if (m) return m.institution_kind === 'COLLEGE' ? '/college' : '/university';
  return '/pending';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [activeId, setActiveId] = useState(() => {
    try { return Number(window.sessionStorage.getItem(ACTIVE_KEY)) || null; } catch { return null; }
  });

  const clear = useCallback(() => {
    tokens.clear();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!tokens.access) { setReady(true); return null; }
    try {
      const { data } = await auth.me();
      setUser(data);
      return data;
    } catch {
      clear();
      return null;
    } finally {
      setReady(true);
    }
  }, [clear]);

  useEffect(() => {
    setUnauthorizedHandler(() => clear());
    refresh();
  }, [refresh, clear]);

  // Step 1: password. Returns { twoFactorRequired, debugOtp? }
  const login = useCallback(async (email, password) => {
    const { data } = await auth.login(email, password);
    if (data.two_factor_required) {
      tokens.setPreAuth(data.pre_auth_token);
      return { twoFactorRequired: true, debugOtp: data.debug_otp };
    }
    tokens.setAccess(data.access_token);
    setUser(data.user);
    return { twoFactorRequired: false, user: data.user };
  }, []);

  // Step 2 (admins and approvers): emailed code
  const verifyOtp = useCallback(async (otp) => {
    const { data } = await auth.verifyOtp(otp);
    tokens.setPreAuth(null);
    tokens.setAccess(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await auth.logout(); } catch { /* session may already be gone */ }
    clear();
  }, [clear]);

  const memberships = useMemo(
    () => (user?.memberships || []).filter((m) => m.approval_status === 'APPROVED'),
    [user],
  );
  const membership = useMemo(
    () => memberships.find((m) => m.membership_id === activeId) || memberships[0] || null,
    [memberships, activeId],
  );

  const switchMembership = useCallback((id) => {
    setActiveId(id);
    try { window.sessionStorage.setItem(ACTIVE_KEY, String(id)); } catch { /* ignore */ }
  }, []);

  // Platform Admin holds every permission; institution users check the active membership.
  const can = useCallback(
    (permission) => {
      if (user?.roles?.includes('PLATFORM_ADMIN')) return true;
      return !!membership?.permissions?.includes(permission);
    },
    [user, membership],
  );

  const value = useMemo(() => ({
    user, ready, login, verifyOtp, logout, refresh, memberships, membership, switchMembership, can,
    isAdmin: membership?.role === 'ADMIN',
  }), [user, ready, login, verifyOtp, logout, refresh, memberships, membership, switchMembership, can]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
