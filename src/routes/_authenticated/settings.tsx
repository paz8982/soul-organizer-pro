import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getProfile, updateProfile, exportAllData } from "@/lib/profile.functions";
import {
  listWearDevices,
  createWearDevice,
  updateWearDevice,
  deleteWearDevice,
} from "@/lib/wear-devices.functions";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-primitives";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { LogOut, Download, Moon, Languages, Watch, Copy, Trash2, Plus } from "lucide-react";
import { t, useLocale, setLocale, getLocale, type Locale } from "@/lib/i18n";

const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: () => getProfile(),
});

const wearDevicesQuery = queryOptions({
  queryKey: ["wear_devices"],
  queryFn: () => listWearDevices(),
});

export const Route = createFileRoute("/_authenticated/settings")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(profileQuery);
    context.queryClient.ensureQueryData(wearDevicesQuery);
  },
  component: SettingsPage,
});

function SettingsPage() {
  const { data: profileData } = useSuspenseQuery(profileQuery);
  const { data: devices } = useSuspenseQuery(wearDevicesQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();

  const [displayName, setDisplayName] = useState(profileData.profile?.display_name ?? "");
  const [dark, setDark] = useState(false);
  const [pairingDialogOpen, setPairingDialogOpen] = useState(false);
  const [pairingToken, setPairingToken] = useState<string | null>(null);

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
              <Input value={profileData.email ?? ""} disabled dir="ltr" />
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
          <h2 className="mb-4 font-display text-xl">{t("settings.wearOS")}</h2>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <Watch className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t("settings.wearInstallApp")}</p>
                  <p className="text-xs text-muted-foreground">{t("settings.wearInstallAppHint")}</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setPairingDialogOpen(true)}>
                <Plus className="ms-1.5 h-4 w-4" /> {t("settings.wearAddDevice")}
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">{t("settings.wearDevices")}</p>
              {devices.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("settings.wearNoDevices")}</p>
              ) : (
                <div className="space-y-2">
                  {devices.map((device) => (
                    <WearDeviceRow key={device.id} device={device} />
                  ))}
                </div>
              )}
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

      <PairingDialog
        open={pairingDialogOpen}
        onOpenChange={setPairingDialogOpen}
        token={pairingToken}
        setToken={setPairingToken}
      />
    </div>
  );
}

type WearDevice = Awaited<ReturnType<typeof listWearDevices>>[number];

function WearDeviceRow({ device }: { device: WearDevice }) {
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: ({ enabled }: { enabled: boolean }) => updateWearDevice({ data: { id: device.id, patch: { enabled } } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wear_devices"] }),
  });
  const remove = useMutation({
    mutationFn: () => deleteWearDevice({ data: { id: device.id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wear_devices"] }),
  });

  const lastUsed = device.last_used_at
    ? new Date(device.last_used_at).toLocaleDateString(getLocale() === "he" ? "he-IL" : "en-US")
    : "—";

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{device.label}</p>
        <p className="text-xs text-muted-foreground">
          ···{device.token_last_four} · {t("settings.wearDeviceLastUsed")}: {lastUsed}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={device.enabled}
          onCheckedChange={(v) => toggle.mutate({ enabled: v })}
          aria-label={device.enabled ? t("settings.wearEnabled") : t("settings.wearDisabled")}
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("settings.wearRevoke")}
          onClick={() => {
            if (confirm(t("settings.wearRevokeConfirm"))) remove.mutate();
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function PairingDialog({
  open,
  onOpenChange,
  token,
  setToken,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  token: string | null;
  setToken: (v: string | null) => void;
}) {
  const [label, setLabel] = useState("");
  const qc = useQueryClient();
  const generate = useMutation({
    mutationFn: () => createWearDevice({ data: { label: label || t("settings.wearDeviceLabelHint") } }),
    onSuccess: (data) => {
      setToken(data.code);
      qc.invalidateQueries({ queryKey: ["wear_devices"] });
      toast.success(t("settings.wearTokenGenerated"));
    },
  });

  const handleClose = (v: boolean) => {
    onOpenChange(v);
    if (!v) {
      setToken(null);
      setLabel("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t("settings.wearAddDevice")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {token ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("settings.wearTokenWarning")}</p>
              <div className="flex items-center justify-center gap-2 rounded-xl bg-muted p-4">
                <span dir="ltr" className="font-mono text-4xl font-semibold tracking-[0.35em]">
                  {token}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    navigator.clipboard.writeText(token);
                    toast.success(t("settings.wearTokenCopied"));
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (

            <>
              <div className="space-y-2">
                <Label>{t("settings.wearDeviceLabel")}</Label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={t("settings.wearDeviceLabelHint")}
                />
              </div>
              <Button
                className="w-full"
                disabled={!label || generate.isPending}
                onClick={() => generate.mutate()}
              >
                {t("settings.wearGenerateToken")}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
