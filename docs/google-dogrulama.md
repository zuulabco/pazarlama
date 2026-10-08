# Google OAuth: herkesin Gmail bağlayabilmesi için

**Belirti:** Gönderici adresi olarak "Google ile bağlan" denince Google "Erişim engellendi / uygulama doğrulanmadı" benzeri bir hata verir
(giriş yapmak sorun değildir; yalnızca Gmail izinleri etkilenir).

**Neden:** OAuth uygulaması "Test" durumundadır. Test durumunda yalnızca "Test kullanıcıları" listesine eklenen hesaplar bağlanabilir.
Üstelik Gmail izinleri Google tarafından hassas/kısıtlı sayıldığı için herkese açık kullanım doğrulama ister.

| İzin | Sınıf | Doğrulama |
|---|---|---|
| `gmail.send` | Hassas | OAuth doğrulaması (demo videosu, gerekçe) |
| `gmail.readonly` | Kısıtlı | OAuth doğrulaması **+ yıllık güvenlik değerlendirmesi (CASA)** |

## Aşama 1: Herkese açmak (hemen)

Google Cloud → **Google Auth Platform → Hedef kitle (Audience) → "Uygulamayı yayınla" (Publish app → In production)**.

- Yayınlandıktan sonra test kullanıcısı eklemek gerekmez; herkes bağlanabilir.
- Doğrulama bitene kadar kullanıcılar **"Google bu uygulamayı doğrulamadı"** uyarısı görür: *Gelişmiş → Adspine'a git (güvenli değil)*.
- Doğrulanmamış uygulamada en çok **100 kullanıcı** bağlanabilir (hesap başına bir kez sayılır).
- Uyarı ekranı güven kırar; bu yüzden Aşama 2'ye başlanmalıdır.

## Aşama 2: Doğrulama (uyarıyı kaldırır, 100 sınırını açar)

Hazır olanlar (kodda/sitede):
- Gizlilik politikası: `/gizlilik` içinde "Google (Gmail) hesabı bağlantısı" bölümü ve Sınırlı Kullanım beyanı var.
  **Eksik:** metindeki `[Şirket unvanı]`, `[Adres]`, `[kvkk@alanadi.com]` alanları gerçek bilgilerle doldurulmalı.
- İzinler yalnızca bağlama anında istenir; gerekçeler aşağıda.
- Bağlantı silinince erişim anahtarı Google'da iptal edilir.

Kullanıcının hazırlayacakları:
1. **Alan adı doğrulaması:** `adspine.app` Google Search Console'da doğrulanmalı; "Yetkili alan adları"na eklenmeli.
2. **Marka bilgileri:** uygulama adı, logo, ana sayfa (`https://www.adspine.app`), gizlilik politikası bağlantısı (`/gizlilik`), destek e-postası.
3. **Kullanım koşulları** sayfası (önerilir).
4. **Demo videosu** (YouTube, liste dışı): OAuth onay ekranı (adres çubuğunda client_id görünsün) → bağlama → bir e-posta gönderme →
   gelen yanıtın Gelen kutusunda görünmesi → bağlantıyı silme.
5. **İzin gerekçeleri** (Google formuna yapıştırılacak):
   - `gmail.send`: "Kullanıcının kendi Gmail adresinden, kendi hazırladığı soğuk e-posta dizilerini kendi adına göndermek. Başka bir amaçla kullanılmaz."
   - `gmail.readonly`: "Kullanıcının gönderdiği e-postalara verilen yanıtları, geri dönen e-posta bildirimlerini ve ofis dışı yanıtlarını belirleyip
     dizinin ilgili kişide durmasını ve yanıtın kullanıcıya gösterilmesini sağlamak. Yalnızca uygulamadan gönderilmiş iletilere ait olmayan iletiler saklanmaz."
6. **CASA Tier 2** (kısıtlı izin `gmail.readonly` için): Google'ın onayladığı bir değerlendirici (örn. TAC Security, Prescient, DEKRA) ile
   yılda bir yapılır; ücretlidir ve haftalar sürer. Başvuru, doğrulama formundan sonra Google'dan gelen yönlendirmeyle başlar.

## Seçenek: CASA'dan kaçınmak

`gmail.readonly` olmadan yalnızca `gmail.send` ile doğrulama yapmak kolaydır (CASA gerekmez), ama yanıtlar Google hesabından otomatik okunamaz.
Bu durumda Google kullanıcıları için yanıt takibi IMAP (uygulama şifresi) ile yapılır; bu da başta kaldırılan zahmeti geri getirir.
Önerilen yol: Aşama 1 ile başlamak, Aşama 2'yi paralel yürütmek.
