
import React from 'react';
import { UserRole } from '../types';

interface CommsLinkProps {
  isOpen: boolean;
  onClose: () => void;
}

const CommsLink: React.FC<CommsLinkProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const roles = [
    { name: 'Service Manager', role: UserRole.SERVICE_MANAGER, online: true },
    { name: 'Parts Manager', role: UserRole.PARTS_MANAGER, online: true },
    { name: 'Inventory Manager', role: UserRole.INVENTORY_MANAGER, online: false },
    { name: 'Billing', role: UserRole.BILLING, online: true },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-in fade-in duration-300" onClick={onClose}>
      <div className="glass p-8 rounded-2xl w-full max-w-sm border border-neon-steel shadow-2xl shadow-neon-steel/20" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black uppercase tracking-widest text-neon-steel">SCC Comms-Link</h3>
            <button onClick={onClose} className="text-slate-500 hover:text-white">&times;</button>
        </div>

        <div className="space-y-3 mb-8">
            <p className="text-xs text-slate-400 uppercase font-bold">Online Personnel</p>
            {roles.map(r => (
                <div key={r.role} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                    <span className="font-medium text-slate-200">{r.name}</span>
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold ${r.online ? 'text-green-400' : 'text-slate-600'}`}>{r.online ? 'Online' : 'Offline'}</span>
                        <div className={`w-2 h-2 rounded-full ${r.online ? 'bg-green-500' : 'bg-slate-700'}`}></div>
                    </div>
                </div>
            ))}
        </div>

        <div className="text-center">
            <button 
                onClick={() => alert("Push-to-talk feature under development.")}
                className="w-24 h-24 rounded-full bg-slate-800 border-4 border-slate-700 text-slate-400 flex flex-col items-center justify-center transition-all active:scale-95 active:bg-red-500/50 active:border-red-500 active:text-white"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-bold mt-1">HOLD</span>
            </button>
            <p className="text-xs text-slate-500 mt-4">Push and hold to talk.</p>
        </div>
      </div>
    </div>
  );
};

export default CommsLink;
