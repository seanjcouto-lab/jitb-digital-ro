import React, { useState, useRef } from 'react';
import { importInventoryFromFile, commitInventoryImport, CanonicalField } from '../utils/inventoryImport';
import InventoryColumnMapper from './InventoryColumnMapper';

interface InventoryImportModalProps {
  onClose: () => void;
  onImportComplete: () => void;
  shopId: string;
}

const InventoryImportModal: React.FC<InventoryImportModalProps> = ({ onClose, onImportComplete, shopId }) => {
  const [step, setStep] = useState<'UPLOAD' | 'MAP' | 'IMPORTING'>('UPLOAD');
  const [fileData, setFileData] = useState<{ rows: any[], headers: string[], mapping: Record<string, string>, confidence: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      const data = await importInventoryFromFile(file);
      setFileData(data);
      
      if (data.confidence >= 0.55 && data.mapping.partNumber) {
        // High confidence, but let's still show the mapping for verification
        setStep('MAP');
      } else {
        setStep('MAP');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    }
  };

  const handleMappingChange = (field: CanonicalField, header: string) => {
    if (!fileData) return;
    setFileData({
      ...fileData,
      mapping: {
        ...fileData.mapping,
        [field]: header
      }
    });
  };

  const handleCommit = async () => {
    if (!fileData || !fileData.mapping.partNumber) return;

    try {
      setStep('IMPORTING');
      await commitInventoryImport(fileData.rows, fileData.mapping, shopId);
      onImportComplete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import inventory');
      setStep('MAP');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="glass p-6 rounded-2xl w-full max-w-4xl border-2 border-neon-steel shadow-2xl shadow-neon-steel/20 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6 no-print">
          <div>
            <h3 className="text-xl font-black uppercase tracking-widest text-neon-steel">Inventory Import Engine</h3>
            <p className="text-xs text-slate-400">Bulk synchronize master inventory from external spreadsheets.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 font-bold text-2xl hover:text-white transition-colors">&times;</button>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
          {step === 'UPLOAD' && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-white/10 rounded-2xl hover:border-neon-steel/50 transition-all cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-16 h-16 bg-neon-steel/10 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-neon-steel" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h4 className="text-white font-bold">Drop spreadsheet here or click to browse</h4>
              <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest">Supports CSV, XLSX, XLS</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".csv,.xlsx,.xls" 
                className="hidden" 
              />
              {error && <p className="mt-4 text-xs text-red-400 font-bold">{error}</p>}
            </div>
          )}

          {step === 'MAP' && fileData && (
            <InventoryColumnMapper 
              headers={fileData.headers}
              mapping={fileData.mapping}
              confidence={fileData.confidence}
              onMappingChange={handleMappingChange}
            />
          )}

          {step === 'IMPORTING' && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-neon-steel border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-neon-steel font-black uppercase tracking-widest animate-pulse">Processing & Indexing Inventory...</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-between items-center border-t border-white/5 pt-6">
          <button 
            onClick={onClose} 
            className="px-6 py-2 bg-slate-800 text-slate-400 font-bold rounded-lg text-xs uppercase hover:text-white transition-all"
          >
            Cancel
          </button>
          
          {step === 'MAP' && (
            <div className="flex gap-4">
              <button 
                onClick={() => setStep('UPLOAD')} 
                className="px-6 py-2 bg-slate-700/50 text-slate-300 font-bold rounded-lg text-xs uppercase hover:bg-slate-600/50 transition-all"
              >
                Back
              </button>
              <button 
                onClick={handleCommit}
                disabled={!fileData?.mapping.partNumber}
                className="px-8 py-2 bg-neon-steel text-slate-900 font-black rounded-lg text-xs uppercase hover:scale-105 disabled:opacity-50 disabled:grayscale transition-all shadow-xl shadow-neon-steel/20"
              >
                Commit to Master Inventory
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryImportModal;
