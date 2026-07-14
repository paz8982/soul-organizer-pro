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
import { t, formatDayMonth } from "@/lib/i18n";

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
    return tasks.filter((task: any) => {
      if (tab === "active" && task.status !== "active") return false;
      if (tab === "completed" && task.status !== "completed") return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (search && !`${task.title} ${task.description ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
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
      toast.success(t("action.saved"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("action.failed")),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "completed" }) => setTaskStatus({ data: { id, status } }),
    onSuccess: () => qc.invalidateQueries(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTask({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success(t("action.deleted"));
    },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={t("tasks.title")}
        description={t("tasks.subtitle")}
        action={
          <Button onClick={() => setEditing({ ...emptyDraft })}>
            <Plus className="ms-1.5 h-4 w-4" /> {t("tasks.new")}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-auto">
          <TabsList>
            <TabsTrigger value="active">{t("status.active")}</TabsTrigger>
            <TabsTrigger value="completed">{t("status.completed")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute end-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("tasks.searchPlaceholder")} className="pe-8" />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter.allPriorities")}</SelectItem>
            <SelectItem value="high">{t("priority.high")}</SelectItem>
            <SelectItem value="medium">{t("priority.medium")}</SelectItem>
            <SelectItem value="low">{t("priority.low")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-5 w-5" />}
          title={tab === "active" ? t("tasks.emptyActive") : t("tasks.emptyDone")}
          description={tab === "active" ? t("tasks.emptyActiveHint") : t("tasks.emptyDoneHint")}
          action={tab === "active" && <Button onClick={() => setEditing({ ...emptyDraft })}>{t("tasks.add")}</Button>}
        />
      ) : (
        <Card className="divide-y overflow-hidden">
          {filtered.map((task: any) => (
            <div key={task.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
              <button
                onClick={() => toggleMut.mutate({ id: task.id, status: task.status === "completed" ? "active" : "completed" })}
                className="text-muted-foreground hover:text-primary"
              >
                {task.status === "completed" ? <CheckSquare className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={cn("truncate font-medium", task.status === "completed" && "line-through opacity-60")}>{task.title}</p>
                  <PriorityBadge priority={task.priority} />
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {task.due_date && (
                    <span>
                      {t("tasks.due")} {formatDayMonth(task.due_date)}
                      {task.due_time && ` · ${task.due_time.slice(0, 5)}`}
                    </span>
                  )}
                  {task.tags?.map((tag: string) => <span key={tag}>#{tag}</span>)}
                </div>
              </div>
              <div className="flex opacity-0 group-hover:opacity-100">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    setEditing({
                      id: task.id,
                      title: task.title,
                      description: task.description ?? "",
                      priority: task.priority,
                      due_date: task.due_date ?? "",
                      due_time: task.due_time ?? "",
                      tags: task.tags ?? [],
                    })
                  }
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => confirm(t("tasks.confirmDelete")) && deleteMut.mutate(task.id)}>
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
            <DialogTitle className="font-display text-2xl">{editing?.id ? t("tasks.edit") : t("tasks.new")}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("label.title")}</Label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} autoFocus />
              </div>
              <div className="space-y-2">
                <Label>{t("label.description")}</Label>
                <Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>{t("label.priority")}</Label>
                  <Select value={editing.priority} onValueChange={(v) => setEditing({ ...editing, priority: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">{t("priority.high")}</SelectItem>
                      <SelectItem value="medium">{t("priority.medium")}</SelectItem>
                      <SelectItem value="low">{t("priority.low")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("label.dueDate")}</Label>
                  <Input type="date" value={editing.due_date} onChange={(e) => setEditing({ ...editing, due_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t("label.time")}</Label>
                  <Input type="time" value={editing.due_time} onChange={(e) => setEditing({ ...editing, due_time: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("label.tags")}</Label>
                <TagInput value={editing.tags} onChange={(v) => setEditing({ ...editing, tags: v })} />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setEditing(null)}>{t("action.cancel")}</Button>
                <Button onClick={() => saveMut.mutate(editing)} disabled={!editing.title || saveMut.isPending}>
                  {t("action.save")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
