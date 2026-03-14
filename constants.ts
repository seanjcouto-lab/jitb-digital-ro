import { Technician } from './types';

export const DEFAULT_SHOP_ID = '00000000-0000-0000-0000-000000000001';

export const SERVICE_PACKAGES = {
  '100-Hour Service': {
    parts: [{ partNumber: '16510-87J02', qty: 1 }],
    laborHours: 3.0
  },
  '300-Hour Service': {
    parts: [{ partNumber: '17400-92J23', qty: 1 }],
    laborHours: 5.5
  },
  'Bottom Painting': {
    parts: [{ partNumber: 'BTM-PAINT-BL', qty: 2 }],
    laborHours: 8.0
  }
};

export const TECHNICIANS: Technician[] = [
  { id: 'tech-1', name: 'Pierre' },
  { id: 'tech-2', name: 'Johnny' },
  { id: 'tech-3', name: 'Isaiah' },
  { id: 'tech-danny', name: 'Danny' },
  { id: 'tech-sean', name: 'Sean' },
];

export const DEFAULT_HOURLY_RATE = 150;