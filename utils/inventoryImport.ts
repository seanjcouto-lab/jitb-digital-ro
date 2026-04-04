import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Part } from '../types';
import { db } from '../localDb';

export const CANONICAL_FIELDS = [
  'partNumber',
  'description',
  'category',
  'binLocation',
  'msrp',
  'dealerPrice',
  'cost',
  'quantityOnHand',
  'reorderPoint',
  'supersedesPart'
] as const;

export type CanonicalField = typeof CANONICAL_FIELDS[number];

export const SYNONYMS: Record<CanonicalField, string[]> = {
  partNumber: ['pnum', 'part', 'partnumber', 'partno', 'part#', 'sku', 'item', 'itemno'],
  description: ['des', 'desc', 'description', 'itemdescription', 'name', 'itemname'],
  category: ['class', 'category', 'cat', 'group', 'type'],
  binLocation: ['bin', 'location', 'binlocation', 'loc'],
  msrp: ['price', 'msrp', 'retail', 'retailprice', 'sellprice', 'listprice'],
  dealerPrice: ['dealerprice', 'dealer', 'jobber', 'wholesale', 'repcost'],
  cost: ['avgcost', 'cost', 'unitcost', 'lastcost', 'lstbuycost', 'standardcost'],
  quantityOnHand: ['onhand', 'qoh', 'qty', 'quantity', 'instock', 'stock'],
  reorderPoint: ['ohmin', 'min', 'minimum', 'reorder', 'reorderpoint', 'rop'],
  supersedesPart: ['supers', 'supersedes', 'superseded', 'replaces', 'replacement']
};

export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[_\-\s#]/g, '') // remove underscores, hyphens, spaces, hashes
    .replace(/[^\w]/g, ''); // remove other punctuation
}

export function heuristicScore(header: string, field: CanonicalField, samples: any[]): number {
  const normalized = normalizeHeader(header);
  const synonyms = SYNONYMS[field];
  
  // Header match score
  let headerScore = 0;
  if (synonyms.includes(normalized) || field.toLowerCase() === normalized) {
    headerScore = 0.8;
  } else if (synonyms.some(s => normalized.includes(s) || s.includes(normalized))) {
    headerScore = 0.4;
  }

  // Data heuristic score
  let dataScore = 0;
  const nonNullSamples = samples.filter(s => s !== null && s !== undefined && s !== '');
  if (nonNullSamples.length === 0) return headerScore;

  switch (field) {
    case 'partNumber':
      // alphanumeric, short strings, mostly unique
      const isAlphanumeric = nonNullSamples.every(s => /^[a-zA-Z0-9-]+$/.test(String(s)));
      const avgLength = nonNullSamples.reduce((acc, s) => acc + String(s).length, 0) / nonNullSamples.length;
      const uniqueCount = new Set(nonNullSamples).size;
      if (isAlphanumeric && avgLength < 20 && uniqueCount / nonNullSamples.length > 0.8) dataScore = 0.3;
      break;
    case 'quantityOnHand':
    case 'reorderPoint':
      // mostly numeric values
      const isNumeric = nonNullSamples.every(s => !isNaN(Number(String(s).replace(/[^0-9.-]/g, ''))));
      if (isNumeric) dataScore = 0.3;
      break;
    case 'msrp':
    case 'dealerPrice':
    case 'cost':
      // numeric or currency formatted
      const isPrice = nonNullSamples.every(s => {
        const val = String(s).replace(/[$,]/g, '');
        return !isNaN(Number(val));
      });
      if (isPrice) dataScore = 0.3;
      break;
    case 'description':
      // longer text strings
      const avgDescLength = nonNullSamples.reduce((acc, s) => acc + String(s).length, 0) / nonNullSamples.length;
      if (avgDescLength > 15) dataScore = 0.2;
      break;
  }

  return Math.min(1, headerScore + dataScore);
}

