/** Onboarding seçenekleri. Değerler (value) DB'ye yazılır; etiketler (label) yalnızca arayüz içindir. */

export const workTypes = [
  { value: "ajans", label: "Ajans", hint: "Birden fazla müşteriye hizmet veren ekip" },
  { value: "serbest", label: "Serbest çalışan", hint: "Kendi adıma çalışıyorum" },
  { value: "urun", label: "Ürün ya da yazılım şirketi", hint: "Kendi ürünümü satıyorum" },
] as const;

export const services = [
  { value: "web-tasarim", label: "Web tasarım" },
  { value: "seo", label: "SEO" },
  { value: "sosyal-medya", label: "Sosyal medya yönetimi" },
  { value: "reklam", label: "Reklam yönetimi" },
  { value: "icerik", label: "İçerik üretimi" },
  { value: "marka", label: "Marka ve logo tasarımı" },
  { value: "yazilim", label: "Yazılım ve mobil uygulama" },
  { value: "eticaret", label: "E-ticaret kurulumu" },
  { value: "danismanlik", label: "Danışmanlık" },
] as const;

export const sectors = [
  { value: "saglik", label: "Sağlık ve klinik" },
  { value: "restoran", label: "Restoran ve kafe" },
  { value: "guzellik", label: "Güzellik ve kuaför" },
  { value: "emlak", label: "Emlak" },
  { value: "egitim", label: "Eğitim ve kurs" },
  { value: "hukuk-muhasebe", label: "Hukuk ve muhasebe" },
  { value: "otomotiv", label: "Otomotiv" },
  { value: "turizm", label: "Turizm ve otel" },
  { value: "perakende", label: "Perakende ve mağaza" },
  { value: "insaat", label: "İnşaat ve mimarlık" },
  { value: "spor", label: "Spor ve fitness" },
  { value: "diger", label: "Diğer" },
] as const;

export const companySizes = [
  { value: "mikro", label: "Mikro", hint: "1–9 çalışan" },
  { value: "kucuk", label: "Küçük", hint: "10–49 çalışan" },
  { value: "orta", label: "Orta", hint: "50 ve üzeri" },
  { value: "farketmez", label: "Fark etmez", hint: "Hepsi uygun" },
] as const;

export const dealValues = [
  { value: "15k-alti", label: "15 bin ₺ altı" },
  { value: "15k-50k", label: "15–50 bin ₺" },
  { value: "50k-150k", label: "50–150 bin ₺" },
  { value: "150k-ustu", label: "150 bin ₺ üzeri" },
] as const;

type Option = { readonly value: string };
export const values = <T extends readonly Option[]>(list: T) => list.map((o) => o.value) as [T[number]["value"], ...T[number]["value"][]];
