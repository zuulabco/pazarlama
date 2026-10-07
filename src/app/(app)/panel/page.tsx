import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { getProfile } from "@/modules/profile/repository";
import { appModules } from "@/modules/registry";

export const metadata: Metadata = { title: "Panel" };

async function PanelHeading() {
  const user = await requireUser();
  const profile = await getProfile(user.uid);
  if (!profile) redirect("/onboarding");

  const firstName = user.name?.split(" ")[0];
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {firstName ? `Merhaba ${firstName}` : "Merhaba"}
      </h1>
      <p className="mt-2 max-w-prose text-muted">{profile.businessName} için neyle başlamak istersiniz?</p>
    </>
  );
}

export default function PanelPage() {
  return (
    <>
      <Suspense fallback={<div className="h-16 w-64 rounded-control bg-sunken" />}>
        <PanelHeading />
      </Suspense>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {appModules.map((m) => {
          const ready = m.status === "ready";
          const body = (
            <>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold tracking-tight">{m.name}</h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ready ? "bg-forest text-white" : "bg-sunken text-muted"}`}
                >
                  {ready ? "Kullanılabilir" : "Yakında"}
                </span>
              </div>
              <p className="mt-2 text-muted">{m.description}</p>
            </>
          );
          return (
            <li key={m.id}>
              {ready ? (
                <Link
                  href={m.href}
                  className="block h-full rounded-panel bg-surface p-6 ring-1 ring-line transition-[box-shadow,transform] duration-200 hover:shadow-float hover:ring-line-strong active:scale-[0.99]"
                >
                  {body}
                </Link>
              ) : (
                <div className="h-full rounded-panel bg-sunken/60 p-6 ring-1 ring-line">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
