"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { LockIcon } from "@/components/ui/icons";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { finishLabels } from "@/modules/outreach/enrollment-labels";
import type { EnrollmentView } from "@/modules/outreach/enrollments";
import type { Mailbox } from "@/modules/outreach/mailbox-schema";
import type { Contact } from "@/modules/outreach/schema";
import type { ContactList } from "@/modules/outreach/contacts";
import type { ActivityItem } from "@/modules/outreach/report-data";
import type { SequenceReport } from "@/modules/outreach/report";
import { defaultSchedule } from "@/modules/outreach/schedule";
import type { Sequence, SequenceSettings } from "@/modules/outreach/sequence-schema";
import { api } from "../../../kisiler/_components/contact-ui";
import { Field, SettingsCard, fmtDate, inputClass, pct } from "./campaign-ui";

const dayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const statusText = { aktif: "Sırada", bitti: "Bitti", duraklatildi: "Duraklatıldı", hata: "Hata" } as const;
const eventText: Record<string, string> = {
  sent: "E-posta gönderildi",
  reply: "Yanıt verdi",
  bounce: "E-posta geri döndü",
  unsubscribe: "Abonelikten çıktı",
  ooo: "Ofis dışı yanıtı",
  open: "E-postayı açtı",
  click: "Bağlantıya tıkladı",
  error: "Gönderim hatası",
  task: "Plan'a görev eklendi",
  opener: "Kişisel açılış eklendi",
  paused: "Duraklatıldı",
  finished: "Dizi bitti",
};

const who = (c: { name: string | null; company: string | null; email: string | null } | null) => c?.company ?? c?.name ?? c?.email ?? "Kişi";

