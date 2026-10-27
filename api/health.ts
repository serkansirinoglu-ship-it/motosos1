import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Preview-only runtime probe.
 *
 * This endpoint deliberately does not read environment variables beyond
 * VERCEL_ENV, access Firebase/Firestore, or expose deployment configuration.
 * It returns 404 everywhere except Vercel Preview so it cannot become a
 * production health surface if this branch is ever promoted.
 */
export default function handler(
  req: IncomingMessage,
  res: ServerResponse,
): void {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (process.env.VERCEL_ENV !== "preview") {
    res.statusCode = 404;
    res.end();
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.statusCode = 405;
    res.end();
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(
    req.method === "HEAD"
      ? undefined
      : JSON.stringify({
          status: "ok",
          scope: "preview-only",
          service: "motoguard-runtime-probe",
        }),
  );
}
