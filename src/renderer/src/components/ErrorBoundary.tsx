import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      const isDev = import.meta.env.DEV;

      if (isDev) {
        return (
          <div className="h-screen flex items-center justify-center bg-background p-8">
            <div className="max-w-2xl w-full space-y-4 font-mono text-sm">
              <h2 className="text-destructive font-bold text-lg">
                Application Error
              </h2>
              <div className="bg-card border border-border rounded-lg p-4 overflow-auto max-h-[60vh]">
                <p className="text-foreground font-semibold mb-2">
                  {this.state.error.message}
                </p>
                <pre className="text-muted-foreground text-xs whitespace-pre-wrap">
                  {this.state.error.stack}
                </pre>
              </div>
              <button
                onClick={() => this.setState({ error: null })}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4 px-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-destructive/60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Something went wrong
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              An unexpected error occurred. Please restart the application.
            </p>
            <button
              onClick={() => window.electronAPI?.close()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
