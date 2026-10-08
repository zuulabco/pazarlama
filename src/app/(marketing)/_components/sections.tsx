import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { scoreTone } from "@/lib/score";
import { appModules } from "@/modules/registry";
import { demoBreakdown } from "./demo-data";
import { ModuleShowcase } from "./module-showcase";
import { RankingDemo } from "./ranking-demo";

type SectionProps = { id?: string; children: ReactNode; className?: string; padding?: string };

function Section({ id, children, className = "", padding = "py-16 sm:py-28" }: SectionProps) {
  return (
    <section id={id} className={`mx-auto w-full max-w-page scroll-mt-6 px-4 sm:px-6 ${padding} ${className}`}>
      {children}
    </section>
  );
}

function SectionIntro({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="max-w-prose">
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      <p className="mt-5 text-lg text-muted">{children}</p>
    </div>
  );
}

export function Hero() {
  return (
    <Section
      padding="pt-6 pb-16 sm:pt-12 sm:pb-28"
      className="grid items-center gap-14 lg:grid-cols-[1fr_1.08fr] lg:gap-16"
    >
      <div>
        <h1 className="max-w-[14ch] text-display font-semibold tracking-display">
          Hizmetinize en çok ihtiyacı olan firmaları bulun.
        </h1>
        <p className="mt-7 max-w-[34rem] text-lg text-muted">
          Bölge ve sektör seçin. Adspine o bölgedeki işletmeleri toplar, her birini yedi kritere göre puanlar ve hangi
          potansiyel müşteriye önce ulaşmanız gerektiğini sıralar.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <ButtonLink href="/kayit" size="lg">
            Hesap oluştur
          </ButtonLink>
          <ButtonLink href="#nasil-calisir" size="lg" variant="secondary">
            Nasıl çalışır
          </ButtonLink>
        </div>
      </div>
      <RankingDemo />
    </Section>
  );
}

const steps = [
  {
    title: "Hedefinizi anlatın",
    text: "Hangi hizmeti sattığınızı, hangi sektör ve şehirlerde müşteri aradığınızı bir kez tanımlayın.",
  },
  {
    title: "Firmalar toplanır",
    text: "Bölgenizdeki işletmeler adres, telefon, web sitesi, puan ve yorum sayısıyla listelenir.",
  },
  {
    title: "Her firma puanlanır",
    text: "Sektör uyumundan ulaşılabilirliğe yedi kriter, sizin hedefinize göre değerlendirilir.",
  },
  {
    title: "Seçin ve ulaşın",
    text: "Listeyi daraltın, sorular sorun, en uygun firmalar için satış mesajınızı hazırlayın.",
  },
];

