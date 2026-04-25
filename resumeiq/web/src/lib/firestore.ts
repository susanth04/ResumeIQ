import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import type { ResumeAnalysisApiResult, SavedAnalysis, ScoreSubset } from "@/types/analysis";

function analysisDocRef(analysisId: string) {
  return doc(db, "analyses", analysisId);
}

function userDocRef(uid: string) {
  return doc(db, "users", uid);
}

function mapDocToAnalysis(
  id: string,
  data: Record<string, unknown>
): SavedAnalysis {
  const createdRaw = data.createdAt as { toDate?: () => Date } | undefined;
  const createdAt =
    createdRaw && typeof createdRaw.toDate === "function"
      ? createdRaw.toDate()
      : new Date();

  return {
    id,
    userId: String(data.userId ?? ""),
    fileName: String(data.fileName ?? ""),
    fileSize: Number(data.fileSize ?? 0),
    targetRole:
      data.targetRole === null || data.targetRole === undefined
        ? null
        : String(data.targetRole),
    totalScore: Number(data.totalScore ?? 0),
    scores: data.scores as ScoreSubset,
    weakAreas: (data.weakAreas as string[]) ?? [],
    feedback: String(data.feedback ?? ""),
    suggestions: (data.suggestions as string[]) ?? [],
    parsedName: String(data.parsedName ?? ""),
    parsedEmail: String(data.parsedEmail ?? ""),
    parsedResume: data.parsedResume as SavedAnalysis["parsedResume"],
    createdAt,
  };
}

/** Persist analysis from FastAPI response; returns Firestore document id (same as API id). */
export async function saveAnalysis(
  userId: string,
  fileName: string,
  fileSize: number,
  targetRole: string | null,
  apiResult: ResumeAnalysisApiResult
): Promise<string> {
  const id = apiResult.id;
  const scores: ScoreSubset = {
    skills_completeness: apiResult.scores.skills_completeness,
    experience_clarity: apiResult.scores.experience_clarity,
    ats_keyword_density: apiResult.scores.ats_keyword_density,
    formatting_quality: apiResult.scores.formatting_quality,
    education_relevance: apiResult.scores.education_relevance,
  };

  await setDoc(analysisDocRef(id), {
    id,
    userId,
    fileName,
    fileSize,
    targetRole,
    totalScore: apiResult.scores.total_score,
    scores,
    weakAreas: apiResult.weak_areas,
    feedback: apiResult.feedback,
    suggestions: apiResult.suggestions,
    parsedName: apiResult.parsed.name,
    parsedEmail: apiResult.parsed.email,
    parsedResume: apiResult.parsed,
    createdAt: serverTimestamp(),
  });

  const userRef = userDocRef(userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    const total = Number(snap.data()?.totalAnalyses ?? 0);
    await updateDoc(userRef, {
      totalAnalyses: total + 1,
    });
  }

  return id;
}

export async function getUserAnalyses(userId: string): Promise<SavedAnalysis[]> {
  const q = query(
    collection(db, "analyses"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapDocToAnalysis(d.id, d.data()));
}

export function subscribeUserAnalyses(
  userId: string,
  onChange: (items: SavedAnalysis[]) => void,
  onError?: (error: unknown) => void
) {
  const q = query(
    collection(db, "analyses"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => mapDocToAnalysis(d.id, d.data()))),
    onError
  );
}

export async function getAnalysis(
  analysisId: string
): Promise<SavedAnalysis | null> {
  const snap = await getDoc(analysisDocRef(analysisId));
  if (!snap.exists()) return null;
  return mapDocToAnalysis(snap.id, snap.data());
}

export async function deleteAnalysis(analysisId: string): Promise<void> {
  await deleteDoc(analysisDocRef(analysisId));
}

interface UserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}

export async function upsertUser(user: User | UserData): Promise<void> {
  const uid = user.uid;
  const ref = userDocRef(uid);
  const snap = await getDoc(ref);
  const payload = {
    uid: uid,
    email: user.email ?? "",
    displayName: user.displayName ?? "",
    photoURL: user.photoURL ?? null,
    updatedAt: serverTimestamp(),
  };

  if (!snap.exists()) {
    await setDoc(ref, {
      ...payload,
      createdAt: serverTimestamp(),
      totalAnalyses: 0,
    });
  } else {
    await updateDoc(ref, payload);
  }
}

/** Last N analyses for dashboard home. */
export async function getRecentAnalyses(
  userId: string,
  max: number
): Promise<SavedAnalysis[]> {
  const q = query(
    collection(db, "analyses"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapDocToAnalysis(d.id, d.data()));
}
