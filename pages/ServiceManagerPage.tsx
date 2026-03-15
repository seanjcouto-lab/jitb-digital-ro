import React, { useState, useRef, useEffect } from 'react';
import { RepairOrder, ROStatus, PartStatus, VesselHistory, Part, RORequest, Technician, PaymentStatus, CollectionsStatus } from '../types';
import { TECHNICIANS } from '../constants';
import { MOCK_NEW_CUSTOMER } from '../seedData';
import InvoiceModal from '../components/InvoiceModal';
import VesselDNAView from '../components/VesselDNAView';

import OracleSearchView from '../components/OracleSearchView';
import ProfileOnboardingForm from '../components/ProfileOnboardingForm';
import ROGenerationView from '../components/ROGenerationView';
import { ServiceManagerService } from '../services/serviceManagerService';
import { vesselService } from '../services/vesselService';
import { repairOrderService } from '../services/repairOrderService';

interface ServiceManagerPageProps {
  addRO: (ro: RepairOrder) => void;
  repairOrders: RepairOrder[];
  updateRO: (ro: RepairOrder) => void;
  deleteRO: (roId: string) => void;
  hourlyRate: number;
  masterInventory: Part[];
}

type ViewMode = 'SEARCH' | 'PROFILE_CREATE' | 'RO_CREATE';

const STATUS_GROUPS = {
  STAGED: [ROStatus.STAGED],
  PARTS: [ROStatus.AUTHORIZED],
  ACTIVE: [ROStatus.PARTS_READY, ROStatus.PARTS_PENDING, ROStatus.READY_FOR_TECH, ROStatus.ACTIVE],
  HOLD: [ROStatus.HOLD],
  BILLING: [ROStatus.PENDING_INVOICE, ROStatus.COMPLETED],
};

const StatusPill = ({ count, label, colorClass, onClick, isActive }: { count: number, label: string, colorClass: string, onClick?: () => void, isActive?: boolean }) => (
  <div onClick={onClick} className={`flex flex-col items-center justify-center p-3 rounded-xl border flex-1 min-w-[80px] cursor-pointer transition-all ${isActive ? 'bg-white/10 border-white/20 scale-105 shadow-lg ring-1 ring-white/20' : 'bg-slate-900/50 border-white/5 hover:bg-slate-800'}`}>
    <span className={`text-xl font-black ${colorClass}`}>{count}</span>
    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
  </div>
);

