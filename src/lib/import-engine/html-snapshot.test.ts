import { expect, it, vi } from "vitest";
import { readHtmlSnapshot } from "./html-snapshot.server";

it("rejects a saved access challenge without requesting its resources", async () => {
  const fetcher = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network forbidden"));
  try {
    await expect(
      readHtmlSnapshot(
        '<title>Verify that you are not a robot</title><script src="https://example.test/script.js"></script>',
      ),
    ).rejects.toThrow("blocked_html_snapshot");
    expect(fetcher).not.toHaveBeenCalled();
  } finally {
    fetcher.mockRestore();
  }
});
