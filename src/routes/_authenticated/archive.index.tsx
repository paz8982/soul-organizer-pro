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
import { Plus, Search, Archive as ArchiveIcon, Link as LinkIcon, FileText, Image as ImageIcon, File, Sparkles, Loader2, X, MessageCircle, Tags } from "lucide-react";
import { t, itemTypeLabel, useLocale } from "@/lib/i18n";

type SearchMode = "text" | "tags" | "smart";

type ArchiveSearch = {
  q?: string;
  smart?: true;
  mode?: SearchMode;
  type?: string;
  tag?: string;
};

const archiveQuery = queryOptions({
  queryKey: ["archive"],
  queryFn: () => listArchive(),
});

export const Route = createFileRoute("/_authenticated/archive/")({
  validateSearch: (search: Record<string, unknown>): ArchiveSearch => ({
    ...(typeof search.q === "string" && search.q ? { q: search.q } : {}),
    ...(search.smart === true || search.smart === "true" ? { smart: true as const } : {}),
    ...(search.mode === "text" || search.mode === "tags" || search.mode === "smart"
      ? { mode: search.mode as SearchMode }
      : {}),
    ...(typeof search.type === "string" && search.type ? { type: search.type } : {}),
    ...(typeof search.tag === "string" && search.tag ? { tag: search.tag } : {}),
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
  const urlSearch = Route.useSearch();
  const { q, smart } = urlSearch;
  const locale = useLocale();
  const navigate = useNavigate();

  // All filter state lives in the URL so returning from an item restores it.
  const search = q ?? "";
  const mode: SearchMode = urlSearch.mode ?? (smart || q ? "smart" : "text");
  const type = urlSearch.type ?? "all";
  const selectedTag = urlSearch.tag ?? null;

  const setUrl = (patch: Partial<ArchiveSearch>) => {
    navigate({
      to: "/archive",
      search: (prev: ArchiveSearch) => {
        const next: ArchiveSearch = { ...prev, ...patch };
        (Object.keys(next) as (keyof ArchiveSearch)[]).forEach((k) => {
          if (next[k] === undefined || next[k] === "") delete next[k];
        });
        return next;
      },
      replace: true,
    });
  };

  const setSearch = (value: string) => setUrl({ q: value || undefined });
  const setType = (value: string) => setUrl({ type: value === "all" ? undefined : value });
  const setSelectedTag = (tag: string | null) => setUrl({ tag: tag ?? undefined });

  const [smartResult, setSmartResult] = useState<{ answer: string | null; results: any[] } | null>(null);
  const autoRan = useRef<string | null>(null);

  const smartSearch = useMutation({
    mutationFn: (query: string) => smartSearchArchive({ data: { query, locale } }),
    onSuccess: (res) => setSmartResult(res as any),
    onError: () => setSmartResult({ answer: t("archive.smartFailed"), results: [] }),
  });

  // Deep links and returning from an item: re-run the smart search once per query.
  useEffect(() => {
    if (mode !== "smart") return;
    if (!q || q.trim().length < 2) return;
    if (autoRan.current === q) return;
    autoRan.current = q;
    smartSearch.mutate(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, mode]);

  const runSmart = () => {
    const query = search.trim();
    if (query.length < 2) return;
    autoRan.current = query;
    smartSearch.mutate(query);
  };

  const clearSmart = () => {
    autoRan.current = null;
    setSmartResult(null);
    smartSearch.reset();
  };

  const switchMode = (m: SearchMode) => {
    setUrl({ mode: m, ...(m !== "tags" ? { tag: undefined } : {}) });
    if (m !== "smart" && smartResult) clearSmart();
    if (m === "smart" && search.trim().length >= 2) runSmart();
  };

  const allTags: string[] = Array.from(
    new Set<string>(items.flatMap((i: any) => (i.tags || []) as string[])),
  ).sort();
  const MAX_VISIBLE_TAGS = 12;
  const visibleTags = mode === "tags"
    ? allTags.filter((tag: string) => !search.trim() || tag.toLowerCase().includes(search.trim().toLowerCase()))
    : [];
  const shownTags = visibleTags.slice(0, MAX_VISIBLE_TAGS);
  const remainingTags = visibleTags.length - shownTags.length;

  const filtered = items.filter((i: any) => {
    if (type !== "all" && i.item_type !== type) return false;
    if (mode === "tags" && selectedTag && !i.tags?.includes(selectedTag)) return false;
    if (mode === "text" && search.trim()) {
        const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean) as string[];
        if (terms.length) {
          const text = `${i.title} ${i.description ?? ""} ${i.notes ?? ""}`.toLowerCase();
          if (!terms.every((term: string) => text.includes(term))) return false;
        }
    }
    return true;
  });

  const smartActive = smartSearch.isPending || smartResult !== null;
  const list = smartResult ? smartResult.results : filtered;

  const hasFilters = type !== "all" || selectedTag !== null;
  const clearFilters = () => {
    setType("all");
    setSelectedTag(null);
  };

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

      <div className="mb-4 space-y-2">
        {/* Search input + mode toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute end-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (smartResult) clearSmart();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && mode === "smart") runSmart();
              }}
              placeholder={
                mode === "smart"
                  ? t("archive.smartSearchPlaceholder")
                  : mode === "tags"
                  ? t("archive.tagSearchPlaceholder")
                  : t("archive.searchPlaceholder")
              }
              className="pe-8"
            />
          </div>
          <div className="flex shrink-0 items-center rounded-lg border bg-muted p-0.5">
            <ModeButton active={mode === "text"} onClick={() => switchMode("text")} label={t("archive.mode.text")} />
            <ModeButton active={mode === "tags"} onClick={() => switchMode("tags")} label={t("archive.mode.tags")} />
            <ModeButton active={mode === "smart"} onClick={() => switchMode("smart")} label={t("archive.mode.smart")} />
          </div>
        </div>

        {/* Type filter + active filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[140px]">
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

          {selectedTag && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              <Tags className="h-3 w-3" />
              #{selectedTag}
              <button
                onClick={() => setSelectedTag(null)}
                className="ms-1 rounded-full hover:bg-primary/20"
                aria-label={t("archive.clearFilters")}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 text-xs">
              {t("archive.clearFilters")}
            </Button>
          )}
        </div>

        {/* Hint text */}
        <p className="text-xs text-muted-foreground">
          {mode === "smart"
            ? t("archive.smartHint")
            : mode === "tags"
            ? t("archive.tagHint")
            : t("archive.textHint")}
        </p>

        {/* Tag chips in tags mode */}
        {mode === "tags" && (
          <div className="flex flex-wrap items-center gap-1.5">
            {shownTags.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("archive.noTags")}</p>
            ) : (
              shownTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors ${
                    tag === selectedTag
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  #{tag}
                </button>
              ))
            )}
            {remainingTags > 0 && (
              <span className="text-xs text-muted-foreground">
                +{remainingTags} {t("archive.moreTags")}
              </span>
            )}
          </div>
        )}
      </div>

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

function ModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
