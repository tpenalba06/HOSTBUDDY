import { Link } from "@tanstack/react-router";
import { NonaWordmark } from "./NonaBrand";

export function Logo({ to = "/" }: { to?: "/" | "/app" }) {
  return (
    <Link
      to={to}
      className="flex shrink-0 items-center gap-2 whitespace-nowrap font-display text-base font-semibold sm:text-xl"
    >
      <NonaWordmark />
    </Link>
  );
}
