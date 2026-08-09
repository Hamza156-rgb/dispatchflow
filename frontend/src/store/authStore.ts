import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

export const AUTH_EXPIRED_EVENT = 'df:auth-expired';

export const clearAuthStorage = () => {
  localStorage.removeItem('df_token');
  localStorage.removeItem('df_user');
};

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('df_token', token);
        set({ user, token });
      },
      logout: () => {
        clearAuthStorage();
        set({ user: null, token: null });
      },
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'df_auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
