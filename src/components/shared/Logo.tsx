import { Link } from "@tanstack/react-router";

export function Logo({ to = "/" }: { to?: "/" | "/app" }) {
  return (
    <Link to={to} className="flex shrink-0 items-center gap-2 whitespace-nowrap font-display text-base font-semibold sm:text-xl">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
        H
      </span>
      HostBuddy
    </Link>
  );
}
