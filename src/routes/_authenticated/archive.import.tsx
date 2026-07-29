import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { PageHeader } from "@/components/page-primitives";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Upload, Loader2, MessageCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { t, getLocale, useLocale } from "@/lib/i18n";
import { parseWhatsappChat, readWhatsappExport, type ParsedLink } from "@/lib/whatsapp-parse";
import { importWhatsappLinks, listArchiveUrls } from "@/lib/whatsapp-import.functions";
import { enrichLink } from "@/lib/link-enrich.functions";
import { updateArchiveItem } from "@/lib/archive.functions";
import { indexArchiveItem } from "@/lib/archive-search.functions";

export const Route = createFileRoute("/_authenticated/archive/import")({
  component: ImportPage,
});

type Row = ParsedLink & { selected: boolean; duplicate: boolean };

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function ImportPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const locale = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<Row[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [enrich, setEnrich] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const dateFmt = new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const onPick = async (file: File) => {
    setParsing(true);
    try {
      const text = await readWhatsappExport(file);
      const parsed = parseWhatsappChat(text);
      if (parsed.length === 0) {
        toast.error(t("import.noLinks"));
        setRows([]);
        return;
      }
      const existing = new Set<string>(await listArchiveUrls());
      setRows(
        parsed.map((p) => ({
          ...p,
          duplicate: existing.has(p.url),
          selected: !existing.has(p.url),
        })),
      );
    } catch {
      toast.error(t("import.parseFailed"));
    } finally {
      setParsing(false);
    }
  };

  const runImport = useMutation({
    mutationFn: async () => {
      const chosen = (rows ?? []).filter((r) => r.selected);
      if (chosen.length === 0) return { inserted: [], skipped: 0 };

      const res = await importWhatsappLinks({
        data: {
          items: chosen.map((r) => ({
            url: r.url,
            title: r.title,
            notes: r.notes,
            created_at: r.created_at,
          })),
        },
      });

      if (enrich && res.inserted.length > 0) {
        setProgress({ done: 0, total: res.inserted.length });
        let done = 0;
        for (const item of res.inserted) {
          try {
            const info = await enrichLink({ data: { url: item.url, locale: getLocale() } });
            await updateArchiveItem({
              data: {
                id: item.id,
                patch: {
                  ...(info.title ? { title: info.title.slice(0, 500) } : {}),
                  ...(info.description ? { description: info.description.slice(0, 4000) } : {}),
                  ...(info.tags?.length ? { tags: info.tags.slice(0, 8) } : {}),
                },
              },
            });
            void indexArchiveItem({ data: { id: item.id } }).catch(() => {});
          } catch {
            // keep the raw item; enrichment is best-effort
          }
          done += 1;
          setProgress({ done, total: res.inserted.length });
        }
      }
      return res;
    },
    onSuccess: (res) => {
      setProgress(null);
      qc.invalidateQueries({ queryKey: ["archive"] });
      toast.success(
        t("import.done")
          .replace("{n}", String(res.inserted.length))
          .replace("{s}", String(res.skipped)),
      );
      navigate({ to: "/archive" });
    },
    onError: () => {
      setProgress(null);
      toast.error(t("import.failed"));
    },
  });

  const selectedCount = (rows ?? []).filter((r) => r.selected).length;
  const toggleAll = (value: boolean) =>
    setRows((prev) => (prev ? prev.map((r) => ({ ...r, selected: value })) : prev));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("import.title")} description={t("import.subtitle")} />

      {rows === null && (
        <Card className="p-5">
          <ol className="mb-4 space-y-1.5 text-sm text-muted-foreground">
            <li>1. {t("import.step1")}</li>
            <li>2. {t("import.step2")}</li>
            <li>3. {t("import.step3")}</li>
          </ol>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border p-8 text-center transition hover:bg-muted/50"
          >
            {parsing ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-6 w-6 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">{t("import.pickFile")}</span>
            <span className="text-xs text-muted-foreground">{t("import.pickFileHint")}</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.zip,text/plain,application/zip"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPick(f);
              e.target.value = "";
            }}
          />
        </Card>
      )}

      {rows !== null && (
        <>
          <Card className="mb-3 flex flex-wrap items-center gap-3 p-3">
            <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-sm">
              {t("import.found").replace("{n}", String(rows.length))} ·{" "}
              {t("import.selected").replace("{n}", String(selectedCount))}
            </span>
            <div className="ms-auto flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => toggleAll(true)}>
                {t("import.selectAll")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => toggleAll(false)}>
                {t("import.selectNone")}
              </Button>
            </div>
          </Card>

          <label className="mb-3 flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3 text-sm">
            <Checkbox checked={enrich} onCheckedChange={(v) => setEnrich(v === true)} />
            <span>{t("import.enrich")}</span>
          </label>

          <div className="max-h-[52vh] space-y-2 overflow-y-auto pe-1">
            {rows.map((row, idx) => (
              <Card
                key={row.url + idx}
                className={`flex items-start gap-3 p-3 ${row.duplicate ? "opacity-60" : ""}`}
              >
                <Checkbox
                  className="mt-0.5"
                  checked={row.selected}
                  onCheckedChange={(v) =>
                    setRows((prev) =>
                      prev
                        ? prev.map((r, i) => (i === idx ? { ...r, selected: v === true } : r))
                        : prev,
                    )
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.title}</p>
                  <p className="truncate text-xs text-muted-foreground" dir="ltr">
                    {hostOf(row.url)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {row.created_at ? dateFmt.format(new Date(row.created_at)) : ""}
                    {row.duplicate ? ` · ${t("import.duplicate")}` : ""}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          {progress && (
            <div className="mt-3">
              <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("import.enriching")
                  .replace("{d}", String(progress.done))
                  .replace("{t}", String(progress.total))}
              </p>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Button
              disabled={selectedCount === 0 || runImport.isPending}
              onClick={() => runImport.mutate()}
            >
              {runImport.isPending ? (
                <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="me-1.5 h-4 w-4 rtl:rotate-180" />
              )}
              {t("import.run").replace("{n}", String(selectedCount))}
            </Button>
            <Button variant="ghost" onClick={() => setRows(null)} disabled={runImport.isPending}>
              {t("import.reset")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
