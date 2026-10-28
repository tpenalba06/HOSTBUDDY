import { createContext } from "react";
import type { ConciergeRequest, ConciergeTurn } from "./concierge";

// Only the isolated local entry provides this context. Public guides keep their
// existing server transport and booking permissions.
export const LocalConciergeTransport = createContext<
  ((request: ConciergeRequest) => Promise<ConciergeTurn>) | null
>(null);
