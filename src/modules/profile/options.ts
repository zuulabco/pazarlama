/** Onboarding seçenekleri. Değerler (value) DB'ye yazılır; etiketler (label) yalnızca arayüz içindir. */

type Opt = { readonly value: string; readonly label: string; readonly hint?: string; readonly group?: string };

/** Gruplu katalog: açılır listede başlıklar altında görünür, arama gruplara bakmaz. */
const grouped = (groups: Record<string, readonly (readonly [string, string])[]>): readonly Opt[] =>
  Object.entries(groups).flatMap(([group, items]) => items.map(([value, label]) => ({ value, label, group })));

export const workTypes: readonly Opt[] = [
  { value: "ajans", label: "Ajans ya da stüdyo" },
  { value: "serbest", label: "Serbest çalışan (freelance)" },
  { value: "danisman", label: "Bağımsız danışman ya da uzman" },
  { value: "buro", label: "Profesyonel hizmet bürosu", hint: "Muhasebe, hukuk, mühendislik, mimarlık…" },
  { value: "acente", label: "Acente ya da komisyoncu", hint: "Emlak, sigorta, seyahat…" },
  { value: "urun", label: "Ürün ya da yazılım şirketi" },
  { value: "uretici", label: "Üretici ya da imalatçı" },
  { value: "toptanci", label: "Toptancı ya da distribütör" },
  { value: "magaza", label: "Mağaza ya da perakendeci" },
  { value: "yerel-hizmet", label: "Yerel hizmet işletmesi", hint: "Usta, servis, teknik ve saha hizmetleri" },
  { value: "egitmen", label: "Eğitmen ya da koç" },
  { value: "b2b", label: "Kurumsal (B2B) hizmet şirketi" },
  { value: "girisim", label: "Girişim (startup)" },
];

export const services = grouped({
  "Dijital pazarlama ve reklam": [
    ["web-tasarim", "Web tasarım"],
    ["seo", "SEO"],
    ["sosyal-medya", "Sosyal medya yönetimi"],
    ["reklam", "Reklam yönetimi"],
    ["icerik", "İçerik üretimi"],
    ["marka", "Marka ve logo tasarımı"],
    ["eticaret", "E-ticaret kurulumu"],
    ["eposta-pazarlama", "E-posta pazarlaması"],
    ["video", "Video ve prodüksiyon"],
    ["fotograf", "Fotoğraf çekimi"],
    ["pr", "Halkla ilişkiler (PR)"],
    ["influencer", "Influencer pazarlaması"],
  ],
  "Yazılım ve teknoloji": [
    ["yazilim", "Yazılım ve mobil uygulama"],
    ["ozel-yazilim", "Özel yazılım geliştirme"],
    ["saas", "Bulut tabanlı yazılım (SaaS)"],
    ["crm", "CRM ve satış yazılımı"],
    ["erp", "ERP ve muhasebe yazılımı"],
    ["yapay-zeka", "Yapay zekâ ve otomasyon"],
    ["siber-guvenlik", "Siber güvenlik"],
    ["bilisim", "BT destek ve altyapı"],
    ["veri-analizi", "Veri analizi ve raporlama"],
  ],
  "Emlak ve gayrimenkul": [
    ["emlak-satis", "Konut satışı"],
    ["emlak-kiralama", "Kiralama ve mülk yönetimi"],
    ["ticari-gayrimenkul", "Ticari gayrimenkul"],
    ["arsa-proje", "Arsa ve proje satışı"],
    ["degerleme", "Gayrimenkul değerleme"],
    ["gayrimenkul-yatirim", "Gayrimenkul yatırım danışmanlığı"],
  ],
  "Muhasebe, finans ve hukuk": [
    ["muhasebe", "Muhasebe ve defter tutma"],
    ["mali-musavirlik", "Mali müşavirlik"],
    ["vergi", "Vergi danışmanlığı"],
    ["bordro", "Bordro ve SGK işlemleri"],
    ["sirket-kurulusu", "Şirket kuruluşu"],
    ["denetim", "Denetim"],
    ["finansal-danismanlik", "Finansal danışmanlık"],
    ["sigorta", "Sigorta"],
    ["kredi", "Kredi ve finansman danışmanlığı"],
    ["hukuk", "Hukuki danışmanlık"],
    ["ticaret-hukuku", "Sözleşme ve ticaret hukuku"],
    ["marka-patent", "Marka ve patent tescili"],
  ],
  "Mühendislik, mimarlık ve inşaat": [
    ["mimari", "Mimari tasarım"],
    ["ic-mimari", "İç mimari ve dekorasyon"],
    ["muteahhitlik", "İnşaat ve müteahhitlik"],
    ["muhendislik", "Mühendislik ve proje hizmetleri"],
    ["tadilat", "Tadilat ve yenileme"],
    ["elektrik-tesisat", "Elektrik ve tesisat"],
    ["peyzaj", "Peyzaj"],
    ["guvenlik-sistemleri", "Güvenlik ve kamera sistemleri"],
    ["enerji", "Güneş enerjisi ve enerji verimliliği"],
    ["harita-olcum", "Harita ve ölçüm"],
  ],
  "Kurumsal danışmanlık": [
    ["danismanlik", "Danışmanlık"],
    ["yonetim-danismanligi", "Yönetim danışmanlığı"],
    ["insan-kaynaklari", "İnsan kaynakları ve işe alım"],
    ["kurumsal-egitim", "Kurumsal eğitim"],
    ["kalite-belgelendirme", "Kalite ve belgelendirme (ISO)"],
    ["dis-ticaret", "İhracat ve dış ticaret danışmanlığı"],
    ["tesvik-hibe", "Teşvik ve hibe danışmanlığı"],
    ["ceviri", "Çeviri ve tercümanlık"],
  ],
  "Sağlık ve iyi oluş": [
    ["muayene-tedavi", "Muayene ve tedavi"],
    ["estetik-bakim", "Estetik ve bakım"],
    ["psikolojik-danismanlik", "Psikolojik danışmanlık"],
    ["beslenme", "Diyet ve beslenme"],
    ["fizyoterapi", "Fizyoterapi"],
    ["antrenorluk", "Kişisel antrenörlük ve spor"],
  ],
  "Eğitim ve koçluk": [
    ["ozel-ders", "Özel ders"],
    ["kurs-atolye", "Kurs ve atölye"],
    ["dil-egitimi", "Dil eğitimi"],
    ["kariyer-koclugu", "Kariyer ve yaşam koçluğu"],
    ["online-egitim", "Online eğitim programı"],
  ],
  "Üretim, ticaret ve tedarik": [
    ["toptan-satis", "Toptan satış"],
    ["uretim", "Üretim ve imalat"],
    ["ambalaj-baski", "Ambalaj ve baskı"],
    ["hammadde", "Hammadde ve malzeme tedariki"],
    ["makine-ekipman", "Makine ve ekipman satışı"],
    ["lojistik", "Lojistik ve nakliye"],
    ["ithalat-ihracat", "İthalat ve ihracat"],
  ],
  "Hizmet, bakım ve organizasyon": [
    ["temizlik", "Temizlik hizmeti"],
    ["guvenlik-hizmeti", "Özel güvenlik hizmeti"],
    ["teknik-servis", "Teknik servis ve bakım"],
    ["etkinlik", "Etkinlik ve organizasyon"],
    ["catering", "Catering ve yemek hizmeti"],
    ["seyahat", "Seyahat ve turizm hizmeti"],
    ["arac-hizmetleri", "Araç kiralama ve servis"],
  ],
});

