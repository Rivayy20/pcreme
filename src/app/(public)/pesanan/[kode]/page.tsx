import { BackLink } from "@/components/public/BackLink";
import { PesananView } from "@/components/public/PesananView";
import { getPoInfo } from "@/lib/po";

export const dynamic = "force-dynamic";

export default async function PesananPage({ params }: PageProps<"/pesanan/[kode]">) {
  const { kode } = await params;
  let kodeBersih = kode;
  try {
    kodeBersih = decodeURIComponent(kode);
  } catch {
    // biarkan apa adanya
  }

  // Nomor admin diambil dari PO aktif (cek_status_pesanan tidak mengembalikan wa_admin).
  const { data: po } = await getPoInfo();
  const waAdmin = po?.ada_po ? po.wa_admin : null;

  return (
    <main className="space-y-4">
      <BackLink href="/pesanan/cek" label="Kembali ke cek status pesanan" />
      <PesananView kode={kodeBersih} waAdmin={waAdmin} />
    </main>
  );
}
