import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { listArchive } from "@/lib/archive.functions";
import { smartSearchArchive } from "@/lib/archive-search.functions";
import { PageHeader, EmptyState } from "@/components/page-primitives";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Archive as ArchiveIcon, Link as LinkIcon, FileText, Image as ImageIcon, File, Sparkles, Loader2, X, MessageCircle } from "lucide-react";
import { t, itemTypeLabel, useLocale } from "@/lib/i18n";

const archiveQuery = queryOptions({
  queryKey: ["archive"],
  queryFn: () => listArchive(),
});

export const Route = createFileRoute("/_authenticated/archive/")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : undefined,
    smart: search.smart === true || search.smart === "true" ? true : undefined,
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(archiveQuery),
  component: ArchivePage,
});

const iconFor = (type: string) => {
  if (type === "link") return LinkIcon;
  if (type === "image") return ImageIcon;
  if (type === "note") return FileText;
  if (type === "pdf" || type === "doc" || type === "file") return File;
  return ArchiveIcon;
};

function ArchivePage() {
  const { data: items } = useSuspenseQuery(archiveQuery);
  const { q, smart } = Route.useSearch();
  const locale = useLocale();
  const [search, setSearch] = useState(q ?? "");
  const [type, setType] = useState("all");
  const [smartResult, setSmartResult] = useState<{ answer: string | null; results: any[] } | null>(null);
  const navigate = useNavigate();
  const autoRan = useRef<string | null>(null);

  const smartSearch = useMutation({
    mutationFn: (query: string) => smartSearchArchive({ data: { query, locale } }),
    onSuccess: (res) => setSmartResult(res as any),
    onError: () => setSmartResult({ answer: t("archive.smartFailed"), results: [] }),
  });

  useEffect(() => {
    if (q !== undefined) setSearch(q);
  }, [q]);

  // Voice assistant / share deep links land here with ?q= — run smart search once.
  useEffect(() => {
    if (!q || q.trim().length < 2) return;
    if (autoRan.current === q) return;
    autoRan.current = q;
    smartSearch.mutate(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, smart]);

  const runSmart = () => {
    const query = search.trim();
    if (query.length < 2) return;
    smartSearch.mutate(query);
  };

  const clearSmart = () => {
    setSmartResult(null);
    smartSearch.reset();
  };

  const filtered = items.filter((i: any) => {
    if (type !== "all" && i.item_type !== type) return false;
    if (search && !`${i.title} ${i.description ?? ""} ${i.notes ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const smartActive = smartSearch.isPending || smartResult !== null;
  const list = smartResult ? smartResult.results : filtered;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("archive.title")}
        description={t("archive.subtitle")}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate({ to: "/archive/import" })}>
              <MessageCircle className="ms-1.5 h-4 w-4" /> {t("archive.import")}
            </Button>
            <Button onClick={() => navigate({ to: "/archive/new" })}>
              <Plus className="ms-1.5 h-4 w-4" /> {t("archive.save")}
            </Button>
          </div>
        }
      />


      <div className="mb-2 flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute end-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (smartResult) clearSmart();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSmart();
            }}
            placeholder={t("archive.smartSearchPlaceholder")}
            className="pe-8"
          />
        </div>
        <Button
          variant="secondary"
          onClick={runSmart}
          disabled={smartSearch.isPending || search.trim().length < 2}
          className="shrink-0"
        >
          {smartSearch.isPending ? (
            <Loader2 className="ms-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="ms-1.5 h-4 w-4" />
          )}
          {t("archive.smartSearch")}
        </Button>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter.allTypes")}</SelectItem>
            <SelectItem value="note">{t("types.notes")}</SelectItem>
            <SelectItem value="link">{t("types.links")}</SelectItem>
            <SelectItem value="image">{t("types.images")}</SelectItem>
            <SelectItem value="pdf">{t("types.pdfs")}</SelectItem>
            <SelectItem value="doc">{t("types.docs")}</SelectItem>
            <SelectItem value="file">{t("types.files")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">{t("archive.smartHint")}</p>

      {smartSearch.isPending && (
        <Card className="mb-4 flex items-center gap-2 p-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("archive.smartSearching")}
        </Card>
      )}

      {smartResult && !smartSearch.isPending && (
        <Card className="mb-4 flex items-start gap-2 border-primary/30 bg-secondary/50 p-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 break-words text-sm">
            {smartResult.answer ?? (smartResult.results.length ? "" : t("archive.smartNoResults"))}
          </p>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={clearSmart} aria-label={t("archive.smartClear")}>
            <X className="h-4 w-4" />
          </Button>
        </Card>
      )}

      {list.length === 0 ? (
        smartActive && !smartSearch.isPending ? (
          <EmptyState
            icon={<Sparkles className="h-5 w-5" />}
            title={t("archive.smartNoResults")}
            description={t("archive.smartHint")}
            action={<Button variant="secondary" onClick={clearSmart}>{t("archive.smartClear")}</Button>}
          />
        ) : (
          <EmptyState
            icon={<ArchiveIcon className="h-5 w-5" />}
            title={t("archive.empty")}
            description={t("archive.emptyHint")}
            action={<Button onClick={() => navigate({ to: "/archive/new" })}>{t("archive.saveSomething")}</Button>}
          />
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((i: any) => {
            const Icon = iconFor(i.item_type);
            return (
              <Link key={i.id} to="/archive/$id" params={{ id: i.id }} className="min-w-0">
                <Card className="h-full min-w-0 overflow-hidden p-4 transition-all hover:border-primary/40 hover:shadow-md">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium" title={i.title}>{i.title}</p>
                      <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">{itemTypeLabel(i.item_type)}</p>
                    </div>
                  </div>
                  {i.reason ? (
                    <p className="mb-2 flex items-start gap-1.5 break-words text-sm text-primary">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0">{i.reason}</span>
                    </p>
                  ) : null}
                  {i.description && <p className="line-clamp-2 break-words text-sm text-muted-foreground">{i.description}</p>}
                  {i.tags?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {i.tags.slice(0, 4).map((tag: string) => (
                        <span key={tag} className="max-w-full truncate rounded-full bg-muted px-1.5 py-0.5 text-[10px]">#{tag}</span>
                      ))}
                    </div>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
