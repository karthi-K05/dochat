import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { tokenStorage, userStorage } from '../storage';
import { handleMockRequest } from './mockApi';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false';
const MOCK_SENTINEL = '__DOCHAT_MOCK_REQUEST__';
const AUTH_PATH_PREFIX = '/api/v1/auth/';

interface MockRequestError extends AxiosError {
  isMockRequest?: boolean;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (USE_MOCK_API) {
    const error = new AxiosError(MOCK_SENTINEL) as MockRequestError;
    error.config = config;
    error.isMockRequest = true;
    throw error;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: MockRequestError) => {
    if (error.isMockRequest && error.config) {
      const response = await handleMockRequest(error.config);
      if (response.status >= 400) {
        return Promise.reject(
          new AxiosError(
            (response.data as { message?: string }).message ?? response.statusText,
            undefined,
            error.config,
            undefined,
            response,
          ),
        );
      }

      return response;
    }

    const status = error.response?.status;
    const requestUrl = error.config?.url ?? '';
    const isAuthRequest = requestUrl.startsWith(AUTH_PATH_PREFIX);

    if ((status === 401 || status === 403) && !isAuthRequest) {
      tokenStorage.clearToken();
      userStorage.clearUser();

      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  },
);

export const apiConfig = {
  baseUrl: API_BASE_URL,
  usingMockApi: USE_MOCK_API,
};
