import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
// TEST packaging only. The product's local Ollama labels remain unchanged.
export function testModeLabel(root) {
  return {
    name: "nona-isolated-test-mode-label",
    enforce: "pre",
    async load(id) {
      const exact = id.split("?")[0].replaceAll("\\", "/");
      if (exact !== resolve(root, "src/components/guest/NonaConcierge.tsx").replaceAll("\\", "/"))
        return;
      return (await readFile(exact, "utf8")).replace(
        '"Nona \u00b7 IA locale"',
        '(lastMode === "ai" ? "Nona \u00b7 IA cloud TEST" : "Nona \u00b7 TEST guid\u00e9")',
      );
    },
  };
}
