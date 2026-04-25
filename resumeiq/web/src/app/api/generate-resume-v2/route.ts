import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/verify-id-token";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export async function POST(request: NextRequest) {
  if (!API_BASE) {
    return NextResponse.json({ error: "NEXT_PUBLIC_API_URL is not configured." }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
  }
  const uid = await verifyFirebaseIdToken(token);
  if (!uid) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const res = await fetch(`${API_BASE}/generate-resume-v2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json({ error: text || `Upstream error ${res.status}` }, { status: res.status });
    }
    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Proxy failed" }, { status: 502 });
  }
}
