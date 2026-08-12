import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi, invoicesApi, paymentsApi, reportsApi, profileApi, loadsApi, loadBoardApi, configApi, teamApi, adminApi, downloadInvoicePdf, plansApi } from '../lib/api';
import type { AppConfig, ClientPayload, CreateInvoicePayload, PaymentPayload, ProfilePayload, LoadPayload, LoadBoardResult, LoadBoardSearchParams, LoadBoardStatus, LoadBoardSearchResponse, ParsedLoadResponse, PricingPlan } from '../types';

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const QK = {
  clientsRoot: ['clients'] as const,
  clients: (params?: any) => ['clients', params],
  client: (id: string) => ['clients', id],
  invoicesRoot: ['invoices'] as const,
  invoices: (params?: any) => ['invoices', params],
  invoice: (id: string) => ['invoices', id],
  reportsRoot: ['reports'] as const,
  dashboard: () => ['reports', 'dashboard'],
  reports: (year?: number) => ['reports', year],
  loadsRoot: ['loads'] as const,
  loadBoardRoot: ['loadboard'] as const,
  config: ['config'] as const,
  teamRoot: ['team'] as const,
  adminOrganizations: ['admin', 'organizations'] as const,
  adminPlans: ['admin', 'plans'] as const,
  publicPlans: ['public', 'plans'] as const,
  itemSuggestions: (clientId?: string) => ['item-suggestions', clientId],
};

const invalidate = (qc: ReturnType<typeof useQueryClient>, queryKey: readonly unknown[]) =>
  qc.invalidateQueries({ queryKey });

// ─── Clients ──────────────────────────────────────────────────────────────────
export const useClients = (params?: { page?: number; limit?: number; search?: string; sortBy?: string }) =>
  useQuery({
    queryKey: QK.clients(params),
    queryFn: () => clientsApi.list(params),
    staleTime: 30_000,
  });

export const useClient = (id: string) =>
  useQuery({
    queryKey: QK.client(id),
    queryFn: () => clientsApi.get(id),
    enabled: !!id,
  });

export const useCreateClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ClientPayload) => clientsApi.create(data),
    onSuccess: () => invalidate(qc, QK.clientsRoot),
  });
};

export const useUpdateClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClientPayload> }) => clientsApi.update(id, data),
    onSuccess: (_, { id }) => {
      invalidate(qc, QK.clientsRoot);
      qc.invalidateQueries({ queryKey: QK.client(id) });
    },
  });
};

export const useDeleteClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: () => invalidate(qc, QK.clientsRoot),
  });
};

export const useBulkCreateClients = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: any[]) => clientsApi.bulkCreate(rows),
    onSuccess: () => invalidate(qc, QK.clientsRoot),
  });
};

// ─── Invoices ─────────────────────────────────────────────────────────────────
export const useInvoices = (params?: {
  page?: number; limit?: number; status?: string; clientId?: string; search?: string;
}) =>
  useQuery({
    queryKey: QK.invoices(params),
    queryFn: () => invoicesApi.list(params),
    staleTime: 20_000,
  });

export const useInvoice = (id: string) =>
  useQuery({
    queryKey: QK.invoice(id),
    queryFn: () => invoicesApi.get(id),
    enabled: !!id,
  });

export const useCreateInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInvoicePayload) => invoicesApi.create(data),
    onSuccess: () => {
      invalidate(qc, QK.invoicesRoot);
      invalidate(qc, QK.reportsRoot);
    },
  });
};

export const useUpdateInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => invoicesApi.update(id, data),
    onSuccess: (_, { id }) => {
      invalidate(qc, QK.invoicesRoot);
      qc.invalidateQueries({ queryKey: QK.invoice(id) });
      invalidate(qc, QK.reportsRoot);
    },
  });
};

export const useDeleteInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoicesApi.delete(id),
    onSuccess: () => {
      invalidate(qc, QK.invoicesRoot);
      invalidate(qc, QK.reportsRoot);
    },
  });
};

export const useSendInvoiceEmail = () =>
  useMutation({
    mutationFn: ({ id, message }: { id: string; message?: string }) => invoicesApi.sendEmail(id, message),
  });

export const useDownloadPdf = () =>
  useMutation({
    mutationFn: ({ id, invoiceNumber }: { id: string; invoiceNumber: string }) =>
      downloadInvoicePdf(id, invoiceNumber),
  });

// ─── Payments ─────────────────────────────────────────────────────────────────
export const useRecordPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PaymentPayload) => paymentsApi.record(data),
    onSuccess: () => {
      invalidate(qc, QK.invoicesRoot);
      invalidate(qc, QK.reportsRoot);
    },
  });
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const useDashboard = () =>
  useQuery({
    queryKey: QK.dashboard(),
    queryFn: () => reportsApi.dashboard(),
    staleTime: 30_000,
  });

export const useReports = (year?: number) =>
  useQuery({
    queryKey: QK.reports(year),
    queryFn: () => reportsApi.reports(year),
  });

