import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getProfile, updateProfile, exportAllData } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-primitives";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { LogOut, Download, Moon, Languages } from "lucide-react";
import { t, useLocale, setLocale, type Locale } from "@/lib/i18n";

const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: () => getProfile(),
});

export const Route = createFileRoute("/_authenticated/settings")({
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQuery),
  component: SettingsPage,
});

function SettingsPage() {
  const { data } = useSuspenseQuery(profileQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();

  const [displayName, setDisplayName] = useState(data.profile?.display_name ?? "");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark") || localStorage.getItem("theme") === "dark";
    setDark(isDark);
  }, []);

  const applyTheme = (isDark: boolean) => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setDark(isDark);
  };

  const saveMut = useMutation({
    mutationFn: () => updateProfile({ data: { display_name: displayName } }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success(t("settings.profileSaved"));
    },
  });

  const handleExport = async () => {
    const payload = await exportAllData();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `second-brain-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("settings.downloaded"));
  };

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.invalidate();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("settings.title")} description={t("settings.subtitle")} />

      <div className="space-y-4">
        <Card className="p-6">
          <h2 className="mb-4 font-display text-xl">{t("settings.account")}</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("label.email")}</Label>
              <Input value={data.email ?? ""} disabled dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>{t("label.displayName")}</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>{t("action.save")}</Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-xl">{t("settings.appearance")}</h2>
          <div className="space-y-5">
            <LanguageRow />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Moon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t("settings.darkMode")}</p>
                  <p className="text-xs text-muted-foreground">{t("settings.darkModeHint")}</p>
                </div>
              </div>
              <Switch checked={dark} onCheckedChange={applyTheme} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-xl">{t("settings.data")}</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("settings.export")}</p>
                <p className="text-xs text-muted-foreground">{t("settings.exportHint")}</p>
              </div>
              <Button variant="outline" onClick={handleExport}>
                <Download className="ms-1.5 h-4 w-4" /> {t("action.export")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("settings.backupSoon")}</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t("settings.signOut")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.signOutHint")}</p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="ms-1.5 h-4 w-4" /> {t("nav.signOut")}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function LanguageRow() {
  const locale = useLocale();
  const choose = (l: Locale) => {
    if (l === locale) return;
    setLocale(l);
    toast.success(t("settings.languageChanged"));
  };
  const options: { value: Locale; label: string }[] = [
    { value: "he", label: t("settings.language.he") },
    { value: "en", label: t("settings.language.en") },
  ];
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Languages className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="font-medium">{t("settings.language")}</p>
          <p className="text-xs text-muted-foreground">{t("settings.languageHint")}</p>
        </div>
      </div>
      <div className="inline-flex rounded-lg border bg-background p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => choose(o.value)}
            className={
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
              (locale === o.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
