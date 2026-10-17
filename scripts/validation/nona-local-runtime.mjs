import { spawn } from "node:child_process";
import { mkdir, open, readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { installLocalRuntime, runtimeRoot, binary } from "./install-nona-local.mjs";
import { downloadNonaModel } from "./download-nona-model.mjs";

export const localOrigin = "http://127.0.0.1:11435";
export const localModel = "qwen3.5:9b";
const modelDigest = "56671c2ab9385f9cfcb404638e32cd62d88e3501d44822208363c010179a3c90";
const pidPath = resolve(runtimeRoot, "server.json");
export function runtimeEnvironment() {
  const profile = resolve(runtimeRoot, "profile");
  return {
    ...process.env,
    OLLAMA_HOST: "127.0.0.1:11435",
    OLLAMA_MODELS: resolve(runtimeRoot, "models"),
    OLLAMA_NO_CLOUD: "1",
    OLLAMA_CONTEXT_LENGTH: "8192",
    OLLAMA_NUM_PARALLEL: "1",
    OLLAMA_MAX_LOADED_MODELS: "1",
    // Child process only: all Ollama identity/config/cache files stay isolated.
    USERPROFILE: profile,
    APPDATA: resolve(profile, "AppData/Roaming"),
    LOCALAPPDATA: resolve(profile, "AppData/Local"),
  };
}
async function tags() {
  try {
    const response = await fetch(localOrigin + "/api/tags", {
      redirect: "error",
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
export async function ensureLocalModel() {
  await installLocalRuntime();
  const env = runtimeEnvironment();
  await Promise.all(
    [env.OLLAMA_MODELS, env.USERPROFILE, env.APPDATA, env.LOCALAPPDATA].map((path) =>
      mkdir(path, { recursive: true }),
    ),
  );
  let state = await tags();
  if (state) {
    let owner;
    try {
      owner = JSON.parse(await readFile(pidPath, "utf8"));
    } catch {
      throw new Error(
        "Port local 11435 deja utilise par un autre serveur. Aucun processus modifie.",
      );
    }
    if (owner.binary !== binary) throw new Error("Serveur local non reconnu.");
  } else {
    const log = await open(resolve(runtimeRoot, "ollama.log"), "a");
    try {
      const child = spawn(
        process.execPath,
        [resolve(dirname(fileURLToPath(import.meta.url)), "serve-nona-local.mjs")],
        {
          env,
          cwd: runtimeRoot,
          detached: true,
          windowsHide: true,
          stdio: ["ignore", log.fd, log.fd],
        },
      );
      await new Promise((done, fail) => {
        child.once("spawn", done);
        child.once("error", fail);
      });
      child.unref();
    } finally {
      await log.close();
    }
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline && !(state = await tags()))
      await new Promise((done) => setTimeout(done, 500));
    if (!state) throw new Error("Ollama ne demarre pas. Voir nona-local-runtime/ollama.log.");
  }
  if (!state.models?.some((model) => model.name === localModel && model.digest === modelDigest)) {
    console.log("Telechargement du modele Qwen3.5 9B (~6,6 Go), une seule fois.");
    await downloadNonaModel();
    state = await tags();
    if (!state?.models?.some((model) => model.name === localModel && model.digest === modelDigest))
      throw new Error("Modele local absent apres telechargement.");
  }
  console.log("Modele local disponible. Cloud Ollama desactive. Aucune API payante.");
}
if (process.argv[1]?.endsWith("nona-local-runtime.mjs")) {
  ensureLocalModel().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
