import { expect, it } from "vitest";
import { createGateway, generateText, Output } from "ai";
import { z } from "zod";
import {
  assertConciergeWireRequest,
  conciergeCatalogueAllowed,
  MAX_GATEWAY_BODY_BYTES,
} from "./concierge-cost-guard.server";

const model = () => ({
  id: "anthropic/claude-haiku-5.5",
  no_training: "all",
  zdr: "all",
  pricing: {
    input: "0.0000001",
    output: "0.0000005",
    input_tiers: [
      { min: 0, max: 100001, cost: "0.0000001" },
      { min: 100001, cost: "0.0000005" },
    ],
  },
});
const request = () => ({
  maxOutputTokens: 800,
  prompt: [],
  responseFormat: { type: "json", schema: {} },
  providerOptions: {
    gateway: {
      only: ["anthropic"],
      models: [] as string[],
      zeroDataRetention: true,
      disallowPromptTraining: true,
    },
    anthropic: { thinking: { type: "disabled" } },
  },
});
const check = (value: unknown) =>
  assertConciergeWireRequest("https://ai-gateway.vercel.sh/v4/ai/language-model", {
    method: "POST",
    body: JSON.stringify(value),
  });

it("rejects a hidden high-price tier and malformed catalogue prices", () => {
  expect(conciergeCatalogueAllowed(model())).toBe(true);
  const inflated = model();
  inflated.pricing.input_tiers[1]!.cost = "0.5";
  expect(conciergeCatalogueAllowed(inflated)).toBe(false);
  for (const input of ["", "NaN", "-1", "Infinity"]) {
    const invalid = model();
    invalid.pricing.input = input;
    expect(conciergeCatalogueAllowed(invalid)).toBe(false);
  }
  expect(conciergeCatalogueAllowed({ ...model(), no_training: "none" })).toBe(false);
});

it("checks the installed SDK wire format without contacting a provider", async () => {
  let checked = false;
  const gateway = createGateway({
    apiKey: "SYNTHETIC-NOT-A-KEY",
    fetch: async (url, init) => {
      assertConciergeWireRequest(url, init);
      checked = true;
      throw new Error("checked-without-network");
    },
  });
  await expect(
    generateText({
      model: gateway("anthropic/claude-haiku-5.5"),
      prompt: "Coucou",
      system: "Nona test",
      output: Output.object({ schema: z.object({ text: z.string() }) }),
      maxOutputTokens: 800,
      maxRetries: 0,
      providerOptions: {
        gateway: {
          only: ["anthropic"],
          models: [],
          zeroDataRetention: true,
          disallowPromptTraining: true,
        },
        anthropic: { thinking: { type: "disabled" } },
      },
    }),
  ).rejects.toThrow();
  expect(checked).toBe(true);
});
it("bounds the actual serialized request including an oversized schema", () => {
  expect(() => check(request())).not.toThrow();
  const oversized = request();
  oversized.responseFormat.schema = { description: "x".repeat(MAX_GATEWAY_BODY_BYTES) };
  expect(() => check(oversized)).toThrow();
});
it("blocks extra output, tools, alternate routes and removed confidentiality filters", () => {
  expect(() => check({ ...request(), maxOutputTokens: 801 })).toThrow();
  expect(() => check({ ...request(), tools: [{ type: "provider", name: "search" }] })).toThrow();
  const fallback = request();
  fallback.providerOptions.gateway.models = ["other-model"];
  expect(() => check(fallback)).toThrow();
  const relaxed = request();
  relaxed.providerOptions.gateway.zeroDataRetention = false;
  expect(() => check(relaxed)).toThrow();
  expect(() =>
    assertConciergeWireRequest("https://untrusted.invalid", {
      method: "POST",
      body: JSON.stringify(request()),
    }),
  ).toThrow();
});