export function HowItWorks() {
  return (
    <Section id="nasil-calisir">
      <SectionIntro title="Aramadan ilk mesaja dört adım">
        Elle firma listesi çıkarmak, web sitelerine tek tek bakmak ve kime önce gideceğinize karar vermek saatler sürer.
        Adspine bu işi sizin yerinize yapar.
      </SectionIntro>
      <ol className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <li key={step.title} className="border-t-2 border-line pt-5 first:border-forest">
            <span className="text-sm font-semibold text-accent tabular-nums">{i + 1}</span>
            <h3 className="mt-3 text-lg font-semibold tracking-tight">{step.title}</h3>
            <p className="mt-2 text-muted">{step.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function Scoring() {
  const { lead, criteria } = demoBreakdown;
  return (
    <Section id="puanlama" className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
      <SectionIntro title="Her puanın nereden geldiğini görürsünüz">
        Toplam puan kapalı bir kutu değil. Yedi kriterin her biri ayrı gösterilir ve ağırlıklarını sizin hedefiniz
        belirler. Hangi kriterin öne çıktığına bakar, konuşmanızı ona göre kurarsınız.
      </SectionIntro>

      <div className="rounded-panel bg-surface p-6 ring-1 ring-line sm:p-8">
        <div className="flex items-baseline justify-between gap-4 border-b border-line pb-5">
          <div>
            <p className="font-semibold">{lead.name}</p>
            <p className="text-sm text-muted">{lead.signals}</p>
          </div>
          <p className="text-3xl font-semibold tabular-nums tracking-tight">
            {lead.score}
            <span className="sr-only"> toplam puan</span>
          </p>
        </div>
        <dl className="mt-5 grid gap-3.5">
          {criteria.map((c) => (
            <div key={c.label} className="grid grid-cols-[minmax(0,11rem)_1fr_2rem] items-center gap-4 text-sm">
              <dt className="truncate text-muted">{c.label}</dt>
              <div className="h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
                <div className={`h-full rounded-full ${scoreTone(c.value)}`} style={{ width: `${c.value}%` }} />
              </div>
              <dd className="text-right font-medium tabular-nums">{c.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}

const exchanges = [
  {
    question: "Dijital ihtiyacı yüksek firmaları göster",
    source: "Verilerinizden, anında",
    sourceClass: "bg-forest-soft text-accent",
    answer: "Hedefinize uyan ve dijital ihtiyaç puanı 80'in üzerinde olan 24 firma bulundu.",
  },
  {
    question: "Bunlardan hangilerine web tasarımı satma şansım daha yüksek?",
    source: "Yapay zekâ yorumu",
    sourceClass: "bg-pollen text-ink",
    answer:
      "En güçlü iki aday Lale Diş Kliniği ve Feneryolu Dental. İkisinin de web sitesi yok ama yorum sayıları yüksek: hasta trafiği var, internette karşılığı yok. Online randevu içeren tek sayfalık bir siteyle başlayan bir teklif, ikisi için de iyi bir giriş olur.",
  },
];

export function Ask() {
  return (
    <Section className="grid gap-14 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
      <SectionIntro title="Sorunuzu yazın, cevap sorunun türüne göre gelsin">
        Listeyi daraltan sorular verilerinizden anında yanıtlanır. Karşılaştırma ve strateji gibi yorum gerektiren
        sorularda yapay zekâ devreye girer ve yalnızca en uygun adayları değerlendirir. Böylece cevaplar hem hızlı hem
        odaklı olur.
      </SectionIntro>

      <div className="grid gap-8">
        {exchanges.map((ex) => (
          <div key={ex.question} className="grid gap-3">
            <p className="justify-self-end rounded-row bg-ink px-4 py-2.5 text-sm text-white">{ex.question}</p>
            <div className="rounded-row bg-surface p-5 ring-1 ring-line">
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${ex.sourceClass}`}>
                {ex.source}
              </span>
              <p className="mt-3">{ex.answer}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function Modules() {
  return (
    <Section id="ozellikler">
      <SectionIntro title="Tek panelde pazarlamanın tamamı">
        Müşteri bulmakla başlıyoruz. Her yeni özellik aynı hedef profilinizi ve verilerinizi kullanır; bir kez anlatırsınız, hepsi sizi tanır.
      </SectionIntro>
      <ModuleShowcase modules={appModules} />
    </Section>
  );
}

export const faqs = [
  {
    q: "Firma verileri nereden geliyor?",
    a: "Herkese açık işletme bilgilerinden: ad, kategori, adres, telefon, web sitesi, puan ve yorum sayısı.",
  },
  {
    q: "Puanlar nasıl hesaplanıyor?",
    a: "Her firma, hesabınızı kurarken anlattığınız hedefe göre yedi kriterde değerlendirilir. Toplam puan bu kriterlerin ağırlıklı ortalamasıdır ve ağırlıkları sizin hedefiniz belirler.",
  },
  {
    q: "Yapay zekâ her soruda kullanılıyor mu?",
    a: "Hayır. Filtreleme, sıralama ve sayma gibi sorular doğrudan verilerinizden yanıtlanır. Yapay zekâ yalnızca karşılaştırma, strateji veya satış mesajı gibi yorum gereken sorularda çalışır.",
  },
  {
    q: "Kimler için uygun?",
    a: "Web tasarım, sosyal medya yönetimi, reklam, yazılım veya danışmanlık gibi işletmelere hizmet satan ajanslar ve serbest çalışanlar için.",
  },
];

export function Faq() {
  return (
    <Section id="sss" className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Sık sorulan sorular</h2>
      <div className="divide-y divide-line border-y border-line">
        {faqs.map((f) => (
          <Disclosure
            key={f.q}
            summary={<span className="font-medium">{f.q}</span>}
            buttonClassName="py-5"
            panelClassName="max-w-prose pb-6 text-muted"
          >
            {f.a}
          </Disclosure>
        ))}
      </div>
    </Section>
  );
}

export function FinalCta() {
  return (
    <Section padding="pb-16 sm:pb-28">
      <div className="flex flex-col items-start gap-8 rounded-panel bg-forest px-6 py-12 text-white sm:px-12 sm:py-16 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">İlk listenizi bugün çıkarın</h2>
          <p className="mt-3 text-lg text-white/75">Hedefinizi anlatmanız birkaç dakika sürer.</p>
        </div>
        <ButtonLink href="/kayit" size="lg" variant="inverse">
          Hesap oluştur
        </ButtonLink>
      </div>
    </Section>
  );
}
