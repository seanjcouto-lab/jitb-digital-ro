
import React, { useState, useEffect, useRef } from 'react';
import { VesselHistory, RepairOrder } from '../types';
import { databaseService } from '../services/databaseService';
import VesselDNAView from '../components/VesselDNAView';

interface DatabasePageProps {
  allROs: RepairOrder[];
}

const DatabasePage: React.FC<DatabasePageProps> = ({ allROs }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VesselHistory[]>([]);
  const [allVessels, setAllVessels] = useState<VesselHistory[] | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<VesselHistory | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setAllVessels(null);
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

  const handleViewAll = async () => {
    setIsSearching(true);
    const vessels = await databaseService.getAllVessels();
    setAllVessels(vessels);
    setQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };

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
      </div>

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
        {query.length < 2 && !allVessels && !isSearching && (
          <div className="flex justify-center mb-6">
            <button onClick={handleViewAll} className="px-8 py-3 bg-neon-seafoam/20 border border-neon-seafoam/40 text-neon-seafoam font-black text-sm uppercase tracking-widest rounded-xl hover:bg-neon-seafoam/30 hover:scale-105 active:scale-95 transition-all">
              View All Vessels
            </button>
          </div>
        )}

        {allVessels && query.length < 2 && (
          <div className="mb-4 flex justify-between items-center">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{allVessels.length} vessel{allVessels.length !== 1 ? 's' : ''} on record</p>
            <button onClick={() => setAllVessels(null)} className="text-[10px] text-slate-500 hover:text-white font-bold uppercase transition-colors">Clear</button>
          </div>
        )}

        <div className="space-y-4">
          {(query.length >= 2 ? searchResults : (allVessels || [])).map(res => (
            <div
              key={res.vesselHIN}
              onClick={() => setSelectedVessel(res)}
              className="p-4 rounded-xl border transition-all cursor-pointer group flex justify-between items-center bg-white/5 border-white/5 hover:border-white/20"
            >
              <div>
                <div className="flex items-center gap-3"><h4 className="font-bold text-slate-100">{res.customerName}</h4><span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">{res.vesselHIN || 'No HIN'}</span></div>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-tight mt-1">{res.boatMake} {res.boatModel} {res.engineMake ? `• ${res.engineMake} ${res.engineModel}` : ''}</p>
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
        </div>
      </div>
  </div>
);
};

export default DatabasePage;
