
import React, { useState, useEffect, useRef } from 'react';
import { VesselHistory, RepairOrder } from '../types';
import { databaseService } from '../services/databaseService';
import VesselDNAView from '../components/VesselDNAView';
import { DbMetadata } from '../utils/indexedDbInspector';

interface DatabasePageProps {
  allROs: RepairOrder[];
}

const DatabasePage: React.FC<DatabasePageProps> = ({ allROs }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VesselHistory[]>([]);
  const [selectedVessel, setSelectedVessel] = useState<VesselHistory | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [dbMetadata, setDbMetadata] = useState<DbMetadata | null>(null);
  const [availableDbs, setAvailableDbs] = useState<string[]>([]);
  const [isLoadingInspector, setIsLoadingInspector] = useState(false);
  const debounceTimeout = useRef<number | null>(null);

  const loadInspectorData = async () => {
    setIsLoadingInspector(true);
    try {
      const dbs = await databaseService.getAvailableDatabases();
      setAvailableDbs(dbs);
      
      // Default to sccDatabase if it exists, otherwise the first one
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
    if (showInspector) {
      loadInspectorData();
    }
  }, [showInspector]);

  const handleExportSchema = () => {
    if (!dbMetadata) return;
    const blob = JSON.stringify(dbMetadata, null, 2);
    navigator.clipboard.writeText(blob);
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

  useEffect(() => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = window.setTimeout(async () => {
      const results = await databaseService.searchVesselHistory(query);

      setSearchResults(results);
      setIsSearching(false);
    }, 300);

  }, [query]);

  const handleInputFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      event.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  if (selectedVessel) {
    return (
      <div className="animate-in fade-in duration-500">
        <button 
          onClick={() => setSelectedVessel(null)} 
          className="text-[10px] font-bold text-slate-400 hover:text-white uppercase transition-all bg-white/5 px-4 py-2 rounded-lg border border-white/5 mb-6"
        >
          ← Back to Database Search
        </button>
        <VesselDNAView vessel={selectedVessel} allROs={allROs} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b border-white/5 pb-4">
        <div>
          <h2 className="text-3xl font-black neon-seafoam uppercase tracking-tighter">Vessel DNA Database</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Historical Service Record Oracle</p>
        </div>
        <button 
          onClick={() => setShowInspector(!showInspector)}
          className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
            showInspector 
              ? 'bg-neon-seafoam text-slate-900 border-neon-seafoam' 
              : 'bg-white/5 text-slate-400 border-white/10 hover:border-neon-seafoam/50'
          }`}
        >
          {showInspector ? 'Close Inspector' : 'DB Inspector'}
        </button>
      </div>

      {showInspector ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="glass rounded-2xl p-6 border-white/5">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">IndexedDB Schema Inspector</h3>
                <p className="text-xs text-slate-500 font-bold uppercase">Live Introspection of Local Storage</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={loadInspectorData}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold uppercase tracking-widest transition-all"
                >
                  Refresh
                </button>
                <button 
                  onClick={handleExportSchema}
                  className="px-3 py-1.5 bg-neon-seafoam/20 hover:bg-neon-seafoam/30 text-neon-seafoam rounded text-[10px] font-bold uppercase tracking-widest transition-all border border-neon-seafoam/30"
                >
                  Export Schema Snapshot
                </button>
              </div>
            </div>

            {isLoadingInspector ? (
              <div className="py-20 text-center">
                <div className="inline-block h-8 w-8 border-4 border-slate-700 border-t-neon-seafoam rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-mono text-xs">Scanning IndexedDB Layers...</p>
              </div>
            ) : dbMetadata ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Database Name</p>
                    <p className="text-lg font-mono text-neon-seafoam">{dbMetadata.name}</p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Version</p>
                    <p className="text-lg font-mono text-white">{dbMetadata.version}</p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Object Stores</p>
                    <p className="text-lg font-mono text-white">{dbMetadata.stores.length}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {dbMetadata.stores.map(store => (
                    <div key={store.name} className="border border-white/5 rounded-xl overflow-hidden bg-slate-900/30">
                      <div className="bg-white/5 p-4 flex justify-between items-center">
                        <div>
                          <h4 className="font-black text-white uppercase tracking-tight">{store.name}</h4>
                          <p className="text-[10px] text-slate-500 font-mono">
                            KeyPath: {JSON.stringify(store.keyPath)} | AutoIncrement: {store.autoIncrement ? 'YES' : 'NO'} | Records: {store.count}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleExportStore(store.name)}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                          Export JSON
                        </button>
                      </div>
                      
                      <div className="p-4 space-y-4">
                        {store.indexes.length > 0 && (
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase font-black mb-2">Indexes</p>
                            <div className="flex flex-wrap gap-2">
                              {store.indexes.map(idx => (
                                <span key={idx.name} className="px-2 py-1 bg-slate-800 rounded text-[10px] text-slate-300 font-mono border border-white/5">
                                  {idx.name} ({JSON.stringify(idx.keyPath)}) {idx.unique ? '[U]' : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-black mb-2">Sample Data (First 5 Records)</p>
                          <div className="bg-black/40 p-4 rounded-lg overflow-x-auto">
                            <pre className="text-[10px] text-slate-400 font-mono leading-relaxed">
                              {JSON.stringify(store.sample, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-2xl">
                <p className="text-slate-500 italic">No database metadata found.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-6 border-white/5">
        <div className="relative mb-8">
          <label className="block text-[10px] text-neon-seafoam uppercase font-black mb-3 tracking-widest">Vessel Identity Scan</label>
          <div className="relative">
            <input 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              onFocus={handleInputFocus}
              placeholder="Search Name, HIN, Engine S/N, Phone..." 
              className="w-full bg-slate-900/80 border-2 border-neon-seafoam/20 rounded-xl px-12 py-4 text-white focus:outline-none focus:border-neon-seafoam transition-all text-lg shadow-[0_0_20px_rgba(45,212,191,0.1)]" 
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-neon-seafoam" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            {isSearching && <div className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 border-2 border-slate-500 border-t-white rounded-full animate-spin"></div>}
          </div>
        </div>
        <div className="space-y-4">
          {searchResults.map(res => (
            <div 
              key={res.vesselHIN} 
              onClick={() => setSelectedVessel(res)} 
              className="p-4 rounded-xl border transition-all cursor-pointer group flex justify-between items-center bg-white/5 border-white/5 hover:border-white/20"
            >
              <div>
                <div className="flex items-center gap-3"><h4 className="font-bold text-slate-100">{res.customerName}</h4><span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">{res.engineSerial}</span></div>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-tight mt-1">{res.boatMake} {res.boatModel} • {res.engineModel}</p>
              </div>
              <div className="text-right flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase ${res.status === 'INCOMPLETE' ? 'text-red-400' : 'text-neon-seafoam'}`}>{res.status}</span>
                <div className={`w-2 h-2 rounded-full ${res.status === 'INCOMPLETE' ? 'bg-red-400' : 'bg-neon-seafoam'}`}></div>
              </div>
            </div>
          ))}
          {query.length > 2 && !isSearching && searchResults.length === 0 && (
            <div className="text-center py-10 border border-white/5 rounded-2xl bg-white/5">
              <p className="text-slate-500 italic text-sm mb-4 font-medium">Oracle finds no existing match for "{query}".</p>
            </div>
          )}
          {query.length < 2 && !isSearching && (
            <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-2xl relative overflow-hidden">
              <p className="text-slate-600 text-xs font-black uppercase tracking-[0.2em]">Awaiting Oracle Query...</p>
              <div className="scanline-animation opacity-5"></div>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);
};

export default DatabasePage;
