import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { ArrowRight } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('demo@dochat.dev');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ email: email.trim().toLowerCase(), password });
      navigate('/', { replace: true });
    } catch (caught) {
      const message =
        caught instanceof AxiosError
          ? caught.response?.data?.message ?? 'Unable to sign in.'
          : 'Unable to sign in.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue your document-aware conversations."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-medium text-zinc-300">Email</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
            className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-indigo-400"
            placeholder="you@company.com"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-300">Password</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            required
            className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-indigo-400"
            placeholder="••••••••"
          />
        </label>
        {error ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 font-medium text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? <Spinner className="text-zinc-950" /> : null}
          Sign in
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        New to Dochat?{' '}
        <Link to="/register" className="font-medium text-zinc-100 hover:text-indigo-300">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
