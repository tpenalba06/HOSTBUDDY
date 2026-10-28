import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));

import { QrCard } from "./QrCard";

describe("QR preview hydration", () => {
  it("never exposes a downloadable relative-URL QR before the browser origin is known", () => {
    const html = renderToStaticMarkup(<QrCard slug="villa-mare" name="Villa Mare" />);
    expect(html).toContain("/l/villa-mare");
    expect(html).not.toContain("data:image/png");
    expect(html).not.toContain("download=");
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });

  it("keeps the demo destination explicit and QR controls out of enclosing form submission", () => {
    const html = renderToStaticMarkup(<QrCard slug="villa-mare" name="Villa Mare" path="/demo" />);
    expect(html).toContain("/demo");
    expect(html).not.toContain("/l/villa-mare");
    expect(html.match(/type="button"/g)).toHaveLength(2);
  });
});
