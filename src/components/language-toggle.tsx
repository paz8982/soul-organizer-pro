import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setLocale, t, useLocale, type Locale } from "@/lib/i18n";
import { toast } from "sonner";

/** Compact toggle that flips between Hebrew and English. */
export function LanguageToggle({ className }: { className?: string }) {
  const locale = useLocale();
  const next: Locale = locale === "he" ? "en" : "he";
  const nextLabel = next === "he" ? "עברית" : "English";
  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => {
        setLocale(next);
        toast.success(t("settings.languageChanged"));
      }}
      aria-label={t("lang.toggle")}
      title={t("lang.toggle")}
    >
      <Languages className="h-4 w-4" />
      <span className="ms-1.5 text-xs font-medium">{nextLabel}</span>
    </Button>
  );
}
