import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export async function POST(request: NextRequest) {
  if (!API_BASE) {
    return NextResponse.json({ error: "NEXT_PUBLIC_API_URL is not configured." }, { status: 500 });
  }
  try {
    const body = await request.json();
    const response = await fetch(`${API_BASE}/feedback/caveman`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    if (!response.ok) {
      return NextResponse.json({ error: text || "Upstream error" }, { status: response.status });
    }
    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Caveman API failed" }, { status: 500 });
  }
}
