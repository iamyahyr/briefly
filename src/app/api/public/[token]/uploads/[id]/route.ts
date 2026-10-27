import { resolveToken } from "@/server/dal/access";
import { DomainError } from "@/server/dal/errors";
import { removeFile } from "@/server/dal/questionnaire";
import { errorResponse } from "@/server/http";
import { checkRateLimit } from "@/server/security/rate-limit";

export async function DELETE(
  _request: Request,
  { params }: RouteContext<"/api/public/[token]/uploads/[id]">,
) {
  try {
    const { token, id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new DomainError("not_found");
    if (!(await checkRateLimit("upload", token.slice(0, 12)))) throw new DomainError("rate_limited");
    const brief = await resolveToken(token);
    if (!brief) throw new DomainError("not_found");
    return Response.json(await removeFile(brief, id));
  } catch (error) {
    return errorResponse(error);
  }
}
