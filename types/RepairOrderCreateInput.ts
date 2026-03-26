import { CollectionsStatus } from '../types';

/**
 * Minimal part shape for RO creation.
 * The service layer hydrates full Part details from masterInventory.
 * Do not include quantity or status — those are resolved by the service.
 */
export interface ManualPartInput {
  partNumber: string;
  description: string;
}

/**
 * Canonical contract for all Repair Order creation.
 * Every entry point — UI, Parker, imports, future API — maps to this type.
 * No exceptions.
 */
export interface RepairOrderCreateInput {
  // --- Customer ---
  customerName: string;
  customerPhones: string[];
  customerEmails: string[];
  customerAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  customerNotes: string | null;
  jobComplaint: string | null;

  // --- Vessel ---
  vesselHIN: string;
  vesselName: string;
  boatMake: string | null;
  boatModel: string | null;
  boatYear: string | null;
  boatLength: string | null;

  // --- Engine ---
  engineMake: string | null;
  engineModel: string | null;
  engineYear: string | null;
  engineHorsepower: string | null;
  engineSerial: string;

  // --- Job Details ---
  selectedPackages: string[];
  manualParts: ManualPartInput[];
  manualDirectives: string[];
  collectionsStatus?: CollectionsStatus;

  // --- Authorization ---
  authorization?: {
    type: 'digital' | 'verbal';
    data: string;
    timestamp?: number;
  };

  shopId: string;
}

export interface ParkerRepairOrderCreateInput extends RepairOrderCreateInput {
  intakeSessionId: string;
  intakeSource: 'vapi' | 'text' | 'tablet';
  reportedProblem: string | null;
}
