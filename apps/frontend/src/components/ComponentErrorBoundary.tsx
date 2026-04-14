import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ComponentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error(`[ComponentErrorBoundary ${this.name}] Error:`, error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error(
      `[ComponentErrorBoundary ${this.props.name || "Unknown"}] Caught:`,
      error
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "16px",
            margin: "16px",
            backgroundColor: "#7f1d1d",
            border: "2px solid #dc2626",
            borderRadius: "4px",
            color: "#fca5a5",
            fontFamily: "monospace",
            fontSize: "12px",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
            ⚠️ Error in {this.props.name || "Component"}
          </div>
          <div style={{ fontSize: "11px", color: "#cbd5e1" }}>
            {this.state.error?.message}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
