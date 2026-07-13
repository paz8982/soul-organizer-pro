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
import { toast } from "sonner";

export function QuickAddDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [tab, setTab] = useState<"task" | "capture">("task");
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [dueDate, setDueDate] = useState("");

  const [capTitle, setCapTitle] = useState("");
  const [capNotes, setCapNotes] = useState("");
  const [capUrl, setCapUrl] = useState("");

  const reset = () => {
    setTitle("");
    setPriority("medium");
    setDueDate("");
    setCapTitle("");
    setCapNotes("");
    setCapUrl("");
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
      toast.success("Task added");
      reset();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const capMut = useMutation({
    mutationFn: () =>
      createArchiveItem({
        data: {
          title: capTitle || (capUrl ? capUrl : "Untitled"),
          notes: capNotes || null,
          url: capUrl || null,
          item_type: capUrl ? "link" : "note",
          tags: [],
          source: "manual",
        } as any,
      }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Saved to archive");
      reset();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Quick add</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="task">Task</TabsTrigger>
            <TabsTrigger value="capture">Capture</TabsTrigger>
          </TabsList>

          <TabsContent value="task" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => navigate({ to: "/tasks" })}>
                All tasks
              </Button>
              <Button onClick={() => taskMut.mutate()} disabled={!title || taskMut.isPending}>
                Add task
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="capture" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={capTitle} onChange={(e) => setCapTitle(e.target.value)} placeholder="Optional title" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Link (optional)</Label>
              <Input value={capUrl} onChange={(e) => setCapUrl(e.target.value)} placeholder="https://…" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={capNotes} onChange={(e) => setCapNotes(e.target.value)} rows={4} placeholder="Anything you want to remember…" />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => navigate({ to: "/archive/new" })}>
                More options
              </Button>
              <Button
                onClick={() => capMut.mutate()}
                disabled={(!capTitle && !capUrl && !capNotes) || capMut.isPending}
              >
                Save
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
