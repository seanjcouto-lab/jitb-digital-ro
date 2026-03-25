import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * NOTE — HIN fallback chain (HIN → engineSerial → RO-ID):
 * This logic lives in repairOrderService.finalizeInvoice, not in vesselService.
 * vesselService.getVesselByHIN performs a direct key lookup only.
 * The fallback key is resolved by the caller before getVesselByHIN is called.
 * The fallback is covered in repairOrderService.spec.ts (finalizeInvoice tests).
 */

// --- Mocks ---

const mockVesselDnaHistory = vi.hoisted(() => ({
  get: vi.fn(),
  add: vi.fn(),
  put: vi.fn(),
  filter: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../localDb', () => ({
  db: {
    vesselDnaHistory: mockVesselDnaHistory,
  },
}));

vi.mock('../utils/supabaseSync', () => ({
  syncVesselToSupabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })),
    })),
  },
}));

vi.mock('./shopContextService', () => ({
  shopContextService: {
    getActiveShopId: vi.fn(() => '00000000-0000-0000-0000-000000000001'),
  },
}));

import { vesselService } from '../services/vesselService';

// --- Shared fixture ---

const makeVessel = (overrides: any = {}) => ({
  vesselHIN: 'HIN-001',
  customerName: 'Michael Harrington',
  customerPhones: ['4015554444'],
  customerEmails: ['m@example.com'],
  customerAddress: { street: '1 Dock St', city: 'Newport', state: 'RI', zip: '02840' },
  customerNotes: null,
  status: 'COMPLETE' as const,
  unresolvedNotes: '',
  boatMake: 'Boston Whaler',
  boatModel: 'Dauntless 17',
  boatYear: '2002',
  boatLength: '17',
  engineMake: 'Honda',
  engineModel: 'BF130',
  engineYear: '2002',
  engineHorsepower: '130',
  engineSerial: 'ENG-001',
  pastROs: [],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// getVesselByHIN
// ============================================================

describe('vesselService.getVesselByHIN', () => {
  it('returns a vessel when found by HIN', async () => {
    const vessel = makeVessel();
    mockVesselDnaHistory.get.mockResolvedValue(vessel);

    const result = await vesselService.getVesselByHIN('HIN-001');
    expect(result).toEqual(vessel);
    expect(mockVesselDnaHistory.get).toHaveBeenCalledWith('HIN-001');
  });

  it('returns undefined when HIN is not found', async () => {
    mockVesselDnaHistory.get.mockResolvedValue(undefined);

    const result = await vesselService.getVesselByHIN('HIN-MISSING');
    expect(result).toBeUndefined();
  });

  it('is a direct key lookup — fallback chain (HIN→serial→RO-ID) is resolved by caller', async () => {
    // The caller (repairOrderService.finalizeInvoice) passes the resolved key.
    // vesselService just looks it up — no internal fallback logic here.
    mockVesselDnaHistory.get.mockResolvedValue(undefined);
    const result = await vesselService.getVesselByHIN('ENG-001'); // engineSerial used as key
    expect(mockVesselDnaHistory.get).toHaveBeenCalledWith('ENG-001');
    expect(result).toBeUndefined();
  });
});

// ============================================================
// searchVesselHistory
// ============================================================

describe('vesselService.searchVesselHistory', () => {
  it('returns empty array when query is less than 2 characters', async () => {
    const result = await vesselService.searchVesselHistory('M');
    expect(result).toEqual([]);
    expect(mockVesselDnaHistory.filter).not.toHaveBeenCalled();
  });

  it('returns empty array for empty query', async () => {
    const result = await vesselService.searchVesselHistory('');
    expect(result).toEqual([]);
  });
});

// ============================================================
// addPastRO
// ============================================================

describe('vesselService.addPastRO', () => {
  it('appends a new RO entry to pastROs', async () => {
    const vessel = makeVessel({ pastROs: [{ id: 'RO-OLD', date: '1/1/2025', summary: 'Old job', partsUsed: [] }] });
    mockVesselDnaHistory.get.mockResolvedValue(vessel);
    mockVesselDnaHistory.put.mockResolvedValue(undefined);

    const newEntry = { id: 'RO-NEW', date: '3/24/2026', summary: 'New job', partsUsed: [] };
    await vesselService.addPastRO('HIN-001', newEntry);

    expect(mockVesselDnaHistory.put).toHaveBeenCalledWith(
      expect.objectContaining({
        pastROs: expect.arrayContaining([
          expect.objectContaining({ id: 'RO-OLD' }),
          expect.objectContaining({ id: 'RO-NEW' }),
        ]),
      })
    );
  });

  it('does nothing when vessel is not found', async () => {
    mockVesselDnaHistory.get.mockResolvedValue(undefined);
    await vesselService.addPastRO('HIN-MISSING', { id: 'RO-X', date: '', summary: '', partsUsed: [] });
    expect(mockVesselDnaHistory.put).not.toHaveBeenCalled();
  });
});

// ============================================================
// flagUnresolvedIssues
// ============================================================

describe('vesselService.flagUnresolvedIssues', () => {
  it('sets vessel status to INCOMPLETE', async () => {
    const vessel = makeVessel({ status: 'COMPLETE', unresolvedNotes: '' });
    mockVesselDnaHistory.get.mockResolvedValue(vessel);
    mockVesselDnaHistory.put.mockResolvedValue(undefined);

    await vesselService.flagUnresolvedIssues('HIN-001', 'Engine overheating');

    expect(mockVesselDnaHistory.put).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'INCOMPLETE' })
    );
  });

  it('appends new note to existing unresolvedNotes', async () => {
    const vessel = makeVessel({ unresolvedNotes: 'Prior issue' });
    mockVesselDnaHistory.get.mockResolvedValue(vessel);
    mockVesselDnaHistory.put.mockResolvedValue(undefined);

    await vesselService.flagUnresolvedIssues('HIN-001', 'New issue');

    const putCall = mockVesselDnaHistory.put.mock.calls[0][0];
    expect(putCall.unresolvedNotes).toContain('Prior issue');
    expect(putCall.unresolvedNotes).toContain('New issue');
  });

  it('does nothing when vessel is not found', async () => {
    mockVesselDnaHistory.get.mockResolvedValue(undefined);
    await vesselService.flagUnresolvedIssues('HIN-MISSING', 'Issue');
    expect(mockVesselDnaHistory.put).not.toHaveBeenCalled();
  });
});

