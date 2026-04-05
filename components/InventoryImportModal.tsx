import React, { useState, useRef } from 'react';
import { importInventoryFromFile, commitInventoryImport, CanonicalField } from '../utils/inventoryImport';
import { parseCatalogFiles } from '../utils/catalogImport';
import { db } from '../localDb';
import { syncInventoryBulkToSupabase } from '../utils/supabaseSync';
import { Part } from '../types';
import InventoryColumnMapper from './InventoryColumnMapper';

interface InventoryImportModalProps {
  onClose: () => void;
  onImportComplete: () => void;
  shopId: string;
}

type ImportMode = 'SELECT' | 'UPLOAD_CSV' | 'UPLOAD_CATALOG' | 'MAP' | 'CATALOG_CONFIRM' | 'IMPORTING';

const InventoryImportModal: React.FC<InventoryImportModalProps> = ({ onClose, onImportComplete, shopId }) => {
  const [step, setStep] = useState<ImportMode>('SELECT');
  const [fileData, setFileData] = useState<{ rows: any[], headers: string[], mapping: Record<string, string>, confidence: number } | null>(null);
  const [catalogData, setCatalogData] = useState<{ parts: Part[], lineCount: number, errorCount: number, errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const csvInputRef = useRef<HTMLInputElement>(null);
  const catalogInputRef = useRef<HTMLInputElement>(null);

  // === CSV/Excel on-hand flow ===
  const handleCSVFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError(null);
      const data = await importInventoryFromFile(file);
      setFileData(data);
      setStep('MAP');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    }
  };

  const handleMappingChange = (field: CanonicalField, header: string) => {
    if (!fileData) return;
    setFileData({ ...fileData, mapping: { ...fileData.mapping, [field]: header } });
  };

  const handleCSVCommit = async () => {
    if (!fileData || !fileData.mapping.partNumber) return;
    try {
      setStep('IMPORTING');
      setProgress('Indexing on-hand stock...');
      await commitInventoryImport(fileData.rows, fileData.mapping, shopId, 'onhand');
      // Bulk sync on-hand parts to Supabase
      setProgress('Syncing to cloud...');
      const onhandParts = await db.masterInventory.where('shopId').equals(shopId).filter(p => p.source === 'onhand').toArray();
      await syncInventoryBulkToSupabase(onhandParts);
      onImportComplete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import inventory');
      setStep('MAP');
    }
  };

  // === Catalog text file flow ===
  const handleCatalogFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      setError(null);
      setStep('IMPORTING');
      setProgress(`Parsing ${files.length} catalog file${files.length > 1 ? 's' : ''}...`);
      const result = await parseCatalogFiles(files, shopId);
      setCatalogData(result);
      setStep('CATALOG_CONFIRM');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse catalog files');
      setStep('UPLOAD_CATALOG');
    }
  };

  const handleCatalogCommit = async () => {
    if (!catalogData) return;
    try {
      setStep('IMPORTING');
      setProgress(`Importing ${catalogData.parts.length.toLocaleString()} catalog parts...`);

      // Bulk insert catalog parts — don't delete existing on-hand stock
      await db.transaction('rw', db.masterInventory, async () => {
        // Delete only existing catalog parts for this shop (preserve on-hand)
        const existingCatalog = await db.masterInventory
          .where('shopId').equals(shopId)
          .filter(p => p.source === 'catalog')
          .toArray();

        for (const p of existingCatalog) {
          await db.masterInventory.delete([shopId, p.partNumber]);
        }

        // Bulk add new catalog parts
        await db.masterInventory.bulkPut(catalogData.parts);
      });

      // Bulk sync to Supabase (500 parts per API call instead of 1-by-1)
      setProgress('Syncing to cloud...');
      const { synced, failed } = await syncInventoryBulkToSupabase(catalogData.parts);
      setProgress(`Cloud sync: ${synced.toLocaleString()} synced${failed > 0 ? `, ${failed.toLocaleString()} failed` : ''}`);

      onImportComplete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import catalog');
      setStep('CATALOG_CONFIRM');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="glass p-6 rounded-2xl w-full max-w-4xl border-2 border-neon-steel shadow-2xl shadow-neon-steel/20 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6 no-print">
          <div>
            <h3 className="text-xl font-black uppercase tracking-widest text-neon-steel">Inventory Import Engine</h3>
            <p className="text-xs text-slate-400">
              {step === 'SELECT' && 'Select import type to begin.'}
              {step === 'UPLOAD_CSV' && 'Upload your on-hand stock spreadsheet.'}
              {step === 'UPLOAD_CATALOG' && 'Upload distributor catalog text files.'}
              {step === 'MAP' && 'Verify column mapping before importing.'}
              {step === 'CATALOG_CONFIRM' && 'Review catalog data before importing.'}
              {step === 'IMPORTING' && progress}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 font-bold text-2xl hover:text-white transition-colors">&times;</button>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
          {/* Step: Select import type */}
          {step === 'SELECT' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6">
              <button
                onClick={() => setStep('UPLOAD_CSV')}
                className="p-8 rounded-2xl border-2 border-white/10 hover:border-teal-400/50 bg-slate-800/50 hover:bg-slate-800 transition-all text-left group"
              >
                <div className="text-3xl mb-3">📦</div>
                <h4 className="text-white font-black text-lg mb-1">On-Hand Stock</h4>
                <p className="text-xs text-slate-400">Import from BitPro, CSV, or Excel. Updates your current stock levels, pricing, and bin locations.</p>
                <span className="text-[9px] text-teal-400 font-bold uppercase tracking-widest mt-3 block group-hover:underline">CSV, XLSX, XLS</span>
              </button>
              <button
                onClick={() => setStep('UPLOAD_CATALOG')}
                className="p-8 rounded-2xl border-2 border-white/10 hover:border-amber-400/50 bg-slate-800/50 hover:bg-slate-800 transition-all text-left group"
              >
                <div className="text-3xl mb-3">📖</div>
                <h4 className="text-white font-black text-lg mb-1">Distributor Catalog</h4>
                <p className="text-xs text-slate-400">Import Land & Sea or similar distributor price files. Adds catalog parts for ordering — won't affect on-hand stock.</p>
                <span className="text-[9px] text-amber-400 font-bold uppercase tracking-widest mt-3 block group-hover:underline">TXT fixed-width files</span>
              </button>
            </div>
          )}

          {/* Step: Upload CSV */}
          {step === 'UPLOAD_CSV' && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-white/10 rounded-2xl hover:border-neon-steel/50 transition-all cursor-pointer" onClick={() => csvInputRef.current?.click()}>
              <div className="w-16 h-16 bg-neon-steel/10 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-neon-steel" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h4 className="text-white font-bold">Drop on-hand spreadsheet here or click to browse</h4>
              <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest">Supports CSV, XLSX, XLS — BitPro, DealerTrack, etc.</p>
              <input type="file" ref={csvInputRef} onChange={handleCSVFileChange} accept=".csv,.xlsx,.xls" className="hidden" />
              {error && <p className="mt-4 text-xs text-red-400 font-bold">{error}</p>}
            </div>
          )}

          {/* Step: Upload Catalog text files */}
          {step === 'UPLOAD_CATALOG' && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-white/10 rounded-2xl hover:border-amber-400/50 transition-all cursor-pointer" onClick={() => catalogInputRef.current?.click()}>
              <div className="w-16 h-16 bg-amber-400/10 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-white font-bold">Drop catalog text files here or click to browse</h4>
              <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest">Select all Land & Sea .txt files at once (multi-select OK)</p>
              <input type="file" ref={catalogInputRef} onChange={handleCatalogFileChange} accept=".txt,.dat,.csv" multiple className="hidden" />
              {error && <p className="mt-4 text-xs text-red-400 font-bold">{error}</p>}
            </div>
          )}

          {/* Step: Column mapping (CSV only) */}
          {step === 'MAP' && fileData && (
            <InventoryColumnMapper
              headers={fileData.headers}
              mapping={fileData.mapping}
              confidence={fileData.confidence}
              onMappingChange={handleMappingChange}
            />
          )}

          {/* Step: Catalog confirmation */}
          {step === 'CATALOG_CONFIRM' && catalogData && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-4 text-center">
                  <span className="text-2xl font-black text-teal-400">{catalogData.parts.length.toLocaleString()}</span>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Parts Found</p>
                </div>
                <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4 text-center">
                  <span className="text-2xl font-black text-slate-300">{catalogData.lineCount.toLocaleString()}</span>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Lines Processed</p>
                </div>
                <div className={`${catalogData.errorCount > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'} border rounded-xl p-4 text-center`}>
                  <span className={`text-2xl font-black ${catalogData.errorCount > 0 ? 'text-red-400' : 'text-green-400'}`}>{catalogData.errorCount}</span>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Errors</p>
                </div>
              </div>

              {/* Sample preview */}
              <div>
                <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Sample Parts (first 10)</h4>
                <div className="bg-slate-900/50 rounded-lg border border-white/5 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-500 uppercase text-[9px]">
                        <th className="p-2 text-left">Part #</th>
                        <th className="p-2 text-left">Description</th>
                        <th className="p-2 text-left">Vendor</th>
                        <th className="p-2 text-right">List</th>
                        <th className="p-2 text-right">Dealer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catalogData.parts.slice(0, 10).map(p => (
                        <tr key={p.partNumber} className="border-b border-white/5 hover:bg-white/5">
                          <td className="p-2 font-mono text-teal-400">{p.partNumber}</td>
                          <td className="p-2 text-slate-300">{p.description}</td>
                          <td className="p-2 text-slate-500">{p.vendor}</td>
                          <td className="p-2 text-right text-slate-300">${p.msrp.toFixed(2)}</td>
                          <td className="p-2 text-right text-slate-400">${p.dealerPrice.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {catalogData.errors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-[10px] text-red-400 font-bold uppercase mb-1">Parse Errors</p>
                  {catalogData.errors.map((e, i) => <p key={i} className="text-[10px] text-red-300 font-mono">{e}</p>)}
                </div>
              )}
            </div>
          )}

          {/* Step: Importing */}
          {step === 'IMPORTING' && !catalogData && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-neon-steel border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-neon-steel font-black uppercase tracking-widest animate-pulse">{progress || 'Processing...'}</p>
            </div>
          )}
          {step === 'IMPORTING' && catalogData && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-amber-400 font-black uppercase tracking-widest animate-pulse">{progress || 'Processing...'}</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-between items-center border-t border-white/5 pt-6">
          <button
            onClick={step === 'SELECT' ? onClose : () => setStep('SELECT')}
            className="px-6 py-2 bg-slate-800 text-slate-400 font-bold rounded-lg text-xs uppercase hover:text-white transition-all"
          >
            {step === 'SELECT' ? 'Cancel' : 'Back'}
          </button>

          {step === 'MAP' && (
            <button
              onClick={handleCSVCommit}
              disabled={!fileData?.mapping.partNumber}
              className="px-8 py-2 bg-neon-steel text-slate-900 font-black rounded-lg text-xs uppercase hover:scale-105 disabled:opacity-50 disabled:grayscale transition-all shadow-xl shadow-neon-steel/20"
            >
              Commit On-Hand Stock
            </button>
          )}

          {step === 'CATALOG_CONFIRM' && (
            <button
              onClick={handleCatalogCommit}
              className="px-8 py-2 bg-amber-500 text-slate-900 font-black rounded-lg text-xs uppercase hover:scale-105 transition-all shadow-xl shadow-amber-500/20"
            >
              Import {catalogData?.parts.length.toLocaleString()} Catalog Parts
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryImportModal;
