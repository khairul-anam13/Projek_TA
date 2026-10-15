/**
 * Penulis ZIP minimal (tanpa kompresi / metode "store") untuk bundel hasil
 * batch. PDF jsPDF dan SVG kecil, jadi kompresi tidak sepadan dengan satu
 * dependensi baru. Nama berkas UTF-8. Tanpa ZIP64: maksimum 65.535 berkas
 * dan 4 GB, jauh di atas kebutuhan batch sekolah.
 */

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function zipStore(entries: ZipEntry[], date: Date = new Date()): Uint8Array {
  const enc = new TextEncoder();
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

  const files = entries.map((e) => ({ name: enc.encode(e.name), data: e.data, crc: crc32(e.data) }));
  const localSize = files.reduce((s, f) => s + 30 + f.name.length + f.data.length, 0);
  const centralSize = files.reduce((s, f) => s + 46 + f.name.length, 0);

  const out = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(out.buffer);
  let p = 0;
  const u16 = (v: number) => {
    view.setUint16(p, v, true);
    p += 2;
  };
  const u32 = (v: number) => {
    view.setUint32(p, v, true);
    p += 4;
  };
  const bytes = (b: Uint8Array) => {
    out.set(b, p);
    p += b.length;
  };

  const offsets: number[] = [];
  for (const f of files) {
    offsets.push(p);
    u32(0x04034b50);
    u16(20); // versi minimum
    u16(0x0800); // bendera: nama UTF-8
    u16(0); // metode: store
    u16(dosTime);
    u16(dosDate);
    u32(f.crc);
    u32(f.data.length);
    u32(f.data.length);
    u16(f.name.length);
    u16(0);
    bytes(f.name);
    bytes(f.data);
  }

  const centralStart = p;
  files.forEach((f, i) => {
    u32(0x02014b50);
    u16(20); // dibuat oleh
    u16(20); // versi minimum
    u16(0x0800);
    u16(0);
    u16(dosTime);
    u16(dosDate);
    u32(f.crc);
    u32(f.data.length);
    u32(f.data.length);
    u16(f.name.length);
    u16(0); // extra
    u16(0); // komentar
    u16(0); // nomor disk
    u16(0); // atribut internal
    u32(0); // atribut eksternal
    u32(offsets[i]);
    bytes(f.name);
  });

  u32(0x06054b50);
  u16(0);
  u16(0);
  u16(files.length);
  u16(files.length);
  u32(centralSize);
  u32(centralStart);
  u16(0);

  return out;
}
