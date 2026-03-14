
import React from 'react';
import { RepairOrder } from '../types';

interface InvoiceModalProps {
  ro: RepairOrder;
  hourlyRate: number;
  onClose: () => void;
  onFinalize: (ro: RepairOrder) => void;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ ro, hourlyRate, onClose, onFinalize }) => {

  const totalMilliseconds = ro.workSessions.reduce((acc, session) => {
    if (session.endTime) {
      return acc + (session.endTime - session.startTime);
    }
    return acc;
  }, 0);
  
  const totalHours = totalMilliseconds / (1000 * 60 * 60);
  const laborTotal = totalHours * hourlyRate;
  const partsTotal = ro.parts.reduce((acc, part) => acc + (part.msrp || 0), 0);
  const grandTotal = laborTotal + partsTotal;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="glass p-6 rounded-2xl w-full max-w-4xl border-2 border-neon-steel shadow-2xl shadow-neon-steel/20 flex flex-col">
        <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-xl font-black uppercase tracking-widest text-neon-steel">Final Review & Invoice Generation</h3>
              <p className="text-xs text-slate-400">RO: {ro.id} for {ro.customerName}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 font-bold text-2xl hover:text-white transition-colors">&times;</button>
        </div>
        
        <div className="flex-grow overflow-y-auto max-h-[75vh] pr-4 space-y-6">
          {/* Labor Section */}
          <section>
            <h4 className="font-bold text-slate-300 uppercase tracking-wider mb-2">Labor Summary</h4>
            <div className="bg-slate-900/50 p-4 rounded-lg border border-white/5">
              <div className="grid grid-cols-3 gap-4 items-center">
                <div>
                    <span className="text-xs text-slate-400 block">Technician</span>
                    <span className="font-bold text-white">{ro.technicianName}</span>
                </div>
                <div>
                    <span className="text-xs text-slate-400 block">Billable Hours</span>
                    <span className="font-mono text-lg text-neon-seafoam">{totalHours.toFixed(2)} hrs</span>
                </div>
                 <div>
                    <span className="text-xs text-slate-400 block">Rate</span>
                    <span className="font-mono text-lg text-white">${hourlyRate.toFixed(2)}/hr</span>
                </div>
              </div>
               <p className="text-xs text-slate-400 mt-3 border-t border-white/5 pt-3">
                <span className="font-bold block text-slate-300 mb-1">Technician's Notes:</span>
                {ro.laborDescription || "No final notes provided."}
              </p>
            </div>
          </section>

          {/* Parts Section */}
          <section>
            <h4 className="font-bold text-slate-300 uppercase tracking-wider mb-2">Parts Used</h4>
            <div className="bg-slate-900/50 rounded-lg border border-white/5">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="p-3">Part #</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {ro.parts.map((part, idx) => (
                    <tr key={idx} className="border-b border-white/5 last:border-b-0">
                      <td className="p-3 font-mono text-xs">{part.partNumber}</td>
                      <td className="p-3">{part.description}</td>
                      <td className="p-3 font-mono text-right">${(part.msrp || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                  {ro.parts.length === 0 && (
                    <tr>
                        <td colSpan={3} className="p-4 text-center text-slate-500 italic text-xs">No parts were used for this job.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

           {/* Directives & Evidence */}
          <section>
            <h4 className="font-bold text-slate-300 uppercase tracking-wider mb-2">Directives & Evidence Log</h4>
             <div className="bg-slate-900/50 p-4 rounded-lg border border-white/5 space-y-3">
              {ro.directives.map(d => (
                <div key={d.id} className="text-sm border-b border-white/5 last:border-b-0 pb-2">
                  <p className="font-bold text-slate-200">{d.title}</p>
                  {d.evidence && d.evidence.length > 0 && (
                     <div className="flex gap-2 mt-1">
                      {d.evidence.map((ev, i) => (
                        <a key={i} href={ev.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded capitalize">
                          View {ev.type}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

        </div>
        
        {/* Totals & Actions */}
        <div className="mt-6 border-t border-white/10 pt-4 flex justify-between items-center">
          <div className="text-right">
            <div className="text-sm text-slate-400">Labor: <span className="font-mono">${laborTotal.toFixed(2)}</span></div>
            <div className="text-sm text-slate-400">Parts: <span className="font-mono">${partsTotal.toFixed(2)}</span></div>
            <div className="text-xl font-bold text-white mt-1">Grand Total: <span className="font-mono text-neon-seafoam">${grandTotal.toFixed(2)}</span></div>
          </div>
          <button 
            onClick={() => onFinalize(ro)} 
            className="px-8 py-4 bg-neon-seafoam text-slate-900 font-black rounded-lg transition-all hover:scale-105 active:scale-95 text-sm uppercase tracking-widest"
          >
            Generate Invoice & Complete
          </button>
        </div>

      </div>
    </div>
  );
};

export default InvoiceModal;
