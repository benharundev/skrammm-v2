import { requireAuth } from "@lib/auth/server";
import { PortalShell } from "@/components/shared/portal-shell";

export default async function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  return (
    <PortalShell portal="player" user={session.user}>
      {children}
    </PortalShell>
  );
}
