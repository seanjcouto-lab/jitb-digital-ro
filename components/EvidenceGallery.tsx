import React, { useState, useMemo } from 'react';
import { RepairOrder } from '../types';
import { useMediaUrl } from '../hooks/useMediaUrl';
import { Camera, Video, Mic, X } from 'lucide-react';

interface EvidenceItem {
  id: string;
  type: 'photo' | 'video' | 'audio';
  url: string;
  directiveId: string | null;
}

interface EvidenceGalleryProps {
  roId: string;
  directiveId?: string | null;
  repairOrder?: RepairOrder;
  compact?: boolean; // true = count badge only, false = thumbnail grid
}

/** Resolve directive title from RO by directiveId */
function getDirectiveTitle(ro: RepairOrder | undefined, directiveId: string | null): string {
  if (!directiveId || !ro) return 'General';
  const directive = ro.directives?.find(d => d.id === directiveId);
  return directive?.title || 'Directive';
}

/** Type icon component */
function TypeIcon({ type, size = 14 }: { type: string; size?: number }) {
  if (type === 'photo') return <Camera size={size} />;
  if (type === 'video') return <Video size={size} />;
  return <Mic size={size} />;
}

/** Single evidence thumbnail with resolved URL */
const EvidenceThumbnail: React.FC<{
  item: EvidenceItem;
  label: string;
  onClick: () => void;
}> = ({ item, label, onClick }) => {
  const resolvedUrl = useMediaUrl(item.url);

  return (
    <div
      onClick={onClick}
      className="relative group cursor-pointer rounded-lg overflow-hidden border border-white/10 hover:border-teal-400/50 transition-all"
    >
      {item.type === 'photo' && resolvedUrl ? (
        <img src={resolvedUrl} alt={label} className="w-full h-16 object-cover" />
      ) : item.type === 'video' ? (
        <div className="w-full h-16 bg-slate-800 flex items-center justify-center">
          <Video size={20} className="text-blue-400" />
        </div>
      ) : (
        <div className="w-full h-16 bg-slate-800 flex items-center justify-center">
          <Mic size={20} className="text-amber-400" />
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
        <span className="opacity-0 group-hover:opacity-100 text-white text-[9px] font-bold uppercase tracking-wider transition-opacity">View</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5">
        <span className="text-[8px] text-slate-300 truncate block">{label}</span>
      </div>
    </div>
  );
};

/** Lightbox modal for full-size evidence viewing */
const EvidenceLightbox: React.FC<{
  item: EvidenceItem;
  label: string;
  onClose: () => void;
}> = ({ item, label, onClose }) => {
  const resolvedUrl = useMediaUrl(item.url);

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TypeIcon type={item.type} size={16} />
            <span className="text-sm font-bold text-white">{label}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center bg-slate-900 rounded-xl overflow-hidden border border-white/10">
          {item.type === 'photo' && resolvedUrl ? (
            <img src={resolvedUrl} alt={label} className="max-w-full max-h-[80vh] object-contain" />
          ) : item.type === 'video' && resolvedUrl ? (
            <video src={resolvedUrl} controls autoPlay className="max-w-full max-h-[80vh]" />
          ) : item.type === 'audio' && resolvedUrl ? (
            <audio src={resolvedUrl} controls autoPlay className="w-full p-8" />
          ) : (
            <p className="text-slate-500 p-8">Loading media...</p>
          )}
        </div>
      </div>
    </div>
  );
};

/** Main EvidenceGallery component — reads evidence from directive/RO data, not separate mediaStore */
const EvidenceGallery: React.FC<EvidenceGalleryProps> = ({
  roId,
  directiveId,
  repairOrder,
  compact = false,
}) => {
  const [lightboxItem, setLightboxItem] = useState<EvidenceItem | null>(null);

  // Derive evidence items from the RO data — no async mediaStore query
  const items: EvidenceItem[] = useMemo(() => {
    if (!repairOrder) return [];

    if (directiveId) {
      // Single directive's evidence
      const directive = repairOrder.directives?.find(d => d.id === directiveId);
      return (directive?.evidence ?? []).map((e, i) => ({
        id: `${directiveId}-${i}`,
        type: e.type,
        url: e.url,
        directiveId,
      }));
    }

    // All evidence for the RO: directive evidence + RO-level evidence
    const all: EvidenceItem[] = [];
    (repairOrder.directives ?? []).forEach(d => {
      (d.evidence ?? []).forEach((e, i) => {
        all.push({ id: `${d.id}-${i}`, type: e.type, url: e.url, directiveId: d.id });
      });
    });
    (repairOrder.evidence ?? []).forEach((e, i) => {
      all.push({ id: `ro-${i}`, type: e.type, url: e.url, directiveId: null });
    });
    return all;
  }, [repairOrder, directiveId]);

  if (items.length === 0) return null;

  // Compact mode: just a count badge
  if (compact) {
    const photos = items.filter(r => r.type === 'photo').length;
    const videos = items.filter(r => r.type === 'video').length;
    const audios = items.filter(r => r.type === 'audio').length;
    const parts: string[] = [];
    if (photos) parts.push(`${photos} photo${photos > 1 ? 's' : ''}`);
    if (videos) parts.push(`${videos} video${videos > 1 ? 's' : ''}`);
    if (audios) parts.push(`${audios} audio`);

    return (
      <span className="inline-flex items-center gap-1 text-[9px] text-teal-400 font-bold">
        <Camera size={10} /> {parts.join(', ')}
      </span>
    );
  }

  // Full gallery mode
  const getLabel = (item: EvidenceItem) => {
    const directive = getDirectiveTitle(repairOrder, item.directiveId);
    return `${item.type.charAt(0).toUpperCase() + item.type.slice(1)} \u2022 ${directive}`;
  };

  return (
    <>
      <div className="mt-2">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Camera size={11} className="text-teal-400" />
          <span className="text-[9px] font-bold text-teal-400 uppercase tracking-widest">Evidence ({items.length})</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {items.map(item => (
            <EvidenceThumbnail
              key={item.id}
              item={item}
              label={getLabel(item)}
              onClick={() => setLightboxItem(item)}
            />
          ))}
        </div>
      </div>
      {lightboxItem && (
        <EvidenceLightbox
          item={lightboxItem}
          label={getLabel(lightboxItem)}
          onClose={() => setLightboxItem(null)}
        />
      )}
    </>
  );
};

/** Summary line for print templates — no thumbnails, just counts */
export function getEvidenceSummaryText(items: { type: string }[]): string {
  if (items.length === 0) return '';
  const photos = items.filter(r => r.type === 'photo').length;
  const videos = items.filter(r => r.type === 'video').length;
  const audios = items.filter(r => r.type === 'audio').length;
  const parts: string[] = [];
  if (photos) parts.push(`${photos} photo${photos > 1 ? 's' : ''}`);
  if (videos) parts.push(`${videos} video${videos > 1 ? 's' : ''}`);
  if (audios) parts.push(`${audios} audio recording${audios > 1 ? 's' : ''}`);
  return `Evidence: ${parts.join(', ')}`;
}

export default EvidenceGallery;
