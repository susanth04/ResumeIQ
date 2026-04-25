import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/verify-id-token";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  if (!API_BASE) {
    return NextResponse.json({ error: "NEXT_PUBLIC_API_URL is not configured." }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
  }
  const uid = await verifyFirebaseIdToken(token);
  if (!uid || uid !== params.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const res = await fetch(`${API_BASE}/history/${params.userId}`);
    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json({ error: text || "Upstream error" }, { status: res.status });
    }
    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Proxy failed" }, { status: 502 });
  }
}
