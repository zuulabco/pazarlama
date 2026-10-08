# Ortak kişi havuzu: tasarım (taslak, hukuki onay beklenir)

**Amaç:** Sağlayıcıdan (Apify, kayıt başına ~0,003 $) gelen kişi kayıtlarını bir kez ödeyip, aynı kaydı sonraki aramalarda sağlayıcıya sormadan
sunmak; geri dönen/yanıt gelen e-postalardan öğrenerek veri kalitesini artırmak.

**Şu anki durum:** Her arama sonucu kullanıcıya özel `outreach_lead_searches.items` içinde tutuluyor (7 gün sonra siliniyor); eklenen kişiler
kullanıcının `outreach_contacts` tablosuna yazılıyor. Aynı kişiyi başka bir kullanıcı aradığında sağlayıcıya yeniden ödeme yapılıyor.

## Veri modeli (yeni migration)

`lead_pool` (kullanıcıdan bağımsız, yalnızca `service_role` erişir):
- `email_hash` (sha-256 küçük harf e-posta) benzersiz anahtar; `email_enc` (şifreli e-posta; yalnızca açığa çıkarma anında çözülür)
- `first_name`, `last_name`, `job_title`, `company`, `domain`, `city`, `country`, `industry`, `size_range`, `linkedin_url`
- `source` (örn. `apify:leads-finder`), `first_seen_at`, `last_seen_at`, `verified_at`
- `bounce_count`, `reply_count`, `status`: `gecerli` · `riskli` · `gecersiz` · `silindi`
- `removal_requested_at` (kişinin silme talebi → kayıt `silindi`, havuzdan dönmez)

`lead_pool_optout`: silme talebinde bulunan e-posta özetleri (yeniden eklenmeyi önler).

## Arama akışı

1. Arama gelince filtreler havuza sorulur (unvan, ülke/şehir, sektör, büyüklük, anahtar kelime).
2. Havuz istenen sayıyı karşılıyorsa **sağlayıcıya gidilmez**; sonuç havuzdan döner (maskeli, bugünkü gibi).
3. Karşılamıyorsa yalnızca **eksik sayı** kadar sağlayıcıdan istenir; gelen tüm kayıtlar havuza yazılır.
4. `gecersiz`/`silindi` kayıtlar ve kullanıcının kara listesindekiler hiçbir zaman döndürülmez.
5. Kayıt 90 günden eskiyse açığa çıkarırken (kredi düşmeden önce) yeniden doğrulanır; doğrulanamazsa kredi düşmez.

## Öğrenme döngüsü (kod tarafı küçük)

- E-posta geri dönerse (`bounce`) havuzdaki kayıt `gecersiz`; diğer kullanıcılar bu adres için kredi harcamaz.
- Yanıt gelirse `gecerli` ve `verified_at` güncellenir.
- Abonelikten çıkma yalnızca o kullanıcının kara listesine işlenir; havuz kaydı etkilenmez (kişi silme talebi ayrıdır).

## Gizlilik ve hukuk (kapı koşulları)

- Özellik **`LEAD_POOL=1` ortam değişkeniyle** açılır; varsayılan kapalı. Hukukçu onayı olmadan açılmaz.
- Veri sorumlusu olunur: VERBİS kaydı, aydınlatma metni (kaynak ve amaç), saklama süreleri (örn. 24 ay kullanılmayan kayıt silinir).
- **Silme talebi sayfası** (`/veri-silme`): e-posta girilir, doğrulama bağlantısı gönderilir, onaylanınca kayıt `silindi` ve özet `lead_pool_optout`'a yazılır.
- Sağlayıcı kullanım koşulları (Apify aktörü ve onun kaynağı) verinin yeniden kullanımına izin vermiyorsa bu özellik açılmaz.
- Kullanıcıya gösterilen veri her zaman maskeli kalır; e-posta yalnızca açığa çıkarmada (kredi karşılığı) verilir.

## Aşamalar

| Aşama | İçerik | Bağımlılık |
|---|---|---|
| A | `lead_pool` + `lead_pool_optout` migration; `pool.ts` (yaz/oku/ara); sağlayıcı sonuçlarını havuza yazma | Yok (bayrak kapalı) |
| B | Aramada havuzdan servis + eksik kadar sağlayıcıya gitme | Hukuki onay |
| C | Geri dönen/yanıt gelenlerden kalite işaretleme | A |
| D | `/veri-silme` sayfası ve aydınlatma metni güncellemesi | Hukuki onay (B ile birlikte) |
| E | Havuz bakım işi: eski kayıtları doğrula/sil | B |

**Tahmini etki:** Ayni kitleye (örn. "İstanbul'da pazarlama müdürleri") ikinci ve sonraki aramalar neredeyse bedava; veri kalitesi
kullandıkça artar. Havuz büyüdükçe listeleme havuzunu (aylık) cömert tutmak maliyeti artırmaz.
