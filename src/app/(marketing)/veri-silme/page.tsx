import type { Metadata } from "next";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { requestRemoval } from "./actions";

export const metadata: Metadata = {
  title: "Veri silme talebi",
  description: "E-posta adresinizin Adspine kişi havuzundan silinmesini ve bir daha eklenmemesini isteyin.",
  alternates: { canonical: "/veri-silme" },
};

const errors: Record<string, string> = {
  gecersiz: "Geçerli bir e-posta adresi yazın.",
  "cok-fazla": "Çok fazla talep gönderildi. Bir saat sonra tekrar deneyin.",
  sunucu: "Talebiniz şu an işlenemedi. Biraz sonra tekrar deneyin ya da bize yazın.",
};

async function Content({ searchParams }: { searchParams: PageProps<"/veri-silme">["searchParams"] }) {
  const sp = await searchParams;
  const done = sp.tamam === "1";
  const error = typeof sp.hata === "string" ? errors[sp.hata] : undefined;

  return (
    <article className="mx-auto w-full max-w-page px-4 pt-8 pb-20 sm:px-6 sm:pt-12 sm:pb-28">
      <div className="max-w-prose">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Veri silme talebi</h1>
        <p className="mt-4 text-muted">
          Adspine kullanıcıları, herkese açık iş bilgilerinden potansiyel müşteri arar. İş e-posta adresiniz, adınız ve unvanınız bu aramalarda çıkmış ve kişi havuzumuza yazılmış olabilir. Adresinizi
          yazın; havuzdan silelim ve bir daha eklemeyelim.
        </p>

        {done ? (
          <p role="status" className="mt-8 rounded-row bg-forest-soft px-5 py-4">
            Talebiniz alındı. Bu e-posta adresi kişi havuzundan silindi ve bir daha eklenmeyecek. Bir Adspine kullanıcısının kendi listesine kaydettiği kopya için o kullanıcıya ya da bize yazabilirsiniz.
          </p>
        ) : (
          <form action={requestRemoval} className="mt-8 grid gap-3">
            <label className="grid gap-1.5 text-sm font-medium">
              E-posta adresiniz
              <input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="ad.soyad@sirket.com" aria-invalid={error ? true : undefined} className="h-11 rounded-control bg-surface px-3.5 ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest aria-invalid:ring-danger" />
            </label>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <div>
              <Button type="submit">Adresimi sil</Button>
            </div>
          </form>
        )}

        <p className="mt-8 text-sm text-muted">Diğer KVKK taleplerinizi (bilgi alma, düzeltme vb.) gizlilik metnindeki iletişim adresine iletebilirsiniz.</p>
      </div>
    </article>
  );
}

export default function RemovalPage(props: PageProps<"/veri-silme">) {
  return (
    <Suspense>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}
