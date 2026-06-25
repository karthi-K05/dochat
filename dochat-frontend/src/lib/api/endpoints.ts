import type {
  BackendAuthResponse,
  BackendChatResponse,
  BackendUploadedDocument,
  AuthResponse,
  ChatResponse,
  ChatSession,
  LoginPayload,
  RegisterPayload,
  UploadedDocument,
} from '../../types/api';
import { apiClient } from './client';

type AuthApiResponse = AuthResponse | BackendAuthResponse;
type DocumentApiResponse = UploadedDocument | BackendUploadedDocument;
type ChatApiResponse = ChatResponse | BackendChatResponse;

function normalizeAuthResponse(response: AuthApiResponse): AuthResponse {
  if ('user' in response) {
    return response;
  }

  return {
    token: response.accessToken,
    type: 'Bearer',
    user: {
      id: response.email,
      email: response.email,
      fullName: response.fullName,
    },
  };
}

function normalizeDocument(response: DocumentApiResponse): UploadedDocument {
  if ('name' in response) {
    return response;
  }

  return {
    id: response.id,
    name: response.originalName,
    size: response.fileSize,
    uploadedAt: response.createdAt,
    status: response.status === 'COMPLETED' ? 'ready' : 'processing',
  };
}

function normalizeChatResponse(response: ChatApiResponse): ChatResponse {
  if (Array.isArray(response.sourcesUsed)) {
    return response as ChatResponse;
  }

  return {
    ...response,
    sourcesUsed: [],
  };
}

export const authApi = {
  register: async (payload: RegisterPayload) => {
    const { data } = await apiClient.post<AuthApiResponse>('/api/v1/auth/register', payload);
    return normalizeAuthResponse(data);
  },
  login: async (payload: LoginPayload) => {
    const { data } = await apiClient.post<AuthApiResponse>('/api/v1/auth/login', payload);
    return normalizeAuthResponse(data);
  },
};

export const documentsApi = {
  list: async () => {
    const { data } = await apiClient.get<DocumentApiResponse[]>('/api/v1/documents');
    return data.map(normalizeDocument);
  },
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await apiClient.post<DocumentApiResponse>(
      '/api/v1/documents/upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return normalizeDocument(data);
  },
};

export const chatApi = {
  listSessions: async () => {
    const { data } = await apiClient.get<ChatSession[]>('/api/v1/chat/sessions');
    return data;
  },
  createSession: async () => {
    const { data } = await apiClient.post<ChatSession>('/api/v1/chat/sessions');
    return data;
  },
  sendMessage: async (sessionId: string, question: string) => {
    const { data } = await apiClient.post<ChatApiResponse>(
      `/api/v1/chat/sessions/${sessionId}/message`,
      { question },
    );
    return normalizeChatResponse(data);
  },
};
