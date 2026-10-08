import { describe, expect, it } from "vitest";
import { dayTable, matchFavorite, parseMessages, parsePlanOutput } from "./parse";

// 2026-10-08 Perşembe 12:20 (Türkiye saati) = 09:20 UTC
const now = new Date("2026-10-08T09:20:00Z");

describe("dayTable", () => {
  it("Türkiye saatine göre bugünden başlayan gün adlı tablo üretir", () => {
    const lines = dayTable(now, 4).split("\n");
    expect(lines).toEqual(["2026-10-08 Perşembe (bugün)", "2026-10-09 Cuma (yarın)", "2026-10-10 Cumartesi", "2026-10-11 Pazar"]);
  });
  it("gece yarısına yakın UTC saatinde Türkiye gününü kullanır", () => {
    // 21:30 UTC = ertesi gün 00:30 Türkiye
    expect(dayTable(new Date("2026-10-08T21:30:00Z"), 1)).toBe("2026-10-09 Cuma (bugün)");
  });
});

describe("parseMessages", () => {
  it("tarih tablosunu, şu anı ve veri etiketini içerir", () => {
    const [system, user] = parseMessages("Cuma 14:30 Moda Kafe ile görüşme", now);
    expect(system.content).toContain("2026-10-08 Perşembe 12:20");
    expect(system.content).toContain("2026-10-16 Cuma");
    expect(user.content).toBe("<yazi>Cuma 14:30 Moda Kafe ile görüşme</yazi>");
  });
});

describe("parsePlanOutput", () => {
  const ok = { kind: "toplanti", title: "Moda Kafe ile görüşme", date: "2026-10-09", time: "14:30", endTime: "15:30", allDay: false, withName: "Moda Kafe", location: null, details: null };

  it("geçerli çıktıyı olduğu gibi alır", () => {
    expect(parsePlanOutput(ok)).toEqual(ok);
  });
  it("bozuk tür, saat ve alanları güvenli değerlere çevirir", () => {
    const r = parsePlanOutput({ ...ok, kind: "toplantı??", time: "25:99", endTime: "x", withName: 5 });
    expect(r.kind).toBe("gorev");
    expect(r.time).toBeNull();
    expect(r.endTime).toBeNull();
    expect(r.withName).toBeNull();
  });
  it("bitiş başlangıçtan önceyse bitişi atar; tüm gün planda saati yok sayar", () => {
    expect(parsePlanOutput({ ...ok, endTime: "13:00" }).endTime).toBeNull();
    expect(parsePlanOutput({ ...ok, allDay: true }).time).toBeNull();
  });
  it("başlık ya da tarih yoksa hata verir", () => {
    expect(() => parsePlanOutput({ ...ok, title: "" })).toThrow();
    expect(() => parsePlanOutput({ ...ok, date: "yarın" })).toThrow();
  });
});

describe("matchFavorite", () => {
  const favs = [
    { id: "1", name: "Moda Kafe" },
    { id: "2", name: "Lale Diş Kliniği" },
    { id: "3", name: "Dental Plus" },
    { id: "4", name: "Dental Art" },
  ];
  it("firma adının tamamı yazıda geçiyorsa onu bulur (Türkçe harfe duyarsız)", () => {
    expect(matchFavorite("cuma moda kafe ile görüşme", favs)?.id).toBe("1");
    expect(matchFavorite("LALE DIS KLINIGI'ni ara", favs)?.id).toBe("2");
  });
  it("ilk kelime yalnızca bir firmayı gösteriyorsa onu bulur", () => {
    expect(matchFavorite("Lale ile görüş", favs)?.id).toBe("2");
  });
  it("belirsizse ya da eşleşme yoksa null döner", () => {
    expect(matchFavorite("Dental ile görüş", favs)).toBeNull();
    expect(matchFavorite("kimseyle görüşme", favs)).toBeNull();
  });
});
