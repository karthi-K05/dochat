export interface User {
  id: string;
  email: string;
  fullName: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  type: 'Bearer';
  user: User;
}

export interface BackendAuthResponse {
  accessToken: string;
  tokenType: 'Bearer' | string;
  expiresIn: number;
  email: string;
  fullName: string;
  role: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sourcesUsed?: string[];
}

export interface ChatResponse {
  sessionId: string;
  question: string;
  answer: string;
  sourcesUsed: string[];
  timestamp: string;
}

export interface BackendChatResponse {
  sessionId: string;
  question: string;
  answer: string;
  sourcesUsed: number;
  timestamp: string;
}

export interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  status: 'processing' | 'ready';
}

export interface BackendUploadedDocument {
  id: string;
  originalName: string;
  fileSize: number;
  mimeType?: string;
  status: string;
  chunkCount?: number;
  createdAt: string;
}
