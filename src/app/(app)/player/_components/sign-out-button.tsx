"use client";

import { signOut } from "@lib/auth/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }
  return (
    <Button
      variant="ghost"
      onClick={handleSignOut}
      className="w-full justify-start gap-3 rounded-none px-4 py-3 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
    >
      <LogOut className="h-4 w-4" />
      Sign Out
    </Button>
  );
}
