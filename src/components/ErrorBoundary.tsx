import { Component, type ReactNode } from "react";
import { logError } from "@/lib/logger";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
    logError("[ErrorBoundary] Caught error", {
      error: error.message,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <main role="alert" className="min-h-screen flex items-center justify-center bg-background px-6">
          <div className="max-w-md text-center space-y-6">
            <div
              aria-hidden="true"
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-destructive/20"
            >
              <span className="text-3xl font-black">500</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tightest">
                Something went wrong
              </h1>
              <p className="text-sm text-muted-foreground">
                We have been notified and are working on it. Please try again.
              </p>
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="h-11 inline-flex items-center px-5 rounded-full bg-foreground text-background text-xs font-black tracking-widest uppercase"
              aria-label="Try reloading the page"
            >
              Try again
            </button>
            <a
              href="/dashboard"
              className="block text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
              aria-label="Go to dashboard"
            >
              Go to dashboard
            </a>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