export const useInsights = () =>
  useQuery({
    queryKey: [...QK.reportsRoot, 'insights'],
    queryFn: () => reportsApi.insights(),
    staleTime: 30_000,
  });

export const useItemSuggestions = (clientId?: string) =>
  useQuery({
    queryKey: QK.itemSuggestions(clientId),
    queryFn: () => invoicesApi.itemSuggestions(clientId),
    enabled: clientId !== undefined,
  });

// ─── Loads ────────────────────────────────────────────────────────────────────
export const useLoads = (params?: { page?: number; limit?: number; status?: string; paymentStatus?: string; clientId?: string; search?: string; from?: string; to?: string }) =>
  useQuery({
    queryKey: ['loads', params],
    queryFn: () => loadsApi.list(params),
    staleTime: 20_000,
  });

export const useCreateLoad = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: LoadPayload) => loadsApi.create(data),
    onSuccess: () => invalidate(qc, QK.loadsRoot),
  });
};

export const useUpdateLoad = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LoadPayload> }) => loadsApi.update(id, data),
    onSuccess: () => invalidate(qc, QK.loadsRoot),
  });
};

export const useDeleteLoad = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => loadsApi.delete(id),
    onSuccess: () => invalidate(qc, QK.loadsRoot),
  });
};

export const useBulkCreateLoads = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: any[]) => loadsApi.bulkCreate(rows),
    onSuccess: () => invalidate(qc, QK.loadsRoot),
  });
};

// ─── App config ───────────────────────────────────────────────────────────────
// Which optional features this deployment turns on. Never changes at runtime,
// so fetch once and keep it — the nav reads it on every render.
export const useAppConfig = () =>
  useQuery<AppConfig>({
    queryKey: QK.config,
    queryFn: () => configApi.get(),
    staleTime: Infinity,
    retry: 1,
  });

// ─── Load board (DAT) ─────────────────────────────────────────────────────────
export const useLoadBoardStatus = () =>
  useQuery<LoadBoardStatus>({ queryKey: [...QK.loadBoardRoot, 'status'], queryFn: () => loadBoardApi.status() });

export const useConnectLoadBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { username: string; password?: string; label?: string }) => loadBoardApi.connect(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...QK.loadBoardRoot, 'status'] }),
  });
};

export const useDisconnectLoadBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => loadBoardApi.disconnect(),
    onSuccess: () => invalidate(qc, QK.loadBoardRoot),
  });
};

// A mutation, not a query: searches are metered against the customer's own
// board subscription, so they only ever run when the dispatcher asks.
export const useSearchLoadBoard = () =>
  useMutation<LoadBoardSearchResponse, any, LoadBoardSearchParams>({
    mutationFn: (params) => loadBoardApi.search(params),
  });

export const useImportLoadBoardResults = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (results: LoadBoardResult[]) => loadBoardApi.import(results),
    onSuccess: () => {
      invalidate(qc, QK.loadsRoot);
      invalidate(qc, QK.clientsRoot);
      invalidate(qc, QK.reportsRoot);
    },
  });
};

export const useParseLoadText = () =>
  useMutation<ParsedLoadResponse, any, string>({ mutationFn: (text) => loadBoardApi.parse(text) });

// ─── Team ─────────────────────────────────────────────────────────────────────
export const useTeam = () =>
  useQuery({ queryKey: QK.teamRoot, queryFn: () => teamApi.list(), staleTime: 60_000 });

export const useAddMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => teamApi.add(data),
    onSuccess: () => invalidate(qc, QK.teamRoot),
  });
};

export const useRemoveMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teamApi.remove(id),
    onSuccess: () => invalidate(qc, QK.teamRoot),
  });
};

// ─── Super Admin ──────────────────────────────────────────────────────────────
export const useOrganizations = () =>
  useQuery({ queryKey: QK.adminOrganizations, queryFn: () => adminApi.organizations(), staleTime: 60_000 });

export const useAdminPlans = () =>
  useQuery<{ plans: PricingPlan[] }>({ queryKey: QK.adminPlans, queryFn: () => plansApi.adminList(), staleTime: 60_000 });

export const usePublicPlans = () =>
  useQuery<{ plans: PricingPlan[] }>({ queryKey: QK.publicPlans, queryFn: () => plansApi.publicList(), staleTime: Infinity });

export const useCreatePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PricingPlan>) => adminApi.plans.create(data),
    onSuccess: () => invalidate(qc, QK.adminPlans),
  });
};

export const useUpdatePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PricingPlan> }) => adminApi.plans.update(id, data),
    onSuccess: () => invalidate(qc, QK.adminPlans),
  });
};

export const useDeletePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.plans.remove(id),
    onSuccess: () => invalidate(qc, QK.adminPlans),
  });
};

export const useUpdateOrganization = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.updateOrg(id, data),
    onSuccess: () => invalidate(qc, QK.adminOrganizations),
  });
};

export const useRecordOrgPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.recordPayment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'organizations'] }),
  });
};

// ─── Profile ──────────────────────────────────────────────────────────────────
export const useUpdateProfile = () =>
  useMutation({
    mutationFn: (data: ProfilePayload) => profileApi.update(data),
  });
