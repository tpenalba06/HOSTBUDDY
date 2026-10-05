import { describe, expect, it } from "vitest";
import { robotsTextAllows } from "./robots-policy";

const permits = (text: string, path: string) =>
  robotsTextAllows(text, new URL(path, "https://synthetic.example.invalid"));

describe("permitted public import robots rules", () => {
  it("keeps consecutive agents in the same group", () => {
    expect(permits("User-agent: *\nUser-agent: AnotherBot\nDisallow: /", "/villa")).toBe(false);
  });
  it("applies explicit matching groups instead of wildcard fallback", () => {
    expect(
      permits("User-agent: *\nDisallow: /\nUser-agent: HostBuddyBot\nAllow: /villa", "/villa"),
    ).toBe(true);
    expect(
      permits("User-agent: hostbuddybot\nDisallow: /\nUser-agent: *\nAllow: /", "/villa"),
    ).toBe(false);
  });
  it("combines repeated explicit groups", () => {
    expect(
      permits(
        "User-agent: HostBuddyBot\nDisallow: /private\nUser-agent: HostBuddyBot\nDisallow: /villa",
        "/villa",
      ),
    ).toBe(false);
  });
  it("uses the longest rule and lets Allow win an equal match", () => {
    expect(
      permits(
        "User-agent: *\nDisallow: /\nAllow: /villa\nDisallow: /villa/private",
        "/villa/public",
      ),
    ).toBe(true);
    expect(permits("User-agent: *\nDisallow: /villa\nAllow: /villa", "/villa")).toBe(true);
    expect(
      permits(
        "User-agent: *\nDisallow: /\nAllow: /villa\nDisallow: /villa/private",
        "/villa/private",
      ),
    ).toBe(false);
  });
  it("honors wildcard, end marker, query and percent-encoded unreserved characters", () => {
    expect(permits("User-agent: *\nDisallow: /*?private=*", "/villa?private=yes")).toBe(false);
    expect(permits("User-agent: *\nDisallow: /villa$", "/villa/public")).toBe(true);
    expect(permits("User-agent: *\nDisallow: /villa", "/%76illa")).toBe(false);
  });
  it("ignores ungrouped rules and comments", () => {
    expect(permits("Disallow: /\nUser-agent: *\nAllow: / # public\nDisallow:", "/villa")).toBe(
      true,
    );
  });
});
