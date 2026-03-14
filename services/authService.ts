import { LoggedInUser, UserRole, UserPrivilege } from '../types';
import { shopContextService } from './shopContextService';
import { sessionStorageService } from './sessionStorageService';

const PASSWORD_MAP: { [key: string]: string } = {
  'Danny': 'Danny',
  'Sean': 'Sean',
  'Mike': 'Mike',
  'Pierre': 'Pierre',
  'Johnny': 'Johnny',
  'Isaiah': 'Isaiah',
};

export const authService = {
  hasPrivilege(user: LoggedInUser | null, p: UserPrivilege): boolean {
    return user?.privileges?.includes(p) || false;
  },

  isDev(user: LoggedInUser | null): boolean {
    return user?.role === UserRole.ADMIN || this.hasPrivilege(user, UserPrivilege.DEVELOPER);
  },

  canAccessRole(user: LoggedInUser | null, targetRole: UserRole, impersonatedRole: UserRole | null): boolean {
    if (!user) return false;

    // Admin can access anything
    if (user.role === UserRole.ADMIN) return true;

    // Developers can access roles only if they are actively impersonating that role
    if (this.isDev(user) && impersonatedRole === targetRole) return true;

    // Everyone else can only access their own role
    return user.role === targetRole;
  },

  resolveEffectiveRole(user: LoggedInUser | null, impersonatedRole: UserRole | null): UserRole {
    if (user && this.isDev(user) && impersonatedRole) {
      return impersonatedRole;
    }
    return user?.role ?? UserRole.TECHNICIAN;
  },

  isImpersonating(user: LoggedInUser | null, impersonatedRole: UserRole | null): boolean {
    return this.isDev(user) && impersonatedRole !== null && impersonatedRole !== user?.role;
  },

  login(candidate: LoggedInUser, password: string): LoggedInUser | null {
    const expectedPassword = PASSWORD_MAP[candidate.name];
    if (expectedPassword && password.toLowerCase() === expectedPassword.toLowerCase()) {
      const authenticatedUser = { ...candidate, shopId: candidate.shopId || shopContextService.getDefaultShopId() };
      shopContextService.setActiveShopId(authenticatedUser.shopId);
      sessionStorageService.saveSession(authenticatedUser);
      return authenticatedUser;
    }
    return null;
  },

  logout(): void {
    shopContextService.setActiveShopId(shopContextService.getDefaultShopId());
    sessionStorageService.clearSession();
  },

  restoreSession(): { user: LoggedInUser | null, impersonatedRole: UserRole | null } {
    const sessionUser = sessionStorageService.loadSession();
    if (sessionUser && sessionUser.shopId) {
      shopContextService.setActiveShopId(sessionUser.shopId);
    }
    const impersonatedRole = sessionStorageService.loadImpersonationState();
    return { user: sessionUser, impersonatedRole };
  },

  startImpersonation(role: UserRole): void {
    sessionStorageService.saveImpersonationState(role);
  },

  stopImpersonation(): void {
    sessionStorageService.saveImpersonationState(null);
  }
};
