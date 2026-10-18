import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import { dirname } from "node:path";

// Windows DPAPI, CurrentUser. Plaintext exists only in process memory and pipes.
// Never put secrets in command arguments, environment dumps or error messages.
function protect(value, decrypt = false) {
  if (process.platform !== "win32") throw new Error("Windows DPAPI required");
  const operation = decrypt
    ? "$s=ConvertTo-SecureString $v; $p=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s); try {[Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($p))} finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p)}"
    : "$s=ConvertTo-SecureString $v -AsPlainText -Force; [Console]::Out.Write((ConvertFrom-SecureString $s))";
  return new Promise((resolve, reject) => {
    const child = execFile(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "$ErrorActionPreference='Stop'; Import-Module (Join-Path $PSHOME 'Modules\\Microsoft.PowerShell.Security\\Microsoft.PowerShell.Security.psd1') -ErrorAction Stop; $v=[Console]::In.ReadToEnd(); " +
          operation,
      ],
      { windowsHide: true, timeout: 15000, maxBuffer: 32768 },
      (error, stdout) => (error ? reject(new Error("Secure vault unavailable")) : resolve(stdout)),
    );
    child.stdin.end(value);
  });
}
export async function saveVault(path, value) {
  const encrypted = await protect(JSON.stringify(value));
  await mkdir(dirname(path), { recursive: true });
  const pending = path + ".pending";
  try {
    await writeFile(pending, encrypted, { mode: 0o600 });
    await rename(pending, path);
  } finally {
    await unlink(pending).catch(() => {});
  }
}
export async function readVaultState(path) {
  let encrypted;
  try {
    encrypted = await readFile(path, "utf8");
  } catch (error) {
    return { state: error.code === "ENOENT" ? "missing" : "unavailable", value: null };
  }
  try {
    return { state: "ready", value: JSON.parse(await protect(encrypted, true)) };
  } catch {
    return { state: "unavailable", value: null };
  }
}
export async function readVault(path) {
  return (await readVaultState(path)).value;
}
