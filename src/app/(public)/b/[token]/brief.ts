import "server-only";
import { cache } from "react";
import { resolveToken } from "@/server/dal/access";

/** Token lookup shared by the layout and the page within one request. */
export const getPublicBrief = cache(resolveToken);
