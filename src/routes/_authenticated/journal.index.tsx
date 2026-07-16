import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { listJournalEntries } from "@/lib/journal.functions";
import { PageHeader, EmptyState } from "@/components/page-primitives";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, BookHeart } from "lucide-react";
import { moodEmoji } from "@/components/mood-picker";
import { t, formatDateShort, formatWeekday } from "@/lib/i18n";

const journalQuery = queryOptions({
  queryKey: ["journal"],
  queryFn: () => listJournalEntries(),
});

export const Route = createFileRoute("/_authenticated/journal")({
  loader: ({ context }) => context.queryClient.ensureQueryData(journalQuery),
  component: JournalPage,
});

function JournalPage() {
  const { data: entries } = useSuspenseQuery(journalQuery);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filtered = entries.filter((e: any) =>
    !search || `${e.title ?? ""} ${e.body ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t("journal.title")}
        description={t("journal.subtitle")}
        action={
          <Button onClick={() => navigate({ to: "/journal/new" })}>
            <Plus className="ms-1.5 h-4 w-4" /> {t("journal.new")}
          </Button>
        }
      />

      <div className="relative mb-5">
        <Search className="pointer-events-none absolute end-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("journal.searchPlaceholder")} className="pe-8" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<BookHeart className="h-5 w-5" />}
          title={t("journal.empty")}
          description={t("journal.emptyHint")}
          action={<Button onClick={() => navigate({ to: "/journal/new" })}>{t("journal.start")}</Button>}
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((e: any) => (
            <li key={e.id}>
              <Link to="/journal/$id" params={{ id: e.id }}>
                <Card className="p-5 transition-all hover:border-primary/40 hover:shadow-md">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-display text-xl">{e.title || formatWeekday(e.entry_date)}</h2>
                    <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                      {e.mood && <span className="text-base">{moodEmoji(e.mood)}</span>}
                      <span>{formatDateShort(e.entry_date)}</span>
                    </div>
                  </div>
                  {e.body && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{e.body}</p>}
                  {e.tags?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {e.tags.map((tag: string) => (
                        <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">#{tag}</span>
                      ))}
                    </div>
                  )}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
