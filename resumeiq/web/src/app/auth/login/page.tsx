import { LoginForm } from "@/components/auth/LoginForm";
import { AuroraBackground } from "@/components/ui/aurora-background";

export default function LoginPage() {
  return (
    <AuroraBackground
      className="dark bg-[#0A0A0F] px-4"
      showRadialGradient={true}
    >
      <div className="relative z-10 w-full flex items-center justify-center">
        <LoginForm />
      </div>
    </AuroraBackground>
  );
}
