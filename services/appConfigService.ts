import { AppConfig } from '../types';
import { DEFAULT_HOURLY_RATE } from '../constants';

export const appConfigService = {
 getDefaultConfig(): AppConfig {
    return {
      logoUrl: 'https://i.imgur.com/QoW6b8j.png',
      companyName: 'STATELINE BOATWORKS',
      hourlyRate: DEFAULT_HOURLY_RATE,
      taxRate: 6.25,
      themeColors: {
        primary: '#2dd4bf',
        secondary: '#38bdf8',
        accent: '#ef4444'
      }
    };
  },

  updateCompanyName(config: AppConfig, companyName: string): AppConfig {
    return { ...config, companyName };
  },

  updateLogoUrl(config: AppConfig, logoUrl: string): AppConfig {
    return { ...config, logoUrl };
  },

updateHourlyRate(config: AppConfig, hourlyRate: number): AppConfig {
    return { ...config, hourlyRate };
  },

  updateTaxRate(config: AppConfig, taxRate: number): AppConfig {
    return { ...config, taxRate };
  }, 

  updateThemeColor(config: AppConfig, colorKey: keyof AppConfig['themeColors'], value: string): AppConfig {
    return {
      ...config,
      themeColors: {
        ...config.themeColors,
        [colorKey]: value
      }
    };
  }
};
