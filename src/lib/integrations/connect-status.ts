/** Only capability states returned by Stripe authorize collection, never a return URL. */
type ConnectedAccount = {
  configuration?: {
    merchant?: {
      capabilities?: {
        card_payments?: { status?: string };
        stripe_balance?: { payouts?: { status?: string } };
      };
    } | null;
  } | null;
  requirements?: {
    entries?: Array<{ description: string; awaiting_action_from: string }>;
  } | null;
};

export function connectStatusFromAccount(account: ConnectedAccount) {
  const merchant = account.configuration?.merchant?.capabilities;
  const chargesEnabled = merchant?.card_payments?.status === "active";
  const payoutsEnabled = merchant?.stripe_balance?.payouts?.status === "active";
  const entries = account.requirements?.entries ?? [];
  const requirements = [
    ...new Set(
      entries
        .filter((entry) => entry.awaiting_action_from !== "stripe")
        .map(({ description }) => {
          if (/attestations|tos_acceptance/.test(description)) return "terms";
          if (/external_account|bank_account/.test(description)) return "bank";
          if (/address/.test(description)) return "address";
          if (/email|phone/.test(description)) return "contact";
          if (/representative|owner|director|executive|document|tax_id/.test(description))
            return "identity";
          if (/merchant|profile|entity_type|business_type/.test(description)) return "business";
          return "other";
        }),
    ),
  ];
  const pendingVerification = entries.some((entry) => entry.awaiting_action_from === "stripe");
  const status = requirements.length
    ? "incomplete"
    : chargesEnabled
      ? payoutsEnabled
        ? "ready"
        : "payoutsPending"
      : pendingVerification
        ? "verification"
        : "restricted";
  return { status, chargesEnabled, payoutsEnabled, requirements, pendingVerification };
}
