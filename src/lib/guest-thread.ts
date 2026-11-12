export type GuestThreadSession = { id: string; token: string };
export type GuestThread = {
  id: string;
  status: string;
  messages: { id: string; sender_type: string; body: string; created_at: string }[];
};
export function parseThreadSession(value: unknown): GuestThreadSession | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  return typeof item["id"] === "string" &&
    /^[0-9a-f-]{36}$/.test(item["id"]) &&
    typeof item["token"] === "string" &&
    /^[0-9a-f]{64}$/.test(item["token"])
    ? { id: item["id"], token: item["token"] }
    : null;
}
