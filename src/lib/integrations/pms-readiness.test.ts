import { describe, expect, it } from "vitest";
import { getIntegration } from "./registry";
import { PMS_READINESS } from "./pms-readiness";

describe("honest PMS operational registry", () => {
  it.each(["guesty", "lodgify", "hostaway", "smoobu", "beds24", "amenitiz", "cloudbeds", "mews"])(
    "retains fallback and external validation for %s",
    (id) => {
      const definition = getIntegration(id);
      expect(definition?.category).toBe("pms");
      expect(PMS_READINESS[id]?.verifiedNetwork).toBe(false);
      expect(PMS_READINESS[id]?.fallback).toEqual(["pasted-text", "generic-web"]);
      expect(definition && "readiness" in definition ? definition.readiness : undefined).toEqual(
        PMS_READINESS[id],
      );
      expect(definition?.status).not.toBe("available");
    },
  );
  it("does not confuse an implemented Guesty adapter with validated credentials", () => {
    expect(PMS_READINESS["guesty"]!.implementation).toBe("adapter_implemented");
    expect(PMS_READINESS["guesty"]!.externalAccess).toBe("credentials_required");
  });
});
