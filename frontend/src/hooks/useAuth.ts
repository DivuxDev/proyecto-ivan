'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import type { User } from '@/types';

export function useAuth() {
  const router = useRouter();
  const { user, token, isAuthenticated, setAuth, clearAuth } = useAuthStore();

  const login = async (email: string, password: string): Promise<User> => {
    const response = await authApi.login(email, password);
    const { user, token } = response.data.data as { user: User; token: string };
    setAuth(user, token);
    return user;
  };

  const register = async (name: string, email: string, password: string): Promise<User> => {
    const response = await authApi.register(name, email, password);
    const { user, token } = response.data.data as { user: User; token: string };
    setAuth(user, token);
    return user;
  };

  const logout = () => {
    clearAuth();
    router.push('/login');
  };

  return {
    user,
    token,
    isAuthenticated,
    isAdmin: user?.role === 'ADMIN',
    isWorker: user?.role === 'WORKER',
    login,
    register,
    logout,
    getErrorMessage,
  };
}
