import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

const MOODS = [
  { value: 1, emoji: "😞" },
  { value: 2, emoji: "😕" },
  { value: 3, emoji: "😌" },
  { value: 4, emoji: "🙂" },
  { value: 5, emoji: "😊" },
] as const;

export function MoodPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex gap-2">
      {MOODS.map((m) => {
        const label = t(`mood.${m.value}`);
        return (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(value === m.value ? null : m.value)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs transition-all",
              value === m.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-background text-muted-foreground hover:bg-muted",
            )}
            aria-label={label}
          >
            <span className="text-xl">{m.emoji}</span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function moodEmoji(v: number | null | undefined) {
  return MOODS.find((m) => m.value === v)?.emoji ?? "";
}
