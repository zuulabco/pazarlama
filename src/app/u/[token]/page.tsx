import type { Metadata } from "next";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";
import { previewUnsubscribe } from "@/modules/outreach/unsubscribe";
import { confirmUnsubscribe } from "./actions";

export const metadata: Metadata = { title: "Abonelikten çık", robots: { index: false, follow: false } };

async function Content({ params, searchParams }: { params: PageProps<"/u/[token]">["params"]; searchParams: PageProps<"/u/[token]">["searchParams"] }) {
  const { token } = await params;
  const sp = await searchParams;
  const done = sp.tamam === "1";
  const preview = done ? null : await previewUnsubscribe(token).catch(() => null);

  return (
    <div className="grid justify-items-center gap-5 text-center">
      {done ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">Abonelikten çıkarıldınız</h1>
          <p className="max-w-[28rem] text-muted">Bu adrese artık bu göndericiden e-posta gönderilmeyecek. Yanlışlıkla çıktıysanız göndericiye doğrudan yazabilirsiniz.</p>
        </>
      ) : preview ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">Abonelikten çıkmak istiyor musunuz?</h1>
          <p className="max-w-[28rem] text-muted">
            <span className="font-medium text-ink">{preview.email}</span> adresine bu göndericiden e-posta gönderilmesini durduracağız.
          </p>
          <form action={confirmUnsubscribe.bind(null, token)}>
            <Button type="submit" size="lg">
              Evet, abonelikten çık
            </Button>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">Bağlantı geçersiz</h1>
          <p className="max-w-[28rem] text-muted">Bu abonelik bağlantısı geçerli değil ya da süresi dolmuş. Zaten çıkmış olabilirsiniz.</p>
        </>
      )}
    </div>
  );
}

export default function UnsubscribePage(props: PageProps<"/u/[token]">) {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-lg content-center gap-10 px-6 py-16">
      <div className="justify-self-center">
        <Wordmark />
      </div>
      <Suspense fallback={<div className="h-32" aria-hidden="true" />}>
        <Content params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
