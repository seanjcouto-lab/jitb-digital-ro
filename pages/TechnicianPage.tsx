import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RepairOrder, ROStatus, PartStatus, Directive, Part, RORequest, InventoryAlert } from '../types';
import { TechnicianService } from '../services/technicianService';
import SectionHeader from '../components/SectionHeader';
import EvidenceInputBlock from '../components/EvidenceInputBlock';

interface TechnicianPageProps {
  repairOrder?: RepairOrder;
  haltedROs?: RepairOrder[];
  updateRO: (ro: RepairOrder) => void;
  masterInventory: Part[];
  addInventoryAlert: (alert: Omit<InventoryAlert, 'id' | 'timestamp'>) => void;
}

type EvidenceModalMode = 'photo' | 'video' | 'audio';

// ─── HaltJobModal ─────────────────────────────────────────────────────────────

interface HaltJobModalProps {
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

const HaltJobModal: React.FC<HaltJobModalProps> = ({ onClose, onConfirm }) => {
  const [haltReason, setHaltReason] = useState('');
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="glass p-8 rounded-2xl w-full max-w-lg border border-orange-500 shadow-2xl shadow-orange-500/20">
        <h3 className="text-lg font-black uppercase tracking-widest text-orange-400 mb-4">Halt Job Protocol</h3>
        <p className="text-sm text-slate-300 mb-6">Explain why this job cannot proceed. This will stop the clock and notify the Service Manager.</p>
        <textarea value={haltReason} onChange={e => setHaltReason(e.target.value)} placeholder="e.g., Waiting on special tool, discovered new issue requiring authorization..." autoFocus className="w-full h-32 bg-slate-900 border border-white/10 rounded-lg p-4 text-white text-base focus:border-orange-500 outline-none transition-colors" />
        <div className="flex justify-between items-center mt-6">
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-white">Cancel</button>
          <button onClick={() => onConfirm(haltReason)} disabled={!haltReason.trim()} className="px-6 py-3 bg-orange-500 text-white font-bold rounded-lg hover:scale-105 disabled:opacity-50 disabled:grayscale">Confirm Halt</button>
        </div>
      </div>
    </div>
  );
};

// ─── MissingPartModal ─────────────────────────────────────────────────────────

interface MissingPartModalProps {
  partDescription: string;
  onClose: () => void;
  onConfirm: (reason: string, notes: string) => void;
}

