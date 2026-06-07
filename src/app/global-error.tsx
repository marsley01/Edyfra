"use client";

import { useEffect } from "react";

/**
 * Root-level error boundary. This only renders if the root layout itself
 * throws — `error.tsx` handles everything below it. We keep this intentionally
 * minimal: no fonts, no themes, no providers, no Sonner. Just an honest
 * message + a button to try again. The page will at least be readable
 * instead of a blank white screen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[global-error boundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          background: "#0b0b12",
          color: "#f5f5f7",
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: "100%",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div
            style={{
              margin: "0 auto",
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "rgba(245, 158, 11, 0.12)",
              color: "#f59e0b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
            aria-hidden
          >
            !
          </div>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "#f59e0b",
              }}
            >
              Edyfra is taking a breather
            </p>
            <h1
              style={{
                margin: "8px 0 0",
                fontSize: 28,
                fontWeight: 900,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
              }}
            >
              We hit a snag loading the site.
            </h1>
          </div>

          <div
            style={{
              textAlign: "left",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              borderRadius: 16,
              padding: 16,
              fontSize: 14,
              lineHeight: 1.55,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <Row
              label="What happened"
              value="The site crashed before it could finish loading for you."
            />
            <Row
              label="Why"
              value={
                error?.message
                  ? humanize(error.message)
                  : "We don't have a precise reason yet — the server didn't tell us much."
              }
            />
            <Row
              label="What to try"
              value="Hit Try again. If it keeps crashing, refresh the tab or message us at edyfraplatform@gmail.com — we'll look at the logs."
            />
          </div>

          {error?.digest ? (
            <p style={{ margin: 0, fontSize: 11, opacity: 0.55, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
              ref: {error.digest} (share this if you contact support)
            </p>
          ) : null}

          <div>
            <button
              type="button"
              onClick={reset}
              style={{
                height: 48,
                padding: "0 22px",
                borderRadius: 999,
                border: "none",
                background: "#f59e0b",
                color: "#1a1300",
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <span
        style={{
          flex: "0 0 110px",
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(245,245,247,0.55)",
          paddingTop: 2,
        }}
      >
        {label}
      </span>
      <span style={{ flex: 1, color: "rgba(245,245,247,0.92)" }}>{value}</span>
    </div>
  );
}

function humanize(msg: string) {
  if (!msg) return msg;
  const oneLine = msg.split("\n")[0];
  return oneLine.length > 180 ? `${oneLine.slice(0, 180)}…` : oneLine;
}
