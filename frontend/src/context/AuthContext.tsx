'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
} from '@/types/user';
import api from '@/lib/axios';
import { useRouter } from 'next/navigation';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  const fetchMe = async () => {
    try {
      const response = await api.get<{ success: boolean; user: User }>(
        '/auth/me'
      );
      if (response.data.success) {
        setUser(response.data.user);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    if (response.data.success) {
      setUser(response.data.user);
      router.push('/');
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    const response = await api.post<AuthResponse>(
      '/auth/register',
      credentials
    );
    if (response.data.success) {
      setUser(response.data.user);
      router.push('/');
    }
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
    router.push('/login');
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, isAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
};
