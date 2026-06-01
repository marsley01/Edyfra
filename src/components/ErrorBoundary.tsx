"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    
    // Log to console for debugging
    console.error('Dashboard Error:', error, errorInfo);
    
    // Log to Antigravity terminal
    if (typeof window !== 'undefined') {
      console.log('=== EDYFRA DASHBOARD ERROR ===');
      console.log('Error:', error.message);
      console.log('Stack:', error.stack);
      console.log('Component Stack:', errorInfo.componentStack);
      console.log('==============================');
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 sm:p-6 md:p-12 max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-2xl sm:text-3xl font-black text-red-500">
              Dashboard Error
            </h2>
            <p className="text-muted-foreground">
              Something went wrong while loading your dashboard.
            </p>
            {this.state.error && (
              <details className="text-left bg-background p-4 rounded-lg border border-border">
                <summary className="cursor-pointer text-sm font-medium">Error Details</summary>
                <pre className="mt-2 text-xs text-red-500 overflow-auto max-h-64">
                  {this.state.error.message}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}