// ============================================================
// initializeProfileFromDNA
// ============================================================

describe('vesselService.initializeProfileFromDNA', () => {
  it('maps all vessel DNA fields to profile shape', () => {
    const dna = makeVessel();
    const profile = vesselService.initializeProfileFromDNA(dna);

    expect(profile.customerName).toBe('Michael Harrington');
    expect(profile.vesselHIN).toBe('HIN-001');
    expect(profile.engineSerial).toBe('ENG-001');
    expect(profile.boatMake).toBe('Boston Whaler');
    expect(profile.vesselName).toBe(''); // always empty — set by SM on new RO
  });

  it('falls back to [""] for empty phones and emails', () => {
    const dna = makeVessel({ customerPhones: [], customerEmails: [] });
    const profile = vesselService.initializeProfileFromDNA(dna);
    expect(profile.customerPhones).toEqual(['']);
    expect(profile.customerEmails).toEqual(['']);
  });

  it('preserves populated phones and emails', () => {
    const dna = makeVessel({ customerPhones: ['4015554444'], customerEmails: ['m@example.com'] });
    const profile = vesselService.initializeProfileFromDNA(dna);
    expect(profile.customerPhones).toEqual(['4015554444']);
    expect(profile.customerEmails).toEqual(['m@example.com']);
  });

  it('prepends historical alert to notes when addAlertAsDirective is true', () => {
    const dna = makeVessel({ unresolvedNotes: 'Engine overheating on last visit', customerNotes: 'Regular customer' });
    const profile = vesselService.initializeProfileFromDNA(dna, true);
    expect(profile.customerNotes).toContain('HISTORICAL ALERT');
    expect(profile.customerNotes).toContain('Engine overheating on last visit');
    expect(profile.customerNotes).toContain('Regular customer');
  });

  it('does not prepend alert when addAlertAsDirective is false', () => {
    const dna = makeVessel({ unresolvedNotes: 'Some issue' });
    const profile = vesselService.initializeProfileFromDNA(dna, false);
    expect(profile.customerNotes).not.toContain('HISTORICAL ALERT');
  });
});

// ============================================================
// Vessel DNA — incomplete directive visibility
// ============================================================

describe('Vessel DNA surfaces incomplete directives in history', () => {
  it('archives the RO in vessel history and flags the incomplete directive so future SMs see unfinished work on next visit', async () => {
    // Scenario: boat comes in, three directives scoped
    //   1. Replace impeller            → completed
    //   2. Inspect and grease trim tabs → completed
    //   3. Investigate raw water leak   → NOT completed (found but not resolved)
    // SM closes the job. Six months later the boat returns. The SM needs to see
    // at a glance that the leak was never resolved.

    const vessel = makeVessel();

    const archivedEntry = {
      id: 'RO-2026-0325',
      date: '3/25/2026',
      // Summary captures the two completed directives; the third was left open
      summary: 'Replaced impeller. Inspected and greased trim tabs. Raw water leak identified — source not resolved.',
      partsUsed: [{ partNumber: 'IMP-001', description: 'Impeller Kit' }],
    };

    // addPastRO and flagUnresolvedIssues each call get() once
    mockVesselDnaHistory.get
      .mockResolvedValueOnce(vessel)                                          // read for addPastRO
      .mockResolvedValueOnce({ ...vessel, pastROs: [archivedEntry] });        // read for flagUnresolvedIssues

    mockVesselDnaHistory.put.mockResolvedValue(undefined);

    // Step 1: Close the job — archive the RO into vessel history
    await vesselService.addPastRO('HIN-001', archivedEntry);

    // Step 2: Flag the vessel INCOMPLETE because directive 3 was not finished
    const incompleteSummary = 'Incomplete from RO RO-2026-0325: Investigate raw water leak';
    await vesselService.flagUnresolvedIssues('HIN-001', incompleteSummary);

    // --- Assertions ---

    // The archived RO appears in vessel history
    const putAfterArchive = mockVesselDnaHistory.put.mock.calls[0][0];
    expect(putAfterArchive.pastROs).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'RO-2026-0325' })])
    );

    // The summary on the archived entry covers all three directive outcomes
    // (completed work is described; the open item is noted as unresolved)
    const savedSummary = putAfterArchive.pastROs.find((r: any) => r.id === 'RO-2026-0325').summary;
    expect(savedSummary).toContain('Replaced impeller');
    expect(savedSummary).toContain('trim tabs');
    expect(savedSummary).toContain('Raw water leak');

    // The vessel is now INCOMPLETE — Oracle Search will alert the SM on next visit
    const putAfterFlag = mockVesselDnaHistory.put.mock.calls[1][0];
    expect(putAfterFlag.status).toBe('INCOMPLETE');

    // The unresolved notes name the specific incomplete directive
    // so the SM knows exactly what was left unfinished
    expect(putAfterFlag.unresolvedNotes).toContain('Investigate raw water leak');
  });
});