/** Kişiler sekmesi: otomasyondakiler + kişi/liste ekleme. */
export function PeopleTab({ sequenceId, onChanged }: { sequenceId: string; onChanged: () => void }) {
  const [status, setStatus] = useState<"hepsi" | "aktif" | "bitti" | "duraklatildi" | "hata">("hepsi");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: EnrollmentView[]; total: number } | null>(null);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [candidates, setCandidates] = useState<Contact[] | null>(null);
  const [pick, setPick] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const base = `/api/outreach/sequences/${sequenceId}/contacts`;

  const load = useCallback(async () => {
    const r = await api<{ items: EnrollmentView[]; total: number }>(`${base}?status=${status}&page=${page}`);
    if (r.ok) setData(r.data);
    else toast(r.error, { kind: "error" });
  }, [base, status, page]);

  useEffect(() => {
    let live = true;
    void api<{ items: EnrollmentView[]; total: number }>(`${base}?status=${status}&page=${page}`).then((r) => {
      if (!live) return;
      if (r.ok) setData(r.data);
      else toast(r.error, { kind: "error" });
    });
    return () => {
      live = false;
    };
  }, [base, status, page]);

  async function openAdd() {
    setAdding((a) => !a);
    if (candidates === null) {
      const [c, l] = await Promise.all([api<{ contacts: Contact[] }>("/api/outreach/contacts?status=hepsi&page=1"), api<{ lists: ContactList[] }>("/api/outreach/lists")]);
      setCandidates(c.ok ? c.data.contacts.filter((x) => x.email) : []);
      setLists(l.ok ? l.data.lists : []);
    }
  }

  async function enroll(body: { contactIds?: string[]; listId?: string }) {
    setBusy(true);
    const r = await api<{ added: number; skipped: Record<string, number> }>(base, { method: "POST", body: JSON.stringify(body) });
    setBusy(false);
    if (!r.ok) return toast(r.error, { kind: "error" });
    const s = r.data.skipped;
    const parts = [s.noEmail && `${s.noEmail} e-postasız`, s.invalid && `${s.invalid} geçersiz`, s.personal && `${s.personal} kişisel adres`, s.suppressed && `${s.suppressed} kara listede`, s.exists && `${s.exists} zaten ekli`].filter(Boolean);
    toast(`${r.data.added} kişi eklendi${parts.length ? ` · atlanan: ${parts.join(", ")}` : ""}`);
    setPick(new Set());
    await load();
    onChanged();
  }

  async function act(ids: string[], kind: "pause" | "resume" | "remove") {
    const r = kind === "remove" ? await api(base, { method: "DELETE", body: JSON.stringify({ ids }) }) : await api(base, { method: "PATCH", body: JSON.stringify({ ids, paused: kind === "pause" }) });
    if (!r.ok) return toast(r.error, { kind: "error" });
    await load();
    onChanged();
  }

  const pages = data ? Math.max(Math.ceil(data.total / 25), 1) : 1;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-44">
          <Select<string>
            label="Durum"
            value={status}
            options={[
              { value: "hepsi", label: "Tüm kişiler" },
              { value: "aktif", label: "Sırada" },
              { value: "duraklatildi", label: "Duraklatılanlar" },
              { value: "bitti", label: "Bitenler" },
              { value: "hata", label: "Hatalılar" },
            ]}
            onChange={(v) => {
              setStatus(v as typeof status);
              setPage(1);
            }}
          />
        </div>
        <span className="text-sm text-muted">{data ? `${data.total} kişi` : ""}</span>
        <Button className="ml-auto" onClick={() => void openAdd()}>
          {adding ? "Kapat" : "Kişi ekle"}
        </Button>
      </div>

      {adding && (
        <div className="grid gap-4 rounded-panel bg-sunken/60 p-4">
          {lists.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Listeden ekle:</span>
              {lists.map((l) => (
                <button key={l.id} type="button" disabled={busy || l.count === 0} onClick={() => void enroll({ listId: l.id })} className="h-8 rounded-full bg-surface px-3.5 text-sm ring-1 ring-line-strong ring-inset transition-colors hover:bg-forest-soft disabled:opacity-50">
                  {l.name} ({l.count})
                </button>
              ))}
            </div>
          )}
          {candidates === null ? (
            <p className="text-sm text-muted">Kişiler yükleniyor…</p>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-muted">E-posta adresi olan kişi yok. Önce Kişiler sekmesinden kişi ekleyin ya da e-posta bulun.</p>
          ) : (
            <>
              <ul className="grid max-h-72 gap-1 overflow-auto pr-1">
                {candidates.map((c) => (
                  <li key={c.id}>
                    <label className="flex items-center gap-3 rounded-control px-2 py-1.5 text-sm hover:bg-surface">
                      <input
                        type="checkbox"
                        checked={pick.has(c.id)}
                        onChange={(e) =>
                          setPick((p) => {
                            const n = new Set(p);
                            if (e.target.checked) n.add(c.id);
                            else n.delete(c.id);
                            return n;
                          })
                        }
                        className="size-4 accent-[var(--color-forest)]"
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">{who(c)}</span>
                      <span className="truncate text-muted">{c.email}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <Button className="w-fit" disabled={busy || pick.size === 0} onClick={() => void enroll({ contactIds: [...pick] })}>
                {busy ? "Ekleniyor…" : `Seçilen ${pick.size} kişiyi ekle`}
              </Button>
            </>
          )}
        </div>
      )}

      {data && data.items.length === 0 ? (
        <p className="rounded-panel bg-surface px-6 py-12 text-center text-muted ring-1 ring-line">Bu görünümde kişi yok.</p>
      ) : (
        <ul className="grid gap-2">
          {data?.items.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-3 rounded-panel bg-surface px-4 py-3 ring-1 ring-line">
              <div className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate font-medium">{who(e.contact)}</span>
                <span className="truncate text-sm text-muted">{e.contact.email}</span>
              </div>
              <div className="grid text-sm sm:text-right">
                <span className="font-medium">
                  {statusText[e.status]}
                  {e.finishReason ? ` · ${finishLabels[e.finishReason]}` : ""}
                </span>
                <span className="text-muted">
                  {e.sent} e-posta{e.status === "aktif" && e.nextRunAt ? ` · sıradaki ${fmtDate(e.nextRunAt)}` : ""}
                </span>
                {e.lastError && <span className="text-danger">{e.lastError}</span>}
              </div>
              <div className="flex gap-1">
                {e.status === "aktif" && (
                  <Button variant="quiet" onClick={() => void act([e.id], "pause")}>
                    Duraklat
                  </Button>
                )}
                {e.status === "duraklatildi" && (
                  <Button variant="quiet" onClick={() => void act([e.id], "resume")}>
                    Sürdür
                  </Button>
                )}
                <Button variant="quiet" className="text-danger" onClick={() => void act([e.id], "remove")}>
                  Çıkar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Button variant="quiet" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Önceki
          </Button>
          <span className="text-muted">
            {page} / {pages}
          </span>
          <Button variant="quiet" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Sonraki
          </Button>
        </div>
      )}
    </div>
  );
}

const bandStyle = { iyi: "bg-forest-soft text-accent", gelisebilir: "bg-pollen/50 text-ink", kritik: "bg-danger-soft text-danger" } as const;
const bandText = { iyi: "Sağlıklı", gelisebilir: "Gelişmeli", kritik: "Kritik" } as const;

/** Etkinlik + Rapor sekmesi. */
export function ReportTab({ sequenceId }: { sequenceId: string }) {
  const [data, setData] = useState<{ report: SequenceReport; activity: ActivityItem[] } | null>(null);
  useEffect(() => {
    void api<{ report: SequenceReport; activity: ActivityItem[] }>(`/api/outreach/sequences/${sequenceId}/report`).then((r) => (r.ok ? setData(r.data) : toast(r.error, { kind: "error" })));
  }, [sequenceId]);

  if (!data) return <p className="py-10 text-center text-muted">Rapor yükleniyor…</p>;
  const { report: r, activity } = data;
  const cards = [
    ["Gönderilen", String(r.totals.sent)],
    ["Yanıt", `${r.totals.replied} · ${pct(r.rates.reply)}`],
    ["Geri dönen", `${r.totals.bounced} · ${pct(r.rates.bounce)}`],
    ["Abonelikten çıkan", String(r.totals.unsubscribed)],
    ["Kişi", `${r.totals.enrolled} (${r.totals.active} sırada)`],
  ];
  return (
    <div className="grid gap-6">
      <div className={`flex flex-wrap items-center gap-3 rounded-panel px-5 py-4 ${bandStyle[r.health.band]}`}>
        <span className="font-semibold">Gönderim sağlığı: {bandText[r.health.band]}</span>
        <span className="text-sm">
          Son {r.health.windowDays} günde {r.health.sent} e-postanın {r.health.bounced} tanesi geri döndü ({pct(r.health.rate)}). Hedef %2&apos;nin altı; %5,5 ve üstünde otomasyon kendiliğinden durur.
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {cards.map(([k, v]) => (
          <div key={k} className="rounded-panel bg-surface p-4 ring-1 ring-line">
            <dt className="text-sm text-muted">{k}</dt>
            <dd className="text-lg font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <section aria-label="Adım performansı" className="grid gap-2">
        <h3 className="font-semibold tracking-tight">Adımlar</h3>
        {r.steps.length === 0 ? (
          <p className="text-sm text-muted">Etkin adım yok.</p>
        ) : (
          r.steps.map((s) => (
            <div key={s.index} className="rounded-panel bg-surface p-4 ring-1 ring-line">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">
                  {s.index + 1}. adım · {s.label}
                </span>
                <span className="text-sm text-muted">
                  {s.sent} gönderim · {s.replied} yanıt · {s.bounced} geri dönen
                </span>
              </div>
              {s.variants.length > 1 && (
                <ul className="mt-2 grid gap-1 text-sm">
                  {s.variants.map((v) => (
                    <li key={v.key} className="flex justify-between">
                      <span>Test {v.key}</span>
                      <span className="tabular-nums text-muted">
                        {v.sent} gönderim · {v.replied} yanıt{v.sent ? ` (${pct((v.replied / v.sent) * 100)})` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </section>

      <section aria-label="Etkinlik" className="grid gap-2">
        <h3 className="font-semibold tracking-tight">Son etkinlik</h3>
        {activity.length === 0 ? (
          <p className="text-sm text-muted">Henüz etkinlik yok.</p>
        ) : (
          <ul className="grid gap-1.5">
            {activity.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 rounded-control px-3 py-2 text-sm odd:bg-sunken/50">
                <span className="w-28 shrink-0 text-muted tabular-nums">{fmtDate(a.at)}</span>
                <span className="font-medium">{who(a.contact)}</span>
                <span className="text-muted">{eventText[a.kind] ?? a.kind}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/**
 * Ayarlar sekmesi: her bölüm tek bir soruya yanıt verir (adı ne? ne zaman? hangi adreslerden? ne zaman dursun? e-postada ne yazsın?).
 * Seyrek kullanılan seçenekler en altta "Gelişmiş" başlığı altında toplanır.
 */
export function SettingsTab({ seq, mailboxes, onChange }: { seq: Sequence; mailboxes: Mailbox[]; onChange: (patch: Partial<Pick<Sequence, "name" | "description" | "schedule" | "settings">>) => void }) {
  const s = seq.settings;
  const set = (patch: Partial<SequenceSettings>) => onChange({ settings: { ...s, ...patch } });
  const sch = seq.schedule ?? defaultSchedule;
  const [cc, setCc] = useState(s.cc.join(", "));
  const [bcc, setBcc] = useState(s.bcc.join(", "));
  const mailList = (v: string) => v.split(/[,\s;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean).slice(0, 5);
  const connected = mailboxes.filter((m) => m.status === "bagli");

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5">
      <SettingsCard title="Genel" description="Otomasyonu listede ayırt etmenizi sağlar; kişilere görünmez.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Otomasyon adı">
            <input value={seq.name} onChange={(e) => onChange({ name: e.target.value })} maxLength={80} className={inputClass} />
          </Field>
          <Field label="Açıklama (isteğe bağlı)">
            <input value={seq.description} onChange={(e) => onChange({ description: e.target.value })} maxLength={300} className={inputClass} />
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard title="Ne zaman gönderilsin?" description="E-postalar yalnızca seçtiğiniz gün ve saatlerde, küçük rastgele aralıklarla gönderilir.">
        <div className="grid gap-2">
          <p className="text-sm font-medium">Günler</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Gönderim günleri">
            {dayNames.map((d, i) => {
              const on = sch.days.includes(i + 1);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    const days = on ? sch.days.filter((x) => x !== i + 1) : [...sch.days, i + 1].sort();
                    if (days.length) onChange({ schedule: { ...sch, days } });
                  }}
                  className="h-9 w-12 rounded-full text-sm ring-1 ring-line-strong ring-inset transition-colors hover:bg-sunken aria-pressed:bg-forest aria-pressed:text-white aria-pressed:ring-forest"
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid max-w-md grid-cols-2 gap-4">
          <Field label="Başlangıç saati">
            <input type="time" value={sch.start} onChange={(e) => e.target.value && onChange({ schedule: { ...sch, start: e.target.value } })} className={inputClass} />
          </Field>
          <Field label="Bitiş saati">
            <input type="time" value={sch.end} onChange={(e) => e.target.value && onChange({ schedule: { ...sch, end: e.target.value } })} className={inputClass} />
          </Field>
        </div>
        <p className="text-sm text-muted">Saat dilimi: {sch.tz}</p>
      </SettingsCard>

      <SettingsCard title="Hangi adreslerden gönderilsin?" description="Hiçbiri seçilmezse bağlı tüm gönderici adresleriniz sırayla kullanılır.">
        {mailboxes.length === 0 ? (
          <p className="rounded-control bg-sunken/60 px-4 py-3 text-sm text-muted">Bağlı gönderici adresi yok. Önce “Gönderici adresleri” sayfasından bir adres bağlayın.</p>
        ) : (
          <div className="grid gap-3">
            {mailboxes.map((m) => (
              <Switch
                key={m.id}
                checked={s.mailboxIds.includes(m.id)}
                disabled={m.status !== "bagli"}
                onChange={(on) => set({ mailboxIds: on ? [...s.mailboxIds, m.id] : s.mailboxIds.filter((x) => x !== m.id) })}
                label={m.email}
                hint={m.status !== "bagli" ? "Bağlı değil; bu adres kullanılamaz" : `Günlük en çok ${m.dailyLimit}, saatlik ${m.hourlyLimit} e-posta`}
              />
            ))}
          </div>
        )}
        <div className="grid max-w-xs">
          <Field label="Bu otomasyonun günlük üst sınırı (isteğe bağlı)" hint={connected.length ? "Kayan 24 saatte en çok kaç e-posta gitsin. Boşsa adreslerin kendi limitleri geçerlidir." : "Kayan 24 saatte en çok kaç e-posta."}>
            <input inputMode="numeric" value={s.maxPer24h ?? ""} placeholder="Sınırsız" onChange={(e) => set({ maxPer24h: e.target.value ? Math.min(Number(e.target.value.replace(/\D/g, "")) || 1, 500) : null })} className={inputClass} />
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard title="Ne zaman durdurulsun?" description="Bir kişi için dizi şu durumlarda otomatik olarak durur ya da bekler.">
        <div className="grid gap-4">
          <Switch checked={s.pauseOnOoo} onChange={(v) => set({ pauseOnOoo: v })} label="Ofis dışı yanıtında beklet" hint="Kişi ofis dışı otomatik yanıtı gönderirse birkaç gün sonra devam edilir." />
          <Switch checked={s.stopOnCompanyReply} onChange={(v) => set({ stopOnCompanyReply: v })} label="Şirketten biri yanıt verince diğerlerini durdur" hint="Aynı şirketteki iş arkadaşına aynı konuda tekrar yazılmaz. Şirket, e-posta alan adından anlaşılır." />
          <Switch checked={s.finishOnClick} onChange={(v) => set({ finishOnClick: v })} label="Bağlantıya tıklayınca bitir" hint="E-postadaki bir bağlantıya tıklayan kişiye sonraki adımlar gitmez." />
          <Switch checked={s.unresponsiveDays !== null} onChange={(v) => set({ unresponsiveDays: v ? 14 : null })} label="Yanıt gelmezse “yanıtsız” say" hint="Son adımdan sonra belirlenen süre geçince kişi yanıtsız olarak işaretlenir." />
          {s.unresponsiveDays !== null && (
            <div className="grid max-w-[11rem] pl-0 sm:pl-0">
              <Field label="Kaç gün sonra">
                <input inputMode="numeric" value={s.unresponsiveDays} onChange={(e) => set({ unresponsiveDays: Math.min(Math.max(Number(e.target.value.replace(/\D/g, "")) || 1, 1), 90) })} className={inputClass} />
              </Field>
            </div>
          )}
        </div>
        <p className="flex items-start gap-2.5 rounded-control bg-sunken/60 px-4 py-3 text-sm text-muted">
          <span className="mt-0.5 shrink-0">
            <LockIcon size={16} />
          </span>
          Abonelikten çıkan, e-postası geri dönen ve şikâyet eden kişilere bir daha e-posta gitmez. Bu kural yasal gereklilik olduğu için kapatılamaz.
        </p>
      </SettingsCard>

      <SettingsCard title="E-postanın içeriği" description="Her e-postanın sonuna eklenenler.">
        <div className="grid gap-4">
          <Switch checked={s.includeSignature} onChange={(v) => set({ includeSignature: v })} label="Gönderici adresinin imzasını ekle" hint="İmza, Gönderici adresleri sayfasında her adres için ayrı yazılır." />
          <Field label="Gönderici adresi ya da telefonu" hint="E-postanın altında, çıkış bağlantısıyla birlikte görünür. Ticari iletide gönderici bilgisi bulunmalıdır.">
            <input value={s.footerAddress} onChange={(e) => set({ footerAddress: e.target.value })} maxLength={200} placeholder="Örn. Bağdat Cad. 12, Kadıköy · 0216 000 00 00" className={inputClass} />
          </Field>
        </div>
      </SettingsCard>

      <section className="rounded-panel bg-surface ring-1 ring-line">
        <Disclosure
          buttonClassName="px-5 py-4 sm:px-6"
          panelClassName="grid gap-5 border-t border-line px-5 py-5 sm:px-6"
          summary={
            <span className="grid gap-0.5 text-left">
              <span className="font-semibold tracking-tight">Gelişmiş</span>
              <span className="text-sm font-normal text-muted">Kişisel adresler, açılma izleme, CC ve BCC</span>
            </span>
          }
        >
          <Switch checked={s.allowPersonal} onChange={(v) => set({ allowPersonal: v })} label="Kişisel adreslere de gönder (gmail, hotmail vb.)" hint="Tacir olmayan kişilere ticari e-posta için önceden onay gerekir; bilinçli açın." />
          <Switch checked={s.trackOpens} onChange={(v) => set({ trackOpens: v })} label="Açılmaları izle" hint="İzleme pikseli spam sinyali olabilir; bu yüzden varsayılan olarak kapalıdır." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="CC (en çok 5)" hint="Her e-postanın bir kopyası bu adreslere de gider.">
              <input value={cc} onChange={(e) => setCc(e.target.value)} onBlur={() => set({ cc: mailList(cc) })} placeholder="ornek@firma.com" className={inputClass} />
            </Field>
            <Field label="BCC (en çok 5)" hint="Kopya gider, alıcı görmez.">
              <input value={bcc} onChange={(e) => setBcc(e.target.value)} onBlur={() => set({ bcc: mailList(bcc) })} placeholder="ornek@firma.com" className={inputClass} />
            </Field>
          </div>
        </Disclosure>
      </section>
    </div>
  );
}
