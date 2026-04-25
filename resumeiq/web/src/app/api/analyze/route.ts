import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/verify-id-token";
import type { ResumeAnalysisApiResult } from "@/types/analysis";

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
    return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
  }

  const uid = await verifyFirebaseIdToken(token);
  if (!uid) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") ?? formData.get("resume");
  const targetRole = formData.get("target_role");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const upstream = new FormData();
  upstream.append("resume", file, file.name);
  const qs =
    typeof targetRole === "string" && targetRole.trim()
      ? `?target_role=${encodeURIComponent(targetRole.trim())}`
      : "";

  try {
    const uidQuery = `${qs ? "&" : "?"}user_id=${encodeURIComponent(uid)}`;
    const res = await fetch(`${API_BASE}/upload${qs}${uidQuery}`, {
      method: "POST",
      body: upstream,
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: text || `Upstream error ${res.status}` },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
      );
    }

    const json = JSON.parse(text) as ResumeAnalysisApiResult;
    return NextResponse.json(json);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Proxy failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
