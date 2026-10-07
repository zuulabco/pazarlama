import type { Metadata } from "next";
import { site } from "@/lib/site";
import { Ask, Faq, FinalCta, Hero, HowItWorks, Modules, Scoring, faqs } from "./_components/sections";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: site.name,
      url: site.url,
      description: site.description,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "tr",
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Hero />
      <HowItWorks />
      <Scoring />
      <Ask />
      <Modules />
      <Faq />
      <FinalCta />
    </>
  );
}
