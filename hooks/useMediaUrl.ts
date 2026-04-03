import { useState, useEffect, useRef } from 'react';
import { mediaService } from '../services/mediaService';

/**
 * React hook that resolves a media:// URL to a renderable URL.
 *
 * - `media://{id}` → looks up in Dexie mediaStore → returns blob URL or Supabase URL
 * - `https://...` → passthrough (already a permanent URL)
 * - `blob:...` → passthrough (legacy, will break on reload)
 * - null/undefined → returns null
 *
 * Automatically revokes created blob URLs on unmount or URL change.
 */
export function useMediaUrl(url: string | null | undefined): string | null {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Revoke previous blob URL if we created one
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    if (!url) {
      setResolvedUrl(null);
      return;
    }

    // Already a permanent or legacy URL — passthrough
    if (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('blob:')) {
      setResolvedUrl(url);
      return;
    }

    // media:// protocol — resolve from Dexie
    const mediaId = mediaService.parseMediaUrl(url);
    if (mediaId) {
      mediaService.getMediaUrl(mediaId).then(resolved => {
        if (cancelled) return;
        if (resolved && resolved.startsWith('blob:')) {
          blobUrlRef.current = resolved; // Track for cleanup
        }
        setResolvedUrl(resolved);
      });
    } else {
      setResolvedUrl(url);
    }

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [url]);

  return resolvedUrl;
}

/**
 * Resolve multiple media URLs at once. Useful for evidence galleries.
 */
export function useMediaUrls(urls: (string | null | undefined)[]): (string | null)[] {
  const [resolvedUrls, setResolvedUrls] = useState<(string | null)[]>(urls.map(() => null));
  const blobUrlsRef = useRef<(string | null)[]>([]);

  useEffect(() => {
    let cancelled = false;

    // Revoke old blob URLs
    blobUrlsRef.current.forEach(u => { if (u) URL.revokeObjectURL(u); });
    blobUrlsRef.current = [];

    Promise.all(
      urls.map(async (url) => {
        if (!url) return null;
        if (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('blob:')) return url;

        const mediaId = mediaService.parseMediaUrl(url);
        if (mediaId) return mediaService.getMediaUrl(mediaId);
        return url;
      })
    ).then(results => {
      if (cancelled) return;
      // Track blob URLs for cleanup
      blobUrlsRef.current = results.map(r => (r && r.startsWith('blob:')) ? r : null);
      setResolvedUrls(results);
    });

    return () => {
      cancelled = true;
      blobUrlsRef.current.forEach(u => { if (u) URL.revokeObjectURL(u); });
      blobUrlsRef.current = [];
    };
  }, [JSON.stringify(urls)]);

  return resolvedUrls;
}