export const sectors = grouped({
  "Sağlık ve yaşam": [
    ["saglik", "Sağlık ve klinik"],
    ["dis-hekimligi", "Diş ve ağız sağlığı"],
    ["eczane-medikal", "Eczane ve medikal"],
    ["veteriner", "Veteriner ve evcil hayvan"],
    ["guzellik", "Güzellik ve kuaför"],
    ["spor", "Spor ve fitness"],
    ["psikoloji-terapi", "Psikoloji ve terapi"],
  ],
  "Yeme-içme ve turizm": [
    ["restoran", "Restoran ve kafe"],
    ["turizm", "Turizm ve otel"],
    ["gida-uretim", "Gıda üretimi"],
    ["market", "Market ve bakkal"],
  ],
  "Ticaret ve perakende": [
    ["perakende", "Perakende ve mağaza"],
    ["eticaret-satici", "E-ticaret satıcıları"],
    ["toptan-ticaret", "Toptancı ve distribütör"],
    ["moda-tekstil", "Moda ve tekstil"],
    ["mobilya-dekorasyon", "Mobilya ve dekorasyon"],
    ["elektronik", "Elektronik ve teknoloji mağazası"],
  ],
  "Emlak ve yapı": [
    ["emlak", "Emlak"],
    ["insaat", "İnşaat ve mimarlık"],
    ["yapi-malzeme", "Yapı malzemeleri"],
  ],
  "Profesyonel hizmetler": [
    ["hukuk-muhasebe", "Hukuk ve muhasebe"],
    ["finans-sigorta", "Finans ve sigorta"],
    ["danismanlik-firmalari", "Danışmanlık firmaları"],
    ["reklam-medya", "Reklam, medya ve yayıncılık"],
  ],
  Eğitim: [
    ["egitim", "Eğitim ve kurs"],
    ["kres-anaokulu", "Anaokulu ve kreş"],
  ],
  "Sanayi, tarım ve enerji": [
    ["sanayi", "Sanayi ve üretim"],
    ["makine-metal", "Makine ve metal işleme"],
    ["matbaa-ambalaj", "Matbaa ve ambalaj"],
    ["enerji-cevre", "Enerji ve çevre"],
    ["tarim", "Tarım ve hayvancılık"],
  ],
  "Ulaşım ve teknoloji": [
    ["otomotiv", "Otomotiv"],
    ["lojistik-tasimacilik", "Lojistik ve taşımacılık"],
    ["yazilim-bt", "Yazılım ve BT"],
  ],
  "Hizmet ve diğer": [
    ["temizlik-bakim", "Temizlik ve bakım hizmetleri"],
    ["guvenlik-sektoru", "Güvenlik hizmetleri"],
    ["etkinlik-organizasyon", "Etkinlik ve organizasyon"],
    ["sanat-eglence", "Sanat ve eğlence"],
    ["kamu-stk", "Kamu, dernek ve vakıflar"],
    ["diger", "Diğer"],
  ],
});

