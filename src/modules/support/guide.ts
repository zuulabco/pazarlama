import type { SupportConfig } from "./config";

/** Satır içi bağlantı: metin içinde [[etiket|adres]] biçiminde yazılır. */
export type GuideStep = { id: string; text: string };

export type Integration = {
  id: string;
  title: string;
  /** Bu hesabın neden gerektiği, tek cümle */
  why: string;
  minutes: number;
  steps: GuideStep[];
  /** n8n içinde doldurulacak alanlar: [alan, nereden alınır] */
  fields?: [string, string][];
  warning?: string;
};

export const exampleMessage = {
  language: "Almanca",
  original: "Hallo, meine Buchung wurde noch nicht bestätigt. Das ist dringend, bitte helfen Sie mir sofort!",
  translated: "Merhaba, rezervasyonum henüz onaylanmadı. Bu acil, lütfen hemen yardım edin!",
  priority: "YÜKSEK",
  summary: "Rezervasyon onaylanmadı, müşteri acil yardım istiyor.",
  reply: "Vielen Dank für Ihre Nachricht! Wir haben sie erhalten und melden uns innerhalb von 24 Stunden bei Ihnen.",
};

export const benefits = [
  {
    title: "Dil engeli kalkar",
    text: "Müşteri hangi dilde yazarsa yazsın mesajı otomatik Türkçeye çevrilir. Yabancı dil bilen birini aramanız gerekmez.",
  },
  {
    title: "Acil mesaj kaçmaz",
    text: "Her mesaj yüksek, orta ya da düşük öncelikle etiketlenir. Önce neye bakacağınızı baştan bilirsiniz.",
  },
  {
    title: "Elle yapılan iş azalır",
    text: "Okuma, çevirme, özetleme, kayıt tutma ve ilk yanıt otomatik yapılır. Ekibiniz yalnızca cevap vermeye odaklanır.",
  },
  {
    title: "Her şey kayıt altında",
    text: "Gelen her mesaj tarih, kanal, dil ve öncelikle bir tabloya yazılır. Geçmişe dönüp bakmak ve raporlamak kolaylaşır.",
  },
  {
    title: "Müşteri kendi dilinde yanıt alır",
    text: "Mesaj ulaştığı anda müşteri, yazdığı dilde profesyonel bir onay mesajı görür; bekleme hissi azalır.",
  },
  {
    title: "Verileriniz sizde kalır",
    text: "Otomasyon sizin n8n hesabınızda çalışır. WhatsApp, e-posta ve Google hesaplarınızın şifrelerini Adspine'e vermezsiniz.",
  },
] as const;

export const journey = [
  { title: "Mesaj gelir", text: "WhatsApp ya da e-gönderici adresinize, herhangi bir dilde." },
  { title: "Çevrilir", text: "Dil otomatik algılanır ve Türkçeye çevrilir." },
  { title: "Özetlenir ve etiketlenir", text: "Kısa özet çıkar, öncelik belirlenir." },
  { title: "Size haber verilir", text: "E-posta ya da WhatsApp bildirimi ve tabloya kayıt." },
  { title: "Müşteri yanıt alır", text: "Kendi dilinde otomatik karşılama mesajı gider." },
] as const;

const n8n: Integration = {
  id: "n8n",
  title: "n8n hesabı",
  why: "Otomasyon n8n adlı araçta çalışır. Hesap sizin olur; veriler başka bir yere gitmez.",
  minutes: 5,
  steps: [
    { id: "n8n-1", text: "[[n8n.io|https://n8n.io]] adresine gidin ve bir n8n Cloud hesabı açın. Ücretsiz deneme sunulur; güncel plan ve fiyatları n8n'in sitesinden kontrol edin." },
    { id: "n8n-2", text: "Giriş yaptıktan sonra sol menüde “Workflows” (İş akışları) bölümünü bulun. Dosyayı daha sonra buraya yükleyeceksiniz." },
    { id: "n8n-3", text: "Kendi sunucunuzda n8n çalıştırıyorsanız adresinizin internetten HTTPS ile erişilebilir olduğundan emin olun. WhatsApp bu adrese mesaj gönderir." },
  ],
};

