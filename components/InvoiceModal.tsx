
import React, { useState } from 'react';
import { RepairOrder } from '../types';

interface InvoiceModalProps {
  ro: RepairOrder;
  hourlyRate: number;
  taxRate: number;
  overridePin: string;
  onClose: () => void;
  onFinalize: (ro: RepairOrder, isTaxExempt: boolean, taxExemptId: string) => void;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ ro, hourlyRate, taxRate, overridePin, onClose, onFinalize }) => {

  const [isTaxExempt, setIsTaxExempt] = useState(false);
  const [taxExemptId, setTaxExemptId] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinEntry, setPinEntry] = useState('');
  const [pinError, setPinError] = useState(false);
  const [editedHours, setEditedHours] = useState<number | null>(null);
  const [editedRate, setEditedRate] = useState<number | null>(null);
  const [editedPartPrices, setEditedPartPrices] = useState<Record<number, number>>({});
  const [discount, setDiscount] = useState<number>(0);

  const handlePinSubmit = () => {
    if (pinEntry === overridePin) {
      setIsUnlocked(true);
      setShowPinModal(false);
      setPinEntry('');
      setPinError(false);
    } else {
      setPinError(true);
      setPinEntry('');
    }
  };

 const totalMilliseconds = ro.workSessions.reduce((acc, session) => {
    if (session.endTime) {
      return acc + (session.endTime - session.startTime);
    }
    return acc;
  }, 0);
  
  const baseHours = totalMilliseconds / (1000 * 60 * 60);
  const totalHours = editedHours !== null ? editedHours : baseHours;
  const effectiveRate = editedRate !== null ? editedRate : hourlyRate;
  const laborTotal = totalHours * effectiveRate;
  const partsTotal = ro.parts.reduce((acc, part, idx) => acc + (editedPartPrices[idx] !== undefined ? editedPartPrices[idx] : (part.msrp || 0)), 0);
  const taxAmount = isTaxExempt ? 0 : (partsTotal * (taxRate / 100));
  const grandTotal = Math.max(0, laborTotal + partsTotal + taxAmount - discount);

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
                    {isUnlocked ? (
                      <input type="number" step="0.01" value={editedHours !== null ? editedHours : baseHours.toFixed(2)} onChange={e => setEditedHours(parseFloat(e.target.value) || 0)} className="w-full bg-yellow-500/10 border border-yellow-500/50 rounded px-2 py-1 text-yellow-300 font-mono text-lg outline-none" />
                    ) : (
                      <span className="font-mono text-lg text-neon-seafoam">{totalHours.toFixed(2)} hrs</span>
                    )}
                </div>
                <div>
                    <span className="text-xs text-slate-400 block">Rate</span>
                    {isUnlocked ? (
                      <input type="number" step="0.01" value={editedRate !== null ? editedRate : hourlyRate} onChange={e => setEditedRate(parseFloat(e.target.value) || 0)} className="w-full bg-yellow-500/10 border border-yellow-500/50 rounded px-2 py-1 text-yellow-300 font-mono text-lg outline-none" />
                    ) : (
                      <span className="font-mono text-lg text-white">${effectiveRate.toFixed(2)}/hr</span>
                    )}
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
                      <td className="p-3 font-mono text-right">
                        {isUnlocked ? (
                          <input type="number" step="0.01" value={editedPartPrices[idx] !== undefined ? editedPartPrices[idx] : (part.msrp || 0)} onChange={e => setEditedPartPrices(prev => ({ ...prev, [idx]: parseFloat(e.target.value) || 0 }))} className="w-24 bg-yellow-500/10 border border-yellow-500/50 rounded px-2 py-1 text-yellow-300 font-mono text-right outline-none" />
                        ) : (
                          <span>${(editedPartPrices[idx] !== undefined ? editedPartPrices[idx] : (part.msrp || 0)).toFixed(2)}</span>
                        )}
                      </td>
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
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={isTaxExempt} onChange={e => setIsTaxExempt(e.target.checked)} className="h-4 w-4" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tax Exempt</span>
              </label>
              {isTaxExempt && (
                <input value={taxExemptId} onChange={e => setTaxExemptId(e.target.value)} placeholder="Tax Exempt ID #" className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-neon-seafoam outline-none" />
              )}
              {!isUnlocked && (
                <button onClick={() => setShowPinModal(true)} className="px-4 py-2 bg-slate-800 border border-yellow-500/30 text-yellow-400 text-xs font-black rounded-lg uppercase tracking-widest hover:bg-yellow-500/10 transition-all">
                  Override Pricing
                </button>
              )}
              {isUnlocked && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">⚠ Override Active</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Discount $</span>
                    <input type="number" step="0.01" min="0" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className="w-24 bg-yellow-500/10 border border-yellow-500/50 rounded px-2 py-1 text-yellow-300 font-mono outline-none" />
                  </div>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">Labor: <span className="font-mono">${laborTotal.toFixed(2)}</span></div>
              <div className="text-sm text-slate-400">Parts: <span className="font-mono">${partsTotal.toFixed(2)}</span></div>
              {!isTaxExempt && taxRate > 0 && <div className="text-sm text-slate-400">Tax ({taxRate}%): <span className="font-mono">${taxAmount.toFixed(2)}</span></div>}
              {isTaxExempt && <div className="text-sm text-green-400">Tax Exempt</div>}
              {discount > 0 && <div className="text-sm text-yellow-400">Discount: <span className="font-mono">-${discount.toFixed(2)}</span></div>}
              <div className="text-xl font-bold text-white mt-1">Grand Total: <span className="font-mono text-neon-seafoam">${grandTotal.toFixed(2)}</span></div>
            </div>
          </div>
          <button 
            onClick={() => onFinalize(ro, isTaxExempt, taxExemptId)} 
            className="px-8 py-4 bg-neon-seafoam text-slate-900 font-black rounded-lg transition-all hover:scale-105 active:scale-95 text-sm uppercase tracking-widest"
          >
            Generate Invoice & Complete
          </button>
        </div>

        {/* PIN Modal */}
        {showPinModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="glass p-8 rounded-2xl w-full max-w-sm border border-yellow-500 shadow-2xl shadow-yellow-500/20">
              <h3 className="text-lg font-black uppercase tracking-widest text-yellow-400 mb-2">Override Authorization</h3>
              <p className="text-xs text-slate-400 mb-6">Enter your 4-digit override PIN to unlock price editing.</p>
              <input
                type="password"
                maxLength={4}
                value={pinEntry}
                onChange={e => { setPinEntry(e.target.value); setPinError(false); }}
                onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
                autoFocus
                className={`w-full bg-slate-900 border ${pinError ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-3 text-white text-center text-2xl font-mono tracking-widest outline-none focus:border-yellow-500 transition-colors`}
                placeholder="••••"
              />
              {pinError && <p className="text-red-400 text-xs font-bold text-center mt-2 uppercase tracking-widest">Incorrect PIN</p>}
              <div className="flex justify-between items-center mt-6">
                <button onClick={() => { setShowPinModal(false); setPinEntry(''); setPinError(false); }} className="text-xs text-slate-500 hover:text-white">Cancel</button>
                <button onClick={handlePinSubmit} className="px-6 py-3 bg-yellow-500 text-slate-900 font-black rounded-lg hover:scale-105 transition-all uppercase text-xs tracking-widest">Unlock</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default InvoiceModal;
