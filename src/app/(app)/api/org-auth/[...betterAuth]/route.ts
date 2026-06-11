import { orgAuth } from "@lib/auth/org";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(orgAuth);
