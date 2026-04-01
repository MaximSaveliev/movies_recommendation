"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Clock, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import { api, type Bookmark, type User } from "@/lib/api";

type Tab = "favorites" | "watch_later";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [tab, setTab] = useState<Tab>("favorites");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth.me()
      .then(setUser)
      .catch(() => router.push("/login"));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.bookmarks.list(tab === "favorites" ? "favorite" : "watch_later")
      .then(setBookmarks)
      .catch(() => setBookmarks([]))
      .finally(() => setLoading(false));
  }, [user, tab]);

  const removeBookmark = async (movieId: string) => {
    await api.bookmarks.remove(movieId, tab === "favorites" ? "favorite" : "watch_later");
    setBookmarks((prev) => prev.filter((b) => b.movie_id !== movieId));
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} onLogout={() => { setUser(null); router.push("/login"); }} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-16 h-16 rounded-full bg-violet-600 flex items-center justify-center text-2xl font-bold text-white">
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{user.username}</h1>
            <p className="text-zinc-500 text-sm">{user.email}</p>
          </div>
        </div>

        <div className="flex gap-1 mb-8 border-b border-zinc-800">
          <button
            onClick={() => setTab("favorites")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "favorites"
                ? "border-violet-500 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Heart className="w-4 h-4" />
            Favourites
          </button>
          <button
            onClick={() => setTab("watch_later")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "watch_later"
                ? "border-violet-500 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Clock className="w-4 h-4" />
            Watch later
          </button>
        </div>

        {loading && (
          <p className="text-zinc-500 animate-pulse">Loading...</p>
        )}

        {!loading && bookmarks.length === 0 && (
          <div className="text-center py-16">
            <p className="text-zinc-500 mb-3">
              {tab === "favorites" ? "No favourites yet" : "Nothing saved to watch later"}
            </p>
            <Link href="/" className="text-violet-400 hover:text-violet-300 text-sm">
              Browse movies
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {bookmarks.map((bookmark) => (
            <BookmarkRow
              key={bookmark.id}
              bookmark={bookmark}
              onRemove={() => removeBookmark(bookmark.movie_id)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function BookmarkRow({ bookmark, onRemove }: { bookmark: Bookmark; onRemove: () => void }) {
  const movie = bookmark.movie;
  const runtime = movie.runtime_seconds
    ? `${Math.floor(movie.runtime_seconds / 60)}m`
    : null;

  return (
    <div className="group flex gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 hover:bg-zinc-800/60 transition-all duration-200">
      <Link href={`/movies/${movie.id}`} className="shrink-0">
        <div className="relative w-20 aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 shadow-lg">
          {movie.image_url ? (
            <Image src={movie.image_url} alt={movie.title} fill sizes="80px" className="object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full bg-zinc-800" />
          )}
        </div>
      </Link>

      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <Link href={`/movies/${movie.id}`}>
            <h3 className="font-semibold text-white hover:text-violet-300 transition-colors line-clamp-1 mb-1">
              {movie.title}
            </h3>
          </Link>

          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2.5">
            {movie.start_year && <span>{movie.start_year}</span>}
            {runtime && (
              <>
                <span className="text-zinc-700">·</span>
                <span>{runtime}</span>
              </>
            )}
            {movie.aggregate_rating && (
              <>
                <span className="text-zinc-700">·</span>
                <span className="text-yellow-400 font-medium">★ {movie.aggregate_rating.toFixed(1)}</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {movie.genres?.slice(0, 3).map((g) => (
              <Badge key={g} variant="secondary" className="text-xs bg-zinc-800 text-zinc-400 border-0 px-2 py-0.5">
                {g}
              </Badge>
            ))}
          </div>
        </div>

        {movie.plot && (
          <p className="text-xs text-zinc-600 line-clamp-2 mt-2">{movie.plot}</p>
        )}
      </div>

      <button
        onClick={onRemove}
        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-zinc-600 hover:text-white hover:bg-red-500/20 hover:border-red-500/30 border border-transparent transition-all duration-150 self-start mt-0.5"
        title="Remove"
      >
        <span className="text-base leading-none">×</span>
      </button>
    </div>
  );
}
