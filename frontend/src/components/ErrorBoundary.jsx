import React from "react";

/** 捕获子树渲染错误，避免整页空白 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("React ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 720, margin: "40px auto" }}>
          <h1 style={{ color: "#c00" }}>页面加载失败</h1>
          <p style={{ color: "#333" }}>{String(this.state.error?.message || this.state.error)}</p>
          <p style={{ color: "#666", fontSize: 14 }}>
            请确认已执行 <code>npm run dev</code>，并打开 F12 查看 Console。
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: "8px 16px" }}
          >
            刷新页面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
