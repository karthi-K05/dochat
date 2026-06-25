import type { User } from '../types/api';

const TOKEN_KEY = 'dochat.jwt';
const USER_KEY = 'dochat.user';

export const tokenStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
};

export const userStorage = {
  getUser: (): User | null => {
    const value = localStorage.getItem(USER_KEY);
    if (!value) return null;

    try {
      return JSON.parse(value) as User;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  },
  setUser: (user: User) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  clearUser: () => localStorage.removeItem(USER_KEY),
};
