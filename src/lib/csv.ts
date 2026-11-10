import { lokasiPesanan, rincianItem } from "@/lib/admin";
import { tanggalJam } from "@/lib/format";
import { parseCatatanPesanan } from "@/lib/order-meta";
import {
  ORDER_PROGRESS_LABEL_ID,
  PAYMENT_STATUS_LABEL_ID,
  deriveOrderProgressStatus,
  derivePaymentStatus,
} from "@/lib/status";
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

const KOLOM = [
  "Kode",
  "Nama",
  "WA",
  "Asal",
  "Rincian Cup",
  "Jumlah Cup",
  "Total",
  "Metode Pembayaran",
  "Status Pembayaran",
  "Status Pesanan",
  "Fulfillment",
  "Lokasi",
  "Catatan Pelanggan",
  "Waktu",
];

/** CSV pesanan dengan BOM UTF-8 supaya Excel membaca karakter dengan benar. */
export function buatCsvPesanan(orders: OrderDenganRelasi[]): string {
  const baris = orders.map((o) => {
    const meta = parseCatatanPesanan(o.catatan, o.order_items);
    const payStatus = derivePaymentStatus(o.status, {
      catatanAdmin: o.catatan_admin,
      buktiBayarPath: o.bukti_bayar_path,
    });
    const orderStatus = deriveOrderProgressStatus(o.status, o.fulfillment);

    return [
      sel(o.kode),
      sel(o.nama),
      selWa(o.wa),
      sel(o.asal),
      sel(rincianItem(o.order_items, o.catatan)),
      o.jumlah_cup,
      o.total,
      sel(meta.labelMetodeBayar),
      sel(PAYMENT_STATUS_LABEL_ID[payStatus]),
      sel(ORDER_PROGRESS_LABEL_ID[orderStatus]),
      sel(o.fulfillment === "ambil" ? "Ambil" : "Antar"),
      sel(lokasiPesanan(o)),
      sel(meta.catatanPelanggan ?? "-"),
      sel(tanggalJam(o.created_at)),
    ].join(",");
  });
  return `\uFEFF${[KOLOM.join(","), ...baris].join("\r\n")}\r\n`;
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
