import { Controller, Get, Param, Query, Res } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { ApiProblem } from "../errors/problem";
import { Public } from "./session.guard";

/** The app pages an account email may open, and only these (mailer.ts). */
export const OPEN_PAGES = ["verify-email", "reset-password", "confirm-email-change"] as const;
export type OpenPage = (typeof OPEN_PAGES)[number];

/** Better Auth's tokens: random ids, or signed JWTs (base64url with dots). */
const TOKEN = /^[A-Za-z0-9._~-]{1,1024}$/;

function isOpenPage(page: string): page is OpenPage {
  return (OPEN_PAGES as readonly string[]).includes(page);
}

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The garnet:// link the page hands on; exported for the mailer's tests. */
export function appLink(page: OpenPage, token: string): string {
  return `garnet://${page}?token=${encodeURIComponent(token)}`;
}

/**
 * `GET /v1/open/:page?token=…` (public; production-fix-plan A7). Mail apps such as Gmail strip
 * links that aren't http(s), so account emails link here and this page opens the app. It never
 * uses the token itself: it only passes it to garnet://, where the app finishes the step, and
 * the token works once there. Nothing is stored, logged (routes are logged without their query,
 * app.ts) or sent to another site (no-referrer, no external resources).
 */
@Controller("v1/open")
export class OpenLinkController {
  @Public()
  @Get(":page")
  open(
    @Param("page") page: string,
    @Query("token") token: unknown,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): string {
    if (!isOpenPage(page) || typeof token !== "string" || !TOKEN.test(token))
      throw new ApiProblem("not_found");
    const href = escape(appLink(page, token));
    void reply
      .type("text/html; charset=utf-8")
      .header("referrer-policy", "no-referrer")
      .header("x-robots-tag", "noindex")
      .header("x-frame-options", "DENY")
      .header(
        "content-security-policy",
        "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      );
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta http-equiv="refresh" content="0;url=${href}">
<title>Opening Garnet</title>
<style>body{font-family:system-ui,sans-serif;background:#0B0C10;color:#F4F1FA;display:flex;min-height:100vh;margin:0;align-items:center;justify-content:center;text-align:center;padding:24px;box-sizing:border-box}a{display:inline-block;margin-top:16px;background:#7B55F0;color:#fff;padding:14px 24px;border-radius:999px;text-decoration:none;font-weight:600}p{max-width:28rem;line-height:1.5}</style>
</head><body><main><h1>Opening Garnet…</h1>
<p>If the app doesn't open by itself, tap below on the phone where Garnet is installed.</p>
<a href="${href}">Open Garnet</a></main></body></html>`;
  }
}
