
import React, { useState, useEffect } from 'react';
import { RepairOrder, PaymentStatus, CollectionsStatus, Payment } from '../types';

interface BillingPageProps {
  repairOrders: RepairOrder[];
  updateRO: (ro: RepairOrder) => void;
}

type CollectionLogEntry = {
    timestamp: number;
    roId: string;
    message: string;
    isManual?: boolean;
};

const PaymentModal = ({ ro, onClose, onSave }: { ro: RepairOrder, onClose: () => void, onSave: (payment: Payment) => void }) => {
    const [amount, setAmount] = useState<number>(0);
    const [method, setMethod] = useState<Payment['method']>('Credit Card');
    const [reference, setReference] = useState('');

    const balanceDue = (ro.invoiceTotal || 0) - (ro.payments?.reduce((sum, p) => sum + p.amount, 0) || 0);

    useEffect(() => {
        setAmount(balanceDue);
    }, [balanceDue]);

    const handleSave = () => {
        if(amount <= 0 || amount > balanceDue) {
            alert("Please enter a valid payment amount.");
            return;
        }
        onSave({
            date: Date.now(),
            amount,
            method,
            reference
        });
    };
    
    const handleInputFocus = (event: React.FocusEvent<HTMLInputElement>) => {
        setTimeout(() => {
            event.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="glass p-8 rounded-2xl w-full max-w-lg border border-neon-steel shadow-2xl shadow-neon-steel/20">
                <h3 className="text-lg font-black uppercase tracking-widest text-neon-steel mb-4">Record Payment</h3>
                <p className="text-sm text-slate-300 mb-1">For RO <span className="font-bold text-white">{ro.id}</span></p>
                <p className="text-sm text-slate-300 mb-6">Balance Due: <span className="font-bold text-white font-mono">${balanceDue.toFixed(2)}</span></p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-slate-400 uppercase font-bold mb-2">Payment Amount</label>
                        <input type="number" value={amount} onFocus={handleInputFocus} onChange={e => setAmount(parseFloat(e.target.value))} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-base focus:border-neon-steel outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 uppercase font-bold mb-2">Payment Method</label>
                        <select value={method} onChange={e => setMethod(e.target.value as Payment['method'])} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-base focus:border-neon-steel outline-none">
                            <option>Credit Card</option>
                            <option>Check</option>
                            <option>Cash</option>
                            <option>ACH</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 uppercase font-bold mb-2">Reference / Check #</label>
                        <input value={reference} onFocus={handleInputFocus} onChange={e => setReference(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-base focus:border-neon-steel outline-none" />
                    </div>
                </div>
                
                <p className="text-xs text-slate-500 mt-4 text-center">In a full integration, this data would sync automatically from your accounting software like QuickBooks.</p>

                <div className="flex justify-between items-center mt-6">
                    <button onClick={onClose} className="text-xs text-slate-500 hover:text-white">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-3 bg-neon-seafoam text-slate-900 font-bold rounded-lg hover:scale-105">Record Payment</button>
                </div>
            </div>
        </div>
    );
};


const BillingPage: React.FC<BillingPageProps> = ({ repairOrders, updateRO }) => {
    const [paymentModalRO, setPaymentModalRO] = useState<RepairOrder | null>(null);
    const [collectionsLog, setCollectionsLog] = useState<CollectionLogEntry[]>([]);
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    
    const frequencyOptions: Record<string, number> = {
        "Daily": MS_PER_DAY,
        "Weekly": MS_PER_DAY * 7,
        "Bi-Weekly": MS_PER_DAY * 14,
        "Monthly": MS_PER_DAY * 30,
    };

    const [sweepFrequency, setSweepFrequency] = useState<number>(frequencyOptions["Weekly"]);
    
    const runCollectionsSweep = (isManual = false) => {
        let actionsTaken = false;
        repairOrders.forEach(ro => {
            if (ro.paymentStatus === PaymentStatus.PAID || !ro.dateInvoiced) return;
            
            const daysOverdue = Math.floor((Date.now() - ro.dateInvoiced) / MS_PER_DAY);
            let updatedRO = { ...ro };
            let logMessage = '';

            if (daysOverdue > 30 && updatedRO.collectionsStatus === CollectionsStatus.NONE) {
                updatedRO.collectionsStatus = CollectionsStatus.REMINDER_SENT;
                updatedRO.paymentStatus = PaymentStatus.OVERDUE;
                logMessage = `Invoice ${ro.id} is 30+ days overdue. Sent automated email reminder.`;
            } else if (daysOverdue > 45 && updatedRO.collectionsStatus === CollectionsStatus.REMINDER_SENT) {
                updatedRO.collectionsStatus = CollectionsStatus.PHONE_CALL_SCHEDULED;
                logMessage = `Invoice ${ro.id} is 45+ days overdue. Scheduled automated phone call.`;
            } else if (daysOverdue > 60 && updatedRO.collectionsStatus === CollectionsStatus.PHONE_CALL_SCHEDULED) {
                updatedRO.collectionsStatus = CollectionsStatus.FINAL_NOTICE_SENT;
                logMessage = `Invoice ${ro.id} is 60+ days overdue. Sent final notice email (firm tone).`;
            } else if (daysOverdue > 90 && updatedRO.collectionsStatus === CollectionsStatus.FINAL_NOTICE_SENT) {
                updatedRO.collectionsStatus = CollectionsStatus.IN_COLLECTIONS;
                logMessage = `CRITICAL: Invoice ${ro.id} is 90+ days overdue. Account flagged for collections agency.`;
            }

            if (logMessage) {
                actionsTaken = true;
                setCollectionsLog(prev => [...prev, { timestamp: Date.now(), roId: ro.id, message: logMessage }]);
                updateRO(updatedRO);
            }
        });
        if (isManual) {
            const message = actionsTaken ? "Manual sweep engaged. Actions were taken." : "Manual sweep engaged. No new actions required.";
            setCollectionsLog(prev => [...prev, { timestamp: Date.now(), roId: 'SYSTEM', message, isManual: true }]);
        }
    };

    // Simulate Collections Oracle
    useEffect(() => {
        const oracleInterval = setInterval(() => runCollectionsSweep(false), sweepFrequency);
        return () => clearInterval(oracleInterval);
    }, [repairOrders, updateRO, sweepFrequency]);

    const handleSavePayment = (ro: RepairOrder, payment: Payment) => {
        const updatedPayments = [...(ro.payments || []), payment];
        const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
        const balanceDue = (ro.invoiceTotal || 0) - totalPaid;

        let newPaymentStatus = PaymentStatus.PARTIALLY_PAID;
        if (balanceDue <= 0) {
            newPaymentStatus = PaymentStatus.PAID;
        } else if (ro.paymentStatus === PaymentStatus.OVERDUE) {
            newPaymentStatus = PaymentStatus.OVERDUE;
        }

        updateRO({
            ...ro,
            payments: updatedPayments,
            paymentStatus: newPaymentStatus,
            datePaid: newPaymentStatus === PaymentStatus.PAID ? Date.now() : undefined,
        });
        setPaymentModalRO(null);
    };

    const getStatusPill = (ro: RepairOrder) => {
        const status = ro.paymentStatus;
        const colors = {
            [PaymentStatus.PAID]: 'bg-green-500/10 text-green-400',
            [PaymentStatus.UNPAID]: 'bg-slate-700 text-slate-300',
            [PaymentStatus.PARTIALLY_PAID]: 'bg-blue-500/10 text-blue-400',
            [PaymentStatus.OVERDUE]: 'bg-red-500/10 text-red-400 animate-pulse',
        };
        return <div className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase ${colors[status || PaymentStatus.UNPAID]}`}>{status?.replace('_', ' ')}</div>;
    };

    const sortedROs = [...repairOrders].filter(ro => ro.dateInvoiced !== null && ro.invoiceTotal !== null && ro.paymentStatus !== PaymentStatus.PAID).sort((a,b) => (b.dateInvoiced || 0) - (a.dateInvoiced || 0));

    return (
        <div className="space-y-8">
                <div className="flex justify-between items-end border-b border-white/5 pb-4">
                    <div>
                        <h2 className="text-3xl font-black neon-seafoam uppercase tracking-tighter">Billing & Collections</h2>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Accounts Receivable Command Center</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 glass rounded-2xl p-6 border-white/5">
                        <h3 className="text-lg font-bold mb-4 neon-steel uppercase tracking-tighter">Completed Invoices</h3>
                        <div className="max-h-[65vh] overflow-y-auto pr-2">
                            <table className="w-full text-left text-sm">
                                <thead className="text-xs uppercase text-slate-400 sticky top-0 bg-slate-800/50">
                                    <tr>
                                        <th className="p-3">RO ID</th>
                                        <th className="p-3">Customer</th>
                                        <th className="p-3">Invoiced</th>
                                        <th className="p-3">Balance Due</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {sortedROs.map(ro => {
                                        const balanceDue = (ro.invoiceTotal || 0) - (ro.payments?.reduce((sum, p) => sum + p.amount, 0) || 0);
                                        return (
                                            <tr key={ro.id} className="hover:bg-slate-800/30">
                                                <td className="p-3 font-mono text-xs">{ro.id}</td>
                                                <td className="p-3">{ro.customerName}</td>
                                                <td className="p-3">{ro.dateInvoiced ? new Date(ro.dateInvoiced).toLocaleDateString() : 'N/A'}</td>
                                                <td className="p-3 font-mono text-white">${balanceDue.toFixed(2)}</td>
                                                <td className="p-3">{getStatusPill(ro)}</td>
                                                <td className="p-3 text-right">
                                                    {ro.paymentStatus !== PaymentStatus.PAID &&
                                                        <button onClick={() => setPaymentModalRO(ro)} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs font-bold">Record Payment</button>
                                                    }
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="glass rounded-2xl p-6 border-2 border-red-500/20 flex flex-col">
                        <h3 className="text-lg font-bold mb-2 neon-crimson uppercase tracking-tighter">Collections Oracle</h3>
                        <p className="text-xs text-slate-500 mb-4 italic">Agent monitors overdue accounts and takes action based on the configured frequency.</p>
                        
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-white/5 space-y-3 mb-4">
                            <div>
                                <label className="block text-xs text-slate-400 uppercase font-bold mb-2">Sweep Frequency</label>
                                <select 
                                    value={sweepFrequency} 
                                    onChange={e => setSweepFrequency(Number(e.target.value))}
                                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-neon-crimson outline-none"
                                >
                                    {Object.entries(frequencyOptions).map(([name, value]) => (
                                        <option key={name} value={value}>{name}</option>
                                    ))}
                                </select>
                            </div>
                            <button 
                                onClick={() => runCollectionsSweep(true)}
                                className="w-full py-2 bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors"
                            >
                                Engage Sweep Now
                            </button>
                        </div>
                        
                        <div className="space-y-3 flex-grow overflow-y-auto bg-slate-900/50 p-3 rounded-lg border border-white/5 min-h-[200px]">
                            {collectionsLog.length === 0 && <p className="text-slate-600 text-center text-xs py-8">Oracle is standing by...</p>}
                            {collectionsLog.slice().reverse().map((log, i) => (
                                <div key={i} className={`text-xs ${log.isManual ? 'p-2 bg-slate-800/50 rounded' : ''}`}>
                                    <p className={`font-mono ${log.isManual ? 'text-neon-steel' : 'text-red-400'}`}>{new Date(log.timestamp).toLocaleTimeString()}</p>
                                    <p className="text-slate-300">{log.message}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            {paymentModalRO && <PaymentModal ro={paymentModalRO} onClose={() => setPaymentModalRO(null)} onSave={(p) => handleSavePayment(paymentModalRO, p)} />}
        </div>
    );
};

export default BillingPage;
