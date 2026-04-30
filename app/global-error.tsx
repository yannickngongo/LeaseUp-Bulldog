"use client";

// Catches errors in the root layout (the only place app/error.tsx can't reach).
// Must include its own <html>/<body> since it replaces the entire tree.

import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error("Global error boundary caught:", error);
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#08080F", color: "white", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#C8102E", marginBottom: "0.75rem" }}>500</p>
          <h1 style={{ fontSize: "1.875rem", fontWeight: 900, marginBottom: "0.75rem" }}>App crashed</h1>
          <p style={{ fontSize: "0.875rem", color: "#9CA3AF", lineHeight: 1.6, marginBottom: "1.5rem" }}>
            Something went seriously wrong. Refresh the page or come back in a minute.
          </p>
          <a href="/dashboard" style={{ display: "inline-block", padding: "0.625rem 1.25rem", background: "#C8102E", color: "white", borderRadius: "0.75rem", fontWeight: 700, fontSize: "0.875rem", textDecoration: "none", boxShadow: "0 4px 16px rgba(200,16,46,0.25)" }}>
            Reload
          </a>
        </div>
      </body>
    </html>
  );
}
