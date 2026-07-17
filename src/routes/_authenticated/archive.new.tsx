import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { z } from "zod";
import { createArchiveItem } from "@/lib/archive.functions";
import { enrichLink } from "@/lib/link-enrich.functions";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-primitives";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TagInput } from "@/components/tag-input";
import { Upload, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { t, getLocale } from "@/lib/i18n";


export const Route = createFileRoute("/_authenticated/archive/new")({
  validateSearch: z.object({
    title: z.string().optional(),
    text: z.string().optional(),
    url: z.string().optional(),
  }),
  component: NewArchiveItem,
});

function detectType(mime: string): "image" | "pdf" | "doc" | "file" {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.includes("word") || mime.includes("officedocument")) return "doc";
  return "file";
}

function NewArchiveItem() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const initialTab = search.url ? "link" : search.text ? "note" : "file";
  const [tab, setTab] = useState<string>(initialTab);
  const [title, setTitle] = useState(search.title ?? "");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState(search.text ?? "");
  const [url, setUrl] = useState(search.url ?? "");
  const [tags, setTags] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const source = search.title || search.text || search.url ? "share" : "manual";

  const mut = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: title || (url ? url : file?.name ?? "ללא כותרת"),
        description: description || null,
        notes: notes || null,
        tags,
        source,
      };

      if (tab === "link") {
        payload.item_type = "link";
        payload.url = url;
      } else if (tab === "note") {
        payload.item_type = "note";
      } else if (file) {
        setUploading(true);
        const { data: userRes } = await supabase.auth.getUser();
        const userId = userRes.user?.id;
        if (!userId) throw new Error(t("archive.notSignedIn"));
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${userId}/archive/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("archive").upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (upErr) throw upErr;
        payload.item_type = detectType(file.type);
        payload.file_path = path;
        payload.file_mime = file.type;
        payload.file_size = file.size;
      } else {
        throw new Error(t("archive.pleasePickFile"));
      }
      return createArchiveItem({ data: payload });
    },
    onSuccess: (row: any) => {
      qc.invalidateQueries();
      toast.success(t("archive.saved"));
      navigate({ to: "/archive/$id", params: { id: row.id } });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : t("action.failed"));
      setUploading(false);
    },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("archive.newTitle")} description={source === "share" ? t("archive.subtitleShared") : t("archive.subtitleManual")} />
      <Card className="p-6 space-y-5">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="file">{t("archive.tab.file")}</TabsTrigger>
            <TabsTrigger value="link">{t("archive.tab.link")}</TabsTrigger>
            <TabsTrigger value="note">{t("archive.tab.note")}</TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="pt-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-muted/30 py-10 transition-colors hover:bg-muted/60"
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              {file ? (
                <>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">{t("archive.pickFile")}</p>
                  <p className="text-xs text-muted-foreground">{t("archive.pickFileHint")}</p>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setFile(f);
                    if (!title) setTitle(f.name);
                  }
                }}
              />
            </button>
          </TabsContent>

          <TabsContent value="link" className="pt-4 space-y-2">
            <Label>{t("label.url")}</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t("archive.urlPlaceholder")} dir="ltr" />
          </TabsContent>

          <TabsContent value="note" className="pt-4 space-y-2">
            <Label>{t("label.note")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} placeholder={t("archive.notePlaceholder")} />
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <Label>{t("label.title")}</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>{t("label.descriptionOptional")}</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {tab !== "note" && (
          <div className="space-y-2">
            <Label>{t("label.notesOptional")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        )}

        <div className="space-y-2">
          <Label>{t("label.tags")}</Label>
          <TagInput value={tags} onChange={setTags} />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => navigate({ to: "/archive" })}>{t("action.cancel")}</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || uploading}>
            {(mut.isPending || uploading) && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
            {t("action.save")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
