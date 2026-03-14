import { LoggedInUser, UserRole } from '../types';

const USER_SESSION_KEY = 'jitb_logged_in_user';
const IMPERSONATION_KEY = 'jitb_impersonated_role';

export const sessionStorageService = {
  saveSession(user: LoggedInUser): void {
    sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
  },

  loadSession(): LoggedInUser | null {
    const data = sessionStorage.getItem(USER_SESSION_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data) as LoggedInUser;
    } catch (e) {
      console.error('Failed to parse session data', e);
      return null;
    }
  },

  clearSession(): void {
    sessionStorage.removeItem(USER_SESSION_KEY);
    sessionStorage.removeItem(IMPERSONATION_KEY);
  },

  saveImpersonationState(role: UserRole | null): void {
    if (role) {
      sessionStorage.setItem(IMPERSONATION_KEY, role);
    } else {
      sessionStorage.removeItem(IMPERSONATION_KEY);
    }
  },

  loadImpersonationState(): UserRole | null {
    return (sessionStorage.getItem(IMPERSONATION_KEY) as UserRole) || null;
  }
};
