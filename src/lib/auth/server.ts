import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@lib/auth";
import { orgAuth } from "@lib/auth/org";

export async function requireAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session;
}

export async function requireOrgAuth() {
  const session = await orgAuth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login/organizer");
  return session;
}
