import { VesselHistory } from '../types';
import { inspectDatabase, listDatabases, exportStoreToJson, DbMetadata } from '../utils/indexedDbInspector';
import { vesselService } from './vesselService';

export const databaseService = {
  /**
   * Search vessel history by various fields.
   */
  searchVesselHistory: async (query: string): Promise<VesselHistory[]> => {
    return await vesselService.searchVesselHistory(query);
  },

  /**
   * List all available IndexedDB databases.
   */
  getAvailableDatabases: async (): Promise<string[]> => {
    return await listDatabases();
  },

  /**
   * Get metadata for a specific database.
   */
  getDatabaseMetadata: async (dbName: string): Promise<DbMetadata> => {
    return await inspectDatabase(dbName);
  },

  /**
   * Export data from a specific object store.
   */
  exportStoreData: async (dbName: string, storeName: string): Promise<any[]> => {
    return await exportStoreToJson(dbName, storeName);
  }
};
