import { getOwnedUpload } from "@/server/dal/uploads";
import { errorResponse, fileResponse } from "@/server/http";
import { getSessionUser } from "@/server/session";

/** Files for the signed-in owner. Anyone else gets a 404. */
export async function GET(request: Request, { params }: RouteContext<"/api/files/[id]">) {
  try {
    const user = await getSessionUser();
    if (!user) return Response.json({ error: "not_found" }, { status: 404 });
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "not_found" }, { status: 404 });
    const upload = await getOwnedUpload(user.id, id);
    const url = new URL(request.url);
    return fileResponse(upload, {
      thumbnail: url.searchParams.has("thumb"),
      download: url.searchParams.has("download"),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
