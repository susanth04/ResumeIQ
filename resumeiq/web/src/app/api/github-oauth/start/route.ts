import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";

export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

  if (!clientId) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/github?github_oauth=missing_config`
    );
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${appUrl}/api/github-oauth/callback`;
  const search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user repo read:org",
    state,
  });

  const res = NextResponse.redirect(`${GITHUB_AUTHORIZE_URL}?${search.toString()}`);
  res.cookies.set("resumeiq_github_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  return res;
}
