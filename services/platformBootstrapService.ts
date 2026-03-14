import { authService } from './authService';
import { shopContextService } from './shopContextService';
import { appConfigService } from './appConfigService';
import { sessionStorageService } from './sessionStorageService';
import { eventSubscribersService } from './eventSubscribersService';
import { LoggedInUser, UserRole, AppConfig } from '../types';

export interface BootstrapState {
  loggedInUser: LoggedInUser | null;
  impersonatedRole: UserRole | null;
  activeShopId: string;
  config: AppConfig;
  effectiveRole: UserRole;
}

export const platformBootstrapService = {
  bootstrap(): BootstrapState {
    const loggedInUser = sessionStorageService.loadSession();
    const impersonatedRole = sessionStorageService.loadImpersonationState();
    
    if (loggedInUser && loggedInUser.shopId) {
      shopContextService.setActiveShopId(loggedInUser.shopId);
    }
    
    const activeShopId = shopContextService.getActiveShopId();
    const config = appConfigService.getDefaultConfig();
    const effectiveRole = authService.resolveEffectiveRole(loggedInUser, impersonatedRole);
    
    // Register core event subscribers for the platform
    eventSubscribersService.registerCoreSubscribers();
    
    return {
      loggedInUser,
      impersonatedRole,
      activeShopId,
      config,
      effectiveRole
    };
  }
};