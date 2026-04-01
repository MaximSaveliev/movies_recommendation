import Link from "next/link";

interface LogoProps {
  size?: "sm" | "lg";
}

export function Logo({ size = "sm" }: LogoProps) {
  const textClass = size === "lg" ? "text-3xl" : "text-lg";

  return (
    <Link href="/" className={`font-bold ${textClass} tracking-tight inline-flex items-center gap-0.5`}>
      <span className="text-white">Movie</span>
      <span className="ai-glow">AI</span>
      <style jsx>{`
        .ai-glow {
          color: #a78bfa;
          text-shadow:
            0 0 6px #a78bfa,
            0 0 12px #a78bfa,
            0 0 24px #7c3aed;
          animation: ai-pulse 2.5s ease-in-out infinite;
        }
        @keyframes ai-pulse {
          0%, 100% {
            text-shadow:
              0 0 6px #a78bfa,
              0 0 12px #a78bfa,
              0 0 24px #7c3aed;
          }
          50% {
            text-shadow:
              0 0 10px #c4b5fd,
              0 0 20px #a78bfa,
              0 0 40px #7c3aed,
              0 0 60px #6d28d9;
          }
        }
      `}</style>
    </Link>
  );
}
