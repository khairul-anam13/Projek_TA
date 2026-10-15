import { describe, it, expect } from "vitest";
import { crc32, zipStore } from "../zip";

const bytes = (s: string) => new TextEncoder().encode(s);

describe("zip", () => {
  it("crc32 sesuai nilai baku", () => {
    expect(crc32(bytes("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array(0))).toBe(0);
  });

  it("struktur: header lokal, direktori pusat, EOCD, isi utuh", () => {
    const zip = zipStore([
      { name: "a.txt", data: bytes("halo") },
      { name: "dir/é.svg", data: bytes("<svg/>") },
    ]);
    const v = new DataView(zip.buffer);

    expect(v.getUint32(0, true)).toBe(0x04034b50);
    const eocd = zip.length - 22;
    expect(v.getUint32(eocd, true)).toBe(0x06054b50);
    expect(v.getUint16(eocd + 10, true)).toBe(2); // jumlah entri
    const cdSize = v.getUint32(eocd + 12, true);
    const cdOffset = v.getUint32(eocd + 16, true);
    expect(cdOffset + cdSize).toBe(eocd);

    // Entri pertama di direktori pusat menunjuk ke header lokal pada offset 0 dengan CRC benar.
    expect(v.getUint32(cdOffset, true)).toBe(0x02014b50);
    expect(v.getUint32(cdOffset + 16, true)).toBe(crc32(bytes("halo")));
    expect(v.getUint32(cdOffset + 42, true)).toBe(0);
    expect(new TextDecoder().decode(zip.subarray(30, 35))).toBe("a.txt");
    expect(new TextDecoder().decode(zip.subarray(35, 39))).toBe("halo");
  });
});
