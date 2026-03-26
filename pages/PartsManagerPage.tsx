import React, { useState, useMemo, useRef, useEffect } from 'react';
import { RepairOrder, ROStatus, PartStatus, Part, InventoryAlert } from '../types';
import { repairOrderService } from '../services/repairOrderService';
import { PartsManagerService } from '../services/partsManagerService';
import { SERVICE_PACKAGES } from '../constants';
import SectionHeader from '../components/SectionHeader';
import { printRequisition } from '../utils/printRequisition';
import InventoryImportModal from '../components/InventoryImportModal';
import NotUsedReasonModal from '../components/NotUsedReasonModal';

interface PartsManagerPageProps {
  repairOrders: RepairOrder[];
  updateRO: (ro: RepairOrder) => void;
  masterInventory: Part[];
  updateInventory: (partNumber: string, quantityChange: number, reason: string, roId: string) => void;
  addInventoryAlert: (alert: Omit<InventoryAlert, 'id' | 'timestamp'>) => void;
  setMasterInventory: React.Dispatch<React.SetStateAction<Part[]>>;
  setInventoryAlerts: React.Dispatch<React.SetStateAction<InventoryAlert[]>>;
  shopId: string;
}

const SpecialOrderFormModal = ({ ro, parts, onClose, onConfirm }: { ro: RepairOrder, parts: Part[], onClose: () => void, onConfirm: () => void }) => {
    const [shippingCost, setShippingCost] = useState('');
    const printableRef = useRef(null);

const handlePrint = () => {
        printRequisition(ro, parts, shippingCost);
    };

    const parsedShipping = parseFloat(shippingCost) || 0;
    const partsSubtotal = parts.reduce((acc, p) => acc + (p.dealerPrice || 0), 0);
    const totalCost = partsSubtotal + parsedShipping;

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="glass p-6 rounded-2xl w-full max-w-3xl border-2 border-orange-400 shadow-2xl shadow-orange-400/20 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4 no-print">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-widest text-orange-400">Consolidated Special Order Form</h3>
                        <p className="text-xs text-slate-400">Processing {parts.length} item(s) for RO: {ro.id}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 font-bold text-2xl hover:text-white transition-colors">&times;</button>
                </div>
                
                <div ref={printableRef} className="printable-area bg-white text-slate-900 p-8 rounded-lg flex-grow overflow-y-auto">
                    <div className="border-b-2 border-slate-900 pb-4 mb-4 flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold">STATELINE BOATWORKS</h1>
                            <p className="text-sm font-bold uppercase tracking-wider">Special Part Order Authorization</p>
                        </div>
                        <div className="text-right">
                            <p className="font-mono font-bold text-lg text-slate-500">REQUISITION #SO-{Date.now().toString().slice(-6)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 text-sm mb-6">
                        <div>
                            <p className="font-bold text-slate-500 uppercase text-[10px]">Customer Data</p>
                            <p className="text-base font-bold">{ro.customerName}</p>
                            <p className="font-bold text-slate-500 uppercase text-[10px] mt-3">Repair Order Ref</p>
                            <p className="font-mono font-bold">{ro.id}</p>
                            <p className="font-bold text-slate-500 uppercase text-[10px] mt-1">Vessel Name</p>
                            <p className="font-bold">{ro.vesselName || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-slate-500 uppercase text-[10px]">Date Processed</p>
                            <p className="font-bold">{new Date().toLocaleDateString()}</p>
                            <p className="font-bold text-slate-500 uppercase text-[10px] mt-3">Technician / Bay</p>
                            <p className="font-bold uppercase">{ro.technicianName || 'ADMIN / PARTS DEPT'}</p>
                            <p className="font-bold text-slate-500 uppercase text-[10px] mt-1">Engine Serial</p>
                            <p className="font-mono font-bold uppercase">{ro.engineSerial}</p>
                        </div>
                    </div>

                    <h4 className="font-bold text-sm uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">Special Order Parts Manifest</h4>
                    <table className="w-full text-left text-xs border-collapse mb-6">
                        <thead className="bg-slate-100">
                            <tr>
                                <th className="border-b-2 border-slate-900 p-2">Part Number</th>
                                <th className="border-b-2 border-slate-900 p-2">Description</th>
                                <th className="border-b-2 border-slate-900 p-2 text-center">Qty</th>
                                <th className="border-b-2 border-slate-900 p-2 text-right">Dealer Cost</th>
                                <th className="border-b-2 border-slate-900 p-2 text-right">Retail (MSRP)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {parts.map((p, idx) => (
                                <tr key={p.partNumber + idx}>
                                    <td className="p-2 font-mono font-bold">{p.partNumber}</td>
                                    <td className="p-2">{p.description}</td>
                                    <td className="p-2 text-center font-bold">1</td>
                                    <td className="p-2 text-right font-mono">${(p.dealerPrice || 0).toFixed(2)}</td>
                                    <td className="p-2 text-right font-mono">${(p.msrp || 0).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-end mt-8">
                        <div className="w-1/2 space-y-2 text-sm">
                            <div className="flex justify-between py-1 border-b border-slate-100">
                                <span className="font-bold uppercase text-[10px] text-slate-500">Parts Subtotal:</span>
                                <span className="font-mono font-bold">${partsSubtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                <span className="font-bold uppercase text-[10px] text-slate-500">Estimated Shipping:</span>
                                <div className="flex items-center">
                                    <span className="font-mono mr-1">$</span>
                                    <input 
                                        type="number" 
                                        value={shippingCost} 
                                        onChange={e => setShippingCost(e.target.value)}
                                        className="w-24 p-1 text-right font-mono bg-slate-100 rounded border border-slate-300 no-print" 
                                        placeholder="0.00"
                                    />
                                    <span className="font-mono print-only font-bold">${parsedShipping.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="flex justify-between border-t-2 border-slate-900 pt-3 mt-4">
                                <span className="font-black text-lg uppercase tracking-tighter">TOTAL EST. COST:</span>
                                <span className="font-mono font-black text-xl">${totalCost.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-dashed border-slate-300 grid grid-cols-2 gap-12 print-only">
                        <div className="border-t border-slate-900 pt-2">
                            <p className="text-[10px] font-black uppercase">Authorized Parts Buyer</p>
                        </div>
                        <div className="border-t border-slate-900 pt-2">
                            <p className="text-[10px] font-black uppercase">Service Manager Sign-off</p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-between items-center no-print">
                    <button onClick={onClose} className="px-6 py-3 bg-slate-800 text-slate-400 font-bold rounded-lg text-xs uppercase hover:text-white transition-all">Cancel</button>
                    <div className="flex gap-4">
                        <button onClick={handlePrint} className="px-6 py-3 bg-slate-700 text-white font-bold rounded-lg text-xs uppercase hover:bg-slate-600 flex items-center gap-2 transition-all">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                           Print Requisition
                        </button>
                        <button onClick={onConfirm} className="px-8 py-3 bg-orange-400 text-slate-900 font-black rounded-lg text-xs uppercase hover:scale-105 shadow-xl shadow-orange-400/20 transition-all">Finalize & Order</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ClipboardModal = ({ onClose }: { onClose: () => void }) => {
    type AggregatedEntry = { partNumber: string; description: string; quantity: number };
    const [clipboardEntries, setClipboardEntries] = useState<AggregatedEntry[]>([]);

    useEffect(() => {
        const fetchEntries = async () => {
            const entries = await PartsManagerService.getClipboardEntries();
            setClipboardEntries(entries);
        };
        fetchEntries();
    }, []);

    const handleClearClipboard = async () => {
        if (confirm("Are you sure you want to clear today's clipboard? This cannot be undone.")) {
            await PartsManagerService.clearClipboard();
            setClipboardEntries([]);
        }
    };
    
    const handlePrint = () => window.print();

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="glass p-6 rounded-2xl w-full max-w-4xl border-2 border-neon-steel shadow-2xl shadow-neon-steel/20 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4 no-print">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-widest text-neon-steel">The Clipboard</h3>
                        <p className="text-xs text-slate-400">Aggregated parts list for {new Date().toLocaleDateString()}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 font-bold text-2xl hover:text-white">&times;</button>
                </div>

                <div className="printable-area bg-slate-900/50 p-4 rounded-lg flex-grow overflow-y-auto">
                    <div className="print-only mb-6">
                        <h1 className="text-2xl font-black uppercase tracking-widest text-center">Parts Order Form</h1>
                        <p className="text-center text-sm mt-1">{new Date().toLocaleDateString()}</p>
                    </div>
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs uppercase text-slate-400 sticky top-0 bg-slate-800/80">
                            <tr>
                                <th className="p-3">Part #</th>
                                <th className="p-3">Description</th>
                                <th className="p-3 text-center">Total Qty</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {clipboardEntries.map(entry => (
                                <tr key={entry.partNumber} className="hover:bg-slate-800/30">
                                    <td className="p-3 font-mono text-xs">{entry.partNumber}</td>
                                    <td className="p-3">{entry.description}</td>
                                    <td className="p-3 text-center font-bold text-lg text-neon-seafoam">{entry.quantity}</td>
                                </tr>
                            ))}
                            {clipboardEntries.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="p-10 text-center text-slate-500 italic">The clipboard is empty.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 flex justify-between items-center no-print">
                    <button onClick={handleClearClipboard} className="px-6 py-2 bg-red-500/20 text-red-400 font-bold rounded-lg text-xs uppercase hover:bg-red-500/30">Clear Clipboard</button>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-6 py-2 bg-slate-700/50 text-slate-300 font-bold rounded-lg text-xs uppercase hover:bg-slate-600/50">Close</button>
                        <button onClick={handlePrint} className="px-6 py-2 bg-neon-steel text-slate-900 font-bold rounded-lg text-xs uppercase hover:scale-105">Print</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const RODetail = ({ ro }: { ro: RepairOrder }) => (
    <div className="my-4 pt-4 border-t border-white/10 animate-in fade-in duration-300 space-y-3 text-xs">
      <div>
        <h5 className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Directives</h5>
        <ul className="list-disc list-inside text-slate-300 mt-1 pl-2 space-y-1">
          {ro.directives.map(d => <li key={d.id}>{d.title}</li>)}
        </ul>
      </div>
      {ro.customerNotes != null && (
        <div>
          <h5 className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Customer Notes</h5>
          <p className="text-slate-300 mt-1 whitespace-pre-wrap bg-slate-900/50 p-2 rounded-md">{ro.customerNotes}</p>
        </div>
      )}
    </div>
);

const MISSING_REASON_CODES = [
    "Inventory Error",
    "Damaged Stock",
    "Supplier Backorder",
    "Human Error",
    "One-Off / Non-Stock",
    "Other"
];

interface ROCardProps {
    ro: RepairOrder;
    masterInventory: Part[];
    expandedROId: string | null;
    setExpandedROId: (id: string | null) => void;
    handleUpdatePartStatus: (ro: RepairOrder, partIndex: number, status: PartStatus) => void;
    handleRemovePart: (ro: RepairOrder, partIndex: number) => void;
    handleFulfillmentComplete: (ro: RepairOrder) => void;
    partSearchQueries: Record<string, string>;
    setPartSearchQueries: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    getOracleResults: (query: string, existingParts: Part[]) => any[];
    handleAddPart: (ro: RepairOrder, partData: Part) => Promise<void>;
    handleAddPackage: (ro: RepairOrder, pkg: any) => Promise<void>;
    handleAddButtonClick: (ro: RepairOrder) => Promise<void>;
    handleInputFocus: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    handleUpdatePartDetails: (ro: RepairOrder, partIndex: number, updates: Partial<Part>) => void;
}

const ROCard: React.FC<ROCardProps> = ({ 
    ro, masterInventory, expandedROId, setExpandedROId, 
    handleUpdatePartStatus, handleRemovePart, handleFulfillmentComplete,
    partSearchQueries, setPartSearchQueries, getOracleResults, handleAddPart, handleAddPackage, handleAddButtonClick, handleInputFocus,
    handleUpdatePartDetails
}) => {
    const isFulfillable = ro.parts.length > 0 && ro.parts.every(p => p.status && p.status !== PartStatus.REQUIRED && p.status !== PartStatus.APPROVAL_PENDING);
    const oracleResults = getOracleResults(partSearchQueries[ro.id] || '', ro.parts);

   const statusMap: Record<string, {pillClass: string, text: string, borderClass: string}> = {
    [ROStatus.AUTHORIZED]: { pillClass: 'bg-neon-seafoam/10 border-neon-seafoam/30 text-neon-seafoam', text: 'Authorized', borderClass: 'border-white/5' },
    [ROStatus.PARTS_PENDING]: { pillClass: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400', text: 'Parts Pending', borderClass: 'border-yellow-500/20' },
    [ROStatus.ACTIVE]: { pillClass: 'bg-neon-seafoam text-slate-900 shadow-lg shadow-neon-seafoam/40', text: 'ACTIVE — GET PARTS NOW', borderClass: 'border-neon-seafoam/40 shadow-[0_0_10px_rgba(45,212,191,0.1)]' },
    [ROStatus.HOLD]: { pillClass: 'bg-slate-700 text-slate-300 border-slate-600', text: 'On Hold — SM Decision', borderClass: 'border-white/5' },
    [ROStatus.READY_FOR_TECH]: { pillClass: 'bg-neon-steel/20 text-neon-steel border-neon-steel/30', text: 'Deployment Ready', borderClass: 'border-white/5' }
}
    const statusInfo = statusMap[ro.status] || { pillClass: 'bg-slate-700 text-slate-300', text: ro.status, borderClass: 'border-white/5' };

   const createdAt = parseInt(ro.id.split('-')[1]) || Date.now();
    const minsAgo = Math.floor((Date.now() - createdAt) / 60000);
    const hrsAgo = Math.floor(minsAgo / 60);
    const daysAgo = Math.floor(hrsAgo / 24);
    const relativeAge = minsAgo < 1 ? 'Just now' : minsAgo < 60 ? `${minsAgo}m ago` : hrsAgo < 24 ? `${hrsAgo}h ago` : `${daysAgo}d ago`;

    return (
       <div className={`bg-white/5 backdrop-blur-sm rounded-2xl p-5 border transition-all shadow-lg ${statusInfo.borderClass} ${ro.status === ROStatus.ACTIVE ? 'animate-pulse border-red-500 shadow-red-500/20' : ''}`}>
            <div onClick={() => setExpandedROId(expandedROId === ro.id ? null : ro.id)} className="flex flex-col gap-2 mb-4 pb-4 border-b border-white/5 cursor-pointer">
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono text-slate-500">{ro.id}</span>
                  <h3 className="text-base font-bold text-slate-200 mt-0.5">{ro.customerName}</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{ro.vesselName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1 rounded text-[10px] font-black uppercase border ${statusInfo.pillClass}`}>{statusInfo.text}</div>
                  <svg className={`w-4 h-4 text-slate-500 transition-transform ${expandedROId === ro.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
              <div className="text-[9px] text-slate-500 font-medium">Opened {relativeAge}</div>
              <div className="flex flex-wrap gap-3 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                <span>{ro.directives.length} Directives</span>
                <span>{ro.parts.length} Parts</span>
                {ro.parts.filter(p => p.status === PartStatus.IN_BOX).length > 0 && <span className="text-neon-seafoam">{ro.parts.filter(p => p.status === PartStatus.IN_BOX).length} In Box</span>}
                {ro.parts.filter(p => p.status === PartStatus.MISSING).length > 0 && <span className="text-red-400">{ro.parts.filter(p => p.status === PartStatus.MISSING).length} Missing</span>}
                {ro.parts.filter(p => p.status === PartStatus.SPECIAL_ORDER).length > 0 && <span className="text-orange-400">{ro.parts.filter(p => p.status === PartStatus.SPECIAL_ORDER).length} S/O</span>}
                {ro.parts.filter(p => !p.status || p.status === PartStatus.REQUIRED).length > 0 && <span className="text-slate-500">{ro.parts.filter(p => !p.status || p.status === PartStatus.REQUIRED).length} Unreviewed</span>}
              </div>
            </div>
            {expandedROId === ro.id && (
                <div className="animate-in fade-in duration-300">
                    <RODetail ro={ro} />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
                      <div className="space-y-4">
                        <SectionHeader title="Required Parts Manifest" />
                        {ro.parts.length === 0 && <p className="text-slate-600 text-xs italic">No parts required.</p>}
                        <div className="space-y-3 pr-2">
                          {ro.parts.map((part, index) => {
                            const invPart = masterInventory.find(p => p.partNumber === part.partNumber);
                            return (
                            <div key={`${part.partNumber}-${index}`} className="p-4 rounded-lg bg-slate-900/50 border border-white/10 flex flex-col gap-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-bold text-slate-200">{part.description} {part.supersedesPart && <span className="text-xs text-slate-500">(was {part.supersedesPart})</span>}</p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-mono text-slate-500">{part.partNumber} • BIN: <span className="font-bold text-neon-steel">{part.binLocation}</span></p>
                                    {invPart && !part.isCustom && <p className={`text-[10px] font-bold ${invPart.quantityOnHand > 0 ? 'text-green-400' : 'text-red-400'}`}>QoH: {invPart.quantityOnHand}</p>}
                                  </div>
                                </div>
                                <div className={`px-2 py-0.5 text-[8px] font-black rounded-full uppercase ${ 
                                  part.status === PartStatus.IN_BOX ? 'bg-neon-seafoam/10 text-neon-seafoam' : 
                                  part.status === PartStatus.MISSING ? 'bg-red-500/10 text-red-400' : 
                                  part.status === PartStatus.SPECIAL_ORDER ? 'bg-orange-400/10 text-orange-400' : 
                                  part.status === PartStatus.APPROVAL_PENDING ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                  part.status === PartStatus.NOT_USED ? 'bg-slate-800 text-slate-500 border border-white/5' :
                                  part.status === PartStatus.RETURNED ? 'bg-blue-500/10 text-blue-400' :
                                  'bg-slate-700 text-slate-400' 
                                }`}>
                                  {part.status?.replace('_', ' ') || 'REQUIRED'}
                                </div>
                              </div>
                                <div className="grid grid-cols-2 gap-4 mb-2">
                                    <div>
                                        <label className="block text-[8px] text-slate-500 uppercase font-bold mb-1">Dealer Cost</label>
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">$</span>
                                            <input 
                                                type="number" 
                                                value={part.dealerPrice || ''} 
                                                onChange={e => handleUpdatePartDetails(ro, index, { dealerPrice: parseFloat(e.target.value) || 0 })}
                                                className="w-full bg-slate-800 border border-white/5 rounded px-5 py-1 text-[10px] font-mono text-white outline-none focus:border-neon-steel"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[8px] text-slate-500 uppercase font-bold mb-1">Retail (MSRP)</label>
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">$</span>
                                            <input 
                                                type="number" 
                                                value={part.msrp || ''} 
                                                onChange={e => handleUpdatePartDetails(ro, index, { msrp: parseFloat(e.target.value) || 0 })}
                                                className="w-full bg-slate-800 border border-white/5 rounded px-5 py-1 text-[10px] font-mono text-white outline-none focus:border-neon-steel"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex gap-2">
                                        {(part.status === PartStatus.REQUIRED || !part.status) && (
                                            <>
                                                <button onClick={() => handleUpdatePartStatus(ro, index, PartStatus.IN_BOX)} className="px-4 py-1.5 rounded-md bg-neon-seafoam/20 text-neon-seafoam text-[10px] font-bold uppercase hover:bg-neon-seafoam/30 transition-colors">Add to Box</button>
                                                <button onClick={() => handleUpdatePartStatus(ro, index, PartStatus.MISSING)} className="px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 text-[10px] font-bold uppercase hover:bg-red-500/20 transition-colors">Missing</button>
                                                <button onClick={() => handleUpdatePartStatus(ro, index, PartStatus.SPECIAL_ORDER)} className="px-3 py-1.5 rounded-md bg-orange-400/10 text-orange-400 text-[10px] font-bold uppercase hover:bg-orange-400/20 transition-colors">S/O</button>
                                            </>
                                        )}
                                        {part.status === PartStatus.IN_BOX && (
                                            <button onClick={() => handleUpdatePartStatus(ro, index, PartStatus.REQUIRED)} className="px-4 py-1.5 rounded-md bg-slate-700/50 text-slate-400 text-[10px] font-bold uppercase hover:bg-slate-600/50 transition-colors">Return to Stock</button>
                                        )}
                                       {[PartStatus.MISSING, PartStatus.SPECIAL_ORDER].includes(part.status!) && (
                                            <button onClick={() => handleUpdatePartStatus(ro, index, PartStatus.IN_BOX)} className="px-4 py-1.5 rounded-md bg-neon-seafoam text-slate-900 text-[10px] font-black uppercase hover:scale-105 active:scale-95 transition-all shadow-lg shadow-neon-seafoam/20">Receive</button>
                                        )}
                                    </div>
                                    <button onClick={() => handleRemovePart(ro, index)} className="p-1.5 bg-slate-800/50 rounded-md text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            </div>
                          )})}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <SectionHeader title="Add Parts & Packages" />
                         <div className="flex gap-2">
                            <div className="relative flex-grow">
                                <input value={partSearchQueries[ro.id] || ''} onChange={(e) => setPartSearchQueries({ ...partSearchQueries, [ro.id]: e.target.value })} onFocus={handleInputFocus} placeholder="Search parts or type to add..." className="w-full h-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:border-neon-steel outline-none transition-colors" />
                                {oracleResults.length > 0 && (
                                    <div className="absolute w-full bg-slate-800 rounded-lg mt-1 border border-white/10 z-10 shadow-lg">
                                    {oracleResults.map((result, index) => (
                                        <div key={index} onClick={() => result.type === 'PART' ? handleAddPart(ro, result.payload as Part) : handleAddPackage(ro, result.payload as any)} className="p-3 hover:bg-slate-700/50 cursor-pointer text-sm flex justify-between items-center">
                                        <div>
                                          <span className="block">{result.type === 'PART' ? (result.payload as Part).description : (result.payload as any).name}</span>
                                          <span className="text-xs text-slate-400">({result.type === 'PART' ? (result.payload as Part).partNumber : 'PACKAGE'})</span>
                                        </div>
                                        <span className="text-[10px] bg-neon-steel/20 text-neon-steel px-2 py-0.5 rounded-full font-bold uppercase">{result.type}</span>
                                        </div>
                                    ))}
                                    </div>
                                )}
                            </div>
                            <button onClick={() => handleAddButtonClick(ro)} disabled={!(partSearchQueries[ro.id] || '').trim()} className="px-6 py-3 bg-slate-800 border border-white/10 text-slate-300 hover:border-neon-steel hover:text-white transition-all rounded-lg font-black text-[10px] uppercase tracking-widest disabled:opacity-50">Add</button>
                        </div>
                      {[ROStatus.AUTHORIZED, ROStatus.PARTS_PENDING].includes(ro.status) && 
    <div className="border-t border-white/10 pt-4 space-y-2">
      <button onClick={() => handleFulfillmentComplete(ro)} disabled={!isFulfillable} className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-2xl disabled:grayscale disabled:cursor-not-allowed bg-neon-seafoam text-slate-900 disabled:bg-slate-800 disabled:text-slate-500 hover:scale-105 active:scale-95">
       {ro.parts.some(p => p.status === PartStatus.SPECIAL_ORDER || p.status === PartStatus.MISSING) ? 'Save & Set as Parts Pending' : 'Fulfillment Complete'}
      </button>
     
    </div>
}
                        {[ROStatus.ACTIVE, ROStatus.READY_FOR_TECH, ROStatus.HOLD, ROStatus.PENDING_INVOICE].includes(ro.status) && (
                            <div className="mt-4 p-4 rounded-xl bg-neon-seafoam/5 border border-neon-seafoam/20">
                                <p className="text-[10px] font-black uppercase text-neon-seafoam mb-1">Post-Deployment Fulfillment Mode</p>
                                <p className="text-[9px] text-slate-400">Marking arrivals as "Received" updates the technician's terminal locks instantly. No status change required.</p>
                            </div>
                        )}
                      </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface ReturnsROCardProps {
    ro: RepairOrder;
    onReturnPart: (roId: string, partIndex: number) => void;
    onMarkNotUsed: (roId: string, partIndex: number) => void;
}

const ReturnsROCard: React.FC<ReturnsROCardProps> = ({ ro, onReturnPart, onMarkNotUsed }) => {
    const unusedParts = ro.parts.map((p, i) => ({...p, originalIndex: i})).filter(p => p.status === PartStatus.NOT_USED);

    return (
        <div className="glass rounded-2xl p-6 border-white/5">
            <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-3">
                <div>
                    <h3 className="text-base font-bold text-white">{ro.vesselName}</h3>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-tight mt-1">{ro.customerName}</p>
                </div>
                <div className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-800 text-slate-400">{ro.status}</div>
            </div>
            <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unused / Needs Disposition:</h4>
                {unusedParts.map(part => (
                    <div key={part.originalIndex} className="flex flex-col gap-3 p-3 bg-slate-900/50 rounded-lg">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-200">{part.description}</p>
                                <p className="text-xs font-mono text-slate-500">{part.partNumber}</p>
                                {part.notUsedReason && (
                                    <p className="text-[10px] text-orange-400 italic mt-1">Reason: {part.notUsedReason}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => onReturnPart(ro.id, part.originalIndex)}
                                className="flex-1 px-4 py-2 rounded-md bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase hover:bg-blue-500/30 transition-colors"
                            >
                                Return to Stock
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── MissingPartModal ─────────────────────────────────────────────────────────

interface MissingPartModalProps {
  partDescription: string;
  onClose: () => void;
  onConfirm: (reason: string, notes: string) => void;
}

const MissingPartModal: React.FC<MissingPartModalProps> = ({ partDescription, onClose, onConfirm }) => {
  const [missingReason, setMissingReason] = useState('');
  const [missingReasonNotes, setMissingReasonNotes] = useState('');
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-in fade-in duration-300 p-4">
      <div className="glass p-8 rounded-2xl w-full max-w-lg border border-red-500 shadow-2xl shadow-red-500/20">
        <h3 className="text-lg font-black uppercase tracking-widest text-red-400 mb-2">Accountability Gate: Missing Part</h3>
        <p className="text-sm text-slate-400 mb-6">Provide a reason for marking "{partDescription}" as missing.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 uppercase font-bold mb-2">Reason Code</label>
            <select value={missingReason} onChange={e => setMissingReason(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-base focus:border-red-500 outline-none">
              <option value="" disabled>Select a reason...</option>
              {MISSING_REASON_CODES.map(reason => (<option key={reason} value={reason}>{reason}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 uppercase font-bold mb-2">Notes (Optional)</label>
            <textarea value={missingReasonNotes} onChange={e => setMissingReasonNotes(e.target.value)} placeholder="Add any relevant details..." className="w-full h-24 bg-slate-900 border border-white/10 rounded-lg p-4 text-white text-sm focus:border-red-500 outline-none transition-colors" />
          </div>
        </div>
        <div className="flex justify-between items-center mt-6">
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-white transition-all">Cancel</button>
          <button onClick={() => onConfirm(missingReason, missingReasonNotes)} disabled={!missingReason} className="px-6 py-3 bg-red-500 text-white font-bold rounded-lg hover:scale-105 disabled:opacity-50 disabled:grayscale disabled:hover:scale-100 transition-all">Confirm Missing</button>
        </div>
      </div>
    </div>
  );
};

const PartsManagerPage: React.FC<PartsManagerPageProps> = ({
  repairOrders,
  updateRO,
  masterInventory,
  updateInventory, 
  addInventoryAlert,
  setMasterInventory,
  setInventoryAlerts,
  shopId
}) => {
  const [partSearchQueries, setPartSearchQueries] = useState<Record<string, string>>({});
  const [expandedROId, setExpandedROId] = useState<string | null>(null);
  const [isClipboardModalOpen, setIsClipboardModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [missingPartInfo, setMissingPartInfo] = useState<{ ro: RepairOrder; partIndex: number } | null>(null);

  const [notUsedPartInfo, setNotUsedPartInfo] = useState<{ ro: RepairOrder; partIndex: number } | null>(null);
  
  // State for the consolidated special order form modal
  const [specialOrderSession, setSpecialOrderSession] = useState<{ ro: RepairOrder; soParts: Part[] } | null>(null);


const fulfillmentQueue = useMemo(() => repairOrders.filter(ro => ro.status === ROStatus.AUTHORIZED || ro.status === ROStatus.PARTS_PENDING || (ro.status === ROStatus.ACTIVE && ro.parts.some(p => p.status === PartStatus.REQUIRED))), [repairOrders]);
const pendingQueue = useMemo(() => repairOrders.filter(ro => [ROStatus.READY_FOR_TECH, ROStatus.HOLD, ROStatus.PARTS_PENDING].includes(ro.status) && ro.parts.some(p => p.status === PartStatus.MISSING || p.status === PartStatus.SPECIAL_ORDER)), [repairOrders]);
  

  const returnsQueue = useMemo(() => 
    repairOrders.filter(ro => 
        ro.parts.some(p => p.status === PartStatus.NOT_USED)
    ), [repairOrders]);


  const getOracleResults = (query: string, existingParts: Part[]) => {
    return PartsManagerService.getOracleResults(query, existingParts, masterInventory);
  };
  
  const handleAddPart = async (ro: RepairOrder, partData: Part) => {
    const updatedRO = await PartsManagerService.addPartToRO(ro, partData, masterInventory);
    if (updatedRO) {
        updateRO(updatedRO);
        setPartSearchQueries(prev => ({ ...prev, [ro.id]: '' }));
    }
  };

  const handleAddPackage = async (ro: RepairOrder, pkg: { name: string, parts: { partNumber: string, qty: number }[] }) => {
    const updatedRO = await PartsManagerService.addPackageToRO(ro, pkg, masterInventory);
    updateRO(updatedRO);
    setPartSearchQueries(prev => ({ ...prev, [ro.id]: '' }));
  };

  const handleAddCustomPart = async (ro: RepairOrder) => {
    const query = partSearchQueries[ro.id] || '';
    const updatedRO = await PartsManagerService.addCustomPartToRO(ro, query);
    if (updatedRO) {
        updateRO(updatedRO);
        setPartSearchQueries(prev => ({ ...prev, [ro.id]: '' }));
    }
  };
  
  const handleAddButtonClick = async (ro: RepairOrder) => {
    const query = (partSearchQueries[ro.id] || '').trim();
    if (!query) return;

    const lowerCaseQuery = query.toLowerCase();
    const packageMatch = Object.keys(SERVICE_PACKAGES).find(pkgName => pkgName.toLowerCase() === lowerCaseQuery);
    if (packageMatch) {
        const pkg = { name: packageMatch, parts: SERVICE_PACKAGES[packageMatch as keyof typeof SERVICE_PACKAGES].parts };
        await handleAddPackage(ro, pkg);
        return;
    }

    const partMatch = masterInventory.find(p => 
        !ro.parts.some(existing => existing.partNumber === p.partNumber) &&
        (p.partNumber.toLowerCase() === lowerCaseQuery || p.description.toLowerCase() === lowerCaseQuery)
    );
    if (partMatch) {
        await handleAddPart(ro, partMatch);
        return;
    }
    
    await handleAddCustomPart(ro);
  };

  const handleApproveRequest = async (ro: RepairOrder, requestId: string, decision: 'FILL_FROM_STOCK' | 'SPECIAL_ORDER' | 'REJECT') => {
    const result = await PartsManagerService.approveRequest(masterInventory, ro, requestId, decision);
    updateRO(result.updatedRO);
    if (result.updatedInventory) {
      setMasterInventory(result.updatedInventory);
    }
    if (result.alertToAdd) {
      addInventoryAlert(result.alertToAdd);
    }
  };

  const handleUpdatePartStatus = async (ro: RepairOrder, partIndex: number, status: PartStatus) => {
    if (status === PartStatus.MISSING && ro.parts[partIndex].status !== PartStatus.MISSING) {
        setMissingPartInfo({ ro, partIndex });
        return;
    }

    const result = await PartsManagerService.updatePartStatus(ro, partIndex, status, masterInventory);
    updateRO(result.updatedRO);
    if (result.updatedInventory) {
        setMasterInventory(result.updatedInventory);
    }
    if (result.alertToAdd) {
        addInventoryAlert(result.alertToAdd);
    }

    const allPartsProcessed = result.updatedRO.parts.every(p => p.status !== PartStatus.REQUIRED && p.status);
if (allPartsProcessed && result.updatedRO.parts.length > 0 && ![ROStatus.ACTIVE, ROStatus.READY_FOR_TECH].includes(result.updatedRO.status)) {
    // No auto-jump — user must press Send to Service Manager
}
  };
  
  const handleConfirmMissingPart = (reason: string, notes: string) => {
    if (!missingPartInfo || !reason) return;
    const { ro, partIndex } = missingPartInfo;
    const { updatedRO, alert } = PartsManagerService.confirmMissingPart(ro, partIndex, reason, notes);
    updateRO(updatedRO);
    addInventoryAlert(alert);
    setMissingPartInfo(null);
  };
  
  const handleRemovePart = async (ro: RepairOrder, partIndex: number) => {
    const result = await PartsManagerService.removePart(ro, partIndex, masterInventory);
    updateRO(result.updatedRO);
    if (result.updatedInventory) {
        setMasterInventory(result.updatedInventory);
    }
    if (result.alertToAdd) {
        addInventoryAlert(result.alertToAdd);
    }
  };

  const handleFulfillRequest = async (ro: RepairOrder, requestId: string) => {
    const result = await PartsManagerService.fulfillRequest(ro, requestId, masterInventory);
    if (result) {
      updateRO(result.updatedRO);
      if (result.updatedInventory) setMasterInventory(result.updatedInventory);
      if (result.alertToAdd) addInventoryAlert(result.alertToAdd);
    }
  };

  const handleFlagRequest = (ro: RepairOrder, requestId: string, status: 'MISSING' | 'SPECIAL_ORDER') => {
    const updatedRO = PartsManagerService.flagRequest(ro, requestId, status);
    updateRO(updatedRO);
  };

 const handleFulfillmentComplete = (ro: RepairOrder) => {
    const { updatedRO, soParts } = PartsManagerService.checkFulfillmentComplete(ro);
    
    if (soParts.length > 0) {
        setSpecialOrderSession({ ro, soParts });
    } else {
        updateRO(updatedRO);
        setExpandedROId(null);
    }
  };

  const handleFinalizeSpecialOrders = () => {
    if (!specialOrderSession) return;
    const { ro } = specialOrderSession;
    const updatedRO = PartsManagerService.finalizeSpecialOrders(ro);
    updateRO(updatedRO);
    setSpecialOrderSession(null);
    setExpandedROId(null);
  };

  const handleReturnPartToStock = async (roId: string, partIndex: number) => {
    const ro = repairOrders.find(r => r.id === roId);
    if (!ro) return;

    const result = await PartsManagerService.returnPartToStock(ro, partIndex, masterInventory);
    if (result) {
        updateRO(result.updatedRO);
        if (result.updatedInventory) {
            setMasterInventory(result.updatedInventory);
        }
        if (result.alertToAdd) {
            addInventoryAlert(result.alertToAdd);
        }
    }
  };

  const handleMarkNotUsed = (roId: string, partIndex: number) => {
    const ro = repairOrders.find(r => r.id === roId);
    if (!ro) return;
    setNotUsedPartInfo({ ro, partIndex });
  };

  const handleUpdatePartDetails = (ro: RepairOrder, partIndex: number, updates: Partial<Part>) => {
    const updatedRO = PartsManagerService.updatePartDetails(ro, partIndex, updates);
    updateRO(updatedRO);
  };

  const handleConfirmNotUsed = async (reason: string, notes: string) => {
    if (!notUsedPartInfo) return;
    const { ro, partIndex } = notUsedPartInfo;

    const updatedRO = await PartsManagerService.confirmNotUsed(ro, partIndex, reason, notes, masterInventory);
    updateRO(updatedRO);
    setNotUsedPartInfo(null);
  };

  const handleImportComplete = async () => {
    const freshInventory = await PartsManagerService.fetchMasterInventory();
    setMasterInventory(freshInventory);
  };

  const handleInputFocus = (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTimeout(() => {
        event.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const cardProps = {
      masterInventory, expandedROId, setExpandedROId,
      handleUpdatePartStatus, handleRemovePart, handleFulfillmentComplete,
      partSearchQueries, setPartSearchQueries, getOracleResults, handleAddPart, handleAddPackage, handleAddButtonClick, handleInputFocus,
      handleUpdatePartDetails
  };

  return (
    <>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        

        <div className="flex justify-between items-end border-b border-white/5 pb-4">
            <div>
              <h2 className="text-3xl font-black neon-seafoam uppercase tracking-tighter">Parts Command</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Fulfillment & Requisition Hub</p>
            </div>
            <div className="flex gap-4">
                <button onClick={() => setIsImportModalOpen(true)} className="px-6 py-3 bg-slate-800 text-slate-300 font-bold rounded-lg text-xs uppercase hover:text-white border border-white/10 transition-all">
                    Bulk Import Inventory
                </button>
                <button onClick={() => setIsClipboardModalOpen(true)} className="px-6 py-3 bg-neon-steel/20 text-neon-steel font-bold rounded-lg text-xs uppercase hover:scale-105 border border-neon-steel/30 transition-all">
                    View The Clipboard
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <h2 className="text-2xl font-bold neon-steel uppercase tracking-tighter mb-4">Fulfillment Queue <span className="text-slate-500 text-lg">({fulfillmentQueue.length})</span></h2>
                <div className="space-y-4">
                    {fulfillmentQueue.length === 0 && <div className="glass p-12 text-center rounded-2xl border-white/5"><p className="text-slate-500 text-sm">No new staged jobs requiring parts.</p></div>}
                    {fulfillmentQueue.map(ro => <ROCard key={ro.id} ro={ro} {...cardProps} />)}
                </div>
            </div>

            <div className="space-y-8">
                <div>
                    <h2 className="text-2xl font-bold text-yellow-400 uppercase tracking-tighter mb-4">Awaiting Parts <span className="text-slate-500 text-lg">({pendingQueue.length})</span></h2>
                    <div className="space-y-4">
                       {pendingQueue.length === 0 && <div className="glass p-12 text-center rounded-2xl border-white/5"><p className="text-slate-500 text-sm">No jobs with missing or special order parts.</p></div>}
                        {pendingQueue.map(ro => <ROCard key={ro.id} ro={ro} {...cardProps} />)}
                    </div>
                </div>

            
            </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5">
            <h2 className="text-2xl font-bold text-slate-400 uppercase tracking-tighter mb-4">Returns Queue <span className="text-slate-500 text-lg">({returnsQueue.length})</span></h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {returnsQueue.length === 0 && <div className="md:col-span-2 glass p-20 text-center rounded-2xl border-white/5"><p className="text-slate-500 text-sm">No jobs are awaiting part returns.</p></div>}
                {returnsQueue.map(ro => <ReturnsROCard key={ro.id} ro={ro} onReturnPart={handleReturnPartToStock} onMarkNotUsed={handleMarkNotUsed} />)}
            </div>
        </div>
      </div>

      {missingPartInfo && (
        <MissingPartModal
          partDescription={missingPartInfo.ro.parts[missingPartInfo.partIndex].description}
          onClose={() => setMissingPartInfo(null)}
          onConfirm={handleConfirmMissingPart}
        />
      )}

      {specialOrderSession && (
        <SpecialOrderFormModal 
          ro={specialOrderSession.ro}
          parts={specialOrderSession.soParts}
          onClose={() => setSpecialOrderSession(null)}
          onConfirm={handleFinalizeSpecialOrders}
        />
      )}
      
      {isClipboardModalOpen && <ClipboardModal onClose={() => setIsClipboardModalOpen(false)} />}
      {isImportModalOpen && <InventoryImportModal onClose={() => setIsImportModalOpen(false)} onImportComplete={handleImportComplete} shopId={shopId} />}
      
      {notUsedPartInfo && (
        <NotUsedReasonModal 
            partDescription={notUsedPartInfo.ro.parts[notUsedPartInfo.partIndex].description}
            onClose={() => setNotUsedPartInfo(null)}
            onConfirm={handleConfirmNotUsed}
        />
      )}
    </>
  );
};

export default PartsManagerPage;