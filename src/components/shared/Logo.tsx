import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">H</span>
      HostBuddy
    </Link>
  );
}
