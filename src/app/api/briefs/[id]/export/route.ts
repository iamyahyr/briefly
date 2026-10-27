import { ZipArchive } from "archiver";
import { PassThrough, Readable } from "node:stream";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { getFormatLabels } from "@/components/app/answer-view";
import { getBriefDetail, getBriefFileKeys } from "@/server/dal/briefs";
import { env } from "@/server/env";
import {
  toJson,
  toMarkdown,
  zipFilePaths,
  type ExportInput,
  type ExportStrings,
} from "@/server/export/build";
import { contentDisposition, errorResponse } from "@/server/http";
import { getSessionUser } from "@/server/session";
import { storage } from "@/server/storage";

function slug(text: string) {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "brief"
  );
}

export async function GET(request: Request, { params }: RouteContext<"/api/briefs/[id]/export">) {
  try {
    const user = await getSessionUser();
    if (!user) return Response.json({ error: "not_found" }, { status: 404 });
    const { id } = await params;
    const format = new URL(request.url).searchParams.get("format") ?? "md";
    if (!["md", "json", "zip"].includes(format))
      return Response.json({ error: "invalid_input" }, { status: 400 });

    const detail = await getBriefDetail(user.id, id);
    const input: ExportInput = {
      brief: detail.brief,
      template: detail.brief.templateSnapshot,
      client: { name: detail.client.name, email: detail.client.email, phone: detail.client.phone },
      answers: detail.answers,
      files: detail.uploads,
    };

    const [locale, labels, tExport, tBriefs, tStatus, formatter] = await Promise.all([
      getLocale(),
      getFormatLabels(),
      getTranslations("export"),
      getTranslations("briefs"),
      getTranslations("status"),
      getFormatter(),
    ]);
    const strings: ExportStrings = {
      labels,
      client: tExport("client"),
      status: tExport("status"),
      statusValue: tStatus(detail.brief.status),
      submitted: tExport("submitted"),
      files: tExport("files"),
      noAnswer: tBriefs("noAnswer"),
      generatedWith: tExport("generatedWith"),
      formatDate: (date) => formatter.dateTime(date, { dateStyle: "long", timeStyle: "short" }),
    };
    const name = slug(`${detail.client.name}-${detail.brief.title}`);

    if (format === "json") {
      return new Response(JSON.stringify(toJson(input, locale, labels), null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": contentDisposition("attachment", `${name}.json`),
        },
      });
    }

    if (format === "md") {
      const base = env().APP_URL.replace(/\/$/, "");
      const markdown = toMarkdown(input, locale, strings, (file) => `${base}/api/files/${file.id}`);
      return new Response(markdown, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": contentDisposition("attachment", `${name}.md`),
        },
      });
    }

    // ZIP: answers in both formats plus every uploaded file, streamed.
    const paths = zipFilePaths(input.files);
    const keys = await getBriefFileKeys(user.id, id);
    const archive = new ZipArchive({ zlib: { level: 6 } });
    const output = new PassThrough();
    archive.on("error", (error: Error) => output.destroy(error));
    archive.pipe(output);
    archive.append(
      toMarkdown(input, locale, strings, (file) => paths.get(file.id)!),
      { name: "brief.md" },
    );
    archive.append(JSON.stringify(toJson(input, locale, labels), null, 2), { name: "brief.json" });

    (async () => {
      for (const file of input.files) {
        const key = keys.get(file.id);
        if (!key) continue;
        archive.append(await storage().get(key), { name: paths.get(file.id)! });
      }
      await archive.finalize();
    })().catch((error) => {
      archive.abort();
      output.destroy(error);
    });

    return new Response(Readable.toWeb(output) as ReadableStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": contentDisposition("attachment", `${name}.zip`),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
