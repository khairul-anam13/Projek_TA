import { describe, it, expect } from "vitest";
import { parseCsv } from "../csv";

describe("parseCsv", () => {
  it("memecah baris & kolom dasar, akhir baris CRLF/LF/CR", () => {
    expect(parseCsv("a,b\r\nc,d\ne,f\rg,h").rows).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e", "f"],
      ["g", "h"],
    ]);
  });

  it("koma dan baris baru di dalam kutip tetap satu sel; \"\" jadi kutip literal", () => {
    const { rows } = parseCsv('nama,alamat\r\n"SMA ""1""","Jl. A, No. 2\nBlok C"\r\n');
    expect(rows).toEqual([
      ["nama", "alamat"],
      ['SMA "1"', "Jl. A, No. 2\nBlok C"],
    ]);
  });

  it("baris kosong dipertahankan sebagai [\"\"]; newline di akhir file tidak menambah record", () => {
    expect(parseCsv("a,b\n\nc,d\n").rows).toEqual([["a", "b"], [""], ["c", "d"]]);
  });

  it("sel kosong di ujung baris tetap dihitung", () => {
    expect(parseCsv("a,b,\nc,,").rows).toEqual([
      ["a", "b", ""],
      ["c", "", ""],
    ]);
  });

  it("membuang BOM", () => {
    expect(parseCsv("﻿a,b").rows).toEqual([["a", "b"]]);
  });

  it("memilih ; bila header memakai titik koma (Excel locale Indonesia)", () => {
    expect(parseCsv("a;b\nJl. A, No. 2;x").rows).toEqual([
      ["a", "b"],
      ["Jl. A, No. 2", "x"],
    ]);
  });

  it("menandai kutip yang tidak ditutup", () => {
    expect(parseCsv('a,b\n"x,y\nz').unclosedQuote).toBe(true);
    expect(parseCsv('a,"b"').unclosedQuote).toBe(false);
  });

  it("input kosong -> tanpa baris", () => {
    expect(parseCsv("").rows).toEqual([]);
  });
});
