"use client";

interface MoodButtonsProps {
  onMoodSelect: (query: string, limit?: number, shuffle?: boolean) => void;
}

const moods = [
  { label: "😂 Make me laugh", query: "funny comedy laugh hilarious", color: "from-yellow-500/20 to-orange-500/20 border-yellow-500/30 hover:border-yellow-400/60 text-yellow-300" },
  { label: "😢 Make me cry", query: "emotional drama heartbreaking touching", color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 hover:border-blue-400/60 text-blue-300" },
  { label: "😱 Scare me", query: "horror scary thriller suspense terrifying", color: "from-red-900/30 to-red-500/20 border-red-700/40 hover:border-red-500/60 text-red-400" },
  { label: "🚀 Blow my mind", query: "mind blowing sci-fi twist unexpected", color: "from-violet-500/20 to-purple-500/20 border-violet-500/30 hover:border-violet-400/60 text-violet-300" },
  { label: "❤️ Fall in love", query: "romantic love story heartwarming", color: "from-pink-500/20 to-rose-500/20 border-pink-500/30 hover:border-pink-400/60 text-pink-300" },
  { label: "⚡ Get pumped", query: "action adventure adrenaline intense", color: "from-amber-500/20 to-yellow-500/20 border-amber-500/30 hover:border-amber-400/60 text-amber-300" },
  { label: "🤔 Make me think", query: "thought provoking intellectual philosophical", color: "from-teal-500/20 to-emerald-500/20 border-teal-500/30 hover:border-teal-400/60 text-teal-300" },
  { label: "🌍 Take me away", query: "travel adventure foreign culture explore", color: "from-green-500/20 to-lime-500/20 border-green-500/30 hover:border-green-400/60 text-green-300" },
];

export function MoodButtons({ onMoodSelect }: MoodButtonsProps) {
  return (
    <div className="mt-8">
      <p className="text-zinc-500 text-sm mb-4">Or pick a mood</p>
      <div className="flex flex-wrap justify-center gap-3">
        {moods.map((mood) => (
          <button
            key={mood.label}
            onClick={() => onMoodSelect(mood.query, 60, true)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium
              bg-gradient-to-br ${mood.color}
              border transition-all duration-200
              hover:scale-105 active:scale-95
              backdrop-blur-sm
            `}
          >
            {mood.label}
          </button>
        ))}
      </div>
    </div>
  );
}
