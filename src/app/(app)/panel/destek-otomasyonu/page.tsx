import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { benefits, exampleMessage as ex, faq, journey } from "@/modules/support/guide";
import { SetupWizard } from "./_components/setup-wizard";

import { SectionTabs } from "../../_components/section-tabs";

export const metadata: Metadata = { title: "Çok dilli müşteri desteği" };

export default function SupportAutomationPage() {
  return (
    <>
    <SectionTabs title="Destek otomasyonu" />
    <div className="grid gap-20">
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        <div>
          <p className="text-sm font-medium text-accent">Destek otomasyonu</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl lg:text-display lg:tracking-display">
            Müşteriniz hangi dilde yazarsa yazsın, anlayın ve anında yanıtlayın
          </h1>
          <p className="mt-5 max-w-prose text-muted">
            WhatsApp ve e-postadan gelen mesajlar otomatik çevrilir, özetlenir ve öncelik etiketi alır. Ekibiniz haberdar olur, her şey tabloya kaydedilir, müşteri de kendi dilinde profesyonel bir karşılama yanıtı görür.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="#kurulum" size="lg">
              Kuruluma başla
            </ButtonLink>
            <ButtonLink href="#nasil" size="lg" variant="secondary">
              Nasıl çalışır?
            </ButtonLink>
          </div>
        </div>

        <figure className="grid gap-3" aria-label="Örnek bir mesajın otomasyondan geçişi">
          <div className="rounded-row bg-sunken px-4 py-3 text-sm">
            <p className="text-xs font-medium text-muted">Müşteri yazar · {ex.language}</p>
            <p className="mt-1">{ex.original}</p>
          </div>
          <div className="rounded-row bg-surface p-4 shadow-float ring-1 ring-line">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-muted">Ekibinize ulaşan</p>
              <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-semibold text-danger">Öncelik: {ex.priority}</span>
            </div>
            <p className="mt-2 font-medium">{ex.translated}</p>
            <p className="mt-2 text-sm text-muted">Özet: {ex.summary}</p>
          </div>
          <div className="justify-self-end rounded-row bg-forest px-4 py-3 text-sm text-white">
            <p className="text-xs font-medium text-white/70">Müşteri anında alır · {ex.language}</p>
            <p className="mt-1">{ex.reply}</p>
          </div>
        </figure>
      </section>

      <section aria-labelledby="neden">
        <h2 id="neden" className="text-xl font-semibold tracking-tight sm:text-2xl">
          Yurt dışından ve farklı dillerden müşteri alıyorsanız
        </h2>
        <ul className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <li key={b.title}>
              <h3 className="font-semibold">{b.title}</h3>
              <p className="mt-1.5 text-muted">{b.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="nasil" aria-labelledby="nasil-baslik" className="scroll-mt-8">
        <h2 id="nasil-baslik" className="text-xl font-semibold tracking-tight sm:text-2xl">
          Bir mesajın yolculuğu
        </h2>
        <ol className="mt-8 grid gap-px overflow-hidden rounded-panel bg-line ring-1 ring-line sm:grid-cols-2 lg:grid-cols-5">
          {journey.map((s, i) => (
            <li key={s.title} className="bg-surface p-5">
              <span className="grid size-7 place-items-center rounded-full bg-forest-soft text-xs font-semibold text-accent">{i + 1}</span>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-5 max-w-prose text-sm text-muted">
          Otomasyon n8n adlı araçta, sizin hesabınızda çalışır. Adspine sizin için doğru ayarlanmış hazır dosyayı üretir ve her adımda yol gösterir; kod yazmanız gerekmez.
        </p>
      </section>

      <section id="kurulum" aria-labelledby="kurulum-baslik" className="scroll-mt-8">
        <h2 id="kurulum-baslik" className="text-xl font-semibold tracking-tight sm:text-2xl">
          Kurulum
        </h2>
        <p className="mt-2 mb-6 max-w-prose text-muted">Dört kısa adım: seçimleriniz, hesaplar, dosyayı yükleme ve deneme.</p>
        <SetupWizard />
      </section>

      <section aria-labelledby="sss-baslik">
        <h2 id="sss-baslik" className="text-xl font-semibold tracking-tight sm:text-2xl">
          Sık sorulan sorular
        </h2>
        <div className="mt-6 divide-y divide-line border-y border-line">
          {faq.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-medium [&::-webkit-details-marker]:hidden">
                {f.q}
                <span aria-hidden="true" className="text-muted transition-transform duration-200 group-open:rotate-45">+</span>
              </summary>
              <p className="max-w-prose pb-5 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
    </>
  );
}
