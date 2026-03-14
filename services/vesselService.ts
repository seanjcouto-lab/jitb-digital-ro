import { db } from '../localDb';
import { VesselHistory } from '../types';

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
  },

  /**
   * Update an existing vessel record.
   */
  updateVessel: async (vessel: VesselHistory): Promise<void> => {
    await db.vesselDnaHistory.put(vessel);
  },

  /**
   * Add a past RO entry to a vessel's history.
   */
  addPastRO: async (vesselHIN: string, roEntry: any): Promise<void> => {
    const vessel = await db.vesselDnaHistory.get(vesselHIN);
    if (vessel) {
      await db.vesselDnaHistory.update(vesselHIN, { 
        pastROs: [...vessel.pastROs, roEntry] 
      });
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
        
        await db.vesselDnaHistory.put({
            ...vessel,
            status: 'INCOMPLETE',
            unresolvedNotes: newUnresolvedNotes
        });
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
