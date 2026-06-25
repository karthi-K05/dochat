import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bot,
  ChevronRight,
  FileText,
  LogOut,
  MessageSquarePlus,
  PanelLeft,
  Search,
  Send,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';
import { DocumentUpload } from '../components/DocumentUpload';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { apiConfig } from '../lib/api/client';
import { chatApi, documentsApi } from '../lib/api/endpoints';
import type { ChatMessage, ChatSession, UploadedDocument } from '../types/api';

const examplePrompts = [
  'Summarize the uploaded file and highlight open risks.',
  'What are the key action items from this document?',
  'Draft a client-ready answer using the repository context.',
];

function formatRelative(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.max(1, Math.round(diff / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [isBooting, setIsBooting] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState('');
  const feedRef = useRef<HTMLDivElement | null>(null);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [activeSessionId, sessions],
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const [nextSessions, nextDocuments] = await Promise.all([
          chatApi.listSessions(),
          documentsApi.list(),
        ]);
        if (cancelled) return;
        setSessions(nextSessions);
        setDocuments(nextDocuments);
        setActiveSessionId(nextSessions[0]?.id ?? null);
      } catch {
        if (!cancelled) setError('Could not load workspace data.');
      } finally {
        if (!cancelled) setIsBooting(false);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!feedRef.current) return;
    feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages, isSending]);

  const handleCreateSession = async () => {
    setError('');
    const session = await chatApi.createSession();
    setSessions((current) => [session, ...current.filter((item) => item.id !== session.id)]);
    setActiveSessionId(session.id);
    setMessages([]);
    setSidebarOpen(false);
  };

  const handleUpload = async (file: File) => {
    setError('');
    setIsUploading(true);
    try {
      const document = await documentsApi.upload(file);
      setDocuments((current) => [document, ...current]);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const ensureSession = async () => {
    if (activeSessionId) return activeSessionId;
    const session = await chatApi.createSession();
    setSessions((current) => [session, ...current]);
    setActiveSessionId(session.id);
    return session.id;
  };

  const sendQuestion = async (nextQuestion = question) => {
    const trimmed = nextQuestion.trim();
    if (!trimmed || isSending) return;

    setError('');
    setQuestion('');
    setIsSending(true);

    const sessionId = await ensureSession();
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages((current) => [...current, userMessage]);

    try {
      const response = await chatApi.sendMessage(sessionId, trimmed);
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.answer,
        timestamp: response.timestamp,
        sourcesUsed: response.sourcesUsed,
      };
      setMessages((current) => [...current, assistantMessage]);
      const refreshed = await chatApi.listSessions();
      setSessions(refreshed);
    } catch {
      setError('Gemini could not answer that message. Please try again.');
      setQuestion(trimmed);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="flex h-screen overflow-hidden">
        <aside
          className={clsx(
            'fixed inset-y-0 left-0 z-40 flex w-[310px] flex-col border-r border-zinc-800 bg-zinc-950/95 p-4 transition-transform lg:static lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-zinc-950">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Dochat</h1>
                <p className="text-xs text-zinc-500">
                  {apiConfig.usingMockApi ? 'Mock API' : apiConfig.baseUrl}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-900 hover:text-white lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => void handleCreateSession()}
            className="mb-5 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200"
          >
            <MessageSquarePlus className="h-4 w-4" />
            New Chat
          </button>

          <div className="min-h-0 flex-1 space-y-6 overflow-hidden">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Repository
                </h2>
                <DocumentUpload onUpload={handleUpload} isUploading={isUploading} />
              </div>
              <div className="grid max-h-40 gap-2 overflow-y-auto pr-1">
                {documents.length ? (
                  documents.map((document) => (
                    <div
                      key={document.id}
                      className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3"
                    >
                      <FileText className="h-4 w-4 flex-none text-indigo-300" />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-zinc-100">{document.name}</p>
                        <p className="text-xs text-zinc-500">{formatBytes(document.size)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 text-sm text-zinc-500">
                    Upload files to ground Gemini responses.
                  </p>
                )}
              </div>
            </section>

            <section className="flex min-h-0 flex-1 flex-col">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Recent Chats
              </h2>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {isBooting ? (
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Spinner />
                    Loading sessions
                  </div>
                ) : sessions.length ? (
                  <div className="grid gap-1.5">
                    {sessions.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => {
                          setActiveSessionId(session.id);
                          setMessages([]);
                          setSidebarOpen(false);
                        }}
                        className={clsx(
                          'rounded-2xl px-3 py-3 text-left text-sm transition',
                          session.id === activeSessionId
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100',
                        )}
                      >
                        <span className="block truncate">{session.title}</span>
                        <span className="mt-1 block text-xs text-zinc-600">
                          {formatRelative(session.updatedAt)}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">No chats yet.</p>
                )}
              </div>
            </section>
          </div>

          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700 text-sm font-semibold">
                {user?.fullName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{user?.fullName}</p>
                <p className="truncate text-xs text-zinc-500">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {sidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            aria-label="Close sidebar overlay"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <section className="flex min-w-0 flex-1 flex-col bg-[radial-gradient(circle_at_50%_0%,rgba(63,63,70,0.34),transparent_34rem)]">
          <header className="flex h-16 items-center justify-between border-b border-zinc-900 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-zinc-300 lg:hidden"
                aria-label="Open sidebar"
              >
                <PanelLeft className="h-5 w-5" />
              </button>
              <div>
                <p className="text-sm font-medium text-white">
                  {activeSession?.title ?? 'New conversation'}
                </p>
                <p className="text-xs text-zinc-500">
                  Gemini assistant · JWT protected workspace
                </p>
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-500 sm:flex">
              <Search className="h-3.5 w-3.5" />
              Spring Boot ready
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-6">
            {error ? (
              <p className="mb-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </p>
            ) : null}

            <div
              ref={feedRef}
              className="min-h-0 flex-1 overflow-y-auto rounded-3xl border border-zinc-900 bg-zinc-950/40 px-3 py-5 sm:px-6"
            >
              {messages.length === 0 ? (
                <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-center py-8">
                  <div className="mb-9">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1 text-xs text-zinc-400">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
                      Ask Gemini across your files
                    </div>
                    <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                      How can Dochat help?
                    </h2>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
                      Start with a question, upload a source file, or pick an example prompt.
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {examplePrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void sendQuestion(prompt)}
                        className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-left text-sm leading-6 text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4">
                    <DocumentUpload
                      onUpload={handleUpload}
                      isUploading={isUploading}
                      variant="dropzone"
                    />
                  </div>
                </div>
              ) : (
                <div className="mx-auto grid max-w-4xl gap-6">
                  {messages.map((message) => (
                    <article
                      key={message.id}
                      className={clsx(
                        'flex gap-3',
                        message.role === 'user' ? 'justify-end' : 'justify-start',
                      )}
                    >
                      {message.role === 'assistant' ? (
                        <div className="mt-1 flex h-9 w-9 flex-none items-center justify-center rounded-2xl bg-zinc-800 text-indigo-300">
                          <Bot className="h-4 w-4" />
                        </div>
                      ) : null}
                      <div
                        className={clsx(
                          'max-w-[86%] rounded-3xl px-4 py-3 text-sm leading-7 sm:max-w-[74%]',
                          message.role === 'user'
                            ? 'rounded-br-md bg-indigo-500 text-white shadow-glow'
                            : 'rounded-bl-md border border-zinc-800 bg-zinc-900/75 text-zinc-100',
                        )}
                      >
                        {message.role === 'assistant' ? (
                          <>
                            <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                              Gemini
                            </div>
                            <ReactMarkdown
                              className="markdown-body"
                              remarkPlugins={[remarkGfm]}
                            >
                              {message.content}
                            </ReactMarkdown>
                            {message.sourcesUsed?.length ? (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {message.sourcesUsed.map((source) => (
                                  <span
                                    key={source}
                                    className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400"
                                  >
                                    {source}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </>
                        ) : (
                          message.content
                        )}
                      </div>
                    </article>
                  ))}
                  {isSending ? (
                    <div className="flex items-center gap-3 text-sm text-zinc-500">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-zinc-800 text-indigo-300">
                        <Bot className="h-4 w-4" />
                      </div>
                      <span className="relative overflow-hidden rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2">
                        Gemini is thinking
                        <span className="absolute inset-0 -z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                      </span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <form
              className="mx-auto mt-4 flex w-full max-w-4xl items-end gap-2 rounded-3xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl shadow-black/30"
              onSubmit={(event) => {
                event.preventDefault();
                void sendQuestion();
              }}
            >
              <DocumentUpload onUpload={handleUpload} isUploading={isUploading} />
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void sendQuestion();
                  }
                }}
                rows={1}
                placeholder="Message Gemini..."
                className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
              />
              <button
                type="submit"
                disabled={!question.trim() || isSending}
                className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-white text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message"
              >
                {isSending ? <Spinner className="text-zinc-950" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
