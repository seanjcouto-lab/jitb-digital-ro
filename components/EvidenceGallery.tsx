import React, { useState, useEffect } from 'react';
import { RepairOrder, MediaRecord } from '../types';
import { mediaService } from '../services/mediaService';
import { useMediaUrl } from '../hooks/useMediaUrl';
import { Camera, Video, Mic, X } from 'lucide-react';

interface EvidenceGalleryProps {
  roId: string;
  directiveId?: string | null;
  repairOrder?: RepairOrder;
  compact?: boolean; // true = count badge only, false = thumbnail grid
}

/** Format timestamp as "Apr 4, 2:30 PM" */
function formatEvidenceTime(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
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
  record: MediaRecord;
  label: string;
  onClick: () => void;
}> = ({ record, label, onClick }) => {
  const resolvedUrl = useMediaUrl(record.supabaseUrl || `media://${record.id}`);

  return (
    <div
      onClick={onClick}
      className="relative group cursor-pointer rounded-lg overflow-hidden border border-white/10 hover:border-teal-400/50 transition-all"
    >
      {record.type === 'photo' && resolvedUrl ? (
        <img src={resolvedUrl} alt={label} className="w-full h-16 object-cover" />
      ) : record.type === 'video' ? (
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
  record: MediaRecord;
  label: string;
  onClose: () => void;
}> = ({ record, label, onClose }) => {
  const resolvedUrl = useMediaUrl(record.supabaseUrl || `media://${record.id}`);

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TypeIcon type={record.type} size={16} />
            <span className="text-sm font-bold text-white">{label}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center bg-slate-900 rounded-xl overflow-hidden border border-white/10">
          {record.type === 'photo' && resolvedUrl ? (
            <img src={resolvedUrl} alt={label} className="max-w-full max-h-[80vh] object-contain" />
          ) : record.type === 'video' && resolvedUrl ? (
            <video src={resolvedUrl} controls autoPlay className="max-w-full max-h-[80vh]" />
          ) : record.type === 'audio' && resolvedUrl ? (
            <audio src={resolvedUrl} controls autoPlay className="w-full p-8" />
          ) : (
            <p className="text-slate-500 p-8">Loading media...</p>
          )}
        </div>
      </div>
    </div>
  );
};

/** Main EvidenceGallery component */
const EvidenceGallery: React.FC<EvidenceGalleryProps> = ({
  roId,
  directiveId,
  repairOrder,
  compact = false,
}) => {
  const [records, setRecords] = useState<MediaRecord[]>([]);
  const [lightboxRecord, setLightboxRecord] = useState<MediaRecord | null>(null);

  useEffect(() => {
    const load = async () => {
      const media = directiveId
        ? await mediaService.getMediaForDirective(roId, directiveId)
        : await mediaService.getMediaForRO(roId);
      setRecords(media.sort((a, b) => a.createdAt - b.createdAt));
    };
    load();
  }, [roId, directiveId]);

  if (records.length === 0) return null;

  // Compact mode: just a count badge
  if (compact) {
    const photos = records.filter(r => r.type === 'photo').length;
    const videos = records.filter(r => r.type === 'video').length;
    const audios = records.filter(r => r.type === 'audio').length;
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
  const getLabel = (record: MediaRecord) => {
    const directive = getDirectiveTitle(repairOrder, record.directiveId);
    const time = formatEvidenceTime(record.createdAt);
    return `${record.type.charAt(0).toUpperCase() + record.type.slice(1)} \u2022 ${directive} \u2022 ${time}`;
  };

  return (
    <>
      <div className="mt-2">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Camera size={11} className="text-teal-400" />
          <span className="text-[9px] font-bold text-teal-400 uppercase tracking-widest">Evidence ({records.length})</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {records.map(record => (
            <EvidenceThumbnail
              key={record.id}
              record={record}
              label={getLabel(record)}
              onClick={() => setLightboxRecord(record)}
            />
          ))}
        </div>
      </div>
      {lightboxRecord && (
        <EvidenceLightbox
          record={lightboxRecord}
          label={getLabel(lightboxRecord)}
          onClose={() => setLightboxRecord(null)}
        />
      )}
    </>
  );
};

/** Summary line for print templates — no thumbnails, just counts */
export function getEvidenceSummaryText(records: MediaRecord[]): string {
  if (records.length === 0) return '';
  const photos = records.filter(r => r.type === 'photo').length;
  const videos = records.filter(r => r.type === 'video').length;
  const audios = records.filter(r => r.type === 'audio').length;
  const parts: string[] = [];
  if (photos) parts.push(`${photos} photo${photos > 1 ? 's' : ''}`);
  if (videos) parts.push(`${videos} video${videos > 1 ? 's' : ''}`);
  if (audios) parts.push(`${audios} audio recording${audios > 1 ? 's' : ''}`);
  return `Evidence: ${parts.join(', ')}`;
}

export default EvidenceGallery;
