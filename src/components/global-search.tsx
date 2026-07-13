import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { globalSearch } from "@/lib/search.functions";
import { CheckSquare, BookHeart, Archive } from "lucide-react";

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const { data } = useQuery({
    queryKey: ["global-search", q],
    queryFn: () => globalSearch({ data: { q } }),
    enabled: q.trim().length > 0,
  });

  const go = (path: string) => {
    onOpenChange(false);
    setQ("");
    navigate({ to: path });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search tasks, journal, archive…" value={q} onValueChange={setQ} />
      <CommandList>
        {q && <CommandEmpty>No results found.</CommandEmpty>}
        {data?.tasks && data.tasks.length > 0 && (
          <CommandGroup heading="Tasks">
            {data.tasks.map((t: any) => (
              <CommandItem key={t.id} onSelect={() => go("/tasks")}>
                <CheckSquare className="mr-2 h-4 w-4" /> {t.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {data?.journal && data.journal.length > 0 && (
          <CommandGroup heading="Journal">
            {data.journal.map((j: any) => (
              <CommandItem key={j.id} onSelect={() => go(`/journal/${j.id}`)}>
                <BookHeart className="mr-2 h-4 w-4" /> {j.title || j.entry_date}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {data?.archive && data.archive.length > 0 && (
          <CommandGroup heading="Archive">
            {data.archive.map((a: any) => (
              <CommandItem key={a.id} onSelect={() => go(`/archive/${a.id}`)}>
                <Archive className="mr-2 h-4 w-4" /> {a.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
