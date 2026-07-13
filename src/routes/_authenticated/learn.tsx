import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-primitives";
import { Card } from "@/components/ui/card";
import { Sparkles, BookOpen, Lightbulb, Compass } from "lucide-react";

export const Route = createFileRoute("/_authenticated/learn")({
  component: LearnPage,
});

function LearnPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Learn & Inspire" description="A quiet corner for growth. Coming soon." />
      <Card className="p-10 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="font-display text-2xl italic">Something gentle is on the way</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Curated readings, learning streaks, and inspiration prompts — designed to fit your rhythm, not disrupt it.
        </p>
        <div className="mx-auto mt-8 grid max-w-lg grid-cols-3 gap-3 text-xs text-muted-foreground">
          <div className="rounded-xl border p-3">
            <BookOpen className="mx-auto mb-1.5 h-4 w-4 text-primary" />
            Reading list
          </div>
          <div className="rounded-xl border p-3">
            <Lightbulb className="mx-auto mb-1.5 h-4 w-4 text-primary" />
            Daily prompts
          </div>
          <div className="rounded-xl border p-3">
            <Compass className="mx-auto mb-1.5 h-4 w-4 text-primary" />
            Learning paths
          </div>
        </div>
      </Card>
    </div>
  );
}
