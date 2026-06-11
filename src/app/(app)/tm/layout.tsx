import { requireAuth } from "@lib/auth/server";
import { PortalShell } from "@/components/shared/portal-shell";

export default async function TeamManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  return (
    <PortalShell portal="tm" user={session.user}>
      {children}
    </PortalShell>
  );
}