const RODetail = ({ 
  ro, 
  canEdit = false, 
  onRemoveDirective, 
  onRemovePart, 
  onAddDirective, 
  onAddPart 
}: { 
  ro: RepairOrder, 
  canEdit?: boolean,
  onRemoveDirective?: (roId: string, directiveId: string) => void,
  onRemovePart?: (roId: string, partIndex: number) => void,
  onAddDirective?: (roId: string, title: string) => void,
  onAddPart?: (roId: string, part: Part) => void
}) => {
  const [newDirective, setNewDirective] = useState('');
  const [newPartDescription, setNewPartDescription] = useState('');
  const [newPartNumber, setNewPartNumber] = useState('');

  const handleAddDirective = () => {
    if (newDirective.trim() && onAddDirective) {
      onAddDirective(ro.id, newDirective.trim());
      setNewDirective('');
    }
  };

  const handleAddPart = () => {
    if (newPartDescription.trim() && newPartNumber.trim() && onAddPart) {
      onAddPart(ro.id, {
        partNumber: newPartNumber.trim(),
        description: newPartDescription.trim(),
        category: 'MANUAL',
        binLocation: 'N/A',
        msrp: 0,
        dealerPrice: 0,
        cost: 0,
        quantityOnHand: 0,
        reorderPoint: 0,
        supersedesPart: null,
        isCustom: true,
        status: PartStatus.REQUIRED,
        shopId: ro.shopId
      });
      setNewPartDescription('');
      setNewPartNumber('');
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-white/10 animate-in fade-in duration-300 space-y-4 text-xs">
      <div>
        <h5 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-2 flex justify-between items-center">
          Directives
        </h5>
        <ul className="list-disc list-inside text-slate-300 pl-2 space-y-1">
          {ro.directives.map(d => (
            <li key={d.id} className="group/item flex justify-between items-center">
              <span>{d.title}</span>
              {canEdit && onRemoveDirective && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onRemoveDirective(ro.id, d.id); }}
                  className="opacity-0 group-hover/item:opacity-100 text-red-400 hover:text-red-300 transition-all p-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.697a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <div className="mt-2 flex gap-2 pl-2">
            <input 
              type="text" 
              placeholder="Add directive..." 
              value={newDirective}
              onChange={(e) => setNewDirective(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddDirective()}
              className="flex-1 bg-slate-900 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-neon-seafoam"
            />
            <button onClick={handleAddDirective} className="px-2 py-1 bg-slate-800 rounded text-neon-seafoam border border-white/10 hover:bg-slate-700">+</button>
          </div>
        )}
      </div>
      
      <div>
        <h5 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-2">Parts Manifest</h5>
        <div className="space-y-1 pl-2">
          {ro.parts.map((p, idx) => {
            const isMissing = p.status === PartStatus.MISSING || p.status === PartStatus.SPECIAL_ORDER;
            const isInBox = p.status === PartStatus.IN_BOX || p.status === PartStatus.USED;
            const isReturned = p.status === PartStatus.RETURNED;
            
            return (
              <div key={`${p.partNumber}-${idx}`} className="group/item flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                <span className={`text-slate-300 ${isReturned ? 'line-through' : ''}`}>
                  {p.description} <span className="text-slate-500 font-mono text-[9px]">({p.partNumber})</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                    isMissing ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                    isInBox ? 'bg-neon-seafoam/10 text-neon-seafoam border border-neon-seafoam/20' :
                    isReturned ? 'bg-slate-800 text-slate-500 border border-white/5 line-through' :
                    'bg-slate-800 text-slate-500 border border-white/5'
                  }`}>
                    {p.status?.replace('_', ' ') || 'REQUIRED'}
                  </span>
                  {canEdit && onRemovePart && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onRemovePart(ro.id, idx); }}
                      className="opacity-0 group-hover/item:opacity-100 text-red-400 hover:text-red-300 transition-all p-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.697a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {canEdit && (
          <div className="mt-2 space-y-2 pl-2">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Part Description..." 
                value={newPartDescription}
                onChange={(e) => setNewPartDescription(e.target.value)}
                className="flex-[2] bg-slate-900 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-neon-seafoam"
              />
              <input 
                type="text" 
                placeholder="Part #" 
                value={newPartNumber}
                onChange={(e) => setNewPartNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPart()}
                className="flex-1 bg-slate-900 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-neon-seafoam"
              />
              <button onClick={handleAddPart} className="px-2 py-1 bg-slate-800 rounded text-neon-seafoam border border-white/10 hover:bg-slate-700">+</button>
            </div>
          </div>
        )}
      </div>

      {ro.customerNotes && (
        <div>
          <h5 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-2">Internal Notes</h5>
          <p className="text-slate-300 whitespace-pre-wrap bg-slate-900/50 p-2 rounded-md border border-white/5">{ro.customerNotes}</p>
        </div>
      )}
    </div>
  );
};

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

const SignatureCanvas = ({ onSave, onClear }: { onSave: (dataUrl: string) => void, onClear?: () => void }) => {
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
            if (onClear) onClear();
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
        resizeCanvas();
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

const ServiceManagerPage: React.FC<ServiceManagerPageProps> = ({ 
  addRO, repairOrders, updateRO, deleteRO, hourlyRate, masterInventory
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('SEARCH');
  const [activeProfile, setActiveProfile] = useState(initialProfileState);

  const [reviewRequestRO, setReviewRequestRO] = useState<RepairOrder | null>(null);
  const [assignTechnicianRO, setAssignTechnicianRO] = useState<RepairOrder | null>(null);
  const [invoicingRO, setInvoicingRO] = useState<RepairOrder | null>(null);
  const [vesselActionMenu, setVesselActionMenu] = useState<VesselHistory | null>(null);
  const [historicalAlert, setHistoricalAlert] = useState<VesselHistory | null>(null);
  const [viewingDNA, setViewingDNA] = useState<VesselHistory | null>(null);
  const [expandedROId, setExpandedROId] = useState<string | null>(null);
  const [authorizingRO, setAuthorizingRO] = useState<RepairOrder | null>(null);
  const [deferralRO, setDeferralRO] = useState<RepairOrder | null>(null);
  const [deferralSummary, setDeferralSummary] = useState('');
  const [deletingRO, setDeletingRO] = useState<RepairOrder | null>(null);
  const [showDeferralError, setShowDeferralError] = useState(false);

  // Dashboard Filtering State
  const [filterStatusGroup, setFilterStatusGroup] = useState<keyof typeof STATUS_GROUPS | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTechId, setFilterTechId] = useState<string>('ALL');

  const handleVesselClick = (vessel: VesselHistory) => {
    setSearchQuery('');
    if (vessel.status === 'INCOMPLETE') {
      setHistoricalAlert(vessel);
    } else {
      setVesselActionMenu(vessel);
    }
  };

  // State for auth modal
  const [signatureForAuth, setSignatureForAuth] = useState<string | null>(null);
  const [isVerbalCertifiedForAuth, setIsVerbalCertifiedForAuth] = useState(false);

  const roGenerationRef = useRef<HTMLDivElement>(null);

  // Filter Logic
  const getFilteredROs = () => {
    return ServiceManagerService.filterRepairOrders(repairOrders, filterStatusGroup, filterTechId, searchQuery, STATUS_GROUPS);
  };

  const filteredROs = getFilteredROs();

  useEffect(() => {
    if (viewMode === 'RO_CREATE' && roGenerationRef.current) {
        roGenerationRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [viewMode]);

  const startNewROFromDNA = (dna: VesselHistory, addAlertAsDirective: boolean = false) => {
    const profileData = vesselService.initializeProfileFromDNA(dna, addAlertAsDirective);
    
    setActiveProfile({
      ...initialProfileState,
      ...profileData
    });
    
    setVesselActionMenu(null);
    setHistoricalAlert(null);
    setViewMode('RO_CREATE');
  };
  
  const handleProfileComplete = (profileData: typeof initialProfileState) => {
    setActiveProfile(profileData);
    setViewMode('RO_CREATE');
  };
  
  const handleROGenerated = (newRO: RepairOrder) => {
    addRO(newRO);
    setActiveProfile(initialProfileState);
    setViewMode('SEARCH');
  }

  const handleAuthorize = (ro: RepairOrder) => { 
    setSignatureForAuth(null);
    setIsVerbalCertifiedForAuth(false);
    setAuthorizingRO(ro); 
  };
  const handleSendToBay = (ro: RepairOrder) => { setAssignTechnicianRO(ro); };

  const handleHoldJob = (ro: RepairOrder) => {
    const updatedRO = repairOrderService.holdJob(ro);
    updateRO(updatedRO);
  };

  const handleReactivateJob = (ro: RepairOrder) => {
    const updatedRO = repairOrderService.reactivateJob(ro);
    updateRO(updatedRO);
  };

  const handleFinalizeInvoice = async (ro: RepairOrder) => {
    const updatedRO = await repairOrderService.finalizeInvoice(ro, hourlyRate);
    updateRO(updatedRO);
    setInvoicingRO(null);
  };

  const handleFinalizeAuthorization = (ro: RepairOrder, type: 'digital' | 'verbal', data: string) => {
    const updatedRO = repairOrderService.finalizeAuthorization(ro, type, data);
    updateRO(updatedRO);
    setAuthorizingRO(null);
  };

  const handleAssignTechnician = (ro: RepairOrder, tech: Technician) => {
    const updatedRO = repairOrderService.assignTechnician(ro, tech);
    updateRO(updatedRO);
    setAssignTechnicianRO(null);
  };

  const handleRequestReview = (request: RORequest, decision: 'APPROVED' | 'REJECTED') => {
    if (!reviewRequestRO) return;
    const updatedRO = repairOrderService.processReviewRequest(reviewRequestRO, request, decision);
    updateRO(updatedRO);
    setReviewRequestRO(updatedRO);
  };
  
  const handleConfirmDeferral = async () => {
    if (!deferralRO || !deferralSummary.trim()) {
        setShowDeferralError(true);
        return;
    }
    
    const updatedRO = await repairOrderService.confirmDeferral(deferralRO, deferralSummary);
    updateRO(updatedRO);

    setDeferralRO(null);
    setDeferralSummary('');
  };

  const handleRemoveDirective = (roId: string, directiveId: string) => {
    const ro = repairOrders.find(r => r.id === roId);
    if (ro) {
      const updatedRO = repairOrderService.removeDirectiveFromRO(ro, directiveId);
      updateRO(updatedRO);
    }
  };

  const handleRemovePart = async (roId: string, partIndex: number) => {
    const ro = repairOrders.find(r => r.id === roId);
    if (ro) {
      const { updatedRO } = await repairOrderService.removePartFromRO(ro, partIndex, masterInventory);
      updateRO(updatedRO);
    }
  };

  const handleAddDirective = (roId: string, title: string) => {
    const ro = repairOrders.find(r => r.id === roId);
    if (ro) {
      const updatedRO = repairOrderService.addDirectiveToRO(ro, title);
      updateRO(updatedRO);
    }
  };

  const handleAddPart = (roId: string, part: Part) => {
    const ro = repairOrders.find(r => r.id === roId);
    if (ro) {
      const updatedRO = repairOrderService.addManualPartToRO(ro, part);
      updateRO(updatedRO);
    }
  };

  const handleDeleteRO = (roId: string) => {
    const ro = repairOrders.find(r => r.id === roId);
    if (ro) {
      setDeletingRO(ro);
    }
  };

  const pendingRequests = reviewRequestRO?.requests?.filter(r => r.status === 'PENDING') || [];

  const handleCancel = () => {
    setActiveProfile(initialProfileState);
    setViewMode('SEARCH');
  };

  const stats = {
    staged: repairOrders.filter(ro => ro.status === ROStatus.STAGED).length,
    parts: repairOrders.filter(ro => ro.status === ROStatus.AUTHORIZED).length,
    readyAndActive: repairOrders.filter(ro => [ROStatus.PARTS_READY, ROStatus.PARTS_PENDING, ROStatus.READY_FOR_TECH, ROStatus.ACTIVE].includes(ro.status)).length,
    hold: repairOrders.filter(ro => ro.status === ROStatus.HOLD).length,
    billing: repairOrders.filter(ro => ro.status === ROStatus.PENDING_INVOICE).length,
  };

  const toggleStatusFilter = (group: keyof typeof STATUS_GROUPS) => {
    setFilterStatusGroup(prev => prev === group ? null : group);
  };

  return (
    <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-end border-b border-white/5 pb-4 gap-4">
          <div><h2 className="text-3xl font-black neon-seafoam uppercase tracking-tighter">The Dock</h2><p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Service Manager Command Console</p></div>
          {viewMode !== 'SEARCH' && (<button onClick={handleCancel} className="text-[10px] font-bold text-slate-400 hover:text-white uppercase transition-all bg-white/5 px-4 py-2 rounded-lg border border-white/5">← Cancel & Return to Dock</button>)}
        </div>

        {/* Status Cards */}
        <div className="flex flex-wrap gap-2 w-full">
            <StatusPill count={stats.staged} label="Staged" colorClass="text-slate-300" onClick={() => toggleStatusFilter('STAGED')} isActive={filterStatusGroup === 'STAGED'} />
            <StatusPill count={stats.parts} label="Parts Dept" colorClass="text-yellow-400" onClick={() => toggleStatusFilter('PARTS')} isActive={filterStatusGroup === 'PARTS'} />
            <StatusPill count={stats.readyAndActive} label="Ready/Active" colorClass="text-neon-seafoam" onClick={() => toggleStatusFilter('ACTIVE')} isActive={filterStatusGroup === 'ACTIVE'} />
            <StatusPill count={stats.hold} label="Hold" colorClass="text-neon-crimson" onClick={() => toggleStatusFilter('HOLD')} isActive={filterStatusGroup === 'HOLD'} />
            <StatusPill count={stats.billing} label="Billing" colorClass="text-neon-steel" onClick={() => toggleStatusFilter('BILLING')} isActive={filterStatusGroup === 'BILLING'} />
        </div>

        <div className="space-y-8">
          <section>
            {viewMode === 'SEARCH' && (
              <div className="space-y-4">
                <OracleSearchView 
                  onVesselSelect={(vessel) => { setVesselActionMenu(vessel); }} 
                  onNewCustomer={() => setViewMode('PROFILE_CREATE')} 
                  onLoadMockData={() => { setActiveProfile(MOCK_NEW_CUSTOMER); setViewMode('PROFILE_CREATE'); }} 
                  onHistoricalAlert={setHistoricalAlert}
                  searchTerm={searchQuery}
                  onSearchChange={setSearchQuery}
                />
                
                {/* Tech Filter & Clear Filters */}
                <div className="flex justify-end items-center gap-4">
                  {(filterStatusGroup || searchQuery || filterTechId !== 'ALL') && (
                    <button 
                      onClick={() => { setFilterStatusGroup(null); setSearchQuery(''); setFilterTechId('ALL'); }}
                      className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-white text-xs font-bold rounded-lg border border-white/10 uppercase tracking-wider whitespace-nowrap"
                    >
                      Clear Filters
                    </button>
                  )}
                  <div className="w-full md:w-64">
                    <select 
                      value={filterTechId} 
                      onChange={(e) => setFilterTechId(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-neon-seafoam outline-none appearance-none"
                    >
                      <option value="ALL">All Technicians</option>
                      {TECHNICIANS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}
            {viewMode === 'PROFILE_CREATE' && (<ProfileOnboardingForm initialData={activeProfile} onProfileComplete={handleProfileComplete} />)}
            {viewMode === 'RO_CREATE' && (<div ref={roGenerationRef}><ROGenerationView profileData={activeProfile} onROGenerated={handleROGenerated} masterInventory={masterInventory}/></div>)}
          </section>
          <section className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 ${filterStatusGroup ? 'lg:grid-cols-1' : ''}`}>
            
            {(!filterStatusGroup || filterStatusGroup === 'STAGED') && (
            <div className="glass rounded-2xl p-6 border-white/5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold neon-steel uppercase tracking-tighter">Staged Queue</h2>
                <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{filteredROs.filter(ro => ro.status === ROStatus.STAGED).length}</span>
              </div>
              <div className="space-y-4">
                {filteredROs.filter(ro => ro.status === ROStatus.STAGED).map(ro => (
                  <div key={ro.id} onClick={() => setExpandedROId(expandedROId === ro.id ? null : ro.id)} className="p-4 rounded-xl border border-white/5 bg-white/5 flex flex-col gap-3 group hover:border-neon-seafoam transition-all cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-200 text-sm">{ro.customerName}</h4>
                        <p className="text-[9px] text-slate-500 font-bold uppercase">{ro.vesselName}</p>
                      </div>
                      <div className="bg-slate-800 text-slate-500 text-[8px] px-2 py-0.5 rounded font-black uppercase">STAGED</div>
                    </div>
                    
                    {expandedROId !== ro.id && (
                      <button onClick={(e) => { e.stopPropagation(); handleAuthorize(ro); }} className="w-full px-4 py-2 rounded-lg bg-slate-800 text-[10px] font-black border border-white/10 hover:bg-neon-seafoam hover:text-slate-900 transition-all uppercase tracking-widest">AUTHORIZE GATE</button>
                    )}
                    
                    {expandedROId === ro.id && (
                      <>
                        <RODetail 
                          ro={ro} 
                          canEdit={true}
                          onRemoveDirective={handleRemoveDirective}
                          onRemovePart={handleRemovePart}
                          onAddDirective={handleAddDirective}
                          onAddPart={handleAddPart}
                        />
                        <div className="flex gap-2 mt-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleAuthorize(ro); }} 
                            className="flex-1 px-4 py-2 rounded-lg bg-neon-seafoam text-slate-900 text-[10px] font-black border border-neon-seafoam/20 hover:scale-105 transition-all uppercase tracking-widest"
                          >
                            AUTHORIZE
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteRO(ro.id); }} 
                            className="px-4 py-2 rounded-lg bg-red-500/10 text-red-500 text-[10px] font-black border border-red-500/20 hover:bg-red-500/20 transition-all uppercase tracking-widest"
                          >
                            REMOVE
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {filteredROs.filter(ro => ro.status === ROStatus.STAGED).length === 0 && <p className="text-slate-600 italic text-sm text-center py-4 font-medium">Queue empty.</p>}
              </div>
            </div>
            )}

            {(!filterStatusGroup || filterStatusGroup === 'PARTS') && (
            <div className="glass rounded-2xl p-6 border-white/5">
              <h2 className="text-lg font-bold mb-4 text-yellow-400 uppercase tracking-tighter">Awaiting Parts</h2>
              <div className="space-y-4">
                {filteredROs.filter(ro => ro.status === ROStatus.AUTHORIZED).map(ro => (
                  <div key={ro.id} onClick={() => setExpandedROId(expandedROId === ro.id ? null : ro.id)} className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 flex flex-col gap-3 cursor-pointer">
                    <div><h4 className="font-bold text-slate-200 text-sm">{ro.customerName}</h4><p className="text-[9px] text-slate-500 font-bold uppercase">{ro.vesselName}</p></div>
                    <div className="flex justify-between items-center"><div className="bg-yellow-500/10 text-yellow-400 text-[8px] px-2 py-0.5 rounded font-black">{ro.status.replace('_', ' ')}</div></div>
                    {expandedROId === ro.id && <RODetail ro={ro} />}
                  </div>
                ))}
                {filteredROs.filter(ro => ro.status === ROStatus.AUTHORIZED).length === 0 && <p className="text-slate-600 italic text-sm text-center py-4 font-medium">Queue empty.</p>}
              </div>
            </div>
            )}

            {(!filterStatusGroup || filterStatusGroup === 'ACTIVE') && (
            <div className="glass rounded-2xl p-6 border-white/5">
              <h2 className="text-lg font-bold mb-4 neon-seafoam uppercase tracking-tighter">Deployment Deck</h2>
              <div className="space-y-4">
                {filteredROs.filter(ro => [ROStatus.PARTS_READY, ROStatus.PARTS_PENDING, ROStatus.READY_FOR_TECH, ROStatus.ACTIVE].includes(ro.status)).map(ro => { 
                  const hasPendingRequests = ro.requests?.some(r => r.status === 'PENDING'); 
                  return (
                    <div key={ro.id} onClick={() => setExpandedROId(expandedROId === ro.id ? null : ro.id)} className={`relative p-4 rounded-xl border bg-white/5 flex flex-col gap-3 group transition-all cursor-pointer ${ro.status === ROStatus.ACTIVE ? 'border-neon-seafoam shadow-[0_0_10px_rgba(45,212,191,0.2)]' : 'border-white/5 hover:border-neon-seafoam'}`}>
                      {hasPendingRequests && ( <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-red-500 text-white text-[8px] font-black uppercase rounded-full animate-pulse">ATTN</div> )}
                      <div><h4 className="font-bold text-slate-200 text-sm">{ro.customerName}</h4><p className="text-[9px] text-slate-500 font-bold uppercase">{ro.vesselName}</p></div>
                      <div className="flex justify-between items-center">
                        <div className={`text-[8px] px-2 py-0.5 rounded font-black ${ro.status === ROStatus.ACTIVE ? 'bg-neon-seafoam/10 text-neon-seafoam' : ro.status === ROStatus.PARTS_PENDING ? 'bg-yellow-500/10 text-yellow-500' : 'bg-slate-800 text-slate-500'}`}>{ro.status.replace('_', ' ')}</div>
                        {ro.technicianName && <p className="text-[9px] text-neon-steel font-bold uppercase">TECH: {ro.technicianName.split(' ')[0]}</p>}
                      </div>
                      {expandedROId !== ro.id && ro.status === ROStatus.ACTIVE && (
                        <div className="flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); handleHoldJob(ro); }} className="w-full px-4 py-2 rounded-lg bg-orange-500/20 text-orange-400 text-[10px] font-black border border-orange-500/30 hover:bg-orange-500/30 transition-all uppercase tracking-widest">HOLD</button>
                          {hasPendingRequests && <button onClick={(e) => { e.stopPropagation(); setReviewRequestRO(ro); }} className="w-full px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-black border border-red-500/30 hover:bg-red-500/30 transition-all uppercase tracking-widest">REVIEW</button>}
                        </div>
                      )}
                      {expandedROId !== ro.id && [ROStatus.PARTS_READY, ROStatus.READY_FOR_TECH, ROStatus.PARTS_PENDING].includes(ro.status) && (
                        <button onClick={(e) => { e.stopPropagation(); handleSendToBay(ro); }} className="w-full px-4 py-2 rounded-lg bg-slate-800 text-[10px] font-black border border-white/10 hover:bg-neon-seafoam hover:text-slate-900 transition-all uppercase tracking-widest">ASSIGN TECH</button>
                      )}
                      {expandedROId === ro.id && <RODetail ro={ro} />}
                    </div>
                  );
                })}
                {filteredROs.filter(ro => [ROStatus.PARTS_READY, ROStatus.PARTS_PENDING, ROStatus.READY_FOR_TECH, ROStatus.ACTIVE].includes(ro.status)).length === 0 && <p className="text-slate-600 italic text-sm text-center py-4 font-medium">Deck clear.</p>}
              </div>
            </div>
            )}

            {(!filterStatusGroup || filterStatusGroup === 'HOLD') && (
            <div className="glass rounded-2xl p-6 border-white/5">
              <h2 className="text-lg font-bold mb-4 neon-crimson uppercase tracking-tighter">On Hold</h2>
              <div className="space-y-4">
                {filteredROs.filter(ro => ro.status === ROStatus.HOLD).map(ro => (
                  <div key={ro.id} onClick={() => setExpandedROId(expandedROId === ro.id ? null : ro.id)} className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 flex flex-col gap-3 cursor-pointer">
                    <div><h4 className="font-bold text-slate-200 text-sm">{ro.customerName}</h4><p className="text-[9px] text-slate-500 font-bold uppercase">{ro.vesselName}</p></div>
                    <div className="flex justify-between items-center"><div className="bg-red-500/10 text-red-400 text-[8px] px-2 py-0.5 rounded font-black">HOLD</div></div>
                    {expandedROId !== ro.id && <div className="flex gap-2"><button onClick={(e) => { e.stopPropagation(); handleReactivateJob(ro); }} className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-[10px] font-black border border-white/10 hover:bg-neon-seafoam hover:text-slate-900 transition-all uppercase tracking-widest">Resume</button><button onClick={(e) => { e.stopPropagation(); setDeferralRO(ro); }} className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-[10px] font-black border border-white/10 hover:bg-slate-700 hover:text-white transition-all uppercase tracking-widest">Finalize...</button></div>}
                    {expandedROId === ro.id && <RODetail ro={ro} />}
                  </div>
                ))}
                {filteredROs.filter(ro => ro.status === ROStatus.HOLD).length === 0 && <p className="text-slate-600 italic text-sm text-center py-4 font-medium">None.</p>}
              </div>
            </div>
            )}

            {(!filterStatusGroup || filterStatusGroup === 'BILLING') && (
            <div className="glass rounded-2xl p-6 border-white/5">
              <h2 className="text-lg font-bold mb-4 neon-steel uppercase tracking-tighter">Billing &amp; Archive</h2>
              <div className="space-y-4">
                {filteredROs.filter(ro => ro.status === ROStatus.PENDING_INVOICE).map(ro => (
                  <div key={ro.id} onClick={() => setExpandedROId(expandedROId === ro.id ? null : ro.id)} className="p-4 rounded-xl border border-white/5 bg-white/5 flex flex-col gap-3 group hover:border-neon-seafoam transition-all cursor-pointer">
                    <div><h4 className="font-bold text-slate-200 text-sm">{ro.customerName}</h4><p className="text-[9px] text-slate-500 font-bold uppercase">{ro.vesselName}</p></div>
                    {expandedROId !== ro.id && <button onClick={(e) => { e.stopPropagation(); setInvoicingRO(ro); }} className="w-full px-4 py-2 rounded-lg bg-slate-800 text-[10px] font-black border border-white/10 hover:bg-neon-seafoam hover:text-slate-900 transition-all uppercase tracking-widest">FINALIZE</button>}
                    {expandedROId === ro.id && <RODetail ro={ro} />}
                  </div>
                ))}
                {filteredROs.filter(ro => ro.status === ROStatus.PENDING_INVOICE).length === 0 && <p className="text-slate-600 italic text-sm text-center py-4 font-medium">Billing queue clear.</p>}
                
                {/* Archive Section - Always show unless filtered by other status groups */}
                <div className="pt-4 mt-4 border-t border-white/10">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Recently Archived</h3>
                  <div className="space-y-2 overflow-y-auto max-h-64 pr-2">
                    {filteredROs.filter(ro => ro.status === ROStatus.COMPLETED).slice(0, 5).map(ro => (
                      <div key={ro.id} className="p-3 rounded-xl border border-white/5 bg-slate-900/30 opacity-60">
                        <div><h4 className="font-bold text-slate-400 text-xs">{ro.customerName}</h4><p className="text-[8px] text-slate-600 font-bold uppercase">{ro.vesselName}</p></div>
                        <div className="mt-1 text-[8px] text-slate-600 font-mono">{new Date(ro.datePaid || ro.dateInvoiced || Date.now()).toLocaleDateString()}</div>
                      </div>
                    ))}
                    {filteredROs.filter(ro => ro.status === ROStatus.COMPLETED).length === 0 && <p className="text-slate-600 italic text-xs text-center py-2 font-medium">Archive empty.</p>}
                  </div>
                </div>
              </div>
            </div>
            )}
          </section>
        </div>
      
      {vesselActionMenu && (<div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-in fade-in duration-300 p-4"><div className="glass p-8 rounded-2xl w-full max-w-md border border-white/10"><h3 className="text-lg font-black uppercase tracking-widest text-white mb-2">{vesselActionMenu.customerName}</h3><p className="text-xs text-slate-400 mb-6">{vesselActionMenu.boatMake} {vesselActionMenu.boatModel} • S/N: {vesselActionMenu.engineSerial}</p><div className="space-y-4"><button onClick={() => { setViewingDNA(vesselActionMenu); setVesselActionMenu(null); }} className="w-full text-left px-6 py-4 bg-slate-800/50 border border-white/10 text-slate-200 hover:border-neon-steel hover:text-white transition-all rounded-lg font-bold text-sm">View Full Vessel DNA</button><button onClick={() => startNewROFromDNA(vesselActionMenu)} className="w-full text-left px-6 py-4 bg-slate-800/50 border border-white/10 text-slate-200 hover:border-neon-seafoam hover:text-white transition-all rounded-lg font-bold text-sm">Start New Repair Order</button></div><button onClick={() => setVesselActionMenu(null)} className="text-xs text-slate-500 hover:text-white mt-6 w-full text-center">Cancel</button></div></div>)}
      {historicalAlert && (<div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-in fade-in duration-300 p-4"><div className="glass p-8 rounded-2xl w-full max-w-lg border-2 border-red-500 shadow-2xl shadow-red-500/20"><h3 className="text-lg font-black uppercase tracking-widest text-red-400 mb-2">Historical Alert</h3><p className="text-sm text-slate-300 mb-6">Oracle scan of <span className="font-bold text-white">{historicalAlert.vesselHIN}</span> indicates unresolved service items.</p><div className="bg-red-500/10 p-4 rounded-lg border border-red-500/30"><p className="text-xs text-red-300 font-bold uppercase mb-1">Last Recorded Note:</p><p className="text-sm text-white font-medium">{historicalAlert.unresolvedNotes}</p></div><div className="flex justify-between items-center mt-6"><button onClick={() => { setViewingDNA(historicalAlert); setHistoricalAlert(null); }} className="text-xs text-slate-300 hover:text-white">View Full DNA</button><button onClick={() => startNewROFromDNA(historicalAlert, true)} className="px-6 py-3 bg-red-500 text-white font-bold rounded-lg hover:scale-105">Acknowledge & Start RO</button></div></div></div>)}
      {viewingDNA && (<div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-in fade-in duration-300 p-4"><VesselDNAView vessel={viewingDNA} allROs={repairOrders} onClose={() => setViewingDNA(null)} /></div>)}
      {authorizingRO && (<div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-in fade-in duration-300 p-4"><div className="glass p-8 rounded-2xl w-full max-w-lg border border-neon-seafoam shadow-2xl shadow-neon-seafoam/20"><h3 className="text-lg font-black uppercase tracking-widest text-neon-seafoam mb-4">Authorization Gate</h3><p className="text-sm text-slate-300 mb-6">Authorize RO <span className="font-bold text-white">{authorizingRO.id}</span> for <span className="font-bold text-white">{authorizingRO.customerName}</span>.</p><SignatureCanvas onSave={(dataUrl) => { setSignatureForAuth(dataUrl); setIsVerbalCertifiedForAuth(false); }} onClear={() => setSignatureForAuth(null)} /><div className="flex items-center my-4"><div className="flex-grow h-px bg-white/10"></div><span className="px-4 text-xs font-bold text-slate-500">OR</span><div className="flex-grow h-px bg-white/10"></div></div><label htmlFor="verbalAuthModal" className={`py-4 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-3 cursor-pointer ${isVerbalCertifiedForAuth ? 'bg-neon-seafoam/20 border-neon-seafoam text-neon-seafoam' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}><input id="verbalAuthModal" type="checkbox" checked={isVerbalCertifiedForAuth} onChange={(e) => { setIsVerbalCertifiedForAuth(e.target.checked); if(e.target.checked) setSignatureForAuth(null); }} className="h-5 w-5 bg-slate-900 border-slate-600 text-neon-seafoam focus:ring-neon-seafoam" />I Certify Verbal Authorization</label><div className="flex justify-between items-center mt-6"><button onClick={() => setAuthorizingRO(null)} className="text-xs text-slate-500 hover:text-white">Cancel</button><button onClick={() => handleFinalizeAuthorization(authorizingRO, signatureForAuth ? 'digital' : 'verbal', signatureForAuth || 'Verbally authorized.')} disabled={!signatureForAuth && !isVerbalCertifiedForAuth} className="px-6 py-3 bg-neon-seafoam text-slate-900 font-bold rounded-lg hover:scale-105 disabled:opacity-50 disabled:grayscale disabled:hover:scale-100">Authorize</button></div></div></div>)}
      {assignTechnicianRO && (<div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-in fade-in duration-300 p-4"><div className="glass p-8 rounded-2xl w-full max-w-md border border-neon-steel shadow-2xl shadow-neon-steel/20"><h3 className="text-lg font-black uppercase tracking-widest text-neon-steel mb-4">Assign Technician</h3><p className="text-sm text-slate-300 mb-6">Assign an available technician to RO <span className="font-bold text-white">{assignTechnicianRO.id}</span>.</p><div className="grid grid-cols-2 gap-4">{TECHNICIANS.map(tech => (<button key={tech.id} onClick={() => handleAssignTechnician(assignTechnicianRO, tech)} className="p-6 bg-slate-800/50 hover:bg-slate-700/50 border border-white/10 hover:border-neon-steel transition-all rounded-lg text-lg font-bold">{tech.name}</button>))}</div><button onClick={() => setAssignTechnicianRO(null)} className="text-xs text-slate-500 hover:text-white mt-6 w-full text-center">Cancel</button></div></div>)}
      {reviewRequestRO && (<div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-in fade-in duration-300 p-4"><div className="glass p-8 rounded-2xl w-full max-w-lg border border-red-500 shadow-2xl shadow-red-500/20"><h3 className="text-lg font-black uppercase tracking-widest text-red-400 mb-4">Technician Requisition Review</h3><p className="text-sm text-slate-300 mb-6">Reviewing {pendingRequests.length} pending request(s) for RO <span className="font-bold text-white">{reviewRequestRO.id}</span>.</p><div className="space-y-4 max-h-64 overflow-y-auto pr-2">{pendingRequests.map(request => (<div key={request.id} className="p-4 bg-slate-900/50 border border-white/10 rounded-lg"><div className="flex justify-between items-start"><div><span className="text-xs font-bold text-slate-400 uppercase">{request.type} REQUEST</span>{request.type === 'DIRECTIVE' && <p className="text-sm font-bold text-white">{(request.payload as {title: string}).title}</p>}{request.type === 'PART' && <p className="text-sm text-slate-300">Request to add part: <span className="font-bold text-white">{(request.payload as Part).description}</span></p>}</div><div className="flex gap-2"><button onClick={() => handleRequestReview(request, 'APPROVED')} className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-green-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button><button onClick={() => handleRequestReview(request, 'REJECTED')} className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.697a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button></div></div></div>))}</div><button onClick={() => setReviewRequestRO(null)} className="text-xs text-slate-500 hover:text-white mt-6 w-full text-center">Close</button></div></div>)}
      {deferralRO && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-in fade-in duration-300 p-4">
          <div className="glass p-8 rounded-2xl w-full max-w-2xl border border-orange-500 shadow-2xl shadow-orange-500/20">
            <h3 className="text-lg font-black uppercase tracking-widest text-orange-400 mb-4">Defer Items & Finalize Job</h3>
            <p className="text-sm text-slate-300 mb-6">Log unresolved items to the Vessel's DNA for the next service and move this RO to billing for completed work.</p>
            <div className="space-y-4 max-h-48 overflow-y-auto bg-slate-900/50 p-4 rounded-lg border border-white/10">
                <h4 className="text-xs text-slate-400 font-bold uppercase">Incomplete Items:</h4>
                {deferralRO.directives.filter(d => !d.isCompleted).map(d => <p key={d.id} className="text-sm text-slate-300">- (Directive) {d.title}</p>)}
                {deferralRO.parts.filter(p => ![PartStatus.IN_BOX, PartStatus.USED, PartStatus.RETURNED].includes(p.status!)).map(p => <p key={p.partNumber} className="text-sm text-slate-300">- (Part) {p.description} [{p.status}]</p>)}
            </div>
            <div className="mt-4">
                <label className="block text-xs text-slate-400 uppercase font-bold mb-2">Summary for Next Service</label>
                <textarea value={deferralSummary} onChange={e => setDeferralSummary(e.target.value)} placeholder="e.g., Recommend replacing port trim tab seals at next 100-hour service." autoFocus className="w-full h-24 bg-slate-900 border border-white/10 rounded-lg p-4 text-white text-base focus:border-orange-500 outline-none transition-colors" />
            </div>
            <div className="flex justify-between items-center mt-6">
              <button onClick={() => setDeferralRO(null)} className="text-xs text-slate-500 hover:text-white">Cancel</button>
              <button onClick={handleConfirmDeferral} disabled={!deferralSummary.trim()} className="px-6 py-3 bg-orange-500 text-white font-bold rounded-lg hover:scale-105 disabled:opacity-50 disabled:grayscale">Confirm Deferral & Finalize</button>
            </div>
          </div>
        </div>
      )}
      {invoicingRO && <InvoiceModal ro={invoicingRO} hourlyRate={hourlyRate} onClose={() => setInvoicingRO(null)} onFinalize={handleFinalizeInvoice} />}
      
      {deletingRO && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-in fade-in duration-300 p-4">
          <div className="glass p-8 rounded-2xl w-full max-w-md border border-red-500 shadow-2xl shadow-red-500/20">
            <h3 className="text-lg font-black uppercase tracking-widest text-red-400 mb-4">Confirm Removal</h3>
            <p className="text-sm text-slate-300 mb-6">Are you sure you want to permanently remove the Repair Order for <span className="font-bold text-white">{deletingRO.customerName}</span>? This action cannot be undone.</p>
            <div className="flex justify-between items-center gap-4">
              <button onClick={() => setDeletingRO(null)} className="flex-1 px-6 py-3 bg-slate-800 text-slate-300 font-bold rounded-lg hover:bg-slate-700">Cancel</button>
              <button onClick={() => { deleteRO(deletingRO.id); setDeletingRO(null); }} className="flex-1 px-6 py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600">Remove Permanently</button>
            </div>
          </div>
        </div>
      )}

      {showDeferralError && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-in fade-in duration-300 p-4">
          <div className="glass p-8 rounded-2xl w-full max-w-sm border border-orange-500">
            <h3 className="text-lg font-black uppercase tracking-widest text-orange-400 mb-4">Missing Summary</h3>
            <p className="text-sm text-slate-300 mb-6">Please provide a summary for the Vessel DNA record before finalizing the deferral.</p>
            <button onClick={() => setShowDeferralError(false)} className="w-full px-6 py-3 bg-orange-500 text-white font-bold rounded-lg">Acknowledge</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceManagerPage;
