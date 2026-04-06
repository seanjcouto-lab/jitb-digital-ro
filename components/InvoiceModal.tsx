
import React, { useState, useEffect, useMemo } from 'react';
import { RepairOrder } from '../types';
import EvidenceGallery, { getEvidenceSummaryText } from './EvidenceGallery';

interface InvoiceModalProps {
  ro: RepairOrder;
  hourlyRate: number;
  taxRate: number;
  overridePin: string;
  onClose: () => void;
  onFinalize: (ro: RepairOrder, isTaxExempt: boolean, taxExemptId: string, invoiceTotal: number) => void;
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
  // Derive evidence items from RO data — no async mediaStore query
  const evidenceItems = useMemo(() => {
    const all: { type: string }[] = [];
    (ro.directives ?? []).forEach(d => (d.evidence ?? []).forEach(e => all.push(e)));
    (ro.evidence ?? []).forEach(e => all.push(e));
    return all;
  }, [ro]);

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

  const handlePrint = () => {
    const evidenceSummary = (directive: any) => {
      if (!directive.evidence || directive.evidence.length === 0) return '';
      const photos = directive.evidence.filter((e: any) => e.type === 'photo').length;
      const videos = directive.evidence.filter((e: any) => e.type === 'video').length;
      const audio = directive.evidence.filter((e: any) => e.type === 'audio').length;
      const parts = [];
      if (photos > 0) parts.push(`📷 ${photos} Photo${photos > 1 ? 's' : ''}`);
      if (videos > 0) parts.push(`🎥 ${videos} Video${videos > 1 ? 's' : ''}`);
      if (audio > 0) parts.push(`🎤 ${audio} Audio Note${audio > 1 ? 's' : ''}`);
      return parts.join(' | ');
    };

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${ro.id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 40px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 2px solid #111; padding-bottom: 16px; }
          .shop-name { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }
          .invoice-title { font-size: 18px; font-weight: 700; text-align: right; }
          .invoice-meta { font-size: 11px; color: #555; text-align: right; margin-top: 4px; }
          .section { margin-bottom: 24px; }
          .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; font-size: 10px; text-transform: uppercase; color: #555; padding: 6px 8px; border-bottom: 1px solid #ddd; }
          td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; }
          .text-right { text-align: right; }
          .totals { margin-left: auto; width: 280px; }
          .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
          .totals-row.grand { font-size: 16px; font-weight: 900; border-top: 2px solid #111; padding-top: 8px; margin-top: 4px; }
          .evidence-note { font-size: 10px; color: #888; margin-top: 2px; }
          .tech-notes { background: #f9f9f9; padding: 10px; border-radius: 4px; font-size: 11px; color: #333; margin-top: 8px; }
          .payment-terms { margin-top: 32px; padding: 16px; border: 2px solid #111; border-radius: 4px; text-align: center; }
          .payment-terms p { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
          .payment-terms small { font-size: 10px; color: #555; }
          .directive-item { padding: 4px 0; border-bottom: 1px solid #f0f0f0; }
          .directive-title { font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="shop-name">STATELINE BOATWORKS</div>
            <div style="font-size:11px;color:#555;margin-top:4px;">Professional Marine Services</div>
          </div>
          <div>
            <div class="invoice-title">SERVICE INVOICE</div>
            <div class="invoice-meta">RO: ${ro.id}</div>
            <div class="invoice-meta">Date: ${new Date().toLocaleDateString()}</div>
            <div class="invoice-meta">Service Date: ${ro.completedAt ? new Date(ro.completedAt).toLocaleDateString() : new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Customer & Vessel</div>
          <table>
            <tr>
              <td><strong>${ro.customerName}</strong></td>
              <td>Vessel: <strong>${ro.vesselName || 'N/A'}</strong></td>
            </tr>
            <tr>
              <td>${ro.customerPhones?.[0] || ''}</td>
              <td>Make/Model: ${[ro.boatMake, ro.boatModel, ro.boatYear].filter(Boolean).join(' ')}</td>
            </tr>
            <tr>
              <td>${ro.customerEmails?.[0] || ''}</td>
              <td>HIN: ${ro.vesselHIN || 'N/A'}</td>
            </tr>
            <tr>
              <td></td>
              <td>Engine: ${[ro.engineYear, ro.engineMake, ro.engineModel].filter(Boolean).join(' ') || 'N/A'}${ro.engineHorsepower ? ` • ${ro.engineHorsepower}HP` : ''}${ro.engineHours ? ` • ${ro.engineHours} hrs` : ''} | S/N: ${ro.engineSerial || 'N/A'}</td>
            </tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Services Performed</div>
          ${ro.directives.filter(d => d.isCompleted).map(d => `
            <div class="directive-item">
              <div class="directive-title">✓ ${d.title}</div>
              ${evidenceSummary(d) ? `<div class="evidence-note">${evidenceSummary(d)}</div>` : ''}
            </div>
          `).join('')}
          ${ro.laborDescription ? `<div class="tech-notes"><strong>Service Notes:</strong> ${ro.laborDescription}</div>` : ''}
        </div>

        <div class="section">
          <div class="section-title">Labor</div>
          <table>
            <thead><tr><th>Description</th><th>Hours</th><th>Rate</th><th class="text-right">Total</th></tr></thead>
            <tbody>
              <tr>
                <td>Labor Time</td>
                <td>${totalHours.toFixed(2)} hrs</td>
                <td>$${effectiveRate.toFixed(2)}/hr</td>
                <td class="text-right">$${laborTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        ${billableParts.length > 0 ? `
        <div class="section">
          <div class="section-title">Parts</div>
          <table>
            <thead><tr><th>Part #</th><th>Description</th><th class="text-right">Price</th></tr></thead>
            <tbody>
              ${billableParts.map(({ part, idx }) => `
                <tr>
                  <td style="font-family:monospace;font-size:10px">${part.partNumber}</td>
                  <td>${part.description}</td>
                  <td class="text-right">$${((editedPartPrices[idx] !== undefined ? editedPartPrices[idx] : (part.msrp || 0)) * (part.quantity ?? 1)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="totals">
          <div class="totals-row"><span>Labor:</span><span>$${laborTotal.toFixed(2)}</span></div>
          <div class="totals-row"><span>Parts:</span><span>$${partsTotal.toFixed(2)}</span></div>
          ${!isTaxExempt && taxRate > 0 ? `<div class="totals-row"><span>Tax (${taxRate}%):</span><span>$${taxAmount.toFixed(2)}</span></div>` : ''}
          ${isTaxExempt ? `<div class="totals-row"><span>Tax:</span><span>EXEMPT</span></div>` : ''}
          ${discount > 0 ? `<div class="totals-row"><span>Discount:</span><span>-$${discount.toFixed(2)}</span></div>` : ''}
          <div class="totals-row grand"><span>TOTAL DUE:</span><span>$${grandTotal.toFixed(2)}</span></div>
        </div>

        ${evidenceItems.length > 0 ? `<div class="section"><div class="section-title">Documentation</div><p style="font-size:12px;color:#666;">${getEvidenceSummaryText(evidenceItems)} — available digitally upon request.</p></div>` : ''}

        <div class="payment-terms">
          <p>Payment Due Upon Receipt</p>
          <small>No payment, no release of vessel or equipment.</small>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
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
  const billableParts = ro.parts
    .map((part, idx) => ({ part, idx }))
    .filter(({ part }) => part.status === 'USED' || part.status === 'IN_BOX');
  const partsTotal = billableParts.reduce((acc, { part, idx }) => acc + (editedPartPrices[idx] !== undefined ? editedPartPrices[idx] : (part.msrp || 0)) * (part.quantity ?? 1), 0);
  const taxAmount = isTaxExempt ? 0 : (partsTotal * (taxRate / 100));
  const grandTotal = Math.max(0, laborTotal + partsTotal + taxAmount - discount);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto p-4 animate-in fade-in duration-300">
      <div className="glass p-6 rounded-2xl w-full max-w-4xl mx-auto border-2 border-neon-steel shadow-2xl shadow-neon-steel/20">
        <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-xl font-black uppercase tracking-widest text-neon-steel">Final Review & Invoice Generation</h3>
              <p className="text-xs text-slate-400">RO: {ro.id} for {ro.customerName}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 font-bold text-2xl hover:text-white transition-colors">&times;</button>
        </div>

        <div className="space-y-6">
          {/* Customer & Vessel Identity */}
          <section>
            <h4 className="font-bold text-slate-300 uppercase tracking-wider mb-2">Customer & Vessel</h4>
            <div className="bg-slate-900/50 p-4 rounded-lg border border-white/5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-400 block">Customer</span>
                  <span className="font-bold text-white">{ro.customerName}</span>
                  {ro.companyName && <span className="text-xs text-slate-500 block">{ro.companyName}</span>}
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Vessel</span>
                  <span className="font-bold text-white">{ro.vesselName || '—'}</span>
                  <span className="text-xs text-slate-400 block">{[ro.boatYear, ro.boatMake, ro.boatModel].filter(Boolean).join(' ')}{ro.boatLength ? ` • ${ro.boatLength}ft` : ''}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Engine</span>
                  <span className="font-bold text-white">{[ro.engineYear, ro.engineMake, ro.engineModel].filter(Boolean).join(' ') || '—'}</span>
                  <span className="text-xs text-slate-400 block">{ro.engineHorsepower ? `${ro.engineHorsepower}HP` : ''}{ro.engineHours ? ` • ${ro.engineHours} hrs` : ''}{ro.engineSerial ? ` • S/N: ${ro.engineSerial}` : ''}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">HIN</span>
                  <span className="font-mono text-sm text-slate-300">{ro.vesselHIN || '—'}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Evidence */}
          <EvidenceGallery roId={ro.id} repairOrder={ro} />

          {/* Labor Section */}
          <section>
            <h4 className="font-bold text-slate-300 uppercase tracking-wider mb-2">Labor Summary</h4>
            <div className="bg-slate-900/50 p-4 rounded-lg border border-white/5">
              <div className="grid grid-cols-3 gap-4 items-center">
                <div>
                    <span className="text-xs text-slate-400 block">Description</span>
                    <span className="font-bold text-white">Labor Time</span>
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
                <span className="font-bold block text-slate-300 mb-1">Service Notes:</span>
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
                  {billableParts.map(({ part, idx }) => (
                    <tr key={idx} className="border-b border-white/5 last:border-b-0">
                      <td className="p-3 font-mono text-xs">{part.partNumber}</td>
                      <td className="p-3">{part.description}</td>
                      <td className="p-3 font-mono text-right">
                        {isUnlocked ? (
                          <input type="number" step="0.01" value={editedPartPrices[idx] !== undefined ? editedPartPrices[idx] : (part.msrp || 0)} onChange={e => setEditedPartPrices(prev => ({ ...prev, [idx]: parseFloat(e.target.value) || 0 }))} className="w-24 bg-yellow-500/10 border border-yellow-500/50 rounded px-2 py-1 text-yellow-300 font-mono text-right outline-none" />
                        ) : (
                          <span>${((editedPartPrices[idx] !== undefined ? editedPartPrices[idx] : (part.msrp || 0)) * (part.quantity ?? 1)).toFixed(2)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {billableParts.length === 0 && (
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
              {ro.directives.filter(d => d.isCompleted).map(d => (
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
          <div className="flex flex-col gap-3">
            {grandTotal === 0 ? (
              <button
                onClick={() => onFinalize(ro, isTaxExempt, taxExemptId, 0)}
                className="px-8 py-4 bg-neon-seafoam text-slate-900 font-black rounded-lg transition-all hover:scale-105 active:scale-95 text-sm uppercase tracking-widest"
              >
                Finalize — No Charge
              </button>
            ) : (
              <button
                onClick={() => { handlePrint(); onFinalize(ro, isTaxExempt, taxExemptId, grandTotal); }}
                className="px-8 py-4 bg-neon-seafoam text-slate-900 font-black rounded-lg transition-all hover:scale-105 active:scale-95 text-sm uppercase tracking-widest"
              >
                🖨 Finalize & Print Invoice
              </button>
            )}
          </div>
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
