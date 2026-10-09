import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { AdspineAiIcon, BoltIcon, CheckIcon, InboxIcon } from "@/components/ui/icons";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { planList } from "@/modules/outreach/plans";
import styles from "./landing.module.css";
import { AutomationMock, ChatMock, DashboardMock, InboxMock, LeadsMock, ReportMock } from "./mocks";

type SectionProps = { id?: string; children: ReactNode; className?: string; padding?: string };

function Section({ id, children, className = "", padding = "py-20 sm:py-32" }: SectionProps) {
  return (
    <section id={id} className={`mx-auto w-full max-w-page scroll-mt-24 px-4 sm:px-6 ${padding} ${className}`}>
      {children}
    </section>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-sm font-semibold tracking-wide text-accent uppercase">{children}</p>;
}

function Heading({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div className="max-w-[40rem]">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      <p className="mt-5 text-lg text-muted">{children}</p>
    </div>
  );
}

function Points({ items }: { items: string[] }) {
  return (
    <ul className="mt-8 grid gap-3">
      {items.map((t) => (
        <li key={t} className="flex gap-3 text-[0.975rem]">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-forest-soft text-accent">
            <CheckIcon size={12} />
          </span>
          {t}
        </li>
      ))}
    </ul>
  );
}

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Arka plan: yumuşak mavi ışıma ve ince nokta ızgarası */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className={`${styles.glow} absolute -top-40 left-1/2 h-[34rem] w-[60rem] -translate-x-1/2 rounded-full bg-forest/15 blur-3xl`} />
        <div
          className={`${styles.drift} absolute inset-0 opacity-60 [mask-image:radial-gradient(60%_50%_at_50%_0%,black,transparent)]`}
          style={{ backgroundImage: "radial-gradient(var(--color-line-strong) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />
      </div>

      <div className="mx-auto grid w-full max-w-page grid-cols-[minmax(0,1fr)] items-center gap-14 px-4 pt-12 pb-20 sm:px-6 sm:pt-20 sm:pb-32 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div>
          <ScrollReveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-surface/70 px-3.5 py-1.5 text-sm text-muted ring-1 ring-line backdrop-blur">
              <span className="relative grid size-2 place-items-center text-forest">
                <span className={`${styles.ping} relative block size-2 rounded-full bg-forest`} />
              </span>
              Bul, ulaş, sonucu izle: tek panelde
            </span>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <h1 className="mt-7 max-w-[15ch] text-display font-semibold tracking-display">Doğru kişiyi bulun, kendi adresinizden ulaşın.</h1>
          </ScrollReveal>
          <ScrollReveal delay={160}>
            <p className="mt-7 max-w-[34rem] text-lg text-muted">
              Adspine karar vericileri bulur, Adspine AI ile yazdığınız e-postaları sizin adresinizden otomatik gönderir, yanıtları tek kutuda toplar ve sonucu raporlar.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={240} className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/kayit" size="lg">
              Ücretsiz başla
            </ButtonLink>
            <ButtonLink href="#bul" size="lg" variant="secondary">
              Nasıl çalışır
            </ButtonLink>
          </ScrollReveal>
          <ScrollReveal delay={320}>
            <p className="mt-6 text-sm text-muted">Google ile tek tıkla gönderici adresi bağlama</p>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={200} className="relative">
          <div className={styles.floatSlow}>
            <DashboardMock />
          </div>
          <div className={`${styles.float} absolute -top-5 -right-2 hidden items-center gap-2 rounded-row bg-surface/90 px-3.5 py-2.5 text-sm font-medium shadow-float ring-1 ring-line backdrop-blur sm:flex lg:-right-6`}>
            <span className="grid size-6 place-items-center rounded-full bg-forest-soft text-accent">
              <InboxIcon size={14} />
            </span>
            Yeni yanıt: “Fiyat alabilir miyiz?”
          </div>
          <div className={`${styles.floatSlow} absolute -bottom-5 -left-2 hidden items-center gap-2 rounded-row bg-surface/90 px-3.5 py-2.5 text-sm font-medium shadow-float ring-1 ring-line backdrop-blur sm:flex lg:-left-8`}>
            <span className="grid size-6 place-items-center rounded-full bg-forest-soft text-accent">
              <AdspineAiIcon size={16} />
            </span>
            Adspine AI ilk e-postayı yazdı
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

const principles = [
  ["Kendi adresinizden", "E-postalar sizin gönderici adresinizden gider; itibar sizde kalır."],
  ["Isındırma dahil", "Yeni adresler havuzda doğal e-postalarla ısınır, limit kademeli artar."],
  ["Yasalara uygun", "Her e-postada kolay çıkış: \"İPTAL\" yazan alıcı otomatik kara listeye alınır."],
  ["Adspine AI", "Metni yazar, sonuçları yorumlar, sorularınızı verilerinize bakarak yanıtlar."],
];

export function Principles() {
  return (
    <Section padding="pb-4 sm:pb-8">
      <ul className="grid gap-px overflow-hidden rounded-panel bg-line ring-1 ring-line sm:grid-cols-2 lg:grid-cols-4">
        {principles.map(([t, s], i) => (
          <ScrollReveal as="li" key={t} delay={i * 80} className="bg-surface p-6">
            <h3 className="font-semibold tracking-tight">{t}</h3>
            <p className="mt-2 text-sm text-muted">{s}</p>
          </ScrollReveal>
        ))}
      </ul>
    </Section>
  );
}

export function Find() {
  return (
    <Section id="bul">
      <ScrollReveal>
        <Heading eyebrow="Bul" title="Hedef kitlenizi dakikalar içinde çıkarın">
          Karar vericileri unvana, sektöre ve konuma göre bulun. Seçtiklerinizi kaydedin, iş e-postalarıyla birlikte otomasyonunuza ekleyin.
        </Heading>
      </ScrollReveal>
      <div className="mt-14 grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <ScrollReveal>
          <LeadsMock />
        </ScrollReveal>
        <ScrollReveal delay={120}>
          <h3 className="text-lg font-semibold tracking-tight">Müşteri bul</h3>
          <p className="mt-2 text-muted">Unvan, sektör, şehir ve şirket büyüklüğüne göre filtreleyin ya da ne aradığınızı Adspine AI&apos;a yazın. Listelemek serbest; yalnızca gizli bilgilerini açıp eklediğiniz kişiler için Kredi harcanır.</p>
          <Points items={["Aynı şirketten tek kişi, zaten kayıtlı olanları atla", "İş e-postaları doğrulanır", "Aramalarınızı kaydedip tekrar kullanın"]} />
        </ScrollReveal>
      </div>
    </Section>
  );
}

export function Reach() {
  return (
    <Section id="ulas" className="grid gap-20">
      <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <ScrollReveal>
          <Heading eyebrow="Ulaş · Otomasyon" title="Adımları kurun, e-postalar kendiliğinden gitsin">
            Adspine AI ile birkaç adımlık bir e-posta dizisi yazdırın; bekleme sürelerini ve gönderim saatlerini belirleyin. Yanıt gelen kişiye dizi otomatik durur.
          </Heading>
          <Points items={["Adımları sürükleyerek sıralayın", "Her kişiye kişisel açılış cümlesi", "Gönderim saatleri ve günlük limit sizde", "Ofis dışı yanıtında bekler, abonelikten çıkana bir daha yazmaz"]} />
        </ScrollReveal>
        <ScrollReveal delay={120}>
          <AutomationMock />
        </ScrollReveal>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <ScrollReveal className="order-2 lg:order-1">
          <InboxMock />
        </ScrollReveal>
        <ScrollReveal delay={120} className="order-1 lg:order-2">
          <Heading eyebrow="Ulaş · Gelen kutusu" title="Tüm yanıtlar tek yerde, kendiliğinden etiketli">
            Yanıtlar ilgili, toplantı, ofis dışı gibi etiketlerle ayrılır. Konuşmayı görür, durumu değiştirir ve buradan cevap yazarsınız.
          </Heading>
          <Points items={["Okunmamışlar öne çıkar", "Cevap aynı konuşma zincirinde gider", "Isındırma ile e-postalarınız spam’e daha az düşer"]} />
        </ScrollReveal>
      </div>
    </Section>
  );
}

export function AiSection() {
  return (
    <Section id="adspine-ai" className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
      <ScrollReveal>
        <Heading eyebrow="Adspine AI" title="Yazan, yorumlayan ve yönlendiren yardımcı">
          E-posta ve mesajları işletmenize göre yazar. Sağdaki panelden kampanyalarınızı sorarsınız; yalnızca kendi rakamlarınıza bakar, olmayan veriyi uydurmaz ve sizi doğru sayfaya götürür.
        </Heading>
        <Points items={["“Hangi gönderici adresim sorunlu?” gibi sorulara rakamla yanıt", "Tek seferlik mesajı kişiye ya da firmaya özel hazırlar", "Her metin düzenlenebilir; göndermeden önce siz karar verirsiniz"]} />
      </ScrollReveal>
      <ScrollReveal delay={120} className="grid gap-5">
        <ChatMock />
        <ReportMock />
      </ScrollReveal>
    </Section>
  );
}

const featureList = [
  { icon: <BoltIcon size={20} />, t: "Otomasyon", s: "Çok adımlı e-posta dizileri" },
  { icon: <InboxIcon size={20} />, t: "Gelen kutusu", s: "Yanıtlar, etiketler, cevap" },
  { icon: <AdspineAiIcon size={24} />, t: "Adspine AI", s: "Yazım, yorum, yönlendirme" },
];

export function Features() {
  return (
    <Section padding="pb-20 sm:pb-32">
      <ul className="grid gap-4 sm:grid-cols-3">
        {featureList.map((f, i) => (
          <ScrollReveal as="li" key={f.t} delay={i * 90} className="flex items-center gap-4 rounded-panel bg-surface p-5 ring-1 ring-line">
            <span className="grid size-11 shrink-0 place-items-center rounded-control bg-forest-soft text-accent">{f.icon}</span>
            <div>
              <p className="font-semibold tracking-tight">{f.t}</p>
              <p className="text-sm text-muted">{f.s}</p>
            </div>
          </ScrollReveal>
        ))}
      </ul>
    </Section>
  );
}

function PlanFeature({ text, on = true, strong = false }: { text: string; on?: boolean; strong?: boolean }) {
  return (
    <li className={`flex items-start gap-2.5 ${on ? "" : "text-muted/80"}`}>
      <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full ${on ? (strong ? "bg-forest text-white" : "bg-forest-soft text-accent") : "bg-sunken text-muted"}`}>
        {on ? (
          <CheckIcon size={11} />
        ) : (
          <svg viewBox="0 0 12 12" width="8" height="8" aria-hidden="true">
            <path d="m2.5 2.5 7 7m0-7-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        )}
      </span>
      <span className={on ? "" : "line-through decoration-muted/60"}>
        {text}
        {!on && <span className="sr-only"> (bu planda yok)</span>}
      </span>
    </li>
  );
}

const planBlurb: Record<string, string> = {
  ucretsiz: "Denemek ve ilk kampanyanızı kurmak için.",
  baslangic: "Tek başına çalışan ya da yeni başlayan ekipler için.",
  buyume: "Düzenli ve yüksek hacimli gönderim yapan ekipler için.",
  ajans: "Birden çok müşteri ve markayı yöneten ajanslar için.",
};

export function Pricing() {
  const num = (n: number) => new Intl.NumberFormat("tr-TR").format(n);
  const free = planList.find((p) => p.key === "ucretsiz")!;
  const paid = planList.filter((p) => p.key !== "ucretsiz");
  const features = (p: (typeof planList)[number]) => [
    { text: `${p.senders} gönderici adresi`, on: true },
    { text: `Ayda ${num(p.monthlyCredits)} Kredi`, on: true },
    { text: `${p.campaigns} otomasyon`, on: true },
    { text: "Isındırma ve gelen kutusu", on: p.warmupAndInbox },
    { text: "Adspine AI", on: p.ai },
  ];
  return (
    <Section id="planlar">
      <ScrollReveal>
        <div className="mx-auto max-w-[40rem] text-center">
          <Eyebrow>Planlar</Eyebrow>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Gönderici adresi sayınıza göre büyür</h2>
          <p className="mt-5 text-lg text-muted">Plan ölçüsü, bağlayabildiğiniz gönderici adresi sayısıdır; gönderim hacminiz buna göre belirlenir. Ücretsiz başlayın, ihtiyacınız arttıkça yükseltin.</p>
        </div>
      </ScrollReveal>

      <ul className={`${styles.plans} mt-16`}>
        {paid.map((p, i) => {
          const featured = p.key === "buyume";
          return (
            <ScrollReveal as="li" key={p.key} delay={i * 90} className={featured ? styles.planSlotFeatured : styles.planSlot}>
              <div data-featured={featured} className={`${styles.plan} relative grid content-start gap-6 rounded-panel p-7 ring-1 ${featured ? "bg-gradient-to-b from-forest-soft/70 to-surface ring-forest/30" : "bg-surface ring-line"}`}>
                {featured && <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-forest px-3.5 py-1 text-xs font-semibold whitespace-nowrap text-white shadow-float">En çok tercih edilen</span>}
                <div className="grid gap-1.5">
                  <h3 className="text-xl font-semibold tracking-tight">{p.label}</h3>
                  <p className="min-h-10 text-sm text-muted">{planBlurb[p.key]}</p>
                </div>
                <p className="flex items-baseline gap-2">
                  <span className={`font-semibold tracking-tight tabular-nums ${featured ? "text-5xl" : "text-4xl"}`}>${p.priceUsd}</span>
                  <span className="text-sm text-muted">/ ay</span>
                </p>
                <ul className="grid gap-3 border-t border-line pt-6 text-sm">
                  {features(p).map((f) => (
                    <PlanFeature key={f.text} text={f.text} on={f.on} strong={featured} />
                  ))}
                </ul>
                <div className="grid gap-2 text-center">
                  <ButtonLink href="/kayit" variant={featured ? "primary" : "secondary"} size={featured ? "lg" : "md"} className="w-full">
                    7 gün ücretsiz dene
                  </ButtonLink>
                  <p className="text-xs text-muted">Kart bilgisi gerekir · deneme bitmeden istediğiniz an iptal edin</p>
                </div>
              </div>
            </ScrollReveal>
          );
        })}
      </ul>

      <ScrollReveal delay={200}>
        <div className="mx-auto mt-10 grid max-w-4xl gap-5 rounded-panel bg-surface p-6 ring-1 ring-line md:grid-cols-[1fr_auto] md:items-center">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 className="text-lg font-semibold tracking-tight">{free.label} plan</h3>
            </div>
            <p className="text-sm text-muted">{planBlurb.ucretsiz}</p>
            <ul className="mt-1 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {features(free).map((f) => (
                <PlanFeature key={f.text} text={f.text} on={f.on} />
              ))}
            </ul>
          </div>
          <ButtonLink href="/kayit" variant="secondary" size="lg" className="w-full md:w-auto">
            Ücretsiz başla
          </ButtonLink>
        </div>
      </ScrollReveal>

      <p className="mx-auto mt-8 max-w-3xl text-center text-sm text-muted">
        1 Kredi = gizli bilgileri açılıp eklenen 1 kişi/firma. Krediler her ay başında yenilenir; listelemek ayrı bir haktır (ücretsiz planda günde 25, ayda 75 kişi). Ücretli planların hepsinde 7 gün ücretsiz deneme vardır (kart bilgisi gerekir). Fiyatlar aylıktır ve ABD doları ile gösterilir.
      </p>
    </Section>
  );
}

export const faqs = [
  {
    q: "Kişi verileri nereden geliyor?",
    a: "Kişiler herkese açık iş bilgilerinden (unvan, şirket, iş e-postası) bulunur.",
  },
  {
    q: "E-postalar kimin adresinden gidiyor?",
    a: "Sizin gönderici adresinizden. Google hesabınızla tek tıkla bağlayabilir ya da kendi SMTP/IMAP adresinizi ekleyebilirsiniz. Yeni adresler için ısındırma ve kademeli limit vardır.",
  },
  {
    q: "Adspine AI her soruda kullanılıyor mu?",
    a: "Hayır. Filtreleme, sıralama ve sayma gibi işlemler doğrudan verilerinizden yapılır. Adspine AI yalnızca metin yazarken, yorum gerektiren sorularda ve sohbet panelinde çalışır; yalnızca sizin rakamlarınıza dayanır.",
  },
  {
    q: "Spam ve yasal uyum nasıl sağlanıyor?",
    a: "Her e-postanın altında, yanıtlayıp “İPTAL” yazmanın yeterli olduğu bir çıkış satırı bulunur (e-postada bağlantı yoktur); çıkanlar, geri dönenler ve şikâyet edenler kara listeye alınır ve bir daha e-posta almaz. Geri dönen oranı yükselirse gönderim otomatik duraklar.",
  },
  {
    q: "Kimler için uygun?",
    a: "Web tasarım, sosyal medya, reklam, yazılım ve danışmanlık gibi hizmet satan ajanslar ile serbest çalışanlar; ürününü işletmelere ulaştırmak isteyen her ekip için.",
  },
];

export function Faq() {
  return (
    <Section id="sss" className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
      <ScrollReveal>
        <Eyebrow>Sorular</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Sık sorulan sorular</h2>
      </ScrollReveal>
      <ScrollReveal delay={100} className="divide-y divide-line border-y border-line">
        {faqs.map((f) => (
          <Disclosure key={f.q} summary={<span className="font-medium">{f.q}</span>} buttonClassName="py-5" panelClassName="max-w-prose pb-6 text-muted">
            {f.a}
          </Disclosure>
        ))}
      </ScrollReveal>
    </Section>
  );
}

export function FinalCta() {
  return (
    <Section padding="pb-20 sm:pb-32">
      <ScrollReveal>
        <div className="relative isolate overflow-hidden rounded-panel bg-forest px-6 py-14 text-white sm:px-14 sm:py-20">
          <div aria-hidden="true" className={`${styles.glow} absolute -top-24 -right-16 -z-10 size-[26rem] rounded-full bg-white/15 blur-3xl`} />
          <h2 className="max-w-[22ch] text-2xl font-semibold tracking-tight sm:text-4xl">İlk listenizi ve ilk otomasyonunuzu bugün kurun</h2>
          <p className="mt-4 max-w-[34rem] text-lg text-white/80">Hesabınızı oluşturun, bir gönderici adresi bağlayın, hedef kitlenizi bulun. Birkaç dakikada hazırsınız.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/kayit" size="lg" variant="inverse">
              Ücretsiz başla
            </ButtonLink>
            <Link href="/giris" className="inline-flex h-12 items-center rounded-control px-6 font-medium text-white/90 ring-1 ring-white/35 transition-colors ring-inset hover:bg-white/10">
              Giriş yap
            </Link>
          </div>
        </div>
      </ScrollReveal>
    </Section>
  );
}
