import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CheckSquare,
  BookHeart,
  Archive,
  Sparkles,
  Settings,
  Search,
  Plus,
  LogOut,
  Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/global-search";
import { QuickAddDialog } from "@/components/quick-add-dialog";
import { VoiceCommandDialog } from "@/components/voice-command-dialog";
import { t } from "@/lib/i18n";
import { LanguageToggle } from "@/components/language-toggle";

type NavItem = { to: string; labelKey: string; icon: typeof LayoutDashboard };

const NAV: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/tasks", labelKey: "nav.tasks", icon: CheckSquare },
  { to: "/journal", labelKey: "nav.journal", icon: BookHeart },
  { to: "/archive", labelKey: "nav.archive", icon: Archive },
  { to: "/learn", labelKey: "nav.learn", icon: Sparkles },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.invalidate();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-l bg-sidebar px-4 py-6 md:flex">
        <Link to="/dashboard" className="mb-8 flex items-center gap-2 px-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <span className="font-display text-xl">מ</span>
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-lg leading-none">{t("app.name")}</p>
            <p className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">אישי</p>
          </div>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>

        <Button variant="ghost" size="sm" onClick={handleSignOut} className="justify-start">
          <LogOut className="ms-2 h-4 w-4" /> {t("nav.signOut")}
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/80 px-4 py-3 backdrop-blur md:px-8">
          <Link to="/dashboard" className="ms-2 flex items-center gap-2 md:hidden">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <span className="font-display text-base">מ</span>
            </div>
          </Link>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex flex-1 items-center gap-2 rounded-full border bg-card px-4 py-2 text-start text-sm text-muted-foreground shadow-sm transition-colors hover:bg-muted"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">{t("label.searchAll")}</span>
            <kbd className="ms-auto hidden rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">
              ⌘K
            </kbd>
          </button>
          <Button onClick={() => setQuickOpen(true)} size="sm" className="gap-1.5 shrink-0">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">{t("action.add")}</span>
          </Button>
          <LanguageToggle className="shrink-0" />
        </header>

        <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-8">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/95 backdrop-blur md:hidden">
          {NAV.filter((n) => n.to !== "/learn").map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <QuickAddDialog open={quickOpen} onOpenChange={setQuickOpen} />
    </div>
  );
}
