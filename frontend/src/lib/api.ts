import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('df_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 — redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('df_token');
      localStorage.removeItem('df_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── App config (optional features this deployment exposes) ───────────────────
export const configApi = {
  get: () => api.get('/config').then(r => r.data),
};

export const plansApi = {
  publicList: () => api.get('/plans').then(r => r.data),
  adminList: () => api.get('/admin/plans').then(r => r.data),
  create: (data: any) => api.post('/admin/plans', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/admin/plans/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/admin/plans/${id}`).then(r => r.data),
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: any) => api.post('/auth/register', data).then(r => r.data),
  login: (data: any) => api.post('/auth/login', data).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }).then(r => r.data),
};

// ─── Clients ──────────────────────────────────────────────────────────────────
export const clientsApi = {
  list: (params?: any) => api.get('/clients', { params }).then(r => r.data),
  get: (id: string) => api.get(`/clients/${id}`).then(r => r.data),
  create: (data: any) => api.post('/clients', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/clients/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/clients/${id}`).then(r => r.data),
  bulkCreate: (rows: any[]) => api.post('/clients/bulk', { rows }).then(r => r.data),
};

// ─── Invoices ─────────────────────────────────────────────────────────────────
export const invoicesApi = {
  list: (params?: any) => api.get('/invoices', { params }).then(r => r.data),
  get: (id: string) => api.get(`/invoices/${id}`).then(r => r.data),
  create: (data: any) => api.post('/invoices', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/invoices/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/invoices/${id}`).then(r => r.data),
  downloadPdf: (id: string) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }).then(r => r.data),
  sendEmail: (id: string, message?: string) => api.post(`/invoices/${id}/send`, { message }).then(r => r.data),
  itemSuggestions: (clientId?: string) => api.get('/invoices/item-suggestions', { params: { clientId } }).then(r => r.data),
};

// ─── Payments ─────────────────────────────────────────────────────────────────
export const paymentsApi = {
  record: (data: any) => api.post('/payments', data).then(r => r.data),
};

// ─── Loads ────────────────────────────────────────────────────────────────────
export const loadsApi = {
  list: (params?: any) => api.get('/loads', { params }).then(r => r.data),
  get: (id: string) => api.get(`/loads/${id}`).then(r => r.data),
  create: (data: any) => api.post('/loads', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/loads/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/loads/${id}`).then(r => r.data),
  bulkCreate: (rows: any[]) => api.post('/loads/bulk', { rows }).then(r => r.data),
};

// ─── Load board (DAT) ─────────────────────────────────────────────────────────
export const loadBoardApi = {
  status: () => api.get('/loadboard/status').then(r => r.data),
  connect: (data: { username: string; password?: string; label?: string }) =>
    api.post('/loadboard/connect', data).then(r => r.data),
  disconnect: () => api.delete('/loadboard/connect').then(r => r.data),
  // Board searches hit a third-party API — allow longer than the 15s default.
  search: (params: any) => api.post('/loadboard/search', params, { timeout: 30000 }).then(r => r.data),
  import: (results: any[]) => api.post('/loadboard/import', { results }).then(r => r.data),
  parse: (text: string) => api.post('/loadboard/parse', { text }).then(r => r.data),
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportsApi = {
  dashboard: () => api.get('/reports/dashboard').then(r => r.data),
  reports: (year?: number) => api.get('/reports', { params: { year } }).then(r => r.data),
  insights: () => api.get('/reports/insights').then(r => r.data),
};

// ─── Profile ──────────────────────────────────────────────────────────────────
export const profileApi = {
  update: (data: any) => api.put('/profile', data).then(r => r.data),
};

// ─── Team (workspace members) ───────────────────────────────────────────────────
export const teamApi = {
  list: () => api.get('/team').then(r => r.data),
  add: (data: any) => api.post('/team', data).then(r => r.data),
  remove: (id: string) => api.delete(`/team/${id}`).then(r => r.data),
};

// ─── Super Admin ────────────────────────────────────────────────────────────────
export const adminApi = {
  organizations: () => api.get('/admin/organizations').then(r => r.data),
  updateOrg: (id: string, data: any) => api.put(`/admin/organizations/${id}`, data).then(r => r.data),
  recordPayment: (id: string) => api.post(`/admin/organizations/${id}/pay`).then(r => r.data),
  plans: {
    list: () => plansApi.adminList(),
    create: (data: any) => plansApi.create(data),
    update: (id: string, data: any) => plansApi.update(id, data),
    remove: (id: string) => plansApi.remove(id),
  },
};

// ─── PDF Download Helper ──────────────────────────────────────────────────────
export const downloadInvoicePdf = async (invoiceId: string, invoiceNumber: string) => {
  const blob = await invoicesApi.downloadPdf(invoiceId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${invoiceNumber}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};

export default api;
