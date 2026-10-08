import { isIP } from "node:net";

/** IPv6 adresini sekiz 16 bitlik parçaya açar; açılamazsa null. */
function hextets(ip: string): number[] | null {
  let text = ip.toLowerCase().split("%")[0];
  const v4 = text.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const p = v4[1].split(".").map(Number);
    text = text.slice(0, -v4[1].length) + ((p[0] << 8) | p[1]).toString(16) + ":" + ((p[2] << 8) | p[3]).toString(16);
  }
  const [head, tail, extra] = text.split("::");
  if (extra !== undefined) return null;
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const fill = tail === undefined ? 0 : 8 - left.length - right.length;
  if (fill < 0 || (tail === undefined && left.length !== 8)) return null;
  const all = [...left, ...Array<string>(fill).fill("0"), ...right].map((h) => parseInt(h || "0", 16));
  return all.length === 8 && all.every((n) => Number.isInteger(n) && n >= 0 && n <= 0xffff) ? all : null;
}

function privateV4(a: number, b: number, c: number): boolean {
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

/** İnternetten erişilebilir bir adres değilse (özel, döngü, bağlantı-yerel, çok noktaya yayın, ayrılmış) true. */
export function isPrivateIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) {
    const [a, b, c] = ip.split(".").map(Number);
    return privateV4(a, b, c);
  }
  if (kind === 6) {
    const h = hextets(ip);
    if (!h) return true;
    // IPv4'e eşlenmiş (::ffff:a.b.c.d) ve uyumlu (::a.b.c.d) adresler: içindeki IPv4'e bakılır.
    if (h.slice(0, 5).every((n) => n === 0) && (h[5] === 0xffff || h[5] === 0)) {
      return privateV4(h[6] >> 8, h[6] & 255, h[7] >> 8);
    }
    return (
      h.every((n) => n === 0) ||
      (h.slice(0, 7).every((n) => n === 0) && h[7] === 1) ||
      (h[0] & 0xfe00) === 0xfc00 || // fc00::/7 özel
      (h[0] & 0xffc0) === 0xfe80 || // fe80::/10 bağlantı-yerel
      (h[0] & 0xff00) === 0xff00 || // ff00::/8 çok noktaya yayın
      h[0] === 0x64 || // 64:ff9b::/96 NAT64
      (h[0] === 0x2001 && h[1] === 0x0db8) // belgeler için ayrılmış
    );
  }
  return true;
}
