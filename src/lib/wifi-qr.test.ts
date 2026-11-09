import { describe, expect, it } from "vitest";
import { generateWifiQr, publishedWifiCredentials, wifiQrPayload } from "./wifi-qr";

describe("Wi-Fi connection QR", () => {
  it("uses the original, explicitly labelled credentials and escapes ZXing delimiters", () => {
    const credentials = publishedWifiCredentials([
      { label: "Réseau", text: "Maison;Café:1" },
      { label: "Mot de passe", text: 'pw;:,"\\test?' },
    ]);
    expect(credentials).toEqual({ network: "Maison;Café:1", password: 'pw;:,"\\test?' });
    expect(wifiQrPayload(credentials?.network, credentials?.password)).toBe(
      'WIFI:T:WPA;S:Maison\\;Café\\:1;P:pw\\;\\:\\,\\"\\\\test?;;',
    );
    expect(wifiQrPayload("ABCD", "password")).toBe('WIFI:T:WPA;S:"ABCD";P:password;;');
  });

  it("does not encode incomplete, ambiguous or multi-line data", () => {
    expect(wifiQrPayload("Maison")).toBeNull();
    expect(wifiQrPayload("Maison", "first\nsecond")).toBeNull();
    expect(
      publishedWifiCredentials([{ label: "Wi-Fi", text: "Réseau Maison / mot de passe secret" }]),
    ).toBeNull();
    expect(
      publishedWifiCredentials([
        { label: "Réseau", text: "Maison" },
        { label: "Réseau", text: "Voisin" },
        { label: "Mot de passe", text: "secret" },
      ]),
    ).toBeNull();
  });

  it("generates a PNG data URL locally", async () => {
    const png = await generateWifiQr("WIFI:T:WPA;S:VillaMare;P:synthetic;;");
    expect(png).toMatch(/^data:image\/png;base64,iVBORw0KGgo/);
  });
});
