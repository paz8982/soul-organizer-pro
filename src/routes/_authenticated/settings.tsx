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
import { LogOut, Download, Moon } from "lucide-react";

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
      toast.success("Profile saved");
    },
  });

  const handleExport = async () => {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `life-os-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
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
      <PageHeader title="Settings" description="Preferences and account." />

      <div className="space-y-4">
        <Card className="p-6">
          <h2 className="mb-4 font-display text-xl">Account</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={data.email ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>Save</Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-xl">Appearance</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Dark mode</p>
                <p className="text-xs text-muted-foreground">Soft plum darkness.</p>
              </div>
            </div>
            <Switch checked={dark} onCheckedChange={applyTheme} />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-xl">Data</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Export everything</p>
                <p className="text-xs text-muted-foreground">Download all your data as a JSON file.</p>
              </div>
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-1.5 h-4 w-4" /> Export
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Automated cloud backup coming soon.</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sign out</p>
              <p className="text-xs text-muted-foreground">You'll need to sign back in.</p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-1.5 h-4 w-4" /> Sign out
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