const MissingPartModal: React.FC<MissingPartModalProps> = ({ partDescription, onClose, onConfirm }) => {
  const [missingReason, setMissingReason] = useState('Discrepancy');
  const [missingNotes, setMissingNotes] = useState('');
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="glass p-8 rounded-2xl w-full max-w-lg border border-red-500 shadow-2xl shadow-red-500/20">
        <h3 className="text-lg font-black uppercase tracking-widest text-red-400 mb-4">Report Missing Part</h3>
        <p className="text-sm text-slate-300 mb-6">You are reporting that <span className="text-white font-bold">{partDescription}</span> is missing from the bay. This will notify the Parts Manager.</p>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Reason</label>
            <select value={missingReason} onChange={e => setMissingReason(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:border-red-500 outline-none">
              <option value="Discrepancy">Inventory Discrepancy</option>
              <option value="Damaged">Received Damaged</option>
              <option value="Wrong Part">Wrong Part in Box</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Additional Notes</label>
            <textarea value={missingNotes} onChange={e => setMissingNotes(e.target.value)} placeholder="Provide more details..." className="w-full h-24 bg-slate-900 border border-white/10 rounded-lg p-4 text-white text-sm focus:border-red-500 outline-none transition-colors" />
          </div>
        </div>
        <div className="flex justify-between items-center mt-8">
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-white">Cancel</button>
          <button onClick={() => onConfirm(missingReason, missingNotes)} className="px-8 py-3 bg-red-500 text-white font-black rounded-lg hover:bg-red-600 transition-all uppercase tracking-widest text-xs">Report Missing</button>
        </div>
      </div>
    </div>
  );
};

// ─── NotUsedModal ─────────────────────────────────────────────────────────────

interface NotUsedModalProps {
  partDescription: string;
  onClose: () => void;
  onConfirm: (reason: string, notes: string) => void;
}

const NotUsedModal: React.FC<NotUsedModalProps> = ({ partDescription, onClose, onConfirm }) => {
  const [notUsedReason, setNotUsedReason] = useState('Not Needed');
  const [notUsedNotes, setNotUsedNotes] = useState('');
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="glass p-8 rounded-2xl w-full max-w-lg border border-orange-500 shadow-2xl shadow-orange-500/20">
        <h3 className="text-lg font-black uppercase tracking-widest text-orange-400 mb-4">Mark Part as Not Used</h3>
        <p className="text-sm text-slate-300 mb-6">You are reporting that <span className="text-white font-bold">{partDescription}</span> was not used for this job. It will be returned to the Parts Manager for stock reconciliation.</p>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Reason</label>
            <select value={notUsedReason} onChange={e => setNotUsedReason(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:border-orange-500 outline-none">
              <option value="Not Needed">Not Needed for Repair</option>
              <option value="Customer Declined">Customer Declined Item</option>
              <option value="Wrong Part">Wrong Part Ordered</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Additional Notes</label>
            <textarea value={notUsedNotes} onChange={e => setNotUsedNotes(e.target.value)} placeholder="Provide more details..." className="w-full h-24 bg-slate-900 border border-white/10 rounded-lg p-4 text-white text-sm focus:border-orange-500 outline-none transition-colors" />
          </div>
        </div>
        <div className="flex justify-between items-center mt-8">
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-white">Cancel</button>
          <button onClick={() => onConfirm(notUsedReason, notUsedNotes)} className="px-8 py-3 bg-orange-500 text-white font-black rounded-lg hover:bg-orange-600 transition-all uppercase tracking-widest text-xs">Confirm Not Used</button>
        </div>
      </div>
    </div>
  );
};

// ─── EvidenceModal ────────────────────────────────────────────────────────────

interface EvidenceModalProps {
  directiveId: string | null;
  mode: EvidenceModalMode;
  initialMediaUrl: string | null;
  onClose: () => void;
  onSave: (capturedMediaUrl: string) => void;
}

const EvidenceModal: React.FC<EvidenceModalProps> = ({ mode, initialMediaUrl, onClose, onSave }) => {
  const [capturedMediaUrl, setCapturedMediaUrl] = useState<string | null>(initialMediaUrl);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const capturedUrlRef = useRef<string | null>(initialMediaUrl);
  const urlSavedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (!urlSavedRef.current && capturedUrlRef.current) {
        URL.revokeObjectURL(capturedUrlRef.current);
      }
    };
  }, []);

  const updateCapturedUrl = (url: string | null) => {
    capturedUrlRef.current = url;
    setCapturedMediaUrl(url);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      recordedChunks.current = [];
      recorder.ondataavailable = event => {
        if (event.data.size > 0) recordedChunks.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        updateCapturedUrl(url);
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      };
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Microphone access denied. Please check browser permissions.");
      handleClose();
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
  };

  const handleClose = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.onstop = null; // prevent URL creation on cancel
      mediaRecorder.stop();
    }
    if (mediaRecorder?.stream) {
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    onClose();
  };

  const handleSave = () => {
    if (!capturedMediaUrl) return;
    urlSavedRef.current = true;
    onSave(capturedMediaUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="glass p-6 rounded-2xl w-full max-w-2xl border-2 border-neon-seafoam shadow-2xl shadow-neon-seafoam/20">
        <h3 className="text-lg font-black uppercase tracking-widest text-neon-seafoam mb-4">{mode === 'audio' ? 'Voice Record Command' : `Confirm ${mode} Upload`}</h3>
        {mode === 'audio' && !capturedMediaUrl && (<div className="flex flex-col items-center justify-center p-8 space-y-4"><div className="relative h-20 w-20">{isRecording && <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>}<div className={`h-20 w-20 rounded-full flex items-center justify-center border-4 ${isRecording ? 'bg-red-500/20 border-red-500' : 'bg-slate-700 border-slate-600'}`}><svg className={`w-10 h-10 ${isRecording ? 'text-red-500' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" /></svg></div></div><p className="text-slate-400 text-sm font-bold uppercase tracking-widest">{isRecording ? "RECORDING HUD ACTIVE" : "MICROPHONE STANDBY"}</p><button onClick={isRecording ? stopRecording : startRecording} className={`px-10 py-4 rounded-xl font-black text-white transition-all text-xs uppercase tracking-widest ${isRecording ? 'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'bg-slate-800 hover:bg-slate-700'}`}>{isRecording ? 'Stop Recording' : 'Engage Recording'}</button></div>)}
        {capturedMediaUrl && (<div className="aspect-video bg-slate-950 rounded-xl overflow-hidden mb-6 border border-white/10 flex items-center justify-center shadow-inner">{mode === 'photo' ? ( <img src={capturedMediaUrl} alt="Preview" className="max-w-full max-h-full object-contain" /> ) : mode === 'video' ? ( <video src={capturedMediaUrl} controls autoPlay className="w-full h-full" /> ) : mode === 'audio' ? ( <audio src={capturedMediaUrl} controls autoPlay className="w-full p-8" /> ) : null }</div>)}
        <div className="flex justify-between items-center mt-4"><button onClick={handleClose} className="text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-white transition-all">Abort Action</button><button onClick={handleSave} disabled={!capturedMediaUrl} className="px-10 py-4 bg-neon-seafoam text-slate-900 font-black rounded-xl transition-all disabled:opacity-30 uppercase text-xs tracking-widest hover:scale-105 active:scale-95 shadow-xl shadow-neon-seafoam/20">Commit to Record</button></div>
      </div>
    </div>
  );
};

// ─── TechnicianPage ───────────────────────────────────────────────────────────

const TechnicianPage: React.FC<TechnicianPageProps> = ({ repairOrder, haltedROs = [], updateRO, masterInventory, addInventoryAlert }) => {
  const [laborNote, setLaborNote] = useState(repairOrder?.laborDescription ?? '');
  const [newDirectiveRequest, setNewDirectiveRequest] = useState('');
  const [newPartRequestQuery, setNewPartRequestQuery] = useState('');

  // Evidence modal trigger — directiveId, mode, and initialMediaUrl for photo/video uploads
  const [evidenceModal, setEvidenceModal] = useState<{ directiveId: string | null; mode: EvidenceModalMode; initialMediaUrl: string | null } | null>(null);
  const [currentDirectiveIdForUpload, setCurrentDirectiveIdForUpload] = useState<string | null>(null);

  // Modal open triggers — form state lives inside each modal component
  const [isHaltModalOpen, setIsHaltModalOpen] = useState(false);
  const [missingPartIndex, setMissingPartIndex] = useState<number | null>(null);
  const [notUsedPartIndex, setNotUsedPartIndex] = useState<number | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const partSearchResults = useMemo(() => {
    if (newPartRequestQuery.length < 2) return [];
    const q = newPartRequestQuery.toLowerCase();
    const existingPartNumbers = repairOrder?.parts.map(p => p.partNumber) || [];
    return masterInventory.filter(part =>
        !existingPartNumbers.includes(part.partNumber) &&
        (part.partNumber.toLowerCase().includes(q) || part.description.toLowerCase().includes(q))
    ).slice(0, 3);
  }, [newPartRequestQuery, repairOrder?.parts, masterInventory]);

  const [elapsedTime, setElapsedTime] = useState(TechnicianService.calculateElapsedTime(repairOrder));

  useEffect(() => {
    setElapsedTime(TechnicianService.calculateElapsedTime(repairOrder));
    let interval: any;
    if (repairOrder?.status === ROStatus.ACTIVE) {
      interval = setInterval(() => {
        setElapsedTime(TechnicianService.calculateElapsedTime(repairOrder));
      }, 1000);
    }
    return () => {
      clearInterval(interval);
    };
  }, [repairOrder]);

  const handleUploadEvidence = (directiveId: string | null, mode: 'photo' | 'video') => {
    setCurrentDirectiveIdForUpload(directiveId);
    if (mode === 'photo') photoInputRef.current?.click();
    else if (mode === 'video') videoInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, mode: EvidenceModalMode) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setEvidenceModal({ directiveId: currentDirectiveIdForUpload, mode, initialMediaUrl: url });
    }
    if (event.target) event.target.value = '';
  };

  const handleOpenAudioRecorder = (directiveId: string | null) => {
    setCurrentDirectiveIdForUpload(directiveId);
    setEvidenceModal({ directiveId, mode: 'audio', initialMediaUrl: null });
  };

  const handleCloseEvidenceModal = () => {
    setEvidenceModal(null);
    setCurrentDirectiveIdForUpload(null);
  };

  const handleSaveEvidence = (capturedMediaUrl: string) => {
    if (!repairOrder || !evidenceModal) return;
    const result = TechnicianService.saveEvidence(repairOrder, evidenceModal, capturedMediaUrl);
    if (result.laborNoteUpdate) {
      setLaborNote(prev => prev + result.laborNoteUpdate);
    }
    if (result.updatedRO) {
      updateRO(result.updatedRO);
    }
  };

  const handleDirectiveComplete = async (directive: Directive) => {
    if (!repairOrder) return;
    const updatedRO = TechnicianService.completeDirective(repairOrder, directive);
    await updateRO(updatedRO);
  };

  const handleRequestDirective = () => {
    if (!repairOrder || newDirectiveRequest.trim() === '') return;
    const updatedRO = TechnicianService.requestDirective(repairOrder, newDirectiveRequest);
    updateRO(updatedRO);
    setNewDirectiveRequest('');
  };

  const handleRequestPart = async (part: Part) => {
    if (!repairOrder) return;
    const updatedRO = await TechnicianService.requestPart(repairOrder, part);
    updateRO(updatedRO);
    setNewPartRequestQuery('');
  };

  const handleRequestCustomPart = async () => {
    if (!repairOrder || newPartRequestQuery.trim() === '') return;
    const updatedRO = await TechnicianService.requestCustomPart(repairOrder, newPartRequestQuery);
    updateRO(updatedRO);
    setNewPartRequestQuery('');
  };

  const handlePartRequestButtonClick = async () => {
    if (newPartRequestQuery.trim() === '') return;
    const exactMatch = masterInventory.find(p => p.partNumber.toLowerCase() === newPartRequestQuery.toLowerCase().trim());
    if (exactMatch) await handleRequestPart(exactMatch);
    else await handleRequestCustomPart();
  };

  const handlePartStatusUpdate = async (partIndex: number, newStatus: PartStatus) => {
    if (!repairOrder) return;
    const updatedRO = await TechnicianService.updatePartStatus(repairOrder, partIndex, newStatus, masterInventory);
    updateRO(updatedRO);
  };

  const handleInputFocus = (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTimeout(() => {
        event.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  if (!repairOrder) {
    return (
      <div className="space-y-6 animate-in zoom-in duration-500">
        <div className="glass p-20 text-center rounded-2xl">
          <p className="text-slate-500 uppercase tracking-widest text-sm font-bold">No Active Job. See Service Manager.</p>
        </div>
        {haltedROs.length > 0 && (
          <div className="glass p-6 rounded-2xl border-orange-500/30">
            <h3 className="text-lg font-black uppercase tracking-widest text-orange-400 mb-4">My Halted Jobs</h3>
            <div className="space-y-3">
              {haltedROs.length === 0 && <p className="text-slate-600 italic text-sm text-center py-4 font-medium">No halted jobs.</p>}
              {haltedROs.map(ro => (
                <div key={ro.id} className="flex justify-between items-center p-4 bg-slate-900/50 rounded-xl border border-orange-500/20">
                  <div>
                    <p className="font-bold text-slate-200">{ro.customerName}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">{ro.vesselName} • {ro.id}</p>
                  </div>
                  <button
                    onClick={() => {
                      const newSession = { startTime: Date.now() };
                      updateRO({ ...ro, status: ROStatus.ACTIVE, workSessions: [...ro.workSessions, newSession] });
                    }}
                    className="px-6 py-2 bg-neon-seafoam text-slate-900 font-black rounded-lg text-xs uppercase hover:scale-105 transition-all"
                  >
                    Resume
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const hasPendingPartDecisions = repairOrder.parts.some(p => p.status === PartStatus.APPROVAL_PENDING || p.status === PartStatus.REQUESTED);
  const isFinalizable = laborNote.length > 10 && !hasPendingPartDecisions;

  const handleFinalize = async () => {
    if (!repairOrder) return;
    const updatedRO = await TechnicianService.finalizeJob(repairOrder, laborNote);
    updateRO(updatedRO);
  };

  const handleConfirmHalt = (reason: string) => {
    if (!repairOrder) return;
    const updatedRO = TechnicianService.haltJob(repairOrder, reason);
    updateRO(updatedRO);
    setIsHaltModalOpen(false);
  };

  const handleConfirmMissing = (reason: string, notes: string) => {
    if (!repairOrder || missingPartIndex === null) return;
    const { updatedRO, alert } = TechnicianService.reportMissingPart(repairOrder, missingPartIndex, reason, notes);
    updateRO(updatedRO);
    addInventoryAlert(alert);
    setMissingPartIndex(null);
  };

  const handleConfirmNotUsed = async (reason: string, notes: string) => {
    if (!repairOrder || notUsedPartIndex === null) return;
    const updatedRO = await TechnicianService.reportNotUsed(repairOrder, notUsedPartIndex, reason, notes, masterInventory);
    updateRO(updatedRO);
    setNotUsedPartIndex(null);
  };

  const handleStartJob = () => {
    if (!repairOrder) return;
    const updatedRO = TechnicianService.startJob(repairOrder);
    updateRO(updatedRO);
  };

  return (
    <>
      <input type="file" accept="image/*" ref={photoInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'photo')} />
      <input type="file" accept="video/*" ref={videoInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'video')} />

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-between items-center bg-slate-900/80 p-6 rounded-2xl border border-white/5">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Active Bay Deck</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Order: {repairOrder.id} • {repairOrder.customerName} • {repairOrder.vesselName}</p>
          </div>
          <div className="flex items-center gap-6">
            {repairOrder.status !== ROStatus.ACTIVE && (
              <button
                onClick={handleStartJob}
                className="px-6 py-3 bg-neon-seafoam text-slate-900 font-black rounded-xl hover:scale-105 transition-all uppercase tracking-widest text-xs shadow-lg shadow-neon-seafoam/20"
              >
                Start Job Clock
              </button>
            )}
            {repairOrder.status === ROStatus.ACTIVE && (
              <div className="text-right">
                <span className="text-[10px] font-black text-slate-500 uppercase block">Active Labor Clock</span>
                <span className="text-3xl font-mono neon-seafoam font-bold">{formatTime(elapsedTime)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <section className="glass p-6 rounded-2xl border-white/5">
              <SectionHeader title="Service Directives" />
              {repairOrder.directives.map((directive, idx) => {
                const isWorkflowLocked = repairOrder.status !== ROStatus.ACTIVE;
                const isPendingApproval = directive.isApproved === false;

                if (isPendingApproval) {
                  return (
                    <div key={directive.id} className="p-4 rounded-xl border border-orange-500/20 bg-slate-900/40 mb-4 last:mb-0 opacity-50 cursor-not-allowed">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Task {String(idx + 1).padStart(2, '0')}</span>
                          <h3 className="text-lg font-bold text-slate-400">{directive.title}</h3>
                        </div>
                        <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase border border-orange-500/30 bg-orange-500/10 text-orange-400 animate-pulse">PENDING APPROVAL</div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={directive.id} className={`p-4 rounded-xl border transition-all mb-4 last:mb-0 bg-slate-900/40 ${directive.isCompleted ? 'border-neon-seafoam/20 opacity-60' : 'border-white/5'} ${isWorkflowLocked ? 'grayscale opacity-30 cursor-not-allowed' : ''}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Task {String(idx + 1).padStart(2, '0')}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-200">{directive.title}</h3>
                      </div>

                      {directive.isCompleted ? (
                        <div className="text-neon-seafoam bg-neon-seafoam/10 border border-neon-seafoam/20 px-3 py-1 rounded-full text-[10px] font-black">COMPLETED</div>
                      ) : (
                       <button
                            disabled={isWorkflowLocked}
                            onClick={() => handleDirectiveComplete(directive)}
                            className={`px-8 py-3 rounded-lg font-black text-xs uppercase tracking-widest shadow-xl transition-all ${isWorkflowLocked ? 'bg-slate-800 text-slate-500' : 'bg-neon-seafoam text-slate-900 hover:scale-105 active:scale-95'}`}
                        >
                          {isWorkflowLocked ? 'Locked' : 'Complete Task'}
                        </button>
                      )}
                    </div>

                    {!isWorkflowLocked && (
                        <div className="mt-4 pt-4 border-t border-white/5">
                            <div className="flex justify-between items-center">
                                <div className="flex gap-2">
                                    <button onClick={() => handleUploadEvidence(directive.id, 'photo')} className="p-2.5 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors" title="Add Photo evidence"><svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
                                    <button onClick={() => handleUploadEvidence(directive.id, 'video')} className="p-2.5 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors" title="Add Video evidence"><svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.55a1 1 0 011.45.89v2.22a1 1 0 01-1.45.89L15 12l-4.55a1 1 0 01-1.45-.89V9.11a1 1 0 011.45-.89L15 10z"></path></svg></button>
                                    <button onClick={() => handleOpenAudioRecorder(directive.id)} className="p-2.5 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors" title="Add Audio note"><svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 3a3 3 0 016 0v5a3 3 0 01-6 0V3zm2 5a1 1 0 011-1h.01a1 1 0 110 2H8a1 1 0 01-1-1zm-1 3a1 1 0 00-1 1v1a3 3 0 003 3h1a3 3 0 003-3v-1a1 1 0 10-2 0v1a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                                </div>
                                <div className="flex gap-2">
                                    {directive.evidence?.map((ev, i) => (
                                        <a key={i} href={ev.url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-neon-seafoam/10 border border-neon-seafoam/30 rounded-lg flex items-center justify-center hover:bg-neon-seafoam/20 transition-all">{ev.type === 'video' ? <svg className="w-5 h-5 text-neon-seafoam" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg> : ev.type === 'photo' ? <svg className="w-5 h-5 text-neon-seafoam" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"></path></svg> : <svg className="w-5 h-5 text-neon-seafoam" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd"></path></svg>}</a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                  </div>
                );
              })}
            </section>

            <section className="glass p-6 rounded-2xl border-white/5">
                <SectionHeader title="Bay Manifest: Parts Status" />
                <div className="grid grid-cols-1 gap-3">{repairOrder.parts.length === 0 && <p className="text-xs text-slate-500 italic py-4">No parts assigned to this order yet.</p>}
                    {repairOrder.parts.map((part, index) => {
                        const statusColors: Record<string, string> = { [PartStatus.IN_BOX]: 'bg-neon-seafoam/10 text-neon-seafoam border-neon-seafoam/30', [PartStatus.USED]: 'bg-neon-steel/20 text-neon-steel border-neon-steel/40', [PartStatus.SPECIAL_ORDER]: 'bg-orange-500/10 text-orange-400 border-orange-500/30', [PartStatus.MISSING]: 'bg-red-500/10 text-red-500 border-red-500/30', };
                        const colorClass = statusColors[part.status!] || 'bg-slate-800 text-slate-400 border-white/5';

                        if (part.status === PartStatus.APPROVAL_PENDING) {
                          return (
                            <div key={part.partNumber + index} className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-orange-500/20 opacity-50 cursor-not-allowed">
                              <div><p className="font-bold text-sm text-slate-400">{part.description}</p><p className="text-[10px] text-slate-600 font-mono">{part.partNumber}</p></div>
                              <span className="text-[9px] font-black uppercase px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 animate-pulse">PENDING APPROVAL</span>
                            </div>
                          );
                        }

                        return (
                            <div key={part.partNumber + index} className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-white/5 group">
                                <div><p className="font-bold text-sm text-slate-200">{part.description}</p><p className="text-[10px] text-slate-500 font-mono">{part.partNumber} • BIN: {part.binLocation}</p></div>
                                <div className="flex items-center gap-4">
                                    <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${colorClass}`}>{part.status?.replace('_', ' ')}</span>
                                    {part.status === PartStatus.IN_BOX && (
                                      <div className="flex gap-2">
                                        <button onClick={() => handlePartStatusUpdate(index, PartStatus.USED)} className="px-4 py-1.5 text-[10px] font-black bg-slate-800 border border-white/10 rounded-lg hover:border-neon-seafoam hover:text-white transition-all">MARK USED</button>
                                        <button onClick={() => setNotUsedPartIndex(index)} className="px-4 py-1.5 text-[10px] font-black bg-slate-800 border border-white/10 rounded-lg hover:border-orange-400 hover:text-white transition-all">NOT USED</button>
                                        <button onClick={() => setMissingPartIndex(index)} className="px-4 py-1.5 text-[10px] font-black bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all">MISSING</button>
                                      </div>
                                    )}
                                    {part.status === PartStatus.USED && (<button onClick={() => handlePartStatusUpdate(index, PartStatus.IN_BOX)} className="px-4 py-1.5 text-[10px] font-black bg-neon-steel text-white rounded-lg transition-all">UNDO</button>)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="glass p-6 rounded-2xl border-white/5 h-fit">
              <SectionHeader title="Log Requisitions" />
              <div className="space-y-6">
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-3">Add Directive Request</label><div className="flex gap-2"><input value={newDirectiveRequest} onFocus={(e) => handleInputFocus(e)} onChange={e => setNewDirectiveRequest(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRequestDirective()} placeholder="e.g. Check trim seal" className="flex-grow bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:border-neon-steel outline-none transition-colors" /><button onClick={handleRequestDirective} disabled={!newDirectiveRequest.trim()} className="px-4 py-3 bg-slate-800 border border-white/10 text-slate-300 rounded-lg font-black text-[10px] uppercase hover:text-white transition-all disabled:opacity-30">Add</button></div></div>
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-3">Request New Parts</label><div className="flex gap-2"><div className="relative flex-grow"><input value={newPartRequestQuery} onFocus={(e) => handleInputFocus(e)} onChange={e => setNewPartRequestQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handlePartRequestButtonClick()} placeholder="Search Part # or Description" className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:border-neon-steel outline-none transition-colors" />{partSearchResults.length > 0 && (<div className="absolute w-full bg-slate-800 rounded-lg mt-1 border border-white/10 z-20 shadow-2xl overflow-hidden">{partSearchResults.map(part => (<div key={part.partNumber} onClick={() => handleRequestPart(part)} className="p-4 hover:bg-slate-700/50 cursor-pointer text-sm border-b border-white/5 last:border-0"><p className="font-bold text-slate-100">{part.description}</p><p className="text-[10px] font-mono text-slate-500">{part.partNumber}</p></div>))}</div>)}</div><button onClick={handlePartRequestButtonClick} disabled={!newPartRequestQuery.trim()} className="px-4 py-3 bg-slate-800 border border-white/10 text-slate-300 hover:border-neon-steel hover:text-white transition-all rounded-lg font-black text-[10px] uppercase tracking-widest disabled:opacity-30">Add</button></div></div>
              </div>
            </section>

            <section className="glass p-6 rounded-2xl border-white/5 h-fit">
              <EvidenceInputBlock title="Final Labor Conclusion" notes={laborNote} onNotesChange={setLaborNote} onTakePhoto={() => handleUploadEvidence(null, 'photo')} onTakeVideo={() => handleUploadEvidence(null, 'video')} onRecordAudio={() => handleOpenAudioRecorder(null)} placeholder="Final summary of all services performed (Required for exit gate)..." />
              <div className="flex gap-2 mt-6">
                <button disabled={repairOrder.status !== ROStatus.ACTIVE} onClick={() => setIsHaltModalOpen(true)} className="px-4 py-3 rounded-lg font-bold uppercase tracking-widest text-xs transition-all bg-slate-800 text-slate-400 border border-white/10 hover:border-orange-500/50 hover:text-orange-400 disabled:opacity-30 disabled:cursor-not-allowed">Halt</button>
                <button disabled={!isFinalizable} onClick={handleFinalize} className={`flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-2xl ${isFinalizable ? 'bg-neon-seafoam text-slate-900 hover:scale-105 active:scale-95' : 'bg-slate-800 text-slate-500 grayscale cursor-not-allowed'}`}>Send for Billing</button>
              </div>
             <div className="mt-4 space-y-2">{laborNote.length <= 10 && <div className="flex items-center gap-2 text-orange-400"><div className="w-1 h-1 rounded-full bg-orange-400"></div><span className="text-[9px] font-black uppercase tracking-widest">Awaiting Conclusion Notes</span></div>}{hasPendingPartDecisions && <div className="flex items-center gap-2 text-red-500"><div className="w-1 h-1 rounded-full bg-red-500 animate-pulse"></div><span className="text-[9px] font-black uppercase tracking-widest">Part Decisions Pending SM Approval</span></div>}</div>
            </section>
          </div>
        </div>
      </div>

      {missingPartIndex !== null && (
        <MissingPartModal
          partDescription={repairOrder.parts[missingPartIndex].description}
          onClose={() => setMissingPartIndex(null)}
          onConfirm={handleConfirmMissing}
        />
      )}

      {notUsedPartIndex !== null && (
        <NotUsedModal
          partDescription={repairOrder.parts[notUsedPartIndex].description}
          onClose={() => setNotUsedPartIndex(null)}
          onConfirm={handleConfirmNotUsed}
        />
      )}

      {isHaltModalOpen && (
        <HaltJobModal
          onClose={() => setIsHaltModalOpen(false)}
          onConfirm={handleConfirmHalt}
        />
      )}

      {evidenceModal && (
        <EvidenceModal
          directiveId={evidenceModal.directiveId}
          mode={evidenceModal.mode}
          initialMediaUrl={evidenceModal.initialMediaUrl}
          onClose={handleCloseEvidenceModal}
          onSave={handleSaveEvidence}
        />
      )}
    </>
  );
};

export default TechnicianPage;
