import { NextRequest, NextResponse } from "next/server";

const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  const code = req.nextUrl.searchParams.get("code") ?? "";
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const expectedState = req.cookies.get("resumeiq_github_oauth_state")?.value ?? "";

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/dashboard/github?github_oauth=missing_config`);
  }
  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(`${appUrl}/dashboard/github?github_oauth=invalid_state`);
  }

  try {
    const tokenRes = await fetch(GITHUB_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
      cache: "no-store",
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token as string | undefined;

    if (!tokenRes.ok || !accessToken) {
      return NextResponse.redirect(`${appUrl}/dashboard/github?github_oauth=token_failed`);
    }

    const res = NextResponse.redirect(`${appUrl}/dashboard/github?github_oauth=success`);
    res.cookies.delete("resumeiq_github_oauth_state");
    res.cookies.set("resumeiq_github_access_token", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return res;
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard/github?github_oauth=token_failed`);
  }
}
