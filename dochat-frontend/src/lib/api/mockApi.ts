import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type {
  AuthResponse,
  ChatResponse,
  ChatSession,
  LoginPayload,
  RegisterPayload,
  UploadedDocument,
  User,
} from '../../types/api';

interface MockDb {
  users: Array<User & { password: string }>;
  sessionsByUser: Record<string, ChatSession[]>;
  documentsByUser: Record<string, UploadedDocument[]>;
}

const DB_KEY = 'dochat.mock.db';
const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function readDb(): MockDb {
  const fallback: MockDb = {
    users: [
      {
        id: 'user-demo',
        email: 'karthik@test.com',
        password: 'password123',
        fullName: 'Demo Analyst',
      },
    ],
    sessionsByUser: {
      'user-demo': [
        {
          id: 'session-demo',
          title: 'Understanding uploaded contracts',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        },
      ],
    },
    documentsByUser: {
      'user-demo': [
        {
          id: 'doc-demo',
          name: 'vendor-agreement.pdf',
          size: 482_194,
          uploadedAt: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
          status: 'ready',
        },
      ],
    },
  };

  const stored = localStorage.getItem(DB_KEY);
  if (!stored) {
    localStorage.setItem(DB_KEY, JSON.stringify(fallback));
    return fallback;
  }

  try {
    return JSON.parse(stored) as MockDb;
  } catch {
    localStorage.setItem(DB_KEY, JSON.stringify(fallback));
    return fallback;
  }
}

function writeDb(db: MockDb) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function getBody<T>(data: unknown): T {
  return typeof data === 'string' ? (JSON.parse(data) as T) : (data as T);
}

function jsonResponse<T>(config: AxiosRequestConfig, status: number, data: T): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: status >= 400 ? 'Error' : 'OK',
    headers: {},
    config,
  } as AxiosResponse<T>;
}

function getAuthenticatedUser(config: AxiosRequestConfig, db: MockDb) {
  const header = config.headers?.Authorization ?? config.headers?.authorization;
  const token = String(header ?? '').replace('Bearer ', '');
  const userId = token.startsWith('mock-jwt-') ? token.replace('mock-jwt-', '') : '';
  return db.users.find((user) => user.id === userId) ?? null;
}

function requireUser(config: AxiosRequestConfig, db: MockDb) {
  const user = getAuthenticatedUser(config, db);
  if (!user) {
    return {
      ok: false as const,
      response: jsonResponse(config, 401, { message: 'Unauthorized' }),
    };
  }
  return { ok: true as const, user };
}

function makeAnswer(question: string, docs: UploadedDocument[]): string {
  const documentContext = docs.length
    ? `I checked your active repository, especially **${docs[0].name}**.`
    : 'I do not see an uploaded document yet, so I am answering from the chat context only.';

  return `${documentContext}

Here is a concise read on your question:

1. **Core answer:** ${question.trim()} points to a workflow where Dochat should combine authenticated chat sessions with document-grounded retrieval.
2. **Implementation note:** the frontend already sends \`{ question }\` to the session message endpoint, which matches the Spring Boot API contract.
3. **Next step:** upload the most relevant source files, then ask a targeted follow-up so Gemini can cite the right material.`;
}

export async function handleMockRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
  await delay(config.url?.includes('/message') ? 850 : 450);

  const db = readDb();
  const method = (config.method ?? 'get').toLowerCase();
  const url = config.url ?? '';

  if (method === 'post' && url.endsWith('/api/v1/auth/register')) {
    const payload = getBody<RegisterPayload>(config.data);
    if (db.users.some((user) => user.email.toLowerCase() === payload.email.toLowerCase())) {
      return jsonResponse(config, 409, { message: 'A user with this email already exists.' });
    }

    const user = {
      id: crypto.randomUUID(),
      email: payload.email,
      fullName: payload.fullName,
      password: payload.password,
    };
    db.users.push(user);
    db.sessionsByUser[user.id] = [];
    db.documentsByUser[user.id] = [];
    writeDb(db);

    return jsonResponse<AuthResponse>(config, 200, {
      token: `mock-jwt-${user.id}`,
      type: 'Bearer',
      user: { id: user.id, email: user.email, fullName: user.fullName },
    });
  }

  if (method === 'post' && url.endsWith('/api/v1/auth/login')) {
    const payload = getBody<LoginPayload>(config.data);
    const user = db.users.find(
      (candidate) =>
        candidate.email.toLowerCase() === payload.email.toLowerCase() &&
        candidate.password === payload.password,
    );

    if (!user) {
      return jsonResponse(config, 401, { message: 'Invalid email or password.' });
    }

    return jsonResponse<AuthResponse>(config, 200, {
      token: `mock-jwt-${user.id}`,
      type: 'Bearer',
      user: { id: user.id, email: user.email, fullName: user.fullName },
    });
  }

  const auth = requireUser(config, db);
  if (!auth.ok) return auth.response;
  const user = auth.user;

  if (method === 'get' && url.endsWith('/api/v1/chat/sessions')) {
    return jsonResponse(config, 200, db.sessionsByUser[user.id] ?? []);
  }

  if (method === 'post' && url.endsWith('/api/v1/chat/sessions')) {
    const now = new Date().toISOString();
    const session: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New research chat',
      createdAt: now,
      updatedAt: now,
    };
    db.sessionsByUser[user.id] = [session, ...(db.sessionsByUser[user.id] ?? [])];
    writeDb(db);
    return jsonResponse(config, 200, session);
  }

  if (method === 'post' && /\/api\/v1\/chat\/sessions\/[^/]+\/message$/.test(url)) {
    const payload = getBody<{ question: string }>(config.data);
    const segments = url.split('/');
    const sessionId = segments[segments.length - 2] ?? '';
    const docs = db.documentsByUser[user.id] ?? [];
    const sessions = db.sessionsByUser[user.id] ?? [];
    const session = sessions.find((item) => item.id === sessionId);
    if (session) {
      session.title =
        session.title === 'New research chat'
          ? payload.question.slice(0, 48)
          : session.title;
      session.updatedAt = new Date().toISOString();
      db.sessionsByUser[user.id] = [
        session,
        ...sessions.filter((item) => item.id !== sessionId),
      ];
      writeDb(db);
    }

    return jsonResponse<ChatResponse>(config, 200, {
      sessionId,
      question: payload.question,
      answer: makeAnswer(payload.question, docs),
      sourcesUsed: docs.slice(0, 3).map((doc) => doc.name),
      timestamp: new Date().toISOString(),
    });
  }

  if (method === 'get' && url.endsWith('/api/v1/documents')) {
    return jsonResponse(config, 200, db.documentsByUser[user.id] ?? []);
  }

  if (method === 'post' && url.endsWith('/api/v1/documents/upload')) {
    const formData = config.data as FormData;
    const file = formData.get('file') as File | null;
    const document: UploadedDocument = {
      id: crypto.randomUUID(),
      name: file?.name ?? 'uploaded-document.pdf',
      size: file?.size ?? 0,
      uploadedAt: new Date().toISOString(),
      status: 'ready',
    };
    db.documentsByUser[user.id] = [document, ...(db.documentsByUser[user.id] ?? [])];
    writeDb(db);
    return jsonResponse(config, 200, document);
  }

  return jsonResponse(config, 404, { message: `Mock route not implemented: ${method} ${url}` });
}
