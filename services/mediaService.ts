import { db } from '../localDb';
import { MediaRecord } from '../types';
import { syncPendingMedia } from './mediaSyncService';

/**
 * Media persistence service — stores evidence (photos, video, audio) in IndexedDB.
 * Local-first: blobs saved immediately to Dexie, synced to Supabase Storage in background.
 *
 * URL protocol: `media://{mediaId}` — resolved by getMediaUrl() to either
 * a Supabase permanent URL (if synced) or a temporary blob URL from Dexie.
 */

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'audio/webm': '.webm',
  'audio/mp4': '.m4a',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/ogg': '.ogg',
};

function getExtension(mimeType: string): string {
  return MIME_EXTENSIONS[mimeType] || '.bin';
}

export const mediaService = {
  /**
   * Save a media blob to Dexie. Returns the media ID (UUID).
   * The blob is stored immediately — survives page reloads.
   */
  saveMedia: async (
    roId: string,
    directiveId: string | null,
    type: 'photo' | 'video' | 'audio',
    blob: Blob,
    mimeType: string,
    shopId: string
  ): Promise<string> => {
    const id = crypto.randomUUID();
    const fileName = `${id}${getExtension(mimeType)}`;

    const record: MediaRecord = {
      id,
      roId,
      directiveId,
      shopId,
      type,
      mimeType,
      blob,
      fileName,
      createdAt: Date.now(),
      syncStatus: 'pending',
      supabaseUrl: null,
    };

    await db.mediaStore.add(record);
    // Fire background sync — don't await, don't block
    syncPendingMedia().catch(() => {});
    return id;
  },

  /**
   * Get a renderable URL for a media record.
   * Returns the Supabase permanent URL if synced, otherwise creates a blob URL from Dexie.
   * Caller is responsible for revoking blob URLs when done.
   */
  getMediaUrl: async (mediaId: string): Promise<string | null> => {
    const record = await db.mediaStore.get(mediaId);
    if (!record) return null;

    // If already synced to Supabase, use permanent URL
    if (record.supabaseUrl) return record.supabaseUrl;

    // Otherwise create blob URL from stored blob
    if (record.blob) return URL.createObjectURL(record.blob);

    return null;
  },

  /**
   * Get a media record by ID (full record including blob).
   */
  getMedia: async (mediaId: string): Promise<MediaRecord | undefined> => {
    return db.mediaStore.get(mediaId);
  },

  /**
   * Get all media records for a repair order.
   */
  getMediaForRO: async (roId: string): Promise<MediaRecord[]> => {
    return db.mediaStore.where('roId').equals(roId).toArray();
  },

  /**
   * Get media records for a specific directive on an RO.
   */
  getMediaForDirective: async (roId: string, directiveId: string): Promise<MediaRecord[]> => {
    return db.mediaStore.where('[roId+directiveId]').equals([roId, directiveId]).toArray();
  },

  /**
   * Get all media records with pending sync status.
   */
  getPendingMedia: async (): Promise<MediaRecord[]> => {
    return db.mediaStore.where('syncStatus').equals('pending').toArray();
  },

  /**
   * Mark a media record as synced with its permanent Supabase URL.
   */
  markSynced: async (mediaId: string, supabaseUrl: string): Promise<void> => {
    await db.mediaStore.update(mediaId, { syncStatus: 'synced', supabaseUrl });
  },

  /**
   * Mark a media record as failed sync.
   */
  markFailed: async (mediaId: string): Promise<void> => {
    await db.mediaStore.update(mediaId, { syncStatus: 'failed' });
  },

  /**
   * Cleanup old synced media — null out blob data for records synced more than maxAgeDays ago.
   * Keeps the metadata row (with supabaseUrl) so media:// references still resolve.
   * Returns the number of records cleaned.
   */
  cleanupSyncedMedia: async (maxAgeDays: number = 30): Promise<number> => {
    const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    const oldSynced = await db.mediaStore
      .where('syncStatus').equals('synced')
      .filter(r => r.createdAt < cutoff && r.blob !== null)
      .toArray();

    let cleaned = 0;
    for (const record of oldSynced) {
      // Replace blob with empty blob to free storage but keep the row
      await db.mediaStore.update(record.id, { blob: new Blob([]) });
      cleaned++;
    }

    return cleaned;
  },

  /**
   * Extract mediaId from a media:// URL.
   * Returns null if the URL is not a media:// reference.
   */
  parseMediaUrl: (url: string): string | null => {
    if (url && url.startsWith('media://')) {
      return url.slice(8); // Remove 'media://' prefix
    }
    return null;
  },

  /**
   * Get the count of pending (unsynced) media records.
   */
  getPendingCount: async (): Promise<number> => {
    return db.mediaStore.where('syncStatus').equals('pending').count();
  },
};
