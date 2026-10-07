/** Onboarding seçenekleri. Değerler (value) DB'ye yazılır; etiketler (label) yalnızca arayüz içindir. */

export const workTypes = [
  { value: "ajans", label: "Ajans", hint: "Birden fazla müşteriye hizmet veren bir ekibim var" },
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

export const cityScopes = [
  { value: "cities", label: "Belirli şehirlerde", hint: "Hedeflediğim şehirleri seçeceğim" },
  { value: "turkey", label: "Türkiye genelinde", hint: "Uzaktan çalışabilirim, şehir fark etmez" },
] as const;

export const signals = [
  { value: "no-website", label: "Web sitesi yok", hint: "Dijitalde hiç ya da çok az görünüyorlar" },
  { value: "weak-website", label: "Web sitesi eski ya da zayıf", hint: "Var ama modern, hızlı ya da düzenli değil" },
  { value: "busy-offline", label: "Müşterisi çok, dijital varlığı zayıf", hint: "Çok yorumu var ama internette karşılığı yok" },
  { value: "low-social", label: "Sosyal medyada aktif değil", hint: "Hesapları yok ya da uzun süredir boş" },
  { value: "no-booking", label: "Online randevu ya da sipariş alamıyor", hint: "Müşteri hâlâ telefonla ulaşmak zorunda" },
  { value: "new-business", label: "Yeni açılmış ya da büyüyor", hint: "Kendini duyurmak için bütçe ayırma ihtimali yüksek" },
] as const;

export const channels = [
  { value: "telefon", label: "Telefon" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "eposta", label: "E-posta" },
  { value: "instagram", label: "Instagram mesajı" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "yuz-yuze", label: "Yüz yüze ziyaret" },
] as const;

export const dealValues = [
  { value: "15k-alti", label: "15 bin ₺ altı" },
  { value: "15k-50k", label: "15–50 bin ₺" },
  { value: "50k-150k", label: "50–150 bin ₺" },
  { value: "150k-ustu", label: "150 bin ₺ üzeri" },
] as const;

export const popularCities = [
  "İstanbul",
  "Ankara",
  "İzmir",
  "Bursa",
  "Antalya",
  "Adana",
  "Konya",
  "Gaziantep",
  "Kocaeli",
  "Mersin",
  "Kayseri",
  "Eskişehir",
] as const;

type Option = { readonly value: string };
export const values = <T extends readonly Option[]>(list: T) => list.map((o) => o.value) as [T[number]["value"], ...T[number]["value"][]];

export const labelOf = (list: readonly { value: string; label: string }[], value: string) =>
  list.find((o) => o.value === value)?.label ?? value;
