import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTask } from "@/lib/tasks.functions";
import { createArchiveItem } from "@/lib/archive.functions";
import { createJournalEntry } from "@/lib/journal.functions";
import { addGroceryItem } from "@/lib/groceries.functions";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

export function QuickAddDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [tab, setTab] = useState<"task" | "journal" | "capture" | "grocery">("task");
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [dueDate, setDueDate] = useState("");

  const [journalTitle, setJournalTitle] = useState("");
  const [journalBody, setJournalBody] = useState("");

  const [capTitle, setCapTitle] = useState("");
  const [capNotes, setCapNotes] = useState("");
  const [capUrl, setCapUrl] = useState("");

  const [groceryName, setGroceryName] = useState("");
  const [groceryQty, setGroceryQty] = useState(1);

  const reset = () => {
    setTitle("");
    setPriority("medium");
    setDueDate("");
    setJournalTitle("");
    setJournalBody("");
    setCapTitle("");
    setCapNotes("");
    setCapUrl("");
    setGroceryName("");
    setGroceryQty(1);
  };

  const taskMut = useMutation({
    mutationFn: () =>
      createTask({
        data: {
          title,
          priority,
          due_date: dueDate || null,
          tags: [],
        } as any,
      }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success(t("quick.taskAdded"));
      reset();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("action.failed")),
  });

  const journalMut = useMutation({
    mutationFn: () =>
      createJournalEntry({
        data: {
          entry_date: new Date().toISOString().slice(0, 10),
          title: journalTitle || null,
          body: journalBody,
          tags: [],
          image_urls: [],
        } as any,
      }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success(t("journal.saved"));
      reset();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("action.failed")),
  });

  const capMut = useMutation({
    mutationFn: () =>
      createArchiveItem({
        data: {
          title: capTitle || (capUrl ? capUrl : capNotes.slice(0, 60) || "ללא כותרת"),
          notes: capNotes || null,
          url: capUrl || null,
          item_type: capUrl ? "link" : "note",
          tags: [],
          source: "manual",
        } as any,
      }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success(t("archive.saved"));
      reset();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("action.failed")),
  });

  const groceryMut = useMutation({
    mutationFn: () =>
      addGroceryItem({
        data: { name: groceryName, quantity: groceryQty || 1 },
      }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success(t("quick.groceryAdded"));
      reset();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("action.failed")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t("quick.title")}</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="task" className="text-xs sm:text-sm">{t("quick.tab.task")}</TabsTrigger>
            <TabsTrigger value="journal" className="text-xs sm:text-sm">{t("quick.tab.journal")}</TabsTrigger>
            <TabsTrigger value="capture" className="text-xs sm:text-sm">{t("quick.tab.archive")}</TabsTrigger>
            <TabsTrigger value="grocery" className="text-xs sm:text-sm">{t("quick.tab.grocery")}</TabsTrigger>
          </TabsList>

          <TabsContent value="task" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t("label.title")}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("tasks.titlePlaceholder")} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("label.priority")}</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">{t("priority.high")}</SelectItem>
                    <SelectItem value="medium">{t("priority.medium")}</SelectItem>
                    <SelectItem value="low">{t("priority.low")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("label.dueDate")}</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => navigate({ to: "/tasks" })}>{t("action.cancel")}</Button>
              <Button onClick={() => taskMut.mutate()} disabled={!title || taskMut.isPending}>
                {t("action.save")}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="journal" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t("label.title")}</Label>
              <Input
                value={journalTitle}
                onChange={(e) => setJournalTitle(e.target.value)}
                placeholder={t("label.titleOptional")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("label.notes")}</Label>
              <Textarea value={journalBody} onChange={(e) => setJournalBody(e.target.value)} rows={5} />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("action.cancel")}</Button>
              <Button onClick={() => journalMut.mutate()} disabled={!journalBody.trim() || journalMut.isPending}>
                {t("action.save")}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="capture" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t("label.title")}</Label>
              <Input value={capTitle} onChange={(e) => setCapTitle(e.target.value)} placeholder={t("label.titleOptional")} />
            </div>
            <div className="space-y-2">
              <Label>{t("label.url")}</Label>
              <Input value={capUrl} onChange={(e) => setCapUrl(e.target.value)} placeholder={t("archive.urlPlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label>{t("label.notes")}</Label>
              <Textarea value={capNotes} onChange={(e) => setCapNotes(e.target.value)} rows={4} placeholder={t("archive.notePlaceholder")} />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("action.cancel")}</Button>
              <Button onClick={() => capMut.mutate()} disabled={(!capTitle && !capUrl && !capNotes) || capMut.isPending}>
                {t("action.save")}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="grocery" className="space-y-4 pt-4">
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="space-y-2">
                <Label>{t("label.title")}</Label>
                <Input
                  value={groceryName}
                  onChange={(e) => setGroceryName(e.target.value)}
                  placeholder={t("groceries.namePlaceholder")}
                />
              </div>
              <div className="w-24 space-y-2">
                <Label>{t("groceries.quantity")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={groceryQty}
                  onChange={(e) => setGroceryQty(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("action.cancel")}</Button>
              <Button onClick={() => groceryMut.mutate()} disabled={!groceryName.trim() || groceryMut.isPending}>
                {t("action.save")}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
