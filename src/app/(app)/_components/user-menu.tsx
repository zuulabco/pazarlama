import { requireUser } from "@/lib/auth/session";
import { SignOutButton } from "./sign-out-button";

export async function UserMenu() {
  const user = await requireUser();
  return (
    <div className="flex items-center gap-3">
      <span className="hidden max-w-[16rem] truncate text-sm text-muted sm:block">{user.email}</span>
      <SignOutButton />
    </div>
  );
}
