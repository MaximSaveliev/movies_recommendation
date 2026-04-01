"use client";

import { useRef, useState } from "react";
import { Search } from "lucide-react";

interface AISearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export function AISearchBar({ onSearch, isLoading }: AISearchBarProps) {
  const [query, setQuery] = useState("");
  const [mouse, setMouse] = useState({ x: 50, y: 50 });
  const [hovered, setHovered] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = innerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    setMouse({ x, y });
  };

  const fromAngle = (100 - mouse.x) * 3.6;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div ref={wrapperRef} className="ai-bar-wrapper">
        <div
          className="ai-bar-glow"
          style={{
            "--from": `${fromAngle}deg`,
            opacity: hovered ? 1 : 0,
          } as React.CSSProperties}
        />
        <form
          ref={innerRef}
          onSubmit={handleSubmit}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="ai-bar-inner"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try: comedy from France 2024, or similar to Inception..."
            className="ai-bar-input"
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="ai-mode-btn"
          >
            <Search size={15} strokeWidth={2.5} />
            <span>AI Search</span>
          </button>
        </form>
      </div>

      <style jsx>{`
        .ai-bar-wrapper {
          border-radius: 999px;
          position: relative;
          padding: 2px;
        }

        .ai-bar-glow {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background: conic-gradient(
            from var(--from, 0deg) at 50% 50%,
            #ef4444,
            #f97316,
            #eab308,
            #22c55e,
            #06b6d4,
            #3b82f6,
            #a855f7,
            #ec4899,
            #ef4444
          );
          transition: opacity 0.35s ease;
          z-index: 0;
        }

        .ai-bar-inner {
          display: flex;
          align-items: center;
          background: #09090b;
          border-radius: 999px;
          padding: 4px 4px 4px 16px;
          gap: 8px;
          position: relative;
          z-index: 1;
        }

        .ai-bar-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: white;
          font-size: 15px;
          height: 40px;
        }

        .ai-bar-input::placeholder {
          color: #71717a;
        }

        .ai-mode-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 14px;
          height: 36px;
          background: #1c1c1e;
          border: 1px solid #3f3f46;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 500;
          color: #e4e4e7;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s ease, border-color 0.15s ease;
          flex-shrink: 0;
        }

        .ai-mode-btn:hover:not(:disabled) {
          background: #27272a;
          border-color: #52525b;
        }

        .ai-mode-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
