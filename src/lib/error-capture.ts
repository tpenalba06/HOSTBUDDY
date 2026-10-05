// Captures the original Error out-of-band so server.ts can recover the stack
// when h3 has already swallowed the throw into a generic 500 Response.

let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;

function record(error: unknown) {
  lastCapturedError = { error, at: Date.now() };
}

// Error messages, stacks and causes can contain bearer tokens, DSNs and guest
// content. Keep the error class/status, never serialize arbitrary exception text.
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return "[exception details omitted]";
  const name = ["Error", "TypeError", "RangeError", "SyntaxError", "URIError"].includes(error.name)
    ? error.name
    : "Error";
  const { status, statusCode } = error as { status?: unknown; statusCode?: unknown };
  const code = status ?? statusCode;
  return `${name} [details omitted]${typeof code === "number" && Number.isInteger(code) && code >= 100 && code <= 599 ? ` (status ${code})` : ""}`;
}

export function safeLogArgument(value: unknown): unknown {
  if (
    value &&
    typeof value === "object" &&
    "schema" in value &&
    value.schema === "hostbuddy.operations.v1"
  ) {
    const item = value as Record<string, unknown>;
    return {
      schema: "hostbuddy.operations.v1",
      event:
        typeof item["event"] === "string" && /^[a-z_]{1,80}$/.test(item["event"])
          ? item["event"]
          : "unknown",
      level: "error",
      at:
        typeof item["at"] === "string" && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(item["at"])
          ? item["at"]
          : undefined,
      ...(typeof item["pending"] === "number" &&
      Number.isSafeInteger(item["pending"]) &&
      item["pending"] >= 0
        ? { pending: item["pending"] }
        : {}),
    };
  }
  return "[log details omitted]";
}

function isErrorLike(value: unknown): value is Error {
  return value instanceof Error;
}

// Wrap console.error so errors logged by any layer — including h3's internal
// unhandled-error logging, which this file cannot hook directly — are both
// recorded for consumeLastCapturedError and expanded before serialization.
const originalConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const expanded = args.map((arg) => {
    if (!isErrorLike(arg)) return safeLogArgument(arg);
    record(arg);
    return describeError(arg);
  });
  originalConsoleError(...expanded);
};

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) =>
    record((event as PromiseRejectionEvent).reason),
  );
}

export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
