"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { api, type User } from "@/lib/api";

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export function Navbar({ user, onLogout }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await api.auth.logout();
    onLogout();
    router.push("/login");
  };

  return (
    <nav className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
      <Logo />
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <Button asChild variant="ghost" size="sm" className="text-zinc-300 hover:text-white gap-2">
              <Link href="/profile">
                <UserIcon className="w-4 h-4" />
                {user.username}
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Logout
            </Button>
          </>
        ) : (
          <>
            <Button asChild variant="ghost" size="sm" className="text-zinc-300">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild size="sm" className="bg-white text-black hover:bg-zinc-200">
              <Link href="/register">Sign up</Link>
            </Button>
          </>
        )}
      </div>
    </nav>
  );
}
