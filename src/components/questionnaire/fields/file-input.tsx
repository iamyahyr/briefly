"use client";

import { FileText, Loader2, UploadCloud, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FileField } from "@/templates/types";

export type UploadedFile = {
  id: string;
  fieldKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  hasThumbnail: boolean;
};

type Pending = { key: string; name: string; progress: number };

type Props = {
  id: string;
  token: string;
  field: FileField;
  files: UploadedFile[];
  maxFileMb: number;
  onUploaded: (file: UploadedFile, progress: number) => void;
  onRemoved: (id: string, progress: number) => void;
  onError: (code: string) => void;
};

const ACCEPT: Record<FileField["accept"][number], string> = {
  image: "image/png,image/jpeg,image/webp,image/gif,image/avif",
  svg: "image/svg+xml,.svg",
  pdf: "application/pdf,.pdf",
};

/** Uploads with XMLHttpRequest so we can show real progress on slow mobile connections. */
function upload(url: string, data: FormData, onProgress: (p: number) => void) {
  return new Promise<{ status: number; body: unknown }>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.response });
    xhr.onerror = () => resolve({ status: 0, body: { error: "generic" } });
    xhr.send(data);
  });
}

export function FileInput({ id, token, field, files, maxFileMb, onUploaded, onRemoved, onError }: Props) {
  const t = useTranslations("fields");
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const remaining = field.maxFiles - files.length - pending.length;
  const kinds = field.accept.map((k) => t(`kinds.${k}`)).join(", ");

  async function handleFiles(list: FileList | File[]) {
    const selected = Array.from(list);
    if (selected.length > remaining) onError("too_many_files");
    for (const file of selected.slice(0, Math.max(remaining, 0))) {
      if (file.size > maxFileMb * 1024 * 1024) {
        onError("file_too_large");
        continue;
      }
      const key = `${file.name}-${crypto.randomUUID()}`;
      setPending((p) => [...p, { key, name: file.name, progress: 0 }]);
      const data = new FormData();
      data.set("fieldKey", field.key);
      data.set("file", file);
      const { status, body } = await upload(`/api/public/${token}/uploads`, data, (progress) =>
        setPending((p) => p.map((item) => (item.key === key ? { ...item, progress } : item))),
      );
      setPending((p) => p.filter((item) => item.key !== key));
      const result = body as { upload?: UploadedFile; progress?: number; error?: string } | null;
      if (status === 201 && result?.upload) onUploaded(result.upload, result.progress ?? 0);
      else onError(result?.error ?? "generic");
    }
  }

  async function remove(fileId: string) {
    setRemoving(fileId);
    const response = await fetch(`/api/public/${token}/uploads/${fileId}`, { method: "DELETE" });
    setRemoving(null);
    const body = (await response.json().catch(() => null)) as { progress?: number; error?: string } | null;
    if (response.ok) onRemoved(fileId, body?.progress ?? 0);
    else onError(body?.error ?? "generic");
  }

  return (
    <div className="grid gap-3">
      {remaining > 0 && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/25 px-4 py-8 text-center transition-colors hover:border-primary/60 hover:bg-primary/5",
            dragging && "border-primary bg-primary/5",
          )}
        >
          <UploadCloud className="size-8 text-primary" />
          <p className="text-sm">
            {t.rich("dropFiles", {
              browse: (chunks) => (
                <button
                  id={id}
                  type="button"
                  className="font-medium text-primary underline underline-offset-4"
                  onClick={() => input.current?.click()}
                >
                  {chunks}
                </button>
              ),
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("fileLimits", { types: kinds, max: maxFileMb, count: field.maxFiles })}
          </p>
          <input
            ref={input}
            type="file"
            multiple={field.maxFiles > 1}
            accept={field.accept.map((k) => ACCEPT[k]).join(",")}
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              if (e.target.files) void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {(files.length > 0 || pending.length > 0) && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {files.map((file) => (
            <li key={file.id} className="flex items-center gap-3 rounded-lg border p-2">
              <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
                {file.hasThumbnail || file.mimeType === "image/svg+xml" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/public/${token}/files/${file.id}${file.hasThumbnail ? "?thumb=1" : ""}`}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <FileText className="size-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{file.originalName}</div>
                <div className="text-xs text-muted-foreground">{formatBytes(file.sizeBytes)}</div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`${t("removeFile")}: ${file.originalName}`}
                disabled={removing === file.id}
                onClick={() => remove(file.id)}
              >
                {removing === file.id ? <Loader2 className="animate-spin" /> : <X />}
              </Button>
            </li>
          ))}
          {pending.map((item) => (
            <li key={item.key} className="grid gap-2 rounded-lg border border-dashed p-3">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{item.name}</span>
                <span className="text-xs text-muted-foreground">{t("uploading")}</span>
              </div>
              <Progress value={item.progress} className="h-1" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