const translate: Integration = {
  id: "google",
  title: "Google Cloud (çeviri ve tablo erişimi)",
  why: "Mesajları çevirmek için Google Çeviri kullanılır. Aynı hesap tabloya yazmak için de kullanılır.",
  minutes: 15,
  steps: [
    { id: "g-1", text: "[[Google Cloud Console|https://console.cloud.google.com]] adresine Google hesabınızla girin ve üstteki proje seçiciden “Yeni proje” oluşturun (örn. “destek-otomasyonu”)." },
    { id: "g-2", text: "Menüden “API'ler ve Hizmetler > Kitaplık”a gidin, “Cloud Translation API”yi arayın ve “Etkinleştir”e basın. Google faturalandırma bilgisi isteyebilir; ücretsiz aylık kota vardır, güncel kotayı Google'ın fiyat sayfasından doğrulayın." },
    { id: "g-3", text: "Tabloya kayıt kullanacaksanız aynı yerden “Google Sheets API”yi de etkinleştirin." },
    { id: "g-4", text: "“IAM ve yönetim > Hizmet hesapları > Hizmet hesabı oluştur”a gidin. Bir ad verin (örn. “n8n”), rol seçmeden devam edip kaydedin." },
    { id: "g-5", text: "Oluşan hizmet hesabına tıklayın, “Anahtarlar > Anahtar ekle > Yeni anahtar oluştur > JSON”u seçin. Bilgisayarınıza bir .json dosyası iner; bunu kimseyle paylaşmayın." },
    { id: "g-6", text: "n8n'de sol altta “Credentials > Create credential”a basın, “Google Service Account API”yi seçin ve indirdiğiniz dosyayı bir metin düzenleyiciyle açıp iki değeri kopyalayın." },
  ],
  fields: [
    ["Service Account Email", "JSON dosyasındaki client_email değeri"],
    ["Private Key", "JSON dosyasındaki private_key değeri (-----BEGIN ile başlayan uzun metin)"],
  ],
  warning: "JSON dosyası bir şifre gibidir. Mesaj, ekran görüntüsü ya da e-posta ile paylaşmayın.",
};

const whatsapp: Integration = {
  id: "whatsapp",
  title: "WhatsApp Business (Meta)",
  why: "Müşteri mesajlarını almak ve yanıt göndermek için Meta'nın resmî WhatsApp Business Platform'u kullanılır.",
  minutes: 30,
  steps: [
    { id: "w-1", text: "[[Meta for Developers|https://developers.facebook.com]] sayfasında giriş yapın, “Uygulamalarım > Uygulama oluştur”a basın ve “İşletme” türünü seçin." },
    { id: "w-2", text: "Uygulamanıza “WhatsApp” ürününü ekleyin. “API Setup” (API Kurulumu) sayfası açılır." },
    { id: "w-3", text: "Aynı sayfada “Phone number ID” ve “WhatsApp Business Account ID” değerlerini bir yere not edin. İlkini sihirbazdaki ilgili kutuya yapıştıracaksınız." },
    { id: "w-4", text: "Başlangıçta Meta size bir test numarası verir; yalnızca doğruladığınız birkaç numaraya yazabilir. Gerçek müşteriler için “Phone numbers > Add phone number” ile kendi işletme numaranızı ekleyip doğrulayın." },
    { id: "w-5", text: "Kalıcı erişim anahtarı için [[Business Settings|https://business.facebook.com/settings]] > Users > System users bölümünden bir sistem kullanıcısı oluşturun, uygulamayı ve WhatsApp hesabını ona atayın. “Generate token” ile whatsapp_business_messaging ve whatsapp_business_management izinlerini seçin. (API Setup sayfasındaki geçici anahtar 24 saatte biter.)" },
    { id: "w-6", text: "n8n'de “WhatsApp API” kimlik bilgisi oluşturun: Access Token alanına bu anahtarı, Business Account ID alanına WhatsApp Business Account ID değerini yazın." },
    { id: "w-7", text: "n8n'de ayrıca “WhatsApp OAuth API” kimlik bilgisi oluşturun (gelen mesajları dinleyen tetikleyici bunu kullanır). Client ID = Meta uygulamanızın App ID değeri, Client Secret = “Uygulama ayarları > Temel” sayfasındaki App Secret." },
    { id: "w-8", text: "Akışı etkinleştirdiğinizde n8n, mesajları alacağı adresi Meta'ya kendisi bildirir. Gerçek müşterilerden mesaj almak için Meta uygulamanızı “Canlı (Live)” moda almayı unutmayın." },
  ],
  fields: [
    ["WhatsApp API > Access Token", "Sistem kullanıcısı için oluşturduğunuz kalıcı anahtar"],
    ["WhatsApp API > Business Account ID", "API Setup sayfasındaki WhatsApp Business Account ID"],
    ["WhatsApp OAuth API > Client ID / Secret", "Meta uygulamanızın App ID ve App Secret değerleri"],
  ],
  warning:
    "Meta kuralı: işletme, müşteri yazdıktan sonraki 24 saat içinde serbest metinle yanıt verebilir. Müşteriye otomatik yanıt bu kurala uyar. Ancak yöneticiye WhatsApp ile bildirim, yönetici o numaraya son 24 saat içinde yazmadıysa iletilmeyebilir. Bu yüzden yönetici bildirimi için e-posta daha güvenilirdir.",
};

