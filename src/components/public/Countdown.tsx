"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Hitung mundur ke tutup_at. Dihitung dari server_time (bukan jam perangkat):
 * sisa awal = tutup_at - server_time, lalu dikurangi waktu berjalan sejak komponen dimuat.
 */
export function Countdown({ tutupAt, serverTime }: { tutupAt: string; serverTime: string }) {
  const router = useRouter();
  const awal = Math.max(0, new Date(tutupAt).getTime() - new Date(serverTime).getTime());
  const [sisa, setSisa] = useState(awal);
  const sudahRefresh = useRef(false);

  useEffect(() => {
    const mulai = performance.now();
    const tick = () => setSisa(Math.max(0, awal - (performance.now() - mulai)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [awal]);

  const sudahTutup = sisa <= 0;
  useEffect(() => {
    // Sekali saja: bila server masih melaporkan PO buka, jangan refresh berulang-ulang.
    if (sudahTutup && !sudahRefresh.current) {
      sudahRefresh.current = true;
      router.refresh();
    }
  }, [sudahTutup, router]);

  if (sudahTutup) return <span className="font-semibold">PO sudah ditutup</span>;

  const detik = Math.floor(sisa / 1000);
  const hari = Math.floor(detik / 86400);
  const jam = Math.floor((detik % 86400) / 3600);
  const menit = Math.floor((detik % 3600) / 60);
  const dtk = detik % 60;
  const dua = (n: number) => String(n).padStart(2, "0");

  return (
    <span className="font-semibold tabular-nums" aria-label="Sisa waktu pemesanan">
      {hari > 0 ? `${hari} hari ` : ""}
      {dua(jam)}:{dua(menit)}:{dua(dtk)}
    </span>
  );
}
