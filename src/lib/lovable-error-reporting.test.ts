import { describe, expect, it, vi } from "vitest";
import { reportLovableError } from "./lovable-error-reporting";

describe("client error telemetry privacy", () => {
  it("never forwards exceptions, stacks, context or a private route", () => {
    const capture = vi.fn();
    const runtime = vi.fn();
    vi.stubGlobal("window", {
      location: { pathname: "/l/PRIVATE_SLUG" },
      __lovableEvents: { captureException: capture },
      __lovableReportRuntimeError: runtime,
    });
    const error = new TypeError("PRIVATE_TOKEN guest@example.test");
    error.stack = "PRIVATE_STACK";
    reportLovableError(error, { token: "PRIVATE_CONTEXT" });
    const captured = capture.mock.calls[0]!;
    const sent = JSON.stringify([captured, runtime.mock.calls]);
    expect(sent).not.toMatch(/PRIVATE|guest@example/);
    expect(String(captured[0])).not.toMatch(/PRIVATE|guest@example/);
    expect(captured[0].stack).not.toMatch(/PRIVATE|guest@example/);
    expect(runtime).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("omits Response URLs and unknown object stringifiers", () => {
    const capture = vi.fn();
    const runtime = vi.fn();
    vi.stubGlobal("window", {
      location: { pathname: "/l/PRIVATE_SLUG" },
      __lovableEvents: { captureException: capture },
      __lovableReportRuntimeError: runtime,
    });
    const stringify = vi.fn(() => "PRIVATE_OBJECT");
    reportLovableError({ toString: stringify });
    const response = new Response(null, { status: 503 });
    Object.defineProperty(response, "url", { value: "https://example.test/PRIVATE_URL" });
    reportLovableError(response);
    expect(stringify).not.toHaveBeenCalled();
    expect(JSON.stringify([capture.mock.calls, runtime.mock.calls])).not.toContain("PRIVATE");
    vi.unstubAllGlobals();
  });

  it("keeps reporting failures from throwing into the error boundary", () => {
    const runtime = vi.fn();
    vi.stubGlobal("window", {
      location: { pathname: "/l/PRIVATE_SLUG" },
      __lovableEvents: {
        captureException: () => {
          throw new Error("provider down");
        },
      },
      __lovableReportRuntimeError: runtime,
    });
    expect(() => reportLovableError(new Error("private"))).not.toThrow();
    expect(runtime).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
