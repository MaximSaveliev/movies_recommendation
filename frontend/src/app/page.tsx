"use client";

import { useEffect, useRef, useState } from "react";
import { AISearchBar } from "@/components/AISearchBar";
import { MoodButtons } from "@/components/MoodButtons";
import { MovieCard } from "@/components/MovieCard";
import { Navbar } from "@/components/Navbar";
import { api, type Movie, type User } from "@/lib/api";

const SESSION_KEY = "movieListState";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(() => {
    if (typeof window === "undefined") return 1;
    const saved = sessionStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved).page : 1;
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Movie[] | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = sessionStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved).searchResults ?? null : null;
  });
  const [error, setError] = useState<string | null>(null);
  const scrollRestored = useRef(false);

  const limit = 20;

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    api.movies
      .list(page, limit)
      .then((data) => {
        setMovies(data.movies);
        setTotal(data.total);
      })
      .catch(() => setError("Failed to load movies"));
  }, [page]);

  useEffect(() => {
    if (movies.length === 0 || scrollRestored.current) return;
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      const { scrollY } = JSON.parse(saved);
      requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "instant" }));
      sessionStorage.removeItem(SESSION_KEY);
    }
    scrollRestored.current = true;
  }, [movies]);

  const saveState = () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ page, scrollY: window.scrollY, searchResults }));
  };

  const handleSearch = async (query: string, limit = 20, shuffle = false) => {
    setIsSearching(true);
    setError(null);
    try {
      const results = await api.search.query(query, limit, shuffle);
      setSearchResults(results);
    } catch {
      setError("Search failed. Make sure the model is trained.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchResults(null);
    setError(null);
  };

  const displayed = searchResults ?? movies;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} onLogout={() => setUser(null)} />

      <main className="flex-1 px-6 py-10 max-w-7xl mx-auto w-full">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold mb-2">Find your next movie</h1>
          <p className="text-zinc-400 mb-6">
            Describe what you want to watch and let AI find it for you
          </p>
          <AISearchBar onSearch={handleSearch} isLoading={isSearching} />
          {searchResults && (
            <button
              onClick={handleClearSearch}
              className="mt-3 text-sm text-zinc-500 hover:text-zinc-300 underline"
            >
              Clear search — show all movies
            </button>
          )}

          <MoodButtons onMoodSelect={handleSearch} />
        </div>

        {error && (
          <p className="text-red-400 text-center mb-6">{error}</p>
        )}

        {isSearching && (
          <p className="text-zinc-400 text-center mb-6 animate-pulse">
            Finding recommendations...
          </p>
        )}

        {searchResults && (
          <p className="text-zinc-400 text-sm mb-4">
            {searchResults.length} results
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {displayed.map((movie) => (
            <div key={movie.id} onClick={saveState}>
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>

        {!searchResults && totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            <button
              onClick={() => { setPage((p: number) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              disabled={page === 1}
              className="px-4 py-2 bg-zinc-800 rounded disabled:opacity-40 hover:bg-zinc-700 text-sm"
            >
              Previousss
            </button>
            <span className="px-4 py-2 text-zinc-400 text-sm">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => { setPage((p: number) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              disabled={page === totalPages}
              className="px-4 py-2 bg-zinc-800 rounded disabled:opacity-40 hover:bg-zinc-700 text-sm"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
