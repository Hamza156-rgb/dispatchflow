import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi, invoicesApi, paymentsApi, reportsApi, profileApi, loadsApi, teamApi, adminApi, downloadInvoicePdf } from '../lib/api';
import type { ClientPayload, CreateInvoicePayload, PaymentPayload, ProfilePayload, LoadPayload } from '../types';

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

// ─── Invoices ─────────────────────────────────────────────────────────────────
export const useInvoices = (params?: {
  page?: number; limit?: number; status?: string; clientId?: string; search?: string;
}) =>
  useQuery({
    queryKey: QK.invoices(params),
    queryFn: () => invoicesApi.list(params),
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

// ─── Team ─────────────────────────────────────────────────────────────────────
export const useTeam = () =>
  useQuery({ queryKey: ['team'], queryFn: () => teamApi.list() });

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
  useQuery({ queryKey: ['admin', 'organizations'], queryFn: () => adminApi.organizations() });

export const useUpdateOrganization = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.updateOrg(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'organizations'] }),
  });
};

// ─── Profile ──────────────────────────────────────────────────────────────────
export const useUpdateProfile = () =>
  useMutation({
    mutationFn: (data: ProfilePayload) => profileApi.update(data),
  });
