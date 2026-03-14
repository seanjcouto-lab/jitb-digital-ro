import React from 'react';
import { CANONICAL_FIELDS, CanonicalField } from '../utils/inventoryImport';

interface InventoryColumnMapperProps {
  headers: string[];
  mapping: Record<string, string>;
  onMappingChange: (field: CanonicalField, header: string) => void;
  confidence: number;
}

const FIELD_LABELS: Record<CanonicalField, string> = {
  partNumber: 'Part Number (Required)',
  description: 'Description',
  category: 'Category',
  binLocation: 'Bin Location',
  msrp: 'MSRP (Retail)',
  dealerPrice: 'Dealer Price',
  cost: 'Cost (Avg)',
  quantityOnHand: 'Quantity On Hand',
  reorderPoint: 'Reorder Point',
  supersedesPart: 'Supersedes Part'
};

const InventoryColumnMapper: React.FC<InventoryColumnMapperProps> = ({
  headers,
  mapping,
  onMappingChange,
  confidence
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-white/5">
        <div>
          <h4 className="text-sm font-black uppercase tracking-widest text-neon-steel">Column Mapping Engine</h4>
          <p className="text-xs text-slate-500 mt-1">Verify or adjust how spreadsheet columns map to system fields.</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black uppercase text-slate-500 mb-1">Auto-Detection Confidence</div>
          <div className={`text-lg font-mono font-black ${confidence >= 0.7 ? 'text-neon-seafoam' : confidence >= 0.4 ? 'text-yellow-400' : 'text-red-400'}`}>
            {(confidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CANONICAL_FIELDS.map((field) => (
          <div key={field} className="p-4 rounded-xl bg-slate-900/30 border border-white/5 hover:border-white/10 transition-colors">
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-wider">
              {FIELD_LABELS[field]}
            </label>
            <select
              value={mapping[field] || ''}
              onChange={(e) => onMappingChange(field, e.target.value)}
              className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-neon-steel outline-none transition-all"
            >
              <option value="">-- Skip Field --</option>
              {headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {!mapping.partNumber && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-xs text-red-400 font-bold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Part Number mapping is required to proceed with import.
          </p>
        </div>
      )}
    </div>
  );
};

export default InventoryColumnMapper;
