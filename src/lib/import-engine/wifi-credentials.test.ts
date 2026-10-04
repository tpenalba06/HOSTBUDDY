import { describe, it, expect } from "vitest";
import { wifiCredentials } from "./wifi-credentials";
import { extractFromText } from "./rules-extractor";
describe("explicit property and Wi-Fi import normalization", () => {
  it("removes a labelled property name without consuming the next information", () => {
    const result = extractFromText(
      "Nom du logement : Villa Dolce\nRéseau : VillaWifi\nMot de passe : Soleil2026",
    );
    expect(result.propertyName).toBe("Villa Dolce");
    expect(result.fields.find((f) => f.key === "wifi")?.rawValue).toContain("Soleil2026");
  });
  it("finds an explicit property name below an introduction and refuses conflicts", () => {
    expect(
      extractFromText("Bienvenue dans notre maison.\nNom du logement : Villa Dolce").propertyName,
    ).toBe("Villa Dolce");
    expect(
      extractFromText("Nom du logement : Villa A\nNom du logement : Villa B").propertyName,
    ).toBeNull();
  });
  it("separates network and password with preserved case and punctuation", () => {
    expect(wifiCredentials("Réseau : VillaWifi\nMot de passe : Soleil2026!")).toEqual({
      network: "VillaWifi",
      password: "Soleil2026!",
    });
    expect(wifiCredentials("Wi-Fi : SSID=VillaWifi; Password=Soleil2026")).toEqual({
      network: "VillaWifi",
      password: "Soleil2026",
    });
  });
  it("preserves semicolons inside a password", () => {
    expect(wifiCredentials("Réseau : A\nMot de passe : sun;moon")).toEqual({
      network: "A",
      password: "sun;moon",
    });
  });
  it("never invents missing credentials or extracts unrelated passwords", () => {
    expect(wifiCredentials("Réseau : VillaWifi")).toEqual({ network: "VillaWifi" });
    expect(wifiCredentials("Mot de passe : CompteGestionnaire")).toBeNull();
    expect(wifiCredentials("Le wifi est disponible à l'accueil")).toBeNull();
  });
  it("keeps contradictory or uncertain credentials for human review", () => {
    expect(wifiCredentials("Réseau : A\nRéseau : B\nMot de passe : x")).toBeNull();
    expect(wifiCredentials("Réseau : A\nMot de passe : à confirmer")).toBeNull();
  });
});
