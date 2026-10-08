"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";
import { StepFields, type FieldErrors } from "@/components/profile/step-fields";
import { draftFrom, type Draft } from "@/modules/profile/draft";
import { profileSchema, stepSchemas } from "@/modules/profile/schema";
import { completeOnboarding } from "../actions";
import { SummaryCard, type EditableStage } from "./summary-card";
import styles from "./wizard.module.css";

const stages = ["intro", "about", "target", "reach", "fit", "review"] as const;
type Stage = (typeof stages)[number];
const steps = ["about", "target", "reach", "fit", "review"] as const;

const copy: Record<Exclude<Stage, "intro">, { short: string; title: string; text: string }> = {
  about: { short: "Sizi tanıyalım", title: "Sizi tanıyalım", text: "Kısa sorular. Hepsini sonradan profilinizden değiştirebilirsiniz." },
  target: {
    short: "Hizmet ve hedef",
    title: "Ne satıyorsunuz, kime?",
    text: "Önerilerden seçin ya da kendi ifadenizi yazıp ekleyin.",
  },
  reach: {
    short: "Bölge ve iletişim",
    title: "Nerede ve nasıl ulaşıyorsunuz?",
    text: "İletişim bilgisi bulunan, bölgenizdeki firmaları öne çıkaracağız.",
  },
  fit: {
    short: "İyi aday",
    title: "İyi bir aday nasıl biri?",
    text: "Bu seçimler, hangi firmaların listenizde öne çıkacağını belirler.",
  },
  review: {
    short: "Bilgi kartı",
    title: "Bilgi kartınız hazır",
    text: "Her bölümü düzenleyebilirsiniz. Onayladığınızda hesabınız bu bilgilere göre kurulur.",
  },
};

