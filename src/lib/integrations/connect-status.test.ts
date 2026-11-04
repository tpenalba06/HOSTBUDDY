import { describe, expect, it } from "vitest";
import { connectStatusFromAccount } from "./connect-status";

describe("Connect onboarding capability and requirement states", () => {
  it("never authorizes collection for a missing, pending, restricted or inactive capability", () => {
    for (const status of [undefined, "pending", "restricted", "inactive"]) {
      expect(
        connectStatusFromAccount({
          configuration: {
            merchant: {
              capabilities: {
                card_payments: status ? { status } : {},
              },
            },
          },
        }).chargesEnabled,
      ).toBe(false);
    }
  });
  it("reports user actions separately from Stripe verification without returning identity data", () => {
    const result = connectStatusFromAccount({
      requirements: {
        entries: [
          { description: "representative.given_name", awaiting_action_from: "user" },
          { description: "representative.surname", awaiting_action_from: "user" },
          { description: "representative.address.city", awaiting_action_from: "user" },
          { description: "external_account", awaiting_action_from: "user" },
          {
            description: "identity.attestations.terms_of_service.account.date",
            awaiting_action_from: "user",
          },
          { description: "representative.verification.document", awaiting_action_from: "stripe" },
        ],
      },
    });
    expect(result).toEqual({
      status: "incomplete",
      chargesEnabled: false,
      payoutsEnabled: false,
      requirements: ["identity", "address", "bank", "terms"],
      pendingVerification: true,
    });
    expect(JSON.stringify(result)).not.toContain("representative");
  });
  it("does not ask the user to resubmit information that Stripe is reviewing", () => {
    expect(
      connectStatusFromAccount({
        requirements: { entries: [{ description: "document", awaiting_action_from: "stripe" }] },
      }),
    ).toMatchObject({ status: "verification", requirements: [] });
  });
  it("keeps payout authorization separate from card authorization", () => {
    const configuration = {
      merchant: {
        capabilities: {
          card_payments: { status: "active" },
          stripe_balance: { payouts: { status: "pending" } },
        },
      },
    };
    expect(connectStatusFromAccount({ configuration })).toMatchObject({
      status: "payoutsPending",
      chargesEnabled: true,
      payoutsEnabled: false,
    });
    configuration.merchant.capabilities.stripe_balance.payouts.status = "active";
    expect(connectStatusFromAccount({ configuration }).status).toBe("ready");
  });
  it("keeps unknown requirements visible as an action in Stripe", () => {
    expect(
      connectStatusFromAccount({
        requirements: {
          entries: [{ description: "new.stripe.requirement", awaiting_action_from: "user" }],
        },
      }).requirements,
    ).toEqual(["other"]);
  });
});
