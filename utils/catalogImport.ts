import { Part } from '../types';

/**
 * Land & Sea fixed-width catalog file parser.
 *
 * Format: positional text, one part per line, ~280 chars wide.
 * Columns (character positions):
 *   0-22:   Full part number (with prefix like "1-")
 *   23-45:  Alternate part number (TEL xxx)
 *   46-68:  Clean part number (no prefix)
 *   69-98:  Vendor/manufacturer name
 *   99-133: Description
 *   134-144: Category code
 *   145-146: Pack quantity
 *   147-157: List price (MSRP)
 *   199-208: Dealer cost
 *   245-258: UPC barcode (starts with Y)
 *
 * Also supports any plain-text fixed-width catalog with similar structure.
 */

interface CatalogParseResult {
  parts: Part[];
  lineCount: number;
  errorCount: number;
  errors: string[];
}

function parseFloat_(s: string): number {
  const cleaned = s.replace(/[,$]/g, '').trim();
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

export function parseLandSeaCatalogLine(line: string, shopId: string): Part | null {
  if (line.length < 160) return null; // Too short to be a valid record

  const partNumber = line.slice(46, 69).trim();
  if (!partNumber) return null;

  const vendor = line.slice(69, 99).trim();
  const description = line.slice(99, 134).trim();
  const category = line.slice(134, 145).trim();
  const listPrice = parseFloat_(line.slice(147, 158));
  const dealerCost = line.length > 208 ? parseFloat_(line.slice(199, 209)) : 0;

  // UPC: look for 'Y' followed by digits around position 245
  let upc = '';
  if (line.length > 258) {
    const upcArea = line.slice(240, 260);
    const yIdx = upcArea.indexOf('Y');
    if (yIdx >= 0) {
      upc = upcArea.slice(yIdx, yIdx + 14).replace(/\s+/g, '');
    }
  }

  if (!description && !vendor) return null; // Skip blank/header lines

  return {
    partNumber,
    description: description || vendor || partNumber,
    category: category || 'CATALOG',
    binLocation: '',
    msrp: listPrice,
    dealerPrice: dealerCost,
    cost: dealerCost,
    quantityOnHand: 0,
    reorderPoint: 0,
    supersedesPart: null,
    shopId,
    source: 'catalog',
    vendor: vendor || '',
    upc: upc || undefined,
  };
}

/**
 * Parse a full Land & Sea catalog text file (or multiple files concatenated).
 * Returns deduplicated parts keyed by partNumber.
 */
export function parseLandSeaCatalog(text: string, shopId: string): CatalogParseResult {
  const lines = text.split(/\r?\n/);
  const partsMap = new Map<string, Part>();
  const errors: string[] = [];
  let errorCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    try {
      const part = parseLandSeaCatalogLine(line, shopId);
      if (part) {
        partsMap.set(part.partNumber, part);
      }
    } catch (err) {
      errorCount++;
      if (errors.length < 10) {
        errors.push(`Line ${i + 1}: ${(err as Error).message}`);
      }
    }
  }

  return {
    parts: Array.from(partsMap.values()),
    lineCount: lines.length,
    errorCount,
    errors,
  };
}

/**
 * Parse multiple catalog text files. Each file is read as text and parsed.
 * Deduplicates across all files by partNumber (last occurrence wins).
 */
export async function parseCatalogFiles(files: File[], shopId: string): Promise<CatalogParseResult> {
  const allParts = new Map<string, Part>();
  let totalLines = 0;
  let totalErrors = 0;
  const allErrors: string[] = [];

  for (const file of files) {
    const text = await file.text();
    const result = parseLandSeaCatalog(text, shopId);
    totalLines += result.lineCount;
    totalErrors += result.errorCount;
    allErrors.push(...result.errors);

    for (const part of result.parts) {
      allParts.set(part.partNumber, part);
    }
  }

  return {
    parts: Array.from(allParts.values()),
    lineCount: totalLines,
    errorCount: totalErrors,
    errors: allErrors.slice(0, 20), // Cap at 20 error messages
  };
}
