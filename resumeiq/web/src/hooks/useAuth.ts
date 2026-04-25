import { useAuth as useAuthContext } from "@/components/providers/AuthProvider";

export function useAuth() {
  return useAuthContext();
}
