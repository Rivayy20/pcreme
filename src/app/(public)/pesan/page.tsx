import { redirect } from "next/navigation";
import { getPoInfo } from "@/lib/po";
import { hrefPesanSekarang } from "@/lib/routes";

export const dynamic = "force-dynamic";

/**
 * /pesan tanpa batch: arahkan ke checkout batch aktif yang bisa dipesan,
 * atau ke Jadwal PO bila tidak ada batch yang menerima pesanan.
 * Status batch selalu dibaca langsung dari database.
 */
export default async function PesanIndexPage() {
  const { data: po } = await getPoInfo();
  redirect(hrefPesanSekarang(po));
}
