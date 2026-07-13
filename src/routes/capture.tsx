import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

// Public share-target landing route. Preserves query params through auth,
// then forwards to the authenticated Save-to-Archive form.
export const Route = createFileRoute("/capture")({
  validateSearch: z.object({
    title: z.string().optional(),
    text: z.string().optional(),
    url: z.string().optional(),
  }),
  component: CapturePage,
});

function CapturePage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/capture" });

  useEffect(() => {
    const forward = async () => {
      const { data } = await supabase.auth.getUser();
      const params = new URLSearchParams();
      if (search.title) params.set("title", search.title);
      if (search.text) params.set("text", search.text);
      if (search.url) params.set("url", search.url);
      const target = `/archive/new?${params.toString()}`;
      if (!data.user) {
        navigate({ to: "/auth", search: { next: target }, replace: true });
      } else {
        navigate({ to: "/archive/new", search: Object.fromEntries(params) as any, replace: true });
      }
    };
    void forward();
  }, [navigate, search]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Opening capture…</p>
    </div>
  );
}
