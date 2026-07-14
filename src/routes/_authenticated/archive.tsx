import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { listArchive } from "@/lib/archive.functions";
import { PageHeader, EmptyState } from "@/components/page-primitives";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Archive as ArchiveIcon, Link as LinkIcon, FileText, Image as ImageIcon, File } from "lucide-react";
import { t, itemTypeLabel } from "@/lib/i18n";

const archiveQuery = queryOptions({
  queryKey: ["archive"],
  queryFn: () => listArchive(),
});

export const Route = createFileRoute("/_authenticated/archive")({
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
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const navigate = useNavigate();

  const filtered = items.filter((i: any) => {
    if (type !== "all" && i.item_type !== type) return false;
    if (search && !`${i.title} ${i.description ?? ""} ${i.notes ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("archive.title")}
        description={t("archive.subtitle")}
        action={
          <Button onClick={() => navigate({ to: "/archive/new" })}>
            <Plus className="ms-1.5 h-4 w-4" /> {t("archive.save")}
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute end-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("archive.searchPlaceholder")} className="pe-8" />
        </div>
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

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ArchiveIcon className="h-5 w-5" />}
          title={t("archive.empty")}
          description={t("archive.emptyHint")}
          action={<Button onClick={() => navigate({ to: "/archive/new" })}>{t("archive.saveSomething")}</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((i: any) => {
            const Icon = iconFor(i.item_type);
            return (
              <Link key={i.id} to="/archive/$id" params={{ id: i.id }}>
                <Card className="h-full p-4 transition-all hover:border-primary/40 hover:shadow-md">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{i.title}</p>
                      <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">{itemTypeLabel(i.item_type)}</p>
                    </div>
                  </div>
                  {i.description && <p className="line-clamp-2 text-sm text-muted-foreground">{i.description}</p>}
                  {i.tags?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {i.tags.slice(0, 4).map((tag: string) => (
                        <span key={tag} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">#{tag}</span>
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
