// src/store/slices/auth.slice.ts
import { StateCreator } from 'zustand';
import { User, LoginCredentials, RegisterCredentials } from '@/types/user';
import api from '@/lib/axios';

export interface AuthSlice {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/login', credentials);
      if (response.data.success) {
        set({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
        });
      }
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  },

  register: async (credentials: RegisterCredentials) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/register', credentials);
      if (response.data.success) {
        set({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
        });
      }
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      // Optionally clear cart or other stores
    }
  },

  fetchUser: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/auth/me');
      if (response.data.success) {
        set({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
});
