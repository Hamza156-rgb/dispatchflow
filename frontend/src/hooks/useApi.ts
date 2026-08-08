import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi, invoicesApi, paymentsApi, reportsApi, profileApi, loadsApi, loadBoardApi, configApi, teamApi, adminApi, downloadInvoicePdf } from '../lib/api';
import type { AppConfig, ClientPayload, CreateInvoicePayload, PaymentPayload, ProfilePayload, LoadPayload, LoadBoardResult, LoadBoardSearchParams, LoadBoardStatus, LoadBoardSearchResponse, ParsedLoadResponse } from '../types';

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const QK = {
  clients: (params?: any) => ['clients', params],
  client: (id: string) => ['clients', id],
  invoices: (params?: any) => ['invoices', params],
  invoice: (id: string) => ['invoices', id],
  dashboard: () => ['reports', 'dashboard'],
  reports: (year?: number) => ['reports', year],
};

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
};

export const useUpdateClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClientPayload> }) => clientsApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: QK.client(id) });
    },
  });
};

export const useDeleteClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
};

export const useBulkCreateClients = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: any[]) => clientsApi.bulkCreate(rows),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
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
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

export const useUpdateInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => invoicesApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: QK.invoice(id) });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

export const useDeleteInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoicesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
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
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
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
    queryKey: ['reports', 'insights'],
    queryFn: () => reportsApi.insights(),
    staleTime: 30_000,
  });

export const useItemSuggestions = (clientId?: string) =>
  useQuery({
    queryKey: ['item-suggestions', clientId],
    queryFn: () => invoicesApi.itemSuggestions(clientId),
    enabled: true,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loads'] }),
  });
};

export const useUpdateLoad = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LoadPayload> }) => loadsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loads'] }),
  });
};

export const useDeleteLoad = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => loadsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loads'] }),
  });
};

export const useBulkCreateLoads = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: any[]) => loadsApi.bulkCreate(rows),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loads'] }),
  });
};

// ─── App config ───────────────────────────────────────────────────────────────
// Which optional features this deployment turns on. Never changes at runtime,
// so fetch once and keep it — the nav reads it on every render.
export const useAppConfig = () =>
  useQuery<AppConfig>({
    queryKey: ['config'],
    queryFn: () => configApi.get(),
    staleTime: Infinity,
    retry: 1,
  });

// ─── Load board (DAT) ─────────────────────────────────────────────────────────
export const useLoadBoardStatus = () =>
  useQuery<LoadBoardStatus>({ queryKey: ['loadboard', 'status'], queryFn: () => loadBoardApi.status() });

export const useConnectLoadBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { username: string; password?: string; label?: string }) => loadBoardApi.connect(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loadboard', 'status'] }),
  });
};

export const useDisconnectLoadBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => loadBoardApi.disconnect(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loadboard'] }),
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
      qc.invalidateQueries({ queryKey: ['loads'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

export const useParseLoadText = () =>
  useMutation<ParsedLoadResponse, any, string>({ mutationFn: (text) => loadBoardApi.parse(text) });

// ─── Team ─────────────────────────────────────────────────────────────────────
export const useTeam = () =>
  useQuery({ queryKey: ['team'], queryFn: () => teamApi.list(), staleTime: 60_000 });

export const useAddMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => teamApi.add(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
};

export const useRemoveMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teamApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
};

// ─── Super Admin ──────────────────────────────────────────────────────────────
export const useOrganizations = () =>
  useQuery({ queryKey: ['admin', 'organizations'], queryFn: () => adminApi.organizations(), staleTime: 60_000 });

export const useUpdateOrganization = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.updateOrg(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'organizations'] }),
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
