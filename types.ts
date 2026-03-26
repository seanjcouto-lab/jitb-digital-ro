export enum UserRole {
  SERVICE_MANAGER = 'SERVICE_MANAGER',
  PARTS_MANAGER = 'PARTS_MANAGER',
  INVENTORY_MANAGER = 'INVENTORY_MANAGER',
  TECHNICIAN = 'TECHNICIAN',
  BILLING = 'BILLING',
  DATABASE = 'DATABASE',
  METRICS = 'METRICS',
  ADMIN = 'ADMIN',
}

export enum UserPrivilege {
  DEVELOPER = 'DEVELOPER',
}

export interface LoggedInUser {
  id: string;
  name: string;
  role: UserRole;
  privileges: UserPrivilege[];
  title?: string;
  techId?: string;
  shopId?: string;
}

export enum ROStatus {
  STAGED = 'STAGED',
  AUTHORIZED = 'AUTHORIZED',
  PARTS_PENDING = 'PARTS_PENDING',
  PARTS_READY = 'PARTS_READY',
  READY_FOR_TECH = 'READY_FOR_TECH',
  ACTIVE = 'ACTIVE',
  
  HOLD = 'HOLD',
  PENDING_INVOICE = 'PENDING_INVOICE',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED'
}

export enum PartStatus {
  REQUIRED = 'REQUIRED',
  IN_BOX = 'IN_BOX',
  MISSING = 'MISSING',
  SPECIAL_ORDER = 'SPECIAL_ORDER',
  USED = 'USED',
  // For tech requests
  APPROVAL_PENDING = 'APPROVAL_PENDING',
  RETURNED = 'RETURNED',
  DECLINED = 'DECLINED',
  NOT_USED = 'NOT_USED',
  REQUESTED = 'REQUESTED'
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  OVERDUE = 'OVERDUE'
}

export enum CollectionsStatus {
  NONE = 'NONE',
  REMINDER_SENT = 'REMINDER_SENT',
  PHONE_CALL_SCHEDULED = 'PHONE_CALL_SCHEDULED',
  FINAL_NOTICE_SENT = 'FINAL_NOTICE_SENT',
  IN_COLLECTIONS = 'IN_COLLECTIONS'
}

export interface Payment {
  date: number;
  amount: number;
  method: 'Credit Card' | 'Check' | 'Cash' | 'ACH';
  reference?: string;
}

export interface Part {
  partNumber: string;
  description: string;
  category: string;
  binLocation: string;
  msrp: number;
  dealerPrice: number;
  cost: number;
  quantityOnHand: number;
  reorderPoint: number;
  supersedesPart: string | null;
  status?: PartStatus;
  isCustom?: boolean;
  missingReason?: string;
  missingReasonNotes?: string;
  notUsedReason?: string;
  notUsedNotes?: string;
  notUsedTimestamp?: number;
  shopId: string;
}

export interface Directive {
  id: string;
  title: string;
  isCompleted: boolean;
  completionTimestamp?: number;
  requiredParts?: string[]; // Array of part numbers
  evidence?: {
    type: 'photo' | 'video' | 'audio';
    url: string;
  }[];
  isApproved?: boolean; // Directives from tech need approval
}

export interface WorkSession {
  startTime: number;
  endTime?: number;
}

export interface RORequest {
  id: string;
  roId: string;
  type: 'PART' | 'DIRECTIVE';
  payload: Part | { title: string };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedBy: 'TECHNICIAN';
  timestamp: number;
  decision?: 'FILL_FROM_STOCK' | 'SPECIAL_ORDER' | 'REJECT';
  pmReview?: 'MISSING' | 'SPECIAL_ORDER';
}

export interface Technician {
  id: string;
  name: string;
}

export interface RepairOrder {
  id: string;
  customerName: string;
  customerPhones: string[];
  customerEmails: string[];
  customerAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  customerNotes: string | null;
  jobComplaint: string | null;
  vesselName: string;
  vesselHIN: string;
  engineSerial: string;
  status: ROStatus;
  parts: Part[];
  directives: Directive[];
  workSessions: WorkSession[];
  laborDescription: string | null;
  authorizationType: 'digital' | 'verbal' | null;
  authorizationTimestamp: number | null;
  authorizationData: string | null;
  
  // New Billing Fields
  invoiceTotal: number | null;
  paymentStatus: PaymentStatus | null;
  payments: Payment[] | null;
  dateInvoiced: number | null;
  datePaid: number | null;
  collectionsStatus: CollectionsStatus | null;
  taxExempt: boolean | null;
  taxExemptId: string | null;

  // Added for richer data
  boatMake: string | null;
  boatModel: string | null;
  boatYear: string | null;
  boatLength: string | null;
  engineMake: string | null;
  engineModel: string | null;
  engineYear: string | null;
  engineHorsepower: string | null;
  // For new features
  requests: RORequest[] | null;
  technicianId: string | null;
  technicianName: string | null;
  shopId: string;
}

export interface VesselHistory {
  vesselHIN: string;
  customerName: string;
  customerPhones: string[];
  customerEmails: string[];
  customerAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  customerNotes: string | null;
  status: 'COMPLETE' | 'INCOMPLETE';
  unresolvedNotes: string;
  boatMake: string;
  boatModel: string;
  boatYear: string;
  boatLength: string;
  engineMake: string;
  engineModel: string;
  engineYear: string;
  engineHorsepower: string;
  engineSerial: string;
  pastROs: {
    id: string;
    date: string;
    summary: string;
    partsUsed: { partNumber: string; description: string }[];
    technicianName: string | null;
    laborHours: number | null;
    invoiceTotal: number | null;
    completedDirectives: { id: string; description: string }[];
  }[];
}

export interface AppConfig {
  logoUrl: string;
  companyName: string;
  hourlyRate: number;
  taxRate: number;
  overridePin: string;
  themeColors: {
    primary: string;
    secondary: string;
    accent: string;
  }
}

export type InventoryAlert = {
  id: string;
  partNumber: string;
  message: string;
  timestamp: number;
  roId: string;
  reason: string;
}

export interface ClipboardEntry {
  id?: number;
  partNumber: string;
  description: string;
  quantity: number;
  timestamp: number;
  roId: string;
  technicianName?: string;
}