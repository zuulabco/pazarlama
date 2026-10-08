# Adspine arayüz kuralları

Bu kurallar sitenin tamamı için geçerlidir. Yeni bir ekran eklerken önce buradaki ortak bileşenleri kullanın.

## 1. Açılıp kapanan her şey yumuşakça hareket eder

"Tak" diye anında açılan hiçbir alan olmamalı.

| Ne                          | Kullanılacak bileşen                          |
| --------------------------- | --------------------------------------------- |
| Akordiyon / SSS / satır detayı | `Disclosure` (`src/components/ui/disclosure.tsx`) |
| Koşullu soru, süzgeç grubu  | `Collapse` / `Reveal` (`collapse.tsx`, `reveal.tsx`) |
| Açılır liste (menü, öneri)  | `Select`, `ComboField` + `popover.module.css` |

- `<details>`/`<summary>` ve yerel `<select>` **kullanılmaz** (tarayıcıya göre anında açılırlar, görünümleri uyumsuzdur).
- Tüm hareketler `prefers-reduced-motion: reduce` altında kapanır.

## 2. Tekli seçimde etiket (chip) yok

- **Tekli seçim** kutularında seçilen değer, girdinin içinde düz metin olarak görünür (`ComboField single`).
- Etiket (chip) yalnızca **çoklu seçimde** vardır.
- Süzgeçlerde "Hepsi / Var / Yok" gibi seçenekler birleşik düğme grubudur (`Segmented`), gevşek hap düğmeleri değil.

## 3. Doğrulama, kullanıcı yazarken yapılır

- Geçersiz giriş işleme (arama, kayıt) başlamadan uyarılır; yükleme ekranı geçersiz girişte hiç gösterilmez.
- Doğrulanamayan bir ifade için "ekle" seçeneği çıkmaz; yerine neden eklenemediği yazılır.

## 4. Yükleme durumları

- Beklemeyi hissettiren tek bir animasyon (dört şekil) + **değişen** metin (ipuçları). Sabit "yükleniyor" yazısı kullanılmaz.
- Sonuçlar geldikçe liste dolar; kullanıcı işin bitmesini beklemez.
- Tek bir girdinin beklediği işlerde (örn. site analizi) kurulum ekranı kaplanmaz: girdinin çerçevesi yumuşak bir renk geçişiyle akar, altında dönen ifadeler görünür. Sayfayı bekleten işlerde (örn. hesap kaydı) dört şekilli animasyon kullanılır (`ShapeLoader` + `RotatingTips`, `src/components/ui`).

## 5. Tekrar yok

- Aynı bilgi arayüzde iki yerde sorulmaz (örn. web sitesi süzgeci tek yerdedir; hem yeni aramayı hem sonuçları etkiler).

## 6. Token'lar ve uygulama kabuğu

- Renk, yarıçap, gölge ve hareket değerleri `src/app/globals.css`'teki token'lardan gelir; bileşenlerde ham değer yazılmaz.
- Yeni bileşen, mevcut `rounded-control / row / panel` hiyerarşisini izler.
- **Palet (Instantly'den esinli):** nötr gri yüzeyler + tek mavi vurgu. `forest` dolgu (düğme, seçili öğe; üzerine `text-white`), `accent` mavi metin/simge (koyu zeminde daha açık mavi). Mavi metin için `text-accent`, dolgu için `bg-forest` kullanılır; `text-forest` kullanılmaz.
- **Tema:** panel varsayılan olarak koyudur (kayıtlı seçim yoksa); menüden açık tema seçilebilir. Marka sayfaları her zaman açıktır.
- **Kabuk:** giriş yapılmış alan `.app-shell` sınıfıyla çizilir (yoğun yazı ölçeği: gövde 14 px). Solda yalnızca simgeli dikey çubuk (`AppRail`; dar ekranda alt çubuk), içerik tam genişliktedir. Her sayfa kendi üst çubuğunu `SectionTabs` ile çizer: solda başlık, yanında alt görünümlerin sekmeleri. Sayfa içinde ikinci bir büyük başlık yinelenmez.
- **Liste ekranları** (kampanyalar, gönderici adresleri, kişiler): üstte arama + süzgeç + birincil eylem, altında tablo. Oluşturma ve ayar formları yan panel yerine `Modal` ile açılır.

## 7. Geri bildirim

- Kullanıcının başlattığı her kayıt/silme/güncelleme işlemi bir **toast** ile onaylanır (`toast()` ve `<Toaster />`, `src/components/ui/toast.tsx`). Sonuç belli olmadan işlem sessiz bırakılmaz.
- Geri alınabilen işlemde toast'ta "Geri al", gidilecek yer varsa "Firmalar" gibi bir eylem bulunur. Hatalar `kind: "error"` ile gösterilir.
- Toast'lar üst ortada, başlığın altında çıkar; alttaki yapay zekâ kutusuyla çakışmaz.
