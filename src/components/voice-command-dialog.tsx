import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { t, useLocale } from "@/lib/i18n";
import { processVoiceCommand } from "@/lib/voice.functions";
import { createTask } from "@/lib/tasks.functions";
import { createJournalEntry } from "@/lib/journal.functions";

type Phase = "idle" | "recording" | "processing";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.readAsDataURL(blob);
  });
}

export function VoiceCommandDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const locale = useLocale();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState<string>("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) {
      // cleanup
      try {
        recorderRef.current?.state === "recording" && recorderRef.current.stop();
      } catch {
        /* ignore */
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      recorderRef.current = null;
      chunksRef.current = [];
      setPhase("idle");
      setTranscript("");
    }
  }, [open]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (blob.size < 1200) {
          toast.error(locale === "he" ? "לא נקלט קול" : "No audio captured");
          setPhase("idle");
          return;
        }
        await handleAudio(blob, type);
      };
      recorder.start();
      recorderRef.current = recorder;
      setPhase("recording");
    } catch (err) {
      console.error(err);
      toast.error(
        locale === "he" ? "לא ניתן לגשת למיקרופון" : "Microphone access denied",
      );
    }
  };

  const stopRecording = () => {
    try {
      recorderRef.current?.stop();
    } catch {
      /* ignore */
    }
    setPhase("processing");
  };

  const handleAudio = async (blob: Blob, mimeType: string) => {
    try {
      const audioBase64 = await blobToBase64(blob);
      const result = await processVoiceCommand({
        data: { audioBase64, mimeType, locale },
      });
      setTranscript(result.transcript);
      await runAction(result);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : t("action.failed"));
      setPhase("idle");
    }
  };

  const runAction = async (result: { transcript: string; action: any }) => {
    const action = result.action;
    if (action.type === "task") {
      await createTask({
        data: {
          title: action.title,
          priority: action.priority ?? "medium",
          due_date: action.due_date ?? null,
          description: action.description ?? null,
          tags: [],
        } as any,
      });
      qc.invalidateQueries();
      toast.success(t("quick.taskAdded"));
      onOpenChange(false);
      navigate({ to: "/tasks" });
      return;
    }
    if (action.type === "journal") {
      const today = new Date().toISOString().slice(0, 10);
      await createJournalEntry({
        data: {
          entry_date: today,
          title: action.title ?? null,
          body: action.body,
          tags: [],
          image_urls: [],
        } as any,
      });
      qc.invalidateQueries();
      toast.success(t("journal.saved"));
      onOpenChange(false);
      navigate({ to: "/journal" });
      return;
    }
    if (action.type === "search_archive") {
      onOpenChange(false);
      navigate({ to: "/archive", search: { q: action.query } as any });
      return;
    }
    toast.error(
      locale === "he"
        ? "לא הבנתי את הבקשה. נסה שוב."
        : "I didn't understand. Please try again.",
    );
    setPhase("idle");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {locale === "he" ? "עוזר קולי" : "Voice assistant"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 py-6">
          <p className="text-center text-sm text-muted-foreground">
            {locale === "he"
              ? "דבר בטבעיות: בקש להוסיף משימה, לכתוב ביומן או לחפש בארכיון."
              : "Speak naturally: add a task, write a journal entry, or search the archive."}
          </p>

          <div
            className={
              "grid h-24 w-24 place-items-center rounded-full " +
              (phase === "recording"
                ? "animate-pulse bg-primary/15 text-primary"
                : "bg-secondary text-primary")
            }
          >
            {phase === "processing" ? (
              <Loader2 className="h-10 w-10 animate-spin" />
            ) : phase === "recording" ? (
              <Mic className="h-10 w-10" />
            ) : (
              <Mic className="h-10 w-10" />
            )}
          </div>

          {phase === "idle" && (
            <Button size="lg" onClick={startRecording} className="gap-2">
              <Mic className="h-4 w-4" />
              {locale === "he" ? "התחל להקליט" : "Start recording"}
            </Button>
          )}
          {phase === "recording" && (
            <Button size="lg" variant="secondary" onClick={stopRecording} className="gap-2">
              <Square className="h-4 w-4" />
              {locale === "he" ? "סיים ושלח" : "Stop & send"}
            </Button>
          )}
          {phase === "processing" && (
            <p className="text-sm text-muted-foreground">
              {locale === "he" ? "מעבד…" : "Processing…"}
            </p>
          )}

          {transcript && (
            <p className="w-full rounded-lg bg-muted p-3 text-center text-sm">
              "{transcript}"
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
