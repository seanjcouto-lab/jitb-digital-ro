import { supabase } from '../supabaseClient';
import { mediaService } from './mediaService';

const BUCKET = 'evidence';
const MAX_RETRIES = 3;

let isSyncing = false;

/**
 * Upload all pending media blobs to Supabase Storage.
 * Fire-and-forget — safe to call frequently, deduplicates via isSyncing flag.
 * After upload, marks records as synced with their permanent public URL.
 */
export async function syncPendingMedia(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const pending = await mediaService.getPendingMedia();
    if (pending.length === 0) return;

    console.log(`[mediaSyncService] Syncing ${pending.length} pending media records...`);

    for (const record of pending) {
      if (!record.blob || record.blob.size === 0) {
        // No blob data — mark as failed
        await mediaService.markFailed(record.id);
        continue;
      }

      const dirSegment = record.directiveId || 'general';
      const path = `${record.shopId}/${record.roId}/${dirSegment}/${record.fileName}`;

      let uploaded = false;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, record.blob, {
            contentType: record.mimeType,
            upsert: true,
          });

        if (!error) {
          // Get the public URL
          const { data: urlData } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(path);

          if (urlData?.publicUrl) {
            await mediaService.markSynced(record.id, urlData.publicUrl);
            console.log(`[mediaSyncService] Synced: ${record.type} → ${path}`);
            uploaded = true;
            break;
          }
        }

        console.warn(`[mediaSyncService] Upload attempt ${attempt}/${MAX_RETRIES} failed for ${record.id}:`, error?.message);
      }

      if (!uploaded) {
        await mediaService.markFailed(record.id);
        console.error(`[mediaSyncService] Failed after ${MAX_RETRIES} attempts: ${record.id}`);
      }
    }
  } catch (err) {
    console.warn('[mediaSyncService] syncPendingMedia error:', err);
  } finally {
    isSyncing = false;
  }
}
