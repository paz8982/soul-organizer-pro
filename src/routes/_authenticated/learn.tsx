import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Sparkles,
  Video,
  Headphones,
  BookOpen,
  ExternalLink,
  Bookmark,
  Check,
  Undo2,
  Plus,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { PageHeader, EmptyState } from "@/components/page-primitives";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { t, useLocale } from "@/lib/i18n";
import {
  addLearningCategory,
  deleteLearningItem,
  listLearningCategories,
  listLearningItems,
  markLearningItemStarted,
  recommendLearning,
  saveLearningItem,
  startRecommendation,
  updateLearningItem,
  type LearningFormat,
  type Recommendation,
} from "@/lib/learning.functions";

function openExternal(url: string) {
  // Force the system browser even inside the installed PWA on Android.
  window.open(url, "_blank", "noopener,noreferrer");
}

export const Route = createFileRoute("/_authenticated/learn")({
  component: LearnPage,
});

const TIME_OPTIONS = [
  { minutes: 1, key: "1" },
  { minutes: 5, key: "5" },
  { minutes: 10, key: "10" },
  { minutes: 30, key: "30" },
  { minutes: 60, key: "60" },
  { minutes: 90, key: "90+" },
];

const FORMAT_OPTIONS: { value: LearningFormat; icon: typeof Video; labelKey: string }[] = [
  { value: "video", icon: Video, labelKey: "learn.format.video" },
  { value: "audio", icon: Headphones, labelKey: "learn.format.audio" },
  { value: "text", icon: BookOpen, labelKey: "learn.format.text" },
];

const DEFAULT_CATEGORIES = [
  "inspiration",
  "motivation",
  "new",
  "productivity",
  "business",
  "psychology",
  "health",
  "finance",
  "creativity",
  "technology",
  "growth",
  "science",
  "history",
];

function timeLabel(m: number) {
  if (m === 1) return `1 ${t("learn.minute")}`;
  if (m < 60) return `${m} ${t("learn.minutes")}`;
  if (m === 60) return `1 ${t("learn.hour")}`;
  return t("learn.moreThanHour");
}

