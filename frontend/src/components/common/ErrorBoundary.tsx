import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Top-level React Error Boundary to prevent unhandled UI exceptions from blanking the screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected UI error occurred.',
    };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Uncaught UI error:', error, info);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#fafafa] p-6 dark:bg-[#09090b]">
          <section className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-[#111113]">
            <div
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400"
              aria-hidden="true"
            >
              <AlertCircle size={18} />
            </div>
            <h1 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Something went wrong
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-medium text-white hover:bg-[#115e59] dark:bg-[#14b8a6] dark:text-zinc-950 dark:hover:bg-[#0d9488]"
            >
              Reload workspace
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
