import { supabase } from '../supabaseClient';
import { mediaService } from './mediaService';
import { syncMediaRecordToSupabase } from '../utils/supabaseSync';

const BUCKET = 'evidence';
const MAX_RETRIES = 3;

let isSyncing = false;
let hasBackfilled = false;

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
            // Replace media:// URL on directive/RO with permanent URL
            await replaceMediaUrlOnDirective(record, urlData.publicUrl);
            // Also push to directive_evidence for backward compat
            const synced = await mediaService.getMedia(record.id);
            if (synced) {
              syncMediaRecordToSupabase(synced).catch(err =>
                console.warn('[mediaSyncService] Metadata sync failed:', err)
              );
            }
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

/**
 * After blob upload, replace the media:// URL on the directive (or RO-level evidence)
 * with the permanent Supabase Storage URL. This makes evidence travel with the RO
 * through the existing sync pipeline — no separate discovery needed.
 */
async function replaceMediaUrlOnDirective(record: { id: string; roId: string; directiveId: string | null }, permanentUrl: string): Promise<void> {
  try {
    const { db } = await import('../localDb');
    const ro = await db.repairOrders.get(record.roId);
    if (!ro) return;

    const mediaRef = `media://${record.id}`;
    let changed = false;

    if (record.directiveId) {
      // Replace on specific directive
      const updatedDirectives = ro.directives?.map(d => {
        if (d.id === record.directiveId && d.evidence) {
          const updatedEvidence = d.evidence.map(e =>
            e.url === mediaRef ? { ...e, url: permanentUrl } : e
          );
          if (JSON.stringify(updatedEvidence) !== JSON.stringify(d.evidence)) {
            changed = true;
            return { ...d, evidence: updatedEvidence };
          }
        }
        return d;
      });
      if (changed) ro.directives = updatedDirectives!;
    } else {
      // Replace on RO-level evidence
      if (ro.evidence) {
        const updatedEvidence = ro.evidence.map(e =>
          e.url === mediaRef ? { ...e, url: permanentUrl } : e
        );
        if (JSON.stringify(updatedEvidence) !== JSON.stringify(ro.evidence)) {
          changed = true;
          ro.evidence = updatedEvidence;
        }
      }
    }

    if (changed) {
      ro.updatedAt = Date.now();
      await db.repairOrders.put(ro);
      // Fire-and-forget sync — permanent URL now travels with the RO
      const { syncROToSupabase } = await import('../utils/supabaseSync');
      syncROToSupabase(ro).catch(() => {});
      console.log(`[mediaSyncService] Replaced media:// URL on directive for ${record.id}`);
    }
  } catch (err) {
    console.warn('[mediaSyncService] replaceMediaUrlOnDirective error:', err);
  }
}

/**
 * One-time backfill: push metadata to directive_evidence for any locally synced
 * records that were uploaded to Storage before the metadata sync code existed.
 * Idempotent (upsert) — safe to call on every init.
 */
export async function backfillMediaMetadata(): Promise<void> {
  if (hasBackfilled) return;
  hasBackfilled = true;

  try {
    const { db } = await import('../localDb');
    const synced = await db.mediaStore.where('syncStatus').equals('synced').toArray();
    const withUrl = synced.filter(r => r.supabaseUrl);
    if (withUrl.length === 0) return;

    console.log(`[mediaSyncService] Backfilling ${withUrl.length} media metadata records...`);
    let pushed = 0;
    for (const record of withUrl) {
      try {
        await syncMediaRecordToSupabase(record);
        pushed++;
      } catch (err) {
        console.warn(`[mediaSyncService] Backfill failed for ${record.id}:`, err);
      }
    }
    if (pushed > 0) {
      console.log(`[mediaSyncService] Backfilled ${pushed} media metadata records to directive_evidence`);
    }
  } catch (err) {
    console.warn('[mediaSyncService] backfillMediaMetadata error:', err);
  }
}
