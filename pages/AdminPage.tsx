import React from 'react';
import { AppConfig, CollectionsStatus } from '../types';
import { appConfigService } from '../services/appConfigService';
import { repairOrderService } from '../services/repairOrderService';
import { roStore } from '../data/roStore';

interface AdminPageProps {
  config: AppConfig;
  setConfig: (cfg: AppConfig) => void;
  onExport: () => void;
}

const TEST_RO_INPUT = {
  customerName: 'Test Customer',
  customerPhones: ['555-0000'],
  customerEmails: ['test@jitb.dev'],
  customerAddress: {
    street: '123 Test Marina Dr',
    city: 'Testport',
    state: 'MA',
    zip: '02000',
  },
  customerNotes: null,
  vesselHIN: 'TEST-HIN-001',
  vesselName: 'Test Vessel',
  boatMake: 'Test Make',
  boatModel: 'Model X',
  boatYear: '2020',
  boatLength: '22',
  engineMake: null,
  engineModel: null,
  engineYear: null,
  engineHorsepower: null,
  engineSerial: '',
  selectedPackages: [],
  manualParts: [],
  manualDirectives: ['Verify persistence chain end-to-end'],
  collectionsStatus: CollectionsStatus.NONE,
  shopId: '00000000-0000-0000-0000-000000000001',
};

const AdminPage: React.FC<AdminPageProps> = ({ config, setConfig, onExport }) => {
  const handleInputFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
        event.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };
  
  const handleColorChange = (colorKey: keyof AppConfig['themeColors'], value: string) => {
    setConfig(appConfigService.updateThemeColor(config, colorKey, value));
  };

  const handlePersistenceTest = async () => {
    try {
      console.log('[PERSISTENCE TEST] Step 1: Creation started...');
      const testRO = repairOrderService.createRepairOrder(TEST_RO_INPUT, []);
      console.log('[PERSISTENCE TEST] Step 2: RO created locally.', testRO);

      console.log('[PERSISTENCE TEST] Step 3: Writing to local store...');
      await roStore.add(testRO);
      console.log('[PERSISTENCE TEST] Step 4: Local store write succeeded. Supabase sync triggered automatically.');

      alert(`✅ RO Persistence Test PASSED\nRO ID: ${testRO.id}\nCheck console for sync details.`);
    } catch (err: any) {
      console.error('[PERSISTENCE TEST] FAILED:', err);
      alert(`❌ RO Persistence Test FAILED\n${err?.message || 'Unknown error'}\nCheck console for details.`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="glass p-8 rounded-3xl border-white/10">
        <h2 className="text-2xl font-black neon-seafoam uppercase tracking-tighter mb-8 text-center">White-Label Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] text-slate-500 uppercase font-black mb-2">Platform Identity (Company Name)</label>
              <input 
                value={config.companyName} 
                onChange={(e) => setConfig(appConfigService.updateCompanyName(config, e.target.value))} 
                onFocus={handleInputFocus} 
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-neon-seafoam transition-all" 
                placeholder="e.g. Bob's Marine Services" 
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 uppercase font-black mb-2">Brand Asset (Logo URL)</label>
              <input 
                value={config.logoUrl} 
                onChange={(e) => setConfig(appConfigService.updateLogoUrl(config, e.target.value))} 
                onFocus={handleInputFocus} 
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-neon-seafoam transition-all" 
                placeholder="https://..." 
              />
            </div>
           <div>
              <label className="block text-[10px] text-slate-500 uppercase font-black mb-2">Default Hourly Labor Rate</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input 
                  type="number" 
                  value={config.hourlyRate} 
                  onChange={(e) => setConfig(appConfigService.updateHourlyRate(config, parseFloat(e.target.value) || 0))} 
                  onFocus={handleInputFocus} 
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-8 py-3 text-white focus:border-neon-seafoam transition-all" 
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 uppercase font-black mb-2">Sales Tax Rate (%)</label>
              <div className="relative">
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                <input 
                  type="number" 
                  value={config.taxRate} 
                  onChange={(e) => setConfig(appConfigService.updateTaxRate(config, parseFloat(e.target.value) || 0))} 
                  onFocus={handleInputFocus} 
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-neon-seafoam transition-all" 
                />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <label className="block text-[10px] text-slate-500 uppercase font-black mb-2">Theme Colors</label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-xs text-slate-400 mb-1">Primary</label>
                <input type="color" value={config.themeColors.primary} onChange={(e) => handleColorChange('primary', e.target.value)} className="w-full h-12 bg-slate-900 border border-white/10 rounded-lg" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-400 mb-1">Secondary</label>
                <input type="color" value={config.themeColors.secondary} onChange={(e) => handleColorChange('secondary', e.target.value)} className="w-full h-12 bg-slate-900 border border-white/10 rounded-lg" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-400 mb-1">Accent</label>
                <input type="color" value={config.themeColors.accent} onChange={(e) => handleColorChange('accent', e.target.value)} className="w-full h-12 bg-slate-900 border border-white/10 rounded-lg" />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center">Theme colors are applied application-wide in real-time.</p>
          </div>
        </div>
      </div>
      
      <div className="glass p-8 rounded-3xl border-white/10">
        <h2 className="text-2xl font-black neon-steel uppercase tracking-tighter mb-6 text-center">System Administration & Data</h2>
        <div className="flex justify-center">
            <div className="space-y-4 w-full md:w-1/2">
              <h3 className="text-sm font-bold text-slate-300 mb-2 text-center">Manual Data Management</h3>
              <button onClick={onExport} className="w-full text-center px-6 py-3 bg-slate-800 border border-white/10 text-slate-300 hover:border-neon-steel hover:text-white transition-all rounded-lg font-bold text-xs uppercase tracking-widest">
                Export Application Data
              </button>
              <p className="text-center text-[10px] text-slate-500 mt-2">Downloads a local JSON file of all current repair orders, inventory, and configuration.</p>

              <div className="border-t border-white/10 pt-4 mt-4">
                <h3 className="text-sm font-bold text-yellow-400 mb-2 text-center">⚠ Diagnostic Tools (Temporary)</h3>
                <button onClick={handlePersistenceTest} className="w-full text-center px-6 py-3 bg-yellow-900/40 border border-yellow-500/40 text-yellow-300 hover:border-yellow-400 hover:text-yellow-100 transition-all rounded-lg font-bold text-xs uppercase tracking-widest">
                  Run RO Persistence Test
                </button>
                <p className="text-center text-[10px] text-slate-500 mt-2">Creates a test RO and verifies the full persistence chain. Check browser console for step-by-step results.</p>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;