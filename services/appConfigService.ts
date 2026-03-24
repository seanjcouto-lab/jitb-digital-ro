import { AppConfig } from '../types';
import { DEFAULT_HOURLY_RATE } from '../constants';

const CONFIG_STORAGE_KEY = 'scc_app_config';

export const appConfigService = {
  loadConfig(): AppConfig {
    try {
      const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (stored) return { ...appConfigService.getDefaultConfig(), ...JSON.parse(stored) };
    } catch {}
    return appConfigService.getDefaultConfig();
  },

  saveConfig(config: AppConfig): void {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch {}
  },

getDefaultConfig(): AppConfig {
    return {
      logoUrl: '/assets/logo-dark.png',
      companyName: 'JAXTR',
      hourlyRate: DEFAULT_HOURLY_RATE,
      taxRate: 6.25,
      overridePin: '1234',
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

  updateOverridePin(config: AppConfig, overridePin: string): AppConfig {
    return { ...config, overridePin };
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
