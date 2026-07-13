import { cn } from "@/lib/utils";

export function PriorityBadge({ priority, className }: { priority: "high" | "medium" | "low"; className?: string }) {
  const styles = {
    high: "bg-destructive/15 text-destructive",
    medium: "bg-primary/15 text-primary",
    low: "bg-muted text-muted-foreground",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", styles[priority], className)}>
      {priority}
    </span>
  );
}
