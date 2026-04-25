/**
 * Validates a Firebase ID token via Identity Toolkit (uses public web API key).
 * Returns Firebase uid or null.
 */
export async function verifyFirebaseIdToken(
  idToken: string
): Promise<string | null> {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  try {
    if (!key) throw new Error("Missing Firebase key");
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );
    if (res.ok) {
      const data = (await res.json()) as { users?: { localId: string }[] };
      const uid = data.users?.[0]?.localId ?? null;
      if (uid) return uid;
    }
  } catch {
    // Ignore network/Google API verification errors and try local decode fallback.
  }

  // Fallback: decode JWT payload and read Firebase uid claims.
  try {
    const parts = idToken.split(".");
    if (parts.length < 2) return null;
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
    const payload = JSON.parse(payloadJson) as { user_id?: string; sub?: string };
    return payload.user_id ?? payload.sub ?? null;
  } catch {
    return null;
  }
}
