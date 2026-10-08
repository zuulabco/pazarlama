import { describe, expect, it } from "vitest";
import { csvToContacts, mapHeaders, parseCsv, toCsv } from "./csv";

describe("parseCsv", () => {
  it("virgül, noktalı virgül ve sekme ayraçlarını otomatik bulur", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([["a", "b"], ["1", "2"]]);
    expect(parseCsv("a;b\n1;2")).toEqual([["a", "b"], ["1", "2"]]);
    expect(parseCsv("a\tb\n1\t2")).toEqual([["a", "b"], ["1", "2"]]);
  });
  it("tırnaklı alanları, tırnak kaçışını ve satır içi yeni satırı doğru okur", () => {
    expect(parseCsv('ad,not\r\n"Yılmaz, Ali","Dedi ki ""merhaba"""\r\n"Çok\nsatırlı",x')).toEqual([
      ["ad", "not"],
      ["Yılmaz, Ali", 'Dedi ki "merhaba"'],
      ["Çok\nsatırlı", "x"],
    ]);
  });
  it("BOM'u ve boş satırları atar", () => {
    expect(parseCsv("﻿a,b\n\n1,2\n")).toEqual([["a", "b"], ["1", "2"]]);
  });
});

describe("mapHeaders / csvToContacts", () => {
  it("Türkçe ve İngilizce başlıkları aksan ve büyük-küçük harf duyarsız eşler", () => {
    expect(mapHeaders(["Firma Adı", "E-Posta", "Şehir", "Telefon", "Web Sitesi", "Yetkili"])).toEqual({ company: 0, email: 1, city: 2, phone: 3, website: 4, name: 5 });
  });
  it("satırları alanlara çevirir ve tanınan sütunları bildirir", () => {
    const { rows, recognized } = csvToContacts("Firma;E-posta;Sehir\nLale Diş;info@lale.com;Kadıköy\nModa Kafe;;Moda");
    expect(recognized).toEqual(["company", "email", "city"]);
    expect(rows).toEqual([
      { company: "Lale Diş", email: "info@lale.com", city: "Kadıköy" },
      { company: "Moda Kafe", email: "", city: "Moda" },
    ]);
  });
  it("başlıksız dosyada @ içeren sütunu e-posta sayar; hiçbir şey tanınmazsa boş döner", () => {
    expect(csvToContacts("ali@firma.com\nveli@firma.com").rows).toEqual([{ email: "ali@firma.com" }, { email: "veli@firma.com" }]);
    expect(csvToContacts("x,y\n1,2").rows).toEqual([]);
  });
});

describe("toCsv", () => {
  it("BOM ekler, virgül ve tırnak içeren alanları kaçırır", () => {
    expect(toCsv(["ad", "not"], [["Ali, Veli", 'o "iyi"']])).toBe('﻿ad,not\r\n"Ali, Veli","o ""iyi"""\r\n');
  });
});
