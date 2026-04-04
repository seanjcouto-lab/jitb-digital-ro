
import React, { useState, useMemo } from 'react';
import { Part, InventoryAlert } from '../types';
import { inventoryService } from '../services/inventoryService';
import SectionHeader from '../components/SectionHeader';

interface InventoryPageProps {
  inventory: Part[];
  setInventory: React.Dispatch<React.SetStateAction<Part[]>>;
  alerts: InventoryAlert[];
}

const InventoryPage: React.FC<InventoryPageProps> = ({ inventory, setInventory, alerts }) => {
  const [query, setQuery] = useState('');

  const MAX_DISPLAY = 200;

  const allFiltered = useMemo(() => {
    return inventoryService.getFilteredInventory(inventory, query);
  }, [inventory, query]);

  const filteredInventory = allFiltered.slice(0, MAX_DISPLAY);

  const lowStockItems = useMemo(() => {
    return inventoryService.getLowStockItems(inventory);
  }, [inventory]);
  
  const handleInputFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
        event.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b border-white/5 pb-4">
        <div>
          <h2 className="text-3xl font-black neon-seafoam uppercase tracking-tighter">Inventory Command Module</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Master Stock &amp; Supply Chain Hub</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-2xl p-6 border-white/5">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold neon-steel uppercase tracking-tighter">Master Inventory</h3>
              <span className="text-[10px] text-slate-500 font-mono">
                {query ? `${allFiltered.length.toLocaleString()} match${allFiltered.length !== 1 ? 'es' : ''}${allFiltered.length > MAX_DISPLAY ? ` (showing ${MAX_DISPLAY})` : ''}` : `${inventory.length.toLocaleString()} parts`}
              </span>
            </div>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={handleInputFocus}
              placeholder="Search by part # or description..."
              className="bg-slate-900/80 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-neon-steel transition-colors w-64"
            />
          </div>
          <div className="max-h-[65vh] overflow-y-auto pr-2">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400 sticky top-0 bg-slate-800/50">
                <tr>
                  <th className="p-3">Part #</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">QoH</th>
                  <th className="p-3">Bin</th>
                  <th className="p-3 text-right">Cost</th>
                  <th className="p-3 text-right">MSRP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredInventory.map(part => (
                  <tr key={part.partNumber} className="hover:bg-slate-800/30">
                    <td className="p-3 font-mono text-xs">{part.partNumber}</td>
                    <td className="p-3">{part.description}</td>
                    <td className={`p-3 font-bold ${part.quantityOnHand <= part.reorderPoint ? 'text-red-400' : 'text-white'}`}>{part.quantityOnHand}</td>
                    <td className="p-3">{part.binLocation}</td>
                    <td className="p-3 font-mono text-right">${(part.cost || 0).toFixed(2)}</td>
                    <td className="p-3 font-mono text-right text-neon-seafoam">${(part.msrp || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="space-y-6">
            <div className="glass rounded-2xl p-6 border-2 border-red-500/20">
                <h3 className="text-lg font-bold mb-2 neon-crimson uppercase tracking-tighter">Inventory Oracle</h3>
                <p className="text-xs text-slate-500 mb-4 italic">Monitors stock levels and discrepancies.</p>
                <div className="space-y-3">
                    <div className="bg-slate-900/50 p-3 rounded-lg border border-white/5">
                        <h4 className="text-xs font-bold text-red-400 uppercase mb-2">Low Stock Alerts</h4>
                        <div className="max-h-40 overflow-y-auto pr-2 text-xs space-y-2">
                           {lowStockItems.length === 0 && <p className="text-slate-600 italic">All stock levels are optimal.</p>}
                           {lowStockItems.map(item => (
                             <div key={item.partNumber}>
                               <p className="font-bold text-slate-300">{item.description}</p>
                               <p className="text-slate-400">QoH: <span className="font-mono text-red-400">{item.quantityOnHand}</span> | Reorder Point: <span className="font-mono">{item.reorderPoint}</span></p>
                             </div>
                           ))}
                        </div>
                    </div>
                     <div className="bg-slate-900/50 p-3 rounded-lg border border-white/5">
                        <h4 className="text-xs font-bold text-orange-400 uppercase mb-2">Discrepancy Log</h4>
                        <div className="max-h-40 overflow-y-auto pr-2 text-xs space-y-2">
                           {alerts.length === 0 && <p className="text-slate-600 italic">No discrepancies reported.</p>}
                           {alerts.map(alert => (
                             <div key={alert.id}>
                               <p className="font-bold text-slate-300">{alert.message}</p>
                               <p className="text-slate-400 font-mono">Part: {alert.partNumber} | RO: {alert.roId}</p>
                             </div>
                           ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryPage;
