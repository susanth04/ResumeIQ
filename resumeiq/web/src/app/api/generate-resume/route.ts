import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/verify-id-token";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export async function POST(request: NextRequest) {
  if (!API_BASE) {
    return NextResponse.json({ error: "NEXT_PUBLIC_API_URL is not configured." }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return NextResponse.json(
      { error: "Missing Authorization bearer token" },
      { status: 401 }
    );
  }

  const uid = await verifyFirebaseIdToken(token);
  if (!uid) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_BASE}/generate-resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const contentType = res.headers.get("content-type") ?? "";

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || `Upstream error ${res.status}` },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
      );
    }

    if (contentType.includes("application/pdf")) {
      const arrayBuffer = await res.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="improved_resume.pdf"',
        },
      });
    }

    const json = await res.json();
    return NextResponse.json(json);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Proxy failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
