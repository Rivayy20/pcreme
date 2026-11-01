import { normalisasiWa, rupiah, tanggalPanjang } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";

/** Link wa.me dengan pesan terisi. Nomor dinormalisasi ke format 62xxx. */
export function linkWa(nomor: string, pesan?: string): string {
  const base = `https://wa.me/${normalisasiWa(nomor)}`;
  return pesan ? `${base}?text=${encodeURIComponent(pesan)}` : base;
}

/** Field instagram bisa berupa @handle atau URL penuh. */
export function linkInstagram(value: string): string {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  return `https://instagram.com/${v.replace(/^@/, "")}`;
}

/** Pesan dari pembeli ke admin (tombol "Hubungi admin"). */
export function pesanKeAdmin(kode: string): string {
  return `Halo kak, aku mau tanya soal pesanan P'crème dengan kode ${kode} 🙏`;
}

/** Fallback kirim bukti via WA bila order_id tidak tersedia di perangkat ini. */
export function pesanBuktiKeAdmin(kode: string): string {
  return `Halo kak, ini bukti pembayaran untuk pesanan P'crème dengan kode ${kode}. Mohon dicek ya, terima kasih 🙏`;
}

interface KonteksPesan {
  order: Pick<Order, "kode" | "nama" | "total" | "fulfillment" | "alamat_antar" | "jam_antar">;
  lokasi?: string | null; // nama + jam titik ambil
  tanggalAmbil?: string | null; // "YYYY-MM-DD"
}

/** Template pesan admin -> pembeli sesuai status. */
export function templatePesanAdmin(status: OrderStatus, ctx: KonteksPesan): string {
  const { order, lokasi, tanggalAmbil } = ctx;
  const sapa = `Halo kak ${order.nama}! 👋`;
  const tgl = tanggalAmbil ? tanggalPanjang(tanggalAmbil) : "";
  const tempat =
    order.fulfillment === "antar"
      ? `diantar ke ${order.alamat_antar ?? "alamat kakak"}${order.jam_antar ? ` sekitar jam ${order.jam_antar}` : ""}`
      : `diambil di ${lokasi ?? "titik kumpul yang dipilih"}`;

  switch (status) {
    case "menunggu_bayar":
      return `${sapa}\n\nIni pengingat dari P'crème ya 🍮 Pesanan ${order.kode} (${rupiah(order.total)}) belum kami terima pembayarannya. Kalau sudah transfer, boleh upload bukti bayarnya lewat halaman status pesanan ya kak. Makasih! 🙏`;
    case "menunggu_verifikasi":
      return `${sapa}\n\nBukti bayar untuk pesanan ${order.kode} sudah kami terima dan sedang kami cek ya kak. Mohon ditunggu sebentar 🙏`;
    case "dibayar":
      return `${sapa}\n\nPembayaran pesanan ${order.kode} (${rupiah(order.total)}) sudah kami terima. Makasih banyak kak! 💗 Pesananmu akan segera kami siapkan.`;
    case "diproses":
      return `${sapa}\n\nPesanan ${order.kode} sedang kami buat dengan sepenuh hati 🍮✨ Kabar selanjutnya menyusul ya kak.`;
    case "siap":
      return `${sapa}\n\nPesanan ${order.kode} sudah siap ${tempat}${tgl ? ` pada ${tgl}` : ""} 🎉 Jangan lupa tunjukkan kode pesanan ya kak. Selamat menikmati!`;
    case "selesai":
      return `${sapa}\n\nTerima kasih sudah pesan di P'crème ya kak 💗 Semoga puddingnya enak! Kalau berkenan, kasih tahu kami kesan-kesannya ya.`;
    case "dibatalkan":
      return `${sapa}\n\nMohon maaf kak, pesanan ${order.kode} kami batalkan. Kalau ada yang ingin ditanyakan atau mau pesan ulang, kabari kami ya 🙏`;
  }
}

/** Link wa.me tanpa nomor tujuan: WhatsApp membuka pilihan kontak/grup untuk membagikan pesan. */
export function linkBagikanWa(pesan: string): string {
  return `https://wa.me/?text=${encodeURIComponent(pesan)}`;
}