export const companySizes = [
  { value: "tek-kisi", label: "Tek kişilik işletme (1 kişi)" },
  { value: "mikro", label: "Mikro (2–9 kişi)" },
  { value: "kucuk", label: "Küçük (10–49 kişi)" },
  { value: "orta", label: "Orta (50–249 kişi)" },
  { value: "buyuk", label: "Büyük (250+ kişi)" },
  { value: "farketmez", label: "Fark etmez" },
] as const;

export const cityScopes = [
  { value: "cities", label: "Belirli şehirlerde" },
  { value: "turkey", label: "Türkiye genelinde" },
] as const;

/** Aranan işaretler hem dijital hem dijital olmayan işler için yazıldı; model bunları aynen okur. */
export const signals = grouped({
  "Dijital görünürlük": [
    ["no-website", "Web sitesi yok"],
    ["weak-website", "Web sitesi eski ya da zayıf"],
    ["busy-offline", "Müşterisi çok, dijital varlığı zayıf"],
    ["low-social", "Sosyal medyada aktif değil"],
    ["no-booking", "Online randevu ya da sipariş alamıyor"],
    ["unclaimed-profile", "Google işletme profili sahiplenilmemiş"],
    ["few-photos", "Profilinde az fotoğraf ve bilgi var"],
    ["weak-reviews", "Puanı düşük ya da yorumlara yanıt vermiyor"],
  ],
  "Büyüme ve zamanlama": [
    ["new-business", "Yeni açılmış ya da büyüyor"],
    ["expanding", "Yeni şube açıyor ya da hızla büyüyor"],
    ["hiring", "Personel arıyor"],
    ["renewed", "Yeni taşınmış ya da mekânını yenilemiş"],
    ["seasonal", "Sezon öncesi hazırlık yapıyor"],
  ],
  "Ölçek ve yapı": [
    ["busy", "Yoğun müşteri trafiği var"],
    ["multi-branch", "Birden fazla şubesi var"],
    ["established", "Uzun yıllardır faaliyette"],
    ["small-team", "Küçük bir ekiple çalışıyor"],
    ["premium", "Üst segment ya da yüksek fiyatlı hizmet veriyor"],
  ],
  "İş yapış biçimi": [
    ["manual-process", "İşlerini hâlâ elle ya da kâğıt üzerinde yürütüyor"],
    ["no-software", "Muhasebe ya da yönetim yazılımı kullanmıyor"],
    ["sells-b2b", "Başka işletmelere satış yapıyor"],
    ["exports", "İhracat yapıyor ya da yapmak istiyor"],
    ["heavy-compliance", "Vergi, SGK ya da ruhsat gibi yükümlülüğü çok"],
    ["outsources", "Dışarıdan hizmet almaya açık"],
  ],
  "Mülk ve konum": [
    ["property-listing", "Kiralık ya da satılık mülkü var"],
    ["prime-location", "Yoğun bir bölgede ya da ana caddede"],
    ["dated-premises", "Mekânı eski, yenilemeye ihtiyacı var"],
  ],
  Ulaşılabilirlik: [
    ["contact-visible", "Telefon ya da e-posta bilgisi açık"],
    ["owner-direct", "Sahibine doğrudan ulaşılabiliyor"],
    ["whatsapp-line", "WhatsApp hattı var"],
  ],
});

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

type Option = { readonly value: string };
export const values = <T extends readonly Option[]>(list: T) => list.map((o) => o.value) as [T[number]["value"], ...T[number]["value"][]];

export const labelOf = (list: readonly { value: string; label: string }[], value: string) =>
  list.find((o) => o.value === value)?.label ?? value;
