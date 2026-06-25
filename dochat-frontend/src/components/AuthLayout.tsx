import type { ReactNode } from 'react';
import { Bot, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react';
import { apiConfig } from '../lib/api/client';

const trustSignals: Array<{ label: string; Icon: LucideIcon }> = [
  { label: 'Centralized Axios JWT auth', Icon: ShieldCheck },
  { label: 'Document-grounded conversations', Icon: Bot },
];

export function AuthLayout({ children, title, subtitle }: {
  children: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950/80 shadow-2xl shadow-black/40 backdrop-blur xl:grid-cols-[1fr_0.82fr]">
        <section className="relative hidden min-h-[680px] overflow-hidden border-r border-zinc-800 bg-zinc-950 p-10 xl:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(99,102,241,0.24),transparent_24rem)]" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-xs text-zinc-400">
                <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
                Mock mode {apiConfig.usingMockApi ? 'enabled' : 'disabled'}
              </div>
              <h1 className="mt-16 max-w-xl text-6xl font-semibold tracking-tight text-white">
                Dochat
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-8 text-zinc-400">
                Secure AI conversations over your private files, designed for a Spring Boot JWT backend and polished enough for real users.
              </p>
            </div>
            <div className="grid gap-3">
              {trustSignals.map(({ label, Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-200"
                >
                  <Icon className="h-5 w-5 text-indigo-300" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex min-h-[620px] items-center justify-center p-5 sm:p-8">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-zinc-950">
                <Bot className="h-6 w-6" />
              </div>
              <h2 className="mt-6 text-3xl font-semibold tracking-tight text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{subtitle}</p>
            </div>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
