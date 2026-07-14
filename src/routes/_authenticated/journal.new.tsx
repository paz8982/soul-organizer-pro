import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createJournalEntry } from "@/lib/journal.functions";
import { PageHeader } from "@/components/page-primitives";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MoodPicker } from "@/components/mood-picker";
import { TagInput } from "@/components/tag-input";
import { toast } from "sonner";
import { t, formatWeekday } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/journal/new")({
  component: NewJournalEntry,
});

function NewJournalEntry() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  const mut = useMutation({
    mutationFn: () =>
      createJournalEntry({
        data: {
          entry_date: entryDate,
          title: title || null,
          body,
          mood,
          tags,
          image_urls: [],
        } as any,
      }),
    onSuccess: (row: any) => {
      qc.invalidateQueries();
      toast.success(t("journal.saved"));
      navigate({ to: "/journal/$id", params: { id: row.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("action.failed")),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("journal.newTitle")} description={formatWeekday(entryDate)} />
      <Card className="p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("label.date")}</Label>
            <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("label.titleOptional")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("journal.titleShort")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("label.mood")}</Label>
          <MoodPicker value={mood} onChange={setMood} />
        </div>

        <div className="space-y-2">
          <Label>{t("label.thoughts")}</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} placeholder={t("journal.body")} className="font-sans leading-relaxed" />
        </div>

        <div className="space-y-2">
          <Label>{t("label.tags")}</Label>
          <TagInput value={tags} onChange={setTags} />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => navigate({ to: "/journal" })}>{t("action.cancel")}</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || (!body && !title)}>
            {t("action.save")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
