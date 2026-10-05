/** No CSP guesses: hosted media and preview embeds keep their current behavior. */
export function secureResponse(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  const url = new URL(request.url);
  if (url.protocol === "https:") headers.set("Strict-Transport-Security", "max-age=31536000");
  if (/^\/(?:api(?:\/|$)|app(?:\/|$)|auth(?:\/|$)|pay(?:\/|$)|_server(?:\/|$))/.test(url.pathname))
    headers.set("Cache-Control", "no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
