"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookmarkButton } from "@/components/BookmarkButton";
import { MovieCard } from "@/components/MovieCard";
import { api, type Movie, type User } from "@/lib/api";

export default function MovieDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [similar, setSimilar] = useState<Movie[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ dragging: false, startX: 0, scrollLeft: 0 });

  useEffect(() => {
    api.movies.get(id).then(setMovie).catch(() => setError("Movie not found"));
    api.movies.similar(id).then(setSimilar).catch(() => {});
    api.auth.me().then(setUser).catch(() => setUser(null));
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-400">{error}</p>
        <Button asChild variant="outline" className="border-zinc-700 text-zinc-300">
          <Link href="/">Back to movies</Link>
        </Button>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500 animate-pulse">Loading...</p>
      </div>
    );
  }

  const runtime = movie.runtime_seconds
    ? `${Math.floor(movie.runtime_seconds / 3600)}h ${Math.floor((movie.runtime_seconds % 3600) / 60)}m`
    : null;

  return (
    <div className="min-h-screen">
      <div className="px-6 py-4 border-b border-zinc-800">
        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" onClick={() => router.back()}>
          ← Back
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col md:flex-row gap-10">
        <div className="shrink-0 w-64 mx-auto md:mx-0">
          {movie.image_url ? (
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-2xl">
              <Image
                src={movie.image_url}
                alt={movie.title}
                fill
                sizes="256px"
                className="object-cover"
                priority
              />
            </div>
          ) : (
            <div className="w-full aspect-[2/3] bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-600">
              No image
            </div>
          )}
        </div>

        <div className="flex-1 space-y-5">
          <div>
            <h1 className="text-3xl font-bold text-white">{movie.title}</h1>
            {movie.original_title && movie.original_title !== movie.title && (
              <p className="text-zinc-500 text-sm mt-1">{movie.original_title}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
            {movie.start_year && <span>{movie.start_year}</span>}
            {runtime && <span>{runtime}</span>}
            {movie.aggregate_rating && (
              <span className="text-yellow-400 font-semibold">
                ★ {movie.aggregate_rating.toFixed(1)}
                {movie.vote_count && (
                  <span className="text-zinc-500 font-normal ml-1">
                    ({movie.vote_count.toLocaleString()} votes)
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {movie.genres?.map((g) => (
              <Badge key={g} className="bg-zinc-800 text-zinc-200 hover:bg-zinc-700">{g}</Badge>
            ))}
          </div>

          <div className="flex gap-2">
            <BookmarkButton movieId={movie.id} kind="favorite" isLoggedIn={!!user} />
            <BookmarkButton movieId={movie.id} kind="watch_later" isLoggedIn={!!user} />
          </div>

          {movie.plot && (
            <p className="text-zinc-300 leading-relaxed">{movie.plot}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {movie.directors && movie.directors.length > 0 && (
              <div>
                <p className="text-zinc-500 mb-1">Director</p>
                <p className="text-zinc-200">{movie.directors.join(", ")}</p>
              </div>
            )}
            {movie.writers && movie.writers.length > 0 && (
              <div>
                <p className="text-zinc-500 mb-1">Writers</p>
                <p className="text-zinc-200">{movie.writers.join(", ")}</p>
              </div>
            )}
            {movie.stars && movie.stars.length > 0 && (
              <div>
                <p className="text-zinc-500 mb-1">Stars</p>
                <p className="text-zinc-200">{movie.stars.slice(0, 4).join(", ")}</p>
              </div>
            )}
            {movie.countries && movie.countries.length > 0 && (
              <div>
                <p className="text-zinc-500 mb-1">Countries</p>
                <p className="text-zinc-200">{movie.countries.join(", ")}</p>
              </div>
            )}
            {movie.languages && movie.languages.length > 0 && (
              <div>
                <p className="text-zinc-500 mb-1">Languages</p>
                <p className="text-zinc-200">{movie.languages.join(", ")}</p>
              </div>
            )}
          </div>

          {movie.keywords && movie.keywords.length > 0 && (
            <div>
              <p className="text-zinc-500 text-sm mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {movie.keywords.map((k) => (
                  <Badge key={k} variant="outline" className="border-zinc-700 text-zinc-400">
                    {k}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {similar.length > 0 && (
        <div className="max-w-5xl mx-auto px-6 pb-16">
          <h2 className="text-xl font-semibold text-white mb-4">Similar Movies</h2>
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide cursor-grab active:cursor-grabbing select-none"
            onMouseDown={(e) => {
              const el = scrollRef.current;
              if (!el) return;
              dragState.current = { dragging: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
            }}
            onMouseMove={(e) => {
              const el = scrollRef.current;
              if (!el || !dragState.current.dragging) return;
              const x = e.pageX - el.offsetLeft;
              el.scrollLeft = dragState.current.scrollLeft - (x - dragState.current.startX);
            }}
            onMouseUp={() => { dragState.current.dragging = false; }}
            onMouseLeave={() => { dragState.current.dragging = false; }}
          >
            {similar.map((m) => (
              <div key={m.id} className="shrink-0 w-40">
                <MovieCard movie={m} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
