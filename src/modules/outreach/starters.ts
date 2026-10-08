import type { Step } from "./sequence-schema";

/** Hazır otomasyon şablonları ("Şablondan başla"). Metinler düzenlenebilir; değişkenler kişiye göre doldurulur. */

type StarterStep = Omit<Step, "id" | "position">;

const email = (type: "tanisma" | "takip" | "son", delayDays: number, subject: string, body: string): StarterStep => ({
  kind: "email",
  delayMinutes: delayDays * 1440,
  enabled: true,
  variants: [{ key: "A", mode: "sablon", subject, body, ai: { type, tone: "samimi", length: "kisa", extra: "" }, opener: false }],
  task: { title: "", notes: "" },
});

const call = (delayDays: number): StarterStep => ({
  kind: "arama",
  delayMinutes: delayDays * 1440,
  enabled: true,
  variants: [{ key: "A", mode: "sablon", subject: "", body: "", ai: { type: "takip", tone: "samimi", length: "kisa", extra: "" }, opener: false }],
  task: { title: "Ara: {{company|firma}}", notes: "E-postalara yanıt gelmedi; kısa bir arama ile görüşme önerin." },
});

export const starters: { id: string; name: string; description: string; steps: StarterStep[] }[] = [
  {
    id: "tanisma-takip",
    name: "Tanışma + 2 takip",
    description: "İlk e-posta, 3 gün sonra takip, 5 gün sonra son hatırlatma. Çoğu hizmet işi için iyi bir başlangıç.",
    steps: [
      email("tanisma", 0, "{{company|Sizin için}} kısa bir soru", "Merhaba {{first_name|}},\n\n{{sender_company}} adına yazıyorum. {{company|İşletmenize}} benzer işletmelere hizmet veriyoruz ve sizinle de kısa bir tanışma görüşmesi yapmak isterim.\n\nBu hafta 10 dakikalık bir görüşme için uygun bir zamanınız var mı?"),
      email("takip", 3, "", "Merhaba {{first_name|}},\n\nGeçen sefer yazdığım mesaja kısaca geri dönüyorum. Size nasıl faydalı olabileceğimizi 10 dakikada anlatabilirim.\n\nKısa bir görüşme için size uygun bir gün ve saat yazabilir misiniz?"),
      email("son", 5, "", "Merhaba {{first_name|}},\n\nBu konuda size daha fazla yazmayacağım. Şu an uygun değilse sorun değil; ileride konuşmak isterseniz bu e-postayı yanıtlamanız yeterli.\n\nİyi çalışmalar dilerim."),
    ],
  },
  {
    id: "eposta-arama",
    name: "E-posta + arama",
    description: "İki e-posta ve ardından Plan'a düşen bir arama görevi. Telefonla da ulaşmak isteyenler için.",
    steps: [
      email("tanisma", 0, "Kısa bir tanışma", "Merhaba {{first_name|}},\n\n{{sender_company}} adına yazıyorum. {{company|İşletmenizle}} ilgili aklımda küçük bir fikir var; kısa bir görüşmede paylaşmak isterim.\n\nBu hafta 10 dakikanız olur mu?"),
      email("takip", 3, "", "Merhaba {{first_name|}},\n\nÖnceki mesajıma kısaca geri dönüyorum. Fikri birkaç cümleyle yazıya da dökebilirim; hangisi size daha uygun: kısa bir telefon görüşmesi mi, yazılı özet mi?"),
      call(2),
    ],
  },
  {
    id: "teklif-sonrasi",
    name: "Teklif sonrası takip",
    description: "Teklif gönderdiğiniz kişilere nazik hatırlatmalar.",
    steps: [
      email("takip", 2, "Teklifimiz hakkında", "Merhaba {{first_name|}},\n\nGönderdiğimiz teklife dönüş yapmak istedim. Aklınıza takılan bir yer ya da değiştirmek istediğiniz bir kısım varsa memnuniyetle konuşurum.\n\nBu hafta kısa bir görüşme yapabilir miyiz?"),
      email("son", 5, "", "Merhaba {{first_name|}},\n\nTeklifimizle ilgili son bir not bırakmak istedim. Karar sürecinizde ek bir bilgiye ihtiyaç duyarsanız bu e-postayı yanıtlamanız yeterli; aksi halde sizi daha fazla meşgul etmeyeceğim."),
    ],
  },
];
