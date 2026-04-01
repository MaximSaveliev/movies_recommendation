import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Movie } from "@/lib/api";

interface MovieCardProps {
  movie: Movie;
}

export function MovieCard({ movie }: MovieCardProps) {
  const runtime = movie.runtime_seconds
    ? `${Math.floor(movie.runtime_seconds / 60)}m`
    : null;

  return (
    <Link href={`/movies/${movie.id}`}>
      <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer h-full">
        <div className="relative aspect-[2/3] overflow-hidden rounded-t-lg bg-zinc-800">
          {movie.image_url ? (
            <Image
              src={movie.image_url}
              alt={movie.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className="object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">
              No image
            </div>
          )}
          {movie.aggregate_rating && (
            <div className="absolute top-2 right-2 bg-black/70 text-yellow-400 text-xs font-bold px-2 py-1 rounded">
              ★ {movie.aggregate_rating.toFixed(1)}
            </div>
          )}
        </div>
        <CardContent className="p-3">
          <h3 className="font-semibold text-white text-sm line-clamp-2 mb-1">
            {movie.title}
          </h3>
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2">
            {movie.start_year && <span>{movie.start_year}</span>}
            {runtime && <span>{runtime}</span>}
          </div>
          <div className="flex flex-wrap gap-1">
            {movie.genres?.slice(0, 2).map((genre) => (
              <Badge
                key={genre}
                variant="secondary"
                className="text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              >
                {genre}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