function LearnPage() {
  const locale = useLocale();
  return (
    <div className="mx-auto max-w-4xl" key={locale}>
      <PageHeader title={t("learn.title")} description={t("learn.subtitle")} />
      <Tabs defaultValue="discover" className="w-full" dir={locale === "he" ? "rtl" : "ltr"}>
        <TabsList className="mb-6">
          <TabsTrigger value="discover">{t("learn.tab.discover")}</TabsTrigger>
          <TabsTrigger value="list">{t("learn.tab.list")}</TabsTrigger>
          <TabsTrigger value="in_progress">{t("learn.tab.inProgress")}</TabsTrigger>
          <TabsTrigger value="completed">{t("learn.tab.completed")}</TabsTrigger>
        </TabsList>
        <TabsContent value="discover">
          <DiscoverFlow />
        </TabsContent>
        <TabsContent value="list">
          <SavedList status="saved" emptyKey="learn.emptyList" />
        </TabsContent>
        <TabsContent value="in_progress">
          <SavedList status="in_progress" emptyKey="learn.emptyInProgress" />
        </TabsContent>
        <TabsContent value="completed">
          <SavedList status="completed" emptyKey="learn.emptyCompleted" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------- Discover wizard ----------
function DiscoverFlow() {
  const locale = useLocale();
  const [minutes, setMinutes] = useState<number | null>(null);
  const [format, setFormat] = useState<LearningFormat | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [customCat, setCustomCat] = useState("");
  const [recs, setRecs] = useState<Recommendation[] | null>(null);

  const qc = useQueryClient();
  const catsFn = useServerFn(listLearningCategories);
  const addCatFn = useServerFn(addLearningCategory);
  const recommendFn = useServerFn(recommendLearning);

  const cats = useQuery({ queryKey: ["learn-cats"], queryFn: () => catsFn() });

  const addCat = useMutation({
    mutationFn: (name: string) => addCatFn({ data: { name } }),
    onSuccess: () => {
      toast.success(t("learn.categoryAdded"));
      setCustomCat("");
      qc.invalidateQueries({ queryKey: ["learn-cats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const recommend = useMutation({
    mutationFn: () =>
      recommendFn({
        data: {
          duration_minutes: minutes!,
          format: format!,
          category: category!,
          locale,
        },
      }),
    onSuccess: (res) => setRecs(res.items),
    onError: (e: Error) => toast.error(e.message),
  });

  const reset = () => {
    setMinutes(null);
    setFormat(null);
    setCategory(null);
    setRecs(null);
  };

  if (recs) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">{t("learn.recsTitle")}</h2>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="me-1.5 h-4 w-4" /> {t("learn.startOver")}
          </Button>
        </div>
        {recs.length === 0 ? (
          <EmptyState icon={<Sparkles className="h-5 w-5" />} title={t("error.noResults")} />
        ) : (
          <div className="grid gap-4">
            {recs.map((r, i) => (
              <RecommendationCard key={i} rec={r} />
            ))}
          </div>
        )}
        <div className="pt-2 text-center">
          <Button variant="secondary" onClick={() => recommend.mutate()} disabled={recommend.isPending}>
            {recommend.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("learn.tryAgain")}
          </Button>
        </div>
      </div>
    );
  }

  const canSubmit = minutes !== null && format !== null && category !== null;

  return (
    <div className="space-y-8">
      {/* Step 1: Time */}
      <StepCard step={1} title={t("learn.step.time")}>
        <div className="flex flex-wrap gap-2">
          {TIME_OPTIONS.map((opt) => (
            <ChoiceChip
              key={opt.key}
              active={minutes === opt.minutes}
              onClick={() => setMinutes(opt.minutes)}
            >
              {timeLabel(opt.minutes)}
            </ChoiceChip>
          ))}
        </div>
      </StepCard>

      {/* Step 2: Format */}
      <StepCard step={2} title={t("learn.step.format")}>
        <div className="grid grid-cols-3 gap-3">
          {FORMAT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = format === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setFormat(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm transition-colors",
                  active ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
                )}
              >
                <Icon className="h-5 w-5" />
                {t(opt.labelKey)}
              </button>
            );
          })}
        </div>
      </StepCard>

      {/* Step 3: Category */}
      <StepCard step={3} title={t("learn.step.category")}>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_CATEGORIES.map((c) => (
            <ChoiceChip key={c} active={category === t(`learn.cat.${c}`)} onClick={() => setCategory(t(`learn.cat.${c}`))}>
              {t(`learn.cat.${c}`)}
            </ChoiceChip>
          ))}
          {(cats.data ?? []).map((c: { id: string; name: string }) => (
            <ChoiceChip key={c.id} active={category === c.name} onClick={() => setCategory(c.name)}>
              {c.name}
            </ChoiceChip>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Input
            value={customCat}
            onChange={(e) => setCustomCat(e.target.value)}
            placeholder={t("learn.addCategory")}
            className="max-w-xs"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => customCat.trim() && addCat.mutate(customCat.trim())}
            disabled={!customCat.trim() || addCat.isPending}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </StepCard>

      <div className="flex justify-center pt-2">
        <Button size="lg" onClick={() => recommend.mutate()} disabled={!canSubmit || recommend.isPending}>
          {recommend.isPending ? (
            <>
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
              {t("learn.recommending")}
            </>
          ) : (
            <>
              <Sparkles className="me-2 h-4 w-4" />
              {t("learn.getRecs")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function StepCard({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {step}
        </div>
        <h3 className="font-display text-lg">{title}</h3>
      </div>
      {children}
    </Card>
  );
}

function ChoiceChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const saveFn = useServerFn(saveLearningItem);
  const startFn = useServerFn(startRecommendation);
  const qc = useQueryClient();

  const payload = {
    title: rec.title,
    description: rec.description,
    url: rec.url,
    source: rec.source,
    format: rec.format,
    duration_minutes: rec.duration_minutes,
    category: rec.category,
    thumbnail_url: rec.thumbnail_url ?? null,
  };

  const save = useMutation({
    mutationFn: () => saveFn({ data: { ...payload, status: "saved" } }),
    onSuccess: () => {
      toast.success(t("learn.saved"));
      qc.invalidateQueries({ queryKey: ["learn-items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const start = useMutation({
    mutationFn: () => startFn({ data: { ...payload, status: "in_progress" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["learn-items"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const handleOpen = () => {
    openExternal(rec.url);
    start.mutate();
  };

  const FormatIcon =
    rec.format === "video" ? Video : rec.format === "audio" ? Headphones : BookOpen;

  return (
    <Card className="overflow-hidden p-5">
      <div className="flex gap-4">
        {rec.thumbnail_url ? (
          <img
            src={rec.thumbnail_url}
            alt=""
            className="h-20 w-28 shrink-0 rounded-lg object-cover"
            loading="lazy"
          />
        ) : (
          <div className="grid h-20 w-28 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
            <FormatIcon className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="gap-1">
              <FormatIcon className="h-3 w-3" /> {t(`learn.format.${rec.format}`)}
            </Badge>
            {rec.duration_minutes ? <span>· {timeLabel(rec.duration_minutes)}</span> : null}
            {rec.source ? <span>· {rec.source}</span> : null}
            {rec.category ? <span>· {rec.category}</span> : null}
          </div>
          <h4 className="mt-1.5 font-display text-lg leading-snug">{rec.title}</h4>
          <p className="mt-1 text-sm text-muted-foreground">{rec.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={handleOpen}>
              <ExternalLink className="me-1.5 h-4 w-4" /> {t("learn.openContent")}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => save.mutate()} disabled={save.isPending}>
              <Bookmark className="me-1.5 h-4 w-4" /> {t("learn.saveForLater")}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---------- Saved list ----------
function SavedList({ status, emptyKey }: { status: "saved" | "in_progress" | "completed"; emptyKey: string }) {
  const listFn = useServerFn(listLearningItems);
  const items = useQuery({
    queryKey: ["learn-items", status],
    queryFn: () => listFn({ data: { status } }),
  });

  if (items.isLoading) {
    return (
      <div className="flex justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  const rows = items.data ?? [];
  if (rows.length === 0) {
    return <EmptyState icon={<Bookmark className="h-5 w-5" />} title={t(emptyKey)} />;
  }
  return (
    <div className="grid gap-4">
      {rows.map((item: SavedItem) => (
        <SavedItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}

type SavedItem = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  source: string | null;
  format: LearningFormat;
  duration_minutes: number | null;
  category: string | null;
  thumbnail_url: string | null;
  status: "saved" | "in_progress" | "completed" | "recommended" | "skipped";
  reflection: string | null;
  completed_at: string | null;
};

function SavedItemCard({ item }: { item: SavedItem }) {
  const [reflection, setReflection] = useState(item.reflection ?? "");
  const qc = useQueryClient();
  const updateFn = useServerFn(updateLearningItem);
  const deleteFn = useServerFn(deleteLearningItem);
  const startFn = useServerFn(markLearningItemStarted);

  const update = useMutation({
    mutationFn: (patch: Partial<SavedItem>) => updateFn({ data: { id: item.id, patch: patch as any } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["learn-items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: () => deleteFn({ data: { id: item.id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["learn-items"] }),
  });

  const markStarted = useMutation({
    mutationFn: () => startFn({ data: { id: item.id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["learn-items"] }),
  });

  const handleOpen = () => {
    openExternal(item.url);
    if (item.status !== "completed") markStarted.mutate();
  };

  const FormatIcon =
    item.format === "video" ? Video : item.format === "audio" ? Headphones : BookOpen;

  const isCompleted = item.status === "completed";
  const isInProgress = item.status === "in_progress";

  return (
    <Card className="p-5">
      <div className="flex gap-4">
        {item.thumbnail_url ? (
          <img src={item.thumbnail_url} alt="" className="h-20 w-28 shrink-0 rounded-lg object-cover" loading="lazy" />
        ) : (
          <div className="grid h-20 w-28 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
            <FormatIcon className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="gap-1">
              <FormatIcon className="h-3 w-3" /> {t(`learn.format.${item.format}`)}
            </Badge>
            {item.duration_minutes ? <span>· {timeLabel(item.duration_minutes)}</span> : null}
            {item.source ? <span>· {item.source}</span> : null}
            {item.category ? <span>· {item.category}</span> : null}
          </div>
          <h4 className="mt-1.5 font-display text-lg leading-snug">{item.title}</h4>
          {item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={handleOpen}>
              <ExternalLink className="me-1.5 h-4 w-4" /> {t("learn.openContent")}
            </Button>
            {isCompleted ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => update.mutate({ status: "saved", completed_at: null })}
              >
                <Undo2 className="me-1.5 h-4 w-4" /> {t("learn.markNotCompleted")}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  update.mutate({ status: "completed", completed_at: new Date().toISOString() })
                }
              >
                <Check className="me-1.5 h-4 w-4" /> {t("learn.markCompleted")}
              </Button>
            )}
            {isInProgress && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => update.mutate({ status: "saved" })}
              >
                <Bookmark className="me-1.5 h-4 w-4" /> {t("learn.moveToList")}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => del.mutate()} className="text-muted-foreground">
              {t("action.delete")}
            </Button>
          </div>


          {isCompleted && (
            <div className="mt-4 rounded-xl border bg-muted/30 p-3">
              <p className="mb-2 text-sm font-medium">{t("learn.reflectionPrompt")}</p>
              <Textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder={t("learn.reflectionPlaceholder")}
                rows={3}
              />
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => {
                    update.mutate({ reflection });
                    toast.success(t("learn.reflectionSaved"));
                  }}
                  disabled={reflection === (item.reflection ?? "")}
                >
                  {t("learn.saveReflection")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
