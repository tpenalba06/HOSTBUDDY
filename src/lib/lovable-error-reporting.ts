type LovableErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type LovableEvents = {
  track?: (event: string, properties?: Record<string, unknown>) => string | null;
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: LovableErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __lovableEvents?: LovableEvents;
    __lovableReportRuntimeError?: (payload: {
      message: string;
      stack?: string;
      filename?: string;
    }) => void;
  }
}

export function reportLovableError(error: unknown, _context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  // Exception text, stacks, URLs, route slugs and caller context are private.
  // Do not stringify unknown objects or hand the provider the original Error.
  const message = "Nona client runtime error";
  const safe = new Error(message);
  safe.stack = `Error: ${message}`;
  const errorClass =
    error instanceof Error &&
    ["Error", "TypeError", "RangeError", "SyntaxError", "URIError"].includes(error.name)
      ? error.name
      : "Error";
  try {
    window.__lovableEvents?.captureException?.(
      safe,
      {
        source: "react_error_boundary",
        event: "client_runtime_error",
        error_class: errorClass,
        ...(error instanceof Response ? { status: error.status } : {}),
      },
      { mechanism: "react_error_boundary", handled: false, severity: "error" },
    );
  } catch {
    // A failed telemetry provider must not break the fallback error page.
  }
  try {
    window.__lovableReportRuntimeError?.({ message });
  } catch {
    // The second provider is independent of the first.
  }
}
