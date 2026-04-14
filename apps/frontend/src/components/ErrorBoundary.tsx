import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: { componentStack: string } | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    console.error("[ErrorBoundary] getDerivedStateFromError called:", error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error("[ErrorBoundary] componentDidCatch:", error);
    console.error("[ErrorBoundary] Component Stack:", errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "Unknown error";
      const errorStack = this.state.error?.stack || "";
      const componentStack = this.state.errorInfo?.componentStack || "";

      return (
        <div style={{ 
          display: "flex", 
          minHeight: "100vh", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "center", 
          backgroundColor: "#0f172a",
          padding: "16px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#e2e8f0"
        }}>
          <div style={{
            maxWidth: "800px",
            backgroundColor: "#7f1d1d",
            border: "2px solid #dc2626",
            borderRadius: "8px",
            padding: "24px"
          }}>
            <h1 style={{ 
              fontSize: "28px", 
              fontWeight: "bold", 
              marginBottom: "16px",
              color: "#fca5a5"
            }}>
              ⚠️ Application Error
            </h1>
            
            <p style={{ 
              marginBottom: "16px", 
              fontSize: "14px",
              color: "#cbd5e1"
            }}>
              An unexpected error occurred. Please reload the application.
            </p>

            <details style={{ marginBottom: "16px" }} open>
              <summary style={{ 
                cursor: "pointer", 
                fontWeight: "bold",
                fontSize: "12px",
                color: "#94a3b8",
                marginBottom: "8px",
                userSelect: "none"
              }}>
                📋 Error Details (Click to expand/collapse)
              </summary>
              <div style={{
                marginTop: "12px",
                backgroundColor: "#000000",
                border: "1px solid #475569",
                borderRadius: "4px",
                padding: "12px",
                fontSize: "12px",
                fontFamily: "monospace",
                color: "#fca5a5",
                maxHeight: "400px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word"
              }}>
                <div><strong>Error Message:</strong></div>
                <div style={{ marginBottom: "12px", color: "#fca5a5" }}>{errorMessage}</div>
                
                {errorStack && (
                  <>
                    <div><strong>Stack Trace:</strong></div>
                    <div style={{ marginBottom: "12px", color: "#fca5a5" }}>{errorStack}</div>
                  </>
                )}

                {componentStack && (
                  <>
                    <div><strong>Component Stack:</strong></div>
                    <div style={{ color: "#fca5a5" }}>{componentStack}</div>
                  </>
                )}
              </div>
            </details>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  backgroundColor: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontWeight: "bold",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#b91c1c")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#dc2626")}
              >
                🔄 Reload Application
              </button>
              <button
                onClick={() => window.location.href = "/login"}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  backgroundColor: "#1e293b",
                  color: "white",
                  border: "1px solid #475569",
                  borderRadius: "4px",
                  fontWeight: "bold",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#334155")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#1e293b")}
              >
                🔐 Go to Login
              </button>
            </div>

            <p style={{
              marginTop: "16px",
              fontSize: "11px",
              color: "#64748b",
              textAlign: "center"
            }}>
              If the problem persists, please restart the application or contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