export function detectMapping(headers: string[], rows: any[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const usedHeaders = new Set<string>();

  for (const field of CANONICAL_FIELDS) {
    let bestHeader = '';
    let bestScore = -1;

    for (const header of headers) {
      if (usedHeaders.has(header)) continue;
      
      const samples = rows.slice(0, 10).map(row => row[header]);
      const score = heuristicScore(header, field, samples);
      
      if (score > bestScore) {
        bestScore = score;
        bestHeader = header;
      }
    }

    if (bestScore >= 0.4) { // Minimum threshold to auto-suggest
      mapping[field] = bestHeader;
      usedHeaders.add(bestHeader);
    }
  }

  return mapping;
}

export function transformRows(rows: any[], mapping: Record<string, string>, shopId: string): Part[] {
  const partsMap = new Map<string, Part>();

  for (const row of rows) {
    const partNumber = String(row[mapping.partNumber] || '').trim();
    if (!partNumber) continue;

    const part: Part = {
      partNumber,
      description: String(row[mapping.description] || ''),
      category: String(row[mapping.category] || ''),
      binLocation: String(row[mapping.binLocation] || ''),
      msrp: Number(String(row[mapping.msrp] || '0').replace(/[$,]/g, '')) || 0,
      dealerPrice: Number(String(row[mapping.dealerPrice] || '0').replace(/[$,]/g, '')) || 0,
      cost: Number(String(row[mapping.cost] || '0').replace(/[$,]/g, '')) || 0,
      quantityOnHand: Number(row[mapping.quantityOnHand]) || 0,
      reorderPoint: Number(row[mapping.reorderPoint]) || 0,
      supersedesPart: row[mapping.supersedesPart] ? String(row[mapping.supersedesPart]) : null,
      shopId,
      source: 'onhand' as const,
    };

    partsMap.set(part.partNumber, part);
  }

  return Array.from(partsMap.values());
}

export async function importInventoryFromFile(file: File): Promise<{ rows: any[], headers: string[], mapping: Record<string, string>, confidence: number }> {
  return new Promise((resolve, reject) => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields || [];
          const rows = results.data;
          const mapping = detectMapping(headers, rows);
          
          // Calculate average confidence
          const scores = CANONICAL_FIELDS.map(f => {
            if (!mapping[f]) return 0;
            return heuristicScore(mapping[f], f, rows.slice(0, 10).map(r => r[mapping[f]]));
          });
          const confidence = scores.reduce((a, b) => a + b, 0) / CANONICAL_FIELDS.length;

          resolve({ rows, headers, mapping, confidence });
        },
        error: (err) => reject(err)
      });
    } else if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet);
        const headers = rows.length > 0 ? Object.keys(rows[0] as object) : [];
        const mapping = detectMapping(headers, rows);

        const scores = CANONICAL_FIELDS.map(f => {
          if (!mapping[f]) return 0;
          return heuristicScore(mapping[f], f, rows.slice(0, 10).map((r: any) => r[mapping[f]]));
        });
        const confidence = scores.reduce((a, b) => a + b, 0) / CANONICAL_FIELDS.length;

        resolve({ rows, headers, mapping, confidence });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error('Unsupported file format'));
    }
  });
}

export async function commitInventoryImport(rows: any[], mapping: Record<string, string>, shopId: string, source: 'onhand' | 'catalog' = 'onhand'): Promise<void> {
  const parts = transformRows(rows, mapping, shopId);
  parts.forEach(p => p.source = source);
  await db.transaction('rw', db.masterInventory, async () => {
    // Only delete parts of the same source type — preserve other sources
    const existing = await db.masterInventory
      .where('shopId').equals(shopId)
      .filter(p => (p.source || 'onhand') === source)
      .toArray();
    for (const p of existing) {
      await db.masterInventory.delete([shopId, p.partNumber]);
    }
    await db.masterInventory.bulkPut(parts);
  });
}
