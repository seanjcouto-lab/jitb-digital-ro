
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { RepairOrder, PartStatus, Part } from '../types';
import { RepairOrderCreateInput } from '../types/RepairOrderCreateInput';
import { SERVICE_PACKAGES } from '../constants';
import { repairOrderService } from '../services/repairOrderService';
import { shopContextService } from '../services/shopContextService';
import SectionHeader from './SectionHeader';
import EvidenceInputBlock from './EvidenceInputBlock';

const initialProfileState = {
  customerName: '',
  customerPhones: [''],
  customerEmails: [''],
  customerAddress: { street: '', city: '', state: '', zip: '' },
  customerNotes: '',
  vesselName: '',
  vesselHIN: '',
  boatMake: '',
  boatModel: '',
  boatYear: '',
  boatLength: '',
  engineMake: '',
  engineModel: '',
  engineYear: '',
  engineHorsepower: '',
  engineSerial: '',
};

interface ROGenerationViewProps {
    profileData: typeof initialProfileState;
    onROGenerated: (ro: RepairOrder) => void;
    masterInventory: Part[];
}

type EvidenceModalMode = 'photo' | 'video' | 'audio';

const SignatureCanvas = ({ onSave }: { onSave: (dataUrl: string) => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isSigned, setIsSigned] = useState(false);

    const getCoords = (event: any) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        if (event.touches) {
            return { x: event.touches[0].clientX - rect.left, y: event.touches[0].clientY - rect.top };
        }
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    const startDrawing = (e: any) => {
        e.preventDefault();
        const { x, y } = getCoords(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
        setIsSigned(true);
    };

    const draw = (e: any) => {
        if (!isDrawing) return;
        e.preventDefault();
        const { x, y } = getCoords(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setIsSigned(false);
        }
    };
    
    const saveSignature = () => {
      const canvas = canvasRef.current;
      if(canvas && isSigned) {
        onSave(canvas.toDataURL('image/png'));
      }
    }

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const resizeCanvas = () => {
            const ctx = canvas.getContext('2d');
            if(ctx) {
                const ratio = Math.max(window.devicePixelRatio || 1, 1);
                canvas.width = canvas.offsetWidth * ratio;
                canvas.height = canvas.offsetHeight * ratio;
                ctx.scale(ratio, ratio);
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
            }
        };
        requestAnimationFrame(resizeCanvas);
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    return (
        <div className="space-y-4">
            <canvas
                ref={canvasRef}
                className="w-full h-48 bg-slate-900 rounded-lg border border-white/10 touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
            />
            <div className="flex justify-between">
                <button onClick={clearCanvas} className="px-4 py-2 text-xs font-bold bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-600/50">Clear</button>
                <button onClick={saveSignature} disabled={!isSigned} className="px-6 py-2 text-xs font-bold bg-neon-seafoam text-slate-900 rounded-lg hover:scale-105 disabled:opacity-50 disabled:grayscale disabled:hover:scale-100">Save Signature</button>
            </div>
        </div>
    );
};


const ROGenerationView: React.FC<ROGenerationViewProps> = ({ profileData, onROGenerated, masterInventory }) => {
  const [currentProfileData, setCurrentProfileData] = useState(profileData);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [manualPartQuery, setManualPartQuery] = useState('');
  const [manuallyAddedParts, setManuallyAddedParts] = useState<Part[]>([]);
  const [manualDirective, setManualDirective] = useState('');
  const [manuallyAddedDirectives, setManuallyAddedDirectives] = useState<string[]>([]);
  const [jobComplaint, setJobComplaint] = useState('');
  const [signatureForCreate, setSignatureForCreate] = useState<string | null>(null);
  const [isVerbalCertified, setIsVerbalCertified] = useState(false);
  const [showCreateSignatureModal, setShowCreateSignatureModal] = useState(false);
  const [micError, setMicError] = useState(false);
  
  const [evidenceModalMode, setEvidenceModalMode] = useState<EvidenceModalMode | null>(null);
  const [capturedMediaUrl, setCapturedMediaUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const manualPartResults = useMemo(() => {
    if (manualPartQuery.length < 2) return [];
    const q = manualPartQuery.toLowerCase();
    const addedPartNumbers = manuallyAddedParts.map(p => p.partNumber);
    return masterInventory.filter(part => 
        !addedPartNumbers.includes(part.partNumber) &&
        (part.partNumber.toLowerCase().includes(q) || part.description.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [manualPartQuery, manuallyAddedParts, masterInventory]);
  
  const handleGenerateRO = () => {
    let authorizationType: 'digital' | 'verbal' | null = null;
    let authorizationData: string | null = null;
    let authorizationTimestamp: number | null = null;

    if (signatureForCreate) {
        authorizationType = 'digital';
        authorizationData = signatureForCreate;
        authorizationTimestamp = Date.now();
    } else if (isVerbalCertified) {
        authorizationType = 'verbal';
        authorizationData = 'Verbally authorized at time of creation.';
        authorizationTimestamp = Date.now();
    }

    const input: RepairOrderCreateInput = {
      customerName: currentProfileData.customerName,
      customerPhones: currentProfileData.customerPhones.filter((p: string) => p),
      customerEmails: currentProfileData.customerEmails.filter((e: string) => e),
      customerAddress: currentProfileData.customerAddress,
      customerNotes: currentProfileData.customerNotes || null,
      jobComplaint: jobComplaint || null,
      vesselHIN: currentProfileData.vesselHIN,
      vesselName: `${currentProfileData.boatMake} ${currentProfileData.boatModel}`,
      boatMake: currentProfileData.boatMake || null,
      boatModel: currentProfileData.boatModel || null,
      boatYear: currentProfileData.boatYear || null,
      boatLength: currentProfileData.boatLength || null,
      engineMake: currentProfileData.engineMake || null,
      engineModel: currentProfileData.engineModel || null,
      engineYear: currentProfileData.engineYear || null,
      engineHorsepower: currentProfileData.engineHorsepower || null,
      engineSerial: currentProfileData.engineSerial,
      selectedPackages,
      manualParts: manuallyAddedParts.map(p => ({
        partNumber: p.partNumber,
        description: p.description,
        quantity: p.quantity ?? 1,
      })),
      manualDirectives: manuallyAddedDirectives,
      authorization: authorizationType
        ? { type: authorizationType, data: authorizationData ?? '', timestamp: authorizationTimestamp ?? Date.now() }
        : undefined,
      shopId: shopContextService.getActiveShopId(),
    };

    // Phase 4 — pass nested entity payloads if profileData carries them
    const shopId = shopContextService.getActiveShopId();
    const primaryContact = (currentProfileData as any).contacts?.find((c: any) => c.isPrimary) || (currentProfileData as any).contacts?.[0];
    const v0 = (currentProfileData as any).vessels?.[0];
    const e0 = v0?.engines?.[0];

    if (primaryContact || v0) {
      if ((currentProfileData as any).companyName) {
        input.company = {
          companyId: crypto.randomUUID(),
          shopId,
          companyName: (currentProfileData as any).companyName,
          address: (currentProfileData as any).address || null,
        };
      }
      if (primaryContact) {
        input.contact = {
          contactId: primaryContact.contactId,
          shopId,
          companyId: input.company?.companyId || '',
          fullName: primaryContact.fullName,
          phones: primaryContact.phones || [],
          emails: primaryContact.emails || [],
          isPrimary: true,
        };
      }
      if (v0) {
        input.vessel = {
          vesselId: v0.vesselId,
          shopId,
          companyId: input.company?.companyId || '',
          vesselName: v0.vesselName || '',
          hin: v0.hin || '',
          boatMake: v0.boatMake || '',
          boatModel: v0.boatModel || '',
          boatYear: v0.boatYear || '',
          boatLength: v0.boatLength || '',
        };
      }
      if (e0) {
        input.engine = {
          engineId: e0.engineId,
          vesselId: v0.vesselId,
          shopId,
          engineMake: e0.engineMake || '',
          engineModel: e0.engineModel || '',
          engineYear: e0.engineYear || '',
          engineHorsepower: e0.engineHorsepower || '',
          engineSerial: e0.engineSerial || '',
          engineHours: e0.engineHours || '',
          engineType: e0.engineType || '',
          fuelType: e0.fuelType || '',
        };
      }
    }

    const newRO = repairOrderService.createRepairOrder(input, masterInventory);
    onROGenerated(newRO);
  };
  
  const handleTogglePackage = (pkgName: string) => setSelectedPackages(prev => prev.includes(pkgName) ? prev.filter(p => p !== pkgName) : [...prev, pkgName]);
  const handleAddManualPart = (part: Part) => { setManuallyAddedParts(prev => [...prev, { ...part, quantity: 1 }]); setManualPartQuery(''); };
  const handleRemoveManualPart = (partNumber: string) => setManuallyAddedParts(prev => prev.filter(p => p.partNumber !== partNumber));
  const handleUpdateManualPartQty = (partNumber: string, qty: number) => { setManuallyAddedParts(prev => prev.map(p => p.partNumber === partNumber ? { ...p, quantity: Math.max(1, Math.floor(qty) || 1) } : p)); };
  const handleAddManualDirective = () => { if (manualDirective.trim()) { setManuallyAddedDirectives(prev => [...prev, manualDirective.trim()]); setManualDirective(''); } };
  const handleRemoveManualDirective = (index: number) => setManuallyAddedDirectives(prev => prev.filter((_, i) => i !== index));

  const handleManualPartAddButtonClick = () => {
    if (manualPartQuery.trim() === '') return;
    if (manualPartResults.length === 1) { handleAddManualPart(manualPartResults[0]); }
    else { const newCustomPart: Part = { partNumber: `CUSTOM-${manualPartQuery.trim().toUpperCase().replace(/\s/g, '_')}`, description: manualPartQuery.trim(), category: 'CUSTOM', binLocation: 'N/A', msrp: 0, dealerPrice: 0, cost: 0, quantityOnHand: 0, reorderPoint: 0, supersedesPart: null, isCustom: true, status: PartStatus.REQUIRED, shopId: shopContextService.getActiveShopId() }; handleAddManualPart(newCustomPart); }
  };

  const handleUploadEvidence = (mode: 'photo' | 'video') => {
    if (mode === 'photo') photoInputRef.current?.click();
    else if (mode === 'video') videoInputRef.current?.click();
  };
  
  const handleOpenAudioRecorder = () => {
    setEvidenceModalMode('audio');
  };

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        setMediaRecorder(recorder);
        recordedChunks.current = [];
        recorder.ondataavailable = event => { if (event.data.size > 0) recordedChunks.current.push(event.data); };
        recorder.onstop = () => {
            const blob = new Blob(recordedChunks.current, { type: 'audio/webm' });
            const url = URL.createObjectURL(blob);
            setCapturedMediaUrl(url);
            stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
        };
        recorder.start();
        setIsRecording(true);
    } catch (err) {
        console.error("Mic access error:", err);
        setMicError(true);
        handleCloseEvidenceModal();
    }
  };

  const stopRecording = () => {
      mediaRecorder?.stop();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, mode: EvidenceModalMode) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCapturedMediaUrl(url);
      setEvidenceModalMode(mode);
    }
    if (event.target) event.target.value = '';
  };

  const handleCloseEvidenceModal = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
    mediaRecorder?.stream?.getTracks().forEach(track => track.stop());
    if (capturedMediaUrl) URL.revokeObjectURL(capturedMediaUrl);
    
    setEvidenceModalMode(null);
    setCapturedMediaUrl(null);
    setIsRecording(false);
    setMediaRecorder(null);
  };

  const handleSaveAttachment = () => {
      if (!capturedMediaUrl || !evidenceModalMode) return;
      const noteText = `\n[Attached ${evidenceModalMode}: ${capturedMediaUrl}]`;
      setJobComplaint(prev => prev + noteText);
      setCapturedMediaUrl(null); // Prevent URL from being revoked twice
      handleCloseEvidenceModal();
  };
  
  const handleSaveCreateSignature = (dataUrl: string) => { setSignatureForCreate(dataUrl); setIsVerbalCertified(false); setShowCreateSignatureModal(false); };
  const handleVerbalCertifyToggle = (checked: boolean) => { setIsVerbalCertified(checked); if (checked) setSignatureForCreate(null); };

  const isAuthorizedOnCreate = !!signatureForCreate || isVerbalCertified;

  const handleInputFocus = (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTimeout(() => {
        event.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  return (
    <>
      <input type="file" accept="image/*" ref={photoInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'photo')} />
      <input type="file" accept="video/*" ref={videoInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'video')} />

      <div className="glass rounded-2xl p-8 border-white/5 animate-in slide-in-from-right-4 duration-500">
        <div className="border-b border-white/5 pb-6 mb-8">
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">New Repair Order Generation</h3>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 text-xs">
                <div><label className="block text-slate-500 font-bold uppercase tracking-widest">Customer</label><p className="text-base font-bold text-white truncate">{profileData.customerName}</p></div>
                <div><label className="block text-slate-500 font-bold uppercase tracking-widest">Vessel</label><p className="text-base font-medium text-slate-200">{profileData.boatMake} {profileData.boatModel}</p></div>
                <div><label className="block text-slate-500 font-bold uppercase tracking-widest">Engine S/N</label><p className="text-base font-mono text-neon-steel">{profileData.engineSerial}</p></div>
            </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-4">
            <SectionHeader title="Standard Service Packages" />
            <div className="grid grid-cols-3 gap-4">
                {Object.keys(SERVICE_PACKAGES).map(pkgName => (
                    <div key={pkgName} onClick={() => handleTogglePackage(pkgName)} className={`aspect-[4/5] p-4 rounded-xl cursor-pointer transition-all duration-300 border-2 flex flex-col justify-between items-center text-center group shadow-lg shadow-black/30 ${selectedPackages.includes(pkgName) ? 'bg-neon-seafoam/20 border-neon-seafoam scale-105 shadow-inner shadow-neon-seafoam/20' : 'bg-slate-900/50 border-white/10 hover:border-neon-seafoam/50 hover:-translate-y-1 hover:shadow-xl'}`}>
                        <p className="font-black text-slate-100 text-base break-words group-hover:text-white transition-colors">{pkgName}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-300 transition-colors">{SERVICE_PACKAGES[pkgName as keyof typeof SERVICE_PACKAGES].parts.length} PARTS</p>
                    </div>
                ))}
            </div>
          </div>
          <div className="space-y-8">
            <div>
              <SectionHeader title="Manual Directives" />
              <div className="space-y-3">
                {manuallyAddedDirectives.map((dir, index) => (<div key={index} className="flex justify-between items-center bg-slate-900/70 p-3 rounded-lg border border-white/5"><p className="text-sm font-medium text-slate-200">{dir}</p><button onClick={() => handleRemoveManualDirective(index)} className="p-2 bg-slate-800/50 rounded-lg text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button></div>))}
              </div>
              <div className="flex gap-2 mt-4">
                <input 
                  value={manualDirective} 
                  onFocus={handleInputFocus} 
                  onChange={e => setManualDirective(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleAddManualDirective()}
                  placeholder="Add custom directive..." 
                  className="flex-grow h-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:border-neon-steel outline-none transition-colors"
                />
                <button onClick={handleAddManualDirective} disabled={!manualDirective.trim()} className="px-6 py-3 bg-slate-800 border border-white/10 text-slate-300 hover:border-neon-steel hover:text-white transition-all rounded-lg font-black text-[10px] uppercase tracking-widest disabled:opacity-50">Add</button>
              </div>
            </div>
            <div>
              <SectionHeader title="Manual Part Requisition" />
              <div className="space-y-3">
                {manuallyAddedParts.map(part => (<div key={part.partNumber} className="flex justify-between items-center bg-slate-900/70 p-3 rounded-lg border border-white/5"><div><p className="text-sm font-bold text-slate-200">{part.description}</p><p className="text-xs font-mono text-slate-500">{part.partNumber}</p></div><div className="flex items-center gap-2 ml-auto mr-2"><label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Qty</label><input type="number" min={1} value={part.quantity ?? 1} onChange={e => handleUpdateManualPartQty(part.partNumber, parseInt(e.target.value))} className="w-14 bg-slate-800 border border-white/10 rounded px-2 py-1 text-white text-sm text-center focus:border-neon-steel outline-none" /></div><button onClick={() => handleRemoveManualPart(part.partNumber)} className="p-2 bg-slate-800/50 rounded-lg text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button></div>))}
              </div>
              <div className="flex gap-2 mt-4">
                <div className="relative flex-grow">
                  <input 
                    value={manualPartQuery} 
                    onFocus={handleInputFocus} 
                    onChange={(e) => setManualPartQuery(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleManualPartAddButtonClick()}
                    placeholder="Search parts or type to add..." 
                    className="w-full h-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:border-neon-steel outline-none transition-colors"
                  />
                  {manualPartResults.length > 0 && (<div className="absolute w-full bg-slate-800 rounded-lg mt-1 border border-white/10 z-10 shadow-lg">{manualPartResults.map((part) => (<div key={part.partNumber} onClick={() => handleAddManualPart(part)} className="p-3 hover:bg-slate-700/50 cursor-pointer text-sm">{part.description} <span className="text-xs text-slate-400">({part.partNumber})</span></div>))}</div>)}
                </div>
                <button onClick={handleManualPartAddButtonClick} disabled={!manualPartQuery.trim()} className="px-6 py-3 bg-slate-800 border border-white/10 text-slate-300 hover:border-neon-steel hover:text-white transition-all rounded-lg font-black text-[10px] uppercase tracking-widest disabled:opacity-50">Add</button>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-white/10 pt-8 space-y-8">
          <div>
              <SectionHeader title="Customer Notes" />
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-2">Persistent — from customer profile</p>
              <textarea value={currentProfileData.customerNotes} onFocus={handleInputFocus} onChange={e => setCurrentProfileData(prev => ({ ...prev, customerNotes: e.target.value }))} rows={3} className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-slate-300 text-sm focus:border-neon-seafoam outline-none transition-colors resize-none" />
            </div>
          <EvidenceInputBlock
            title="Job Complaint"
            notes={jobComplaint}
            onNotesChange={setJobComplaint}
            onTakePhoto={() => handleUploadEvidence('photo')}
            onTakeVideo={() => handleUploadEvidence('video')}
            onRecordAudio={handleOpenAudioRecorder}
            placeholder="Describe the customer's reported issue for this visit..."
          />
          <div className="space-y-4">
            <SectionHeader title="Authorization Gate" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setShowCreateSignatureModal(true)} className={`py-4 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2 ${signatureForCreate ? 'bg-neon-seafoam/20 border-neon-seafoam text-neon-seafoam' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}>{signatureForCreate ? '✓ Signature Captured' : 'Capture Customer Signature'}</button>
              <label htmlFor="verbalAuth" className={`py-4 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-3 cursor-pointer ${isVerbalCertified ? 'bg-neon-seafoam/20 border-neon-seafoam text-neon-seafoam' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}><input id="verbalAuth" type="checkbox" checked={isVerbalCertified} onChange={(e) => handleVerbalCertifyToggle(e.target.checked)} className="h-5 w-5 bg-slate-900 border-slate-600 text-neon-seafoam focus:ring-neon-seafoam" />I Certify Verbal Authorization</label>
            </div>
          </div>
          <button onClick={handleGenerateRO} className="w-full bg-neon-seafoam text-slate-900 font-black py-4 rounded-xl shadow-[0_0_30px_rgba(45,212,191,0.3)] hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-sm">Authorize & Stage Job</button>
        </div>

        {showCreateSignatureModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-in fade-in duration-300">
            <div className="glass p-8 rounded-2xl w-full max-w-lg border border-neon-seafoam shadow-2xl shadow-neon-seafoam/20">
              <h3 className="text-lg font-black uppercase tracking-widest text-neon-seafoam mb-4">Capture Customer Signature</h3>
              <SignatureCanvas onSave={handleSaveCreateSignature} />
              <button onClick={() => setShowCreateSignatureModal(false)} className="text-xs text-slate-500 hover:text-white mt-6 w-full text-center">Cancel</button>
            </div>
          </div>
        )}

        {evidenceModalMode && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="glass p-6 rounded-2xl w-full max-w-2xl border-2 border-neon-seafoam shadow-2xl shadow-neon-seafoam/20">
              <h3 className="text-lg font-black uppercase tracking-widest text-neon-seafoam mb-4">
                {evidenceModalMode === 'audio' ? 'Record Audio Evidence' : `Confirm ${evidenceModalMode} Upload`}
              </h3>
               {evidenceModalMode === 'audio' && !capturedMediaUrl && (
                <div className="flex flex-col items-center justify-center p-8 space-y-4">
                    <div className="relative h-16 w-16">
                        {isRecording && <div className="absolute inset-0 bg-red-500 rounded-full animate-ping"></div>}
                        <div className={`h-16 w-16 rounded-full flex items-center justify-center ${isRecording ? 'bg-red-500/50' : 'bg-slate-700'}`}>
                            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 3a3 3 0 016 0v5a3 3 0 01-6 0V3zm2 5a1 1 0 011-1h.01a1 1 0 110 2H8a1 1 0 01-1-1zm-1 3a1 1 0 00-1 1v1a3 3 0 003 3h1a3 3 0 003-3v-1a1 1 0 10-2 0v1a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm">{isRecording ? "Recording in progress..." : "Ready to record audio note."}</p>
                    <button onClick={isRecording ? stopRecording : startRecording} className={`px-6 py-3 rounded-lg font-bold text-white transition-all text-sm uppercase tracking-wider ${isRecording ? 'bg-red-600' : 'bg-slate-800 hover:bg-slate-700'}`}>
                        {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </button>
                    {micError && <p className="text-red-400 text-xs font-bold">Microphone access denied. Please check browser permissions.</p>}
                </div>
              )}
              {capturedMediaUrl && (
                <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden mb-4 border border-white/10 flex items-center justify-center">
                    {evidenceModalMode === 'photo' ? (<img src={capturedMediaUrl} alt="Preview" className="max-w-full max-h-full object-contain" />)
                    : evidenceModalMode === 'video' ? (<video src={capturedMediaUrl} controls autoPlay className="w-full h-full" />)
                    : evidenceModalMode === 'audio' ? (<audio src={capturedMediaUrl} controls autoPlay className="w-full p-4" />)
                    : null}
                </div>
              )}
              <div className="flex justify-end gap-4 mt-4">
                <button onClick={handleCloseEvidenceModal} className="text-slate-400 font-bold text-sm hover:text-white transition-all">Cancel</button>
                <button onClick={handleSaveAttachment} disabled={!capturedMediaUrl} className="px-8 py-3 bg-neon-seafoam text-slate-900 font-black rounded-lg transition-all disabled:opacity-50 disabled:grayscale">Attach Evidence</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ROGenerationView;
