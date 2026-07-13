import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { listTasks, createTask, updateTask, setTaskStatus, deleteTask } from "@/lib/tasks.functions";
import { PageHeader, EmptyState } from "@/components/page-primitives";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PriorityBadge } from "@/components/priority-badge";
import { TagInput } from "@/components/tag-input";
import { Circle, CheckSquare, Plus, Trash2, Pencil, Search, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const tasksQuery = queryOptions({
  queryKey: ["tasks"],
  queryFn: () => listTasks({ data: { status: "all" } }),
});

export const Route = createFileRoute("/_authenticated/tasks")({
  loader: ({ context }) => context.queryClient.ensureQueryData(tasksQuery),
  component: TasksPage,
});

type TaskDraft = {
  id?: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  due_date: string;
  due_time: string;
  tags: string[];
};

const emptyDraft: TaskDraft = { title: "", description: "", priority: "medium", due_date: "", due_time: "", tags: [] };

function TasksPage() {
  const { data: tasks } = useSuspenseQuery(tasksQuery);
  const qc = useQueryClient();

  const [tab, setTab] = useState<"active" | "completed">("active");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [editing, setEditing] = useState<TaskDraft | null>(null);

  const filtered = useMemo(() => {
    return tasks.filter((t: any) => {
      if (tab === "active" && t.status !== "active") return false;
      if (tab === "completed" && t.status !== "completed") return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (search && !`${t.title} ${t.description ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tasks, tab, search, priorityFilter]);

  const saveMut = useMutation({
    mutationFn: async (draft: TaskDraft) => {
      const payload = {
        title: draft.title,
        description: draft.description || null,
        priority: draft.priority,
        due_date: draft.due_date || null,
        due_time: draft.due_time || null,
        tags: draft.tags,
      };
      if (draft.id) return updateTask({ data: { id: draft.id, patch: payload as any } });
      return createTask({ data: payload as any });
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setEditing(null);
      toast.success("Saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "completed" }) => setTaskStatus({ data: { id, status } }),
    onSuccess: () => qc.invalidateQueries(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTask({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Deleted");
    },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Tasks"
        description="What needs your attention."
        action={
          <Button onClick={() => setEditing({ ...emptyDraft })}>
            <Plus className="mr-1.5 h-4 w-4" /> New task
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-auto">
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-8" />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-5 w-5" />}
          title={tab === "active" ? "No active tasks" : "Nothing here yet"}
          description={tab === "active" ? "Add your first one — it takes a second." : "Completed tasks appear here."}
          action={tab === "active" && <Button onClick={() => setEditing({ ...emptyDraft })}>Add task</Button>}
        />
      ) : (
        <Card className="divide-y overflow-hidden">
          {filtered.map((t: any) => (
            <div key={t.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
              <button
                onClick={() => toggleMut.mutate({ id: t.id, status: t.status === "completed" ? "active" : "completed" })}
                className="text-muted-foreground hover:text-primary"
              >
                {t.status === "completed" ? <CheckSquare className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={cn("truncate font-medium", t.status === "completed" && "line-through opacity-60")}>{t.title}</p>
                  <PriorityBadge priority={t.priority} />
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {t.due_date && (
                    <span>
                      Due {new Date(t.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      {t.due_time && ` · ${t.due_time.slice(0, 5)}`}
                    </span>
                  )}
                  {t.tags?.map((tag: string) => <span key={tag}>#{tag}</span>)}
                </div>
              </div>
              <div className="flex opacity-0 group-hover:opacity-100">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    setEditing({
                      id: t.id,
                      title: t.title,
                      description: t.description ?? "",
                      priority: t.priority,
                      due_date: t.due_date ?? "",
                      due_time: t.due_time ?? "",
                      tags: t.tags ?? [],
                    })
                  }
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => confirm("Delete this task?") && deleteMut.mutate(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editing?.id ? "Edit task" : "New task"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} autoFocus />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={editing.priority} onValueChange={(v) => setEditing({ ...editing, priority: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due date</Label>
                  <Input type="date" value={editing.due_date} onChange={(e) => setEditing({ ...editing, due_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input type="time" value={editing.due_time} onChange={(e) => setEditing({ ...editing, due_time: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <TagInput value={editing.tags} onChange={(v) => setEditing({ ...editing, tags: v })} />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={() => saveMut.mutate(editing)} disabled={!editing.title || saveMut.isPending}>
                  Save
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
