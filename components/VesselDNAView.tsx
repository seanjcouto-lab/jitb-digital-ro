import React from 'react';
import { VesselHistory, RepairOrder } from '../types';
import SectionHeader from './SectionHeader';

interface VesselDNAViewProps {
  vessel: VesselHistory;
  allROs: RepairOrder[];
  onClose?: () => void;
}

const VesselDNAView: React.FC<VesselDNAViewProps> = ({ vessel, allROs, onClose }) => {
  const vesselROs = vessel.pastROs.slice().sort((a, b) => b.id.localeCompare(a.id));

  return (
    <div className="glass p-6 rounded-3xl w-full max-w-6xl border border-neon-steel shadow-2xl shadow-neon-steel/20 flex flex-col max-h-[90vh] relative overflow-hidden">
      {/* Decorative Technical Grid Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] overflow-hidden">
          <svg width="100%" height="100%">
              <pattern id="grid-vessel" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid-vessel)" />
          </svg>
      </div>

      <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4 relative z-10">
          <div>
            <h3 className="text-2xl font-black uppercase tracking-widest text-white">Vessel DNA Matrix</h3>
            <p className="text-xs text-slate-500 font-mono">HIN ACCESS: {vessel.vesselHIN}</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors bg-white/5 rounded-full">&times;</button>
          )}
      </div>
      
      <div className="flex-grow overflow-y-auto pr-4 grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">
          {/* Schematic Visualization */}
          <div className="lg:col-span-1 space-y-6">
              <section className="bg-slate-900/80 p-4 rounded-2xl border border-white/10">
                  <SectionHeader title="Technical Schematic" />
                  <div className="aspect-[3/4] flex items-center justify-center p-4 border border-neon-steel/20 rounded-xl relative group">
                      <svg className="w-full h-full text-neon-steel animate-in zoom-in duration-1000" viewBox="0 0 200 300" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M100 20 L130 50 L130 250 L100 280 L70 250 L70 50 Z" />
                        <circle cx="100" cy="150" r="30" strokeDasharray="5 5" />
                        <path d="M80 50 L120 50 M80 100 L120 100 M80 150 L120 150 M80 200 L120 200" strokeOpacity="0.3" />
                        <text x="100" y="295" textAnchor="middle" fontSize="8" fill="currentColor" stroke="none">HULL ARCHITECTURE</text>
                      </svg>
                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                        <div className="w-1 h-1 bg-neon-steel rounded-full animate-ping"></div>
                        <div className="w-1 h-1 bg-neon-steel rounded-full opacity-50"></div>
                      </div>
                  </div>
              </section>

              <section>
                  <SectionHeader title="Oracle Status" />
                  <div className={`p-4 rounded-xl border ${vessel.status === 'INCOMPLETE' ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                      <p className={`font-black text-xs uppercase ${vessel.status === 'INCOMPLETE' ? 'text-red-400' : 'text-green-400'}`}>{vessel.status}</p>
                      <p className="text-[10px] text-slate-300 mt-1 leading-tight">{vessel.unresolvedNotes || 'All records within acceptable parameters.'}</p>
                  </div>
              </section>
          </div>

          {/* Core Data Column */}
          <div className="lg:col-span-1 space-y-6">
              <section>
                  <SectionHeader title="Asset DNA" />
                  <div className="text-xs space-y-3 text-slate-300 font-medium">
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-slate-500 uppercase tracking-tighter">Make</span> 
                        <span className="text-white font-bold">{vessel.boatMake}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-slate-500 uppercase tracking-tighter">Model</span> 
                        <span className="text-white font-bold">{vessel.boatModel}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-slate-500 uppercase tracking-tighter">Year</span> 
                        <span className="text-white font-bold">{vessel.boatYear}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-slate-500 uppercase tracking-tighter">Length</span> 
                        <span className="text-white font-bold">{vessel.boatLength}</span>
                      </div>
                  </div>
              </section>
               <section>
                  <SectionHeader title="Propulsion Scan" />
                  <div className="text-xs space-y-3 text-slate-300 font-medium">
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-slate-500 uppercase tracking-tighter">Engine</span> 
                        <span className="text-white font-bold">{vessel.engineMake} {vessel.engineHorsepower}HP</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-slate-500 uppercase tracking-tighter">Serial</span> 
                        <span className="text-neon-steel font-mono">{vessel.engineSerial}</span>
                      </div>
                  </div>
              </section>
               <section>
                  <SectionHeader title="Owner Credentials" />
                  <div className="text-xs space-y-2 text-slate-300 font-medium">
                      <p className="font-bold text-white uppercase tracking-wider">{vessel.customerName}</p>
                      <p className="flex items-center gap-2"><svg className="w-3 h-3 text-slate-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/></svg>{vessel.customerPhones.join(', ')}</p>
                      <p className="flex items-center gap-2"><svg className="w-3 h-3 text-slate-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>{vessel.customerEmails.join(', ')}</p>
                  </div>
              </section>
          </div>

          {/* Right Column: RO History */}
          <div className="lg:col-span-2 space-y-4">
               <SectionHeader title="Service History Manifest" />
               <div className="space-y-3 pb-6">
                  {vesselROs.map(pastRO => {
                      const fullRO = allROs.find(r => r.id === pastRO.id);
                      return (
                        <div key={pastRO.id} className="p-4 bg-slate-900/70 rounded-2xl border border-white/5 hover:border-neon-steel transition-all group">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-black text-white group-hover:neon-steel transition-all">{pastRO.id}</p>
                                    <p className="text-[10px] text-slate-500 font-mono uppercase">Gate Closed: {pastRO.date}</p>
                                </div>
                                <div className="text-[9px] font-black px-2 py-0.5 rounded bg-slate-800 text-slate-400">ARCHIVED</div>
                            </div>
                            {fullRO && fullRO.directives.length > 0 && (
                              <div className="mt-3 border-t border-white/5 pt-3">
                                  <p className="text-[9px] text-slate-500 font-black uppercase mb-2">Directives Executed</p>
                                  <div className="flex flex-wrap gap-1">
                                      {fullRO.directives.map(d => <span key={d.id} className="text-[8px] bg-slate-800 border border-white/5 text-slate-300 px-2 py-0.5 rounded uppercase tracking-tighter">{d.title}</span>)}
                                  </div>
                              </div>
                            )}
                            {pastRO.partsUsed.length > 0 && (
                                <div className="mt-3 border-t border-white/5 pt-3">
                                    <p className="text-[9px] text-slate-500 font-black uppercase mb-2">Parts Consumed</p>
                                    <div className="flex flex-wrap gap-1">
                                        {pastRO.partsUsed.map(part => (
                                            <span key={part.partNumber} className="text-[8px] font-mono bg-slate-800/60 border border-white/5 text-slate-400 px-2 py-0.5 rounded" title={part.description}>
                                                {part.partNumber}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {pastRO.summary && pastRO.summary !== 'No summary provided.' && (
                              <div className="mt-3 bg-white/5 p-2 rounded-lg">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Tech Summary:</p>
                                  <p className="text-[10px] text-slate-300 leading-tight line-clamp-2">{pastRO.summary}</p>
                              </div>
                            )}
                        </div>
                      )
                  })}
                  {vesselROs.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/5 rounded-3xl opacity-30">
                        <svg className="w-12 h-12 text-slate-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        <p className="text-xs uppercase font-black tracking-widest">No Historical Sessions Found</p>
                    </div>
                  )}
               </div>
          </div>
      </div>
    </div>
  );
};

export default VesselDNAView;