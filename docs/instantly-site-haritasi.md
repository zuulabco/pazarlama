# Instantly site haritası ve Adspine karşılaştırması

8 Ekim 2026'da `app.instantly.ai` oturum açık hesapla gezildi. Kaynaklar: canlı ekranlar, `tasarimm/` klasöründeki ekran görüntüsü ve CSS. Aşağıdaki "Bizde" sütunu bu tarihteki durumu gösterir.

## 1. Uygulama kabuğu

Sol kenarda yalnızca simge içeren dikey çubuk (rail), üstte sayfa başlığı ve sekmeler, sağda açılıp kapanan **Instantly AI** yan paneli (sohbet + hazır eylem kartları). Koyu tema.

| Rail | Yol | Ne yapar | Bizde |
|---|---|---|---|
| Copilot | `/app/copilot` | Yapay zekâ asistanı (kampanya kur, filtre kur, rapor sor) | Yok |
| SuperSearch | `/app/supersearch` | Lead veritabanında arama | **Kişi bul** (v2 ile yeniden yapılıyor) |
| Engage | `/app/engage` | Kampanya listesi ve oluşturucu | **Kampanyalar** |
| Agents | `/app/agents` | Otonom yapay zekâ satış ajanları | Yok (kapsam dışı) |
| CRM | `/app/crm/home` | Görevler, gelen kutusu, fırsatlar, lead'ler | Kısmen (Takip + Plan) |
| Accounts | `/app/accounts` | Gönderici hesapları, sağlık, ısındırma, deliverability testleri | **Gönderici adresleri** (ısındırma yok) |
| Unibox | `/app/unibox` | Tüm yanıtların tek gelen kutusu | **Yok** |
| Reports | `/app/reports` | Raporlar | Kampanya içi rapor var, genel yok |

## 2. SuperSearch (`/app/supersearch`)

Üst sekmeler: **SuperSearch · Leads · Website Visitors**.

**Başlangıç ekranı ("Start a new search")**
- Doğal dil arama kutusu + **AI Search** düğmesi ("Engineers in New York in software companies with more than 500 employees").
- Üç kart: **Search the database** (unvan, kıdem, konum, süzgeçler ya da AI), **Start from companies** (9 entegrasyon kaynağı: e-ticaret, teknoloji yığını, lookalike…), **Bring your own** (CSV, kayıtlı listeler).
- Sağ panel: "Build From A Description" ve "Lookalike Search" (alan adından benzer şirket).

**Sol süzgeç çubuğu** (açılır gruplar, seçili süzgeç sayısı rozeti): Job Titles (Is Any Of / Is Not Any Of, Management Levels, Department), Location (any / not any), Industries (any / not any), Keywords, Employees, Revenue, Lookalike Domain, Domains, Website Visitors, Job Listing, Name, Company Name, Technologies, Signals, News, Funding Type. Altta iki anahtar: **Skip already owned**, **One lead per company**; en altta **Load** (kayıtlı aramayı yükle) ve **Save**.

**Unvan seçici:** yazdıkça gerçek unvan önerileri çıkar (Marketing Manager, Director of Marketing, Head of Marketing…); her seçili unvanda Contains / Exact anahtarı.

**Sonuç ekranı:** "850.746 results found"; ücretsiz planda ek sonuçlar için "Unlock … more results" bandı. Tablo sütunları: Full name, Title, Company (logo), Location, LinkedIn (sağa kaydırınca diğerleri). Sağ üstte **Enrich & AI**.

**Enrich & AI penceresi ("Find Emails & Enrich")**
- Work Email (~1,5 kredi/satır, sağlayıcı zinciri simgeleri), Fully Enriched Profile (0,5 kredi/satır), AI Enrichment (özel).
- "Results saved to: New List (auto-created)", "You have 1.000 credits", **Enrich 100 leads · ~200 credits**.

Mantık: **önce ücretsiz göz at, sonra kredi harcayarak e-postayı aç.**

**Leads sekmesi (`/app/contacts`):** sol çubukta All Leads, Lists (+), Campaigns (+); tablo Full name / Title / Company…; boşken "Upload a list / Find new leads / Connect a source".

**Website Visitors (`/app/website-visitors`):** sitenize gelen şirketleri tanıma (piksel gerektirir).

## 3. Engage (`/app/engage`)

