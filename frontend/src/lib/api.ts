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
