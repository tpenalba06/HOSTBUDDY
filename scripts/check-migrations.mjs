import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

export function checkMigrations(directory = new URL("../drizzle/migrations/", import.meta.url)) {
  const files = readdirSync(directory)
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
  const journal = JSON.parse(readFileSync(new URL("meta/_journal.json", directory), "utf8"));
  const manifest = JSON.parse(readFileSync(new URL("meta/manifest.json", directory), "utf8"));
  if (files.length !== journal.entries.length || files.length !== manifest.migrations.length)
    throw new Error("migration_inventory_mismatch");
  for (const [index, file] of files.entries()) {
    const entry = journal.entries[index];
    const item = manifest.migrations[index];
    const hash = createHash("sha256")
      .update(readFileSync(new URL(file, directory)))
      .digest("hex");
    if (
      entry.idx !== index ||
      entry.tag !== file.slice(0, -4) ||
      item.tag !== entry.tag ||
      item.sha256 !== hash ||
      !Number.isSafeInteger(entry.when) ||
      (index && entry.when <= journal.entries[index - 1].when)
    )
      throw new Error("migration_history_inconsistent");
  }
  return files.length;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  console.log(`migration_inventory_verified: ${checkMigrations()}`);
