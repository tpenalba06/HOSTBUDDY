import { LOCALES, translateStatic } from "@/lib/i18n";
import { wifiCredentials } from "@/lib/import-engine/wifi-credentials";

type WifiItem = { label: string; text: string };

export function publishedWifiCredentials(items: WifiItem[]) {
  const valueFor = (key: "guest.network" | "guest.wifiPassword") => {
    const labels = LOCALES.map((locale) => translateStatic(locale, key).toLowerCase());
    const matches = items.filter((item) => labels.includes(item.label.trim().toLowerCase()));
    return matches.map((item) => item.text);
  };
  const networks = valueFor("guest.network");
  const passwords = valueFor("guest.wifiPassword");
  if (networks.length && passwords.length) {
    if (networks.length !== 1 || passwords.length !== 1) return null;
    return { network: networks[0], password: passwords[0] };
  }
  return wifiCredentials(items.map((item) => item.text).join("\n"));
}

export function wifiQrPayload(network?: string, password?: string) {
  if (!network || !password || /[\p{Cc}]/u.test(network + password)) return null;
  const escape = (value: string) => value.replace(/[\\;,":]/g, "\\$&");
  const ssid = /^[a-f0-9]+$/i.test(network) ? `"${network}"` : escape(network);
  return `WIFI:T:WPA;S:${ssid};P:${escape(password)};;`;
}

export async function generateWifiQr(payload: string) {
  const { default: QRCode } = await import("qrcode");
  return QRCode.toDataURL(payload, { width: 320, margin: 4, errorCorrectionLevel: "M" });
}
