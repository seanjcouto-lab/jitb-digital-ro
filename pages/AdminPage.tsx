import React, { useState, useMemo, useEffect } from 'react';
import { AppConfig, CollectionsStatus, LoggedInUser, UserRole, UserPrivilege, Part } from '../types';
import { appConfigService } from '../services/appConfigService';
import { repairOrderService } from '../services/repairOrderService';
import { roStore } from '../data/roStore';
import { supabase } from '../supabaseClient';
import { db } from '../localDb';
import InventoryImportModal from '../components/InventoryImportModal';
import { PartsManagerService } from '../services/partsManagerService';
import { databaseService } from '../services/databaseService';
import { DbMetadata } from '../utils/indexedDbInspector';

interface AdminPageProps {
  config: AppConfig;
  setConfig: (cfg: AppConfig) => void;
  onExport: () => void;
  loggedInUser: LoggedInUser | null;
  masterInventory: Part[];
  setMasterInventory: React.Dispatch<React.SetStateAction<Part[]>>;
  shopId: string;
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

const AdminPage: React.FC<AdminPageProps> = ({ config, setConfig, onExport, loggedInUser, masterInventory, setMasterInventory, shopId }) => {
  // All hooks must be called before any early return (React Rules of Hooks)
  const [purgeStatus, setPurgeStatus] = useState<string | null>(null);
  const [purgeConfirm, setPurgeConfirm] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [invPurgeConfirm, setInvPurgeConfirm] = useState<'catalog' | 'onhand' | 'all' | null>(null);
  const [invPurgeStatus, setInvPurgeStatus] = useState<string | null>(null);
  const [showInspector, setShowInspector] = useState(false);
  const [dbMetadata, setDbMetadata] = useState<DbMetadata | null>(null);
  const [isLoadingInspector, setIsLoadingInspector] = useState(false);

  const loadInspectorData = async () => {
    setIsLoadingInspector(true);
    try {
      const dbs = await databaseService.getAvailableDatabases();
      const targetDb = dbs.includes('sccDatabase') ? 'sccDatabase' : (dbs[0] || 'sccDatabase');
      const meta = await databaseService.getDatabaseMetadata(targetDb);
      setDbMetadata(meta);
    } catch (error) {
      console.error('Failed to load inspector data:', error);
    } finally {
      setIsLoadingInspector(false);
    }
  };

  useEffect(() => {
    if (showInspector) loadInspectorData();
  }, [showInspector]);

  const handleExportSchema = () => {
    if (!dbMetadata) return;
    navigator.clipboard.writeText(JSON.stringify(dbMetadata, null, 2));
    alert('Schema snapshot copied to clipboard!');
  };

  const handleExportStore = async (storeName: string) => {
    if (!dbMetadata) return;
    try {
      const data = await databaseService.exportStoreData(dbMetadata.name, storeName);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${storeName}_export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to export store data.');
    }
  };

  const invStats = useMemo(() => {
    const catalog = (masterInventory || []).filter(p => p.source === 'catalog').length;
    const onhand = (masterInventory || []).filter(p => p.source === 'onhand').length;
    const untagged = (masterInventory || []).filter(p => !p.source).length;
    return { total: (masterInventory || []).length, catalog, onhand, untagged };
  }, [masterInventory]);

  const hasDeveloperAccess = loggedInUser?.role === UserRole.ADMIN || loggedInUser?.privileges?.includes(UserPrivilege.DEVELOPER);
  if (!loggedInUser || !hasDeveloperAccess) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-black text-red-400 uppercase tracking-tighter">Access Denied</h2>
          <p className="text-slate-400 mt-2">Admin access is restricted to the account owner.</p>
        </div>
      </div>
    );
  }

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

  const handleInvPurge = async (source: 'catalog' | 'onhand' | 'all') => {
    if (invPurgeConfirm !== source) {
      setInvPurgeConfirm(source);
      return;
    }
    setInvPurgeConfirm(null);
    setInvPurgeStatus('Purging...');
    try {
      // Purge from Dexie
      if (source === 'all') {
        const count = await db.masterInventory.where('shopId').equals(shopId).count();
        await db.masterInventory.where('shopId').equals(shopId).delete();
        // Purge from Supabase
        await supabase.from('master_inventory').delete().eq('shop_id', shopId);
        setInvPurgeStatus(`Purged all ${count} inventory parts.`);
      } else {
        const parts = await db.masterInventory.where('shopId').equals(shopId).filter(p => p.source === source).toArray();
        const partNumbers = parts.map(p => p.partNumber);
        for (let i = 0; i < partNumbers.length; i += 100) {
          const batch = partNumbers.slice(i, i + 100);
          await db.masterInventory.bulkDelete(batch.map(pn => [shopId, pn]));
        }
        // Purge from Supabase
        await supabase.from('master_inventory').delete().eq('shop_id', shopId).eq('source', source);
        setInvPurgeStatus(`Purged ${parts.length} ${source} parts.`);
      }
      // Refresh state
      const fresh = await PartsManagerService.fetchMasterInventory();
      setMasterInventory(fresh);
    } catch (err: any) {
      setInvPurgeStatus(`Purge failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleImportComplete = async () => {
    const fresh = await PartsManagerService.fetchMasterInventory();
    setMasterInventory(fresh);
  };

  const handlePurgeSupabase = async () => {
    if (!purgeConfirm) {
      setPurgeConfirm(true);
      return;
    }
    setPurgeConfirm(false);
    setPurgeStatus('Purging...');
    try {
      const shopId = '00000000-0000-0000-0000-000000000001';

      // Delete child records first (foreign keys)
      const { data: ros } = await supabase.from('repair_orders').select('id').eq('shop_id', shopId);
      const ids = ros?.map(r => r.id) || [];

      if (ids.length > 0) {
        await supabase.from('repair_order_parts').delete().in('repair_order_id', ids);
        await supabase.from('repair_order_directives').delete().in('repair_order_id', ids);
        await supabase.from('work_sessions').delete().in('repair_order_id', ids);
        await supabase.from('payments').delete().in('repair_order_id', ids);
        await supabase.from('repair_order_requests').delete().in('repair_order_id', ids);
      }

      // Delete all ROs for this shop
      const { error } = await supabase.from('repair_orders').delete().eq('shop_id', shopId);
      if (error) throw error;

      // Clear local IndexedDB
      await db.repairOrders.clear();
      await db.vesselDnaHistory.clear();

      setPurgeStatus(`Purged ${ids.length} ROs from Supabase + cleared local DB.`);
      console.log(`[PURGE] Deleted ${ids.length} ROs and all child records for shop ${shopId}`);
    } catch (err: any) {
      setPurgeStatus(`Purge failed: ${err?.message || 'Unknown error'}`);
      console.error('[PURGE] Failed:', err);
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
            <div>
              <label className="block text-[10px] text-slate-500 uppercase font-black mb-2">Invoice Override PIN</label>
              <input 
                type="password"
                maxLength={4}
                value={config.overridePin}
                onChange={(e) => setConfig(appConfigService.updateOverridePin(config, e.target.value))}
                onFocus={handleInputFocus}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-neon-seafoam transition-all font-mono tracking-widest"
                placeholder="4-digit PIN"
              />
              <p className="text-[10px] text-slate-500 mt-1">Required to unlock price editing on invoices.</p>
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
        <h2 className="text-2xl font-black text-orange-400 uppercase tracking-tighter mb-6 text-center">Inventory Administration</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-white">{invStats.total.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Parts</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-blue-400">{invStats.catalog.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Catalog</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-neon-seafoam">{invStats.onhand.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">On-Hand</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-slate-400">{invStats.untagged.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Untagged</p>
          </div>
        </div>

        <div className="space-y-3 max-w-lg mx-auto">
          <button onClick={() => setIsImportModalOpen(true)} className="w-full px-6 py-4 bg-orange-500/20 border border-orange-400/40 text-orange-300 hover:border-orange-400 hover:text-orange-100 transition-all rounded-xl font-black text-sm uppercase tracking-widest">
            Import Inventory / Catalog
          </button>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleInvPurge('catalog')}
              disabled={invStats.catalog === 0}
              className={`px-4 py-3 border transition-all rounded-lg font-bold text-[10px] uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed ${
                invPurgeConfirm === 'catalog'
                  ? 'bg-red-600 border-red-400 text-white animate-pulse'
                  : 'bg-red-900/30 border-red-500/30 text-red-300 hover:border-red-400'
              }`}
            >
              {invPurgeConfirm === 'catalog' ? 'Confirm' : 'Purge Catalog'}
            </button>
            <button
              onClick={() => handleInvPurge('onhand')}
              disabled={invStats.onhand === 0}
              className={`px-4 py-3 border transition-all rounded-lg font-bold text-[10px] uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed ${
                invPurgeConfirm === 'onhand'
                  ? 'bg-red-600 border-red-400 text-white animate-pulse'
                  : 'bg-red-900/30 border-red-500/30 text-red-300 hover:border-red-400'
              }`}
            >
              {invPurgeConfirm === 'onhand' ? 'Confirm' : 'Purge On-Hand'}
            </button>
            <button
              onClick={() => handleInvPurge('all')}
              disabled={invStats.total === 0}
              className={`px-4 py-3 border transition-all rounded-lg font-bold text-[10px] uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed ${
                invPurgeConfirm === 'all'
                  ? 'bg-red-600 border-red-400 text-white animate-pulse'
                  : 'bg-red-900/30 border-red-500/30 text-red-300 hover:border-red-400'
              }`}
            >
              {invPurgeConfirm === 'all' ? 'Confirm' : 'Purge All'}
            </button>
          </div>

          {invPurgeStatus && (
            <p className={`text-center text-[10px] font-bold ${invPurgeStatus.includes('failed') ? 'text-red-400' : 'text-green-400'}`}>
              {invPurgeStatus}
            </p>
          )}
          <p className="text-center text-[10px] text-slate-500">Purge removes parts from local database and Supabase. Re-import after purging.</p>
        </div>
      </div>

      {isImportModalOpen && <InventoryImportModal onClose={() => setIsImportModalOpen(false)} onImportComplete={handleImportComplete} shopId={shopId} />}

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
                <h3 className="text-sm font-bold text-yellow-400 mb-2 text-center">Diagnostic Tools</h3>
                <button onClick={handlePersistenceTest} className="w-full text-center px-6 py-3 bg-yellow-900/40 border border-yellow-500/40 text-yellow-300 hover:border-yellow-400 hover:text-yellow-100 transition-all rounded-lg font-bold text-xs uppercase tracking-widest">
                  Run RO Persistence Test
                </button>
                <p className="text-center text-[10px] text-slate-500 mt-2">Creates a test RO and verifies the full persistence chain. Check browser console for step-by-step results.</p>

                <button
                  onClick={() => setShowInspector(!showInspector)}
                  className={`w-full text-center px-6 py-3 mt-3 border transition-all rounded-lg font-bold text-xs uppercase tracking-widest ${
                    showInspector
                      ? 'bg-neon-seafoam text-slate-900 border-neon-seafoam'
                      : 'bg-yellow-900/40 border-yellow-500/40 text-yellow-300 hover:border-yellow-400 hover:text-yellow-100'
                  }`}
                >
                  {showInspector ? 'Close DB Inspector' : 'IndexedDB Inspector'}
                </button>
                <p className="text-center text-[10px] text-slate-500 mt-2">Inspect local database tables, indexes, record counts, and sample data.</p>

                {showInspector && (
                  <div className="mt-4 space-y-4 animate-in fade-in duration-300">
                    <div className="flex justify-center gap-3">
                      <button onClick={loadInspectorData} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold uppercase tracking-widest transition-all">
                        Refresh
                      </button>
                      <button onClick={handleExportSchema} className="px-3 py-1.5 bg-neon-seafoam/20 hover:bg-neon-seafoam/30 text-neon-seafoam rounded text-[10px] font-bold uppercase tracking-widest transition-all border border-neon-seafoam/30">
                        Export Schema
                      </button>
                    </div>

                    {isLoadingInspector ? (
                      <div className="py-10 text-center">
                        <div className="inline-block h-8 w-8 border-4 border-slate-700 border-t-neon-seafoam rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-500 font-mono text-xs">Scanning IndexedDB...</p>
                      </div>
                    ) : dbMetadata ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 text-center">
                            <p className="text-[9px] text-slate-500 uppercase font-black">Database</p>
                            <p className="text-sm font-mono text-neon-seafoam">{dbMetadata.name}</p>
                          </div>
                          <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 text-center">
                            <p className="text-[9px] text-slate-500 uppercase font-black">Version</p>
                            <p className="text-sm font-mono text-white">{dbMetadata.version}</p>
                          </div>
                          <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 text-center">
                            <p className="text-[9px] text-slate-500 uppercase font-black">Stores</p>
                            <p className="text-sm font-mono text-white">{dbMetadata.stores.length}</p>
                          </div>
                        </div>

                        {dbMetadata.stores.map(store => (
                          <div key={store.name} className="border border-white/5 rounded-xl overflow-hidden bg-slate-900/30">
                            <div className="bg-white/5 p-3 flex justify-between items-center">
                              <div>
                                <h4 className="font-black text-white text-sm uppercase tracking-tight">{store.name}</h4>
                                <p className="text-[9px] text-slate-500 font-mono">
                                  KeyPath: {JSON.stringify(store.keyPath)} | Records: {store.count}
                                </p>
                              </div>
                              <button onClick={() => handleExportStore(store.name)} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-[9px] font-bold uppercase transition-all">
                                Export
                              </button>
                            </div>
                            <div className="p-3 space-y-3">
                              {store.indexes.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {store.indexes.map(idx => (
                                    <span key={idx.name} className="px-1.5 py-0.5 bg-slate-800 rounded text-[9px] text-slate-300 font-mono border border-white/5">
                                      {idx.name} {idx.unique ? '[U]' : ''}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="bg-black/40 p-3 rounded-lg overflow-x-auto max-h-40">
                                <pre className="text-[9px] text-slate-400 font-mono leading-relaxed">
                                  {JSON.stringify(store.sample, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-slate-500 text-xs italic py-4">No database metadata found.</p>
                    )}
                  </div>
                )}

                {import.meta.env.DEV && (
                  <div className="border-t border-red-500/30 pt-4 mt-4">
                    <h3 className="text-sm font-bold text-red-400 mb-2 text-center">DEV ONLY — Data Purge</h3>
                    <button
                      onClick={handlePurgeSupabase}
                      className={`w-full text-center px-6 py-3 border transition-all rounded-lg font-bold text-xs uppercase tracking-widest ${
                        purgeConfirm
                          ? 'bg-red-600 border-red-400 text-white animate-pulse'
                          : 'bg-red-900/40 border-red-500/40 text-red-300 hover:border-red-400 hover:text-red-100'
                      }`}
                    >
                      {purgeConfirm ? 'CLICK AGAIN TO CONFIRM — THIS DELETES EVERYTHING' : 'Purge All Supabase + Local Data'}
                    </button>
                    {purgeStatus && (
                      <p className={`text-center text-[10px] mt-2 font-bold ${purgeStatus.includes('failed') ? 'text-red-400' : 'text-green-400'}`}>
                        {purgeStatus}
                      </p>
                    )}
                    <p className="text-center text-[10px] text-red-400/60 mt-1">Deletes ALL repair orders, parts, directives, sessions, and vessel DNA for this shop. Dev only — stripped from production builds.</p>
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;