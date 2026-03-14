import { DEFAULT_SHOP_ID } from '../constants';

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
