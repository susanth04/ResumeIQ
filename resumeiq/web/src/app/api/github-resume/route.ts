import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export async function POST(req: NextRequest) {
  if (!API_BASE) {
    return NextResponse.json(
      { detail: "NEXT_PUBLIC_API_URL is not configured." },
      { status: 500 }
    );
  }
  const authHeader = req.headers.get("authorization") ?? "";
  const body = await req.json();
  const oauthToken = req.cookies.get("resumeiq_github_access_token")?.value ?? "";

  const payload =
    typeof body?.github_token === "string" && body.github_token.trim()
      ? body
      : { ...body, github_token: oauthToken };

  if (!payload.github_token) {
    return NextResponse.json(
      { detail: "GitHub access token is required. Connect GitHub or paste a PAT." },
      { status: 400 }
    );
  }

  const backendRes = await fetch(`${API_BASE}/github-resume`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(payload),
  });

  const ct = backendRes.headers.get("content-type") ?? "";

  if (ct.includes("application/pdf")) {
    const buf = await backendRes.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          backendRes.headers.get("content-disposition") ?? 'attachment; filename="github_resume.pdf"',
      },
    });
  }

  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}
