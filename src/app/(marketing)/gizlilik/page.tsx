import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik ve KVKK Aydınlatma Metni",
  description: "Adspine'in kişisel verileri hangi amaçla, hangi hukuki sebeple işlediği ve haklarınız.",
  alternates: { canonical: "/gizlilik" },
};

// TODO(yasal): Köşeli parantezli alanlar veri sorumlusu bilgileriyle doldurulmalı ve metin
// yayına almadan önce bir hukukçuya kontrol ettirilmeli.
const controller = {
  name: "[Şirket unvanı]",
  address: "[Adres]",
  email: "[kvkk@alanadi.com]",
};

const sections = [
  {
    title: "Veri sorumlusu",
    body: [
      `Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatıyla ${controller.name} ("Adspine") tarafından hazırlanmıştır. Adres: ${controller.address}.`,
    ],
  },
  {
    title: "İşlenen kişisel veriler",
    body: [
      "Kimlik ve iletişim: ad soyad, e-posta adresi; Google ile girişte Google hesabınızın adı, e-postası ve profil görseli.",
      "Müşteri işlem: hesabınızı kurarken verdiğiniz işletme bilgileri, hizmetleriniz ve hedef pazar tercihleriniz; yaptığınız aramalar ve sorduğunuz sorular.",
      "İşlem güvenliği: oturum bilgileri, IP adresi ve teknik kayıtlar.",
    ],
  },
  {
    title: "İşleme amaçları ve hukuki sebepler",
    body: [
      "Hesabınızın oluşturulması, oturum yönetimi ve hizmetin sunulması: sözleşmenin kurulması ve ifası (KVKK m. 5/2-c).",
      "Hizmet güvenliğinin sağlanması ve kötüye kullanımın önlenmesi: veri sorumlusunun meşru menfaati (KVKK m. 5/2-f) ve hukuki yükümlülükler (KVKK m. 5/2-ç).",
    ],
  },
  {
    title: "Aktarım",
    body: [
      "Hizmetin sunulabilmesi için veriler; kimlik doğrulama (Google Firebase), barındırma (Vercel), veritabanı (Supabase), kişi verisi sağlama (Apify) ve yapay zekâ ile değerlendirme (TypeSafe, NVIDIA) hizmet sağlayıcılarına aktarılabilir. Bu sağlayıcıların bir kısmı yurt dışında bulunduğundan aktarım KVKK m. 9'da öngörülen güvencelerle yapılır.",
    ],
  },
  {
    title: "Google (Gmail) hesabı bağlantısı",
    body: [
      "Gönderici adresi olarak Gmail ya da Google Workspace hesabınızı bağlarsanız Adspine, yalnızca sizin onayınızla ve iki izin için Google'dan erişim ister: e-posta göndermek (gmail.send) ve gelen kutunuza gelen yanıtları okumak (gmail.readonly).",
      "Gönderme izni, kampanya e-postalarınızı sizin adınıza ve sizin adresinizden iletmek için kullanılır. Okuma izni yalnızca Adspine'dan gönderdiğiniz e-postalara verilen yanıtları, geri dönen (ulaşmayan) e-posta bildirimlerini ve ofis dışı otomatik yanıtları belirlemek için kullanılır. Gelen kutunuza yeni düşen iletiler bu amaçla başlıklarına bakılarak taranır; Adspine'dan gönderilmiş bir e-postaya ait olmayan hiçbir ileti saklanmaz, kullanılmaz ve kimseyle paylaşılmaz.",
      "Saklanan veriler: gönderdiğimiz e-postaların kaydı, bunlara gelen yanıtların metni ve gönderen bilgisi, yanıt etiketi ve Gmail erişim yenileme anahtarı (şifrelenmiş olarak). Bu veriler yalnızca size, Gelen kutusu ve raporlar ekranlarında gösterilir; reklam amacıyla kullanılmaz, satılmaz ve insanlar tarafından okunmaz (güvenlik, hukuki yükümlülük ya da sizin açık talebiniz dışında). Yanıtın durumunu (ilgili, ilgisiz vb.) belirlemek için yanıt metni bir yapay zekâ hizmet sağlayıcısına gönderilebilir; bu veriyle yapay zekâ modeli eğitilmez.",
      "Adspine'ın Google API'lerinden aldığı bilgileri kullanması ve başka bir uygulamaya aktarması, sınırlı kullanım gereklilikleri dahil Google API Hizmetleri Kullanıcı Verileri Politikası'na uygundur (https://developers.google.com/terms/api-services-user-data-policy).",
      "Erişimi dilediğiniz zaman Google Hesabı > Güvenlik > Hesabınıza erişimi olan üçüncü taraf uygulamalar bölümünden kaldırabilir ya da Adspine'da gönderici adresini silerek bağlantıyı koparabilirsiniz; gönderici adresi silindiğinde erişim anahtarı da silinir.",
    ],
  },
  {
    title: "Haklarınız",
    body: [
      "KVKK m. 11 uyarınca verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini veya silinmesini isteme, aktarıldığı üçüncü kişileri bilme ve kanuna aykırı işleme nedeniyle zararın giderilmesini talep etme haklarına sahipsiniz.",
      `Başvurularınızı ${controller.email} adresine iletebilirsiniz. Başvurular en geç 30 gün içinde ücretsiz olarak sonuçlandırılır.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-page px-4 pt-8 pb-20 sm:px-6 sm:pt-12 sm:pb-28">
      <div className="max-w-prose">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Gizlilik ve KVKK Aydınlatma Metni</h1>
        {sections.map((s) => (
          <section key={s.title} className="mt-10">
            <h2 className="text-lg font-semibold tracking-tight">{s.title}</h2>
            {s.body.map((p) => (
              <p key={p} className="mt-3 text-muted">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
