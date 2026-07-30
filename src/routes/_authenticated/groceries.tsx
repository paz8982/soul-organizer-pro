import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  listGroceries,
  addGroceryItem,
  updateGroceryItem,
  deleteGroceryItem,
  clearBoughtGroceries,
} from "@/lib/groceries.functions";
import { PageHeader, EmptyState } from "@/components/page-primitives";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Plus, Trash2, Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { t, getLocale } from "@/lib/i18n";

const groceriesQuery = queryOptions({
  queryKey: ["groceries"],
  queryFn: () => listGroceries(),
});

export const Route = createFileRoute("/_authenticated/groceries")({
  head: () => ({
    meta: [
      { title: "רשימת קניות — המוח השני" },
      { name: "description", content: "רשימת הקניות האישית שלך: הוספה, סימון מה נקנה ושיתוף לאפליקציות אחרות." },
      { property: "og:title", content: "רשימת קניות — המוח השני" },
      { property: "og:description", content: "רשימת הקניות האישית שלך: הוספה, סימון מה נקנה ושיתוף לאפליקציות אחרות." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(groceriesQuery),
  component: GroceriesPage,
});

type GroceryItem = {
  id: string;
  name: string;
  quantity: number;
  is_bought: boolean;
};

function GroceriesPage() {
  const { data: items } = useSuspenseQuery(groceriesQuery);
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["groceries"] });

  const add = useMutation({
    mutationFn: (input: { name: string; quantity: number }) => addGroceryItem({ data: input }),
    onSuccess: () => {
      setName("");
      setQuantity("1");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: (input: { id: string; is_bought: boolean }) =>
      updateGroceryItem({ data: { id: input.id, patch: { is_bought: input.is_bought } } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteGroceryItem({ data: { id } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const clearBought = useMutation({
    mutationFn: () => clearBoughtGroceries(),
    onSuccess: () => {
      toast.success(t("groceries.cleared"));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = useMemo(() => (items as GroceryItem[]).filter((i) => !i.is_bought), [items]);
  const bought = useMemo(() => (items as GroceryItem[]).filter((i) => i.is_bought), [items]);

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const q = Math.max(1, Math.min(999, Number(quantity) || 1));
    add.mutate({ name: trimmed, quantity: q });
  };

  const buildText = () => {
    const date = new Date().toLocaleDateString(getLocale() === "he" ? "he-IL" : "en-US");
    const lines = pending.map((i) => `• ${i.name}${i.quantity > 1 ? ` × ${i.quantity}` : ""}`);
    return `${t("groceries.title")} — ${date}\n${lines.join("\n")}`;
  };

  const handleShare = async () => {
    if (pending.length === 0) {
      toast.error(t("groceries.nothingToShare"));
      return;
    }
    const text = buildText();
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: t("groceries.title"), text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success(t("groceries.copied"));
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(text);
        toast.success(t("groceries.copied"));
      } catch {
        toast.error(t("groceries.shareFailed"));
      }
    }
  };

  const renderRow = (item: GroceryItem) => (
    <div
      key={item.id}
      className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
    >
      <button
        type="button"
        onClick={() => toggle.mutate({ id: item.id, is_bought: !item.is_bought })}
        aria-label={item.is_bought ? t("groceries.markUnbought") : t("groceries.markBought")}
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors",
          item.is_bought ? "border-primary bg-primary text-primary-foreground" : "border-input",
        )}
      >
        {item.is_bought && <Check className="h-3.5 w-3.5" />}
      </button>

      <button
        type="button"
        onClick={() => toggle.mutate({ id: item.id, is_bought: !item.is_bought })}
        className="min-w-0 flex-1 text-start"
      >
        <span
          className={cn(
            "block truncate text-[15px]",
            item.is_bought && "text-muted-foreground line-through",
          )}
        >
          {item.name}
        </span>
      </button>

      {item.quantity > 1 && (
        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
          × {item.quantity}
        </span>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        aria-label={t("action.delete")}
        onClick={() => remove.mutate(item.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader
        title={t("groceries.title")}
        description={t("groceries.subtitle")}
        action={
          <Button variant="outline" onClick={handleShare} className="gap-2">
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t("groceries.share")}</span>
          </Button>
        }
      />

      <Card className="mb-6 p-3">
        <div className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder={t("groceries.namePlaceholder")}
            className="min-w-0 flex-1"
            aria-label={t("groceries.namePlaceholder")}
          />
          <Input
            type="number"
            min={1}
            max={999}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            className="w-16 shrink-0 text-center"
            aria-label={t("groceries.quantity")}
          />
          <Button onClick={handleAdd} disabled={add.isPending || !name.trim()} size="icon" className="shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {items.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="h-6 w-6" />}
          title={t("groceries.emptyTitle")}
          description={t("groceries.emptyHint")}
        />
      ) : (
        <div className="space-y-4">
          <Card className="overflow-hidden p-0">
            {pending.length > 0 ? (
              pending.map(renderRow)
            ) : (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                {t("groceries.allBought")}
              </p>
            )}
          </Card>

          {bought.length > 0 && (
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("groceries.boughtSection")} ({bought.length})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => clearBought.mutate()}
                  disabled={clearBought.isPending}
                >
                  {t("groceries.clearBought")}
                </Button>
              </div>
              {bought.map(renderRow)}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
