
export interface IndexMetadata {
  name: string;
  keyPath: string | string[];
  unique: boolean;
  multiEntry: boolean;
}

export interface StoreMetadata {
  name: string;
  keyPath: string | string[] | null;
  autoIncrement: boolean;
  indexes: IndexMetadata[];
  count: number;
  sample: any[];
}

export interface DbMetadata {
  name: string;
  version: number;
  stores: StoreMetadata[];
}

/**
 * Inspects a specific IndexedDB database by name.
 */
export async function inspectDatabase(dbName: string): Promise<DbMetadata> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);

    request.onerror = () => reject(new Error(`Failed to open database: ${dbName}`));

    request.onsuccess = async (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const metadata: DbMetadata = {
        name: db.name,
        version: db.version,
        stores: [],
      };

      const storeNames = Array.from(db.objectStoreNames);
      
      const storePromises = storeNames.map(async (storeName) => {
        return new Promise<StoreMetadata>((resStore) => {
          const transaction = db.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);

          const storeMeta: StoreMetadata = {
            name: store.name,
            keyPath: store.keyPath,
            autoIncrement: store.autoIncrement,
            indexes: [],
            count: 0,
            sample: [],
          };

          // Get indexes
          const indexNames = Array.from(store.indexNames);
          storeMeta.indexes = indexNames.map((idxName) => {
            const index = store.index(idxName);
            return {
              name: index.name,
              keyPath: index.keyPath,
              unique: index.unique,
              multiEntry: index.multiEntry,
            };
          });

          // Get count
          const countRequest = store.count();
          countRequest.onsuccess = () => {
            storeMeta.count = countRequest.result;
          };

          // Get sample (first 5)
          const sampleRequest = store.getAll(null, 5);
          sampleRequest.onsuccess = () => {
            storeMeta.sample = sampleRequest.result;
          };

          transaction.oncomplete = () => {
            resStore(storeMeta);
          };
          
          transaction.onerror = () => {
            // Even if it fails, return what we have
            resStore(storeMeta);
          };
        });
      });

      metadata.stores = await Promise.all(storePromises);
      db.close();
      resolve(metadata);
    };
  });
}

/**
 * Lists all available databases.
 */
export async function listDatabases(): Promise<string[]> {
  if ('databases' in indexedDB) {
    try {
      // @ts-ignore - databases() is not in all TS lib versions
      const dbs = await indexedDB.databases();
      return dbs.map((d: any) => d.name).filter(Boolean);
    } catch (e) {
      console.error('Error listing databases:', e);
      return [];
    }
  }
  return [];
}

/**
 * Exports a full store to JSON (limited to 500 records).
 */
export async function exportStoreToJson(dbName: string, storeName: string, limit: number = 500): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);
    request.onerror = () => reject(new Error(`Failed to open database: ${dbName}`));
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const getAllRequest = store.getAll(null, limit);

      getAllRequest.onsuccess = () => {
        const result = getAllRequest.result;
        db.close();
        resolve(result);
      };

      getAllRequest.onerror = () => {
        db.close();
        reject(new Error(`Failed to get records from store: ${storeName}`));
      };
    };
  });
}