const email: Integration = {
  id: "email",
  title: "E-posta (IMAP ve SMTP)",
  why: "IMAP gelen kutunuzu dinler, SMTP bildirim ve yanıt e-postalarını gönderir.",
  minutes: 10,
  steps: [
    { id: "e-1", text: "Mümkünse yalnızca müşteri desteği için ayrı bir adres kullanın (örn. destek@firmaniz.com). Otomasyon bu kutuya gelen her yeni postayı işler." },
    { id: "e-2", text: "Gmail kullanıyorsanız Google hesabında 2 adımlı doğrulamayı açın, sonra [[Uygulama şifreleri|https://myaccount.google.com/apppasswords]] sayfasından n8n için bir uygulama şifresi oluşturun. Normal şifrenizi kullanmayın." },
    { id: "e-3", text: "n8n'de “IMAP” kimlik bilgisi oluşturun: Gmail için Host imap.gmail.com, Port 993, SSL açık. Kendi alan adınızın e-postasını kullanıyorsanız bilgileri barındırma firmanızdan alın." },
    { id: "e-4", text: "n8n'de “SMTP” kimlik bilgisi oluşturun: Gmail için Host smtp.gmail.com, Port 465, SSL açık. Kullanıcı ve şifre IMAP ile aynıdır." },
  ],
  fields: [
    ["IMAP: User / Password / Host / Port", "E-posta adresiniz, uygulama şifresi, imap.gmail.com, 993"],
    ["SMTP: User / Password / Host / Port", "E-posta adresiniz, uygulama şifresi, smtp.gmail.com, 465"],
  ],
  warning:
    "Microsoft 365 / Outlook hesapları şifreyle IMAP erişimine genellikle izin vermez. Gmail ya da barındırma firmanızın e-postasını tercih edin. Bildirimleri bu kutuya göndermeyin; akış kendi bildirimlerini atlasa da ayrı bir yönetici adresi daha temizdir.",
};

const sheets: Integration = {
  id: "sheets",
  title: "Google Sheets (kayıt tablosu)",
  why: "Gelen her mesaj bu tabloya satır olarak eklenir. Durum sütununu ekibinizle birlikte kullanabilirsiniz.",
  minutes: 5,
  steps: [
    { id: "s-1", text: "[[sheets.new|https://sheets.new]] ile yeni bir tablo açın ve “Destek Mesajları” gibi bir ad verin." },
    { id: "s-2", text: "Aşağıdaki başlık satırını kopyalayın, tablodaki A1 hücresine yapıştırın. Başlıklar aynen böyle yazılmalıdır, yoksa veriler yanlış sütuna düşer." },
    { id: "s-3", text: "Sağ üstteki “Paylaş”a basın ve Google Cloud'da oluşturduğunuz hizmet hesabının e-posta adresini (…@…iam.gserviceaccount.com) “Düzenleyen” olarak ekleyin. Bu adım atlanırsa n8n tabloya yazamaz." },
    { id: "s-4", text: "Tablonun adres çubuğundaki bağlantıyı kopyalayıp sihirbazdaki “Tablo adresi” kutusuna yapıştırın. Kimliği siz ayıklamak zorunda değilsiniz." },
  ],
};

/** Seçime göre gereken entegrasyonlar, kurulum sırasıyla. */
export function integrationsFor(c: SupportConfig): Integration[] {
  const list = [n8n, translate];
  if (c.whatsapp || c.notifyWhatsapp) list.push(whatsapp);
  if (c.email || c.notifyEmail) list.push(email);
  if (c.logSheet) list.push(sheets);
  return list;
}

export const importSteps: GuideStep[] = [
  { id: "i-1", text: "Bu sayfadaki “İş akışı dosyasını indir” düğmesiyle .json dosyasını bilgisayarınıza kaydedin." },
  { id: "i-2", text: "n8n'de “Workflows” sayfasında yeni bir iş akışı açın. Sağ üstteki ⋯ menüsünden “Import from File” (Dosyadan içe aktar) seçeneğini seçin ve dosyayı yükleyin." },
  { id: "i-3", text: "Üzerinde kırmızı/turuncu uyarı olan her kutuya çift tıklayın. “Credential to connect with” alanından, önceki adımlarda oluşturduğunuz kimlik bilgisini seçin ve kaydedin." },
  { id: "i-4", text: "Sağ üstteki iş akışı adının yanındaki anahtarla (Active / Publish) akışı etkinleştirin. Etkinleştirmeden WhatsApp mesajları alınmaz." },
];

