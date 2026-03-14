import { supabase } from '../supabaseClient';
import { LoggedInUser, UserRole, UserPrivilege } from '../types';
import { shopContextService } from './shopContextService';

export type AuthResult =
  | { status: 'ok'; user: LoggedInUser }
  | { status: 'no_mapping' }
  | { status: 'error'; message: string };

async function resolveAppUser(authUid: string): Promise<LoggedInUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, role, shop_id, auth_user_id')
    .eq('auth_user_id', authUid)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    role: data.role as UserRole,
    privileges: data.role === UserRole.ADMIN ? [UserPrivilege.DEVELOPER] : [],
    shopId: data.shop_id,
  };
}

export const supabaseAuthService = {
  async signIn(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return { status: 'error', message: error?.message ?? 'Sign in failed' };
    }

    const appUser = await resolveAppUser(data.user.id);
    if (!appUser) {
      return { status: 'no_mapping' };
    }

    shopContextService.setActiveShopId(appUser.shopId!);
    return { status: 'ok', user: appUser };
  },

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
    shopContextService.setActiveShopId(shopContextService.getDefaultShopId());
  },

  async restoreSession(): Promise<{ user: LoggedInUser | null }> {
    const { data } = await supabase.auth.getSession();
    const authUser = data.session?.user;
    if (!authUser) return { user: null };

    const appUser = await resolveAppUser(authUser.id);
    if (appUser) {
      shopContextService.setActiveShopId(appUser.shopId!);
    }
    return { user: appUser };
  },
};
