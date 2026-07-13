import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getArchiveItem, updateArchiveItem, deleteArchiveItem, getSignedFileUrl } from "@/lib/archive.functions";
import { PageHeader } from "@/components/page-primitives";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/tag-input";
import { ArrowLeft, Trash2, ExternalLink, Download } from "lucide-react";
import { toast } from "sonner";

const itemQuery = (id: string) =>
  queryOptions({
    queryKey: ["archive", id],
    queryFn: () => getArchiveItem({ data: { id } }),
  });

export const Route = createFileRoute("/_authenticated/archive/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(itemQuery(params.id)),
  component: ArchiveDetail,
});

function ArchiveDetail() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(itemQuery(id));
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [title, setTitle] = useState(data.title);
  const [description, setDescription] = useState(data.description ?? "");
  const [notes, setNotes] = useState(data.notes ?? "");
  const [tags, setTags] = useState<string[]>(data.tags ?? []);

  useEffect(() => {
    setTitle(data.title);
    setDescription(data.description ?? "");
    setNotes(data.notes ?? "");
    setTags(data.tags ?? []);
  }, [data]);

  const { data: signed } = useQuery({
    queryKey: ["archive-file", data.file_path],
    queryFn: () => getSignedFileUrl({ data: { path: data.file_path } }),
    enabled: !!data.file_path,
  });

  const saveMut = useMutation({
    mutationFn: () =>
      updateArchiveItem({
        data: { id, patch: { title, description: description || null, notes: notes || null, tags } as any },
      }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Saved");
    },
  });

  const delMut = useMutation({
    mutationFn: () => deleteArchiveItem({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Deleted");
      navigate({ to: "/archive" });
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/archive" })} className="mb-3 -ml-2">
        <ArrowLeft className="mr-1 h-4 w-4" /> Archive
      </Button>
      <PageHeader
        title={title}
        description={data.item_type.toUpperCase()}
        action={
          <Button variant="ghost" size="icon" onClick={() => confirm("Delete this item?") && delMut.mutate()}>
            <Trash2 className="h-4 w-4" />
          </Button>
        }
      />

      {/* Preview */}
      {data.url && (
        <Card className="mb-4 p-4">
          <a href={data.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
            <ExternalLink className="h-4 w-4" /> {data.url}
          </a>
        </Card>
      )}
      {signed?.url && data.file_mime?.startsWith("image/") && (
        <Card className="mb-4 overflow-hidden">
          <img src={signed.url} alt={data.title} className="max-h-[500px] w-full object-contain" />
        </Card>
      )}
      {signed?.url && data.file_mime === "application/pdf" && (
        <Card className="mb-4 overflow-hidden">
          <embed src={signed.url} type="application/pdf" className="h-[600px] w-full" />
        </Card>
      )}
      {signed?.url && !data.file_mime?.startsWith("image/") && data.file_mime !== "application/pdf" && (
        <Card className="mb-4 p-4">
          <a href={signed.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <Download className="h-4 w-4" /> Download file
          </a>
        </Card>
      )}

      <Card className="space-y-5 p-6">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} />
        </div>
        <div className="space-y-2">
          <Label>Tags</Label>
          <TagInput value={tags} onChange={setTags} />
        </div>
        <div className="flex justify-end">
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>Save changes</Button>
        </div>
      </Card>
    </div>
  );
}
