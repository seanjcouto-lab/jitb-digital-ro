
import React, { useState, useEffect, useRef } from 'react';
import { VesselHistory } from '../types';
import { vesselService } from '../services/vesselService';
import { MOCK_NEW_CUSTOMER } from '../seedData';

interface OracleSearchViewProps {
  onVesselSelect: (vessel: VesselHistory) => void;
  onNewCustomer: (searchTerm: string) => void;
  onLoadMockData: () => void;
  onHistoricalAlert: (vessel: VesselHistory) => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
}

const OracleSearchView: React.FC<OracleSearchViewProps> = ({ 
  onVesselSelect, 
  onNewCustomer, 
  onLoadMockData,
  onHistoricalAlert,
  searchTerm,
  onSearchChange
}) => {
  const [internalQuery, setInternalQuery] = useState('');
  
  // Use controlled or uncontrolled state
  const query = searchTerm !== undefined ? searchTerm : internalQuery;
  const setQuery = (val: string) => {
    if (onSearchChange) onSearchChange(val);
    else setInternalQuery(val);
  };

  const [oracleResults, setOracleResults] = useState<VesselHistory[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimeout = useRef<number | null>(null);

  useEffect(() => {
    const performSearch = async () => {
      if (query.length < 2) {
        setOracleResults([]);
        return;
      }

      setIsSearching(true);
      
      const results = await vesselService.searchVesselHistory(query);
      
      setOracleResults(results);
      setIsSearching(false);
    };

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = window.setTimeout(performSearch, 300);

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [query]);

  const handleResultClick = (vessel: VesselHistory) => {
    setQuery('');
    setOracleResults([]);
    if (vessel.status === 'INCOMPLETE') {
      onHistoricalAlert(vessel);
    } else {
      onVesselSelect(vessel);
    }
  };

  const handleInputFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      event.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  return (
    <div className="glass rounded-3xl p-4 border-white/5 shadow-2xl relative overflow-hidden group">
      {/* Decorative Technical Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] overflow-hidden">
        <svg width="100%" height="100%">
          <pattern id="grid-search" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5"/>
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid-search)" />
        </svg>
      </div>

      {/* Search Header */}
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-4">
            <label htmlFor="oracle-search" className="block text-[10px] text-neon-seafoam uppercase font-black tracking-[0.2em] animate-pulse">Customer Search</label>
            {isSearching && <span className="text-[8px] font-black text-slate-500 uppercase animate-pulse">Scanning Registry Streams...</span>}
        </div>
        <div className="relative">
          <input 
            id="oracle-search"
            autoComplete="off"
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            onFocus={handleInputFocus}
            placeholder="Search by Name, HIN, or Serial..." 
            className="w-full bg-slate-900/60 border-2 border-neon-seafoam/10 rounded-2xl px-14 py-3 text-white focus:outline-none focus:border-neon-seafoam transition-all text-base shadow-[0_0_40px_rgba(45,212,191,0.05)] placeholder:text-slate-700 font-medium"
          />
          <div className="absolute left-5 top-1/2 -translate-y-1/2">
            <svg className={`w-6 h-6 transition-colors duration-300 ${isSearching ? 'text-neon-seafoam animate-spin' : 'text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
        </div>
      </div>

      {/* Results HUD */}
      <div className="space-y-4 mt-3 relative z-10 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
        {oracleResults.map(res => (
          <div 
            key={res.vesselHIN} 
            onClick={() => handleResultClick(res)} 
            className="p-5 rounded-2xl border transition-all cursor-pointer group flex justify-between items-center bg-slate-900/40 border-white/5 hover:border-neon-seafoam hover:bg-neon-seafoam/5 hover:translate-x-2 shadow-sm"
          >
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center font-black text-slate-500 group-hover:bg-neon-seafoam group-hover:text-slate-900 transition-all border border-white/5">
                {res.customerName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h4 className="font-bold text-slate-100 group-hover:text-white transition-colors">{res.customerName}</h4>
                  <span className="text-[10px] bg-slate-800/80 px-2 py-0.5 rounded text-slate-400 font-mono tracking-tighter uppercase border border-white/5">{res.engineSerial}</span>
                </div>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">{res.boatMake} {res.boatModel}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <span className={`text-[10px] font-black uppercase ${res.status === 'INCOMPLETE' ? 'text-neon-crimson' : 'text-neon-seafoam'}`}>{res.status}</span>
                <div className={`w-2 h-2 rounded-full ${res.status === 'INCOMPLETE' ? 'bg-neon-crimson animate-pulse' : 'bg-neon-seafoam shadow-[0_0_8px_rgba(45,212,191,0.5)]'}`}></div>
              </div>
              <p className="text-[9px] text-slate-600 mt-1 uppercase font-bold tracking-tighter group-hover:text-slate-400">View DNA Matrix →</p>
            </div>
          </div>
        ))}

        {query.length > 1 && !isSearching && oracleResults.length === 0 && (
          <div className="text-center py-6 border-2 border-dashed border-white/5 rounded-3xl bg-slate-900/20 animate-in fade-in zoom-in duration-500">
            <div className="mb-6 opacity-20">
                <svg className="w-16 h-16 mx-auto text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
            </div>
            <p className="text-slate-500 font-bold mb-6 text-sm">Identity Protocol Failure: No Match Found</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 px-8">
                <button onClick={() => onNewCustomer(query)} className="bg-neon-seafoam text-slate-900 text-[10px] font-black px-10 py-4 rounded-xl shadow-xl hover:scale-105 active:scale-95 transition-all uppercase tracking-[0.2em]">Initialize Profile</button>
                <button onClick={onLoadMockData} className="bg-slate-800 text-slate-300 text-[10px] font-black px-10 py-4 rounded-xl border border-white/10 hover:bg-slate-700 transition-all uppercase tracking-[0.2em]">Load Mock Profile</button>
            </div>
          </div>
        )}

        {query.length < 2 && !isSearching && (
          <div className="text-center py-20 opacity-20 relative">
            <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Awaiting Authentication Input...</p>
            <div className="scanline-animation opacity-5"></div>
          </div>
        )}
      </div>

      {/* Decorative Scan UI Elements */}
      <div className="absolute top-0 right-0 p-4 flex gap-1 items-start opacity-10 group-hover:opacity-40 transition-all">
          <div className="w-1 h-8 bg-neon-seafoam rounded-full"></div>
          <div className="w-1 h-4 bg-neon-seafoam rounded-full"></div>
          <div className="w-1 h-12 bg-neon-seafoam rounded-full"></div>
      </div>
    </div>
  );
};

export default OracleSearchView;
