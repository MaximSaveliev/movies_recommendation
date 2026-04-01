"use client";

import { Bookmark, Clock, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface BookmarkButtonProps {
  movieId: string;
  kind: "favorite" | "watch_later";
  isLoggedIn: boolean;
}

const config = {
  favorite: {
    icon: Heart,
    label: "Favourite",
    activeClass: "text-red-400 border-red-400/40 bg-red-400/10 hover:bg-red-400/20",
  },
  watch_later: {
    icon: Clock,
    label: "Watch later",
    activeClass: "text-violet-400 border-violet-400/40 bg-violet-400/10 hover:bg-violet-400/20",
  },
};

export function BookmarkButton({ movieId, kind, isLoggedIn }: BookmarkButtonProps) {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const { icon: Icon, label, activeClass } = config[kind];

  useEffect(() => {
    if (!isLoggedIn) return;
    api.bookmarks.status(movieId).then((s) => setActive(s[kind])).catch(() => {});
  }, [movieId, kind, isLoggedIn]);

  const toggle = async () => {
    if (!isLoggedIn || loading) return;
    setLoading(true);
    try {
      if (active) {
        await api.bookmarks.remove(movieId, kind);
        setActive(false);
      } else {
        await api.bookmarks.add(movieId, kind);
        setActive(true);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={loading}
      className={`gap-2 border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-colors ${active ? activeClass : ""}`}
    >
      <Icon className={`w-4 h-4 ${active && kind === "favorite" ? "fill-current" : ""}`} />
      {label}
    </Button>
  );
}
