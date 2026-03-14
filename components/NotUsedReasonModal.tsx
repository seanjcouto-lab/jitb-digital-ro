import React, { useState } from 'react';

const NOT_USED_REASON_CODES = [
    "Customer Declined",
    "Incorrectly Diagnosed",
    "Duplicate Part",
    "Damaged on Pull",
    "Found Existing Part",
    "Other"
];

interface NotUsedReasonModalProps {
    onClose: () => void;
    onConfirm: (reason: string, notes: string) => void;
    partDescription: string;
}

const NotUsedReasonModal: React.FC<NotUsedReasonModalProps> = ({ onClose, onConfirm, partDescription }) => {
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="glass p-6 rounded-2xl w-full max-w-md border-2 border-neon-steel shadow-2xl shadow-neon-steel/20">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-widest text-neon-steel">Mark Not Used</h3>
                        <p className="text-xs text-slate-400 mt-1">Disposition for: {partDescription}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Reason Code</label>
                        <div className="grid grid-cols-2 gap-2">
                            {NOT_USED_REASON_CODES.map(code => (
                                <button
                                    key={code}
                                    onClick={() => setReason(code)}
                                    className={`p-3 text-[10px] font-bold uppercase rounded-lg border transition-all ${
                                        reason === code 
                                        ? 'bg-neon-steel text-slate-900 border-neon-steel shadow-lg shadow-neon-steel/20' 
                                        : 'bg-slate-900/50 text-slate-400 border-white/5 hover:border-white/20'
                                    }`}
                                >
                                    {code}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Additional Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Optional details..."
                            className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-neon-steel outline-none min-h-[100px]"
                        />
                    </div>
                </div>

                <div className="mt-8 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-slate-800 text-slate-400 font-bold rounded-xl text-xs uppercase hover:text-white transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(reason, notes)}
                        disabled={!reason}
                        className="flex-1 py-3 bg-neon-steel text-slate-900 font-black rounded-xl text-xs uppercase hover:scale-105 disabled:grayscale disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-xl shadow-neon-steel/20"
                    >
                        Confirm Disposition
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotUsedReasonModal;
