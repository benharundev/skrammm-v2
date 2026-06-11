import { requireOrgAuth } from "@lib/auth/server";
import { PortalShell } from "@/components/shared/portal-shell";

export default async function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireOrgAuth();
  return (
    <PortalShell portal="organizer" user={session.user}>
      {children}
    </PortalShell>
  );
}
