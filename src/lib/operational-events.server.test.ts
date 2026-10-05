import { describe, expect, it, vi } from "vitest";
import { reportOperationalEvent } from "./operational-events.server";
import { describeError, safeLogArgument } from "./error-capture";

describe("safe operational monitoring", () => {
  it("keeps fixed event fields and counts without exception details", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      reportOperationalEvent("billing_sync_pending", 3);
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          schema: "hostbuddy.operations.v1",
          event: "billing_sync_pending",
          pending: 3,
        }),
      );
    } finally {
      log.mockRestore();
    }
  });
  it("omits credentials, guest content and causes even when the exception is arbitrary", () => {
    const secret = "sk_test_private_fixture jane@example.test postgres://user:password@host/db";
    const error = new Error(secret, { cause: new Error(secret) });
    expect(describeError(error)).toBe("Error [details omitted]");
    expect(safeLogArgument({ password: secret })).toBe("[log details omitted]");
    expect(safeLogArgument(secret)).toBe("[log details omitted]");
    expect(
      safeLogArgument({
        schema: "hostbuddy.operations.v1",
        event: "billing_sync_failed",
        body: secret,
      }),
    ).not.toHaveProperty("body");
  });
});
