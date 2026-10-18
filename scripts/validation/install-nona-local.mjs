import { mkdir, stat, writeFile } from "node:fs/promises";
import { createWriteStream, createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Portable, pinned official release. No installer, service, PATH or registry edits.
export const runtimeRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../nona-local-runtime",
);
export const version = "0.40.5";
export const binaryDir = resolve(runtimeRoot, "ollama-" + version);
export const binary = resolve(binaryDir, "ollama.exe");
const archive = resolve(runtimeRoot, "ollama-windows-amd64.zip");
const digest = "5134ce7e3bc8e94d0494721c799ec293b429450d0c52461b0ee3647dd3bb4bb7";
const run = promisify(execFile);
async function hashFile(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
export async function installLocalRuntime() {
  if (process.platform !== "win32") throw new Error("Windows requis.");
  await mkdir(runtimeRoot, { recursive: true });
  try {
    if (
      (await stat(binary)).isFile() &&
      (await stat(resolve(binaryDir, "nona-verified.json"))).isFile()
    )
      return binary;
  } catch {
    /* first setup */
  }
  let valid = false;
  try {
    valid = (await hashFile(archive)) === digest;
  } catch {
    /* no archive */
  }
  if (!valid) {
    console.log("Telechargement Ollama portable officiel (1,47 Go). Aucun compte ni paiement.");
    const response = await fetch(
      "https://github.com/ollama/ollama/releases/download/v0.40.5/ollama-windows-amd64.zip",
      {
        signal: AbortSignal.timeout(30 * 60 * 1000),
      },
    );
    if (!response.ok || !response.body)
      throw new Error("Telechargement Ollama refuse : HTTP " + response.status);
    let bytes = 0,
      last = 0;
    const progress = new Transform({
      transform(chunk, encoding, callback) {
        bytes += chunk.length;
        if (Date.now() - last > 10000) {
          console.log("Ollama : " + Math.round(bytes / 1e6) + " / 1471 Mo");
          last = Date.now();
        }
        callback(null, chunk);
      },
    });
    await pipeline(response.body, progress, createWriteStream(archive));
    if ((await hashFile(archive)) !== digest)
      throw new Error("Integrite SHA-256 incorrecte : archive non executee.");
  }
  console.log("SHA-256 officiel verifie. Extraction dans le dossier NONA uniquement.");
  await mkdir(binaryDir, { recursive: true });
  // Fixed executable and arguments, no shell composition or elevation.
  await run("tar.exe", ["-xf", archive, "-C", binaryDir], {
    windowsHide: true,
    timeout: 10 * 60 * 1000,
  });
  if (!(await stat(binary)).isFile()) throw new Error("Executable Ollama absent de l archive.");
  await writeFile(
    resolve(binaryDir, "nona-verified.json"),
    JSON.stringify({ version, archiveSha256: digest }, null, 2),
  );
  console.log("Ollama portable installe.");
  return binary;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  installLocalRuntime().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
