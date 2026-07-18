import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDashboardData } from "@/lib/dashboard.functions";
import { setTaskStatus } from "@/lib/tasks.functions";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-primitives";
import { PriorityBadge } from "@/components/priority-badge";
import { moodEmoji } from "@/components/mood-picker";
import { CheckSquare, Circle, Archive as ArchiveIcon, BookHeart, ArrowLeft, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { t, greetingKey, formatDayMonth, formatDateShort, itemTypeLabel } from "@/lib/i18n";
import { useMemo } from "react";

const dashboardQuery = queryOptions({
  queryKey: ["dashboard"],
  queryFn: () => getDashboardData(),
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQuery),
  component: Dashboard,
});

function Dashboard() {
  const { data } = useSuspenseQuery(dashboardQuery);
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: (id: string) => setTaskStatus({ data: { id, status: "completed" } }),
    onSuccess: () => qc.invalidateQueries(),
  });

  const allTasks = useMemo(() => {
    const list = [...(data.activeTasks ?? [])];
    list.sort((a: any, b: any) => {
      const dA = a.due_date || "9999-12-31";
      const dB = b.due_date || "9999-12-31";
      if (dA !== dB) return dA.localeCompare(dB);
      return (a.due_time || "").localeCompare(b.due_time || "");
    });
    return list;
  }, [data]);

  const n = data.activeTaskCount;
  const subKey = n === 0 ? "dashboard.subtitle.zero" : n === 1 ? "dashboard.subtitle.one" : "dashboard.subtitle.many";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t(greetingKey())} description={t(subKey, { n })} />

      <div className="grid gap-5 md:grid-cols-2">
        {/* All active tasks — single scrollable list */}
        <Card className="md:col-span-2 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl">{t("dashboard.allActive")}</h2>
            <Link to="/tasks" className="text-xs text-primary hover:underline">{t("dashboard.allTasks")}</Link>
          </div>
          {allTasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("dashboard.allActiveEmpty")}</p>
          ) : (
            <div className="max-h-[260px] overflow-y-auto md:max-h-[360px] -me-1">
              <ul className="space-y-1">
                {allTasks.map((task: any) => (
                  <TaskRow key={task.id} task={task} onComplete={() => toggle.mutate(task.id)} />
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Recent journal */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl">{t("dashboard.recentJournal")}</h2>
            <Link to="/journal" className="text-xs text-primary hover:underline">{t("dashboard.openJournal")}</Link>
          </div>
          {data.recentJournal.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("dashboard.journalEmpty")}</p>
          ) : (
            <ul className="space-y-2">
              {data.recentJournal.map((j: any) => (
                <li key={j.id}>
                  <Link
                    to="/journal/$id"
                    params={{ id: j.id }}
                    className="group flex items-start gap-3 rounded-lg p-2 -mx-2 hover:bg-muted"
                  >
                    <BookHeart className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="truncate text-sm font-medium">{j.title || formatDateShort(j.entry_date)}</p>
                        {j.mood && <span className="text-sm">{moodEmoji(j.mood)}</span>}
                      </div>
                      {j.body && <p className="line-clamp-1 text-xs text-muted-foreground">{j.body}</p>}
                    </div>
                    <ArrowLeft className="mt-1 h-3.5 w-3.5 opacity-0 group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recent archive */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl">{t("dashboard.recentArchive")}</h2>
            <Link to="/archive" className="text-xs text-primary hover:underline">{t("dashboard.openArchive")}</Link>
          </div>
          {data.recentArchive.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("dashboard.archiveEmpty")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.recentArchive.map((a: any) => (
                <Link
                  key={a.id}
                  to="/archive/$id"
                  params={{ id: a.id }}
                  className="group flex items-start gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/50"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                    <ArchiveIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">{itemTypeLabel(a.item_type)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function TaskRow({ task, onComplete }: { task: any; onComplete: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = task.due_date && task.due_date < today;

  return (
    <li className={cn("group flex items-center gap-2 rounded-lg py-2 px-2 -mx-2", isOverdue && "bg-destructive/5")}>
      <button
        onClick={onComplete}
        className="text-muted-foreground transition-colors hover:text-primary"
        aria-label={t("dashboard.completeTask")}
      >
        <Circle className="h-4 w-4 group-hover:hidden" />
        <CheckSquare className="hidden h-4 w-4 group-hover:block" />
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[13px] md:text-sm font-medium leading-snug", task.status === "completed" && "line-through opacity-60")}>
          {task.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {isOverdue && (
            <span className="inline-flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3 w-3" />
              {t("dashboard.overdue")}
            </span>
          )}
          {task.due_date && (
            <span>
              {formatDayMonth(task.due_date)}
              {task.due_time && ` · ${task.due_time.slice(0, 5)}`}
            </span>
          )}
        </div>
      </div>
      <PriorityBadge priority={task.priority} />
    </li>
  );
}
