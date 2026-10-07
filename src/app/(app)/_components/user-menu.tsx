import { requireUser } from "@/lib/auth/session";
import { ProfileMenu } from "./profile-menu";

export async function UserMenu() {
  const user = await requireUser();
  return <ProfileMenu name={user.name ?? null} email={user.email ?? null} />;
}
