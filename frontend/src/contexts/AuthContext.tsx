import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getToken, apiRequest } from '../api/client';

interface User {
  id: number;
  email: string;
  uuid: string;
  token: string;
  is_admin: number;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null, isLoading: true, isAuthenticated: false, isAdmin: false,
  login: async () => {}, register: async () => {}, logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await apiRequest<{ data: User }>('/user/profile');
      setUser(res.data);
    } catch {
      localStorage.removeItem('token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const loginFn = async (email: string, password: string) => {
    const { login } = await import('../api/client');
    const data = await login(email, password);
    setUser(data.user as unknown as User);
  };

  const registerFn = async (email: string, password: string) => {
    const { register } = await import('../api/client');
    const data = await register(email, password);
    setUser(data.user as unknown as User);
  };

  const logoutFn = () => {
    setUser(null);
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user, isLoading,
      isAuthenticated: !!user,
      isAdmin: user?.is_admin === 1,
      login: loginFn, register: registerFn, logout: logoutFn,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
