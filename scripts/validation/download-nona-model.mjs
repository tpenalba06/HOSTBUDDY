import { mkdir, rename, stat, writeFile } from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { createHash } from "node:crypto";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { resolve } from "node:path";
import { runtimeRoot } from "./install-nona-local.mjs";

// Standard HTTPS via Node's configured environment proxy. No direct socket,
// alternate mirror or proxy bypass. All files come from Ollama's official registry.
const tag = "9b";
const modelHash = "02d45dc1cf451ba2475ac33b301c2dd8f985abe4c182ce04a1f2f5bf0260278d";
const modelRoot = resolve(runtimeRoot, "models");
async function sha256(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
export async function downloadNonaModel() {
  const base = "https://registry.ollama.ai/v2/library/qwen3.5";
  const manifestResponse = await fetch(base + "/manifests/" + tag, {
    signal: AbortSignal.timeout(20000),
  });
  if (!manifestResponse.ok)
    throw new Error("Registre officiel Ollama : HTTP " + manifestResponse.status);
  const raw = await manifestResponse.text();
  if (
    createHash("sha256").update(raw).digest("hex") !==
    "56671c2ab9385f9cfcb404638e32cd62d88e3501d44822208363c010179a3c90"
  )
    throw new Error("Manifest du modele modifie depuis sa verification. Installation arretee.");
  const manifest = JSON.parse(raw);
  if (
    manifest.schemaVersion !== 2 ||
    !manifest.layers?.some((layer) => layer.digest === "sha256:" + modelHash)
  )
    throw new Error("Version du modele inattendue. Aucun autre modele telecharge.");
  const blobs = [manifest.config, ...manifest.layers];
  if (
    blobs.length > 10 ||
    blobs.some(
      (blob) =>
        !/^sha256:[a-f0-9]{64}$/.test(blob.digest) ||
        !Number.isSafeInteger(blob.size) ||
        blob.size < 1 ||
        blob.size > 7e9,
    )
  )
    throw new Error("Manifest de modele invalide.");
  const folder = resolve(modelRoot, "blobs");
  await mkdir(folder, { recursive: true });
  for (const blob of blobs) {
    const hash = blob.digest.slice(7);
    const target = resolve(folder, "sha256-" + hash);
    try {
      if ((await stat(target)).size === blob.size && (await sha256(target)) === hash) continue;
    } catch {
      /* missing */
    }
    console.log("Modele officiel : fichier de " + Math.round(blob.size / 1e6) + " Mo.");
    const response = await fetch(base + "/blobs/" + blob.digest, {
      signal: AbortSignal.timeout(30 * 60 * 1000),
    });
    if (!response.ok || !response.body)
      throw new Error("Telechargement du modele refuse : HTTP " + response.status);
    let count = 0,
      last = 0;
    const hasher = createHash("sha256");
    const progress = new Transform({
      transform(chunk, encoding, callback) {
        count += chunk.length;
        hasher.update(chunk);
        if (Date.now() - last > 10000 && blob.size > 1e6) {
          console.log(
            "Qwen3 : " + Math.round(count / 1e6) + " / " + Math.round(blob.size / 1e6) + " Mo",
          );
          last = Date.now();
        }
        callback(null, chunk);
      },
    });
    const temporary = target + ".nona-download";
    await pipeline(response.body, progress, createWriteStream(temporary));
    if (count !== blob.size || hasher.digest("hex") !== hash)
      throw new Error("Integrite du modele incorrecte : fichier non active.");
    await rename(temporary, target);
  }
  const manifests = resolve(modelRoot, "manifests/registry.ollama.ai/library/qwen3.5");
  await mkdir(manifests, { recursive: true });
  await writeFile(resolve(manifests, tag), raw);
  console.log("Qwen3 installe, empreintes SHA-256 de tous les fichiers verifiees.");
}
if (process.argv[1]?.endsWith("download-nona-model.mjs")) {
  downloadNonaModel().catch((error) => {
    console.error(error.cause?.code || error.message);
    process.exitCode = 1;
  });
}
