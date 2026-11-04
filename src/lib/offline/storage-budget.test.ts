import { describe, expect, it } from "vitest";
import { offlineMediaBudget, OFFLINE_TOTAL_LIMIT } from "./download";
const MiB = 1024 * 1024;
describe("offline storage budget", () => {
  it("allows a small guide when the browser cannot fit a maximum size guide", () => {
    expect(offlineMediaBudget(0, 10 * MiB, 3 * MiB)).toBe(7 * MiB);
  });
  it("caps media by both the per-guide and aggregate limits", () => {
    expect(offlineMediaBudget(0, 500 * MiB)).toBe(50 * MiB);
    expect(offlineMediaBudget(OFFLINE_TOTAL_LIMIT - 2 * MiB, 500 * MiB)).toBe(2 * MiB);
  });
  it("has no budget when the browser or aggregate quota is exhausted", () => {
    expect(offlineMediaBudget(0, MiB, 2 * MiB)).toBe(0);
    expect(offlineMediaBudget(OFFLINE_TOTAL_LIMIT)).toBe(0);
  });
});
