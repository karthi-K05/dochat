import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../lib/api/endpoints';
import { tokenStorage, userStorage } from '../lib/storage';
import type { LoginPayload, RegisterPayload, User } from '../types/api';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => userStorage.getUser());

  const persistSession = useCallback((token: string, nextUser: User) => {
    tokenStorage.setToken(token);
    userStorage.setUser(nextUser);
    setUser(nextUser);
  }, []);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const response = await authApi.login(payload);
      persistSession(response.token, response.user);
    },
    [persistSession],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const response = await authApi.register(payload);
      persistSession(response.token, response.user);
    },
    [persistSession],
  );

  const logout = useCallback(() => {
    tokenStorage.clearToken();
    userStorage.clearUser();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user && tokenStorage.getToken()),
      login,
      register,
      logout,
    }),
    [login, logout, register, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
