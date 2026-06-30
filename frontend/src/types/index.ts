// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  fullName: string;
  email: string;
  companyName: string;
  phoneNumber?: string;
  address?: string;
  logoUrl?: string;
  taxNumber?: string;
  plan?: string;
  role?: 'OWNER' | 'MEMBER';
  isSuperAdmin?: boolean;
  accountStatus?: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  maxUsers?: number;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  companyName: string;
  phoneNumber?: string;
  plan?: 'STARTER' | 'GROWTH' | 'BUSINESS';
}

// ─── Client ───────────────────────────────────────────────────────────────────
export interface Client {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  notes?: string;
  createdAt: string;
  _count?: { invoices: number };
  invoices?: Invoice[];
}

export interface ClientPayload {
  companyName: string;
  contactPerson: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  notes?: string;
}

// ─── Invoice ──────────────────────────────────────────────────────────────────
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  sortOrder?: number;
}

export interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}

export type PaymentMethod = 'BANK_TRANSFER' | 'CHECK' | 'CASH' | 'CREDIT_CARD' | 'ACH' | 'OTHER';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  terms?: string;
  sentAt?: string;
  paidAt?: string;
  createdAt: string;
  clientId: string;
  client: Pick<Client, 'id' | 'companyName' | 'contactPerson' | 'email' | 'phone'>;
  items: InvoiceItem[];
  payments?: Payment[];
}

export interface CreateInvoicePayload {
  clientId: string;
  issueDate: string;
  dueDate: string;
  taxRate?: number;
  notes?: string;
  terms?: string;
  items: Omit<InvoiceItem, 'id' | 'amount'>[];
}

// ─── Load (dispatch board) ──────────────────────────────────────────────────────
export type LoadStatus = 'PENDING' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED';
export type LoadPaymentStatus = 'UNPAID' | 'PAID';

export interface Load {
  id: string;
  loadNumber: string;
  originCity?: string;
  originState?: string;
  destCity?: string;
  destState?: string;
  pickupAt?: string;
  deliveryAt?: string;
  miles?: number | string | null;
  rate: number | string;
  equipment?: string;
  weight?: string;
  commodity?: string;
  driver?: string;
  referenceNumber?: string;
  status: LoadStatus;
  paymentStatus: LoadPaymentStatus;
  notes?: string;
  createdAt: string;
  clientId: string;
  client: { id: string; companyName: string };
}

export interface LoadsResponse {
  loads: Load[];
  total: number;
  page: number;
  totalPages: number;
  summary: {
    totalLoads: number;
    pending: number;
    active: number;
    delivered: number;
    totalRevenue: number;
    unpaidAmount: number;
  };
}

export interface LoadPayload {
  clientId: string;
  originCity?: string;
  originState?: string;
  destCity?: string;
  destState?: string;
  pickupAt?: string;
  deliveryAt?: string;
  miles?: number | string;
  rate: number | string;
  equipment?: string;
  weight?: string;
  commodity?: string;
  driver?: string;
  referenceNumber?: string;
  status?: LoadStatus;
  paymentStatus?: LoadPaymentStatus;
  notes?: string;
}

// ─── API Responses ────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ClientsResponse {
  clients: Client[];
  total: number;
  page: number;
  totalPages: number;
}

export interface InvoicesResponse {
  invoices: Invoice[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Reports ──────────────────────────────────────────────────────────────────
export interface MonthlyRevenue {
  month: number;
  revenue: number;
  count: number;
}

export interface StatusCount {
  status: InvoiceStatus;
  _count: { status: number };
  _sum: { totalAmount: number };
}

export interface TopClient {
  name: string;
  revenue: number;
  count: number;
}

export interface ReportsData {
  monthlyRevenue: MonthlyRevenue[];
  statusCounts: StatusCount[];
  topClients: TopClient[];
  year: number;
}

export interface DashboardData {
  totalClients: number;
  invoiceCounts: StatusCount[];
  monthlyRevenue: number;
  recentInvoices: (Invoice & { client: Pick<Client, 'companyName'> })[];
}

// ─── Forms ────────────────────────────────────────────────────────────────────
export interface PaymentPayload {
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
}

export interface ProfilePayload {
  fullName: string;
  companyName: string;
  phoneNumber?: string;
  address?: string;
  taxNumber?: string;
  logoUrl?: string | null;
}