export function Wizard({ defaultName, initial }: { defaultName: string; initial: Partial<Draft> }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");
  const [furthest, setFurthest] = useState(0);
  /** Bilgi kartından düzenlemeye gelindiyse, kaydedince doğrudan karta dönülür. */
  const [editing, setEditing] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [draft, setDraft] = useState<Draft>(() => draftFrom(initial));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const index = stages.indexOf(stage);
  const firstName = defaultName.split(" ")[0];

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function goTo(next: Stage, keepEditing = false) {
    const nextIndex = stages.indexOf(next);
    setDirection(nextIndex >= index ? "forward" : "back");
    setStage(next);
    setEditing(keepEditing);
    setFurthest((f) => Math.max(f, nextIndex));
    setSaveError(null);
  }

  // Yeni adıma geçildiğinde başlığa odaklan: klavye ve ekran okuyucu kullanıcıları için.
  useEffect(() => {
    if (stage !== "intro") headingRef.current?.focus({ preventScroll: true });
  }, [stage]);

  function collect(issues: { path: PropertyKey[]; message: string }[]) {
    const next: FieldErrors = {};
    for (const issue of issues) {
      const field = issue.path[0] as keyof Draft;
      next[field] ??= issue.message;
    }
    setErrors(next);
  }

  function validate(): boolean {
    if (stage === "intro" || stage === "review") return true;
    const result = stepSchemas[stage].safeParse(draft);
    if (result.success) return true;
    collect(result.error.issues);
    return false;
  }

  /** Kaydetmeden önce tüm adımları kontrol eder; ilk hatalı adıma döner. */
  function firstInvalidStage(): Exclude<Stage, "intro" | "review"> | null {
    for (const s of ["about", "target", "reach", "fit"] as const) {
      const result = stepSchemas[s].safeParse(draft);
      if (!result.success) {
        collect(result.error.issues);
        return s;
      }
    }
    return profileSchema.safeParse(draft).success ? null : "about";
  }

  /** Otomatik geçiş takılırsa ekrandaki "Panele geç" düğmesi aynı işi yapar. */
  function leave() {
    router.replace("/panel");
    router.refresh();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (stage === "intro") return goTo("about");

    if (stage === "review") {
      const invalid = firstInvalidStage();
      if (invalid) return goTo(invalid, true);
      startTransition(async () => {
        try {
          const result = await completeOnboarding(draft);
          if (!result.ok) return setSaveError(result.error);
        } catch {
          return setSaveError("Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.");
        }
        setDone(true);
        setTimeout(leave, 1500);
      });
      return;
    }

    if (!validate()) return;
    goTo(editing ? "review" : stages[index + 1]);
  }

  const animation = direction === "forward" ? styles.forward : styles.back;
  const lastQuestion = stage === "fit";

  return (
    <div className="flex min-h-dvh flex-1 flex-col px-4 py-6 sm:px-8">
      <div className="mx-auto flex w-full max-w-[44rem] flex-1 flex-col">
        <header className="flex items-center justify-between gap-4">
          <Wordmark />
          {stage !== "intro" && !done && (
            <p className="text-sm text-muted" aria-live="polite">
              Adım {index} / {steps.length}
            </p>
          )}
        </header>

        {stage !== "intro" && (
          <nav aria-label="Adımlar" className="mt-3">
            <ol className="flex gap-1.5">
              {steps.map((s, i) => {
                const n = i + 1;
                return (
                  <li key={s} className="flex-1">
                    <button
                      type="button"
                      disabled={n > furthest || pending || done}
                      onClick={() => goTo(s)}
                      aria-label={`Adım ${n}: ${copy[s].short}`}
                      aria-current={stage === s ? "step" : undefined}
                      className="group block w-full cursor-pointer py-2.5 disabled:cursor-default"
                    >
                      <span
                        className={`block h-1 rounded-full transition-colors duration-300 ${n <= index || done ? "bg-forest" : "bg-line"} ${n <= furthest && n > index ? "group-hover:bg-line-strong" : ""}`}
                      />
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        <form onSubmit={onSubmit} className="flex flex-1 flex-col justify-center py-8 sm:py-12" noValidate>
          {done ? (
            <div className={`${styles.forward} grid justify-items-center gap-5 text-center`} role="status">
              <span className={`${styles.ring} grid size-16 place-items-center rounded-full bg-forest`}>
                <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
                  <path className={styles.check} d="m5.5 12.5 4.2 4.2 8.8-9.4" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <h1 className="text-3xl font-semibold tracking-display sm:text-4xl">Hesabınız hazır</h1>
              <p className="max-w-[28rem] text-lg text-muted">
                Panele yönlendiriyoruz. İlk müşteri listenizi oluşturmaya hazırsınız.
              </p>
              <Button size="lg" onClick={leave}>
                Panele geç
              </Button>
            </div>
          ) : stage === "intro" ? (
            <div className={`${styles.stagger} grid justify-items-center gap-6 text-center`}>
              <h1 style={{ "--i": 0 } as React.CSSProperties} className="text-display font-semibold tracking-display">
                {firstName ? `Hoş geldiniz, ${firstName}.` : "Hoş geldiniz."}
              </h1>
              <p style={{ "--i": 1 } as React.CSSProperties} className="max-w-[30rem] text-lg text-muted">
                Adspine&apos;i size göre kuralım. Dört kısa soruyla ne sattığınızı ve kime sattığınızı öğreneceğiz; listeniz
                buna göre puanlanacak. Bir dakika sürer.
              </p>
              <div style={{ "--i": 2 } as React.CSSProperties}>
                <Button type="submit" size="lg">
                  Başlayalım
                </Button>
              </div>
            </div>
          ) : (
            <div key={stage} className={animation}>
              <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold tracking-display outline-none sm:text-4xl">
                {copy[stage].title}
              </h1>
              <p className="mt-3 mb-8 max-w-[34rem] text-lg text-muted">{copy[stage].text}</p>

              {stage === "review" ? (
                <SummaryCard draft={draft} onEdit={(s: EditableStage) => goTo(s, true)} />
              ) : (
                <div className="grid gap-9 rounded-panel bg-surface p-6 shadow-float ring-1 ring-line sm:p-9">
                  <StepFields stage={stage} draft={draft} update={update} errors={errors} />
                </div>
              )}

              {saveError && (
                <p role="alert" className="mt-6 rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">
                  {saveError}
                </p>
              )}

              <div className="mt-8 flex items-center justify-between gap-3">
                {editing ? (
                  <Button variant="quiet" size="lg" onClick={() => goTo("review")} disabled={pending}>
                    Karta dön
                  </Button>
                ) : (
                  <Button variant="quiet" size="lg" onClick={() => goTo(stages[index - 1])} disabled={pending}>
                    Geri
                  </Button>
                )}
                <Button type="submit" size="lg" disabled={pending}>
                  {stage === "review"
                    ? pending
                      ? "Hesabınız hazırlanıyor…"
                      : "Hesabımı hazırla"
                    : editing
                      ? "Kaydet"
                      : lastQuestion
                        ? "Bilgi kartını gör"
                        : "Devam"}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
