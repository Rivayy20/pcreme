import { lokasiPesanan, rincianItem } from "@/lib/admin";
import { tanggalJam } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/status";
import type { OrderDenganRelasi } from "@/lib/types";

/** Sel teks: cegah CSV/formula injection (Excel menjalankan sel berawalan = + - @) lalu beri tanda kutip bila perlu. */
function sel(nilai: string | number): string {
  let s = String(nilai);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Nomor WA dipaksa jadi teks agar Excel tidak menampilkannya sebagai 6,28E+12. */
function selWa(wa: string): string {
  return /^\d+$/.test(wa) ? `"=""${wa}"""` : sel(wa);
}

const KOLOM = ["Kode", "Nama", "WA", "Asal", "Rincian", "Jumlah cup", "Total", "Fulfillment", "Lokasi", "Status", "Waktu"];

/** CSV pesanan dengan BOM UTF-8 supaya Excel membaca karakter dengan benar. */
export function buatCsvPesanan(orders: OrderDenganRelasi[]): string {
  const baris = orders.map((o) =>
    [
      sel(o.kode),
      sel(o.nama),
      selWa(o.wa),
      sel(o.asal),
      sel(rincianItem(o.order_items)),
      o.jumlah_cup,
      o.total,
      sel(o.fulfillment === "ambil" ? "Ambil" : "Antar"),
      sel(lokasiPesanan(o)),
      sel(STATUS_LABEL[o.status]),
      sel(tanggalJam(o.created_at)),
    ].join(","),
  );
  return `﻿${[KOLOM.join(","), ...baris].join("\r\n")}\r\n`;
}

export function unduhCsv(namaFile: string, isi: string): void {
  const url = URL.createObjectURL(new Blob([isi], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
