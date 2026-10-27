import { isBrandLogo, resolveToken } from "@/server/dal/access";
import { getBriefUpload, getWorkspaceUpload } from "@/server/dal/uploads";
import { errorResponse, fileResponse } from "@/server/http";
import { checkRateLimit } from "@/server/security/rate-limit";

const notFound = () => Response.json({ error: "not_found" }, { status: 404 });

/** Files visible to the client through their brief link: their own uploads and the owner's logo. */
export async function GET(request: Request, { params }: RouteContext<"/api/public/[token]/files/[id]">) {
  try {
    const { token, id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return notFound();
    if (!(await checkRateLimit("view", token.slice(0, 12)))) {
      return Response.json({ error: "rate_limited" }, { status: 429 });
    }
    const brief = await resolveToken(token);
    if (!brief) return notFound();

    const upload = (await isBrandLogo(brief, id))
      ? await getWorkspaceUpload(brief.ownerId, id)
      : await getBriefUpload(brief.id, id);
    return fileResponse(upload, { thumbnail: new URL(request.url).searchParams.has("thumb") });
  } catch (error) {
    return errorResponse(error);
  }
}
