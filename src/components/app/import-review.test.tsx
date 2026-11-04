// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { ImportReview } from "./ImportReview";
import type { ExtractionResult } from "@/lib/import-engine/types";

vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it("confirms an imported fact without retyping, retaining its evidence and never publishing", async () => {
  const original: ExtractionResult = {
    propertyName: "Synthetic villa",
    fields: [
      {
        key: "arrival",
        value: "From 16:00",
        rawValue: "From 16:00",
        confidence: 0.6,
        status: "to_verify",
        evidence: [
          { quote: "From 16:00", sourceUrl: "https://example.invalid/villa", method: "rules" },
        ],
      },
      {
        key: "wifi",
        value: "Conflicting credentials",
        rawValue: "Conflicting credentials",
        confidence: 0.5,
        status: "to_verify",
        issues: ["conflicting_sources"],
      },
    ],
  };
  const changed = vi.fn();
  const confirm = vi.fn();
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () =>
      root.render(
        <ImportReview value={original} onChange={changed} onConfirm={confirm} onBack={() => {}} />,
      ),
    );
    const buttons = [...host.querySelectorAll("button")].filter(
      (b) => b.textContent === "importFlow.confirmField",
    );
    expect(buttons).toHaveLength(1); // Contradictory facts must be corrected first.
    await act(async () => buttons[0]!.click());
    const next = changed.mock.calls[0]![0] as ExtractionResult;
    expect(next.fields[0]).toEqual({
      ...original.fields[0],
      status: "found",
      confidence: 1,
      manuallyVerified: true,
    });
    expect(next.fields[1]).toEqual(original.fields[1]);
    expect(original.fields[0]!.status).toBe("to_verify");
    expect(confirm).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
