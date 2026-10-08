import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { BoltIcon, CheckIcon, InboxIcon, SparkleIcon } from "@/components/ui/icons";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { planList } from "@/modules/outreach/plans";
import styles from "./landing.module.css";
import { AutomationMock, ChatMock, DashboardMock, FirmsMock, InboxMock, LeadsMock, ReportMock } from "./mocks";

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
              Adspine karar vericileri ve yerel firmaları bulur, Adspine AI ile yazdığınız e-postaları sizin adresinizden otomatik gönderir, yanıtları tek kutuda toplar ve sonucu raporlar.
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
            <p className="mt-6 text-sm text-muted">Kredi kartı gerekmez · Google ile tek tıkla gönderici adresi bağlama</p>
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
              <SparkleIcon size={14} />
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
  ["Yasalara uygun", "Her e-postada abonelikten çıkma bağlantısı; kara liste otomatik."],
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
          İster karar vericileri unvana göre, ister bölgenizdeki yerel firmaları puanlarına göre bulun. Seçtiklerinizi kaydedin, e-postalarını otomatik bulalım.
        </Heading>
      </ScrollReveal>
      <div className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-2">
        <ScrollReveal className="grid gap-6">
          <LeadsMock />
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Kişi bul</h3>
            <p className="mt-2 text-muted">Unvan, sektör, şehir ve şirket büyüklüğüne göre filtreleyin. Listelemek serbest; yalnızca eklediğiniz kişiler için kredi harcanır.</p>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={120} className="grid gap-6">
          <FirmsMock />
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Firma bul</h3>
            <p className="mt-2 text-muted">Bölge ve sektör seçin; firmalar hedef profilinize göre puanlanır, kimden başlamanız gerektiği sıralanır.</p>
          </div>
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
  { icon: <SparkleIcon size={20} />, t: "Adspine AI", s: "Yazım, yorum, yönlendirme" },
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

export function Pricing() {
  const num = (n: number) => new Intl.NumberFormat("tr-TR").format(n);
  return (
    <Section id="paketler">
      <ScrollReveal>
        <Heading eyebrow="Paketler" title="Gönderici adresi sayınıza göre büyür">
          Paket ölçüsü, bağlayabildiğiniz gönderici adresi sayısıdır; gönderim hacminiz buna göre belirlenir. Ücretsiz başlayın, ihtiyacınız arttıkça yükseltin.
        </Heading>
      </ScrollReveal>
      <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {planList.map((p, i) => (
          <ScrollReveal as="li" key={p.key} delay={i * 90} className={`grid content-start gap-5 rounded-panel p-6 ring-1 ${p.key === "buyume" ? "bg-surface shadow-float ring-2 ring-forest" : "bg-surface ring-line"}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold tracking-tight">{p.label}</h3>
              {p.key === "buyume" && <span className="rounded-full bg-forest px-2.5 py-0.5 text-xs font-medium text-white">Popüler</span>}
            </div>
            <p className="text-3xl font-semibold tracking-tight">
              {p.key === "ucretsiz" ? "Ücretsiz" : <span className="text-muted">Yakında</span>}
            </p>
            <ul className="grid gap-2.5 text-sm">
              {[`${p.senders} gönderici adresi`, `Ayda ${num(p.monthlyCredits)} kişi kredisi`, `${p.campaigns} otomasyon`, "Isındırma ve gelen kutusu", "Adspine AI"].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <span className="mt-0.5 shrink-0 text-accent">
                    <CheckIcon size={14} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <ButtonLink href="/kayit" variant={p.key === "buyume" ? "primary" : "secondary"} className="w-full">
              {p.key === "ucretsiz" ? "Ücretsiz başla" : "Hesap oluştur"}
            </ButtonLink>
          </ScrollReveal>
        ))}
      </ul>
      <p className="mt-6 text-sm text-muted">1 kredi = e-posta adresi bulunan 1 kişi. Krediler her ay başında yenilenir. Ücretli paket fiyatları yakında duyurulacak.</p>
    </Section>
  );
}

export const faqs = [
  {
    q: "Kişi ve firma verileri nereden geliyor?",
    a: "Kişiler herkese açık iş bilgilerinden (unvan, şirket, iş e-postası) bulunur; yerel firmalar herkese açık işletme bilgilerinden (ad, kategori, adres, telefon, web sitesi, puan, yorum sayısı) toplanır.",
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
    a: "Her e-postada abonelikten çıkma bağlantısı bulunur; çıkanlar, geri dönenler ve şikâyet edenler kara listeye alınır ve bir daha e-posta almaz. Geri dönen oranı yükselirse gönderim otomatik duraklar.",
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
