import { Component, type ErrorInfo, type ReactNode } from "react";

// Fanger uventede render-fejl, så én komponent-fejl ikke sortner hele appen.
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: "" };

  static getDerivedStateFromError(err: unknown) {
    return { hasError: true, message: err instanceof Error ? err.message : String(err) };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", err, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="page-title text-2xl">Noget gik galt</h1>
          <p className="text-white/50 text-sm max-w-md">
            Der opstod en uventet fejl. Prøv at genindlæse siden.
          </p>
          <button className="primary-btn" onClick={() => window.location.reload()}>
            Genindlæs
          </button>
          {this.state.message && (
            <p className="text-white/30 text-xs font-mono mt-2 break-all">
              {this.state.message}
            </p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
