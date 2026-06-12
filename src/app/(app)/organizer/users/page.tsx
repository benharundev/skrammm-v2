import { requireOrgAuth } from "@lib/auth/server";
import { PageHeader } from "@/app/(app)/organizer/_components/page-header";
import { UserSetupForm } from "./_components/user-setup-form";

export default async function UsersPage() {
  await requireOrgAuth();
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="Add User"
        sub="Create accounts and relay OTP codes while SES is in sandbox mode"
      />
      <div className="flex-1 overflow-y-auto p-6">
        <UserSetupForm />
      </div>
    </div>
  );
}
