import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";

export function TagInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const tag = draft.trim().toLowerCase();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft("");
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 rounded-md border bg-background p-1.5", className)}>
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
          #{tag}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== tag))} className="opacity-60 hover:opacity-100">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={commit}
        placeholder={placeholder ?? t("label.tagPlaceholder")}
        className="h-7 flex-1 border-none bg-transparent px-1 shadow-none focus-visible:ring-0"
      />
    </div>
  );
}
