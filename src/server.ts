import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { reportOperationalEvent } from "./lib/operational-events.server";
import {
  deliverServerFailureAlert,
  serverAlertConfiguration,
} from "./lib/operational-alert.server";
import { secureResponse } from "./lib/security-headers";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function alertServerFailure(env: unknown) {
  const delivery = await deliverServerFailureAlert(serverAlertConfiguration(env));
  if (delivery === "FAILED" || delivery === "INVALID_CONFIGURATION")
    reportOperationalEvent("operational_alert_failed");
}

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  consumeLastCapturedError();
  reportOperationalEvent("server_request_failed");
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      // Handled SSR 5xx responses also need an operational signal. The h3
      // normalization above already reported its replaced response.
      if (normalized === response && response.status >= 500)
        reportOperationalEvent("server_request_failed");
      if (normalized.status >= 500) await alertServerFailure(env);
      return secureResponse(request, normalized);
    } catch {
      reportOperationalEvent("server_request_failed");
      await alertServerFailure(env);
      return secureResponse(
        request,
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
