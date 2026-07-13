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
        title="Journal"
        description="Your private space to think."
        action={
          <Button onClick={() => navigate({ to: "/journal/new" })}>
            <Plus className="mr-1.5 h-4 w-4" /> New entry
          </Button>
        }
      />

      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search entries…" className="pl-8" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<BookHeart className="h-5 w-5" />}
          title="Your journal awaits"
          description="Write your first entry — a sentence is enough."
          action={<Button onClick={() => navigate({ to: "/journal/new" })}>Start writing</Button>}
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((e: any) => (
            <li key={e.id}>
              <Link to="/journal/$id" params={{ id: e.id }}>
                <Card className="p-5 transition-all hover:border-primary/40 hover:shadow-md">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-display text-xl">{e.title || new Date(e.entry_date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</h2>
                    <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                      {e.mood && <span className="text-base">{moodEmoji(e.mood)}</span>}
                      <span>{new Date(e.entry_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {e.body && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{e.body}</p>}
                  {e.tags?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {e.tags.map((t: string) => (
                        <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">#{t}</span>
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
