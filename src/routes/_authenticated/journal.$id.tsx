import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getJournalEntry, updateJournalEntry, deleteJournalEntry } from "@/lib/journal.functions";
import { PageHeader } from "@/components/page-primitives";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MoodPicker } from "@/components/mood-picker";
import { TagInput } from "@/components/tag-input";
import { ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { t, formatWeekday } from "@/lib/i18n";

const entryQuery = (id: string) =>
  queryOptions({
    queryKey: ["journal", id],
    queryFn: () => getJournalEntry({ data: { id } }),
  });

export const Route = createFileRoute("/_authenticated/journal/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(entryQuery(params.id)),
  component: JournalEntryPage,
});

function JournalEntryPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(entryQuery(id));
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [title, setTitle] = useState(data.title ?? "");
  const [body, setBody] = useState(data.body ?? "");
  const [mood, setMood] = useState<number | null>(data.mood ?? null);
  const [tags, setTags] = useState<string[]>(data.tags ?? []);
  const [entryDate, setEntryDate] = useState<string>(data.entry_date);

  useEffect(() => {
    setTitle(data.title ?? "");
    setBody(data.body ?? "");
    setMood(data.mood ?? null);
    setTags(data.tags ?? []);
    setEntryDate(data.entry_date);
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () =>
      updateJournalEntry({
        data: {
          id,
          patch: { title: title || null, body, mood, tags, entry_date: entryDate } as any,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success(t("action.saved"));
    },
  });

  const delMut = useMutation({
    mutationFn: () => deleteJournalEntry({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success(t("action.deleted"));
      navigate({ to: "/journal" });
    },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/journal" })} className="mb-3 -ms-2">
        <ArrowRight className="ms-1 h-4 w-4" /> {t("journal.back")}
      </Button>
      <PageHeader
        title={title || formatWeekday(entryDate)}
        action={
          <Button variant="ghost" size="icon" onClick={() => confirm(t("journal.confirmDelete")) && delMut.mutate()}>
            <Trash2 className="h-4 w-4" />
          </Button>
        }
      />
      <Card className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("label.date")}</Label>
            <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("label.title")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("label.mood")}</Label>
          <MoodPicker value={mood} onChange={setMood} />
        </div>

        <div className="space-y-2">
          <Label>{t("label.thoughts")}</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={14} className="leading-relaxed" />
        </div>

        <div className="space-y-2">
          <Label>{t("label.tags")}</Label>
          <TagInput value={tags} onChange={setTags} />
        </div>

        <div className="flex justify-end">
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>{t("action.saveChanges")}</Button>
        </div>
      </Card>
    </div>
  );
}
