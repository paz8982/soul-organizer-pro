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
import { t, formatDateShort } from "@/lib/i18n";

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
      <CommandInput placeholder={t("label.searchAll")} value={q} onValueChange={setQ} />
      <CommandList>
        {q && <CommandEmpty>{t("error.noResults")}</CommandEmpty>}
        {data?.tasks && data.tasks.length > 0 && (
          <CommandGroup heading={t("nav.tasks")}>
            {data.tasks.map((task: any) => (
              <CommandItem key={task.id} onSelect={() => go("/tasks")}>
                <CheckSquare className="ms-2 h-4 w-4" /> {task.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {data?.journal && data.journal.length > 0 && (
          <CommandGroup heading={t("nav.journal")}>
            {data.journal.map((j: any) => (
              <CommandItem key={j.id} onSelect={() => go(`/journal/${j.id}`)}>
                <BookHeart className="ms-2 h-4 w-4" /> {j.title || formatDateShort(j.entry_date)}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {data?.archive && data.archive.length > 0 && (
          <CommandGroup heading={t("nav.archive")}>
            {data.archive.map((a: any) => (
              <CommandItem key={a.id} onSelect={() => go(`/archive/${a.id}`)}>
                <Archive className="ms-2 h-4 w-4" /> {a.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
