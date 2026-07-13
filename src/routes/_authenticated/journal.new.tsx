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
      toast.success("Entry saved");
      navigate({ to: "/journal/$id", params: { id: row.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New entry" description={new Date(entryDate).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} />
      <Card className="p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Title (optional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A word or two…" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>How are you feeling?</Label>
          <MoodPicker value={mood} onChange={setMood} />
        </div>

        <div className="space-y-2">
          <Label>Thoughts</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} placeholder="Write freely…" className="font-sans leading-relaxed" />
        </div>

        <div className="space-y-2">
          <Label>Tags</Label>
          <TagInput value={tags} onChange={setTags} />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => navigate({ to: "/journal" })}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || (!body && !title)}>
            Save entry
          </Button>
        </div>
      </Card>
    </div>
  );
}
