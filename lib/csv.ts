/**
 * Parser CSV murni (RFC 4180): kutip ganda, `""` = kutip literal, pemisah dan
 * baris baru di dalam kutip, akhir baris CRLF/LF/CR, BOM dibuang.
 *
 * Pemisah `,` atau `;` dipilih dari baris pertama (Excel dengan locale
 * Indonesia menyimpan CSV dengan `;`). Baris kosong dipertahankan sebagai
 * `[""]` supaya indeks record = nomor baris di spreadsheet.
 */

export interface CsvParseResult {
  rows: string[][];
  /** Kutip pembuka tanpa penutup: sisa file tertelan ke satu sel. */
  unclosedQuote: boolean;
}

function detectDelimiter(text: string): "," | ";" {
  let commas = 0;
  let semicolons = 0;
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') quoted = !quoted;
    else if (quoted) continue;
    else if (c === "\n" || c === "\r") break;
    else if (c === ",") commas++;
    else if (c === ";") semicolons++;
  }
  return semicolons > commas ? ";" : ",";
}

export function parseCsv(input: string): CsvParseResult {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') cell += c;
      else if (text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = false;
    } else if (c === '"' && cell === "") {
      quoted = true;
    } else if (c === delimiter) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += c;
    }
  }
  // Record terakhir tanpa baris baru di ujung file.
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return { rows, unclosedQuote: quoted };
}
