import { describe, expect, it } from "vitest";
import { isPrivateIp } from "./ip";

describe("isPrivateIp", () => {
  it("özel ve ayrılmış IPv4 aralıklarını engeller", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255"]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
  });

  it("genel IPv4 adreslerine izin verir", () => {
    for (const ip of ["8.8.8.8", "76.76.21.21", "172.15.0.1", "172.32.0.1", "100.63.0.1", "93.184.216.34"]) {
      expect(isPrivateIp(ip), ip).toBe(false);
    }
  });

  it("IPv6 özel, döngü ve eşlenmiş adresleri engeller", () => {
    for (const ip of ["::1", "::", "fe80::1", "fc00::1", "fd12:3456::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:169.254.169.254", "2001:db8::1", "64:ff9b::808:808"]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
  });

  it("genel IPv6 adreslerine izin verir", () => {
    for (const ip of ["2606:4700:4700::1111", "2a00:1450:4001:81b::200e", "::ffff:8.8.8.8"]) {
      expect(isPrivateIp(ip), ip).toBe(false);
    }
  });

  it("IP olmayan girdiyi güvensiz sayar", () => {
    expect(isPrivateIp("firma.com")).toBe(true);
  });
});
