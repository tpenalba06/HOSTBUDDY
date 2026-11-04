import { describe, expect, it, vi } from "vitest";
const hooks = vi.hoisted(() => {
  const handlers = new Map<string, (event: unknown) => void>();
  vi.stubGlobal("addEventListener", (name: string, callback: (event: unknown) => void) =>
    handlers.set(name, callback),
  );
  return { handlers, report: vi.fn() };
});
vi.mock("./operational-events.server", () => ({ reportOperationalEvent: hooks.report }));
import { consumeLastCapturedError } from "./error-capture";
vi.unstubAllGlobals();
describe("critical server event monitoring", () => {
  it.each([
    ["error", "server_unhandled_error", "error"],
    ["unhandledrejection", "server_unhandled_rejection", "reason"],
  ])("reports %s without exception text", (hook, eventName, field) => {
    const privateError = new Error("token=PRIVATE guest@example.test");
    hooks.handlers.get(hook!)!({ [field!]: privateError });
    expect(hooks.report).toHaveBeenCalledWith(eventName);
    expect(JSON.stringify(hooks.report.mock.calls)).not.toContain("PRIVATE");
    expect(consumeLastCapturedError()).toBe(privateError);
  });
});
