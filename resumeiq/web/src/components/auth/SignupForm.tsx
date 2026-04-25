"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { upsertUser } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export function SignupForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await updateProfile(userCredential.user, {
        displayName: fullName,
      });

      await upsertUser({
        uid: userCredential.user.uid,
        email: userCredential.user.email || "",
        displayName: fullName,
        photoURL: userCredential.user.photoURL,
      });

      toast({
        title: "Success",
        description: "Account created! Welcome to ResumeIQ",
      });

      router.push("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);

      await upsertUser({
        uid: userCredential.user.uid,
        email: userCredential.user.email || "",
        displayName: userCredential.user.displayName || "",
        photoURL: userCredential.user.photoURL,
      });

      toast({
        title: "Success",
        description: "Account created! Welcome to ResumeIQ",
      });

      router.push("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign up with Google",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (pwd: string) => {
    if (pwd.length < 6) return { strength: 0, color: "bg-red-500" };
    if (pwd.length < 8) return { strength: 1, color: "bg-yellow-500" };
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) {
      return { strength: 3, color: "bg-green-500" };
    }
    return { strength: 2, color: "bg-blue-500" };
  };

  const strength = getPasswordStrength(password);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Logo */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-[#F8F8F2] mb-2">ResumeIQ</h2>
        <h1 className="text-2xl font-semibold text-[#F8F8F2] mb-1">
          Create your account
        </h1>
        <p className="text-gray-400">Start analyzing resumes for free</p>
      </div>

      {/* Google Sign Up */}
      <Button
        onClick={handleGoogleSignup}
        disabled={loading}
        className="w-full h-11 bg-white text-black hover:bg-gray-100 mb-4 font-semibold"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign up with Google
          </>
        )}
      </Button>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#1E1E2E]" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-[#0A0A0F] text-gray-400">or with email</span>
        </div>
      </div>

      {/* Email Form */}
      <form onSubmit={handleEmailSignup} className="space-y-4">
        <div>
          <Label htmlFor="fullName" className="text-[#F8F8F2]">
            Full Name
          </Label>
          <Input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            required
            className="input-dark mt-1"
          />
        </div>

        <div>
          <Label htmlFor="email" className="text-[#F8F8F2]">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="input-dark mt-1"
          />
        </div>

        <div>
          <Label htmlFor="password" className="text-[#F8F8F2]">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="input-dark mt-1"
          />
          {password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 bg-gray-700 rounded-full h-1">
                <div
                  className={`h-full rounded-full transition-all ${strength.color}`}
                  style={{ width: `${(strength.strength + 1) * 25}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">
                {strength.strength === 0 && "Weak"}
                {strength.strength === 1 && "Fair"}
                {strength.strength === 2 && "Good"}
                {strength.strength === 3 && "Strong"}
              </span>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="confirmPassword" className="text-[#F8F8F2]">
            Confirm Password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="input-dark mt-1"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="btn-primary w-full h-11 font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating account...
            </>
          ) : (
            "Sign up"
          )}
        </Button>
      </form>

      {/* Terms */}
      <p className="mt-6 text-center text-xs text-gray-400">
        By signing up you agree to our{" "}
        <Link href="#" className="text-[#10B981] hover:text-[#059669]">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="#" className="text-[#10B981] hover:text-[#059669]">
          Privacy Policy
        </Link>
      </p>

      {/* Sign in link */}
      <p className="mt-4 text-center text-gray-400">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-[#10B981] hover:text-[#059669]">
          Sign in
        </Link>
      </p>
    </div>
  );
}
