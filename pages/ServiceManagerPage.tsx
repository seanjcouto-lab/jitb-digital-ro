import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Search } from 'lucide-react';
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
  taxRate: number;
  overridePin: string;
  masterInventory: Part[];
}

type ViewMode = 'SEARCH' | 'PROFILE_CREATE' | 'RO_CREATE';

const STATUS_GROUPS = {
  STAGED: [ROStatus.READY_FOR_TECH, ROStatus.PARTS_READY],
  PARTS: [ROStatus.AUTHORIZED, ROStatus.PARTS_PENDING],
  ACTIVE: [ROStatus.ACTIVE, ROStatus.READY_FOR_TECH, ROStatus.PARTS_READY, ROStatus.PARTS_PENDING],
  ACTIVE_ONLY: [ROStatus.ACTIVE],
  HOLD: [ROStatus.HOLD],
  BILLING: [ROStatus.PENDING_INVOICE, ROStatus.COMPLETED],
  ARCHIVE: [ROStatus.COMPLETED, ROStatus.ARCHIVED],
};

const StatusPill = ({ count, label, colorClass, onClick, isActive }: { count: number, label: string, colorClass: string, onClick?: () => void, isActive?: boolean }) => (
  <div onClick={onClick} className={`flex flex-col items-center justify-center p-3 rounded-xl border flex-1 min-w-[80px] cursor-pointer transition-all ${isActive ? 'bg-white/10 border-white/20 scale-105 shadow-lg ring-1 ring-white/20' : 'bg-slate-900/50 border-white/5 hover:bg-slate-800'}`}>
    <span className={`text-xl font-black ${colorClass}`}>{count}</span>
    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
  </div>
);

