import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { checkMigrations } from "./check-migrations.mjs";

describe("migration inventory", () => {
  it("includes every current SQL without changing historical checksums", () => {
    expect(checkMigrations()).toBe(22);
  });
  it("fails when a SQL is edited or missing from the journal", () => {
    const directory = mkdtempSync(`${tmpdir()}/hb-journal-`);
    try {
      mkdirSync(`${directory}/meta`);
      for (const file of ["_journal.json", "manifest.json"])
        writeFileSync(
          `${directory}/meta/${file}`,
          readFileSync(new URL(`../drizzle/migrations/meta/${file}`, import.meta.url)),
        );
      writeFileSync(`${directory}/0000_changed.sql`, "SELECT 1;");
      expect(() => checkMigrations(pathToFileURL(`${directory}/`))).toThrow(
        "migration_inventory_mismatch",
      );
    } finally {
      rmSync(directory, { recursive: true });
    }
  });
});
