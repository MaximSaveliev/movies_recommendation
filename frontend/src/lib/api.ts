const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || "Request failed");
  }

  return response.json();
}

export const api = {
  auth: {
    register: (data: { email: string; username: string; password: string }) =>
      request("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),

    login: (data: { email: string; password: string }) =>
      request("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),

    logout: () => request("/api/auth/logout", { method: "POST" }),

    me: () => request<User>("/api/auth/me"),
  },

  movies: {
    list: (page = 1, limit = 20) =>
      request<{ movies: Movie[]; total: number; page: number; limit: number }>(
        `/api/movies?page=${page}&limit=${limit}`
      ),

    get: (id: string) => request<Movie>(`/api/movies/${id}`),

    similar: (id: string) => request<Movie[]>(`/api/movies/${id}/similar`),
  },

  search: {
    query: (query: string, limit = 20, shuffle = false) =>
      request<Movie[]>("/api/search", { method: "POST", body: JSON.stringify({ query, limit, shuffle }) }),
  },

  bookmarks: {
    list: (kind?: "favorite" | "watch_later") =>
      request<Bookmark[]>(`/api/bookmarks${kind ? `?kind=${kind}` : ""}`),

    status: (movieId: string) =>
      request<BookmarkStatus>(`/api/bookmarks/${movieId}/status`),

    add: (movieId: string, kind: "favorite" | "watch_later") =>
      request<Bookmark>("/api/bookmarks", {
        method: "POST",
        body: JSON.stringify({ movie_id: movieId, kind }),
      }),

    remove: (movieId: string, kind: "favorite" | "watch_later") =>
      request(`/api/bookmarks/${movieId}?kind=${kind}`, { method: "DELETE" }),
  },
};

export interface Movie {
  id: string;
  title: string;
  original_title?: string;
  image_url?: string;
  start_year?: number;
  runtime_seconds?: number;
  genres?: string[];
  aggregate_rating?: number;
  vote_count?: number;
  plot?: string;
  directors?: string[];
  writers?: string[];
  stars?: string[];
  countries?: string[];
  languages?: string[];
  keywords?: string[];
}

export interface User {
  id: number;
  email: string;
  username: string;
}

export interface Bookmark {
  id: number;
  movie_id: string;
  kind: "favorite" | "watch_later";
  created_at: string;
  movie: Movie;
}

export interface BookmarkStatus {
  favorite: boolean;
  watch_later: boolean;
}