const getRelativeTime = (timestamp: number) => {
  const now = Date.now();
  const diffInMs = now - timestamp;
  const diffInMins = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMins < 1) return 'Just now';
  if (diffInMins < 60) return `${diffInMins}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  return `${diffInDays}d ago`;
};

interface ROCardProps {
  ro: RepairOrder;
  onClick: () => void;
  isExpanded: boolean;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}

const ROCard: React.FC<ROCardProps> = ({ 
  ro, 
  onClick, 
  isExpanded, 
  children, 
  actions 
}) => {
  const createdAt = parseInt(ro.id.split('-')[1]) || Date.now();
  const pendingPartsCount = ro.parts.filter(p => 
    p.status === PartStatus.MISSING || 
    p.status === PartStatus.SPECIAL_ORDER || 
    p.status === PartStatus.APPROVAL_PENDING
  ).length;
  const hasPartRequest = ro.requests?.some(r => r.type === 'PART' && r.status === 'PENDING');
  const hasAttn = ro.requests?.some(r => r.status === 'PENDING');

  return (
    <div 
      onClick={onClick} 
     className={`relative p-4 rounded-xl border bg-white/5 flex flex-col gap-3 group transition-all cursor-pointer ${
        hasAttn ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse' :
        ro.status === ROStatus.ACTIVE ? 'border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 
        ro.status === ROStatus.HOLD ? 'border-red-500/30 bg-red-500/5' :
        'border-white/5 hover:border-white/20'
      }`}
    >
      {/* Row 1: RO number, Vessel, Customer */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-slate-500">{ro.id}</span>
            <h4 className="font-bold text-slate-200 text-sm">{ro.customerName}</h4>
          </div>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{ro.vesselName}</p>
        </div>
      </div>

      {/* Row 2: Status, Technician assignment */}
      <div className="flex justify-between items-center">
        <div className={`text-[8px] px-2 py-0.5 rounded font-black uppercase ${
          ro.status === ROStatus.ACTIVE ? 'bg-green-500/10 text-green-400' : 
          ro.status === ROStatus.HOLD ? 'bg-red-500/10 text-red-400' :
          ro.status === ROStatus.PARTS_PENDING ? 'bg-amber-500/10 text-amber-500' :
          ro.status === ROStatus.PENDING_INVOICE ? 'bg-purple-500/10 text-purple-400' :
          'bg-slate-800 text-slate-500'
        }`}>
          {ro.status.replace('_', ' ')}
        </div>
        {ro.technicianName && (
          <p className="text-[9px] text-teal-400 font-bold uppercase">TECH: {ro.technicianName.split(' ')[0]}</p>
        )}
      </div>

      {/* Row 3: Opened time (relative age) */}
      <div className="text-[9px] text-slate-500 font-medium">
        Opened {getRelativeTime(createdAt)}
      </div>

      {/* Row 4: Work summary */}
      <div className="flex gap-4 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
        <span>{ro.directives.length} Directives</span>
        {pendingPartsCount > 0 && <span className="text-amber-500">{pendingPartsCount} Parts Pending</span>}
      </div>

      {/* Row 5: Alert badges */}
      {(hasPartRequest || hasAttn || ro.status === ROStatus.HOLD) && (
        <div className="flex flex-wrap gap-1 mt-1">
          {hasPartRequest && <span className="px-2 py-0.5 bg-red-500 text-white text-[8px] font-black rounded animate-pulse">PART REQUEST</span>}
          {hasAttn && <span className="px-2 py-0.5 bg-red-500 text-white text-[8px] font-black rounded-full animate-pulse">ATTN</span>}
          {false && ro.status === ROStatus.HOLD && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[8px] font-black rounded border border-red-500/30">HOLD</span>}
        </div>
      )}

      {/* Actions (if not expanded) */}
      {!isExpanded && actions && (
        <div className="mt-2">
          {actions}
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && children}
    </div>
  );
};

const RODetail = ({ 
  ro, 
  canEdit = false, 
  masterInventory = [],
  onRemoveDirective, 
  onRemovePart, 
  onAddDirective, 
  onAddPart 
}: { 
  ro: RepairOrder, 
  canEdit?: boolean,
  masterInventory?: Part[],
  onRemoveDirective?: (roId: string, directiveId: string) => void,
  onRemovePart?: (roId: string, partIndex: number) => void,
  onAddDirective?: (roId: string, title: string) => void,
  onAddPart?: (roId: string, part: Part) => void
}) => {
  const [newDirective, setNewDirective] = useState('');
  const [partSearchQuery, setPartSearchQuery] = useState('');
  const [partSearchResults, setPartSearchResults] = useState<Part[]>([]);
  const [showPartResults, setShowPartResults] = useState(false);

  const handleAddDirective = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (newDirective.trim() && onAddDirective) {
      onAddDirective(ro.id, newDirective.trim());
      setNewDirective('');
    }
  };

  const handlePartSearch = (query: string) => {
    setPartSearchQuery(query);
    if (query.length > 1) {
      const results = masterInventory.filter(p => 
        p.partNumber.toLowerCase().includes(query.toLowerCase()) || 
        p.description.toLowerCase().includes(query.toLowerCase())
      );
      setPartSearchResults(results);
      setShowPartResults(true);
    } else {
      setPartSearchResults([]);
      setShowPartResults(false);
    }
  };

  const handleSelectPart = (part: Part) => {
    if (onAddPart) {
      onAddPart(ro.id, { ...part, status: PartStatus.REQUIRED });
      setPartSearchQuery('');
      setPartSearchResults([]);
      setShowPartResults(false);
    }
  };

  const handleAddCustomPart = () => {
    if (partSearchQuery.trim() && onAddPart) {
      onAddPart(ro.id, {
        partNumber: 'CUSTOM-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
        description: partSearchQuery.trim(),
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
      setPartSearchQuery('');
      setPartSearchResults([]);
      setShowPartResults(false);
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()} className="mt-4 pt-4 border-t border-white/10 animate-in fade-in duration-300 space-y-4 text-xs">
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
                  <X className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <div className="mt-2 flex gap-2 pl-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="Add directive..." 
                value={newDirective}
                onChange={(e) => setNewDirective(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddDirective()}
                className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1.5 text-[10px] outline-none focus:border-neon-seafoam transition-colors"
              />
            </div>
            <button 
              onClick={handleAddDirective} 
              className="px-3 py-1.5 bg-slate-800 rounded text-neon-seafoam border border-white/10 hover:bg-slate-700 transition-colors flex items-center justify-center"
            >
              <Plus className="h-3 w-3" />
            </button>
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
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {canEdit && (
          <div className="mt-2 flex gap-2 pl-2 relative">
            <div className="relative flex-1">
              <div className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                <Search className="h-3 w-3" />
              </div>
              <input 
                type="text" 
                placeholder="Search or add part..." 
                value={partSearchQuery}
                onChange={(e) => handlePartSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomPart()}
                className="w-full bg-slate-900 border border-white/10 rounded pl-7 pr-2 py-1.5 text-[10px] outline-none focus:border-neon-seafoam transition-colors"
              />
              {showPartResults && (
                <div className="absolute bottom-full mb-1 left-0 right-0 bg-slate-800 border border-white/10 rounded shadow-xl z-50 max-h-40 overflow-y-auto">
                  {partSearchResults.map(p => (
                    <div 
                      key={p.partNumber}
                      onClick={() => handleSelectPart(p)}
                      className="p-2 hover:bg-slate-700 cursor-pointer border-b border-white/5 last:border-0"
                    >
                      <div className="font-bold text-slate-200">{p.description}</div>
                      <div className="text-[8px] text-slate-500 font-mono">{p.partNumber}</div>
                    </div>
                  ))}
                  {partSearchResults.length === 0 && (
                    <div className="p-2 text-slate-500 italic text-[10px]">No matches. Press Enter to add as custom.</div>
                  )}
                </div>
              )}
            </div>
            <button 
              onClick={handleAddCustomPart} 
              className="px-3 py-1.5 bg-slate-800 rounded text-neon-seafoam border border-white/10 hover:bg-slate-700 transition-colors flex items-center justify-center"
            >
              <Plus className="h-3 w-3" />
            </button>
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
  addRO, repairOrders, updateRO, deleteRO, hourlyRate, taxRate, overridePin, masterInventory
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
  const getQueueROs = (group: keyof typeof STATUS_GROUPS) => {
    let filtered = repairOrders.filter(ro => {
      const isInStatusGroup = STATUS_GROUPS[group].includes(ro.status);
      
      if (group === 'STAGED') {
        return isInStatusGroup && !ro.technicianId;
      }
      
      if (group === 'ACTIVE') {
        return isInStatusGroup && !!ro.technicianId;
      }
      
      if (group === 'ACTIVE_ONLY') {
        return isInStatusGroup;
      }

      if (group === 'PARTS') {
        return isInStatusGroup || 
          (ro.status === ROStatus.ACTIVE && ro.parts.some(p => p.status === PartStatus.REQUIRED));
      }

      return isInStatusGroup;
    });

    // Apply search query if present
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(ro => 
        ro.customerName.toLowerCase().includes(q) || 
        ro.vesselName.toLowerCase().includes(q) || 
        ro.id.toLowerCase().includes(q)
      );
    }

    // Apply tech filter if present
    if (filterTechId !== 'ALL') {
      filtered = filtered.filter(ro => ro.technicianId === filterTechId);
    }

    if (group === 'ACTIVE') {
      // Sort: ACTIVE jobs to the top
      return [...filtered].sort((a, b) => {
        if (a.status === ROStatus.ACTIVE && b.status !== ROStatus.ACTIVE) return -1;
        if (a.status !== ROStatus.ACTIVE && b.status === ROStatus.ACTIVE) return 1;
        return 0;
      });
    }

    if (group === 'STAGED') {
      return [...filtered].sort((a, b) => b.id.localeCompare(a.id));
    }

    return filtered;
  };

  const stats = {
    staged: getQueueROs('STAGED').length,
    parts: getQueueROs('PARTS').length,
    deployment: getQueueROs('ACTIVE').length,
    activeOnly: getQueueROs('ACTIVE_ONLY').length,
    hold: getQueueROs('HOLD').length,
    billing: getQueueROs('BILLING').length,
    archive: getQueueROs('ARCHIVE').length,
  };

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
  setSearchQuery('');
  setFilterStatusGroup(null);
  setFilterTechId('ALL');
  setViewMode('SEARCH');
};

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

 const handleFinalizeInvoice = async (ro: RepairOrder, isTaxExempt: boolean, taxExemptId: string) => {
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
    const remainingPending = updatedRO.requests?.filter(r => r.status === 'PENDING') || [];
    if (remainingPending.length === 0) {
      setReviewRequestRO(null);
    } else {
      setReviewRequestRO(updatedRO);
    }
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
            <StatusPill count={stats.staged} label="Staged" colorClass="text-blue-400" onClick={() => toggleStatusFilter('STAGED')} isActive={filterStatusGroup === 'STAGED'} />
            <StatusPill count={stats.parts} label="Parts Dept" colorClass="text-amber-400" onClick={() => toggleStatusFilter('PARTS')} isActive={filterStatusGroup === 'PARTS'} />
            <StatusPill count={stats.deployment} label="Deployment Deck" colorClass="text-teal-400" onClick={() => toggleStatusFilter('ACTIVE')} isActive={filterStatusGroup === 'ACTIVE'} />
            <StatusPill count={stats.activeOnly} label="Active" colorClass="text-green-400" onClick={() => toggleStatusFilter('ACTIVE_ONLY')} isActive={filterStatusGroup === 'ACTIVE_ONLY'} />
            <StatusPill count={stats.hold} label="Hold" colorClass="text-red-400" onClick={() => toggleStatusFilter('HOLD')} isActive={filterStatusGroup === 'HOLD'} />
            <StatusPill count={stats.billing} label="Billing" colorClass="text-purple-400" onClick={() => toggleStatusFilter('BILLING')} isActive={filterStatusGroup === 'BILLING'} />
            
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
                <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{getQueueROs('STAGED').length}</span>
              </div>
              <div className="space-y-4">
                {getQueueROs('STAGED').map(ro => (
                  <ROCard 
                    key={ro.id} 
                    ro={ro} 
                    onClick={() => setExpandedROId(expandedROId === ro.id ? null : ro.id)}
                    isExpanded={expandedROId === ro.id}
                    actions={
                      <div className="flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleSendToBay(ro); }} className="flex-1 px-4 py-2 rounded-lg bg-neon-seafoam text-slate-900 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">ASSIGN TECH</button>
                        <button onClick={(e) => { e.stopPropagation(); handleHoldJob(ro); }} className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-black border border-red-500/30 uppercase tracking-widest hover:bg-red-500/30 transition-all">HOLD</button>
                      </div>
                    }
                  >
                    <RODetail 
                      ro={ro} 
                      canEdit={true}
                      masterInventory={masterInventory}
                      onRemoveDirective={handleRemoveDirective}
                      onRemovePart={handleRemovePart}
                      onAddDirective={handleAddDirective}
                      onAddPart={handleAddPart}
                    />
                   <div className="flex gap-2 mt-2">
                      <button onClick={(e) => { e.stopPropagation(); handleSendToBay(ro); }} className="flex-1 px-4 py-2 rounded-lg bg-neon-seafoam text-slate-900 text-[10px] font-black border border-neon-seafoam/20 hover:scale-105 transition-all uppercase tracking-widest">ASSIGN TECH</button>
                      <button onClick={(e) => { e.stopPropagation(); handleHoldJob(ro); }} className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-black border border-red-500/30 hover:bg-red-500/30 transition-all uppercase tracking-widest">HOLD</button>
                     <button onClick={(e) => { e.stopPropagation(); handleDeleteRO(ro.id); }} className="p-2 rounded-lg bg-slate-800/30 text-slate-600 border border-white/5 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                      </button>
                    </div>
                  </ROCard>
                ))}
                {getQueueROs('STAGED').length === 0 && <p className="text-slate-600 italic text-sm text-center py-4 font-medium">Queue empty.</p>}
              </div>
            </div>
            )}

            {(!filterStatusGroup || filterStatusGroup === 'PARTS') && (
            <div className="glass rounded-2xl p-6 border-white/5">
              <h2 className="text-lg font-bold mb-4 text-yellow-400 uppercase tracking-tighter">Parts Dept</h2>
              <div className="space-y-4">
                {getQueueROs('PARTS').map(ro => {
                  const hasMissingOrSO = ro.parts.some(p => p.status === PartStatus.MISSING || p.status === PartStatus.SPECIAL_ORDER);

                  return (
                    <ROCard 
                      key={ro.id} 
                      ro={ro} 
                      onClick={() => setExpandedROId(expandedROId === ro.id ? null : ro.id)}
                      isExpanded={expandedROId === ro.id}
                   actions={
                        ro.status === ROStatus.READY_FOR_TECH ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSendToBay(ro); }}
                            className="w-full px-3 py-2 rounded-lg bg-neon-seafoam text-slate-900 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all"
                          >
                            Assign Tech
                          </button>
                        ) : null
                      }
                    >
                      <RODetail ro={ro} masterInventory={masterInventory} />
                    </ROCard>
                  );
                })}
                {getQueueROs('PARTS').length === 0 && <p className="text-slate-600 italic text-sm text-center py-4 font-medium">Queue empty.</p>}
              </div>
            </div>
            )}

            {(!filterStatusGroup || filterStatusGroup === 'ACTIVE') && (
            <div className="glass rounded-2xl p-6 border-white/5">
              <h2 className="text-lg font-bold mb-4 neon-seafoam uppercase tracking-tighter">Deployment Deck</h2>
              <div className="space-y-4">
                {getQueueROs('ACTIVE').map(ro => { 
                  const hasPendingRequests = ro.requests?.some(r => r.status === 'PENDING'); 
                  
                  return (
                    <ROCard 
                      key={ro.id} 
                      ro={ro} 
                      onClick={() => setExpandedROId(expandedROId === ro.id ? null : ro.id)}
                      isExpanded={expandedROId === ro.id}
                      actions={
                        ro.status === ROStatus.ACTIVE ? (
                          <div className="flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); handleHoldJob(ro); }} className="w-full px-4 py-2 rounded-lg bg-orange-500/20 text-orange-400 text-[10px] font-black border border-orange-500/30 hover:bg-orange-500/30 transition-all uppercase tracking-widest">HOLD</button>
                            {hasPendingRequests && <button onClick={(e) => { e.stopPropagation(); setReviewRequestRO(ro); }} className="w-full px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-black border border-red-500/30 hover:bg-red-500/30 transition-all uppercase tracking-widest">REVIEW</button>}
                          </div>
                        ) : [ROStatus.PARTS_READY, ROStatus.READY_FOR_TECH, ROStatus.PARTS_PENDING].includes(ro.status) && ro.technicianId ? (
                          <div className="flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); handleHoldJob(ro); }} className="w-full px-4 py-2 rounded-lg bg-orange-500/20 text-orange-400 text-[10px] font-black border border-orange-500/30 hover:bg-orange-500/30 transition-all uppercase tracking-widest">HOLD</button>
                            {hasPendingRequests && <button onClick={(e) => { e.stopPropagation(); setReviewRequestRO(ro); }} className="w-full px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-black border border-red-500/30 hover:bg-red-500/30 transition-all uppercase tracking-widest">REVIEW</button>}
                          </div>
                        ) : [ROStatus.PARTS_READY, ROStatus.READY_FOR_TECH, ROStatus.PARTS_PENDING].includes(ro.status) && !ro.technicianId ? (
                          <button onClick={(e) => { e.stopPropagation(); handleSendToBay(ro); }} className="w-full px-4 py-2 rounded-lg bg-slate-800 text-[10px] font-black border border-white/10 hover:bg-neon-seafoam hover:text-slate-900 transition-all uppercase tracking-widest">ASSIGN TECH</button>
                        ) : null
                      }
                    >
                      <RODetail ro={ro} masterInventory={masterInventory} />
                    </ROCard>
                  );
                })}
                {getQueueROs('ACTIVE').length === 0 && <p className="text-slate-600 italic text-sm text-center py-4 font-medium">Deck clear.</p>}
              </div>
            </div>
            )}

            {(!filterStatusGroup || filterStatusGroup === 'HOLD') && (
            <div className="glass rounded-2xl p-6 border-white/5">
              <h2 className="text-lg font-bold mb-4 neon-crimson uppercase tracking-tighter">On Hold</h2>
              <div className="space-y-4">
                {getQueueROs('HOLD').map(ro => (
                  <ROCard 
                    key={ro.id} 
                    ro={ro} 
                    onClick={() => setExpandedROId(expandedROId === ro.id ? null : ro.id)}
                    isExpanded={expandedROId === ro.id}
                  >
                    <RODetail ro={ro} masterInventory={masterInventory} />
                   <div className="flex gap-2 mt-2">
                      <button onClick={(e) => { e.stopPropagation(); handleReactivateJob(ro); }} className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-[10px] font-black border border-white/10 hover:bg-neon-seafoam hover:text-slate-900 transition-all uppercase tracking-widest">Resume</button>
                      {!ro.technicianId && <button onClick={(e) => { e.stopPropagation(); setDeferralRO(ro); }} className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-[10px] font-black border border-white/10 hover:bg-slate-700 hover:text-white transition-all uppercase tracking-widest">Finalize...</button>}
                      {ro.requests?.some(r => r.status === 'PENDING') && <button onClick={(e) => { e.stopPropagation(); setReviewRequestRO(ro); }} className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-black border border-red-500/30 hover:bg-red-500/30 transition-all uppercase tracking-widest">REVIEW</button>}
                    </div>
                  </ROCard>
                ))}
                {getQueueROs('HOLD').length === 0 && <p className="text-slate-600 italic text-sm text-center py-4 font-medium">None.</p>}
              </div>
            </div>
            )}

            {(!filterStatusGroup || filterStatusGroup === 'BILLING') && (
            <div className="glass rounded-2xl p-6 border-white/5">
              <h2 className="text-lg font-bold mb-4 neon-steel uppercase tracking-tighter">Billing Queue</h2>
              <div className="space-y-4">
                {getQueueROs('BILLING').map(ro => (
                  <ROCard 
                    key={ro.id} 
                    ro={ro} 
                    onClick={() => setExpandedROId(expandedROId === ro.id ? null : ro.id)}
                    isExpanded={expandedROId === ro.id}
                    actions={
                      <button onClick={(e) => { e.stopPropagation(); setInvoicingRO(ro); }} className="w-full px-4 py-2 rounded-lg bg-slate-800 text-[10px] font-black border border-white/10 hover:bg-neon-seafoam hover:text-slate-900 transition-all uppercase tracking-widest">FINALIZE</button>
                    }
                  >
                    <RODetail ro={ro} masterInventory={masterInventory} />
                  </ROCard>
                ))}
                {getQueueROs('BILLING').length === 0 && <p className="text-slate-600 italic text-sm text-center py-4 font-medium">Billing queue clear.</p>}
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
      {reviewRequestRO && (<div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-in fade-in duration-300 p-4"><div className="glass p-8 rounded-2xl w-full max-w-lg border border-red-500 shadow-2xl shadow-red-500/20"><h3 className="text-lg font-black uppercase tracking-widest text-red-400 mb-4">Technician Requisition Review</h3><p className="text-sm text-slate-300 mb-6">Reviewing {pendingRequests.length} pending request(s) for RO <span className="font-bold text-white">{reviewRequestRO.id}</span>.</p><div className="space-y-4 max-h-64 overflow-y-auto pr-2">{pendingRequests.map(request => (<div key={request.id} className="p-4 bg-slate-900/50 border border-white/10 rounded-lg"><div className="flex justify-between items-start"><div><span className="text-xs font-bold text-slate-400 uppercase">{request.type} REQUEST</span>{request.type === 'DIRECTIVE' && <p className="text-sm font-bold text-white">{(request.payload as {title: string}).title}</p>}{request.type === 'PART' && (
  <div className="space-y-1">
    <p className="text-sm text-slate-300">Request to add part: <span className="font-bold text-white">{(request.payload as Part).description}</span></p>
    {request.pmReview && (
      <p className="text-[10px] font-black uppercase text-orange-400">PM Status: {request.pmReview}</p>
    )}
  </div>
)}</div><div className="flex gap-2"><button onClick={() => handleRequestReview(request, 'APPROVED')} className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-green-400 text-xs font-black uppercase tracking-widest">Approve</button><button onClick={() => handleRequestReview(request, 'REJECTED')} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 text-xs font-black uppercase tracking-widest">Reject</button></div></div></div>))}</div><button onClick={() => setReviewRequestRO(null)} className="text-xs text-slate-500 hover:text-white mt-6 w-full text-center">Close</button></div></div>)}
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
     {invoicingRO && <InvoiceModal ro={repairOrders.find(r => r.id === invoicingRO.id) || invoicingRO} hourlyRate={hourlyRate} taxRate={taxRate} overridePin={overridePin} onClose={() => setInvoicingRO(null)} onFinalize={handleFinalizeInvoice} />}
      
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