export const testMessages = [
  { text: "Hello, I'd like to know your opening hours.", expect: "Öncelik DÜŞÜK; İngilizce karşılama yanıtı gelir." },
  { text: "Hallo, ich habe ein Problem mit meiner Bestellung.", expect: "Öncelik ORTA; Türkçe çeviri ve Almanca yanıt." },
  { text: "Это срочно! Мне нужна помощь немедленно.", expect: "Öncelik YÜKSEK; Rusça yanıt, bildirim anında gelir." },
] as const;

export const troubleshooting = [
  {
    q: "WhatsApp mesajı gönderiyorum ama hiçbir şey olmuyor.",
    a: "Akışın etkin (Active/Publish) olduğunu, n8n adresinizin HTTPS ile açıldığını ve Meta uygulamanızın Canlı moda alındığını kontrol edin. Test numarasıyla çalışıyorsanız gönderen numaranın Meta'da “alıcı” olarak doğrulandığından emin olun. n8n'deki “Executions” sayfasında akışın tetiklenip tetiklenmediğini görebilirsiniz.",
  },
  {
    q: "Mesaj geliyor ama müşteriye yanıt gitmiyor.",
    a: "WhatsApp'ta Phone number ID'nin doğru olduğunu ve erişim anahtarının süresinin dolmadığını kontrol edin (geçici anahtar 24 saatte biter; kalıcı sistem kullanıcısı anahtarı kullanın). Müşteri 24 saatten uzun süre önce yazdıysa Meta serbest metin yanıtına izin vermez.",
  },
  {
    q: "Tabloya satır eklenmiyor ya da veriler kayıyor.",
    a: "Tabloyu hizmet hesabının e-postasıyla “Düzenleyen” olarak paylaştığınızdan, Google Sheets API'nin açık olduğundan ve ilk satırdaki başlıkların aynen yapıştırıldığından emin olun. Sayfa (sekme) adı sihirbazda yazdığınızla aynı olmalıdır.",
  },
  {
    q: "Çeviri düğümü hata veriyor.",
    a: "Google Cloud projenizde Cloud Translation API'nin etkin ve faturalandırmanın tanımlı olduğunu kontrol edin. Hizmet hesabı anahtarını doğru kopyaladığınızdan emin olun; private_key değeri “-----BEGIN” ile başlayıp “END PRIVATE KEY-----” ile bitmelidir.",
  },
  {
    q: "Aynı e-posta tekrar tekrar işleniyor.",
    a: "Bildirimler aynı gelen kutusuna düşüyorsa akış bunları atlar, ancak yine de yönetici bildirimlerini ayrı bir adrese göndermeniz önerilir. IMAP ayarlarında okunan postaların “okundu” işaretlendiğini kontrol edin.",
  },
  {
    q: "Öncelik beklediğim gibi çıkmıyor.",
    a: "Öncelik, “acil”, “sorun”, “urgent” gibi anahtar kelimelere göre belirlenir. “Özet ve Öncelik” kutusunu açın; en üstteki URGENT ve ISSUE listelerine kendi işinize özel kelimeler ekleyebilirsiniz.",
  },
] as const;

export const faq = [
  {
    q: "Teknik bilgim yok, yapabilir miyim?",
    a: "Evet. Kod yazmanız gerekmez. Sihirbaz sizi sırayla hesap açmaya, kimlik bilgilerini girmeye ve dosyayı yüklemeye yönlendirir. Her adımın yanında tahmini süre yazar; WhatsApp numarasının Meta tarafından doğrulanması ek zaman alabilir.",
  },
  {
    q: "Ek maliyet var mı?",
    a: "Otomasyon kendi hesaplarınızda çalıştığı için n8n, Meta WhatsApp Business ve Google Cloud kendi fiyatlandırmalarını uygular; bazılarında ücretsiz kota vardır. Güncel koşulları ilgili firmaların sitesinden kontrol edin.",
  },
  {
    q: "Şifrelerimi Adspine'e vermem gerekiyor mu?",
    a: "Hayır. Sihirbaz yalnızca işletme adı, bildirim adresi ve tablo adresi gibi gizli olmayan bilgileri ister. Şifreler ve erişim anahtarları doğrudan sizin n8n hesabınıza girilir.",
  },
  {
    q: "Mesajlara yapay zekâ ile mi yanıt veriliyor?",
    a: "Hayır. Müşteriye, sizin yazdığınız karşılama mesajı kendi diline çevrilerek gönderilir. Asıl cevabı ekibiniz verir. Bu sayede yanlış bilgi verme riski yoktur.",
  },
  {
    q: "Hangi dilleri destekliyor?",
    a: "Google Çeviri'nin desteklediği yüzlerce dil algılanır ve çevrilir. Öncelik tespiti Türkçe ve İngilizce anahtar kelimelere göre yapılır; çeviri sonrası metin üzerinde de çalıştığı için çoğu dilde sonuç verir.",
  },
] as const;
