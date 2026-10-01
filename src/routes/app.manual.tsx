import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { parseText } from "@/lib/import-engine/adapters";
import { saveDraft } from "@/lib/store";

// Manual creation = an empty draft walked through the same question flow.
export const Route = createFileRoute("/app/manual")({ component: Manual });

function Manual() {
  const nav = useNavigate();
  useEffect(() => {
    const fields = parseText("").map((f) => ({ ...f, provenance: { ...f.provenance, source: "manual" as const } }));
    saveDraft({ source: "manual", propertyName: null, fields });
    nav({ to: "/app/complete", replace: true });
  }, [nav]);
  return null;
}
