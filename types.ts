export enum UserRole {
  SERVICE_MANAGER = 'SERVICE_MANAGER',
  PARTS_MANAGER = 'PARTS_MANAGER',
  INVENTORY_MANAGER = 'INVENTORY_MANAGER',
  TECHNICIAN = 'TECHNICIAN',
  BILLING = 'BILLING',
  DATABASE = 'DATABASE',
  METRICS = 'METRICS',
  CALENDAR = 'CALENDAR',
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
  REQUESTED = 'REQUESTED',
  ON_ORDER = 'ON_ORDER'
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
  quantity?: number;
  supersedesPart: string | null;
  status?: PartStatus;
  isCustom?: boolean;
  missingReason?: string;
  missingReasonNotes?: string;
  notUsedReason?: string;
  notUsedNotes?: string;
  notUsedTimestamp?: number;
  shopId: string;
  source?: 'onhand' | 'catalog' | 'suzuki';  // Import source — on-hand stock vs distributor catalog
  vendor?: string;                             // Vendor/manufacturer name from catalog
  upc?: string;                                // UPC/barcode from catalog
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

export interface MediaRecord {
  id: string;                    // UUID
  roId: string;                  // repair order ID
  directiveId: string | null;    // null = general labor note / job complaint media
  shopId: string;
  type: 'photo' | 'video' | 'audio';
  mimeType: string;              // e.g. 'image/jpeg', 'video/webm', 'audio/webm'
  blob: Blob | null;              // actual media data — null for records hydrated from Supabase
  fileName: string;              // e.g. 'abc123.jpg'
  createdAt: number;             // timestamp
  syncStatus: 'pending' | 'synced' | 'failed';
  supabaseUrl: string | null;    // permanent URL after Supabase Storage sync
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

export interface Company {
  companyId: string;
  shopId: string;
  companyName: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  createdAt?: string;
}

export interface Contact {
  contactId: string;
  companyId: string;
  shopId: string;
  fullName: string;
  phones: string[];
  emails: string[];
  isPrimary: boolean;
  createdAt?: string;
}

export interface Vessel {
  vesselId: string;
  companyId: string;
  shopId: string;
  vesselName?: string;
  hin?: string;
  boatMake?: string;
  boatModel?: string;
  boatYear?: string;
  boatLength?: string;
  createdAt?: string;
}

export interface Engine {
  engineId: string;
  vesselId: string;
  shopId: string;
  engineMake?: string;
  engineModel?: string;
  engineYear?: string;
  engineHorsepower?: string;
  engineSerial?: string;
  engineHours?: string;
  engineType?: string;
  fuelType?: string;
  createdAt?: string;
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
  engineHours?: number | null;
  engineHorsepower: string | null;
  // For new features
  requests: RORequest[] | null;
  technicianId: string | null;
  technicianName: string | null;
  shopId: string;
  companyId?: string;
  contactId?: string;
  vesselId?: string;
  engineId?: string;
  scheduledDate?: string | null;   // ISO date string — when the job is scheduled for service
  arrivalDate?: string | null;     // ISO date string — when the boat physically arrives on yard
  estimatedPickupDate?: string | null; // ISO date string — when customer picks up the boat (set at billing)
  jobCategory?: string | null;     // Job type category name (from shop's configured list)
  evidence?: { type: 'photo' | 'video' | 'audio'; url: string }[]; // RO-level evidence (intake attachments, general media)
  updatedAt?: number;              // epoch ms — set on every local mutation, used for cross-device sync conflict resolution
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
  engineHours?: number;
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

export interface JobCategory {
  name: string;
  color: string; // Tailwind color class or hex (e.g. 'orange', '#F97316')
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
  };
  dockCapacity?: number;          // Target dock capacity — soft warning, no hard block
  boardLeadTimeDays?: number;     // Days before drop-off when RO appears on board (default 14)
  jobCategories?: JobCategory[];  // Shop-configurable job type categories with colors
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