- Liste: arama, durum süzgeci, etiket süzgeci, ayar dişlisi, **Create New**. Sütunlar: Name, Type, Status, Tags, Progress, Activity (Sent), Outcome (Opportunities), Goal. Satır seçince **Delete**.
- "What would you like to create?" → **Cold Outreach Campaign** (veya AI Sales Agent).
- Oluşturucu (`/app/campaign/{id}/…`): sekmeler **Analytics · Editor · Leads · Settings**, üstte durum rozeti (Draft) ve **Launch**.
  - Başlangıç penceresi: **Continue manually / Generate with AI**.
  - **Editor:** konu satırı + gövde, sağda varyantlar (Add variant / Edit variant A), alt toolbar (biçim, değişken, bağlantı, görsel, imza, AI, masaüstü/mobil önizleme, HTML), "+" ile yeni adım.
  - **Leads:** "Who do you want to reach?" (AI arama + Find Leads), "Recommended for you by SuperSearch", ya da Upload CSV / Enter Emails Manually / Import From Google Sheets / Previous Supersearch.
  - **Settings:** açılır bölümler — *Accounts To Use*; *Schedule & Limits* (zamanlama adı, "office hours" ya da özel, saat dilimi, başlangıç/bitiş tarihi, günlük limit 30); *Advanced settings* → Basic Deliverability (yanıtta durdur, açılma izleme, bağlantı izleme), Delivery Optimization (yalnızca metin, ilk e-posta metin), Sending Rules, Advanced Deliverability, CRM & Tags (sahip, etiketler), CC & BCC.
  - Sağ panelde "Write my email sequence", "Review my copy", "Check my sequence for spam words", "AI Spintax Writer".

## 4. Accounts (`/app/accounts`)

Sekmeler: **Accounts · Deliverability Tests**. Süzgeçler: Type, Status, Tags. Tablo: Email, Tags, Type, Status, Health score. Düğme: **Add or Buy Accounts** (mevcut inbox bağla — Google/Microsoft/SMTP, hazır ısınmış inbox satın al, warmup aç).

## 5. Unibox (`/app/unibox`)

Üç bölme: sol **durum etiketleri** (Lead, Interested, Meeting booked, Meeting completed, Won, Out of office, Wrong person, Not interested, Lost) ve süzgeçler (All Campaigns, AI Sales Agents, All Inboxes, More); orta konuşma listesi; sağ mesaj/yanıt alanı. Sağ panelde "Enable AI Reply Agent".

## 6. CRM (`/app/crm/home`)

Sekmeler: Tasks, Inbox, Opportunities, Leads. Ana sayfa: "Here's what needs your attention", bu hafta (To do / Overdue / Done), ağırlıklı pipeline, closed won.

## 7. Reports (`/app/reports`)

Sekmeler: Overview, Outreach, Sales, AI Agents, Automation, Workspaces + tarih aralığı. Kartlar: Total sent, Sequence started, Reply rate, Open rate, Click rate, Positive reply rate, Opportunities, Conversions.

## 8. Agents (`/app/agents`)

Liste (Name, Type, Status, Activity, Outcome) + **Create Agent**.

---

# Adspine'da eşleştirme ve boşluklar

| Instantly | Adspine'daki karşılığı | Durum |
|---|---|---|
| SuperSearch: süzgeç çubuğu, sonuç tablosu, AI arama, Save/Load | **Kişi bul v2** | Bu aşamada yapılıyor |
| Önce göz at, sonra kredi harca | Önizleme listesi + "Seçilenleri ekle (n kredi)" | Bu aşamada |
| Enrich & AI penceresi | "Kişileri ekle" penceresi (e-posta bul, liste seç) | Bu aşamada |
| Skip already owned / One lead per company | Aynı adı taşıyan iki anahtar | Bu aşamada |
| Start from companies | Müşteri bul (Google Haritalar) → Kişiler | Bağlantı kurulur |
| Bring your own | CSV içe aktar, Kişiler | Var |
| Leads: All Leads / Lists / Campaigns | Kişiler: listeler | Kısmen (kampanya görünümü yok) |
| Engage tablosu | Kampanyalar (kart listesi) | Tabloya çevrilecek |
| Kampanya Settings bölümleri | Ayarlar sekmesi | Çoğu var; ek: "yalnızca metin", etiketler |
| Accounts + Health + Warmup | Gönderici adresleri | **Isındırma ve sağlık skoru yok** |
| Deliverability Tests | — | Yok |
| Unibox | — | **Yok** (yanıtlar yalnızca olay günlüğünde) |
| Reports (genel) | — | **Yok** |
| CRM: görevler/fırsatlar | Plan + Takip | Kısmen |
| Instantly AI paneli / Copilot | — | Yok |
| Agents | — | Kapsam dışı |

## Veri kaynağı farkı (önemli)

Instantly kendi 450M+ kayıtlık veritabanına sahip olduğu için tüm sonuçları ve sayacı ücretsiz gösterebiliyor. Adspine kiralık bir sağlayıcı kullanıyor ve her kayıt için ücret ödüyor; bu yüzden:
- Toplam sonuç sayısı gösterilemez; arama sınırlı bir örnekle (25–100 kişi) çalışır ve günlük ücretsiz listeleme hakkı pakete göre sınırlıdır.
- Kredi, kişi eklenirken (e-posta açılırken) düşer; listelenip eklenmeyen kişiler için düşmez.

## Aşamalar

1. **SuperSearch parity (şimdi):** Kişi bul v2.
2. **Unibox:** yanıtları saklama, durum etiketleri, üç bölmeli gelen kutusu, cevap yazma.
3. **Accounts:** sağlık skoru, ısındırma (kademeli limit + havuz), deliverability testi.
4. **Engage:** kampanya tablosu, etiketler, ilerleme sütunu, gelişmiş ayarlar.
5. **Reports:** genel raporlar.
6. **Copilot paneli:** yapay zekâ sohbet yan paneli.
