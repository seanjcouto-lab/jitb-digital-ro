import { DEFAULT_SHOP_ID } from '../constants';
import { supabase } from '../supabaseClient';

let currentActiveShopId = DEFAULT_SHOP_ID;

export const shopContextService = {
  /**
   * Returns the currently active shop ID.
   */
  getActiveShopId: (): string => {
    return currentActiveShopId;
  },

  /**
   * Returns the default shop ID for the application.
   */
  getDefaultShopId: (): string => {
    return DEFAULT_SHOP_ID;
  },

  /**
   * Sets the active shop context.
   * @param shopId The ID of the shop to switch to.
   */
  setActiveShopId: (shopId: string): void => {
    currentActiveShopId = shopId || DEFAULT_SHOP_ID;
  }
};

export async function fetchShopSubscriptionStatus(shopId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('shops')
    .select('subscription_status')
    .eq('id', shopId)
    .single();
  if (error || !data) return null;
  return data.subscription_status ?? null;
}
