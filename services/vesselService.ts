import { db } from '../localDb';
import { VesselHistory } from '../types';
import { syncVesselToSupabase } from '../utils/supabaseSync';
import { supabase } from '../supabaseClient';
import { shopContextService } from './shopContextService';

export const vesselService = {
  /**
   * Search vessel history by various fields.
   */
  searchVesselHistory: async (query: string): Promise<VesselHistory[]> => {
    if (!query || query.length < 2) {
      return [];
    }

    const searchTerm = query.toLowerCase();
    return await db.vesselDnaHistory
      .filter(vessel => 
          vessel.customerName.toLowerCase().includes(searchTerm) ||
          vessel.vesselHIN.toLowerCase().includes(searchTerm) ||
          vessel.engineSerial.toLowerCase().includes(searchTerm) ||
          vessel.boatMake.toLowerCase().includes(searchTerm) ||
          vessel.boatModel.toLowerCase().includes(searchTerm)
      )
      .toArray();
  },

  /**
   * Get all vessel history records.
   */
  getAllVessels: async (): Promise<VesselHistory[]> => {
    return await db.vesselDnaHistory.toArray();
  },

  /**
   * Get a specific vessel by HIN.
   */
  getVesselByHIN: async (hin: string): Promise<VesselHistory | undefined> => {
    return await db.vesselDnaHistory.get(hin);
  },

  /**
   * Create a new vessel record.
   */
  createVessel: async (vessel: VesselHistory): Promise<void> => {
    await db.vesselDnaHistory.add(vessel);
    syncVesselToSupabase(vessel).catch(err => console.warn('Supabase vessel sync failed (create):', err));
  },

  /**
   * Update an existing vessel record.
   */
  updateVessel: async (vessel: VesselHistory): Promise<void> => {
    await db.vesselDnaHistory.put(vessel);
    syncVesselToSupabase(vessel).catch(err => console.warn('Supabase vessel sync failed (update):', err));
  },

  /**
   * Add a past RO entry to a vessel's history.
   */
  addPastRO: async (vesselHIN: string, roEntry: any): Promise<void> => {
    const vessel = await db.vesselDnaHistory.get(vesselHIN);
    if (vessel) {
      const updated = { ...vessel, pastROs: [...vessel.pastROs, roEntry] };
      await db.vesselDnaHistory.put(updated);
      syncVesselToSupabase(updated).catch(err => console.warn('Supabase vessel sync failed (addPastRO):', err));
    }
  },

  /**
   * Flag unresolved issues on a vessel.
   */
  flagUnresolvedIssues: async (vesselHIN: string, notes: string): Promise<void> => {
    const vessel = await db.vesselDnaHistory.get(vesselHIN);
    if (vessel) {
        const newUnresolvedNotes = vessel.unresolvedNotes
            ? `${vessel.unresolvedNotes}\n- [${new Date().toLocaleDateString()}] ${notes}`
            : `[${new Date().toLocaleDateString()}] ${notes}`;
        const updated = { ...vessel, status: 'INCOMPLETE' as const, unresolvedNotes: newUnresolvedNotes };
        await db.vesselDnaHistory.put(updated);
        syncVesselToSupabase(updated).catch(err => console.warn('Supabase vessel sync failed (flagUnresolved):', err));
    }
  },

  /**
   * Load vessel history from Supabase into local Dexie. Local wins on conflict.
   */
  loadVesselsFromSupabase: async (shopId: string): Promise<void> => {
    try {
      const { data: rows, error } = await supabase
        .from('vessel_history')
        .select('*')
        .eq('shop_id', shopId);

      if (error) { console.warn('Supabase vessel fetch failed:', error.message); return; }
      if (!rows) return;

      for (const row of rows) {
        const existing = await db.vesselDnaHistory.get(row.vessel_hin);
        if (!existing) {
          await db.vesselDnaHistory.put({
            vesselHIN: row.vessel_hin,
            customerName: row.customer_name,
            customerPhones: row.customer_phones ?? [],
            customerEmails: row.customer_emails ?? [],
            customerAddress: row.customer_address ?? { street: '', city: '', state: '', zip: '' },
            customerNotes: row.customer_notes ?? null,
            status: row.status as 'COMPLETE' | 'INCOMPLETE',
            unresolvedNotes: row.unresolved_notes ?? '',
            boatMake: row.boat_make ?? '',
            boatModel: row.boat_model ?? '',
            boatYear: row.boat_year ?? '',
            boatLength: row.boat_length ?? '',
            engineMake: row.engine_make ?? '',
            engineModel: row.engine_model ?? '',
            engineYear: row.engine_year ?? '',
            engineHorsepower: row.engine_horsepower ?? '',
            engineSerial: row.engine_serial ?? '',
            pastROs: row.past_ros ?? [],
          });
        }
      }
      console.log(`Hydrated ${rows.length} vessel records from Supabase`);
    } catch (err) {
      console.warn('Error in loadVesselsFromSupabase:', err);
    }
  },

  /**
   * Initialize a profile object from Vessel DNA.
   */
  initializeProfileFromDNA: (dna: VesselHistory, addAlertAsDirective: boolean = false) => {
    let initialNotes = dna.customerNotes || '';
    if (addAlertAsDirective && dna.unresolvedNotes) {
      initialNotes = `HISTORICAL ALERT: ${dna.unresolvedNotes}\n-----------------\n${initialNotes}`;
    }
    
    return {
      customerName: dna.customerName,
      customerPhones: dna.customerPhones.length > 0 ? dna.customerPhones : [''],
      customerEmails: dna.customerEmails.length > 0 ? dna.customerEmails : [''],
      customerAddress: dna.customerAddress,
      customerNotes: initialNotes.trim(),
      vesselName: '', 
      vesselHIN: dna.vesselHIN,
      engineSerial: dna.engineSerial,
      boatMake: dna.boatMake,
      boatModel: dna.boatModel,
      boatYear: dna.boatYear,
      boatLength: dna.boatLength,
      engineMake: dna.engineMake,
      engineModel: dna.engineModel,
      engineYear: dna.engineYear,
      engineHorsepower: dna.engineHorsepower,
    };
  }
};
