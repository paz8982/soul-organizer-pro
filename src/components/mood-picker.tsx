import { cn } from "@/lib/utils";

const MOODS = [
  { value: 1, emoji: "😞", label: "Rough" },
  { value: 2, emoji: "😕", label: "Low" },
  { value: 3, emoji: "😌", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😊", label: "Great" },
];

export function MoodPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex gap-2">
      {MOODS.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(value === m.value ? null : m.value)}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs transition-all",
            value === m.value ? "border-primary bg-primary/10 text-primary" : "border-input bg-background text-muted-foreground hover:bg-muted",
          )}
          aria-label={m.label}
        >
          <span className="text-xl">{m.emoji}</span>
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  );
}

export function moodEmoji(v: number | null | undefined) {
  return MOODS.find((m) => m.value === v)?.emoji ?? "";
}
