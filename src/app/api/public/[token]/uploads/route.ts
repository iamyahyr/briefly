import { resolveToken } from "@/server/dal/access";
import { DomainError } from "@/server/dal/errors";
import { uploadFile } from "@/server/dal/questionnaire";
import { env } from "@/server/env";
import { errorResponse } from "@/server/http";
import { checkRateLimit } from "@/server/security/rate-limit";

/** Upload one file to a file field of the brief. Body: multipart with `fieldKey` and `file`. */
export async function POST(request: Request, { params }: RouteContext<"/api/public/[token]/uploads">) {
  try {
    const { token } = await params;
    if (!(await checkRateLimit("upload", token.slice(0, 12)))) throw new DomainError("rate_limited");

    // Reject oversized bodies before buffering them.
    const maxBytes = env().UPLOAD_MAX_FILE_MB * 1024 * 1024;
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > maxBytes + 64 * 1024) throw new DomainError("file_too_large");

    const brief = await resolveToken(token);
    if (!brief) throw new DomainError("not_found");

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    const fieldKey = form?.get("fieldKey");
    if (!(file instanceof File) || typeof fieldKey !== "string") throw new DomainError("invalid_input");
    if (file.size > maxBytes) throw new DomainError("file_too_large");

    const result = await uploadFile(brief, fieldKey, {
      name: file.name,
      buffer: Buffer.from(await file.arrayBuffer()),
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
