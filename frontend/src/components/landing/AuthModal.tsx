import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, LoaderCircle, Play, Send, X } from 'lucide-react';
import { env } from '../../config/env';
import { getErrorMessage } from '../../services/apiClient';
import { useAuth } from '../../state/useAuth';
import { AlertBanner } from '../common/AlertBanner';
import { Modal } from '../common/Modal';

export type AuthModalMode = 'login' | 'register';

interface AuthModalProps {
  initialMode: AuthModalMode;
  onClose: () => void;
}

function GoogleLogo() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/**
 * Clean email + password sign-in and account creation modal with optional Google OAuth and 1-click demo.
 */
export function AuthModal({ initialMode, onClose }: AuthModalProps) {
  const {
    demoEnabled,
    googleConfigured,
    demoLoading,
    loginWithPassword,
    registerWithPassword,
    startDemoLogin,
  } = useAuth();

  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const busy = submitting || demoLoading;

  const switchMode = (nextMode: AuthModalMode) => {
    setMode(nextMode);
    setError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (mode === 'register' && !name.trim()) {
      setError('Enter your full name.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'register') {
        await registerWithPassword(name.trim(), email.trim(), password);
      } else {
        await loginWithPassword(email.trim(), password);
      }
      onClose();
    } catch (cause) {
      setError(
        getErrorMessage(
          cause,
          mode === 'register' ? 'Could not create your account.' : 'Invalid email or password.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoClick = async () => {
    setError('');
    await startDemoLogin();
  };

  const fieldClass =
    'mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#0f766e] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-[#14b8a6]';

  return (
    <Modal titleId="auth-modal-title" busy={busy} onClose={onClose} maxWidthClass="max-w-md">
      <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0f766e] text-white dark:bg-[#14b8a6] dark:text-zinc-950"
            aria-hidden="true"
          >
            <Send size={13} />
          </span>
          <h2 id="auth-modal-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {mode === 'login' ? 'Sign in to ReachInbox' : 'Create your ReachInbox account'}
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close sign-in dialog"
          className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </header>

      <div className="space-y-4 p-5 sm:p-6">
        <div
          role="tablist"
          aria-label="Authentication mode"
          className="grid grid-cols-2 rounded-lg border border-zinc-200 bg-zinc-100/80 p-0.5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            onClick={() => switchMode('login')}
            className={`rounded-md py-1.5 text-xs font-medium ${
              mode === 'login'
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            onClick={() => switchMode('register')}
            className={`rounded-md py-1.5 text-xs font-medium ${
              mode === 'register'
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            Create account
          </button>
        </div>

        {error && <AlertBanner tone="error">{error}</AlertBanner>}

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
          {mode === 'register' && (
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Full name
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={120}
                placeholder="Alex Rivera"
                className={fieldClass}
              />
            </label>
          )}

          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Work email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={254}
              placeholder="you@company.com"
              className={fieldClass}
            />
          </label>

          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Password
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                maxLength={128}
                placeholder="Minimum 8 characters"
                className={`${fieldClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-[calc(50%+3px)] -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                {showPassword ? (
                  <EyeOff size={15} aria-hidden="true" />
                ) : (
                  <Eye size={15} aria-hidden="true" />
                )}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-medium text-white hover:bg-[#115e59] disabled:opacity-60 dark:bg-[#14b8a6] dark:text-zinc-950 dark:hover:bg-[#0d9488]"
          >
            {submitting && <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />}
            <span>
              {submitting
                ? mode === 'register'
                  ? 'Creating account…'
                  : 'Signing in…'
                : mode === 'register'
                  ? 'Create account'
                  : 'Sign in'}
            </span>
          </button>
        </form>

        {(googleConfigured || demoEnabled) && (
          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800" />
            <span className="mx-3 shrink-0 text-xs text-zinc-400">or</span>
            <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800" />
          </div>
        )}

        <div className="space-y-2.5">
          {googleConfigured && (
            <a
              href={`${env.apiUrl}/auth/google`}
              className="flex min-h-[42px] w-full items-center justify-center gap-2.5 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              <GoogleLogo />
              <span>Continue with Google</span>
            </a>
          )}

          {demoEnabled && (
            <button
              type="button"
              onClick={() => void handleDemoClick()}
              disabled={busy}
              className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {demoLoading ? (
                <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <Play size={14} aria-hidden="true" />
              )}
              <span>{demoLoading ? 'Opening live demo…' : 'Try 1-click live demo'}</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
